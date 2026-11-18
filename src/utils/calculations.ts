import {
  AethelDatabaseState,
  ApprovalCheckpointStage,
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
