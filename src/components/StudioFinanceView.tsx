import React, { useState, useMemo } from 'react';
import {
  AethelDatabaseState,
  ClientLead,
  StudioExpense,
  ClientPayment,
  ClientInvoice,
  ClientQuotation,
  FinanceTransaction,
  GeneratedDocument,
  DocumentTemplate,
  FinanceSettings,
  HostedWebsite,
  MetaAdCampaign
} from '../types';
import { calculateStudioFinances, formatINR } from '../utils/calculations';
import {
  FinanceDateFilterPreset,
  DEFAULT_FINANCE_SETTINGS,
  DEFAULT_DOCUMENT_TEMPLATES,
  calculateFinanceOverviewMetrics,
  calculateClientFinancialProfile,
  createDocumentSnapshot,
  generateNextDocumentNumber,
  deriveUnifiedTransactions
} from '../utils/financeEngine';
import { TransactionsAndExpenses } from './finance/TransactionsAndExpenses';
import { InvoicesAndQuotations } from './finance/InvoicesAndQuotations';
import { DocumentsAndSettings } from './finance/DocumentsAndSettings';
import { DocumentPreviewModal } from './finance/DocumentPreviewModal';
import {
  Wallet,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Calendar,
  Plus,
  Users
} from 'lucide-react';

interface StudioFinanceViewProps {
  dbState: AethelDatabaseState;
  clients: ClientLead[];
  expenses: StudioExpense[];
  payments: ClientPayment[];
  invoices: ClientInvoice[];
  quotations?: ClientQuotation[];
  transactions?: FinanceTransaction[];
  generatedDocuments?: GeneratedDocument[];
  documentTemplates?: DocumentTemplate[];
  financeSettings?: FinanceSettings;
  websites?: HostedWebsite[];
  metaCampaigns?: MetaAdCampaign[];
  initialSubView?: 'ledger' | 'analytics';
  onAddExpense: (expense: StudioExpense) => void;
  onUpdateExpense?: (expense: StudioExpense) => void;
  onDeleteExpense: (id: string) => void;
  onAddPayment: (payment: ClientPayment) => void;
  onUpdatePayment?: (payment: ClientPayment) => void;
  onDeletePayment: (id: string) => void;
  onUpdateInvoices?: (invoices: ClientInvoice[]) => void;
  onUpdateQuotations?: (quotations: ClientQuotation[]) => void;
  onUpdateTransactions?: (transactions: FinanceTransaction[]) => void;
  onUpdateGeneratedDocuments?: (docs: GeneratedDocument[]) => void;
  onUpdateFinanceSettings?: (settings: FinanceSettings) => void;
  onOpenClient360?: (clientId: string) => void;
}

type FinanceSubTab =
  | 'overview'
  | 'transactions'
  | 'invoices'
  | 'quotations'
  | 'expenses'
  | 'documents'
  | 'settings'
  | 'settlement';

const DATE_PRESETS: FinanceDateFilterPreset[] = [
  'This Month',
  'Last Month',
  'This Quarter',
  'This Year',
  'All Time',
  'Custom Range'
];

export const StudioFinanceView: React.FC<StudioFinanceViewProps> = ({
  dbState,
  clients,
  expenses,
  payments,
  invoices,
  quotations = [],
  transactions = [],
  generatedDocuments = [],
  documentTemplates = DEFAULT_DOCUMENT_TEMPLATES,
  financeSettings = DEFAULT_FINANCE_SETTINGS,
  initialSubView = 'ledger',
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  onAddPayment,
  onUpdatePayment,
  onDeletePayment,
  onUpdateInvoices,
  onUpdateQuotations,
  onUpdateTransactions,
  onUpdateGeneratedDocuments,
  onUpdateFinanceSettings,
  onOpenClient360
}) => {
  const [activeSubTab, setActiveSubTab] = useState<FinanceSubTab>(
    initialSubView === 'analytics' ? 'settlement' : 'overview'
  );
  const [datePreset, setDatePreset] = useState<FinanceDateFilterPreset>('All Time');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [revenueAccountingView, setRevenueAccountingView] = useState<'invoiced' | 'contract'>('invoiced');
  const [previewDoc, setPreviewDoc] = useState<GeneratedDocument | null>(null);

  // Unified transaction stream derived from payments + expenses + custom entries
  const unifiedTransactions = useMemo(() => {
    return deriveUnifiedTransactions(payments, expenses, transactions, invoices);
  }, [payments, expenses, transactions, invoices]);

  // Overview metrics calculated from actual records & date filter
  const overviewMetrics = useMemo(() => {
    return calculateFinanceOverviewMetrics(
      dbState,
      datePreset,
      customStartDate,
      customEndDate
    );
  }, [dbState, datePreset, customStartDate, customEndDate]);

  // Co-founder 50/50 split metrics
  const studioSplit = useMemo(() => {
    return calculateStudioFinances(
      expenses,
      payments,
      clients,
      dbState.metaCampaigns,
      dbState.tickets,
      dbState.tasks || []
    );
  }, [expenses, payments, clients, dbState]);

  // Document Snapshot Creation & Preview Helpers
  const archiveAndPreviewDocument = (doc: GeneratedDocument) => {
    if (onUpdateGeneratedDocuments) {
      onUpdateGeneratedDocuments([doc, ...generatedDocuments]);
    }
    setPreviewDoc(doc);
  };

  const handleGenerateInvoicePdf = (invoice: ClientInvoice) => {
    const snap = createDocumentSnapshot(
      'Invoice',
      invoice.invoiceNumber,
      invoice.clientName,
      invoice.amount,
      invoice.status,
      invoice as unknown as Record<string, unknown>,
      {
        clientId: invoice.clientId,
        projectTitle: invoice.projectTitle,
        invoiceId: invoice.id,
        templateId: invoice.templateId || financeSettings.defaultTemplateId,
        existingDocuments: generatedDocuments
      }
    );
    archiveAndPreviewDocument(snap);
  };

  const handleGenerateQuotationPdf = (quotation: ClientQuotation) => {
    const snap = createDocumentSnapshot(
      'Quotation',
      quotation.quoteNumber,
      quotation.clientName,
      quotation.total,
      quotation.status,
      quotation as unknown as Record<string, unknown>,
      {
        clientId: quotation.clientId,
        projectTitle: quotation.projectTitle,
        quotationId: quotation.id,
        templateId: quotation.templateId || financeSettings.defaultTemplateId,
        existingDocuments: generatedDocuments
      }
    );
    archiveAndPreviewDocument(snap);
  };

  const handleGenerateReceiptPdf = (payment: ClientPayment, invoice?: ClientInvoice) => {
    const receiptNo =
      payment.receiptNumber ||
      generateNextDocumentNumber('Receipt', dbState).formatted;
    const linkedInv = invoice || invoices.find((i) => i.id === payment.invoiceId);
    const totalVal = linkedInv ? linkedInv.amount : payment.totalProjectValue || payment.amountReceived;
    const totalReceivedToDate = linkedInv
      ? linkedInv.amountPaid || payment.amountReceived
      : payments
          .filter((p) => p.clientId === payment.clientId)
          .reduce((s, p) => s + p.amountReceived, 0);
    const outstandingRemaining = Math.max(0, totalVal - totalReceivedToDate);

    const snap = createDocumentSnapshot(
      'Payment Receipt',
      receiptNo,
      payment.clientName,
      payment.amountReceived,
      'Issued',
      {
        payment: { ...payment, receiptNumber: receiptNo },
        invoiceNumber: linkedInv?.invoiceNumber || payment.invoiceNumber,
        totalProjectOrInvoiceValue: totalVal,
        totalReceivedToDate,
        outstandingRemaining
      },
      {
        clientId: payment.clientId,
        projectTitle: payment.projectTitle,
        invoiceId: linkedInv?.id,
        paymentId: payment.id,
        templateId: financeSettings.defaultTemplateId,
        existingDocuments: generatedDocuments
      }
    );
    archiveAndPreviewDocument(snap);
  };

  const handleGenerateStatementPdf = (client: ClientLead) => {
    const { formatted: statementNo } = generateNextDocumentNumber('Statement', dbState);
    const profile = calculateClientFinancialProfile(client, dbState);
    const snap = createDocumentSnapshot(
      'Statement of Account',
      statementNo,
      client.businessName,
      profile.outstandingBalance,
      'Finalized',
      profile as unknown as Record<string, unknown>,
      {
        clientId: client.id,
        projectTitle: client.packageTier,
        templateId: financeSettings.defaultTemplateId,
        existingDocuments: generatedDocuments
      }
    );
    archiveAndPreviewDocument(snap);
  };

  const navItems: { id: FinanceSubTab; label: string; badge?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'transactions', label: 'Transactions', badge: unifiedTransactions.length },
    { id: 'invoices', label: 'Invoices', badge: invoices.length },
    { id: 'quotations', label: 'Quotations', badge: quotations.length },
    { id: 'expenses', label: 'Expenses', badge: expenses.length },
    { id: 'documents', label: 'Documents', badge: generatedDocuments.length },
    { id: 'settings', label: 'Finance Settings' },
    { id: 'settlement', label: 'Co-Founder Split' }
  ];

  const maxMonthlyVal = useMemo(() => {
    let max = 1000;
    overviewMetrics.monthlySeries.forEach((m) => {
      if (m.income > max) max = m.income;
      if (m.expenses > max) max = m.expenses;
      if (m.invoicedRevenue > max) max = m.invoicedRevenue;
    });
    return max;
  }, [overviewMetrics.monthlySeries]);

  const displayedTotalRevenue =
    revenueAccountingView === 'invoiced'
      ? overviewMetrics.totalInvoicedRevenue
      : overviewMetrics.totalProjectContractValue;

  return (
    <div className="space-y-6">
      {/* Secondary Navigation Header */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#2563EB] font-bold">
                AETHEL OS • FINANCIAL OPERATING ENGINE
              </span>
              <span className="px-2 py-0.5 rounded bg-[#F1F5F9] text-[#475569] font-mono text-[9px] font-bold">
                {financeSettings.gstEnabled ? 'GST REGISTERED' : 'NON-GST DEFAULT'}
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-[#0B0F19] mt-0.5">
              Finance, Billing & Document Treasury
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveSubTab('invoices')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0B0F19] hover:bg-[#1E293B] text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              New Invoice
            </button>
            <button
              onClick={() => setActiveSubTab('expenses')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8F9FA] text-[#0B0F19] text-xs font-bold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#2563EB]" />
              Add Expense
            </button>
          </div>
        </div>

        {/* Secondary Navigation Bar */}
        <div
          role="tablist"
          aria-label="Finance Sections"
          className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-[#F1F5F9] no-scrollbar"
        >
          {navItems.map((item) => {
            const isActive = activeSubTab === item.id;
            return (
              <button
                key={item.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveSubTab(item.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-mono text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#0B0F19] text-white shadow-xs'
                    : 'text-[#64748B] hover:text-[#0B0F19] hover:bg-[#F8F9FA]'
                }`}
              >
                <span>{item.label}</span>
                {typeof item.badge === 'number' && (
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                      isActive ? 'bg-white/20 text-white' : 'bg-[#F1F5F9] text-[#475569]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 04: FINANCE OVERVIEW */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Date Filter Bar & Accounting View Toggle */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#64748B] mr-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#2563EB]" />
                Period:
              </span>
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setDatePreset(preset)}
                  className={`px-3 py-1.5 rounded-xl font-mono text-[11px] font-bold transition-all cursor-pointer ${
                    datePreset === preset
                      ? 'bg-[#2563EB] text-white shadow-xs'
                      : 'bg-[#F8F9FA] text-[#475569] hover:text-[#0B0F19]'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            {datePreset === 'Custom Range' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-[#F8F9FA] border border-[#E2E8F0] rounded-lg text-xs"
                />
                <span className="text-xs text-[#64748B]">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-[#F8F9FA] border border-[#E2E8F0] rounded-lg text-xs"
                />
              </div>
            )}

            {/* Explicit Distinction: Invoiced Revenue vs Project Contract Value */}
            <div className="flex items-center gap-1.5 bg-[#F8F9FA] p-1 rounded-xl border border-[#E2E8F0]">
              <button
                onClick={() => setRevenueAccountingView('invoiced')}
                className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold transition-all cursor-pointer ${
                  revenueAccountingView === 'invoiced'
                    ? 'bg-white text-[#0B0F19] shadow-2xs'
                    : 'text-[#64748B]'
                }`}
              >
                Invoiced Revenue
              </button>
              <button
                onClick={() => setRevenueAccountingView('contract')}
                className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold transition-all cursor-pointer ${
                  revenueAccountingView === 'contract'
                    ? 'bg-white text-[#0B0F19] shadow-2xs'
                    : 'text-[#64748B]'
                }`}
              >
                Project Contract Value
              </button>
            </div>
          </div>

          {/* 5 Core Summary Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* 1. Total Revenue */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#64748B] font-bold">
                  Total Revenue
                </span>
                <TrendingUp className="w-4 h-4 text-[#2563EB]" />
              </div>
              <div className="font-mono text-2xl font-bold text-[#0B0F19] mt-2">
                {formatINR(displayedTotalRevenue)}
              </div>
              <div className="text-[11px] text-[#64748B] mt-1">
                {revenueAccountingView === 'invoiced'
                  ? `Finalized Invoices (Contracts: ${formatINR(overviewMetrics.totalProjectContractValue)})`
                  : `Contract Value (Invoiced: ${formatINR(overviewMetrics.totalInvoicedRevenue)})`}
              </div>
            </div>

            {/* 2. Total Received */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#64748B] font-bold">
                  Total Received
                </span>
                <ArrowDownLeft className="w-4 h-4 text-[#16A34A]" />
              </div>
              <div className="font-mono text-2xl font-bold text-[#15803D] mt-2">
                {formatINR(overviewMetrics.totalReceived)}
              </div>
              <div className="text-[11px] text-[#64748B] mt-1">
                Actual client payments collected
              </div>
            </div>

            {/* 3. Outstanding Payments */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#64748B] font-bold">
                  Outstanding Payments
                </span>
                <Clock className="w-4 h-4 text-[#D97706]" />
              </div>
              <div className="font-mono text-2xl font-bold text-[#B45309] mt-2">
                {formatINR(overviewMetrics.outstandingPayments)}
              </div>
              <div className="text-[11px] text-[#64748B] mt-1">
                Unpaid balance of active invoices
              </div>
            </div>

            {/* 4. Total Expenses */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#64748B] font-bold">
                  Total Expenses
                </span>
                <ArrowUpRight className="w-4 h-4 text-[#DC2626]" />
              </div>
              <div className="font-mono text-2xl font-bold text-[#B91C1C] mt-2">
                {formatINR(overviewMetrics.totalExpenses)}
              </div>
              <div className="text-[11px] text-[#64748B] mt-1">
                Recorded studio disbursements
              </div>
            </div>

            {/* 5. Net Cash Flow */}
            <div className="bg-[#0B0F19] text-white rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#94A3B8] font-bold">
                  Net Cash Flow
                </span>
                <Wallet className="w-4 h-4 text-[#38BDF8]" />
              </div>
              <div
                className={`font-mono text-2xl font-bold mt-2 ${
                  overviewMetrics.netCashFlow >= 0 ? 'text-[#4ADE80]' : 'text-[#F87171]'
                }`}
              >
                {overviewMetrics.netCashFlow < 0 ? '-' : ''}
                {formatINR(Math.abs(overviewMetrics.netCashFlow))}
              </div>
              <div className="text-[11px] text-[#94A3B8] mt-1">
                Payments received minus expenses
              </div>
            </div>
          </div>

          {/* Visualizations Row: Monthly Income vs Expenses + Payment Method Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 1 & 3: Monthly Income vs Expenses & Invoiced Revenue Trend */}
            <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#2563EB] font-bold">
                    CASH FLOW & REVENUE TREND
                  </span>
                  <h3 className="text-base font-bold text-[#0B0F19]">
                    Monthly Income Received vs Expenses & Invoiced Volume
                  </h3>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-mono">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#16A34A]" /> Received
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#DC2626]" /> Expenses
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#2563EB]" /> Invoiced
                  </span>
                </div>
              </div>

              {overviewMetrics.monthlySeries.length === 0 ? (
                <div className="h-44 flex items-center justify-center text-xs text-[#64748B] bg-[#F8F9FA] rounded-xl border border-[#E2E8F0]">
                  Record an invoice, payment, or expense to populate the monthly trend chart.
                </div>
              ) : (
                <div className="grid grid-cols-6 gap-3 pt-4 items-end h-44 border-b border-[#E2E8F0] pb-3">
                  {overviewMetrics.monthlySeries.slice(-6).map((m) => {
                    const incPct = Math.min(100, Math.round((m.income / maxMonthlyVal) * 100));
                    const expPct = Math.min(100, Math.round((m.expenses / maxMonthlyVal) * 100));
                    const invPct = Math.min(100, Math.round((m.invoicedRevenue / maxMonthlyVal) * 100));
                    return (
                      <div key={m.monthKey} className="flex flex-col items-center h-full justify-end">
                        <div className="w-full flex items-end justify-center gap-1.5 h-32">
                          <div
                            title={`Received: ${formatINR(m.income)}`}
                            style={{ height: `${Math.max(4, incPct)}%` }}
                            className="w-3 bg-[#16A34A] rounded-t-sm transition-all"
                          />
                          <div
                            title={`Expenses: ${formatINR(m.expenses)}`}
                            style={{ height: `${Math.max(4, expPct)}%` }}
                            className="w-3 bg-[#DC2626] rounded-t-sm transition-all"
                          />
                          <div
                            title={`Invoiced: ${formatINR(m.invoicedRevenue)}`}
                            style={{ height: `${Math.max(4, invPct)}%` }}
                            className="w-3 bg-[#2563EB] rounded-t-sm transition-all"
                          />
                        </div>
                        <span className="font-mono text-[10px] text-[#64748B] mt-2">{m.monthLabel}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Chart 2: Payment Method Breakdown */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-4">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#2563EB] font-bold">
                  COLLECTION CHANNELS
                </span>
                <h3 className="text-base font-bold text-[#0B0F19]">Payment Method Breakdown</h3>
              </div>

              <div className="space-y-3 pt-2">
                {overviewMetrics.paymentMethodBreakdown.map((item) => (
                  <div key={item.method} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#0B0F19]">{item.method}</span>
                      <span className="font-mono font-bold text-[#0B0F19]">
                        {formatINR(item.incomeAmount)}{' '}
                        <span className="text-[#64748B] font-normal">
                          ({item.percentageOfIncome}%)
                        </span>
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#F1F5F9] overflow-hidden">
                      <div
                        style={{ width: `${item.percentageOfIncome}%` }}
                        className="h-full bg-[#2563EB] rounded-full transition-all"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 4 Actionable Overview Lists: Recent Transactions, Outstanding Invoices, Upcoming Deadlines, Recent Documents */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Outstanding Invoices & Upcoming Payment Deadlines */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#D97706] font-bold">
                    RECEIVABLES & DEADLINES
                  </span>
                  <h4 className="text-base font-bold text-[#0B0F19]">
                    Outstanding Invoices & Payment Deadlines
                  </h4>
                </div>
                <button
                  onClick={() => setActiveSubTab('invoices')}
                  className="text-xs font-bold text-[#2563EB] hover:underline cursor-pointer"
                >
                  View All Invoices →
                </button>
              </div>

              {invoices.filter((i) => i.status !== 'Cancelled' && (i.balanceDue ?? i.amount) > 0).length === 0 ? (
                <div className="p-6 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-center text-xs text-[#64748B]">
                  All issued invoices are settled. Zero outstanding balance.
                </div>
              ) : (
                <div className="divide-y divide-[#F1F5F9]">
                  {invoices
                    .filter((i) => i.status !== 'Cancelled' && (i.balanceDue ?? i.amount) > 0)
                    .slice(0, 5)
                    .map((inv) => (
                      <div
                        key={inv.id}
                        className="py-3 flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[#2563EB]">
                              {inv.invoiceNumber}
                            </span>
                            <span className="font-bold text-[#0B0F19]">{inv.clientName}</span>
                          </div>
                          <div className="text-[11px] text-[#64748B] font-mono mt-0.5">
                            Due: {inv.dueDate} • Status: {inv.status}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-[#B91C1C]">
                            {formatINR(inv.balanceDue ?? inv.amount)}
                          </div>
                          <button
                            onClick={() => setActiveSubTab('invoices')}
                            className="text-[10px] font-mono font-bold text-[#15803D] hover:underline cursor-pointer"
                          >
                            Record Payment
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* 2. Recent Transactions */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#2563EB] font-bold">
                    LATEST LEDGER ACTIVITY
                  </span>
                  <h4 className="text-base font-bold text-[#0B0F19]">Recent Transactions</h4>
                </div>
                <button
                  onClick={() => setActiveSubTab('transactions')}
                  className="text-xs font-bold text-[#2563EB] hover:underline cursor-pointer"
                >
                  All Transactions →
                </button>
              </div>

              {unifiedTransactions.length === 0 ? (
                <div className="p-6 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] text-center text-xs text-[#64748B]">
                  No financial transactions recorded yet.
                </div>
              ) : (
                <div className="divide-y divide-[#F1F5F9]">
                  {unifiedTransactions.slice(0, 5).map((tx) => (
                    <div
                      key={tx.id}
                      onClick={() => setActiveSubTab('transactions')}
                      className="py-3 flex items-center justify-between gap-3 text-xs hover:bg-[#F8F9FA] px-2 rounded-lg cursor-pointer"
                    >
                      <div>
                        <div className="font-bold text-[#0B0F19]">{tx.description}</div>
                        <div className="text-[11px] text-[#64748B] font-mono">
                          {tx.transactionDate} • {tx.paymentMethod}{' '}
                          {tx.clientName ? `• ${tx.clientName}` : ''}
                        </div>
                      </div>
                      <div
                        className={`font-mono font-bold ${
                          tx.type === 'Income' ? 'text-[#15803D]' : 'text-[#B91C1C]'
                        }`}
                      >
                        {tx.type === 'Income' ? '+' : '-'}{formatINR(tx.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Generated Documents Strip */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#2563EB] font-bold">
                  DOCUMENT ARCHIVE
                </span>
                <h4 className="text-base font-bold text-[#0B0F19]">Recent Generated Documents</h4>
              </div>
              <button
                onClick={() => setActiveSubTab('documents')}
                className="text-xs font-bold text-[#2563EB] hover:underline cursor-pointer"
              >
                Open Documents Library →
              </button>
            </div>

            {generatedDocuments.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#64748B]">
                <span>
                  No PDF snapshots generated yet. Generate an Invoice, Quotation, Receipt, or Statement of Account to archive it.
                </span>
                <button
                  onClick={() => setActiveSubTab('documents')}
                  className="px-3 py-1.5 rounded-lg bg-[#0B0F19] text-white font-bold text-xs shrink-0 cursor-pointer"
                >
                  Open Document Generator
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {generatedDocuments.slice(0, 4).map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => setPreviewDoc(doc)}
                    className="p-3.5 rounded-xl border border-[#E2E8F0] hover:border-[#2563EB] bg-[#F8F9FA] text-left transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-[#2563EB]">
                        {doc.documentNumber}
                      </span>
                      <span className="font-mono text-[10px] text-[#64748B]">v{doc.version}</span>
                    </div>
                    <div className="font-bold text-xs text-[#0B0F19] mt-1 truncate">
                      {doc.clientName}
                    </div>
                    <div className="text-[11px] text-[#64748B] flex items-center justify-between mt-1">
                      <span>{doc.documentType}</span>
                      <span className="font-mono font-bold text-[#0B0F19]">
                        {formatINR(doc.amount)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 05: TRANSACTIONS */}
      {activeSubTab === 'transactions' && (
        <TransactionsAndExpenses
          mode="transactions"
          dbState={dbState}
          transactions={unifiedTransactions}
          expenses={expenses}
          payments={payments}
          invoices={invoices}
          clients={clients}
          onAddPayment={onAddPayment}
          onUpdatePayment={onUpdatePayment}
          onDeletePayment={onDeletePayment}
          onAddExpense={onAddExpense}
          onUpdateExpense={onUpdateExpense}
          onDeleteExpense={onDeleteExpense}
          onUpdateTransactions={(txs) => onUpdateTransactions?.(txs)}
          onGeneratePaymentReceipt={handleGenerateReceiptPdf}
          onSelectClient={onOpenClient360}
        />
      )}

      {/* SECTION 06 & 07: INVOICES & RECORD PAYMENT */}
      {activeSubTab === 'invoices' && (
        <InvoicesAndQuotations
          mode="invoices"
          dbState={dbState}
          invoices={invoices}
          quotations={quotations}
          payments={payments}
          clients={clients}
          financeSettings={financeSettings}
          onUpdateInvoices={(invs) => onUpdateInvoices?.(invs)}
          onUpdateQuotations={(quos) => onUpdateQuotations?.(quos)}
          onUpdateFinanceSettings={(s) => onUpdateFinanceSettings?.(s)}
          onAddPayment={onAddPayment}
          onGenerateInvoicePdf={handleGenerateInvoicePdf}
          onGenerateQuotationPdf={handleGenerateQuotationPdf}
          onGenerateReceiptPdf={handleGenerateReceiptPdf}
          onSelectClient={onOpenClient360}
        />
      )}

      {/* SECTION 10: QUOTATIONS */}
      {activeSubTab === 'quotations' && (
        <InvoicesAndQuotations
          mode="quotations"
          dbState={dbState}
          invoices={invoices}
          quotations={quotations}
          payments={payments}
          clients={clients}
          financeSettings={financeSettings}
          onUpdateInvoices={(invs) => onUpdateInvoices?.(invs)}
          onUpdateQuotations={(quos) => onUpdateQuotations?.(quos)}
          onUpdateFinanceSettings={(s) => onUpdateFinanceSettings?.(s)}
          onAddPayment={onAddPayment}
          onGenerateInvoicePdf={handleGenerateInvoicePdf}
          onGenerateQuotationPdf={handleGenerateQuotationPdf}
          onGenerateReceiptPdf={handleGenerateReceiptPdf}
          onSelectClient={onOpenClient360}
        />
      )}

      {/* SECTION 08: EXPENSES */}
      {activeSubTab === 'expenses' && (
        <TransactionsAndExpenses
          mode="expenses"
          dbState={dbState}
          transactions={unifiedTransactions}
          expenses={expenses}
          payments={payments}
          invoices={invoices}
          clients={clients}
          onAddPayment={onAddPayment}
          onUpdatePayment={onUpdatePayment}
          onDeletePayment={onDeletePayment}
          onAddExpense={onAddExpense}
          onUpdateExpense={onUpdateExpense}
          onDeleteExpense={onDeleteExpense}
          onUpdateTransactions={(txs) => onUpdateTransactions?.(txs)}
          onGeneratePaymentReceipt={handleGenerateReceiptPdf}
          onSelectClient={onOpenClient360}
        />
      )}

      {/* SECTION 14: DOCUMENTS LIBRARY */}
      {activeSubTab === 'documents' && (
        <DocumentsAndSettings
          mode="documents"
          generatedDocuments={generatedDocuments}
          documentTemplates={documentTemplates}
          financeSettings={financeSettings}
          invoices={invoices}
          quotations={quotations}
          payments={payments}
          clients={clients}
          onPreviewDocument={(doc) => setPreviewDoc(doc)}
          onGenerateInvoiceDoc={handleGenerateInvoicePdf}
          onGenerateQuotationDoc={handleGenerateQuotationPdf}
          onGenerateReceiptDoc={handleGenerateReceiptPdf}
          onGenerateStatementDoc={handleGenerateStatementPdf}
          onUpdateFinanceSettings={(s) => onUpdateFinanceSettings?.(s)}
        />
      )}

      {/* SECTION 15 & 16: FINANCE SETTINGS & CANVA TEMPLATES */}
      {activeSubTab === 'settings' && (
        <DocumentsAndSettings
          mode="settings"
          generatedDocuments={generatedDocuments}
          documentTemplates={documentTemplates}
          financeSettings={financeSettings}
          invoices={invoices}
          quotations={quotations}
          payments={payments}
          clients={clients}
          onPreviewDocument={(doc) => setPreviewDoc(doc)}
          onGenerateInvoiceDoc={handleGenerateInvoicePdf}
          onGenerateQuotationDoc={handleGenerateQuotationPdf}
          onGenerateReceiptDoc={handleGenerateReceiptPdf}
          onGenerateStatementDoc={handleGenerateStatementPdf}
          onUpdateFinanceSettings={(s) => onUpdateFinanceSettings?.(s)}
        />
      )}

      {/* CO-FOUNDER 50/50 SPLIT & SETTLEMENT */}
      {activeSubTab === 'settlement' && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#2563EB] font-bold">
                CO-FOUNDER EQUITY & TREASURY SPLIT (50 / 50)
              </span>
              <h3 className="text-lg font-bold text-[#0B0F19]">
                Krishna Khakole & Vansh Khakole Distributable Pool
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#E2E8F0]">
              <div className="font-mono text-[10px] uppercase text-[#64748B]">
                Net Realized Studio Profit
              </div>
              <div className="font-mono text-2xl font-bold text-[#0B0F19] mt-1">
                {formatINR(studioSplit.netProfit)}
              </div>
              <div className="text-xs text-[#64748B] mt-1">
                50% Share per Founder: {formatINR(studioSplit.krishnaProfitShare50)}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#E2E8F0]">
              <div className="font-mono text-[10px] uppercase text-[#64748B]">
                Krishna Khakole Net Position
              </div>
              <div className="font-mono text-xl font-bold text-[#2563EB] mt-1">
                Net Settlement: {formatINR(studioSplit.krishnaNetSettlement)}
              </div>
              <div className="text-xs text-[#64748B] mt-1">
                Collected: {formatINR(studioSplit.krishnaCollectedDirectly)} • Paid Out-of-Pocket:{' '}
                {formatINR(studioSplit.krishnaTotalPaid)}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#E2E8F0]">
              <div className="font-mono text-[10px] uppercase text-[#64748B]">
                Vansh Khakole Net Position
              </div>
              <div className="font-mono text-xl font-bold text-[#16A34A] mt-1">
                Net Settlement: {formatINR(studioSplit.vanshNetSettlement)}
              </div>
              <div className="text-xs text-[#64748B] mt-1">
                Collected: {formatINR(studioSplit.vanshCollectedDirectly)} • Paid Out-of-Pocket:{' '}
                {formatINR(studioSplit.vanshTotalPaid)}
              </div>
            </div>
          </div>
          {studioSplit.settlementSummary && (
            <div className="p-3.5 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-xs font-medium text-[#1E40AF]">
              {studioSplit.settlementSummary}
            </div>
          )}
        </div>
      )}

      {/* A4 Document Preview & PDF Engine Modal */}
      {previewDoc && (
        <DocumentPreviewModal
          document={previewDoc}
          allDocuments={generatedDocuments}
          settings={financeSettings}
          templates={documentTemplates}
          payments={payments}
          onClose={() => setPreviewDoc(null)}
          onSelectVersion={(doc) => setPreviewDoc(doc)}
          onChangeTemplate={(_docId, templateId) => {
            onUpdateFinanceSettings?.({
              ...financeSettings,
              defaultTemplateId: templateId
            });
          }}
        />
      )}
    </div>
  );
};
