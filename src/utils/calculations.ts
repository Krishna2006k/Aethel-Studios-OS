import type { ClientLead, ClientPayment, ExpenseItem } from '../types';

/**
 * Formats a number in Indian Rupee numbering system (₹1,24,500)
 */
export function formatINR(amount: number): string {
  const isNegative = amount < 0;
  const absVal = Math.round(Math.abs(amount));
  const formatted = absVal.toLocaleString('en-IN');
  return `${isNegative ? '-₹' : '₹'}${formatted}`;
}

/**
 * Calculates pending balance for a client lead
 */
export function calculatePendingBalance(finalAgreedPrice: number, advancePaid: number): number {
  return Math.max(0, finalAgreedPrice - advancePaid);
}

/**
 * Calculates Cost Per Lead (CPL) in INR
 */
export function calculateCPL(adSpendUsed: number, leadsGenerated: number): number {
  if (leadsGenerated <= 0 || adSpendUsed <= 0) return 0;
  return Math.round(adSpendUsed / leadsGenerated);
}

/**
 * Calculates days remaining from referenceDate (defaults to today) to targetDate (YYYY-MM-DD)
 */
export function calculateDaysRemaining(targetDateStr: string, referenceDate: Date = new Date()): number {
  if (!targetDateStr) return 0;
  const [y, m, d] = targetDateStr.split('-').map(Number);
  if (!y || !m || !d) return 0;
  const targetUTC = Date.UTC(y, m - 1, d);
  const refUTC = Date.UTC(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );
  const diffMs = targetUTC - refUTC;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calculates campaign elapsed percentage (0 to 100)
 */
export function calculateCampaignProgress(
  startDateStr: string,
  endDateStr: string,
  referenceDate: Date = new Date()
): { elapsedDays: number; totalDays: number; daysRemaining: number; percentComplete: number } {
  const [sy, sm, sd] = startDateStr.split('-').map(Number);
  const [ey, em, ed] = endDateStr.split('-').map(Number);
  const startUTC = Date.UTC(sy, sm - 1, sd);
  const endUTC = Date.UTC(ey, em - 1, ed);
  const refUTC = Date.UTC(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );

  const totalDays = Math.max(1, Math.round((endUTC - startUTC) / (1000 * 60 * 60 * 24)));
  const elapsedDays = Math.max(0, Math.min(totalDays, Math.round((refUTC - startUTC) / (1000 * 60 * 60 * 24))));
  const daysRemaining = Math.max(0, Math.round((endUTC - refUTC) / (1000 * 60 * 60 * 24)));
  const percentComplete = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));

  return { elapsedDays, totalDays, daysRemaining, percentComplete };
}

export interface StudioFinanceSummary {
  totalRevenueCollected: number;
  totalStudioExpenses: number;
  netProfit: number;
  pendingReceivables: number;
  krishnaOutOfPocket: number;
  vanshOutOfPocket: number;
  studioAccountExpenses: number;
  krishnaCollectedDirect: number;
  vanshCollectedDirect: number;
  studioAccountCollected: number;
  equalExpenseSharePerFounder: number;
  krishnaReimbursementDue: number;
  vanshReimbursementDue: number;
  settlementHeadline: string;
}

/**
 * Calculates full Studio Cashflow, Net Profit, Pending Client Receivables,
 * and Co-Founder Out-of-Pocket Split & Settlement Ledger
 */
export function calculateStudioFinances(
  expenses: ExpenseItem[],
  payments: ClientPayment[],
  clients: ClientLead[]
): StudioFinanceSummary {
  const totalRevenueCollected = payments.reduce((sum, p) => sum + (Number(p.amountReceived) || 0), 0);
  const totalStudioExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const netProfit = totalRevenueCollected - totalStudioExpenses;

  // Pending receivables from active/building/live clients
  const pendingReceivables = clients
    .filter(
      (c) =>
        c.stage === 'In Building' ||
        c.stage === 'Live / Payment Pending' ||
        c.stage === 'Finalized / In Progress' ||
        c.stage === 'Delivered / Live'
    )
    .reduce((sum, c) => sum + calculatePendingBalance(c.finalAgreedPrice, c.advancePaid), 0);

  // Out-of-pocket expenses (unreimbursed personal expenditure)
  const krishnaOutOfPocket = expenses
    .filter((e) => e.paidBy === 'Krishna' && !e.reimbursed)
    .reduce((sum, e) => sum + e.amount, 0);

  const vanshOutOfPocket = expenses
    .filter((e) => e.paidBy === 'Vansh' && !e.reimbursed)
    .reduce((sum, e) => sum + e.amount, 0);

  const studioAccountExpenses = expenses
    .filter((e) => e.paidBy === 'Studio Account')
    .reduce((sum, e) => sum + e.amount, 0);

  const krishnaCollectedDirect = payments
    .filter((p) => p.receivedBy === 'Krishna')
    .reduce((sum, p) => sum + p.amountReceived, 0);

  const vanshCollectedDirect = payments
    .filter((p) => p.receivedBy === 'Vansh')
    .reduce((sum, p) => sum + p.amountReceived, 0);

  const studioAccountCollected = payments
    .filter((p) => p.receivedBy === 'Studio Account')
    .reduce((sum, p) => sum + p.amountReceived, 0);

  const totalPersonalOutOfPocket = krishnaOutOfPocket + vanshOutOfPocket;
  const equalExpenseSharePerFounder = Math.round(totalPersonalOutOfPocket / 2);

  // Reimbursement from studio pool to each founder for personal out-of-pocket spend
  const krishnaReimbursementDue = krishnaOutOfPocket;
  const vanshReimbursementDue = vanshOutOfPocket;

  // Also compute direct founder-to-founder parity on personal out-of-pocket spend
  const diff = krishnaOutOfPocket - vanshOutOfPocket;
  let settlementHeadline = 'Both founders have equal personal out-of-pocket spend (₹0 net difference).';
  if (diff > 0) {
    settlementHeadline = `Krishna paid ${formatINR(diff)} more out-of-pocket than Vansh • Studio owes Krishna ${formatINR(krishnaOutOfPocket)} & Vansh ${formatINR(vanshOutOfPocket)} (or Vansh transfers ${formatINR(Math.round(diff / 2))} to equalize personal spend).`;
  } else if (diff < 0) {
    const absDiff = Math.abs(diff);
    settlementHeadline = `Vansh paid ${formatINR(absDiff)} more out-of-pocket than Krishna • Studio owes Vansh ${formatINR(vanshOutOfPocket)} & Krishna ${formatINR(krishnaOutOfPocket)} (or Krishna transfers ${formatINR(Math.round(absDiff / 2))} to equalize personal spend).`;
  }

  return {
    totalRevenueCollected,
    totalStudioExpenses,
    netProfit,
    pendingReceivables,
    krishnaOutOfPocket,
    vanshOutOfPocket,
    studioAccountExpenses,
    krishnaCollectedDirect,
    vanshCollectedDirect,
    studioAccountCollected,
    equalExpenseSharePerFounder,
    krishnaReimbursementDue,
    vanshReimbursementDue,
    settlementHeadline,
  };
}

/**
 * Formats a clean WhatsApp wa.me link with +91 prefix and pre-filled message
 */
export function buildWhatsAppUrl(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '');
  const normalized = digits.startsWith('91') && digits.length >= 12 ? digits : `91${digits.slice(-10)}`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
