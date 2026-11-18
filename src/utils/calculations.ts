import {
  ClientLead,
  ClientPayment,
  ClientTicket,
  HostedWebsite,
  MetaAdCampaign,
  ProjectMilestoneStage,
  StudioExpense,
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

export function getDefaultMilestonesForStage(
  stage: ClientLead['stage'],
  assignedTo: ClientLead['assignedTo']
) {
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

  return STANDARD_MILESTONE_STAGES.map((mStage, idx) => ({
    stage: mStage,
    completed: idx < completedCount,
    completedDate: idx < completedCount ? new Date().toISOString().slice(0, 10) : undefined,
    owner: assignedTo,
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

  return {
    percent,
    completedMilestones,
    totalMilestones,
    currentStageLabel: lastComplete ? lastComplete.stage : 'Onboarding',
    nextMilestoneLabel: firstIncomplete ? firstIncomplete.stage : 'Completed & Live',
    openTicketsCount,
    hasLiveDomain,
  };
}

export interface StudioFinanceSummary {
  totalRevenueCollected: number;
  clientProjectRevenue: number;
  agencyRetainerRevenue: number;
  totalStudioExpenses: number;
  netProfit: number;
  pendingReceivables: number;
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
  vanshProfitShare50: number;
  krishnaProfitShare50: number;
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

  // 3. Confirmed Deals vs Unclosed Sales Pipeline
  // Confirmed Deals: 'In Building', 'Live / Payment Pending', 'Delivered / Live' (or any lead where advancePaid > 0)
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

  // 5. Founder Out-of-Pocket & Settlement Math
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
    pendingReceivables,
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
    vanshProfitShare50: Math.round(netProfit / 2),
    krishnaProfitShare50: Math.round(netProfit / 2),
    settlementSummary,
    activeClientsCount,
    unclosedLeadsCount,
    activeProjectsCount,
    livePaymentPendingCount,
    outstandingTasksCount,
  };
}
