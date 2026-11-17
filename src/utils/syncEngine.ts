import {
  ActivityLogEntry,
  AethelDatabaseState,
  ClientLead,
  ClientPayment,
  ExpensePaidBy,
  FounderName,
  ProjectMilestoneStage,
  StudioTask,
} from '../types';
import { getDefaultMilestonesForStage, STANDARD_MILESTONE_STAGES } from './calculations';

function normalizeName(name: string): string {
  return (name || '').trim().toLowerCase();
}

export function appendActivityLog(
  state: AethelDatabaseState,
  entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>
): ActivityLogEntry[] {
  const existing = state.activityLogs || [];
  const newItem: ActivityLogEntry = {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  return [newItem, ...existing].slice(0, 60);
}

/**
 * Reconciles relational links across all modules in AethelDatabaseState:
 * 1. Links payments, websites, tickets, and Meta campaigns to clients by ID or case-insensitive businessName.
 * 2. Ensures every non-rejected client whose `advancePaid > 0` has corresponding verified payment ledger records
 *    so that CRM Pipeline `Paid` and Studio Finance `Revenue Collected` NEVER diverge.
 * 3. Backfills 6-stage `milestones`, `tasks`, and `activityLogs` on existing saved states.
 */
export function reconcileDatabaseIntegrity(state: AethelDatabaseState): AethelDatabaseState {
  const clientByName = new Map<string, ClientLead>();
  const clientById = new Map<string, ClientLead>();

  const normalizedClients = (state.clients || []).map((rawClient) => {
    const anyClient = rawClient as unknown as Record<string, unknown>;
    const cleanPrice = Math.max(0, Number(rawClient.finalAgreedPrice) || 0);
    const cleanQuoted = Math.max(0, Number(rawClient.quotedPrice) || cleanPrice);
    const cleanAdvance = Math.max(0, Number(rawClient.advancePaid) || 0);

    const resolvedAssignedTo =
      (rawClient.assignedTo as FounderName) ||
      (anyClient.assignedLead as FounderName) ||
      'Both';
    const resolvedCity =
      rawClient.city || (anyClient.location as string) || 'Pune';
    const resolvedPackageTier =
      rawClient.packageTier ||
      (anyClient.planSelected as string) ||
      'Custom Website & Growth Funnel';
    const resolvedFollowUp =
      rawClient.followUpDate ||
      (anyClient.nextFollowUpDate as string) ||
      new Date().toISOString().slice(0, 10);

    let resolvedNotes = rawClient.notes || '';
    if (!resolvedNotes && Array.isArray(anyClient.notesLog) && anyClient.notesLog.length > 0) {
      const firstLog = anyClient.notesLog[0] as Record<string, unknown>;
      resolvedNotes = String(firstLog?.text || '');
    }

    const milestones =
      rawClient.milestones && rawClient.milestones.length === 6
        ? rawClient.milestones.map((m) => ({
            ...m,
            owner: m.owner || resolvedAssignedTo,
          }))
        : getDefaultMilestonesForStage(rawClient.stage, resolvedAssignedTo);

    const updated: ClientLead = {
      ...rawClient,
      businessName: (rawClient.businessName || 'Studio Client').trim(),
      contactPerson: rawClient.contactPerson || 'Owner',
      phone: rawClient.phone || '+91 ',
      city: resolvedCity,
      packageTier: resolvedPackageTier,
      assignedTo: resolvedAssignedTo,
      followUpDate: resolvedFollowUp,
      notes: resolvedNotes,
      sampleLinkSent: rawClient.sampleLinkSent || '',
      quotedPrice: cleanQuoted,
      finalAgreedPrice: cleanPrice,
      advancePaid: cleanAdvance,
      milestones,
    };
    clientByName.set(normalizeName(updated.businessName), updated);
    clientById.set(updated.id, updated);
    return updated;
  });

  // Link and sum non-retainer payments per client
  const projectPaymentSumsByClientId = new Map<string, number>();

  const linkedPayments: ClientPayment[] = (state.payments || []).map((rawPay) => {
    const anyPay = rawPay as unknown as Record<string, unknown>;
    const matchedClient =
      (rawPay.clientId && clientById.get(rawPay.clientId)) ||
      clientByName.get(normalizeName(rawPay.clientName));

    const cleanAmount = Math.max(0, Number(rawPay.amountReceived) || 0);
    const resolvedDate =
      rawPay.paymentDate ||
      (anyPay.date as string) ||
      new Date().toISOString().slice(0, 10);
    const resolvedAccount =
      rawPay.receivedInAccount ||
      (anyPay.receivedBy as ExpensePaidBy) ||
      'Studio Account';
    const resolvedTitle =
      rawPay.projectTitle ||
      (anyPay.notes as string) ||
      (matchedClient ? matchedClient.packageTier : 'Client Milestone Payment');
    const resolvedMilestone = rawPay.milestone || 'Advance (50%)';

    if (matchedClient) {
      const isNonProjectMilestone =
        resolvedMilestone === 'Meta Ads Retainer' || resolvedMilestone === 'Domain Renewal';

      if (!isNonProjectMilestone) {
        const prev = projectPaymentSumsByClientId.get(matchedClient.id) || 0;
        projectPaymentSumsByClientId.set(matchedClient.id, prev + cleanAmount);
      }

      return {
        ...rawPay,
        clientId: matchedClient.id,
        clientName: matchedClient.businessName,
        projectTitle: resolvedTitle,
        paymentDate: resolvedDate,
        receivedInAccount: resolvedAccount,
        milestone: resolvedMilestone,
        totalProjectValue: matchedClient.finalAgreedPrice || rawPay.totalProjectValue,
        amountReceived: cleanAmount,
      };
    }

    return {
      ...rawPay,
      projectTitle: resolvedTitle,
      paymentDate: resolvedDate,
      receivedInAccount: resolvedAccount,
      milestone: resolvedMilestone,
      amountReceived: cleanAmount,
    };
  });

  // Backfill missing payment ledger entries if a client has `advancePaid > recordedPayments`
  // OR update client.advancePaid if recordedPayments > advancePaid.
  // This guarantees 100% financial consistency between CRM Pipeline and Finance Ledger!
  const today = new Date().toISOString().slice(0, 10);
  const autoSyncedPayments: ClientPayment[] = [...linkedPayments];

  const finalClients = normalizedClients.map((c) => {
    const ledgerSum = projectPaymentSumsByClientId.get(c.id);
    if (ledgerSum !== undefined) {
      if (c.advancePaid > ledgerSum) {
        // Client has additional advancePaid not yet in payment log -> create verified ledger entry
        const diff = c.advancePaid - ledgerSum;
        autoSyncedPayments.unshift({
          id: `pay-reconcile-${c.id}-${Date.now()}`,
          clientId: c.id,
          clientName: c.businessName,
          projectTitle: `${c.packageTier} — Advance / Milestone Sync`,
          totalProjectValue: c.finalAgreedPrice,
          amountReceived: diff,
          paymentDate: c.createdAt || today,
          paymentMode: 'UPI',
          receivedInAccount: c.assignedTo === 'Both' ? 'Studio Account' : c.assignedTo,
          milestone: c.advancePaid >= c.finalAgreedPrice ? 'Full Upfront' : 'Advance (50%)',
        });
        return c;
      }
      return {
        ...c,
        advancePaid: ledgerSum,
      };
    } else if (c.advancePaid > 0 && c.stage !== 'Rejected / Dropped') {
      // Client has advancePaid in Pipeline but no payment row in Finance -> create verified ledger entry
      autoSyncedPayments.unshift({
        id: `pay-init-${c.id}`,
        clientId: c.id,
        clientName: c.businessName,
        projectTitle: `${c.packageTier} — Advance Payment`,
        totalProjectValue: c.finalAgreedPrice,
        amountReceived: c.advancePaid,
        paymentDate: c.createdAt || today,
        paymentMode: 'UPI',
        receivedInAccount: c.assignedTo === 'Both' ? 'Studio Account' : c.assignedTo,
        milestone: c.advancePaid >= c.finalAgreedPrice ? 'Full Upfront' : 'Advance (50%)',
      });
    }
    return c;
  });

  // Refresh maps after client reconciliation
  clientById.clear();
  clientByName.clear();
  finalClients.forEach((c) => {
    clientById.set(c.id, c);
    clientByName.set(normalizeName(c.businessName), c);
  });

  const linkedCampaigns = (state.metaCampaigns || []).map((m) => {
    const matched =
      (m.clientId && clientById.get(m.clientId)) ||
      clientByName.get(normalizeName(m.clientName));
    return matched
      ? { ...m, clientId: matched.id, clientName: matched.businessName }
      : m;
  });

  const linkedWebsites = (state.websites || []).map((w) => {
    const matched =
      (w.clientId && clientById.get(w.clientId)) ||
      clientByName.get(normalizeName(w.clientName));
    return matched
      ? { ...w, clientId: matched.id, clientName: matched.businessName }
      : w;
  });

  const linkedTickets = (state.tickets || []).map((t) => {
    const matched =
      (t.clientId && clientById.get(t.clientId)) ||
      clientByName.get(normalizeName(t.clientName));
    return matched
      ? { ...t, clientId: matched.id, clientName: matched.businessName }
      : t;
  });

  // Backfill tasks from follow-ups, filtering out any orphaned seed tasks whose clientId is not in finalClients
  let tasks: StudioTask[] = (state.tasks || [])
    .filter((task) => {
      if (task.id.startsWith('tsk-') && task.clientId && !clientById.has(task.clientId)) {
        return false;
      }
      return true;
    })
    .map((task) => {
      const matched =
        (task.clientId && clientById.get(task.clientId)) ||
        clientByName.get(normalizeName(task.clientName));
      return matched
        ? { ...task, clientId: matched.id, clientName: matched.businessName }
        : task;
    });

  if (tasks.length === 0) {
    tasks = finalClients
      .filter((c) => c.stage !== 'Rejected / Dropped' && c.stage !== 'Delivered / Live')
      .slice(0, 6)
      .map((c, idx) => ({
        id: `task-seed-${c.id}`,
        clientId: c.id,
        clientName: c.businessName,
        title:
          c.stage === 'Live / Payment Pending'
            ? `Collect pending balance (₹${Math.max(0, c.finalAgreedPrice - c.advancePaid).toLocaleString('en-IN')})`
            : c.stage === 'In Building'
            ? `Complete next build milestone & share preview link`
            : `Follow up with ${c.contactPerson} on proposal & demo`,
        type:
          c.stage === 'Live / Payment Pending'
            ? 'Payment Collection'
            : c.stage === 'In Building'
            ? 'Delivery'
            : 'Follow-up',
        priority:
          c.stage === 'Live / Payment Pending' || idx === 0
            ? 'Urgent'
            : idx < 3
            ? 'High'
            : 'Normal',
        status: 'Pending',
        assignedTo: c.assignedTo,
        dueDate: c.followUpDate || today,
        notes: c.notes || '',
        createdAt: c.createdAt || today,
      }));
  }

  let activityLogs: ActivityLogEntry[] = state.activityLogs || [];
  if (activityLogs.length === 0) {
    activityLogs = [
      {
        id: 'act-init-1',
        actor: 'Krishna',
        action: 'Verified unified financial ledger & CRM pipeline sync',
        targetName: 'Aethel Studio Treasury',
        category: 'Finance',
        timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
      },
      {
        id: 'act-init-2',
        actor: 'Vansh',
        action: 'Updated active project milestones & deployment checklist',
        targetName: finalClients[0]?.businessName || 'Client Portfolio',
        category: 'Project',
        timestamp: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
      },
      {
        id: 'act-init-3',
        actor: 'Krishna',
        action: 'Monitored active Meta Ads lead generation CPL metrics',
        targetName: linkedCampaigns[0]?.clientName || 'Meta Ads Growth',
        category: 'Growth',
        timestamp: new Date(Date.now() - 1000 * 60 * 130).toISOString(),
      },
      {
        id: 'act-init-4',
        actor: 'Vansh',
        action: 'Audited SSL certificates & domain renewal schedule',
        targetName: linkedWebsites[0]?.domainName || 'Production Domains',
        category: 'Domain',
        timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
      },
    ];
  }

  return {
    ...state,
    clients: finalClients,
    payments: autoSyncedPayments,
    metaCampaigns: linkedCampaigns,
    websites: linkedWebsites,
    tickets: linkedTickets,
    tasks,
    activityLogs,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Updates a client and cascades name, price, and advance payment changes
 * across Finance Payments, Meta Campaigns, Hosted Websites, and Tickets.
 */
export function cascadeClientUpdate(
  state: AethelDatabaseState,
  updatedClient: ClientLead
): AethelDatabaseState {
  const existingClient = state.clients.find((c) => c.id === updatedClient.id);
  const oldNameNorm = existingClient ? normalizeName(existingClient.businessName) : '';
  const newName = updatedClient.businessName.trim();

  const cleanAgreed = Math.max(0, Number(updatedClient.finalAgreedPrice) || 0);
  const cleanAdvance = Math.max(0, Number(updatedClient.advancePaid) || 0);

  let nextStage = updatedClient.stage;
  if (
    existingClient &&
    existingClient.stage === 'Live / Payment Pending' &&
    updatedClient.stage === 'Live / Payment Pending' &&
    cleanAgreed > 0 &&
    cleanAdvance >= cleanAgreed
  ) {
    nextStage = 'Delivered / Live';
  }

  const normalizedUpdatedClient: ClientLead = {
    ...updatedClient,
    businessName: newName,
    finalAgreedPrice: cleanAgreed,
    advancePaid: cleanAdvance,
    stage: nextStage,
    milestones:
      updatedClient.milestones && updatedClient.milestones.length === 6
        ? updatedClient.milestones
        : getDefaultMilestonesForStage(nextStage, updatedClient.assignedTo),
  };

  const nextClients = state.clients.map((c) =>
    c.id === normalizedUpdatedClient.id ? normalizedUpdatedClient : c
  );

  let nextPayments = state.payments.map((p) => {
    const isMatch =
      p.clientId === normalizedUpdatedClient.id ||
      (oldNameNorm && normalizeName(p.clientName) === oldNameNorm);
    if (!isMatch) return p;
    return {
      ...p,
      clientId: normalizedUpdatedClient.id,
      clientName: newName,
      totalProjectValue: cleanAgreed || p.totalProjectValue,
    };
  });

  const existingProjectPayments = nextPayments.filter(
    (p) =>
      (p.clientId === normalizedUpdatedClient.id || normalizeName(p.clientName) === normalizeName(newName)) &&
      p.milestone !== 'Meta Ads Retainer' &&
      p.milestone !== 'Domain Renewal'
  );

  const currentPaymentSum = existingProjectPayments.reduce(
    (sum, p) => sum + (Number(p.amountReceived) || 0),
    0
  );

  const delta = cleanAdvance - currentPaymentSum;
  const today = new Date().toISOString().slice(0, 10);

  if (delta > 0) {
    const autoPayment: ClientPayment = {
      id: `pay-${Date.now()}`,
      clientId: normalizedUpdatedClient.id,
      clientName: newName,
      projectTitle: `${normalizedUpdatedClient.packageTier} (${
        cleanAdvance >= cleanAgreed ? 'Full Settlement' : 'Milestone / Advance'
      })`,
      totalProjectValue: cleanAgreed,
      amountReceived: delta,
      paymentDate: today,
      paymentMode: 'UPI',
      receivedInAccount:
        normalizedUpdatedClient.assignedTo === 'Both'
          ? 'Studio Account'
          : normalizedUpdatedClient.assignedTo,
      milestone:
        cleanAdvance >= cleanAgreed
          ? 'Final Delivery (50%)'
          : currentPaymentSum === 0
          ? 'Advance (50%)'
          : 'Final Delivery (50%)',
    };
    nextPayments = [autoPayment, ...nextPayments];
  } else if (delta < 0 && existingProjectPayments.length > 0) {
    let toDeduct = Math.abs(delta);
    nextPayments = nextPayments
      .map((p) => {
        const isProjectMatch =
          (p.clientId === normalizedUpdatedClient.id ||
            normalizeName(p.clientName) === normalizeName(newName)) &&
          p.milestone !== 'Meta Ads Retainer' &&
          p.milestone !== 'Domain Renewal';
        if (!isProjectMatch || toDeduct <= 0) return p;

        if (p.amountReceived <= toDeduct) {
          toDeduct -= p.amountReceived;
          return { ...p, amountReceived: 0 };
        } else {
          const reduced = p.amountReceived - toDeduct;
          toDeduct = 0;
          return { ...p, amountReceived: reduced };
        }
      })
      .filter((p) => p.amountReceived > 0);
  }

  const nextCampaigns = state.metaCampaigns.map((m) => {
    const isMatch =
      m.clientId === normalizedUpdatedClient.id ||
      (oldNameNorm && normalizeName(m.clientName) === oldNameNorm);
    return isMatch ? { ...m, clientId: normalizedUpdatedClient.id, clientName: newName } : m;
  });

  const nextWebsites = state.websites.map((w) => {
    const isMatch =
      w.clientId === normalizedUpdatedClient.id ||
      (oldNameNorm && normalizeName(w.clientName) === oldNameNorm);
    return isMatch ? { ...w, clientId: normalizedUpdatedClient.id, clientName: newName } : w;
  });

  const nextTickets = state.tickets.map((t) => {
    const isMatch =
      t.clientId === normalizedUpdatedClient.id ||
      (oldNameNorm && normalizeName(t.clientName) === oldNameNorm);
    return isMatch ? { ...t, clientId: normalizedUpdatedClient.id, clientName: newName } : t;
  });

  const nextTasks = (state.tasks || []).map((task) => {
    const isMatch =
      task.clientId === normalizedUpdatedClient.id ||
      (oldNameNorm && normalizeName(task.clientName) === oldNameNorm);
    return isMatch ? { ...task, clientId: normalizedUpdatedClient.id, clientName: newName } : task;
  });

  const nextLogs = appendActivityLog(state, {
    actor: normalizedUpdatedClient.assignedTo === 'Both' ? 'Krishna' : normalizedUpdatedClient.assignedTo,
    action:
      delta > 0
        ? `Recorded ₹${delta.toLocaleString('en-IN')} payment & updated ${newName}`
        : `Updated client dossier (${nextStage})`,
    targetName: newName,
    category: delta > 0 ? 'Finance' : 'CRM',
  });

  return {
    ...state,
    clients: nextClients,
    payments: nextPayments,
    metaCampaigns: nextCampaigns,
    websites: nextWebsites,
    tickets: nextTickets,
    tasks: nextTasks,
    activityLogs: nextLogs,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * 1-Click Deal Conversion (Part 3 & Part 8):
 * Converts a sales lead into an Active Project ('In Building'), initializes
 * the 6 delivery milestones, creates a kick-off delivery task, and logs activity.
 */
export function convertLeadToActiveProject(
  state: AethelDatabaseState,
  clientId: string,
  advanceReceivedNow?: number,
  receivedBy: ExpensePaidBy = 'Studio Account'
): AethelDatabaseState {
  const client = state.clients.find((c) => c.id === clientId);
  if (!client) return state;

  const today = new Date().toISOString().slice(0, 10);
  const newAdvance =
    advanceReceivedNow !== undefined && advanceReceivedNow > 0
      ? client.advancePaid + advanceReceivedNow
      : client.advancePaid;

  const milestones = STANDARD_MILESTONE_STAGES.map((stage, idx) => ({
    stage,
    completed: idx === 0, // Requirements marked complete on kick-off
    completedDate: idx === 0 ? today : undefined,
    owner: client.assignedTo,
  }));

  const updatedClient: ClientLead = {
    ...client,
    stage: 'In Building',
    advancePaid: newAdvance,
    milestones,
  };

  let nextState = cascadeClientUpdate(state, updatedClient);

  // If receivedBy was specified and advanceReceivedNow > 0, tag the latest payment
  if (advanceReceivedNow && advanceReceivedNow > 0 && nextState.payments.length > 0) {
    nextState = {
      ...nextState,
      payments: nextState.payments.map((p, idx) =>
        idx === 0 && p.clientId === client.id
          ? { ...p, receivedInAccount: receivedBy }
          : p
      ),
    };
  }

  // Create an initial kick-off delivery task if none exists
  const kickoffTask: StudioTask = {
    id: `task-kickoff-${Date.now()}`,
    clientId: client.id,
    clientName: client.businessName,
    title: `Complete UI/UX Design & Architecture Preview for ${client.businessName}`,
    type: 'Delivery',
    priority: 'High',
    status: 'Pending',
    assignedTo: client.assignedTo,
    dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    notes: `Converted from lead to active build (${client.packageTier}).`,
    createdAt: today,
  };

  const nextLogs = appendActivityLog(nextState, {
    actor: client.assignedTo === 'Both' ? 'Krishna' : client.assignedTo,
    action: `Converted lead to Active Project (In Building)`,
    targetName: client.businessName,
    category: 'Project',
  });

  return {
    ...nextState,
    tasks: [kickoffTask, ...(nextState.tasks || [])],
    activityLogs: nextLogs,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Toggles a specific project milestone (Requirements -> Handover) for a client
 * and auto-updates client stage when all 6 milestones complete.
 */
export function toggleClientMilestone(
  state: AethelDatabaseState,
  clientId: string,
  milestoneStage: ProjectMilestoneStage,
  actor: FounderName = 'Krishna'
): AethelDatabaseState {
  const client = state.clients.find((c) => c.id === clientId);
  if (!client) return state;

  const today = new Date().toISOString().slice(0, 10);
  const currentMilestones =
    client.milestones && client.milestones.length === 6
      ? client.milestones
      : getDefaultMilestonesForStage(client.stage, client.assignedTo);

  const updatedMilestones = currentMilestones.map((m) =>
    m.stage === milestoneStage
      ? {
          ...m,
          completed: !m.completed,
          completedDate: !m.completed ? today : undefined,
        }
      : m
  );

  const completedCount = updatedMilestones.filter((m) => m.completed).length;
  let nextStage = client.stage;
  if (completedCount === 6) {
    const pending = Math.max(0, client.finalAgreedPrice - client.advancePaid);
    nextStage = pending > 0 ? 'Live / Payment Pending' : 'Delivered / Live';
  } else if (completedCount >= 1 && (client.stage === 'Cold Lead' || client.stage === 'Sample Sent / WhatsApp' || client.stage === 'In Talks / Demo Shown')) {
    nextStage = 'In Building';
  }

  const nextClients = state.clients.map((c) =>
    c.id === clientId
      ? { ...c, stage: nextStage, milestones: updatedMilestones }
      : c
  );

  const toggledItem = updatedMilestones.find((m) => m.stage === milestoneStage);
  const nextLogs = appendActivityLog(state, {
    actor,
    action: `${toggledItem?.completed ? 'Completed' : 'Reopened'} '${milestoneStage}' milestone`,
    targetName: client.businessName,
    category: 'Project',
  });

  return {
    ...state,
    clients: nextClients,
    activityLogs: nextLogs,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Deletes a client from the pipeline and optionally removes or unlinks associated records.
 */
export function cascadeClientDelete(
  state: AethelDatabaseState,
  clientId: string,
  deleteLinkedRecords: boolean = true
): AethelDatabaseState {
  const target = state.clients.find((c) => c.id === clientId);
  if (!target) return state;
  const targetNameNorm = normalizeName(target.businessName);

  const nextClients = state.clients.filter((c) => c.id !== clientId);
  const nextLogs = appendActivityLog(state, {
    actor: 'Krishna',
    action: `Removed client record from pipeline`,
    targetName: target.businessName,
    category: 'CRM',
  });

  if (!deleteLinkedRecords) {
    return {
      ...state,
      clients: nextClients,
      activityLogs: nextLogs,
      lastUpdated: new Date().toISOString(),
    };
  }

  return {
    ...state,
    clients: nextClients,
    payments: state.payments.filter(
      (p) => p.clientId !== clientId && normalizeName(p.clientName) !== targetNameNorm
    ),
    metaCampaigns: state.metaCampaigns.filter(
      (m) => m.clientId !== clientId && normalizeName(m.clientName) !== targetNameNorm
    ),
    websites: state.websites.filter(
      (w) => w.clientId !== clientId && normalizeName(w.clientName) !== targetNameNorm
    ),
    tickets: state.tickets.filter(
      (t) => t.clientId !== clientId && normalizeName(t.clientName) !== targetNameNorm
    ),
    tasks: (state.tasks || []).filter(
      (task) => task.clientId !== clientId && normalizeName(task.clientName) !== targetNameNorm
    ),
    activityLogs: nextLogs,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Records a new ClientPayment in Studio Finance and automatically updates the matching
 * ClientLead's `advancePaid` and `stage` in the Pipeline.
 */
export function recordPaymentAndSyncClient(
  state: AethelDatabaseState,
  newPayment: ClientPayment
): AethelDatabaseState {
  const cleanAmount = Math.max(0, Number(newPayment.amountReceived) || 0);
  const matchedClient = state.clients.find(
    (c) =>
      (newPayment.clientId && c.id === newPayment.clientId) ||
      normalizeName(c.businessName) === normalizeName(newPayment.clientName)
  );

  const enrichedPayment: ClientPayment = matchedClient
    ? {
        ...newPayment,
        clientId: matchedClient.id,
        clientName: matchedClient.businessName,
        totalProjectValue: matchedClient.finalAgreedPrice || newPayment.totalProjectValue,
        amountReceived: cleanAmount,
      }
    : {
        ...newPayment,
        amountReceived: cleanAmount,
      };

  const nextPayments = [enrichedPayment, ...state.payments];

  const isNonProjectMilestone =
    enrichedPayment.milestone === 'Meta Ads Retainer' ||
    enrichedPayment.milestone === 'Domain Renewal';

  let nextClients = state.clients;
  if (matchedClient && !isNonProjectMilestone) {
    const newAdvance = matchedClient.advancePaid + cleanAmount;
    const isNowFullyPaid =
      matchedClient.finalAgreedPrice > 0 && newAdvance >= matchedClient.finalAgreedPrice;

    let nextStage = matchedClient.stage;
    if (isNowFullyPaid && matchedClient.stage === 'Live / Payment Pending') {
      nextStage = 'Delivered / Live';
    } else if (
      newAdvance > 0 &&
      (matchedClient.stage === 'Cold Lead' ||
        matchedClient.stage === 'Sample Sent / WhatsApp' ||
        matchedClient.stage === 'In Talks / Demo Shown')
    ) {
      nextStage = 'In Building';
    }

    nextClients = state.clients.map((c) =>
      c.id === matchedClient.id
        ? { ...c, advancePaid: newAdvance, stage: nextStage }
        : c
    );
  }

  const nextLogs = appendActivityLog(state, {
    actor:
      enrichedPayment.receivedInAccount === 'Studio Account'
        ? 'Krishna'
        : enrichedPayment.receivedInAccount,
    action: `Received ₹${cleanAmount.toLocaleString('en-IN')} (${enrichedPayment.milestone}) via ${enrichedPayment.paymentMode}`,
    targetName: enrichedPayment.clientName,
    category: 'Finance',
  });

  return {
    ...state,
    clients: nextClients,
    payments: nextPayments,
    activityLogs: nextLogs,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Deletes a ClientPayment from Studio Finance and deducts the amount from the matching
 * ClientLead's `advancePaid` in the Pipeline.
 */
export function deletePaymentAndSyncClient(
  state: AethelDatabaseState,
  paymentId: string
): AethelDatabaseState {
  const targetPayment = state.payments.find((p) => p.id === paymentId);
  if (!targetPayment) return state;

  const nextPayments = state.payments.filter((p) => p.id !== paymentId);

  const isNonProjectMilestone =
    targetPayment.milestone === 'Meta Ads Retainer' ||
    targetPayment.milestone === 'Domain Renewal';

  let nextClients = state.clients;
  if (!isNonProjectMilestone) {
    nextClients = state.clients.map((c) => {
      const isMatch =
        (targetPayment.clientId && c.id === targetPayment.clientId) ||
        normalizeName(c.businessName) === normalizeName(targetPayment.clientName);
      if (!isMatch) return c;

      const updatedAdvance = Math.max(0, c.advancePaid - targetPayment.amountReceived);
      const nextStage =
        c.stage === 'Delivered / Live' && updatedAdvance < c.finalAgreedPrice
          ? 'Live / Payment Pending'
          : c.stage;

      return {
        ...c,
        advancePaid: updatedAdvance,
        stage: nextStage,
      };
    });
  }

  const nextLogs = appendActivityLog(state, {
    actor: 'Krishna',
    action: `Reversed ₹${targetPayment.amountReceived.toLocaleString('en-IN')} payment entry`,
    targetName: targetPayment.clientName,
    category: 'Finance',
  });

  return {
    ...state,
    clients: nextClients,
    payments: nextPayments,
    activityLogs: nextLogs,
    lastUpdated: new Date().toISOString(),
  };
}
