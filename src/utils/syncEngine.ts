import type {
  AethelDatabaseState,
  ClientLead,
  ClientPayment,
  PaymentAccount,
  PipelineStage,
} from '../types';
import { calculatePendingBalance, formatINR } from './calculations';

/**
 * Normalizes a string for case-insensitive entity matching
 */
function normalizeName(name: string): string {
  return (name || '')
    .replace(/[’‘]/g, "'")
    .trim()
    .toLowerCase();
}

/**
 * Reconciles ticket states with website health statuses:
 * - If any open ticket (not 'Deployed & Resolved') for a client/website has High or Critical priority,
 *   the linked website's healthStatus becomes 'Issue Reported'.
 * - If all High/Critical tickets for a website are 'Deployed & Resolved' and the website was 'Issue Reported',
 *   its healthStatus automatically recovers to 'Live & Healthy'.
 */
export function reconcileWebsiteHealthWithTickets(
  state: AethelDatabaseState
): AethelDatabaseState {
  const updatedWebsites = state.websites.map((site) => {
    const siteDomainClean = normalizeName(
      site.liveDomainUrl.replace(/^https?:\/\//, '')
    );
    const siteStagingClean = normalizeName(
      site.stagingUrl.replace(/^https?:\/\//, '')
    );
    const clientClean = normalizeName(site.clientName);

    const linkedOpenUrgentTickets = state.tickets.filter((t) => {
      if (t.state === 'Deployed & Resolved') return false;
      const isUrgent =
        t.priority === 'Critical - Site Down' || t.priority === 'High';
      if (!isUrgent) return false;

      const tUrlClean = normalizeName(t.websiteUrl.replace(/^https?:\/\//, ''));
      const tClientClean = normalizeName(t.clientName);

      const urlMatches =
        tUrlClean.length > 3 &&
        (siteDomainClean.includes(tUrlClean) ||
          tUrlClean.includes(siteDomainClean) ||
          siteStagingClean.includes(tUrlClean));
      const clientMatches =
        clientClean.length > 2 && tClientClean === clientClean;

      return urlMatches || clientMatches;
    });

    if (linkedOpenUrgentTickets.length > 0 && site.healthStatus !== 'Issue Reported') {
      return { ...site, healthStatus: 'Issue Reported' as const };
    }
    if (
      linkedOpenUrgentTickets.length === 0 &&
      site.healthStatus === 'Issue Reported'
    ) {
      return { ...site, healthStatus: 'Live & Healthy' as const };
    }
    return site;
  });

  return {
    ...state,
    websites: updatedWebsites,
  };
}

/**
 * Reconciles a ClientLead update across the entire database:
 * 1. Cascades businessName and niche changes across metaCampaigns, websites, tickets, expenses, and payments.
 * 2. Synchronizes advancePaid changes with the Studio Finance ClientPayments ledger.
 * 3. Automatically transitions stage between 'Live / Payment Pending' and 'Delivered / Live' when balance is settled or reopened.
 */
export function reconcileClientUpdate(
  state: AethelDatabaseState,
  updatedClientInput: ClientLead,
  paymentReceivedBy: PaymentAccount = 'Studio Account'
): AethelDatabaseState {
  const previousClient = state.clients.find(
    (c) => c.id === updatedClientInput.id
  );

  // Auto-transition between 'Live / Payment Pending' and 'Delivered / Live' based on remaining balance
  const pendingBalance = calculatePendingBalance(
    updatedClientInput.finalAgreedPrice,
    updatedClientInput.advancePaid
  );
  let nextStage: PipelineStage = updatedClientInput.stage;

  if (
    updatedClientInput.stage === 'Live / Payment Pending' &&
    updatedClientInput.finalAgreedPrice > 0 &&
    pendingBalance === 0
  ) {
    nextStage = 'Delivered / Live';
  } else if (
    updatedClientInput.stage === 'Delivered / Live' &&
    pendingBalance > 0
  ) {
    nextStage = 'Live / Payment Pending';
  }

  const updatedClient: ClientLead = {
    ...updatedClientInput,
    stage: nextStage,
  };

  if (!previousClient) {
    return {
      ...state,
      clients: [updatedClient, ...state.clients],
    };
  }

  const oldName = previousClient.businessName;
  const newName = updatedClient.businessName;
  const nameChanged =
    oldName.trim().length > 0 &&
    newName.trim().length > 0 &&
    oldName !== newName;
  const nicheChanged = previousClient.niche !== updatedClient.niche;

  // 1. Cascade name & niche across linked tables
  const nextCampaigns = state.metaCampaigns.map((cam) => {
    const isLinked =
      cam.clientId === updatedClient.id ||
      normalizeName(cam.clientName) === normalizeName(oldName);
    if (!isLinked) return cam;
    return {
      ...cam,
      clientId: updatedClient.id,
      clientName: nameChanged ? newName : cam.clientName,
      niche: nicheChanged ? updatedClient.niche : cam.niche,
    };
  });

  const nextWebsites = state.websites.map((web) => {
    if (normalizeName(web.clientName) !== normalizeName(oldName)) return web;
    return {
      ...web,
      clientName: nameChanged ? newName : web.clientName,
    };
  });

  const nextTickets = state.tickets.map((tkt) => {
    if (normalizeName(tkt.clientName) !== normalizeName(oldName)) return tkt;
    return {
      ...tkt,
      clientName: nameChanged ? newName : tkt.clientName,
    };
  });

  const nextExpenses = state.expenses.map((exp) => {
    if (
      !exp.linkedClient ||
      normalizeName(exp.linkedClient) !== normalizeName(oldName)
    ) {
      return exp;
    }
    return {
      ...exp,
      linkedClient: nameChanged ? newName : exp.linkedClient,
    };
  });

  let nextPayments = state.payments.map((pay) => {
    if (normalizeName(pay.clientName) === normalizeName(oldName)) {
      return {
        ...pay,
        clientName: nameChanged ? newName : pay.clientName,
      };
    }
    return pay;
  });

  // 2. Reconcile advancePaid delta with Studio Finance ClientPayment inflow log
  const advanceDelta =
    (Number(updatedClient.advancePaid) || 0) -
    (Number(previousClient.advancePaid) || 0);

  if (advanceDelta > 0) {
    const autoPayment: ClientPayment = {
      id: `pay-sync-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      clientName: updatedClient.businessName,
      amountReceived: advanceDelta,
      paymentMode: 'UPI',
      receivedBy:
        updatedClient.assignedLead === 'Krishna'
          ? 'Krishna'
          : updatedClient.assignedLead === 'Vansh'
          ? 'Vansh'
          : paymentReceivedBy,
      notes:
        pendingBalance === 0
          ? `Full balance settlement (${formatINR(advanceDelta)}) synced from Client Pipeline.`
          : `Milestone / advance payment (${formatINR(advanceDelta)}) synced from Client Pipeline.`,
    };
    nextPayments = [autoPayment, ...nextPayments];
  } else if (advanceDelta < 0) {
    // Reduce or remove matching payment entries if advancePaid was lowered
    let toDeduct = Math.abs(advanceDelta);
    nextPayments = nextPayments
      .map((p) => {
        if (
          toDeduct > 0 &&
          normalizeName(p.clientName) === normalizeName(updatedClient.businessName)
        ) {
          if (p.amountReceived <= toDeduct) {
            toDeduct -= p.amountReceived;
            return null;
          } else {
            const reduced = {
              ...p,
              amountReceived: p.amountReceived - toDeduct,
            };
            toDeduct = 0;
            return reduced;
          }
        }
        return p;
      })
      .filter((p): p is ClientPayment => p !== null);
  }

  const nextClients = state.clients.map((c) =>
    c.id === updatedClient.id ? updatedClient : c
  );

  return reconcileWebsiteHealthWithTickets({
    ...state,
    clients: nextClients,
    metaCampaigns: nextCampaigns,
    websites: nextWebsites,
    tickets: nextTickets,
    expenses: nextExpenses,
    payments: nextPayments,
  });
}

/**
 * Reconciles adding a new ClientLead:
 * If the new client has advancePaid > 0, automatically creates a corresponding ClientPayment in Studio Finance.
 */
export function reconcileClientAddition(
  state: AethelDatabaseState,
  newClient: ClientLead
): AethelDatabaseState {
  let nextPayments = state.payments;
  if (newClient.advancePaid > 0) {
    const initialPayment: ClientPayment = {
      id: `pay-init-${Date.now()}`,
      date: newClient.createdAt || new Date().toISOString().slice(0, 10),
      clientName: newClient.businessName,
      amountReceived: newClient.advancePaid,
      paymentMode: 'UPI',
      receivedBy:
        newClient.assignedLead === 'Krishna'
          ? 'Krishna'
          : newClient.assignedLead === 'Vansh'
          ? 'Vansh'
          : 'Studio Account',
      notes: `Initial mobilization advance for ${newClient.planSelected}.`,
    };
    nextPayments = [initialPayment, ...nextPayments];
  }

  return {
    ...state,
    clients: [newClient, ...state.clients],
    payments: nextPayments,
  };
}

/**
 * Reconciles recording a new ClientPayment in Studio Finance:
 * Automatically increments advancePaid on the matching ClientLead and promotes stage to 'Delivered / Live' if fully paid.
 */
export function reconcilePaymentAddition(
  state: AethelDatabaseState,
  payment: ClientPayment
): AethelDatabaseState {
  const targetName = normalizeName(payment.clientName);

  const nextClients = state.clients.map((client) => {
    const clientNorm = normalizeName(client.businessName);
    const isMatch =
      clientNorm === targetName ||
      (clientNorm.length > 4 &&
        targetName.startsWith(clientNorm) &&
        !targetName.includes('meta ads'));

    if (!isMatch) return client;

    const nextAdvance = client.advancePaid + payment.amountReceived;
    const nextPending = calculatePendingBalance(
      client.finalAgreedPrice,
      nextAdvance
    );
    let nextStage = client.stage;
    if (
      (client.stage === 'Live / Payment Pending' ||
        client.stage === 'In Building') &&
      nextPending === 0 &&
      client.finalAgreedPrice > 0
    ) {
      nextStage = 'Delivered / Live';
    }

    return {
      ...client,
      advancePaid: nextAdvance,
      stage: nextStage,
      notesLog: [
        {
          id: `note-pay-${Date.now()}`,
          timestamp: `${payment.date} ${new Date().toTimeString().slice(0, 5)}`,
          author:
            payment.receivedBy === 'Vansh'
              ? ('Vansh' as const)
              : ('Krishna' as const),
          text: `Recorded payment inflow of ${formatINR(
            payment.amountReceived
          )} via ${payment.paymentMode} (${payment.notes}).`,
        },
        ...client.notesLog,
      ],
    };
  });

  return {
    ...state,
    clients: nextClients,
    payments: [payment, ...state.payments],
  };
}

/**
 * Reconciles deleting a ClientPayment from Studio Finance:
 * Automatically decrements advancePaid on the matching ClientLead and moves 'Delivered / Live' back to 'Live / Payment Pending' if balance becomes > 0.
 */
export function reconcilePaymentDeletion(
  state: AethelDatabaseState,
  paymentId: string
): AethelDatabaseState {
  const targetPayment = state.payments.find((p) => p.id === paymentId);
  if (!targetPayment) return state;

  const targetName = normalizeName(targetPayment.clientName);
  const nextClients = state.clients.map((client) => {
    const clientNorm = normalizeName(client.businessName);
    const isMatch =
      clientNorm === targetName ||
      (clientNorm.length > 4 &&
        targetName.startsWith(clientNorm) &&
        !targetName.includes('meta ads'));

    if (!isMatch) return client;

    const nextAdvance = Math.max(
      0,
      client.advancePaid - targetPayment.amountReceived
    );
    const nextPending = calculatePendingBalance(
      client.finalAgreedPrice,
      nextAdvance
    );
    const nextStage: PipelineStage =
      client.stage === 'Delivered / Live' && nextPending > 0
        ? 'Live / Payment Pending'
        : client.stage;

    return {
      ...client,
      advancePaid: nextAdvance,
      stage: nextStage,
    };
  });

  return {
    ...state,
    clients: nextClients,
    payments: state.payments.filter((p) => p.id !== paymentId),
  };
}
