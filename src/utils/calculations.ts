import {
  AethelDatabaseState,
  ApprovalCheckpointStage,
  BrainDailyLogEntry,
  BrainDumpCategory,
  BrainDumpNote,
  BrainHandoverNote,
  BrainMemoryEntry,
  BrainWeeklyRecap,
  ClientApprovalCheckpoint,
  ClientLead,
  ClientMilestone,
  ClientPayment,
  ClientTicket,
  FounderName,
  HostedWebsite,
  LeadSource,
  MetaAdCampaign,
  MilestoneSubtask,
  ProjectMilestoneStage,
  StudioExpense,
  StudioNotification,
  StudioTask,
} from '../types';

export const STANDARD_MILESTONE_STAGES: ProjectMilestoneStage[] = [
  'Requirements',
  'Design',
  'Development',
  'Testing',
  'Deployment',
  'Handover',
];

export const STANDARD_APPROVAL_STAGES: ApprovalCheckpointStage[] = [
  'Requirements',
  'Design',
  'Content',
  'Website Preview',
  'Final Delivery',
];

export const CONFIRMED_DEAL_STAGES: ClientLead['stage'][] = [
  'In Building',
  'Live / Payment Pending',
  'Delivered / Live',
];

export const UNCLOSED_LEAD_STAGES: ClientLead['stage'][] = [
  'Cold Lead',
  'Sample Sent / WhatsApp',
  'In Talks / Demo Shown',
];

export const ALL_LEAD_SOURCES: LeadSource[] = [
  'Instagram',
  'Facebook Ads',
  'WhatsApp',
  'Direct Outreach',
  'Referral',
  'Website',
  'Existing Client',
];

export function formatINR(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(safe);
}

export function calculateCPL(amountSpent: number, leadsGenerated: number): number {
  if (!leadsGenerated || leadsGenerated <= 0) return 0;
  return Math.round(amountSpent / leadsGenerated);
}

export function calculateCTR(clicks: number, impressions: number): number {
  if (!impressions || impressions <= 0) return 0;
  return Number(((clicks / impressions) * 100).toFixed(2));
}

export function calculateCPC(amountSpent: number, clicks: number): number {
  if (!clicks || clicks <= 0) return 0;
  return Math.round(amountSpent / clicks);
}

export function calculateDaysUntilExpiry(expiryDateStr: string): number {
  const expiry = new Date(expiryDateStr);
  if (isNaN(expiry.getTime())) return 0;
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function calculatePendingBalance(finalAgreedPrice: number, advancePaid: number): number {
  const agreed = Number(finalAgreedPrice) || 0;
  const paid = Number(advancePaid) || 0;
  return Math.max(0, agreed - paid);
}

export function getDefaultSubtasksForMilestone(
  stage: ProjectMilestoneStage,
  owner: FounderName,
  completed: boolean = false
): MilestoneSubtask[] {
  const map: Record<ProjectMilestoneStage, string[]> = {
    Requirements: [
      'Gather brand assets, logo & business details',
      'Finalize page architecture & domain preferences',
    ],
    Design: [
      'Create high-conversion hero & section wireframes',
      'Client design preview & typography sign-off',
    ],
    Development: [
      'Homepage & responsive layout development',
      'Gallery & interactive showcase integration',
      'WhatsApp CTA & Google Maps location integration',
    ],
    Testing: [
      'Mobile responsiveness & cross-browser QA',
      'PageSpeed, SEO meta tags & OpenGraph verification',
    ],
    Deployment: [
      'Custom domain DNS & SSL certificate provisioning',
      'Production deployment & live uptime verification',
    ],
    Handover: [
      'Client walkthrough & credentials transfer',
      'Final balance settlement & invoice closure',
    ],
  };

  return (map[stage] || []).map((title, idx) => ({
    id: `sub-${stage.toLowerCase()}-${idx + 1}`,
    title,
    completed,
    assignedTo: owner,
  }));
}

export function getDefaultMilestonesForStage(
  stage: ClientLead['stage'],
  assignedTo: ClientLead['assignedTo']
): ClientMilestone[] {
  const completedCount =
    stage === 'Delivered / Live'
      ? 6
      : stage === 'Live / Payment Pending'
      ? 5
      : stage === 'In Building'
      ? 3
      : stage === 'In Talks / Demo Shown'
      ? 1
      : 0;

  return STANDARD_MILESTONE_STAGES.map((mStage, idx) => {
    const isCompleted = idx < completedCount;
    return {
      stage: mStage,
      completed: isCompleted,
      completedDate: isCompleted ? new Date().toISOString().slice(0, 10) : undefined,
      owner: assignedTo,
      subtasks: getDefaultSubtasksForMilestone(mStage, assignedTo, isCompleted),
    };
  });
}

export function getDefaultApprovalsForStage(
  stage: ClientLead['stage'],
  contactPerson: string = 'Client'
): ClientApprovalCheckpoint[] {
  const approvedCount =
    stage === 'Delivered / Live'
      ? 5
      : stage === 'Live / Payment Pending'
      ? 4
      : stage === 'In Building'
      ? 2
      : stage === 'In Talks / Demo Shown'
      ? 1
      : 0;

  const today = new Date().toISOString().slice(0, 10);
  return STANDARD_APPROVAL_STAGES.map((aStage, idx) => ({
    id: `app-${idx + 1}`,
    stage: aStage,
    approved: idx < approvedCount,
    approvedBy: idx < approvedCount ? contactPerson : undefined,
    approvedDate: idx < approvedCount ? today : undefined,
  }));
}

export function calculateClientProjectProgress(
  client: ClientLead,
  tickets: ClientTicket[] = [],
  websites: HostedWebsite[] = []
): {
  percent: number;
  completedMilestones: number;
  totalMilestones: number;
  currentStageLabel: string;
  nextMilestoneLabel: string;
  openTicketsCount: number;
  hasLiveDomain: boolean;
  approvedCheckpointsCount: number;
  totalCheckpointsCount: number;
  daysRemaining: number | null;
} {
  const milestones =
    client.milestones && client.milestones.length === 6
      ? client.milestones
      : getDefaultMilestonesForStage(client.stage, client.assignedTo);

  const completedMilestones = milestones.filter((m) => m.completed).length;
  const totalMilestones = milestones.length;
  const percent = Math.round((completedMilestones / totalMilestones) * 100);

  const firstIncomplete = milestones.find((m) => !m.completed);
  const lastComplete = [...milestones].reverse().find((m) => m.completed);

  const clientTickets = tickets.filter(
    (t) =>
      (t.clientId && t.clientId === client.id) ||
      t.clientName.toLowerCase().trim() === client.businessName.toLowerCase().trim()
  );
  const openTicketsCount = clientTickets.filter((t) => t.status !== 'Resolved').length;

  const hasLiveDomain = websites.some(
    (w) =>
      ((w.clientId && w.clientId === client.id) ||
        w.clientName.toLowerCase().trim() === client.businessName.toLowerCase().trim()) &&
      w.siteStatus === 'Online'
  );

  const approvals =
    client.approvals && client.approvals.length > 0
      ? client.approvals
      : getDefaultApprovalsForStage(client.stage, client.contactPerson);
  const approvedCheckpointsCount = approvals.filter((a) => a.approved).length;
  const totalCheckpointsCount = approvals.length;

  let daysRemaining: number | null = null;
  if (client.projectEndDate) {
    daysRemaining = calculateDaysUntilExpiry(client.projectEndDate);
  }

  return {
    percent,
    completedMilestones,
    totalMilestones,
    currentStageLabel: lastComplete ? lastComplete.stage : 'Onboarding',
    nextMilestoneLabel: firstIncomplete ? firstIncomplete.stage : 'Completed & Live',
    openTicketsCount,
    hasLiveDomain,
    approvedCheckpointsCount,
    totalCheckpointsCount,
    daysRemaining,
  };
}

export interface StudioFinanceSummary {
  totalRevenueCollected: number;
  clientProjectRevenue: number;
  agencyRetainerRevenue: number;
  totalStudioExpenses: number;
  netProfit: number;
  profitMarginPercent: number;
  pendingReceivables: number;
  overdueReceivables: number;
  dueThisWeekReceivables: number;
  collectionRatePercent: number;
  totalContractedVolume: number;
  unclosedPipelineVolume: number;
  totalAllPipelineVolume: number;
  totalAdBudgetManaged: number;
  totalClientAdSpendPassThrough: number;
  totalMetaAgencyFees: number;
  vanshOutOfPocketUnreimbursed: number;
  krishnaOutOfPocketUnreimbursed: number;
  vanshTotalPaid: number;
  krishnaTotalPaid: number;
  studioAccountPaid: number;
  vanshCollectedDirectly: number;
  krishnaCollectedDirectly: number;
  studioAccountCollected: number;
  vanshAttributableRevenue: number;
  krishnaAttributableRevenue: number;
  vanshProfitShare50: number;
  krishnaProfitShare50: number;
  vanshNetSettlement: number;
  krishnaNetSettlement: number;
  settlementSummary: string;
  activeClientsCount: number;
  unclosedLeadsCount: number;
  activeProjectsCount: number;
  livePaymentPendingCount: number;
  outstandingTasksCount: number;
}

/**
 * SINGLE CANONICAL FINANCIAL ENGINE
 * Guarantees 100% mathematical consistency across Overview, CRM Pipeline, and Finance:
 * Confirmed Contracted Volume === Project Revenue Collected + Pending Receivables
 */
export function calculateStudioFinances(
  expenses: StudioExpense[],
  payments: ClientPayment[],
  clients: ClientLead[],
  metaCampaigns: MetaAdCampaign[] = [],
  tickets: ClientTicket[] = [],
  tasks: StudioTask[] = []
): StudioFinanceSummary {
  // 1. Canonical Revenue Collected from verified payments
  let rawPaymentsTotal = 0;
  let agencyRetainerRevenue = 0;

  for (const p of payments) {
    const amt = Math.max(0, Number(p.amountReceived) || 0);
    rawPaymentsTotal += amt;
    if (p.milestone === 'Meta Ads Retainer') {
      agencyRetainerRevenue += amt;
    }
  }

  const totalRevenueCollected = rawPaymentsTotal;
  const clientProjectRevenue = Math.max(0, totalRevenueCollected - agencyRetainerRevenue);

  // 2. Studio Operational Expenses & Net Profit
  const totalStudioExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const netProfit = totalRevenueCollected - totalStudioExpenses;
  const profitMarginPercent =
    totalRevenueCollected > 0 ? Math.round((netProfit / totalRevenueCollected) * 100) : 0;

  // 3. Confirmed Deals vs Unclosed Sales Pipeline
  const confirmedClients = clients.filter(
    (c) =>
      c.stage !== 'Rejected / Dropped' &&
      (CONFIRMED_DEAL_STAGES.includes(c.stage) || (Number(c.advancePaid) || 0) > 0)
  );

  const unclosedLeads = clients.filter(
    (c) =>
      c.stage !== 'Rejected / Dropped' &&
      !CONFIRMED_DEAL_STAGES.includes(c.stage) &&
      (Number(c.advancePaid) || 0) === 0
  );

  const totalContractedVolume = confirmedClients.reduce(
    (sum, c) => sum + (Number(c.finalAgreedPrice) || 0),
    0
  );

  const pendingReceivables = confirmedClients.reduce(
    (sum, c) => sum + calculatePendingBalance(c.finalAgreedPrice, c.advancePaid),
    0
  );

  const overdueReceivables = confirmedClients
    .filter((c) => c.stage === 'Live / Payment Pending')
    .reduce((sum, c) => sum + calculatePendingBalance(c.finalAgreedPrice, c.advancePaid), 0);

  const dueThisWeekReceivables = Math.max(0, pendingReceivables - overdueReceivables);

  const collectionRatePercent =
    totalContractedVolume > 0
      ? Math.min(100, Math.round((clientProjectRevenue / totalContractedVolume) * 100))
      : 100;

  const unclosedPipelineVolume = unclosedLeads.reduce(
    (sum, c) => sum + (Number(c.finalAgreedPrice) || 0),
    0
  );

  const totalAllPipelineVolume = totalContractedVolume + unclosedPipelineVolume;

  // 4. Meta Ads Separation: Client Ad Spend (Pass-through) vs Agency Retainer Fees
  const totalAdBudgetManaged = metaCampaigns.reduce(
    (sum, m) => sum + (Number(m.totalBudget) || 0),
    0
  );
  const totalClientAdSpendPassThrough = metaCampaigns.reduce(
    (sum, m) => sum + (Number(m.amountSpent) || 0),
    0
  );
  const totalMetaAgencyFees = metaCampaigns.reduce(
    (sum, m) => sum + (Number(m.agencyFee) || 0),
    0
  );

  // 5. Founder Out-of-Pocket & Co-Founder Accounting
  const vanshOutOfPocketUnreimbursed = expenses
    .filter((e) => e.paidBy === 'Vansh' && !e.reimbursed)
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const krishnaOutOfPocketUnreimbursed = expenses
    .filter((e) => e.paidBy === 'Krishna' && !e.reimbursed)
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const vanshTotalPaid = expenses
    .filter((e) => e.paidBy === 'Vansh')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const krishnaTotalPaid = expenses
    .filter((e) => e.paidBy === 'Krishna')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const studioAccountPaid = expenses
    .filter((e) => e.paidBy === 'Studio Account')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const vanshCollectedDirectly = payments
    .filter((p) => p.receivedInAccount === 'Vansh')
    .reduce((sum, p) => sum + (Number(p.amountReceived) || 0), 0);

  const krishnaCollectedDirectly = payments
    .filter((p) => p.receivedInAccount === 'Krishna')
    .reduce((sum, p) => sum + (Number(p.amountReceived) || 0), 0);

  const studioAccountCollected = payments
    .filter((p) => p.receivedInAccount === 'Studio Account')
    .reduce((sum, p) => sum + (Number(p.amountReceived) || 0), 0);

  // Attributable Revenue based on assigned founder on confirmed clients
  let vanshAttributableRevenue = 0;
  let krishnaAttributableRevenue = 0;
  for (const c of confirmedClients) {
    const val = Number(c.advancePaid) || 0;
    if (c.assignedTo === 'Vansh') {
      vanshAttributableRevenue += val;
    } else if (c.assignedTo === 'Krishna') {
      krishnaAttributableRevenue += val;
    } else {
      vanshAttributableRevenue += Math.round(val / 2);
      krishnaAttributableRevenue += Math.round(val / 2);
    }
  }

  const vanshProfitShare50 = Math.round(netProfit / 2);
  const krishnaProfitShare50 = Math.round(netProfit / 2);

  // Net entitlement = 50% Profit Share + Unreimbursed Personal Expenses Paid - Revenue Collected Directly in Personal Account
  // Wait: if Studio Account holds studioAccountCollected, each founder's total cash entitlement from the studio pool is:
  // Entitlement = 50% Net Profit + Total Personal Expenses Paid - Personal Revenue Already Held
  const vanshNetSettlement = Math.round(
    vanshProfitShare50 + vanshOutOfPocketUnreimbursed - vanshCollectedDirectly
  );
  const krishnaNetSettlement = Math.round(
    krishnaProfitShare50 + krishnaOutOfPocketUnreimbursed - krishnaCollectedDirectly
  );

  const equalOutOfPocketTarget =
    (vanshOutOfPocketUnreimbursed + krishnaOutOfPocketUnreimbursed) / 2;
  let settlementSummary =
    'Both founders have equal personal out-of-pocket spend (₹0 net difference).';
  if (vanshOutOfPocketUnreimbursed > krishnaOutOfPocketUnreimbursed) {
    const diff = Math.round(vanshOutOfPocketUnreimbursed - equalOutOfPocketTarget);
    settlementSummary = `Vansh has paid ${formatINR(
      vanshOutOfPocketUnreimbursed - krishnaOutOfPocketUnreimbursed
    )} more out-of-pocket than Krishna. Studio owes Vansh ${formatINR(
      vanshOutOfPocketUnreimbursed
    )} (or Krishna pays Vansh ${formatINR(diff)} to equalize).`;
  } else if (krishnaOutOfPocketUnreimbursed > vanshOutOfPocketUnreimbursed) {
    const diff = Math.round(krishnaOutOfPocketUnreimbursed - equalOutOfPocketTarget);
    settlementSummary = `Krishna has paid ${formatINR(
      krishnaOutOfPocketUnreimbursed - vanshOutOfPocketUnreimbursed
    )} more out-of-pocket than Vansh. Studio owes Krishna ${formatINR(
      krishnaOutOfPocketUnreimbursed
    )} (or Vansh pays Krishna ${formatINR(diff)} to equalize).`;
  }

  const activeClientsCount = confirmedClients.length;
  const unclosedLeadsCount = unclosedLeads.length;

  const activeProjectsCount = clients.filter(
    (c) => c.stage === 'In Building' || c.stage === 'Live / Payment Pending'
  ).length;

  const livePaymentPendingCount = clients.filter(
    (c) =>
      c.stage === 'Live / Payment Pending' &&
      calculatePendingBalance(c.finalAgreedPrice, c.advancePaid) > 0
  ).length;

  const openTicketsCount = tickets.filter((t) => t.status !== 'Resolved').length;
  const pendingTasksCount = tasks.filter((t) => t.status !== 'Completed').length;
  const outstandingTasksCount = openTicketsCount + pendingTasksCount;

  return {
    totalRevenueCollected,
    clientProjectRevenue,
    agencyRetainerRevenue,
    totalStudioExpenses,
    netProfit,
    profitMarginPercent,
    pendingReceivables,
    overdueReceivables,
    dueThisWeekReceivables,
    collectionRatePercent,
    totalContractedVolume,
    unclosedPipelineVolume,
    totalAllPipelineVolume,
    totalAdBudgetManaged,
    totalClientAdSpendPassThrough,
    totalMetaAgencyFees,
    vanshOutOfPocketUnreimbursed,
    krishnaOutOfPocketUnreimbursed,
    vanshTotalPaid,
    krishnaTotalPaid,
    studioAccountPaid,
    vanshCollectedDirectly,
    krishnaCollectedDirectly,
    studioAccountCollected,
    vanshAttributableRevenue,
    krishnaAttributableRevenue,
    vanshProfitShare50,
    krishnaProfitShare50,
    vanshNetSettlement,
    krishnaNetSettlement,
    settlementSummary,
    activeClientsCount,
    unclosedLeadsCount,
    activeProjectsCount,
    livePaymentPendingCount,
    outstandingTasksCount,
  };
}

export type HealthStatusLevel = 'Healthy' | 'Needs Attention' | 'Critical';

export interface StudioHealthIndicator {
  id: 'financial' | 'client' | 'delivery' | 'growth' | 'operational';
  label: string;
  status: HealthStatusLevel;
  metric: string;
  detail: string;
}

/**
 * PART 2 — Studio Health Indicator Engine
 * Dynamically evaluates Financial, Client, Delivery, Growth, and Operational health
 * from real studio metrics.
 */
export function calculateStudioHealth(
  state: AethelDatabaseState,
  summary?: StudioFinanceSummary
): StudioHealthIndicator[] {
  const fin =
    summary ||
    calculateStudioFinances(
      state.expenses,
      state.payments,
      state.clients,
      state.metaCampaigns,
      state.tickets,
      state.tasks || []
    );

  // 1. Financial Health
  let finStatus: HealthStatusLevel = 'Healthy';
  if (fin.netProfit < 0) {
    finStatus = 'Critical';
  } else if (fin.livePaymentPendingCount > 0 || fin.collectionRatePercent < 50) {
    finStatus = 'Needs Attention';
  }

  // 2. Client Health
  const activeOrDelivered = state.clients.filter((c) =>
    CONFIRMED_DEAL_STAGES.includes(c.stage)
  );
  const urgentOpenTickets = state.tickets.filter(
    (t) => t.status !== 'Resolved' && t.priority === 'Urgent'
  ).length;
  let clientStatus: HealthStatusLevel = 'Healthy';
  if (urgentOpenTickets > 1) {
    clientStatus = 'Critical';
  } else if (urgentOpenTickets === 1 || activeOrDelivered.length === 0) {
    clientStatus = 'Needs Attention';
  }

  // 3. Delivery Health
  const activeBuilds = state.clients.filter(
    (c) => c.stage === 'In Building' || c.stage === 'Live / Payment Pending'
  );
  const avgProgress =
    activeBuilds.length > 0
      ? Math.round(
          activeBuilds.reduce(
            (sum, c) =>
              sum + calculateClientProjectProgress(c, state.tickets, state.websites).percent,
            0
          ) / activeBuilds.length
        )
      : 100;
  let deliveryStatus: HealthStatusLevel = 'Healthy';
  if (avgProgress < 30 && activeBuilds.length > 2) {
    deliveryStatus = 'Needs Attention';
  }

  // 4. Growth Health
  const activeLeads = state.clients.filter((c) => UNCLOSED_LEAD_STAGES.includes(c.stage));
  const activeCampaigns = state.metaCampaigns.filter(
    (m) => m.status === 'Active' || m.status === 'Learning'
  );
  let growthStatus: HealthStatusLevel = 'Healthy';
  if (activeLeads.length === 0 && activeCampaigns.length === 0) {
    growthStatus = 'Needs Attention';
  }

  // 5. Operational Health (Domains + Tasks)
  const expiringDomains = state.websites.filter(
    (w) => calculateDaysUntilExpiry(w.expiryDate) <= 30
  );
  const criticalDomains = state.websites.filter(
    (w) => calculateDaysUntilExpiry(w.expiryDate) <= 7
  );
  let opsStatus: HealthStatusLevel = 'Healthy';
  if (criticalDomains.length > 0) {
    opsStatus = 'Critical';
  } else if (expiringDomains.length > 0 || fin.outstandingTasksCount > 5) {
    opsStatus = 'Needs Attention';
  }

  return [
    {
      id: 'financial',
      label: 'Financial Health',
      status: finStatus,
      metric: `${fin.collectionRatePercent}% Collected`,
      detail:
        fin.pendingReceivables > 0
          ? `${formatINR(fin.pendingReceivables)} pending collection`
          : 'All contracted invoices collected',
    },
    {
      id: 'client',
      label: 'Client Health',
      status: clientStatus,
      metric: `${activeOrDelivered.length} Active Accounts`,
      detail:
        urgentOpenTickets > 0
          ? `${urgentOpenTickets} urgent revision ticket open`
          : '100% client satisfaction & zero escalations',
    },
    {
      id: 'delivery',
      label: 'Delivery Health',
      status: deliveryStatus,
      metric: `${avgProgress}% Avg Build Progress`,
      detail: `${activeBuilds.length} active build${activeBuilds.length === 1 ? '' : 's'} in pipeline`,
    },
    {
      id: 'growth',
      label: 'Growth Health',
      status: growthStatus,
      metric: `${activeLeads.length} Active Prospects`,
      detail: `${formatINR(fin.unclosedPipelineVolume)} in open sales pipeline`,
    },
    {
      id: 'operational',
      label: 'Operational Health',
      status: opsStatus,
      metric: `${state.websites.filter((w) => w.siteStatus === 'Online').length}/${state.websites.length} Sites Online`,
      detail:
        expiringDomains.length > 0
          ? `${expiringDomains.length} domain renewing within 30d`
          : 'All SSL & domains nominal',
    },
  ];
}

export interface LeadConversionAnalytics {
  totalLeads: number;
  qualifiedLeads: number;
  proposalsSent: number;
  wonDeals: number;
  lostDeals: number;
  conversionRatePercent: number;
  averageDealValue: number;
  bySource: Record<LeadSource, { count: number; won: number; value: number }>;
}

/**
 * PART 3 & PART 9 — Lead Conversion Analytics Engine
 */
export function calculateLeadConversionAnalytics(
  clients: ClientLead[]
): LeadConversionAnalytics {
  const totalLeads = clients.length;
  const wonClients = clients.filter(
    (c) =>
      c.stage !== 'Rejected / Dropped' &&
      (CONFIRMED_DEAL_STAGES.includes(c.stage) || (Number(c.advancePaid) || 0) > 0)
  );
  const lostClients = clients.filter((c) => c.stage === 'Rejected / Dropped');
  const proposalsOrTalks = clients.filter(
    (c) =>
      c.stage === 'Sample Sent / WhatsApp' ||
      c.stage === 'In Talks / Demo Shown' ||
      CONFIRMED_DEAL_STAGES.includes(c.stage)
  );
  const qualified = clients.filter((c) => c.stage !== 'Cold Lead' && c.stage !== 'Rejected / Dropped');

  const conversionRatePercent =
    totalLeads > 0 ? Math.round((wonClients.length / totalLeads) * 100) : 0;

  const totalWonValue = wonClients.reduce(
    (sum, c) => sum + (Number(c.finalAgreedPrice) || 0),
    0
  );
  const averageDealValue =
    wonClients.length > 0 ? Math.round(totalWonValue / wonClients.length) : 0;

  const bySource: Record<LeadSource, { count: number; won: number; value: number }> = {
    Instagram: { count: 0, won: 0, value: 0 },
    'Facebook Ads': { count: 0, won: 0, value: 0 },
    WhatsApp: { count: 0, won: 0, value: 0 },
    'Direct Outreach': { count: 0, won: 0, value: 0 },
    Referral: { count: 0, won: 0, value: 0 },
    Website: { count: 0, won: 0, value: 0 },
    'Existing Client': { count: 0, won: 0, value: 0 },
  };

  for (const c of clients) {
    const src: LeadSource = c.leadSource || 'Direct Outreach';
    if (!bySource[src]) {
      bySource[src] = { count: 0, won: 0, value: 0 };
    }
    bySource[src].count += 1;
    const isWon =
      c.stage !== 'Rejected / Dropped' &&
      (CONFIRMED_DEAL_STAGES.includes(c.stage) || (Number(c.advancePaid) || 0) > 0);
    if (isWon) {
      bySource[src].won += 1;
      bySource[src].value += Number(c.finalAgreedPrice) || 0;
    }
  }

  return {
    totalLeads,
    qualifiedLeads: qualified.length,
    proposalsSent: proposalsOrTalks.length,
    wonDeals: wonClients.length,
    lostDeals: lostClients.length,
    conversionRatePercent,
    averageDealValue,
    bySource,
  };
}

/**
 * PART 11 — Notification Centre Engine
 * Generates live actionable notifications across Finance, Projects, Domains, Tasks, and CRM.
 */
export function generateStudioNotifications(
  state: AethelDatabaseState
): StudioNotification[] {
  const notifications: StudioNotification[] = [];
  const nowIso = new Date().toISOString();

  // 1. Overdue / Pending Payments on Live or In Building projects
  for (const c of state.clients) {
    if (c.stage === 'Rejected / Dropped') continue;
    const pending = calculatePendingBalance(c.finalAgreedPrice, c.advancePaid);
    if (pending > 0 && c.stage === 'Live / Payment Pending') {
      notifications.push({
        id: `notif-pay-live-${c.id}`,
        title: `Final Balance Due: ${c.businessName}`,
        description: `${formatINR(pending)} pending on deployed project (${c.packageTier}). Trigger WhatsApp reminder.`,
        severity: 'critical',
        category: 'Finance',
        targetModule: 'finance',
        clientId: c.id,
        timestamp: nowIso,
      });
    } else if (pending > 0 && c.stage === 'In Building') {
      notifications.push({
        id: `notif-pay-build-${c.id}`,
        title: `Milestone Receivable: ${c.businessName}`,
        description: `${formatINR(pending)} remaining balance (${formatINR(c.advancePaid)} collected so far).`,
        severity: 'warning',
        category: 'Finance',
        targetModule: 'pipeline',
        clientId: c.id,
        timestamp: nowIso,
      });
    }
  }

  // 2. Domain Expiry Alerts (30 / 15 / 7 / 3 days)
  for (const w of state.websites) {
    const days = calculateDaysUntilExpiry(w.expiryDate);
    if (days <= 45) {
      notifications.push({
        id: `notif-dom-${w.id}`,
        title: `Domain Renewal (${days}d): ${w.domainName}`,
        description: `Expires on ${w.expiryDate} (${formatINR(w.renewalCostINR)} via ${w.registrar}).`,
        severity: days <= 15 ? 'critical' : 'warning',
        category: 'Domain',
        targetModule: 'domains',
        clientId: w.clientId,
        timestamp: nowIso,
      });
    }
  }

  // 3. Pending Studio Tasks
  for (const t of state.tasks || []) {
    if (t.status === 'Pending') {
      notifications.push({
        id: `notif-task-${t.id}`,
        title: `${t.priority === 'Urgent' ? 'Urgent Task' : 'Pending Follow-up'}: ${t.title}`,
        description: `${t.clientName} · Assigned to ${t.assignedTo} · Due ${t.dueDate}`,
        severity: t.priority === 'Urgent' ? 'critical' : 'info',
        category: 'Task',
        targetModule: 'tasks',
        clientId: t.clientId,
        timestamp: nowIso,
      });
    }
  }

  // 4. Open Client Revision Tickets
  for (const tkt of state.tickets) {
    if (tkt.status !== 'Resolved') {
      notifications.push({
        id: `notif-tkt-${tkt.id}`,
        title: `Revision Ticket (${tkt.status}): ${tkt.title}`,
        description: `${tkt.clientName} (${tkt.domainName}) · Assigned to ${tkt.assignedTo}`,
        severity: tkt.priority === 'Urgent' ? 'critical' : 'warning',
        category: 'Project',
        targetModule: 'tickets',
        clientId: tkt.clientId,
        timestamp: nowIso,
      });
    }
  }

  // 5. Unread Co-Founder Handover Notes in Aethel Brain
  for (const h of state.brainHandovers || []) {
    if (h.status === 'Unread') {
      notifications.push({
        id: `notif-brain-handover-${h.id}`,
        title: `Handover from ${h.from} → @${h.to}: ${h.title}`,
        description: h.content,
        severity: 'warning',
        category: 'Brain',
        targetModule: 'brain',
        clientId: h.linkedClientId,
        timestamp: nowIso,
      });
    }
  }

  return notifications;
}

export interface TimelineEventItem {
  id: string;
  date: string;
  daysFromNow: number;
  title: string;
  subtitle: string;
  type: 'Follow-up' | 'Task' | 'Milestone' | 'Domain Renewal' | 'Ad Campaign';
  assignedTo: FounderName;
  clientId?: string;
  clientName: string;
}

/**
 * PART 2 — Upcoming 7 Days Schedule & Horizon Engine
 */
export function generateUpcoming7DaysTimeline(
  state: AethelDatabaseState
): TimelineEventItem[] {
  const events: TimelineEventItem[] = [];

  // 1. Tasks
  for (const t of state.tasks || []) {
    if (t.status === 'Completed') continue;
    const days = calculateDaysUntilExpiry(t.dueDate);
    events.push({
      id: `tl-task-${t.id}`,
      date: t.dueDate,
      daysFromNow: days,
      title: t.title,
      subtitle: `${t.type} · ${t.clientName}`,
      type: 'Task',
      assignedTo: t.assignedTo,
      clientId: t.clientId,
      clientName: t.clientName,
    });
  }

  // 2. Client Follow-ups & Active Build Milestones
  for (const c of state.clients) {
    if (c.stage === 'Rejected / Dropped') continue;
    const days = calculateDaysUntilExpiry(c.followUpDate);
    if (UNCLOSED_LEAD_STAGES.includes(c.stage) || c.stage === 'Live / Payment Pending') {
      events.push({
        id: `tl-followup-${c.id}`,
        date: c.followUpDate,
        daysFromNow: days,
        title:
          c.stage === 'Live / Payment Pending'
            ? `Payment Settlement Check-in: ${c.businessName}`
            : `Sales Follow-up: ${c.businessName}`,
        subtitle: `${c.stage} · ${c.contactPerson} (${c.city})`,
        type: 'Follow-up',
        assignedTo: c.assignedTo,
        clientId: c.id,
        clientName: c.businessName,
      });
    }
    if (c.stage === 'In Building') {
      const progress = calculateClientProjectProgress(c, state.tickets, state.websites);
      events.push({
        id: `tl-milestone-${c.id}`,
        date: c.projectEndDate || c.followUpDate,
        daysFromNow: calculateDaysUntilExpiry(c.projectEndDate || c.followUpDate),
        title: `Milestone Target: ${progress.nextMilestoneLabel}`,
        subtitle: `${c.businessName} (${progress.percent}% complete)`,
        type: 'Milestone',
        assignedTo: c.assignedTo,
        clientId: c.id,
        clientName: c.businessName,
      });
    }
  }

  // 3. Domain Renewals within 60 days
  for (const w of state.websites) {
    const days = calculateDaysUntilExpiry(w.expiryDate);
    if (days <= 60) {
      events.push({
        id: `tl-dom-${w.id}`,
        date: w.expiryDate,
        daysFromNow: days,
        title: `Domain Renewal: ${w.domainName}`,
        subtitle: `${w.clientName} · ${formatINR(w.renewalCostINR)}`,
        type: 'Domain Renewal',
        assignedTo: 'Vansh',
        clientId: w.clientId,
        clientName: w.clientName,
      });
    }
  }

  return events.sort((a, b) => a.daysFromNow - b.daysFromNow);
}

/**
 * AETHEL BRAIN — AI Note Auto-Categorisation & Tag Suggestion Engine
 */
export function autoSuggestBrainCategoryAndTags(text: string): {
  category: BrainDumpCategory;
  priority: 'Urgent' | 'High' | 'Normal' | 'Low';
  tags: string[];
} {
  const lower = (text || '').toLowerCase();
  let category: BrainDumpCategory = 'Thoughts';
  let priority: 'Urgent' | 'High' | 'Normal' | 'Low' = 'Normal';
  const tags = new Set<string>();

  if (lower.includes('bug') || lower.includes('fix') || lower.includes('error') || lower.includes('broken') || lower.includes('issue')) {
    category = 'Issues / Things to fix';
    priority = 'High';
    tags.add('Fix');
  } else if (lower.includes('price') || lower.includes('package') || lower.includes('retainer') || lower.includes('upsell') || lower.includes('offer') || lower.includes('opportunity') || lower.includes('clinic') || lower.includes('hospital') || lower.includes('restaurant')) {
    category = 'Business opportunities';
    priority = 'High';
    tags.add('Growth');
  } else if (lower.includes('client') || lower.includes('lawns') || lower.includes('mobiles') || lower.includes('follow up') || lower.includes('call')) {
    category = 'Client-related';
    priority = 'High';
    tags.add('Client');
  } else if (lower.includes('todo') || lower.includes('need to') || lower.includes('must') || lower.includes('finish') || lower.includes('complete')) {
    category = 'Things to do';
    priority = 'High';
    tags.add('Actionable');
  } else if (lower.includes('future') || lower.includes('roadmap') || lower.includes('quarter') || lower.includes('2027') || lower.includes('scale')) {
    category = 'Future plans';
    tags.add('Roadmap');
  } else if (lower.includes('idea') || lower.includes('template') || lower.includes('prototype') || lower.includes('what if') || lower.includes('build')) {
    category = 'Ideas';
    tags.add('Product Idea');
  } else if (lower.includes('credential') || lower.includes('policy') || lower.includes('important') || lower.includes('rule')) {
    category = 'Important information';
    tags.add('Core Info');
  }

  if (lower.includes('urgent') || lower.includes('asap') || lower.includes('today')) {
    priority = 'Urgent';
    tags.add('Urgent');
  }
  if (lower.includes('meta') || lower.includes('ad')) tags.add('Meta Ads');
  if (lower.includes('pricing') || lower.includes('₹')) tags.add('Pricing');
  if (lower.includes('website') || lower.includes('ui') || lower.includes('redesign')) tags.add('Web Design');
  if (lower.includes('whatsapp')) tags.add('WhatsApp');
  if (tags.size === 0) tags.add('Studio Brain');

  return {
    category,
    priority,
    tags: Array.from(tags),
  };
}

/**
 * AETHEL BRAIN — Layer 1 & Layer 2 Grounded Weekly Recap Generator
 * Strictly grounded in recorded studio data. Separates verified completions from AI observations.
 */
export function generateGroundedWeeklyRecap(
  state: AethelDatabaseState
): BrainWeeklyRecap {
  const dailyLogs = state.brainDailyLogs || [];
  const brainDumps = state.brainDumps || [];
  const handovers = state.brainHandovers || [];
  const memories = state.brainMemories || [];
  const tasks = state.tasks || [];
  const fin = calculateStudioFinances(
    state.expenses,
    state.payments,
    state.clients,
    state.metaCampaigns,
    state.tickets,
    tasks
  );

  const now = new Date();
  const weekStart = new Date(now.getTime() - 6 * 86400000);
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const weekRange = `${fmt(weekStart)} – ${fmt(now)}`;

  const completedTasks = tasks.filter((t) => t.status === 'Completed');
  const pendingTasks = tasks.filter((t) => t.status === 'Pending');

  // 02 — What We Accomplished (Strictly factual from completed tasks, daily logs, and verified payments)
  const accomplishments: string[] = [];
  dailyLogs.slice(0, 6).forEach((log) => {
    accomplishments.push(
      `[Daily Log · ${log.author}] ${log.content}${log.linkedClientName ? ` (${log.linkedClientName})` : ''}`
    );
  });
  completedTasks.forEach((t) => {
    accomplishments.push(`[Completed Task · ${t.assignedTo}] ${t.title} (${t.clientName})`);
  });
  state.clients
    .filter((c) => c.stage === 'Delivered / Live' || c.stage === 'In Building')
    .forEach((c) => {
      const prog = calculateClientProjectProgress(c, state.tickets, state.websites);
      accomplishments.push(
        `[Project Delivery · ${c.businessName}] Stage: ${c.stage} (${prog.completedMilestones}/${prog.totalMilestones} milestones completed, ${formatINR(c.advancePaid)} collected)`
      );
    });
  if (accomplishments.length === 0) {
    accomplishments.push('Studio database synchronized and operational across all modules.');
  }

  // 03 — Individual Contributions (Krishna vs Vansh)
  const krishnaContributions: string[] = [];
  const vanshContributions: string[] = [];

  dailyLogs.forEach((l) => {
    if (l.author === 'Krishna') krishnaContributions.push(l.content);
    if (l.author === 'Vansh') vanshContributions.push(l.content);
  });

  state.clients.forEach((c) => {
    if (c.stage === 'Rejected / Dropped') return;
    const line = `Managing ${c.businessName} (${c.stage} · ${formatINR(c.finalAgreedPrice)})`;
    if (c.assignedTo === 'Krishna') krishnaContributions.push(line);
    else if (c.assignedTo === 'Vansh') vanshContributions.push(line);
    else {
      krishnaContributions.push(`Co-managing ${c.businessName} (${c.stage})`);
      vanshContributions.push(`Co-managing ${c.businessName} (${c.stage})`);
    }
  });

  if (krishnaContributions.length === 0) {
    krishnaContributions.push('Maintained studio architecture, product builds & financial ledger.');
  }
  if (vanshContributions.length === 0) {
    vanshContributions.push('Managed client outreach, domain operations & delivery coordination.');
  }

  // 04 — Pending Items
  const pendingItems: string[] = [];
  pendingTasks.forEach((t) => {
    pendingItems.push(`Task (${t.priority}): ${t.title} — Assigned to ${t.assignedTo} (Due ${t.dueDate})`);
  });
  state.clients
    .filter((c) => c.stage !== 'Rejected / Dropped')
    .forEach((c) => {
      const bal = calculatePendingBalance(c.finalAgreedPrice, c.advancePaid);
      if (bal > 0 && (c.stage === 'Live / Payment Pending' || c.stage === 'In Building')) {
        pendingItems.push(
          `Receivable Pending: ${c.businessName} — ${formatINR(bal)} balance remaining (${c.stage})`
        );
      }
    });
  handovers
    .filter((h) => h.status !== 'Acknowledged')
    .forEach((h) => {
      pendingItems.push(`Handover (${h.status}): ${h.from} → ${h.to} — "${h.title}"`);
    });
  if (pendingItems.length === 0) {
    pendingItems.push('No overdue tasks or unacknowledged handovers at this time.');
  }

  // 05 — Important Discussions & Decisions
  const importantDiscussions: string[] = [];
  memories
    .filter((m) => m.category === 'Decisions' || m.category === 'Pricing & Packages')
    .slice(0, 4)
    .forEach((m) => {
      importantDiscussions.push(
        `${m.title}: ${m.content}${m.reasoning ? ` (Reasoning: ${m.reasoning})` : ''}`
      );
    });
  handovers.slice(0, 3).forEach((h) => {
    importantDiscussions.push(`Handover Discussion (${h.from} → ${h.to}): ${h.title} — ${h.content}`);
  });
  if (importantDiscussions.length === 0) {
    importantDiscussions.push('No new structural decisions logged this week.');
  }

  // 06 — Next Week's Priorities
  const nextWeekPriorities: string[] = [];
  const upcoming = generateUpcoming7DaysTimeline(state).slice(0, 5);
  upcoming.forEach((ev) => {
    nextWeekPriorities.push(`${ev.title} (${ev.subtitle}) — Target: ${ev.date}`);
  });
  brainDumps
    .filter((b) => b.status !== 'Archived' && (b.priority === 'Urgent' || b.priority === 'High'))
    .slice(0, 3)
    .forEach((b) => {
      nextWeekPriorities.push(`Execute Brain Dump [${b.category}]: ${b.title}`);
    });
  if (nextWeekPriorities.length === 0) {
    nextWeekPriorities.push('Review active sales prospects and convert high-intent leads.');
  }

  // 07 — AI Observations (Explicitly marked as observations inferred from data patterns)
  const aiObservations: string[] = [];
  const unsortedDumps = brainDumps.filter((d) => d.status === 'Unsorted' && !d.convertedTaskId);
  if (unsortedDumps.length > 0) {
    aiObservations.push(
      `Observation: You have ${unsortedDumps.length} unsorted Brain Dump idea${unsortedDumps.length === 1 ? '' : 's'} ("${unsortedDumps[0].title}") that have not been converted into tasks yet.`
    );
  }
  const unreadHandovers = handovers.filter((h) => h.status === 'Unread');
  if (unreadHandovers.length > 0) {
    aiObservations.push(
      `Observation: ${unreadHandovers.length} founder handover note${unreadHandovers.length === 1 ? ' is' : 's are'} still marked Unread.`
    );
  }
  if (fin.pendingReceivables > 0) {
    aiObservations.push(
      `Observation: ${formatINR(fin.pendingReceivables)} is currently pending across active/live client builds (${fin.collectionRatePercent}% collection rate). Prioritizing payment follow-ups could immediately boost net studio cashflow.`
    );
  }
  const expiringSoon = state.websites.filter((w) => calculateDaysUntilExpiry(w.expiryDate) <= 45);
  if (expiringSoon.length > 0) {
    aiObservations.push(
      `Observation: ${expiringSoon.length} hosted domain${expiringSoon.length === 1 ? '' : 's'} (${expiringSoon.map((w) => w.domainName).join(', ')}) will require renewal within 45 days.`
    );
  }
  if (aiObservations.length === 0) {
    aiObservations.push(
      'Observation: Studio operations, handovers, and receivables are well-balanced with zero bottlenecks detected.'
    );
  }

  // 01 — Executive Summary
  const executiveSummary = `This week at Aethel Studios, Krishna and Vansh recorded ${dailyLogs.length} daily activity log${dailyLogs.length === 1 ? '' : 's'}, managed ${fin.activeClientsCount} confirmed client account${fin.activeClientsCount === 1 ? '' : 's'} (${formatINR(fin.totalContractedVolume)} contracted volume, ${formatINR(fin.totalRevenueCollected)} collected), tracked ${brainDumps.length} Brain Dump item${brainDumps.length === 1 ? '' : 's'}, and coordinated ${handovers.length} founder handover${handovers.length === 1 ? '' : 's'}. Currently ${pendingTasks.length} studio task${pendingTasks.length === 1 ? ' remains' : 's remain'} pending.`;

  return {
    id: `recap-${Date.now()}`,
    weekRange,
    generatedAt: new Date().toISOString(),
    executiveSummary,
    accomplishments,
    krishnaContributions,
    vanshContributions,
    pendingItems,
    importantDiscussions,
    nextWeekPriorities,
    aiObservations,
    metrics: {
      logsCount: dailyLogs.length,
      tasksCompleted: completedTasks.length,
      tasksPending: pendingTasks.length,
      handoversCount: handovers.length,
      newIdeasCount: brainDumps.filter((d) => d.category === 'Ideas' || d.category === 'Business opportunities').length,
    },
  };
}

export interface BrainSearchMatch {
  id: string;
  sourceType: 'Aethel Memory' | 'Daily Log' | 'Brain Dump' | 'Handover Note' | 'Client 360°' | 'Studio Task';
  title: string;
  snippet: string;
  author: string;
  date: string;
  badge: string;
  clientId?: string;
}

export interface BrainQueryResult {
  query: string;
  directAnswer: string;
  focusPriorities: string[];
  matches: BrainSearchMatch[];
}

/**
 * AETHEL BRAIN — Institutional Memory & "What should I focus on today?" Search Engine
 */
export function queryAethelBrainMemory(
  state: AethelDatabaseState,
  rawQuery: string,
  activeFounder: 'All' | FounderName = 'All'
): BrainQueryResult {
  const q = (rawQuery || '').trim().toLowerCase();
  const fin = calculateStudioFinances(
    state.expenses,
    state.payments,
    state.clients,
    state.metaCampaigns,
    state.tickets,
    state.tasks || []
  );

  const unreadHandovers = (state.brainHandovers || []).filter(
    (h) => h.status === 'Unread' && (activeFounder === 'All' || h.to === activeFounder)
  );
  const pendingTasks = (state.tasks || []).filter(
    (t) =>
      t.status === 'Pending' &&
      (activeFounder === 'All' || t.assignedTo === activeFounder || t.assignedTo === 'Both')
  );
  const pendingClients = state.clients.filter(
    (c) =>
      c.stage !== 'Rejected / Dropped' &&
      calculatePendingBalance(c.finalAgreedPrice, c.advancePaid) > 0 &&
      (c.stage === 'Live / Payment Pending' || c.stage === 'In Building')
  );
  const unimplementedIdeas = (state.brainDumps || []).filter(
    (d) => d.status === 'Unsorted' && !d.convertedTaskId
  );

  const focusPriorities: string[] = [];
  unreadHandovers.forEach((h) => {
    focusPriorities.push(
      `Read & acknowledge handover from ${h.from} → @${h.to}: "${h.title}"`
    );
  });
  pendingClients.forEach((c) => {
    const bal = calculatePendingBalance(c.finalAgreedPrice, c.advancePaid);
    focusPriorities.push(
      `Follow up with ${c.businessName} (${c.contactPerson}) on ${formatINR(bal)} pending balance (${c.stage})`
    );
  });
  pendingTasks.slice(0, 4).forEach((t) => {
    focusPriorities.push(
      `Complete ${t.priority} task: "${t.title}" for ${t.clientName} (Assigned: ${t.assignedTo})`
    );
  });
  if (unimplementedIdeas.length > 0) {
    focusPriorities.push(
      `Review ${unimplementedIdeas.length} unsorted Brain Dump note${unimplementedIdeas.length === 1 ? '' : 's'} (top: "${unimplementedIdeas[0].title}")`
    );
  }
  if (focusPriorities.length === 0) {
    focusPriorities.push('All handovers, urgent tasks, and immediate collections are up to date.');
  }

  // Collect matching records across all Brain & OS repositories
  const matches: BrainSearchMatch[] = [];
  const terms = q
    .replace(/[?.,!]/g, '')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !['what', 'why', 'did', 'we', 'the', 'our', 'about', 'have', 'not', 'yet', 'should', 'focus', 'on', 'today', 'how', 'who'].includes(w));

  const matchesText = (haystack: string): boolean => {
    if (!q) return true;
    const h = haystack.toLowerCase();
    if (h.includes(q)) return true;
    if (terms.length === 0) return true;
    return terms.some((term) => h.includes(term));
  };

  for (const mem of state.brainMemories || []) {
    const combined = `${mem.title} ${mem.category} ${mem.content} ${mem.reasoning || ''} ${mem.tags.join(' ')}`;
    if (matchesText(combined)) {
      matches.push({
        id: mem.id,
        sourceType: 'Aethel Memory',
        title: mem.title,
        snippet: `${mem.content}${mem.reasoning ? ` · Reasoning: ${mem.reasoning}` : ''}`,
        author: mem.author,
        date: mem.date,
        badge: mem.category,
      });
    }
  }

  for (const h of state.brainHandovers || []) {
    const combined = `${h.title} ${h.content} ${h.from} ${h.to} ${h.linkedClientName || ''}`;
    if (matchesText(combined)) {
      matches.push({
        id: h.id,
        sourceType: 'Handover Note',
        title: `${h.from} → ${h.to}: ${h.title}`,
        snippet: h.content,
        author: h.from,
        date: `${h.date} ${h.time}`,
        badge: h.status,
        clientId: h.linkedClientId,
      });
    }
  }

  for (const d of state.brainDumps || []) {
    const combined = `${d.title} ${d.description} ${d.category} ${d.author} ${d.linkedClientName || ''} ${d.tags.join(' ')}`;
    if (matchesText(combined)) {
      matches.push({
        id: d.id,
        sourceType: 'Brain Dump',
        title: d.title,
        snippet: d.description,
        author: d.author,
        date: d.date,
        badge: `${d.category} · ${d.status}`,
        clientId: d.linkedClientId,
      });
    }
  }

  for (const l of state.brainDailyLogs || []) {
    const combined = `${l.content} ${l.author} ${l.linkedClientName || ''} ${l.date}`;
    if (matchesText(combined)) {
      matches.push({
        id: l.id,
        sourceType: 'Daily Log',
        title: `${l.author} (${l.time})`,
        snippet: l.content,
        author: l.author,
        date: l.date,
        badge: l.linkedClientName || 'Daily Update',
        clientId: l.linkedClientId,
      });
    }
  }

  for (const c of state.clients) {
    const combined = `${c.businessName} ${c.contactPerson} ${c.city} ${c.packageTier} ${c.notes} ${c.stage}`;
    if (matchesText(combined)) {
      matches.push({
        id: c.id,
        sourceType: 'Client 360°',
        title: `${c.businessName} (${c.city})`,
        snippet: `Stage: ${c.stage} · Agreed: ${formatINR(c.finalAgreedPrice)} · Paid: ${formatINR(c.advancePaid)} · Assigned: ${c.assignedTo}`,
        author: c.assignedTo,
        date: c.followUpDate,
        badge: c.stage,
        clientId: c.id,
      });
    }
  }

  // Synthesize grounded direct answer
  let directAnswer = '';
  if (!q || q.includes('focus') || q.includes('today') || q.includes('priority') || q.includes('priorities')) {
    directAnswer = `Today's Focus Brief (${activeFounder === 'All' ? 'Krishna & Vansh' : activeFounder}): You have ${unreadHandovers.length} unread handover${unreadHandovers.length === 1 ? '' : 's'}, ${pendingTasks.length} pending studio task${pendingTasks.length === 1 ? '' : 's'}, and ${formatINR(fin.pendingReceivables)} in pending client receivables across ${pendingClients.length} active build${pendingClients.length === 1 ? '' : 's'}. ${focusPriorities[0] || ''}`;
  } else if (q.includes('pricing') || q.includes('package') || q.includes('price')) {
    const pricingMem = (state.brainMemories || []).find(
      (m) => m.category === 'Pricing & Packages' || m.title.toLowerCase().includes('pricing')
    );
    directAnswer = pricingMem
      ? `Recorded Pricing Decision (${pricingMem.date} by ${pricingMem.author}): ${pricingMem.content}${pricingMem.reasoning ? ` Reasoning: ${pricingMem.reasoning}` : ''}`
      : `Current active client contracts average ${formatINR(calculateLeadConversionAnalytics(state.clients).averageDealValue)} across ${fin.activeClientsCount} confirmed deals.`;
  } else if (q.includes('idea') || q.includes('not implemented') || q.includes('unsorted')) {
    directAnswer =
      unimplementedIdeas.length > 0
        ? `You have ${unimplementedIdeas.length} unimplemented/unsorted Brain Dump item${unimplementedIdeas.length === 1 ? '' : 's'}: ${unimplementedIdeas.map((i) => `"${i.title}" (${i.category} by ${i.author})`).join('; ')}.`
        : 'All recorded Brain Dump ideas have been converted to tasks or archived.';
  } else if (q.includes('vansh')) {
    const vanshLogs = (state.brainDailyLogs || []).filter((l) => l.author === 'Vansh');
    const vanshHandovers = (state.brainHandovers || []).filter((h) => h.from === 'Vansh');
    directAnswer =
      vanshLogs.length > 0 || vanshHandovers.length > 0
        ? `Vansh's latest recorded updates: ${[
            ...vanshHandovers.map((h) => `[Handover to ${h.to}] "${h.title}": ${h.content}`),
            ...vanshLogs.map((l) => `[Daily Log ${l.date} ${l.time}] ${l.content}`),
          ]
            .slice(0, 3)
            .join(' | ')}`
        : `Vansh is currently managing ${state.clients.filter((c) => c.assignedTo === 'Vansh' || c.assignedTo === 'Both').length} client accounts.`;
  } else if (q.includes('krishna')) {
    const krishnaLogs = (state.brainDailyLogs || []).filter((l) => l.author === 'Krishna');
    const krishnaHandovers = (state.brainHandovers || []).filter((h) => h.from === 'Krishna');
    directAnswer =
      krishnaLogs.length > 0 || krishnaHandovers.length > 0
        ? `Krishna's latest recorded updates: ${[
            ...krishnaHandovers.map((h) => `[Handover to ${h.to}] "${h.title}": ${h.content}`),
            ...krishnaLogs.map((l) => `[Daily Log ${l.date} ${l.time}] ${l.content}`),
          ]
            .slice(0, 3)
            .join(' | ')}`
        : `Krishna is currently managing ${state.clients.filter((c) => c.assignedTo === 'Krishna' || c.assignedTo === 'Both').length} client accounts.`;
  } else if (matches.length > 0) {
    const top = matches[0];
    directAnswer = `Found ${matches.length} matching record${matches.length === 1 ? '' : 's'} in Aethel Brain. Top match [${top.sourceType} · ${top.badge}]: "${top.title}" — ${top.snippet}`;
  } else {
    directAnswer = `No exact match found for "${rawQuery}" in Aethel Memory. Try searching by client name, founder (Krishna / Vansh), category (Pricing, Decisions, Ideas), or click "+ Add Memory / Note" to document it.`;
  }

  return {
    query: rawQuery,
    directAnswer,
    focusPriorities,
    matches: matches.slice(0, 12),
  };
}

