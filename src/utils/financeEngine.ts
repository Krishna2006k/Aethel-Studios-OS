import {
  AethelDatabaseState,
  ClientInvoice,
  ClientLead,
  ClientPayment,
  ClientQuotation,
  DocumentTemplate,
  FinanceDocumentType,
  FinancePaymentMethod,
  FinanceSettings,
  FinanceTransaction,
  GeneratedDocument,
  InvoiceLineItem,
  InvoiceStatus,
  StudioExpense,
} from '../types';

export type FinanceDateFilterPreset =
  | 'This Month'
  | 'Last Month'
  | 'This Quarter'
  | 'This Year'
  | 'All Time'
  | 'Custom Range';

export const DEFAULT_DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'tpl-aethel-editorial',
    name: 'Aethel Editorial Monograph',
    description:
      'Signature Aethel Studios dark obsidian header with cobalt precision accents and editorial typography.',
    accentColor: '#2563EB',
    headerStyle: 'editorial-dark',
    fontFamily: 'Plus Jakarta Sans',
    showLogo: true,
    footerText:
      'Aethel Studios · Digital Experience, Web Engineering & Growth Systems · Pune, Maharashtra',
  },
  {
    id: 'tpl-aethel-minimal',
    name: 'Aethel Executive Minimal',
    description:
      'Clean white architectural sheet with hairline borders and high-contrast monochrome hierarchy for print.',
    accentColor: '#0B0F19',
    headerStyle: 'minimal-clean',
    fontFamily: 'Plus Jakarta Sans',
    showLogo: true,
    footerText:
      'Thank you for partnering with Aethel Studios · aethelstudios.in@gmail.com',
  },
  {
    id: 'tpl-aethel-bold',
    name: 'Aethel Studio Cobalt',
    description:
      'Modern agency statement layout with royal cobalt header band and structured financial summary blocks.',
    accentColor: '#1D4ED8',
    headerStyle: 'bold-accent',
    fontFamily: 'Plus Jakarta Sans',
    showLogo: true,
    footerText:
      'Aethel Studios · Co-Founded by Vansh Khakole & Krishna Khakole · Pune, India',
  },
];

export const DEFAULT_FINANCE_SETTINGS: FinanceSettings = {
  studioName: 'Aethel Studios',
  contactPerson1: 'Krishna Khakole',
  phone1: '+91 98765 43210',
  contactPerson2: 'Vansh Khakole',
  phone2: '+91 98765 43211',
  email: 'aethelstudios.in@gmail.com',
  website: 'https://aethelstudios.in',
  address: 'Pune, Maharashtra, India',
  upiId: 'aethelstudios@upi',
  bankName: 'HDFC Bank',
  bankAccountName: 'Aethel Studios',
  bankAccountNumber: '',
  bankIfsc: '',
  preferredPaymentMethods: ['UPI', 'Bank Transfer', 'Cash'],
  logoText: 'AETHEL STUDIOS',
  accentColor: '#2563EB',
  headerStyle: 'editorial-dark',
  footerText:
    'Aethel Studios · Boutique Digital Agency & Growth Engineering · Pune, Maharashtra, India',
  defaultTemplateId: 'tpl-aethel-editorial',
  gstRegistrationStatus: 'Unregistered',
  gstEnabled: false,
  gstin: '',
  gstRatePercent: 0,
  gstDisclaimer: 'GST not charged. Supplier is not registered under GST.',
  invoicePrefix: 'AS-I-',
  receiptPrefix: 'AS-R-',
  quotationPrefix: 'AS-Q-',
  statementPrefix: 'AS-S-',
  expensePrefix: 'AS-E-',
  nextInvoiceNumber: 1,
  nextReceiptNumber: 1,
  nextQuotationNumber: 1,
  nextStatementNumber: 1,
  nextExpenseNumber: 1,
};

export function normalizePaymentMethod(method?: string): FinancePaymentMethod {
  if (!method) return 'UPI';
  const m = method.trim();
  if (m === 'UPI') return 'UPI';
  if (m === 'Cash') return 'Cash';
  if (m === 'Bank Transfer' || m === 'Bank NEFT/IMPS') return 'Bank Transfer';
  return 'Other';
}

/**
 * Safe sequential document numbering that never reuses numbers even if records are cancelled or deleted.
 */
export function generateNextDocumentNumber(
  docType: 'Invoice' | 'Receipt' | 'Quotation' | 'Statement' | 'Expense',
  state: AethelDatabaseState
): { formatted: string; nextCounter: number } {
  const settings = state.financeSettings || DEFAULT_FINANCE_SETTINGS;
  let prefix = settings.invoicePrefix || 'AS-I-';
  let minCounter = 1;
  const existingNumbers: string[] = [];

  if (docType === 'Invoice') {
    prefix = settings.invoicePrefix || 'AS-I-';
    minCounter = settings.nextInvoiceNumber || 1;
    (state.invoices || []).forEach((i) => existingNumbers.push(i.invoiceNumber));
  } else if (docType === 'Receipt') {
    prefix = settings.receiptPrefix || 'AS-R-';
    minCounter = settings.nextReceiptNumber || 1;
    (state.payments || []).forEach((p) => {
      if (p.receiptNumber) existingNumbers.push(p.receiptNumber);
    });
  } else if (docType === 'Quotation') {
    prefix = settings.quotationPrefix || 'AS-Q-';
    minCounter = settings.nextQuotationNumber || 1;
    (state.quotations || []).forEach((q) => existingNumbers.push(q.quoteNumber));
  } else if (docType === 'Statement') {
    prefix = settings.statementPrefix || 'AS-S-';
    minCounter = settings.nextStatementNumber || 1;
  } else if (docType === 'Expense') {
    prefix = settings.expensePrefix || 'AS-E-';
    minCounter = settings.nextExpenseNumber || 1;
    (state.expenses || []).forEach((e) => {
      if (e.expenseNumber) existingNumbers.push(e.expenseNumber);
    });
  }

  (state.generatedDocuments || []).forEach((d) => {
    existingNumbers.push(d.documentNumber);
  });

  let maxFound = minCounter - 1;
  for (const numStr of existingNumbers) {
    if (!numStr) continue;
    const match = numStr.match(/(\d+)$/);
    if (match) {
      const parsed = parseInt(match[1], 10);
      if (!isNaN(parsed) && parsed > maxFound && parsed < 100000) {
        maxFound = parsed;
      }
    }
  }

  const chosen = Math.max(minCounter, maxFound + 1);
  const formatted = `${prefix}${String(chosen).padStart(3, '0')}`;
  return {
    formatted,
    nextCounter: chosen + 1,
  };
}

/**
 * Converts a positive integer amount into Indian Rupee words (e.g. 12000 -> "Rupees Twelve Thousand Only").
 */
export function numberToIndianRupeesWords(amount: number): string {
  const num = Math.round(Math.max(0, Number(amount) || 0));
  if (num === 0) return 'Rupees Zero Only';

  const ones = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const tens = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ];

  const twoDigits = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    const t = Math.floor(n / 10);
    const o = n % 10;
    return `${tens[t]}${o > 0 ? ' ' + ones[o] : ''}`;
  };

  const threeDigits = (n: number): string => {
    const h = Math.floor(n / 100);
    const rem = n % 100;
    if (h === 0) return twoDigits(rem);
    return `${ones[h]} Hundred${rem > 0 ? ' and ' + twoDigits(rem) : ''}`;
  };

  let remaining = num;
  const parts: string[] = [];

  const crore = Math.floor(remaining / 10000000);
  remaining %= 10000000;
  if (crore > 0) {
    parts.push(`${threeDigits(crore)} Crore`);
  }

  const lakh = Math.floor(remaining / 100000);
  remaining %= 100000;
  if (lakh > 0) {
    parts.push(`${twoDigits(lakh)} Lakh`);
  }

  const thousand = Math.floor(remaining / 1000);
  remaining %= 1000;
  if (thousand > 0) {
    parts.push(`${twoDigits(thousand)} Thousand`);
  }

  if (remaining > 0) {
    parts.push(threeDigits(remaining));
  }

  return `Rupees ${parts.join(' ').trim()} Only`;
}

/**
 * Calculates derived subtotal, discount, grand total, paid amount, balance, and automatic status for an invoice.
 */
export function calculateInvoiceDerivedState(
  invoice: ClientInvoice,
  allPayments: ClientPayment[],
  todayStr: string = new Date().toISOString().slice(0, 10)
): ClientInvoice {
  const lineItems: InvoiceLineItem[] =
    invoice.lineItems && invoice.lineItems.length > 0
      ? invoice.lineItems.map((item) => {
          const qty = Math.max(0, Number(item.quantity) || 0);
          const price = Math.max(0, Number(item.unitPrice) || 0);
          return {
            ...item,
            quantity: qty,
            unitPrice: price,
            total: Math.round(qty * price),
          };
        })
      : [
          {
            id: `item-${invoice.id}-1`,
            serviceName: invoice.projectTitle || 'Website & Digital Growth Package',
            description: invoice.notes || 'Digital agency services',
            quantity: 1,
            unitPrice: Math.max(0, Number(invoice.amount) || 0),
            total: Math.max(0, Number(invoice.amount) || 0),
          },
        ];

  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const discount = Math.max(0, Number(invoice.discount) || 0);
  const totalAmount = Math.max(0, subtotal - discount);

  // Sum all payments linked to this invoice
  const directPayments = allPayments.filter(
    (p) =>
      (p.invoiceId && p.invoiceId === invoice.id) ||
      (p.invoiceNumber && p.invoiceNumber === invoice.invoiceNumber)
  );

  // For auto-synced invoices (`inv-auto-${clientId}`), also match payments for that client if no explicit invoiceId was set
  const fallbackClientPayments =
    directPayments.length === 0 && invoice.id.startsWith('inv-auto-') && invoice.clientId
      ? allPayments.filter((p) => !p.invoiceId && p.clientId === invoice.clientId)
      : [];

  const matchedPayments =
    directPayments.length > 0 ? directPayments : fallbackClientPayments;

  const amountPaid = matchedPayments.reduce(
    (sum, p) => sum + (Math.max(0, Number(p.amountReceived)) || 0),
    0
  );

  const balanceDue = Math.max(0, totalAmount - amountPaid);

  let derivedStatus: InvoiceStatus = invoice.status;

  if (invoice.status === 'Cancelled') {
    derivedStatus = 'Cancelled';
  } else if (invoice.status === 'Draft' && amountPaid === 0) {
    derivedStatus = 'Draft';
  } else if (totalAmount > 0 && amountPaid >= totalAmount) {
    derivedStatus = 'Paid';
  } else if (amountPaid > 0 && amountPaid < totalAmount) {
    derivedStatus = 'Partially Paid';
  } else {
    // Unpaid issued invoice: check dueDate for Overdue
    if (invoice.dueDate && invoice.dueDate < todayStr) {
      derivedStatus = 'Overdue';
    } else {
      derivedStatus = 'Issued';
    }
  }

  return {
    ...invoice,
    lineItems,
    subtotal,
    discount,
    amount: totalAmount,
    amountPaid,
    balanceDue,
    status: derivedStatus,
    gstEnabled: Boolean(invoice.gstEnabled),
    gstRatePercent: Number(invoice.gstRatePercent) || 0,
    gstDisclaimer:
      invoice.gstDisclaimer || 'GST not charged. Supplier is not registered under GST.',
    version: invoice.version || 1,
  };
}

/**
 * Derives a unified, deduplicated list of all financial transactions (Income, Expense, Refund)
 * from ClientPayments, StudioExpenses, and manual FinanceTransactions.
 */
export function deriveUnifiedTransactions(
  payments: ClientPayment[],
  expenses: StudioExpense[],
  existingTransactions: FinanceTransaction[] = [],
  invoices: ClientInvoice[] = []
): FinanceTransaction[] {
  const byId = new Map<string, FinanceTransaction>();

  // 1. Preserve manual transactions (e.g. Refunds or standalone transactions) that aren't tied to deleted payments/expenses
  const activePayIds = new Set(payments.map((p) => p.id));
  const activeExpIds = new Set(expenses.map((e) => e.id));

  for (const txn of existingTransactions) {
    if (txn.paymentId && !activePayIds.has(txn.paymentId)) continue;
    if (txn.expenseId && !activeExpIds.has(txn.expenseId)) continue;
    byId.set(txn.id, txn);
  }

  // 2. Ensure every ClientPayment has a 1-to-1 Income transaction
  for (const pay of payments) {
    const txnId = `txn-pay-${pay.id}`;
    const existing =
      byId.get(txnId) ||
      Array.from(byId.values()).find((t) => t.paymentId === pay.id);

    const linkedInvoice = invoices.find(
      (i) => i.id === pay.invoiceId || i.invoiceNumber === pay.invoiceNumber
    );

    const syncedTxn: FinanceTransaction = {
      id: existing ? existing.id : txnId,
      transactionDate: pay.paymentDate || new Date().toISOString().slice(0, 10),
      type: 'Income',
      amount: Math.max(0, Number(pay.amountReceived) || 0),
      paymentMethod: normalizePaymentMethod(pay.paymentMode),
      clientId: pay.clientId,
      clientName: pay.clientName,
      projectTitle: pay.projectTitle,
      invoiceId: pay.invoiceId || linkedInvoice?.id,
      invoiceNumber: pay.invoiceNumber || linkedInvoice?.invoiceNumber,
      paymentId: pay.id,
      referenceNumber: pay.upiReference || existing?.referenceNumber || pay.receiptNumber,
      description: `${pay.projectTitle} — ${pay.milestone} (${pay.clientName})`,
      notes: pay.notes || existing?.notes || `Received in ${pay.receivedInAccount}`,
      account: pay.receivedInAccount,
      createdAt: pay.createdAt || existing?.createdAt || new Date().toISOString(),
    };
    byId.set(syncedTxn.id, syncedTxn);
  }

  // 3. Ensure every StudioExpense has a 1-to-1 Expense transaction
  for (const exp of expenses) {
    const txnId = `txn-exp-${exp.id}`;
    const existing =
      byId.get(txnId) ||
      Array.from(byId.values()).find((t) => t.expenseId === exp.id);

    const syncedTxn: FinanceTransaction = {
      id: existing ? existing.id : txnId,
      transactionDate: exp.date || new Date().toISOString().slice(0, 10),
      type: 'Expense',
      amount: Math.max(0, Number(exp.amount) || 0),
      paymentMethod: exp.paymentMethod || existing?.paymentMethod || 'UPI',
      clientId: exp.clientId,
      clientName:
        exp.clientRelated && exp.clientRelated !== 'Studio Operations'
          ? exp.clientRelated
          : undefined,
      projectTitle: exp.category,
      expenseId: exp.id,
      referenceNumber: exp.referenceNumber || existing?.referenceNumber || exp.expenseNumber,
      description: exp.title,
      notes: exp.notes || existing?.notes || `Paid by ${exp.paidBy}`,
      account: exp.paidBy,
      createdAt: exp.createdAt || existing?.createdAt || new Date().toISOString(),
    };
    byId.set(syncedTxn.id, syncedTxn);
  }

  return Array.from(byId.values()).sort((a, b) =>
    b.transactionDate.localeCompare(a.transactionDate)
  );
}

/**
 * Checks if an ISO date string (YYYY-MM-DD) falls within the selected Finance date filter.
 */
export function isDateInFinancePeriod(
  dateStr: string | undefined,
  preset: FinanceDateFilterPreset,
  customStart?: string,
  customEnd?: string,
  referenceNow: Date = new Date()
): boolean {
  if (preset === 'All Time') return true;
  if (!dateStr) return false;
  const clean = dateStr.slice(0, 10);
  const d = new Date(`${clean}T00:00:00`);
  if (isNaN(d.getTime())) return false;

  const year = referenceNow.getFullYear();
  const month = referenceNow.getMonth(); // 0-indexed

  if (preset === 'This Month') {
    return d.getFullYear() === year && d.getMonth() === month;
  }

  if (preset === 'Last Month') {
    const lastMonthDate = new Date(year, month - 1, 1);
    return (
      d.getFullYear() === lastMonthDate.getFullYear() &&
      d.getMonth() === lastMonthDate.getMonth()
    );
  }

  if (preset === 'This Quarter') {
    const currentQuarter = Math.floor(month / 3);
    const dQuarter = Math.floor(d.getMonth() / 3);
    return d.getFullYear() === year && dQuarter === currentQuarter;
  }

  if (preset === 'This Year') {
    return d.getFullYear() === year;
  }

  if (preset === 'Custom Range') {
    if (customStart && clean < customStart) return false;
    if (customEnd && clean > customEnd) return false;
    return true;
  }

  return true;
}

export interface FinanceOverviewSummary {
  totalInvoicedRevenue: number;
  totalProjectContractValue: number;
  totalReceived: number;
  outstandingPayments: number;
  totalExpenses: number;
  totalRefunds: number;
  netCashFlow: number;
  activeInvoicesCount: number;
  overdueInvoicesCount: number;
  monthlySeries: {
    monthKey: string;
    monthLabel: string;
    income: number;
    expenses: number;
    invoicedRevenue: number;
  }[];
  paymentMethodBreakdown: {
    method: FinancePaymentMethod;
    incomeAmount: number;
    expenseAmount: number;
    totalCount: number;
    percentageOfIncome: number;
  }[];
}

export function calculateFinanceOverviewMetrics(
  state: AethelDatabaseState,
  datePreset: FinanceDateFilterPreset = 'All Time',
  customStart?: string,
  customEnd?: string,
  referenceNow: Date = new Date()
): FinanceOverviewSummary {
  const todayStr = referenceNow.toISOString().slice(0, 10);
  const payments = state.payments || [];
  const expenses = state.expenses || [];
  const rawInvoices = state.invoices || [];

  const derivedInvoices = rawInvoices.map((inv) =>
    calculateInvoiceDerivedState(inv, payments, todayStr)
  );

  // Filter invoices in period (exclude Cancelled and Draft from revenue and outstanding)
  const activeIssuedInvoices = derivedInvoices.filter(
    (inv) => inv.status !== 'Cancelled' && inv.status !== 'Draft'
  );

  const periodInvoices = activeIssuedInvoices.filter((inv) =>
    isDateInFinancePeriod(inv.issueDate, datePreset, customStart, customEnd, referenceNow)
  );

  const totalInvoicedRevenue = periodInvoices.reduce((s, inv) => s + inv.amount, 0);

  // Outstanding is the unpaid balance of issued invoices (within period if filtered, or all active issued)
  const outstandingPayments = periodInvoices.reduce(
    (s, inv) => s + (inv.balanceDue || 0),
    0
  );

  // Confirmed Project Contract Value (distinct from invoiced revenue)
  const confirmedClients = (state.clients || []).filter(
    (c) =>
      (c.stage === 'In Building' ||
        c.stage === 'Live / Payment Pending' ||
        c.stage === 'Delivered / Live' ||
        c.advancePaid > 0) &&
      isDateInFinancePeriod(c.createdAt, datePreset, customStart, customEnd, referenceNow)
  );
  const totalProjectContractValue = confirmedClients.reduce(
    (s, c) => s + (Number(c.finalAgreedPrice) || 0),
    0
  );

  const allTransactions = deriveUnifiedTransactions(
    payments,
    expenses,
    state.transactions || [],
    derivedInvoices
  );

  const periodTransactions = allTransactions.filter((t) =>
    isDateInFinancePeriod(
      t.transactionDate,
      datePreset,
      customStart,
      customEnd,
      referenceNow
    )
  );

  const totalReceived = periodTransactions
    .filter((t) => t.type === 'Income')
    .reduce((s, t) => s + t.amount, 0);

  const totalExpenses = periodTransactions
    .filter((t) => t.type === 'Expense')
    .reduce((s, t) => s + t.amount, 0);

  const totalRefunds = periodTransactions
    .filter((t) => t.type === 'Refund')
    .reduce((s, t) => s + t.amount, 0);

  const netCashFlow = totalReceived - totalExpenses - totalRefunds;

  // Monthly series for Income vs Expenses & Revenue Trend
  const monthMap = new Map<
    string,
    { monthKey: string; monthLabel: string; income: number; expenses: number; invoicedRevenue: number }
  >();

  const formatMonthLabel = (yyyyMm: string) => {
    const [y, m] = yyyyMm.split('-').map(Number);
    if (!y || !m) return yyyyMm;
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
  };

  for (const t of periodTransactions) {
    const mKey = (t.transactionDate || todayStr).slice(0, 7);
    const cur = monthMap.get(mKey) || {
      monthKey: mKey,
      monthLabel: formatMonthLabel(mKey),
      income: 0,
      expenses: 0,
      invoicedRevenue: 0,
    };
    if (t.type === 'Income') cur.income += t.amount;
    if (t.type === 'Expense') cur.expenses += t.amount;
    monthMap.set(mKey, cur);
  }

  for (const inv of periodInvoices) {
    const mKey = (inv.issueDate || todayStr).slice(0, 7);
    const cur = monthMap.get(mKey) || {
      monthKey: mKey,
      monthLabel: formatMonthLabel(mKey),
      income: 0,
      expenses: 0,
      invoicedRevenue: 0,
    };
    cur.invoicedRevenue += inv.amount;
    monthMap.set(mKey, cur);
  }

  const monthlySeries = Array.from(monthMap.values()).sort((a, b) =>
    a.monthKey.localeCompare(b.monthKey)
  );

  // Payment method breakdown (UPI, Cash, Bank Transfer, Other)
  const methods: FinancePaymentMethod[] = ['UPI', 'Cash', 'Bank Transfer', 'Other'];
  const paymentMethodBreakdown = methods.map((m) => {
    const matching = periodTransactions.filter(
      (t) => normalizePaymentMethod(t.paymentMethod) === m
    );
    const incomeAmount = matching
      .filter((t) => t.type === 'Income')
      .reduce((s, t) => s + t.amount, 0);
    const expenseAmount = matching
      .filter((t) => t.type === 'Expense')
      .reduce((s, t) => s + t.amount, 0);
    return {
      method: m,
      incomeAmount,
      expenseAmount,
      totalCount: matching.length,
      percentageOfIncome:
        totalReceived > 0 ? Math.round((incomeAmount / totalReceived) * 100) : 0,
    };
  });

  return {
    totalInvoicedRevenue,
    totalProjectContractValue,
    totalReceived,
    outstandingPayments,
    totalExpenses,
    totalRefunds,
    netCashFlow,
    activeInvoicesCount: periodInvoices.length,
    overdueInvoicesCount: periodInvoices.filter((i) => i.status === 'Overdue').length,
    monthlySeries,
    paymentMethodBreakdown,
  };
}

export interface ClientLedgerRow {
  id: string;
  date: string;
  description: string;
  referenceNumber: string;
  entryType: 'Invoice' | 'Payment' | 'Refund';
  debit: number; // Invoiced amount added to client balance
  credit: number; // Payment received reducing client balance
  balance: number; // Running outstanding balance
}

export interface ClientFinancialProfileSummary {
  clientId: string;
  clientName: string;
  totalProjectValue: number;
  totalInvoiced: number;
  totalReceived: number;
  outstandingBalance: number;
  directExpensesTotal: number;
  invoices: ClientInvoice[];
  payments: ClientPayment[];
  transactions: FinanceTransaction[];
  expenses: StudioExpense[];
  documents: GeneratedDocument[];
  ledger: ClientLedgerRow[];
}

/**
 * Calculates a client's complete financial summary and running debit/credit Statement of Account ledger
 * directly from stored Invoice and Payment records.
 */
export function calculateClientFinancialProfile(
  client: ClientLead,
  state: AethelDatabaseState
): ClientFinancialProfileSummary {
  const normName = client.businessName.toLowerCase().trim();
  const allPayments = state.payments || [];
  const todayStr = new Date().toISOString().slice(0, 10);

  const clientInvoices = (state.invoices || [])
    .filter(
      (inv) =>
        inv.clientId === client.id ||
        inv.clientName.toLowerCase().trim() === normName
    )
    .map((inv) => calculateInvoiceDerivedState(inv, allPayments, todayStr));

  const activeInvoices = clientInvoices.filter(
    (inv) => inv.status !== 'Cancelled' && inv.status !== 'Draft'
  );

  const clientPayments = allPayments.filter(
    (p) =>
      p.clientId === client.id ||
      p.clientName.toLowerCase().trim() === normName
  );

  const clientExpenses = (state.expenses || []).filter(
    (e) =>
      e.clientId === client.id ||
      (e.clientRelated && e.clientRelated.toLowerCase().trim() === normName)
  );

  const allTransactions = deriveUnifiedTransactions(
    allPayments,
    state.expenses || [],
    state.transactions || [],
    clientInvoices
  );

  const clientTransactions = allTransactions.filter(
    (t) =>
      t.clientId === client.id ||
      (t.clientName && t.clientName.toLowerCase().trim() === normName)
  );

  const clientDocuments = (state.generatedDocuments || []).filter(
    (d) =>
      d.clientId === client.id ||
      d.clientName.toLowerCase().trim() === normName
  );

  const totalProjectValue = Math.max(0, Number(client.finalAgreedPrice) || 0);
  const totalInvoiced = activeInvoices.reduce((s, inv) => s + inv.amount, 0);
  const totalReceived = clientPayments.reduce(
    (s, p) => s + (Math.max(0, Number(p.amountReceived)) || 0),
    0
  );

  // Outstanding balance from issued invoices (or project balance if no invoices issued yet)
  const outstandingBalance =
    activeInvoices.length > 0
      ? activeInvoices.reduce((s, inv) => s + (inv.balanceDue || 0), 0)
      : Math.max(0, totalProjectValue - totalReceived);

  const directExpensesTotal = clientExpenses.reduce((s, e) => s + e.amount, 0);

  // Build chronological Debit / Credit Ledger
  const rawEvents: {
    id: string;
    date: string;
    sortOrder: number;
    description: string;
    referenceNumber: string;
    entryType: 'Invoice' | 'Payment' | 'Refund';
    debit: number;
    credit: number;
  }[] = [];

  for (const inv of activeInvoices) {
    rawEvents.push({
      id: `led-inv-${inv.id}`,
      date: inv.issueDate || todayStr,
      sortOrder: 1, // Invoices before same-day payments
      description: `${inv.invoiceTitle || inv.projectTitle} (${inv.invoiceNumber})`,
      referenceNumber: inv.invoiceNumber,
      entryType: 'Invoice',
      debit: inv.amount,
      credit: 0,
    });
  }

  for (const pay of clientPayments) {
    rawEvents.push({
      id: `led-pay-${pay.id}`,
      date: pay.paymentDate || todayStr,
      sortOrder: 2,
      description: `${pay.milestone} received via ${pay.paymentMode}${
        pay.upiReference ? ` (Ref: ${pay.upiReference})` : ''
      }`,
      referenceNumber: pay.receiptNumber || pay.invoiceNumber || pay.id,
      entryType: 'Payment',
      debit: 0,
      credit: pay.amountReceived,
    });
  }

  rawEvents.sort((a, b) => {
    const cmp = a.date.localeCompare(b.date);
    if (cmp !== 0) return cmp;
    return a.sortOrder - b.sortOrder;
  });

  let runningBalance = 0;
  const ledger: ClientLedgerRow[] = rawEvents.map((ev) => {
    runningBalance = runningBalance + ev.debit - ev.credit;
    return {
      id: ev.id,
      date: ev.date,
      description: ev.description,
      referenceNumber: ev.referenceNumber,
      entryType: ev.entryType,
      debit: ev.debit,
      credit: ev.credit,
      balance: runningBalance,
    };
  });

  return {
    clientId: client.id,
    clientName: client.businessName,
    totalProjectValue,
    totalInvoiced,
    totalReceived,
    outstandingBalance,
    directExpensesTotal,
    invoices: clientInvoices,
    payments: clientPayments,
    transactions: clientTransactions,
    expenses: clientExpenses,
    documents: clientDocuments,
    ledger,
  };
}

/**
 * Converts an accepted Quotation into a newly numbered Invoice while preserving all line items, prices, client, and project.
 */
export function convertQuotationToInvoice(
  quotation: ClientQuotation,
  state: AethelDatabaseState
): {
  invoice: ClientInvoice;
  updatedQuotation: ClientQuotation;
  updatedSettings: FinanceSettings;
} {
  const settings = state.financeSettings || DEFAULT_FINANCE_SETTINGS;
  const { formatted: invoiceNumber, nextCounter } = generateNextDocumentNumber(
    'Invoice',
    state
  );
  const today = new Date().toISOString().slice(0, 10);
  const dueDate = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const clonedItems: InvoiceLineItem[] = quotation.lineItems.map((item, idx) => ({
    ...item,
    id: `inv-item-${Date.now()}-${idx + 1}`,
  }));

  const newInvoice: ClientInvoice = {
    id: `inv-${Date.now()}`,
    invoiceNumber,
    clientId: quotation.clientId,
    clientName: quotation.clientName,
    clientContactPerson: quotation.clientContactPerson,
    clientEmail: quotation.clientEmail,
    clientPhone: quotation.clientPhone,
    clientAddress: quotation.clientAddress,
    projectTitle: quotation.projectTitle,
    invoiceTitle: `${quotation.projectTitle} — Invoice`,
    paymentTerms: 'Due within 7 days of issue',
    type: 'Standard Invoice',
    lineItems: clonedItems,
    subtotal: quotation.subtotal,
    discount: quotation.discount,
    amount: quotation.total,
    amountPaid: 0,
    balanceDue: quotation.total,
    issueDate: today,
    dueDate,
    status: 'Issued',
    notes: quotation.notes || `Converted from Quotation ${quotation.quoteNumber}`,
    gstEnabled: false,
    gstRatePercent: 0,
    gstDisclaimer: settings.gstDisclaimer,
    templateId: quotation.templateId || settings.defaultTemplateId,
    sourceQuotationId: quotation.id,
    version: 1,
    createdAt: new Date().toISOString(),
  };

  const updatedQuotation: ClientQuotation = {
    ...quotation,
    status: 'Accepted',
    convertedInvoiceId: newInvoice.id,
    convertedInvoiceNumber: newInvoice.invoiceNumber,
  };

  const updatedSettings: FinanceSettings = {
    ...settings,
    nextInvoiceNumber: nextCounter,
  };

  return {
    invoice: newInvoice,
    updatedQuotation,
    updatedSettings,
  };
}

/**
 * Creates or versions an immutable GeneratedDocument snapshot in the Document Library.
 */
export function createDocumentSnapshot(
  docType: FinanceDocumentType,
  documentNumber: string,
  clientName: string,
  amount: number,
  status: string,
  snapshotPayload: Record<string, unknown>,
  options: {
    clientId?: string;
    projectTitle?: string;
    invoiceId?: string;
    quotationId?: string;
    paymentId?: string;
    templateId?: string;
    existingDocuments?: GeneratedDocument[];
  } = {}
): GeneratedDocument {
  const existingDocs = options.existingDocuments || [];
  const previousVersions = existingDocs.filter(
    (d) =>
      d.documentType === docType &&
      ((options.invoiceId && d.invoiceId === options.invoiceId) ||
        (options.quotationId && d.quotationId === options.quotationId) ||
        (options.paymentId && d.paymentId === options.paymentId) ||
        d.documentNumber === documentNumber)
  );

  const nextVersion =
    previousVersions.length > 0
      ? Math.max(...previousVersions.map((d) => d.version || 1)) + 1
      : 1;

  return {
    id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    documentNumber,
    documentType: docType,
    version: nextVersion,
    clientId: options.clientId,
    clientName,
    projectTitle: options.projectTitle,
    invoiceId: options.invoiceId,
    quotationId: options.quotationId,
    paymentId: options.paymentId,
    createdDate: new Date().toISOString().slice(0, 10),
    amount,
    status,
    templateId: options.templateId || 'tpl-aethel-editorial',
    snapshotPayload: JSON.parse(JSON.stringify(snapshotPayload)),
  };
}
