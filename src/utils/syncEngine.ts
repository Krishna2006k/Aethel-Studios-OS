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
export function normalizeName(name: string): string {
  return (name || '')
    .replace(/[’‘]/g, "'")
    .trim()
    .toLowerCase();
}

function isSameClient(nameA: string, nameB: string): boolean {
  const a = normalizeName(nameA);
  const b = normalizeName(nameB);
  if (!a || !b) return false;
  return a === b;
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

    if (
      linkedOpenUrgentTickets.length > 0 &&
      site.healthStatus !== 'Issue Reported'
    ) {
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
 * Ensures 100% mathematical & relational consistency across the entire database:
 * 1. Consolidates any fragmented keystroke-synced payment entries (e.g. +3, +27, +270, +2700)
 *    for the same client into a single clean payment entry.
 * 2. Reconciles every client's `advancePaid` in Client Pipeline with the exact sum of their
 *    payments in Studio Finance (`state.payments`) so Pipeline and Finance never drift apart.
 * 3. Normalizes pipeline stages ('Live / Payment Pending' <-> 'Delivered / Live') based on remaining balance.
 */
export function reconcileDatabaseIntegrity(
  state: AethelDatabaseState
): AethelDatabaseState {
  // 1. Normalize client stages based on balance
  const normalizedClients = state.clients.map((client) => {
    const stageNorm: PipelineStage =
      client.stage === 'Finalized / In Progress' ? 'In Building' : client.stage;
    const pending = calculatePendingBalance(
      client.finalAgreedPrice,
      client.advancePaid
    );

    let nextStage = stageNorm;
    if (
      stageNorm === 'Live / Payment Pending' &&
      client.finalAgreedPrice > 0 &&
      pending === 0
    ) {
      nextStage = 'Delivered / Live';
    } else if (stageNorm === 'Delivered / Live' && pending > 0) {
      nextStage = 'Live / Payment Pending';
    }

    return {
      ...client,
      stage: nextStage,
    };
  });

  // 2. Consolidate fragmented auto-synced payments per client & reconcile with client.advancePaid
  const activeClientMap = new Map<string, ClientLead>();
  for (const c of normalizedClients) {
    activeClientMap.set(normalizeName(c.businessName), c);
  }

  // Group existing payments by normalized clientName
  const groupedPayments = new Map<string, ClientPayment[]>();
  const unmatchedPayments: ClientPayment[] = [];

  for (const pay of state.payments) {
    const key = normalizeName(pay.clientName);
    if (activeClientMap.has(key)) {
      const list = groupedPayments.get(key) || [];
      list.push(pay);
      groupedPayments.set(key, list);
    } else {
      unmatchedPayments.push(pay);
    }
  }

  const reconciledPayments: ClientPayment[] = [];

  for (const client of normalizedClients) {
    const key = normalizeName(client.businessName);
    const clientPays = groupedPayments.get(key) || [];
    const targetAdvance = Math.max(0, Number(client.advancePaid) || 0);
    const pending = calculatePendingBalance(
      client.finalAgreedPrice,
      targetAdvance
    );
    const defaultReceiver: PaymentAccount =
      client.assignedLead === 'Krishna'
        ? 'Krishna'
        : client.assignedLead === 'Vansh'
        ? 'Vansh'
        : 'Studio Account';

    if (targetAdvance === 0) {
      // Client has 0 advance paid -> no payment rows should exist for this client
      continue;
    }

    // Check if there are fragmented auto-synced rows (e.g. multiple pay-sync-* rows on same date)
    const syncRows = clientPays.filter((p) => p.id.startsWith('pay-sync-'));
    const manualRows = clientPays.filter((p) => !p.id.startsWith('pay-sync-'));

    if (syncRows.length > 1 && manualRows.length === 0) {
      // Consolidate fragmented keystroke sync rows into 1 clean payment row matching targetAdvance
      const primary = syncRows[0];
      reconciledPayments.push({
        ...primary,
        clientName: client.businessName,
        amountReceived: targetAdvance,
        receivedBy: primary.receivedBy || defaultReceiver,
        notes:
          pending === 0 && client.finalAgreedPrice > 0
            ? `Full balance settlement (${formatINR(targetAdvance)}) synced from Client Pipeline.`
            : `Milestone / advance payment (${formatINR(targetAdvance)}) synced from Client Pipeline.`,
      });
      continue;
    }

    const currentSum = clientPays.reduce((s, p) => s + p.amountReceived, 0);

    if (currentSum === targetAdvance) {
      reconciledPayments.push(...clientPays);
    } else if (clientPays.length === 0) {
      // Create missing payment entry so Studio Finance matches Client Pipeline advancePaid
      reconciledPayments.push({
        id: `pay-sync-${client.id}`,
        date: client.createdAt || new Date().toISOString().slice(0, 10),
        clientName: client.businessName,
        amountReceived: targetAdvance,
        paymentMode: 'UPI',
        receivedBy: defaultReceiver,
        notes:
          pending === 0 && client.finalAgreedPrice > 0
            ? `Full balance settlement (${formatINR(targetAdvance)}) synced from Client Pipeline.`
            : `Milestone / advance payment (${formatINR(targetAdvance)}) synced from Client Pipeline.`,
      });
    } else if (clientPays.length === 1 && clientPays[0].id.startsWith('pay-sync-')) {
      // Update single synced payment row to match the exact targetAdvance
      reconciledPayments.push({
        ...clientPays[0],
        clientName: client.businessName,
        amountReceived: targetAdvance,
        notes:
          pending === 0 && client.finalAgreedPrice > 0
            ? `Full balance settlement (${formatINR(targetAdvance)}) synced from Client Pipeline.`
            : `Milestone / advance payment (${formatINR(targetAdvance)}) synced from Client Pipeline.`,
      });
    } else if (targetAdvance > currentSum) {
      // Keep existing manual payments and add a single delta payment row for the difference
      const diff = targetAdvance - currentSum;
      reconciledPayments.push(
        {
          id: `pay-sync-${client.id}-${Date.now()}`,
          date: new Date().toISOString().slice(0, 10),
          clientName: client.businessName,
          amountReceived: diff,
          paymentMode: 'UPI',
          receivedBy: defaultReceiver,
          notes:
            pending === 0 && client.finalAgreedPrice > 0
              ? `Final balance settlement (${formatINR(diff)}) synced from Client Pipeline.`
              : `Additional advance payment (${formatINR(diff)}) synced from Client Pipeline.`,
        },
        ...clientPays
      );
    } else {
      // targetAdvance < currentSum: deduct difference from clientPays
      let toDeduct = currentSum - targetAdvance;
      for (const p of clientPays) {
        if (toDeduct <= 0) {
          reconciledPayments.push(p);
        } else if (p.amountReceived <= toDeduct) {
          toDeduct -= p.amountReceived;
        } else {
          reconciledPayments.push({
            ...p,
            amountReceived: p.amountReceived - toDeduct,
          });
          toDeduct = 0;
        }
      }
    }
  }

  // Keep any non-client-specific or external retainer payments if they don't belong to a deleted pipeline lead
  const finalPayments = [...reconciledPayments, ...unmatchedPayments];

  return reconcileWebsiteHealthWithTickets({
    ...state,
    clients: normalizedClients,
    payments: finalPayments,
  });
}

/**
 * Reconciles a ClientLead update across the entire database:
 * 1. Cascades businessName and niche changes across metaCampaigns, websites, tickets, expenses, and payments.
 * 2. Synchronizes advancePaid against the actual sum of payments for this client in Studio Finance.
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
    return reconcileClientAddition(state, updatedClient);
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
      isSameClient(cam.clientName, oldName);
    if (!isLinked) return cam;
    return {
      ...cam,
      clientId: updatedClient.id,
      clientName: nameChanged ? newName : cam.clientName,
      niche: nicheChanged ? updatedClient.niche : cam.niche,
    };
  });

  const nextWebsites = state.websites.map((web) => {
    if (!isSameClient(web.clientName, oldName)) return web;
    return {
      ...web,
      clientName: nameChanged ? newName : web.clientName,
    };
  });

  const nextTickets = state.tickets.map((tkt) => {
    if (!isSameClient(tkt.clientName, oldName)) return tkt;
    return {
      ...tkt,
      clientName: nameChanged ? newName : tkt.clientName,
    };
  });

  const nextExpenses = state.expenses.map((exp) => {
    if (!exp.linkedClient || !isSameClient(exp.linkedClient, oldName)) {
      return exp;
    }
    return {
      ...exp,
      linkedClient: nameChanged ? newName : exp.linkedClient,
    };
  });

  let nextPayments = state.payments.map((pay) => {
    if (isSameClient(pay.clientName, oldName)) {
      return {
        ...pay,
        clientName: nameChanged ? newName : pay.clientName,
      };
    }
    return pay;
  });

  // 2. Compare updatedClient.advancePaid against the ACTUAL sum of payments for this client in nextPayments
  const clientPayments = nextPayments.filter((p) =>
    isSameClient(p.clientName, updatedClient.businessName)
  );
  const currentLedgerSum = clientPayments.reduce(
    (sum, p) => sum + p.amountReceived,
    0
  );
  const targetAdvance = Math.max(0, Number(updatedClient.advancePaid) || 0);
  const ledgerDelta = targetAdvance - currentLedgerSum;

  const resolvedReceiver: PaymentAccount =
    updatedClient.assignedLead === 'Krishna'
      ? 'Krishna'
      : updatedClient.assignedLead === 'Vansh'
      ? 'Vansh'
      : paymentReceivedBy;

  if (ledgerDelta > 0) {
    const autoPayment: ClientPayment = {
      id: `pay-sync-${updatedClient.id}-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      clientName: updatedClient.businessName,
      amountReceived: ledgerDelta,
      paymentMode: 'UPI',
      receivedBy: resolvedReceiver,
      notes:
        pendingBalance === 0
          ? `Full balance settlement (${formatINR(ledgerDelta)}) synced from Client Pipeline.`
          : `Milestone / advance payment (${formatINR(ledgerDelta)}) synced from Client Pipeline.`,
    };
    nextPayments = [autoPayment, ...nextPayments];
  } else if (ledgerDelta < 0) {
    let toDeduct = Math.abs(ledgerDelta);
    nextPayments = nextPayments
      .map((p) => {
        if (
          toDeduct > 0 &&
          isSameClient(p.clientName, updatedClient.businessName)
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
  const pendingBalance = calculatePendingBalance(
    newClient.finalAgreedPrice,
    newClient.advancePaid
  );
  const resolvedStage: PipelineStage =
    newClient.stage === 'Live / Payment Pending' &&
    newClient.finalAgreedPrice > 0 &&
    pendingBalance === 0
      ? 'Delivered / Live'
      : newClient.stage;

  const cleanClient: ClientLead = {
    ...newClient,
    stage: resolvedStage,
  };

  let nextPayments = state.payments;
  if (cleanClient.advancePaid > 0) {
    const initialPayment: ClientPayment = {
      id: `pay-init-${cleanClient.id}-${Date.now()}`,
      date: cleanClient.createdAt || new Date().toISOString().slice(0, 10),
      clientName: cleanClient.businessName,
      amountReceived: cleanClient.advancePaid,
      paymentMode: 'UPI',
      receivedBy:
        cleanClient.assignedLead === 'Krishna'
          ? 'Krishna'
          : cleanClient.assignedLead === 'Vansh'
          ? 'Vansh'
          : 'Studio Account',
      notes:
        pendingBalance === 0
          ? `Full payment (${formatINR(cleanClient.advancePaid)}) for ${cleanClient.planSelected}.`
          : `Initial mobilization advance (${formatINR(cleanClient.advancePaid)}) for ${cleanClient.planSelected}.`,
    };
    nextPayments = [initialPayment, ...nextPayments];
  }

  return {
    ...state,
    clients: [cleanClient, ...state.clients],
    payments: nextPayments,
  };
}

/**
 * Reconciles deleting a ClientLead from the pipeline:
 * Removes the client and cleans up linked payment inflows in Studio Finance so totals stay in sync.
 */
export function reconcileClientDeletion(
  state: AethelDatabaseState,
  clientId: string
): AethelDatabaseState {
  const target = state.clients.find((c) => c.id === clientId);
  if (!target) return state;

  return {
    ...state,
    clients: state.clients.filter((c) => c.id !== clientId),
    payments: state.payments.filter(
      (p) => !isSameClient(p.clientName, target.businessName)
    ),
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
