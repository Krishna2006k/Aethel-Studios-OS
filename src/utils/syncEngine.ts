import {
  ActivityLogEntry,
  AethelDatabaseState,
  ApprovalCheckpointStage,
  AutomationRule,
  BrainDailyLogEntry,
  BrainDumpNote,
  BrainHandoverNote,
  BrainMemoryEntry,
  ClientCommunicationLog,
  ClientInvoice,
  ClientLead,
  ClientPayment,
  ExpensePaidBy,
  FounderName,
  HostedWebsite,
  LeadSource,
  MetaAdCampaign,
  ProjectMilestoneStage,
  ProjectTemplateName,
  StudioExpense,
  StudioTask,
} from '../types';
import {
  generateGroundedWeeklyRecap,
  getDefaultApprovalsForStage,
  getDefaultMilestonesForStage,
  getDefaultSubtasksForMilestone,
  STANDARD_MILESTONE_STAGES,
} from './calculations';
import {
  calculateInvoiceDerivedState,
  DEFAULT_DOCUMENT_TEMPLATES,
  DEFAULT_FINANCE_SETTINGS,
  deriveUnifiedTransactions,
} from './financeEngine';

function normalizeName(name: string): string {
  return (name || '').trim().toLowerCase();
}

/**
 * Smart client matcher:
 * 1. Exact ID match
 * 2. Exact normalized businessName match
 * 3. Prefix/substring match (e.g. "New Sagar Mobiles" -> "New Sagar Mobiles Risod")
 */
function findMatchingClient(
  clients: ClientLead[],
  clientById: Map<string, ClientLead>,
  clientByName: Map<string, ClientLead>,
  candidateId?: string,
  candidateName?: string
): ClientLead | undefined {
  if (candidateId && clientById.has(candidateId)) {
    return clientById.get(candidateId);
  }
  const norm = normalizeName(candidateName || '');
  if (!norm) return undefined;
  if (clientByName.has(norm)) {
    return clientByName.get(norm);
  }
  if (norm.length >= 4) {
    return clients.find((c) => {
      const cNorm = normalizeName(c.businessName);
      return cNorm.includes(norm) || norm.includes(cNorm);
    });
  }
  return undefined;
}

/**
 * Legacy demo seed IDs that must be automatically purged if present in
 * older browser localStorage or older database snapshots.
 */
const DEMO_SEED_IDS = new Set([
  'cli-1',
  'cli-2',
  'cli-3',
  'cli-4',
  'cli-5',
  'cli-6',
  'cli-7',
  'cli-8',
  'cli-9',
  'meta-1',
  'meta-2',
  'meta-3',
  'web-1',
  'web-2',
  'web-3',
  'web-4',
  'web-5',
  'tkt-1',
  'tkt-2',
  'tkt-3',
  'rnd-1',
  'rnd-2',
  'rnd-3',
  'exp-1',
  'exp-2',
  'exp-3',
  'exp-4',
  'pay-1',
  'pay-2',
  'pay-3',
  'pay-4',
  'pay-5',
  'pay-6',
  'vlt-1',
  'vlt-2',
  'vlt-3',
  'tsk-1',
  'tsk-2',
  'tsk-3',
  'tsk-4',
  'tsk-5',
  'act-1',
  'act-2',
  'act-3',
  'act-4',
  'act-init-1',
  'act-init-2',
  'act-init-3',
  'act-init-4',
]);

function isDemoId(id?: string): boolean {
  if (!id) return false;
  if (DEMO_SEED_IDS.has(id)) return true;
  if (id.startsWith('task-seed-')) return true;
  if (id.startsWith('pay-init-cli-') && DEMO_SEED_IDS.has(id.replace('pay-init-', ''))) {
    return true;
  }
  if (id.startsWith('exp-dom-web-') && DEMO_SEED_IDS.has(id.replace('exp-dom-', ''))) {
    return true;
  }
  if (id.startsWith('exp-meta-meta-') && DEMO_SEED_IDS.has(id.replace('exp-meta-', ''))) {
    return true;
  }
  return false;
}

export const DEFAULT_AUTOMATION_RULES: AutomationRule[] = [
  {
    id: 'rule-payment-followup',
    name: 'Rule 1 — Automated Payment Follow-Up',
    trigger: 'When project stage is Live / Payment Pending with balance > ₹0',
    action: 'Surface critical receivable alert & one-click WhatsApp settlement reminder',
    enabled: true,
    triggeredCount: 0,
    category: 'Finance',
  },
  {
    id: 'rule-client-onboarding',
    name: 'Rule 2 — Won Deal Project & Milestone Provisioning',
    trigger: 'When a deal moves to In Building or receives an advance payment',
    action: 'Auto-create 6 delivery milestones, 14 subtasks, 5 approval gates & ledger entry',
    enabled: true,
    triggeredCount: 0,
    category: 'CRM',
  },
  {
    id: 'rule-project-completion',
    name: 'Rule 3 — Project Completion & Final Invoice Sync',
    trigger: 'When all 6 milestones complete or final balance is settled',
    action: 'Transition stage to Delivered / Live & mark invoice Paid in Finance Ledger',
    enabled: true,
    triggeredCount: 0,
    category: 'Project',
  },
  {
    id: 'rule-domain-renewal',
    name: 'Rule 4 — 30/15/7/3-Day Domain & SSL Expiry Watchdog',
    trigger: 'When any hosted domain is within 45 days of expiration',
    action: 'Dispatch notification alert & sync renewal cost to Operational Expenses',
    enabled: true,
    triggeredCount: 0,
    category: 'Domain',
  },
];

export function appendActivityLog(
  state: AethelDatabaseState,
  entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>
): ActivityLogEntry[] {
  const existing = (state.activityLogs || []).filter((a) => !isDemoId(a.id));
  const newItem: ActivityLogEntry = {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  return [newItem, ...existing].slice(0, 60);
}

/**
 * Reconciles relational links across all modules in AethelDatabaseState:
 * 1. Strips out any legacy demo seed records so only real studio records remain.
 * 2. Enforces 100% 1-to-1 consistency between `client.advancePaid` and `state.payments`.
 * 3. Automatically synchronizes every Domain in `websites` (with renewalCostINR > 0)
 *    and every Campaign in `metaCampaigns` (with spend/budget > 0) into `state.expenses`
 *    so Domains, Meta Ads, and Studio Finance Ledger NEVER diverge!
 * 4. Enriches clients with default approval checkpoints, subtasks, lead sources, and invoices.
 */
export function reconcileDatabaseIntegrity(state: AethelDatabaseState): AethelDatabaseState {
  const clientByName = new Map<string, ClientLead>();
  const clientById = new Map<string, ClientLead>();

  const rawClients = (state.clients || []).filter((c) => !isDemoId(c.id));

  const normalizedClients = rawClients.map((rawClient) => {
    const anyClient = rawClient as unknown as Record<string, unknown>;
    const cleanPrice = Math.max(0, Number(rawClient.finalAgreedPrice) || 0);
    const cleanQuoted = Math.max(0, Number(rawClient.quotedPrice) || cleanPrice);
    const cleanAdvance = Math.max(0, Number(rawClient.advancePaid) || 0);

    const resolvedAssignedTo =
      (rawClient.assignedTo as FounderName) ||
      (anyClient.assignedLead as FounderName) ||
      'Both';
    const resolvedCity = rawClient.city || (anyClient.location as string) || 'Pune';
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
            subtasks:
              m.subtasks && m.subtasks.length > 0
                ? m.subtasks
                : getDefaultSubtasksForMilestone(m.stage, m.owner || resolvedAssignedTo, m.completed),
          }))
        : getDefaultMilestonesForStage(rawClient.stage, resolvedAssignedTo);

    const approvals =
      rawClient.approvals && rawClient.approvals.length === 5
        ? rawClient.approvals
        : getDefaultApprovalsForStage(rawClient.stage, rawClient.contactPerson || 'Client');

    const resolvedLeadSource: LeadSource =
      rawClient.leadSource ||
      (rawClient.stage === 'Sample Sent / WhatsApp' ? 'WhatsApp' : 'Direct Outreach');

    const resolvedStartDate =
      rawClient.projectStartDate || rawClient.createdAt || new Date().toISOString().slice(0, 10);
    const resolvedEndDate =
      rawClient.projectEndDate ||
      new Date(new Date(resolvedStartDate).getTime() + 14 * 86400000).toISOString().slice(0, 10);

    const updated: ClientLead = {
      ...rawClient,
      businessName: (rawClient.businessName || 'Studio Client').trim(),
      contactPerson: rawClient.contactPerson || 'Owner',
      phone: rawClient.phone || '+91 ',
      email: rawClient.email || '',
      city: resolvedCity,
      packageTier: resolvedPackageTier,
      assignedTo: resolvedAssignedTo,
      leadSource: resolvedLeadSource,
      followUpDate: resolvedFollowUp,
      notes: resolvedNotes,
      sampleLinkSent: rawClient.sampleLinkSent || '',
      quotedPrice: cleanQuoted,
      finalAgreedPrice: cleanPrice,
      advancePaid: cleanAdvance,
      milestones,
      approvals,
      projectStartDate: resolvedStartDate,
      projectEndDate: resolvedEndDate,
      communicationLogs: rawClient.communicationLogs || [],
    };
    clientByName.set(normalizeName(updated.businessName), updated);
    clientById.set(updated.id, updated);
    return updated;
  });

  // Filter out demo payments and link real payments to clients
  const projectPaymentSumsByClientId = new Map<string, number>();
  const rawPayments = (state.payments || []).filter((p) => !isDemoId(p.id));

  const linkedPayments: ClientPayment[] = rawPayments.map((rawPay) => {
    const anyPay = rawPay as unknown as Record<string, unknown>;
    const matchedClient = findMatchingClient(
      normalizedClients,
      clientById,
      clientByName,
      rawPay.clientId,
      rawPay.clientName
    );

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

    const rawMilestoneStr = String(rawPay.milestone || '');
    const validMilestones: ClientPayment['milestone'][] = [
      'Advance (50%)',
      'Final Delivery (50%)',
      'Full Upfront',
      'Meta Ads Retainer',
      'Domain Renewal',
    ];
    const resolvedMilestone: ClientPayment['milestone'] = validMilestones.includes(
      rawMilestoneStr as ClientPayment['milestone']
    )
      ? (rawMilestoneStr as ClientPayment['milestone'])
      : rawMilestoneStr.toLowerCase().includes('full')
      ? 'Full Upfront'
      : 'Advance (50%)';

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

  // Enforce strict 1-to-1 equality between `payments` ledger and `client.advancePaid`
  const today = new Date().toISOString().slice(0, 10);
  const autoSyncedPayments: ClientPayment[] = [...linkedPayments];

  const finalClients = normalizedClients.map((c) => {
    const ledgerSum = projectPaymentSumsByClientId.get(c.id);
    if (ledgerSum !== undefined) {
      return {
        ...c,
        advancePaid: ledgerSum,
      };
    } else if (c.advancePaid > 0 && c.stage !== 'Rejected / Dropped') {
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

  // Existing non-demo expenses
  const existingExpenses = (state.expenses || []).filter((e) => !isDemoId(e.id));

  // --------------------------------------------------------------------------
  // META ADS CAMPAIGNS -> Link to Clients & Auto-Sync Spend to Finance Expenses
  // --------------------------------------------------------------------------
  const linkedCampaigns: MetaAdCampaign[] = (state.metaCampaigns || [])
    .filter((m) => !isDemoId(m.id))
    .map((m) => {
      const matched = findMatchingClient(
        finalClients,
        clientById,
        clientByName,
        m.clientId,
        m.clientName
      );
      const cleanBudget = Math.max(0, Number(m.totalBudget) || 0);
      // A planned budget is not proof of actual spend. Only recorded spend is a
      // finance expense; never infer spent money from the budget ceiling.
      const resolvedSpent = Math.max(0, Number(m.amountSpent) || 0);

      const existingMetaExp = existingExpenses.find(
        (e) => e.id === `exp-meta-${m.id}` || e.linkedCampaignId === m.id
      );
      const resolvedPaidBy: ExpensePaidBy =
        m.paidBy || existingMetaExp?.paidBy || 'Vansh';

      const recordedImpressions = Number.isFinite(Number(m.impressions))
        ? Math.max(0, Number(m.impressions))
        : 0;
      const recordedReach = Number.isFinite(Number(m.reach))
        ? Math.max(0, Number(m.reach))
        : 0;
      const recordedClicks = Number.isFinite(Number(m.clicks))
        ? Math.max(0, Number(m.clicks))
        : 0;
      const recordedConversions = Number.isFinite(Number(m.conversions))
        ? Math.max(0, Number(m.conversions))
        : Math.max(0, Number(m.leadsGenerated) || 0);
      const recordedRoas = Number.isFinite(Number(m.roas))
        ? Math.max(0, Number(m.roas))
        : 0;

      return {
        ...m,
        clientId: matched ? matched.id : m.clientId,
        clientName: matched ? matched.businessName : m.clientName,
        totalBudget: cleanBudget,
        amountSpent: resolvedSpent,
        agencyFee: Math.max(0, Number(m.agencyFee) || 0),
        leadsGenerated: Math.max(0, Number(m.leadsGenerated) || 0),
        paidBy: resolvedPaidBy,
        impressions: recordedImpressions,
        reach: recordedReach,
        clicks: recordedClicks,
        conversions: recordedConversions,
        roas: recordedRoas,
      };
    });

  // --------------------------------------------------------------------------
  // DOMAINS & WEBSITES -> Link to Clients & Auto-Sync Cost to Finance Expenses
  // --------------------------------------------------------------------------
  const linkedWebsites: HostedWebsite[] = (state.websites || [])
    .filter((w) => !isDemoId(w.id))
    .map((w) => {
      const matched = findMatchingClient(
        finalClients,
        clientById,
        clientByName,
        w.clientId,
        w.clientName
      );
      const existingDomExp = existingExpenses.find(
        (e) => e.id === `exp-dom-${w.id}` || e.linkedDomainId === w.id
      );
      const resolvedPaidBy: ExpensePaidBy =
        w.paidBy || existingDomExp?.paidBy || 'Vansh';

      return {
        ...w,
        clientId: matched ? matched.id : w.clientId,
        clientName: matched ? matched.businessName : w.clientName,
        renewalCostINR: Math.max(0, Number(w.renewalCostINR) || 0),
        paidBy: resolvedPaidBy,
        hostingPlan: w.hostingPlan || `${w.hostingPlatform} Production Edge`,
        siteStatus: w.siteStatus || 'Unverified',
        backupStatus: w.backupStatus || 'Manual Only',
        lastBackupDate: w.lastBackupDate,
        uptimePercent:
          w.uptimePercent !== undefined && Number.isFinite(Number(w.uptimePercent))
            ? Number(w.uptimePercent)
            : undefined,
        responseTimeMs:
          w.responseTimeMs !== undefined && Number.isFinite(Number(w.responseTimeMs))
            ? Number(w.responseTimeMs)
            : undefined,
        lastCheckedAt: w.lastCheckedAt,
        clientPaymentStatus:
          w.clientPaymentStatus ||
          (matched && matched.advancePaid >= matched.finalAgreedPrice
            ? 'Client Paid'
            : 'Pending Client Payment'),
      };
    });

  // --------------------------------------------------------------------------
  // BUILD UNIFIED STUDIO EXPENSES (Manual Expenses + Domain Sync + Meta Ads Sync)
  // --------------------------------------------------------------------------
  const activeWebsiteIds = new Set(linkedWebsites.map((w) => w.id));
  const activeCampaignIds = new Set(linkedCampaigns.map((m) => m.id));

  const manualExpenses = existingExpenses.filter((e) => {
    const isDomAuto = Boolean(e.linkedDomainId || e.id.startsWith('exp-dom-'));
    const isMetaAuto = Boolean(e.linkedCampaignId || e.id.startsWith('exp-meta-'));
    if (isDomAuto) {
      const domId = e.linkedDomainId || e.id.replace('exp-dom-', '');
      return activeWebsiteIds.has(domId) ? false : false;
    }
    if (isMetaAuto) {
      const campId = e.linkedCampaignId || e.id.replace('exp-meta-', '');
      return activeCampaignIds.has(campId) ? false : false;
    }
    return true;
  });

  const syncedDomainExpenses: StudioExpense[] = linkedWebsites
    .filter((w) => w.renewalCostINR > 0 && w.registrar !== 'Client Owned')
    .map((w) => {
      const prevExp = existingExpenses.find(
        (e) => e.id === `exp-dom-${w.id}` || e.linkedDomainId === w.id
      );
      const paidBy: ExpensePaidBy = w.paidBy || prevExp?.paidBy || 'Vansh';
      return {
        id: `exp-dom-${w.id}`,
        linkedDomainId: w.id,
        title: `Domain & Hosting: ${w.domainName} (${w.registrar})`,
        category: 'Domain & Hosting',
        amount: w.renewalCostINR,
        paidBy,
        date: w.purchaseDate || prevExp?.date || today,
        clientRelated: w.clientName,
        reimbursed: prevExp ? prevExp.reimbursed : paidBy === 'Studio Account',
        notes: `Auto-synced from Domains & Hosting (${w.hostingPlatform} · Expires ${w.expiryDate})`,
      };
    });

  const syncedMetaExpenses: StudioExpense[] = linkedCampaigns
    // Only actual spend belongs in the expense ledger; an unused budget is not an expense.
    .filter((m) => m.amountSpent > 0)
    .map((m) => {
      const prevExp = existingExpenses.find(
        (e) => e.id === `exp-meta-${m.id}` || e.linkedCampaignId === m.id
      );
      const paidBy: ExpensePaidBy = m.paidBy || prevExp?.paidBy || 'Vansh';
      const spendAmount = m.amountSpent;
      return {
        id: `exp-meta-${m.id}`,
        linkedCampaignId: m.id,
        title: `Meta Ads Spend: ${m.campaignName} (${m.clientName})`,
        category: 'Meta Ad Spend',
        amount: spendAmount,
        paidBy,
        date: m.startDate || prevExp?.date || today,
        clientRelated: m.clientName,
        reimbursed: prevExp ? prevExp.reimbursed : paidBy === 'Studio Account',
        notes: `Auto-synced from Meta Ads (${m.objective} · ${m.status})`,
      };
    });

  const unifiedExpenses: StudioExpense[] = [
    ...syncedDomainExpenses,
    ...syncedMetaExpenses,
    ...manualExpenses,
  ];

  // --------------------------------------------------------------------------
  // FINANCE SETTINGS, SEQUENTIAL NUMBERING & INVOICES / TRANSACTIONS RECONCILIATION
  // --------------------------------------------------------------------------
  const rawSettings = state.financeSettings || ({} as Partial<typeof DEFAULT_FINANCE_SETTINGS>);
  const financeSettings = {
    ...DEFAULT_FINANCE_SETTINGS,
    ...rawSettings,
    phone1:
      !rawSettings.phone1 ||
      rawSettings.phone1 === '+91 90000 00001' ||
      rawSettings.phone1 === '+91 98765 43210'
        ? DEFAULT_FINANCE_SETTINGS.phone1
        : rawSettings.phone1,
    phone2:
      !rawSettings.phone2 ||
      rawSettings.phone2 === '+91 90000 00002' ||
      rawSettings.phone2 === '+91 98765 43211'
        ? DEFAULT_FINANCE_SETTINGS.phone2
        : rawSettings.phone2,
    bankName:
      rawSettings.bankName === 'HDFC Bank' && rawSettings.bankAccountNumber === ''
        ? ''
        : rawSettings.bankName || '',
    email:
      !rawSettings.email || rawSettings.email === 'aethelstudios.in@gmail.com'
        ? DEFAULT_FINANCE_SETTINGS.email
        : rawSettings.email,
    website:
      !rawSettings.website || rawSettings.website === 'https://aethelstudios.in'
        ? DEFAULT_FINANCE_SETTINGS.website
        : rawSettings.website,
    address:
      !rawSettings.address || rawSettings.address === 'Pune, Maharashtra, India'
        ? DEFAULT_FINANCE_SETTINGS.address
        : rawSettings.address,
    upiId:
      !rawSettings.upiId || rawSettings.upiId === 'aethelstudios@upi'
        ? DEFAULT_FINANCE_SETTINGS.upiId
        : rawSettings.upiId,
    defaultTemplateId:
      !rawSettings.defaultTemplateId ||
      rawSettings.defaultTemplateId === 'tpl-aethel-cobalt' ||
      rawSettings.defaultTemplateId === 'tpl-aethel-minimal'
        ? DEFAULT_FINANCE_SETTINGS.defaultTemplateId
        : rawSettings.defaultTemplateId,
  };

  const hasAllThreeApprovedTemplates =
    Boolean(state.documentTemplates) &&
    state.documentTemplates!.some((t) => t.id === 'tpl-aethel-quotation') &&
    state.documentTemplates!.some((t) => t.id === 'tpl-aethel-editorial' && t.referenceImageUrl) &&
    state.documentTemplates!.some((t) => t.id === 'tpl-aethel-receipt');

  const documentTemplates = hasAllThreeApprovedTemplates
    ? state.documentTemplates!
    : DEFAULT_DOCUMENT_TEMPLATES;

  // Ensure every payment has a sequential receiptNumber (AS-R-xxx)
  const numberedPayments: ClientPayment[] = autoSyncedPayments.map((p, idx) => ({
    ...p,
    receiptNumber:
      p.receiptNumber ||
      `${financeSettings.receiptPrefix}${String(idx + 1).padStart(3, '0')}`,
  }));

  // Ensure every expense has a sequential expenseNumber (AS-E-xxx)
  const numberedExpenses: StudioExpense[] = unifiedExpenses.map((e, idx) => ({
    ...e,
    expenseNumber:
      e.expenseNumber ||
      `${financeSettings.expensePrefix}${String(idx + 1).padStart(3, '0')}`,
  }));

  const existingInvoices = (state.invoices || []).filter((inv) => !isDemoId(inv.id));
  const workingInvoices: ClientInvoice[] = [...existingInvoices];

  // Auto-create an initial invoice ONLY when migrating legacy state where state.invoices was undefined.
  // Once state.invoices is initialized, never auto-recreate invoices that the user explicitly deleted.
  if (state.invoices === undefined) {
    finalClients.forEach((c) => {
      const hasRecordedAdvance = c.advancePaid > 0 && c.stage !== 'Rejected / Dropped';
      if (!hasRecordedAdvance) return;

      const hasAnyInvoice = workingInvoices.some(
        (inv) =>
          inv.clientId === c.id ||
          inv.id === `inv-auto-${c.id}` ||
          normalizeName(inv.clientName) === normalizeName(c.businessName)
      );
      if (hasAnyInvoice) return;

      const nextSeq = workingInvoices.length + 1;
      const invNum = `${financeSettings.invoicePrefix}${String(nextSeq).padStart(3, '0')}`;
      workingInvoices.push({
        id: `inv-auto-${c.id}`,
        invoiceNumber: invNum,
        clientId: c.id,
        clientName: c.businessName,
        clientContactPerson: c.contactPerson,
        clientPhone: c.phone,
        clientEmail: c.email,
        clientAddress: c.city,
        projectTitle: c.packageTier,
        invoiceTitle: `${c.packageTier} — Project Invoice`,
        paymentTerms: '50% Advance · 50% on Final Delivery',
        type: 'Standard Invoice',
        lineItems: [
          {
            id: `item-auto-${c.id}-1`,
            serviceName: c.packageTier,
            description: `Complete design, development & deployment for ${c.businessName}`,
            quantity: 1,
            unitPrice: c.finalAgreedPrice,
            total: c.finalAgreedPrice,
          },
        ],
        subtotal: c.finalAgreedPrice,
        discount: 0,
        amount: c.finalAgreedPrice,
        issueDate: c.createdAt || today,
        dueDate: c.followUpDate || today,
        status: 'Issued',
        notes: `Contract Value: ₹${c.finalAgreedPrice.toLocaleString('en-IN')}`,
        gstEnabled: false,
        gstRatePercent: 0,
        gstDisclaimer: financeSettings.gstDisclaimer,
        templateId: financeSettings.defaultTemplateId,
        version: 1,
        createdAt: new Date().toISOString(),
      });
    });
  }

  // Derive accurate paid amount, balanceDue, and status for every invoice from payments
  const generatedInvoices: ClientInvoice[] = workingInvoices.map((inv, idx) => {
    const normalizedNum =
      inv.invoiceNumber && !inv.invoiceNumber.startsWith('INV-2026-')
        ? inv.invoiceNumber
        : `${financeSettings.invoicePrefix}${String(idx + 1).padStart(3, '0')}`;
    return calculateInvoiceDerivedState(
      { ...inv, invoiceNumber: normalizedNum },
      numberedPayments,
      today
    );
  });

  const unifiedTransactions = deriveUnifiedTransactions(
    numberedPayments,
    numberedExpenses,
    state.transactions || [],
    generatedInvoices
  );

  const quotations = state.quotations || [];
  const generatedDocuments = state.generatedDocuments || [];

  const linkedTickets = (state.tickets || [])
    .filter((t) => !isDemoId(t.id))
    .map((t) => {
      const matched = findMatchingClient(
        finalClients,
        clientById,
        clientByName,
        t.clientId,
        t.clientName
      );
      return matched
        ? { ...t, clientId: matched.id, clientName: matched.businessName }
        : t;
    });

  const cleanRnDProjects = (state.rndProjects || []).filter((r) => !isDemoId(r.id));
  const cleanVaultItems = (state.vaultItems || []).filter((v) => !isDemoId(v.id));

  const tasks: StudioTask[] = (state.tasks || [])
    .filter((task) => !isDemoId(task.id))
    .map((task) => {
      const matched = findMatchingClient(
        finalClients,
        clientById,
        clientByName,
        task.clientId,
        task.clientName
      );
      if (matched) {
        const pending = Math.max(0, matched.finalAgreedPrice - matched.advancePaid);
        const autoCompleted =
          task.type === 'Payment Collection' && pending === 0 ? 'Completed' : task.status;
        return {
          ...task,
          clientId: matched.id,
          clientName: matched.businessName,
          status: autoCompleted,
          category: task.category || 'Client Communication',
          recurrence: task.recurrence || 'None',
        };
      }
      return {
        ...task,
        category: task.category || 'Internal',
        recurrence: task.recurrence || 'None',
      };
    });

  const activityLogs: ActivityLogEntry[] = (state.activityLogs || []).filter(
    (a) => !isDemoId(a.id)
  );

  const automationRules =
    state.automationRules && state.automationRules.length > 0
      ? state.automationRules
      : DEFAULT_AUTOMATION_RULES;

  const defaultMemories: BrainMemoryEntry[] = [
    {
      id: 'mem-pricing-tiers',
      title: 'Standardized Website & Growth Package Pricing',
      category: 'Pricing & Packages',
      content:
        'Basic Website Package (₹7,999–₹9,999), Standard Multi-Section Package (₹14,999), and Custom Website + Meta Ads Funnel (₹22,000+ with separate pass-through ad spend).',
      reasoning:
        'Provides clear entry points for Banquet/Lawns, Retail/Mobiles, and Clinics while keeping Meta Ad Spend strictly pass-through.',
      author: 'Both',
      date: today,
      pinned: true,
      tags: ['Pricing', 'Packages', 'Positioning'],
    },
    {
      id: 'mem-delivery-sop',
      title: '6-Stage Delivery & 5-Gate Client Approval SOP',
      category: 'Processes & SOPs',
      content:
        'Every confirmed project progresses through Requirements → Design → Development → Testing → Deployment → Handover, with 50% advance before build and final balance upon live preview approval.',
      reasoning:
        'Eliminates scope creep and ensures 100% alignment between CRM Pipeline, Deliveries, and Finance Ledger.',
      author: 'Krishna',
      date: today,
      pinned: true,
      tags: ['SOP', 'Delivery', 'Milestones'],
    },
    {
      id: 'mem-founder-split',
      title: 'Co-Founder 50/50 Profit Split & Out-of-Pocket Reimbursement Policy',
      category: 'Decisions',
      content:
        'Net studio profit is split 50/50 between Vansh Khakole and Krishna Khakole after reimbursing any personal out-of-pocket expenses (domains, hosting, ad spend) paid by either founder.',
      reasoning:
        'Guarantees transparent co-founder accounting regardless of whether client UPI payments land in Vansh, Krishna, or Studio Account.',
      author: 'Both',
      date: today,
      pinned: true,
      tags: ['Finance', 'Governance', '50/50 Split'],
    },
  ];

  const brainMemories: BrainMemoryEntry[] =
    state.brainMemories !== undefined ? state.brainMemories : defaultMemories;

  const brainDailyLogs: BrainDailyLogEntry[] =
    state.brainDailyLogs !== undefined
      ? state.brainDailyLogs
      : [
          {
            id: 'blog-init-1',
            author: 'Krishna',
            content:
              'Synchronized Aethel OS relational engine across CRM Pipeline, Domains, Meta Ads, and Studio Finance Ledger.',
            date: today,
            time: '10:30 AM',
            mentions: ['Vansh'],
            reactions: ['🔥', '✅'],
            pinned: true,
          },
          {
            id: 'blog-init-2',
            author: 'Vansh',
            content:
              'Reviewed active client domains, follow-up schedule, and hyper-local Meta Ad campaigns.',
            date: today,
            time: '12:15 PM',
            mentions: ['Krishna'],
            reactions: ['👍'],
          },
        ];

  const brainDumps: BrainDumpNote[] =
    state.brainDumps !== undefined
      ? state.brainDumps
      : [
          {
            id: 'bdump-init-1',
            title: 'Create dedicated Wedding Season Banquet & Lawns Meta Ads bundle',
            description:
              'Bundle a high-conversion 3D/Gallery Lawn showcase website with a 30-day WhatsApp Lead Generation Meta Ads campaign for marriage lawns in Maharashtra.',
            author: 'Vansh',
            date: today,
            category: 'Business opportunities',
            priority: 'High',
            status: 'Unsorted',
            pinned: true,
            tags: ['Banquet/Lawns', 'Meta Ads', 'Growth'],
          },
          {
            id: 'bdump-init-2',
            title: 'Productize ABDM-Integrated Clinic & Hospital Management Prototype',
            description:
              'Package our R&D Lab ABDM HMS prototype into a ready-to-demo pitch deck for multi-specialty clinics and hospitals.',
            author: 'Krishna',
            date: today,
            category: 'Ideas',
            priority: 'High',
            status: 'In Progress',
            pinned: true,
            tags: ['Hospitals', 'R&D Lab', 'Product Idea'],
          },
        ];

  const brainHandovers: BrainHandoverNote[] =
    state.brainHandovers !== undefined
      ? state.brainHandovers
      : [
          {
            id: 'bhand-init-1',
            from: 'Krishna',
            to: 'Vansh',
            date: today,
            time: '02:00 PM',
            title: 'Domain & Payment Follow-up Check-in',
            content:
              '@Vansh I have updated the live ledger and domain expiry sync. Please check pending client follow-ups and confirm once the next advance payment lands.',
            actionItems: [
              {
                id: 'act-item-1',
                text: 'Verify pending client follow-ups in CRM Pipeline',
                completed: false,
              },
              {
                id: 'act-item-2',
                text: 'Confirm domain renewal status for active hosted sites',
                completed: false,
              },
            ],
            status: 'Unread',
            replies: [],
            reactions: ['👀'],
          },
        ];

  const baseReconciled: AethelDatabaseState = {
    ...state,
    clients: finalClients,
    payments: numberedPayments,
    metaCampaigns: linkedCampaigns,
    websites: linkedWebsites,
    tickets: linkedTickets,
    rndProjects: cleanRnDProjects,
    expenses: numberedExpenses,
    vaultItems: cleanVaultItems,
    tasks,
    invoices: generatedInvoices,
    quotations,
    transactions: unifiedTransactions,
    generatedDocuments,
    documentTemplates,
    financeSettings,
    automationRules,
    activityLogs,
    brainDailyLogs,
    brainDumps,
    brainHandovers,
    brainMemories,
    lastUpdated: new Date().toISOString(),
  };

  const brainWeeklyRecaps =
    state.brainWeeklyRecaps && state.brainWeeklyRecaps.length > 0
      ? state.brainWeeklyRecaps
      : [generateGroundedWeeklyRecap(baseReconciled)];

  return {
    ...baseReconciled,
    brainWeeklyRecaps,
  };
}

/**
 * Applies a standardized Website/Growth Package Template to a client project,
 * setting milestones, subtasks, and package tier.
 */
export function applyProjectTemplateToClient(
  state: AethelDatabaseState,
  clientId: string,
  templateName: ProjectTemplateName
): AethelDatabaseState {
  const client = state.clients.find((c) => c.id === clientId);
  if (!client) return state;

  const templateSubtasksMap: Record<ProjectTemplateName, Record<ProjectMilestoneStage, string[]>> = {
    'Basic Website Package': {
      Requirements: ['Collect business profile, logo & photos', 'Confirm 1-page layout sections'],
      Design: ['Create mobile-first landing page wireframe'],
      Development: ['Hero & services showcase build', 'Direct WhatsApp click-to-chat button', 'Google Maps embed'],
      Testing: ['Mobile responsiveness test', 'Basic SEO title & meta tags'],
      Deployment: ['Connect domain DNS & SSL', 'Publish live production build'],
      Handover: ['Send live link & collect final balance'],
    },
    'Standard Website Package': {
      Requirements: ['Brand discovery & competitor benchmark', 'Content & photo gallery curation'],
      Design: ['High-conversion UI design & color palette', 'Interactive gallery & inquiry section preview'],
      Development: [
        'Multi-section responsive website development',
        'High-resolution photo/video gallery integration',
        'WhatsApp pre-filled inquiry engine & Google Maps',
      ],
      Testing: ['Cross-device QA (iOS/Android/Desktop)', 'PageSpeed 95+ & Local SEO schema markup'],
      Deployment: ['Cloudflare/Vercel edge deployment & SSL', 'Google Business Profile link sync'],
      Handover: ['Admin walkthrough & credential vault handover'],
    },
    'Premium Website Package': {
      Requirements: ['Full digital architecture & funnel blueprint', 'Custom copywriting & asset shoot planning'],
      Design: ['Bespoke interactive UI/UX prototype', 'Custom animations & 3D/visual showcase'],
      Development: [
        'Custom multi-page frontend & dynamic booking/lead engine',
        'Interactive filtering gallery & testimonial carousel',
        'Automated WhatsApp + CRM lead webhook integration',
      ],
      Testing: ['Comprehensive QA, security headers & Core Web Vitals optimization', 'Rich OpenGraph & Local SEO indexing'],
      Deployment: ['Zero-downtime global CDN deployment & custom domain SSL', 'Uptime & analytics monitoring setup'],
      Handover: ['Executive training session, documentation & SLA handover'],
    },
    'Custom Website + Meta Ads': {
      Requirements: ['Offer positioning & target audience radius strategy', 'Landing page & ad creative brief'],
      Design: ['High-converting landing page UI', 'Meta Ad creatives & hook variations'],
      Development: [
        'Conversion-optimized landing page build',
        'Meta Pixel & Conversions API event tracking',
        'Instant WhatsApp & Lead Form funnel integration',
      ],
      Testing: ['End-to-end lead test & pixel event firing verification', 'Mobile load speed under 1.5s'],
      Deployment: ['Live domain deployment & Meta Ads Manager campaign launch', 'Daily CPL & ROAS tracking dashboard link'],
      Handover: ['Weekly lead performance review & optimization protocol'],
    },
  };

  const selectedMap = templateSubtasksMap[templateName];
  const currentMilestones =
    client.milestones && client.milestones.length === 6
      ? client.milestones
      : getDefaultMilestonesForStage(client.stage, client.assignedTo);

  const updatedMilestones = currentMilestones.map((m) => ({
    ...m,
    subtasks: (selectedMap[m.stage] || []).map((title, idx) => ({
      id: `sub-${client.id}-${m.stage.toLowerCase()}-${idx + 1}`,
      title,
      completed: m.completed,
      assignedTo: m.owner || client.assignedTo,
    })),
  }));

  const updatedClient: ClientLead = {
    ...client,
    projectTemplate: templateName,
    packageTier: templateName,
    milestones: updatedMilestones,
  };

  const nextLogs = appendActivityLog(state, {
    actor: client.assignedTo === 'Both' ? 'Krishna' : client.assignedTo,
    action: `Applied '${templateName}' workflow template & subtasks`,
    targetName: client.businessName,
    category: 'Project',
  });

  return reconcileDatabaseIntegrity({
    ...state,
    clients: state.clients.map((c) => (c.id === clientId ? updatedClient : c)),
    activityLogs: nextLogs,
    lastUpdated: new Date().toISOString(),
  });
}

/**
 * Toggles a Client Approval Checkpoint (Requirements, Design, Content, Website Preview, Final Delivery)
 */
export function toggleClientApprovalCheckpoint(
  state: AethelDatabaseState,
  clientId: string,
  checkpointStage: ApprovalCheckpointStage,
  actor: FounderName = 'Krishna'
): AethelDatabaseState {
  const client = state.clients.find((c) => c.id === clientId);
  if (!client) return state;

  const today = new Date().toISOString().slice(0, 10);
  const currentApprovals =
    client.approvals && client.approvals.length === 5
      ? client.approvals
      : getDefaultApprovalsForStage(client.stage, client.contactPerson);

  const updatedApprovals = currentApprovals.map((a) =>
    a.stage === checkpointStage
      ? {
          ...a,
          approved: !a.approved,
          approvedBy: !a.approved ? client.contactPerson : undefined,
          approvedDate: !a.approved ? today : undefined,
        }
      : a
  );

  const toggled = updatedApprovals.find((a) => a.stage === checkpointStage);
  const nextLogs = appendActivityLog(state, {
    actor,
    action: `${toggled?.approved ? 'Recorded client approval for' : 'Reset approval on'} '${checkpointStage}'`,
    targetName: client.businessName,
    category: 'Project',
  });

  return reconcileDatabaseIntegrity({
    ...state,
    clients: state.clients.map((c) =>
      c.id === clientId ? { ...c, approvals: updatedApprovals } : c
    ),
    activityLogs: nextLogs,
    lastUpdated: new Date().toISOString(),
  });
}

/**
 * Toggles an individual subtask inside a project milestone
 */
export function toggleMilestoneSubtask(
  state: AethelDatabaseState,
  clientId: string,
  milestoneStage: ProjectMilestoneStage,
  subtaskId: string
): AethelDatabaseState {
  const client = state.clients.find((c) => c.id === clientId);
  if (!client) return state;

  const today = new Date().toISOString().slice(0, 10);
  const currentMilestones =
    client.milestones && client.milestones.length === 6
      ? client.milestones
      : getDefaultMilestonesForStage(client.stage, client.assignedTo);

  const updatedMilestones = currentMilestones.map((m) => {
    if (m.stage !== milestoneStage) return m;
    const subtasks = (m.subtasks || []).map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    const allDone = subtasks.length > 0 && subtasks.every((st) => st.completed);
    return {
      ...m,
      subtasks,
      completed: allDone ? true : m.completed,
      completedDate: allDone ? m.completedDate || today : m.completedDate,
    };
  });

  return reconcileDatabaseIntegrity({
    ...state,
    clients: state.clients.map((c) =>
      c.id === clientId ? { ...c, milestones: updatedMilestones } : c
    ),
    lastUpdated: new Date().toISOString(),
  });
}

/**
 * Appends a structured communication entry (Call, WhatsApp, Email, Meeting, Decision) to a client
 */
export function addClientCommunicationLog(
  state: AethelDatabaseState,
  clientId: string,
  entry: Omit<ClientCommunicationLog, 'id'>
): AethelDatabaseState {
  const client = state.clients.find((c) => c.id === clientId);
  if (!client) return state;

  const newLog: ClientCommunicationLog = {
    id: `comm-${Date.now()}`,
    ...entry,
  };

  const nextLogs = appendActivityLog(state, {
    actor: entry.loggedBy,
    action: `Logged ${entry.type}: ${entry.summary.slice(0, 50)}`,
    targetName: client.businessName,
    category: 'CRM',
  });

  return reconcileDatabaseIntegrity({
    ...state,
    clients: state.clients.map((c) =>
      c.id === clientId
        ? { ...c, communicationLogs: [newLog, ...(c.communicationLogs || [])] }
        : c
    ),
    activityLogs: nextLogs,
    lastUpdated: new Date().toISOString(),
  });
}

/**
 * Updates a StudioExpense in Finance & Ledger and bidirectionally propagates
 * changes (`amount`, `paidBy`, `reimbursed`) back to the linked Domain or Meta Ad Campaign!
 */
export function updateExpenseAndSyncSource(
  state: AethelDatabaseState,
  updatedExpense: StudioExpense
): AethelDatabaseState {
  const domId =
    updatedExpense.linkedDomainId ||
    (updatedExpense.id.startsWith('exp-dom-')
      ? updatedExpense.id.replace('exp-dom-', '')
      : undefined);

  const campId =
    updatedExpense.linkedCampaignId ||
    (updatedExpense.id.startsWith('exp-meta-')
      ? updatedExpense.id.replace('exp-meta-', '')
      : undefined);

  const nextExpenses = state.expenses.map((e) =>
    e.id === updatedExpense.id ? updatedExpense : e
  );

  const nextWebsites = domId
    ? state.websites.map((w) =>
        w.id === domId
          ? {
              ...w,
              renewalCostINR: Math.max(0, Number(updatedExpense.amount) || 0),
              paidBy: updatedExpense.paidBy,
            }
          : w
      )
    : state.websites;

  const nextCampaigns = campId
    ? state.metaCampaigns.map((m) => {
        if (m.id !== campId) return m;
        const nextAmt = Math.max(0, Number(updatedExpense.amount) || 0);
        return {
          ...m,
          amountSpent: nextAmt,
          totalBudget: Math.max(m.totalBudget, nextAmt),
          paidBy: updatedExpense.paidBy,
        };
      })
    : state.metaCampaigns;

  return reconcileDatabaseIntegrity({
    ...state,
    expenses: nextExpenses,
    websites: nextWebsites,
    metaCampaigns: nextCampaigns,
    lastUpdated: new Date().toISOString(),
  });
}

/**
 * Deletes an expense from Finance & Ledger. If the expense was synced from a Domain
 * or Meta Ad Campaign, also removes/zeroes the linked source record so it doesn't reappear.
 */
export function deleteExpenseAndSyncSource(
  state: AethelDatabaseState,
  expenseId: string
): AethelDatabaseState {
  const target = state.expenses.find((e) => e.id === expenseId);
  if (!target) return state;

  const domId =
    target.linkedDomainId ||
    (target.id.startsWith('exp-dom-') ? target.id.replace('exp-dom-', '') : undefined);

  const campId =
    target.linkedCampaignId ||
    (target.id.startsWith('exp-meta-') ? target.id.replace('exp-meta-', '') : undefined);

  const nextExpenses = state.expenses.filter((e) => e.id !== expenseId);
  const nextWebsites = domId
    ? state.websites.filter((w) => w.id !== domId)
    : state.websites;
  const nextCampaigns = campId
    ? state.metaCampaigns.filter((m) => m.id !== campId)
    : state.metaCampaigns;

  return reconcileDatabaseIntegrity({
    ...state,
    expenses: nextExpenses,
    websites: nextWebsites,
    metaCampaigns: nextCampaigns,
    lastUpdated: new Date().toISOString(),
  });
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

  let nextMilestones =
    updatedClient.milestones && updatedClient.milestones.length === 6
      ? updatedClient.milestones
      : getDefaultMilestonesForStage(nextStage, updatedClient.assignedTo);

  if (existingClient && existingClient.stage !== nextStage) {
    if (nextStage === 'Delivered / Live') {
      const todayStr = new Date().toISOString().slice(0, 10);
      nextMilestones = nextMilestones.map((m) => ({
        ...m,
        completed: true,
        completedDate: m.completedDate || todayStr,
      }));
    }
  }

  const normalizedUpdatedClient: ClientLead = {
    ...updatedClient,
    businessName: newName,
    finalAgreedPrice: cleanAgreed,
    advancePaid: cleanAdvance,
    stage: nextStage,
    milestones: nextMilestones,
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
      (p.clientId === normalizedUpdatedClient.id ||
        normalizeName(p.clientName) === normalizeName(newName)) &&
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
    actor:
      normalizedUpdatedClient.assignedTo === 'Both'
        ? 'Krishna'
        : normalizedUpdatedClient.assignedTo,
    action:
      delta > 0
        ? `Recorded ₹${delta.toLocaleString('en-IN')} payment & updated ${newName}`
        : `Updated client dossier (${nextStage})`,
    targetName: newName,
    category: delta > 0 ? 'Finance' : 'CRM',
  });

  return reconcileDatabaseIntegrity({
    ...state,
    clients: nextClients,
    payments: nextPayments,
    metaCampaigns: nextCampaigns,
    websites: nextWebsites,
    tickets: nextTickets,
    tasks: nextTasks,
    activityLogs: nextLogs,
    lastUpdated: new Date().toISOString(),
  });
}

/**
 * 1-Click Deal Conversion:
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
    completed: idx === 0,
    completedDate: idx === 0 ? today : undefined,
    owner: client.assignedTo,
    subtasks: getDefaultSubtasksForMilestone(stage, client.assignedTo, idx === 0),
  }));

  const updatedClient: ClientLead = {
    ...client,
    stage: 'In Building',
    advancePaid: newAdvance,
    milestones,
    projectStartDate: today,
    projectEndDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
  };

  let nextState = cascadeClientUpdate(state, updatedClient);

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

  const kickoffTask: StudioTask = {
    id: `task-kickoff-${Date.now()}`,
    clientId: client.id,
    clientName: client.businessName,
    title: `Complete UI/UX Design & Architecture Preview for ${client.businessName}`,
    type: 'Delivery',
    category: 'Design',
    recurrence: 'None',
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

  return reconcileDatabaseIntegrity({
    ...nextState,
    tasks: [kickoffTask, ...(nextState.tasks || [])],
    activityLogs: nextLogs,
    lastUpdated: new Date().toISOString(),
  });
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
          subtasks: (m.subtasks || []).map((st) => ({
            ...st,
            completed: !m.completed,
          })),
        }
      : m
  );

  const completedCount = updatedMilestones.filter((m) => m.completed).length;
  let nextStage = client.stage;
  if (completedCount === 6) {
    const pending = Math.max(0, client.finalAgreedPrice - client.advancePaid);
    nextStage = pending > 0 ? 'Live / Payment Pending' : 'Delivered / Live';
  } else if (
    completedCount >= 1 &&
    (client.stage === 'Cold Lead' ||
      client.stage === 'Sample Sent / WhatsApp' ||
      client.stage === 'In Talks / Demo Shown')
  ) {
    nextStage = 'In Building';
  }

  const nextClients = state.clients.map((c) =>
    c.id === clientId ? { ...c, stage: nextStage, milestones: updatedMilestones } : c
  );

  const toggledItem = updatedMilestones.find((m) => m.stage === milestoneStage);
  const nextLogs = appendActivityLog(state, {
    actor,
    action: `${toggledItem?.completed ? 'Completed' : 'Reopened'} '${milestoneStage}' milestone`,
    targetName: client.businessName,
    category: 'Project',
  });

  return reconcileDatabaseIntegrity({
    ...state,
    clients: nextClients,
    activityLogs: nextLogs,
    lastUpdated: new Date().toISOString(),
  });
}

/**
 * Deletes a client from the pipeline and removes associated records.
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
    return reconcileDatabaseIntegrity({
      ...state,
      clients: nextClients,
      activityLogs: nextLogs,
      lastUpdated: new Date().toISOString(),
    });
  }

  return reconcileDatabaseIntegrity({
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
    invoices: (state.invoices || []).filter(
      (inv) => inv.clientId !== clientId && normalizeName(inv.clientName) !== targetNameNorm
    ),
    activityLogs: nextLogs,
    lastUpdated: new Date().toISOString(),
  });
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

  return reconcileDatabaseIntegrity({
    ...state,
    clients: nextClients,
    payments: nextPayments,
    activityLogs: nextLogs,
    lastUpdated: new Date().toISOString(),
  });
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

  return reconcileDatabaseIntegrity({
    ...state,
    clients: nextClients,
    payments: nextPayments,
    activityLogs: nextLogs,
    lastUpdated: new Date().toISOString(),
  });
}

/**
 * Updates an existing ClientPayment in Studio Finance and automatically recalculates
 * the linked ClientLead's `advancePaid` and `stage` across the Pipeline.
 */
export function updatePaymentAndSyncClient(
  state: AethelDatabaseState,
  updatedPayment: ClientPayment
): AethelDatabaseState {
  const cleanAmount = Math.max(0, Number(updatedPayment.amountReceived) || 0);
  const matchedClient = state.clients.find(
    (c) =>
      (updatedPayment.clientId && c.id === updatedPayment.clientId) ||
      normalizeName(c.businessName) === normalizeName(updatedPayment.clientName)
  );

  const enrichedPayment: ClientPayment = matchedClient
    ? {
        ...updatedPayment,
        clientId: matchedClient.id,
        clientName: matchedClient.businessName,
        totalProjectValue: matchedClient.finalAgreedPrice || updatedPayment.totalProjectValue,
        amountReceived: cleanAmount,
      }
    : {
        ...updatedPayment,
        amountReceived: cleanAmount,
      };

  const nextPayments = state.payments.map((p) =>
    p.id === enrichedPayment.id ? enrichedPayment : p
  );

  const nextLogs = appendActivityLog(state, {
    actor:
      enrichedPayment.receivedInAccount === 'Studio Account'
        ? 'Krishna'
        : enrichedPayment.receivedInAccount,
    action: `Updated payment entry to ₹${cleanAmount.toLocaleString('en-IN')} (${enrichedPayment.milestone})`,
    targetName: enrichedPayment.clientName,
    category: 'Finance',
  });

  return reconcileDatabaseIntegrity({
    ...state,
    payments: nextPayments,
    activityLogs: nextLogs,
    lastUpdated: new Date().toISOString(),
  });
}

/**
 * AETHEL BRAIN — 1-Click Convert Brain Dump Note into an Actionable Studio Task
 */
export function convertBrainDumpToTask(
  state: AethelDatabaseState,
  noteId: string,
  assignedTo?: FounderName
): AethelDatabaseState {
  const note = (state.brainDumps || []).find((n) => n.id === noteId);
  if (!note) return state;

  const today = new Date().toISOString().slice(0, 10);
  const dueDate = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
  const taskId = `task-brain-${Date.now()}`;

  const newTask: StudioTask = {
    id: taskId,
    clientId: note.linkedClientId,
    clientName: note.linkedClientName || 'Aethel Studio',
    title: note.title,
    type: note.linkedClientName ? 'Follow-up' : 'Internal',
    category:
      note.category === 'Issues / Things to fix'
        ? 'Website Development'
        : note.category === 'Business opportunities'
        ? 'Sales'
        : note.category === 'Client-related'
        ? 'Client Communication'
        : 'Internal',
    recurrence: 'None',
    priority: note.priority === 'Low' ? 'Normal' : note.priority,
    status: 'Pending',
    assignedTo: assignedTo || note.author,
    dueDate,
    notes: `[Converted from Aethel Brain · ${note.category} by ${note.author}]: ${note.description}`,
    createdAt: today,
  };

  const nextBrainDumps = (state.brainDumps || []).map((n) =>
    n.id === noteId
      ? { ...n, status: 'In Progress' as const, convertedTaskId: taskId }
      : n
  );

  const nextLogs = appendActivityLog(state, {
    actor: note.author,
    action: `Converted Brain Dump note to Task: "${note.title}"`,
    targetName: note.linkedClientName || 'Aethel Brain',
    category: 'Brain',
  });

  return reconcileDatabaseIntegrity({
    ...state,
    tasks: [newTask, ...(state.tasks || [])],
    brainDumps: nextBrainDumps,
    activityLogs: nextLogs,
    lastUpdated: new Date().toISOString(),
  });
}

/**
 * AETHEL BRAIN — 1-Click Convert Handover Action Item into a Studio Task
 */
export function convertHandoverItemToTask(
  state: AethelDatabaseState,
  handoverId: string,
  actionItemId: string
): AethelDatabaseState {
  const handover = (state.brainHandovers || []).find((h) => h.id === handoverId);
  if (!handover) return state;

  const item = handover.actionItems.find((a) => a.id === actionItemId);
  if (!item) return state;

  const today = new Date().toISOString().slice(0, 10);
  const dueDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const newTask: StudioTask = {
    id: `task-handover-${Date.now()}`,
    clientId: handover.linkedClientId,
    clientName: handover.linkedClientName || 'Aethel Studio',
    title: item.text,
    type: handover.linkedClientName ? 'Follow-up' : 'Internal',
    category: 'Internal',
    recurrence: 'None',
    priority: 'High',
    status: 'Pending',
    assignedTo: handover.to,
    dueDate,
    notes: `[Handover from ${handover.from} → ${handover.to}: "${handover.title}"] ${handover.content}`,
    createdAt: today,
  };

  const nextHandovers = (state.brainHandovers || []).map((h) =>
    h.id === handoverId
      ? {
          ...h,
          actionItems: h.actionItems.map((a) =>
            a.id === actionItemId ? { ...a, convertedToTask: true } : a
          ),
        }
      : h
  );

  const nextLogs = appendActivityLog(state, {
    actor: handover.to,
    action: `Converted handover instruction to Task: "${item.text}"`,
    targetName: handover.linkedClientName || 'Aethel Brain',
    category: 'Brain',
  });

  return reconcileDatabaseIntegrity({
    ...state,
    tasks: [newTask, ...(state.tasks || [])],
    brainHandovers: nextHandovers,
    activityLogs: nextLogs,
    lastUpdated: new Date().toISOString(),
  });
}

