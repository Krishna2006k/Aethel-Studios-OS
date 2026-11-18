import React, { useState } from 'react';
import {
  Wallet,
  Scale,
  Trash2,
  BarChart3,
  Megaphone,
  TrendingUp,
  Pencil,
  Check,
  X,
  FileText,
  Printer,
  Download,
  Target,
  Activity,
  Award,
} from 'lucide-react';
import {
  StudioExpense,
  ClientPayment,
  ClientLead,
  ExpensePaidBy,
  MetaAdCampaign,
  ClientInvoice,
  HostedWebsite,
} from '../types';
import {
  calculateClientProjectProgress,
  calculateCPC,
  calculateCPL,
  calculateCTR,
  calculateLeadConversionAnalytics,
  calculatePendingBalance,
  calculateStudioFinances,
  formatINR,
} from '../utils/calculations';

interface StudioFinanceViewProps {
  expenses: StudioExpense[];
  payments: ClientPayment[];
  clients: ClientLead[];
  metaCampaigns?: MetaAdCampaign[];
  websites?: HostedWebsite[];
  invoices?: ClientInvoice[];
  initialSubView?: 'ledger' | 'analytics';
  onUpdateExpense: (updated: StudioExpense) => void;
  onAddExpense: (newExp: StudioExpense) => void;
  onDeleteExpense: (expenseId: string) => void;
  onAddPayment: (newPay: ClientPayment) => void;
  onUpdatePayment?: (updated: ClientPayment) => void;
  onDeletePayment: (paymentId: string) => void;
  onAddInvoice?: (inv: ClientInvoice) => void;
  onUpdateInvoice?: (inv: ClientInvoice) => void;
  onDeleteInvoice?: (invoiceId: string) => void;
  onOpenClient360?: (clientId: string) => void;
}

export const StudioFinanceView: React.FC<StudioFinanceViewProps> = ({
  expenses,
  payments,
  clients,
  metaCampaigns = [],
  websites = [],
  invoices = [],
  initialSubView = 'ledger',
  onUpdateExpense,
  onAddExpense,
  onDeleteExpense,
  onAddPayment,
  onUpdatePayment,
  onDeletePayment,
  onAddInvoice,
  onUpdateInvoice,
  onDeleteInvoice,
  onOpenClient360,
}) => {
  const [activeTab, setActiveTab] = useState<
    'receivables' | 'payments' | 'invoices' | 'expenses' | 'analytics'
  >(initialSubView === 'analytics' ? 'analytics' : 'payments');

  const [analyticsDateRange, setAnalyticsDateRange] = useState<
    'All Time' | 'This Month' | 'This Quarter' | 'FY 2026-27'
  >('All Time');

  // Sync tab if sidebar switches between 'finance' and 'analytics'
  React.useEffect(() => {
    if (initialSubView === 'analytics') {
      setActiveTab('analytics');
    } else if (activeTab === 'analytics') {
      setActiveTab('payments');
    }
  }, [initialSubView]);

  // Quick Add Expense
  const [expTitle, setExpTitle] = useState('');
  const [expCategory, setExpCategory] = useState<StudioExpense['category']>('Domain & Hosting');
  const [expAmount, setExpAmount] = useState(1499);
  const [expPaidBy, setExpPaidBy] = useState<ExpensePaidBy>('Vansh');

  // Quick Add Payment
  const [payClient, setPayClient] = useState('');
  const [payTitle, setPayTitle] = useState('');
  const [payAmount, setPayAmount] = useState(10000);
  const [payMode, setPayMode] = useState<ClientPayment['paymentMode']>('UPI');
  const [payAccount, setPayAccount] = useState<ExpensePaidBy>('Studio Account');
  const [payMilestone, setPayMilestone] = useState<ClientPayment['milestone']>('Advance (50%)');

  // Quick Add Invoice
  const [invClient, setInvClient] = useState('');
  const [invType, setInvType] = useState<ClientInvoice['type']>('Advance Invoice');
  const [invAmount, setInvAmount] = useState(7999);
  const [invStatus, setInvStatus] = useState<ClientInvoice['status']>('Pending');
  const [invDesc, setInvDesc] = useState('');
  const [previewInvoice, setPreviewInvoice] = useState<ClientInvoice | null>(null);

  // Inline Edit Payment State
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [paymentDraft, setPaymentDraft] = useState<ClientPayment | null>(null);

  const handleStartEditPayment = (pay: ClientPayment) => {
    setEditingPaymentId(pay.id);
    setPaymentDraft({ ...pay });
  };

  const handleSavePaymentEdit = () => {
    if (!paymentDraft || !onUpdatePayment) return;
    onUpdatePayment({
      ...paymentDraft,
      clientName: paymentDraft.clientName.trim(),
      projectTitle: paymentDraft.projectTitle.trim(),
      amountReceived: Math.max(0, Number(paymentDraft.amountReceived) || 0),
    });
    setEditingPaymentId(null);
    setPaymentDraft(null);
  };

  // Inline Edit Expense State
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expenseDraft, setExpenseDraft] = useState<StudioExpense | null>(null);

  const handleStartEditExpense = (exp: StudioExpense) => {
    setEditingExpenseId(exp.id);
    setExpenseDraft({ ...exp });
  };

  const handleSaveExpenseEdit = () => {
    if (!expenseDraft) return;
    onUpdateExpense({
      ...expenseDraft,
      title: expenseDraft.title.trim(),
      amount: Math.max(0, Number(expenseDraft.amount) || 0),
    });
    setEditingExpenseId(null);
    setExpenseDraft(null);
  };

  const finances = calculateStudioFinances(expenses, payments, clients, metaCampaigns);
  const salesAnalytics = calculateLeadConversionAnalytics(clients);

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expTitle.trim()) return;
    onAddExpense({
      id: `exp-${Date.now()}`,
      title: expTitle.trim(),
      category: expCategory,
      amount: Number(expAmount),
      paidBy: expPaidBy,
      date: new Date().toISOString().slice(0, 10),
      clientRelated: 'Studio Operations',
      reimbursed: expPaidBy === 'Studio Account',
      notes: 'Logged in Studio Finance module.',
    });
    setExpTitle('');
  };

  const handleCreatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payClient.trim()) return;
    const matchedClient = clients.find(
      (c) => c.businessName.toLowerCase().trim() === payClient.toLowerCase().trim()
    );
    onAddPayment({
      id: `pay-${Date.now()}`,
      clientId: matchedClient?.id,
      clientName: matchedClient ? matchedClient.businessName : payClient.trim(),
      projectTitle:
        payTitle.trim() ||
        (matchedClient ? `${matchedClient.packageTier} — Payment` : 'Website & Growth Package'),
      totalProjectValue: matchedClient ? matchedClient.finalAgreedPrice : Number(payAmount),
      amountReceived: Number(payAmount),
      paymentDate: new Date().toISOString().slice(0, 10),
      paymentMode: payMode,
      receivedInAccount: payAccount,
      milestone: payMilestone,
    });
    setPayClient('');
    setPayTitle('');
  };

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invClient.trim() || !onAddInvoice) return;
    const matchedClient = clients.find(
      (c) => c.businessName.toLowerCase().trim() === invClient.toLowerCase().trim()
    );
    const today = new Date().toISOString().slice(0, 10);
    const nextNum = `INV-2026-${String(invoices.length + 1).padStart(3, '0')}`;
    onAddInvoice({
      id: `inv-${Date.now()}`,
      invoiceNumber: nextNum,
      clientId: matchedClient?.id || `cli-${Date.now()}`,
      clientName: matchedClient ? matchedClient.businessName : invClient.trim(),
      projectTitle: matchedClient ? matchedClient.packageTier : 'Website & Digital Growth Package',
      type: invType,
      amount: Math.max(0, Number(invAmount) || 0),
      status: invStatus,
      issueDate: today,
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      notes:
        invDesc.trim() ||
        `${matchedClient ? matchedClient.packageTier : 'Website & Digital Growth Package'} — ${invType}`,
    });
    setInvClient('');
    setInvDesc('');
  };

  const handleExportFinanceCSV = () => {
    const headers = [
      'Record Type',
      'Date',
      'Client / Entity',
      'Description / Category',
      'Account / Payer',
      'Amount (INR)',
    ];
    const rows: string[][] = [
      ...payments.map((p) => [
        'INFLOW',
        p.paymentDate,
        `"${p.clientName}"`,
        `"${p.projectTitle} (${p.milestone})"`,
        p.receivedInAccount,
        String(p.amountReceived),
      ]),
      ...expenses.map((e) => [
        'EXPENSE',
        e.date,
        `"${e.clientRelated || 'Studio'}"`,
        `"${e.title} (${e.category})"`,
        e.paidBy,
        `-${e.amount}`,
      ]),
    ];
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `aethel-finance-report-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const receivableClients = clients.filter(
    (c) =>
      c.stage !== 'Rejected / Dropped' &&
      (c.finalAgreedPrice > 0 || c.advancePaid > 0)
  );

  const nicheBreakdown = [
    'Banquet/Lawns',
    'Clinic/Hospital',
    'Retail/Electronics',
    'Cafe/Restaurant',
    'Real Estate/Interior',
  ].map((nicheName) => {
    const nicheClients = clients.filter(
      (c) => c.niche === nicheName && c.stage !== 'Rejected / Dropped'
    );
    const contracted = nicheClients.reduce((s, c) => s + c.finalAgreedPrice, 0);
    const collected = nicheClients.reduce((s, c) => s + c.advancePaid, 0);
    return {
      nicheName,
      count: nicheClients.length,
      contracted,
      collected,
    };
  });

  // Part 9: Client Profitability Table Calculation
  const clientProfitabilityList = clients
    .filter((c) => c.stage !== 'Rejected / Dropped')
    .map((c) => {
      const clientExpenses = expenses
        .filter(
          (e) =>
            e.clientRelated?.toLowerCase() === c.businessName.toLowerCase() ||
            websites.some(
              (w) =>
                (w.clientId === c.id ||
                  w.clientName.toLowerCase() === c.businessName.toLowerCase()) &&
                e.linkedDomainId === w.id
            ) ||
            metaCampaigns.some(
              (m) =>
                (m.clientId === c.id ||
                  m.clientName.toLowerCase() === c.businessName.toLowerCase()) &&
                e.linkedCampaignId === m.id
            )
        )
        .reduce((s, e) => s + e.amount, 0);
      const netClientProfit = c.advancePaid - clientExpenses;
      const projectedNetProfit = c.finalAgreedPrice - clientExpenses;
      const progress = calculateClientProjectProgress(c);
      return {
        client: c,
        revenueCollected: c.advancePaid,
        contractValue: c.finalAgreedPrice,
        directCosts: clientExpenses,
        netClientProfit,
        projectedNetProfit,
        progressPct: progress.percent,
      };
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white rounded-3xl p-5 sm:p-6 border border-[#EAECEF] shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)]">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-[#2563EB] mb-1">
            MANAGEMENT · UNIFIED FINANCIAL LEDGER, INVOICES &amp; 5-CATEGORY ANALYTICS
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B0F19]">
            {activeTab === 'analytics'
              ? 'Studio Intelligence & 5-Category Analytics'
              : 'Treasury, Invoices & Co-Founder Accounting'}
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
            Complete financial operating system for <strong>Vansh Khakole</strong> &amp; <strong>Krishna Khakole</strong> — real-time reconciliation across CRM, Meta Ads, and Domains.
          </p>
        </div>

        {/* Sub-view Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#F8F9FA] p-1 rounded-2xl border border-[#EAECEF]">
          {[
            { id: 'payments', label: `Client Inflows (${payments.length})` },
            { id: 'receivables', label: `Receivables (${formatINR(finances.pendingReceivables)})` },
            { id: 'invoices', label: `Invoices & Receipts (${invoices.length})` },
            { id: 'expenses', label: `Expenses (${expenses.length})` },
            { id: 'analytics', label: '5-Category Analytics' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#0B0F19] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#0B0F19]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3-STREAM FINANCIAL SEPARATION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-[#0B0F19] text-white rounded-3xl p-5 border border-[#0B0F19] flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#34D399] font-bold">
              STREAM 01 · AGENCY REVENUE ({finances.collectionRatePercent}% COLLECTED)
            </span>
            <TrendingUp className="w-4 h-4 text-[#34D399]" />
          </div>
          <div>
            <div className="text-3xl font-extrabold font-mono text-white">
              {formatINR(finances.totalRevenueCollected)}
            </div>
            <div className="text-xs text-[#94A3B8] mt-1">
              Web Builds: <strong className="text-white">{formatINR(finances.clientProjectRevenue)}</strong> · Ad Retainers:{' '}
              <strong className="text-white">{formatINR(finances.agencyRetainerRevenue)}</strong>
            </div>
          </div>
          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
            <span className="text-[#94A3B8]">Pending Client Receivables:</span>
            <span className="font-mono font-bold text-amber-400">
              {formatINR(finances.pendingReceivables)}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-[#EAECEF] flex flex-col justify-between space-y-4 shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#2563EB] font-bold">
              STREAM 02 · STUDIO NET PROFIT ({finances.profitMarginPercent}% MARGIN)
            </span>
            <Wallet className="w-4 h-4 text-[#2563EB]" />
          </div>
          <div>
            <div className="text-3xl font-extrabold font-mono text-[#0B0F19]">
              {formatINR(finances.netProfit)}
            </div>
            <div className="text-xs text-[#64748B] mt-1">
              50% Vansh: <strong className="text-[#059669]">{formatINR(finances.vanshProfitShare50)}</strong> · 50% Krishna:{' '}
              <strong className="text-[#059669]">{formatINR(finances.krishnaProfitShare50)}</strong>
            </div>
          </div>
          <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-xs">
            <span className="text-[#64748B]">Agency Operational Expenses:</span>
            <span className="font-mono font-bold text-rose-600">
              {formatINR(finances.totalStudioExpenses)}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-[#EAECEF] flex flex-col justify-between space-y-4 shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-600 font-bold">
              STREAM 03 · CLIENT AD SPEND (SYNCED)
            </span>
            <Megaphone className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <div className="text-3xl font-extrabold font-mono text-[#0B0F19]">
              {formatINR(finances.totalClientAdSpendPassThrough)}
            </div>
            <div className="text-xs text-[#64748B] mt-1">
              Out of <strong className="text-[#0B0F19]">{formatINR(finances.totalAdBudgetManaged)}</strong> client ad budget managed
            </div>
          </div>
          <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-xs">
            <span className="text-[#64748B]">Aethel Agency Retainer Earned:</span>
            <span className="font-mono font-bold text-[#059669]">
              {formatINR(finances.totalMetaAgencyFees)}
            </span>
          </div>
        </div>
      </div>

      {/* PART 8: 6-COLUMN CO-FOUNDER ACCOUNTING & SETTLEMENT TABLE */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EAECEF] shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 border-b border-[#EAECEF]">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-[#2563EB]" />
            <div>
              <h2 className="text-base font-extrabold text-[#0B0F19]">
                Co-Founder Accounting, Attributable Revenue &amp; 50/50 Settlement Ledger
              </h2>
              <p className="text-xs text-[#64748B]">
                Tracks direct collections, deal attribution, personal unreimbursed spend, and exact 50/50 profit entitlement.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-xl bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] text-xs font-bold">
            {finances.settlementSummary}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8F9FA] border-b border-[#EAECEF] text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                <th className="py-3 px-4">Co-Founder / Account</th>
                <th className="py-3 px-4 text-right">Revenue Collected Directly</th>
                <th className="py-3 px-4 text-right">Revenue Attributable (Deals)</th>
                <th className="py-3 px-4 text-right">Personal Expenses (Unreimbursed)</th>
                <th className="py-3 px-4 text-right">50% Profit Share Entitlement</th>
                <th className="py-3 px-4 text-right">Net Settlement Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAECEF] text-xs">
              <tr className="hover:bg-[#F8F9FA]/60">
                <td className="py-3.5 px-4 font-extrabold text-[#0B0F19]">
                  Krishna Khakole <span className="text-[10px] font-normal text-[#64748B]">(Co-Founder)</span>
                </td>
                <td className="py-3.5 px-4 text-right font-mono font-bold text-[#0B0F19]">
                  {formatINR(finances.krishnaCollectedDirectly)}
                </td>
                <td className="py-3.5 px-4 text-right font-mono font-bold text-[#2563EB]">
                  {formatINR(finances.krishnaAttributableRevenue)}
                </td>
                <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-600">
                  {formatINR(finances.krishnaOutOfPocketUnreimbursed)}
                </td>
                <td className="py-3.5 px-4 text-right font-mono font-bold text-[#059669]">
                  {formatINR(finances.krishnaProfitShare50)}
                </td>
                <td className="py-3.5 px-4 text-right font-mono font-extrabold text-[#0B0F19]">
                  {formatINR(finances.krishnaNetSettlement)}
                </td>
              </tr>
              <tr className="hover:bg-[#F8F9FA]/60">
                <td className="py-3.5 px-4 font-extrabold text-[#0B0F19]">
                  Vansh Khakole <span className="text-[10px] font-normal text-[#64748B]">(Co-Founder)</span>
                </td>
                <td className="py-3.5 px-4 text-right font-mono font-bold text-[#0B0F19]">
                  {formatINR(finances.vanshCollectedDirectly)}
                </td>
                <td className="py-3.5 px-4 text-right font-mono font-bold text-[#2563EB]">
                  {formatINR(finances.vanshAttributableRevenue)}
                </td>
                <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-600">
                  {formatINR(finances.vanshOutOfPocketUnreimbursed)}
                </td>
                <td className="py-3.5 px-4 text-right font-mono font-bold text-[#059669]">
                  {formatINR(finances.vanshProfitShare50)}
                </td>
                <td className="py-3.5 px-4 text-right font-mono font-extrabold text-[#0B0F19]">
                  {formatINR(finances.vanshNetSettlement)}
                </td>
              </tr>
              <tr className="bg-[#F8F9FA]/80 font-bold">
                <td className="py-3 px-4 text-[#475569]">Studio Joint Account</td>
                <td className="py-3 px-4 text-right font-mono text-[#059669]">
                  {formatINR(finances.studioAccountCollected)}
                </td>
                <td className="py-3 px-4 text-right font-mono text-[#64748B]">—</td>
                <td className="py-3 px-4 text-right font-mono text-rose-600">
                  {formatINR(finances.studioAccountPaid)}
                </td>
                <td className="py-3 px-4 text-right font-mono text-[#64748B]">Shared Pool</td>
                <td className="py-3 px-4 text-right font-mono text-[#0B0F19]">
                  {formatINR(finances.studioAccountCollected - finances.studioAccountPaid)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* TAB 1: CLIENT PAYMENTS / INFLOW LOG */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <form
            onSubmit={handleCreatePayment}
            className="bg-white rounded-3xl p-5 border border-[#EAECEF] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end"
          >
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                Client Name (Syncs with CRM Pipeline)
              </label>
              <input
                type="text"
                required
                list="finance-client-list"
                value={payClient}
                onChange={(e) => {
                  const val = e.target.value;
                  setPayClient(val);
                  const matched = clients.find(
                    (c) => c.businessName.toLowerCase() === val.trim().toLowerCase()
                  );
                  if (matched) {
                    const remaining = Math.max(
                      0,
                      matched.finalAgreedPrice - matched.advancePaid
                    );
                    if (remaining > 0) setPayAmount(remaining);
                    if (!payTitle) setPayTitle(matched.packageTier);
                  }
                }}
                placeholder="Select or type client business name..."
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-xs bg-[#F8F9FA] focus:bg-white"
              />
              <datalist id="finance-client-list">
                {clients.map((c) => (
                  <option key={c.id} value={c.businessName} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                Amount Received (₹)
              </label>
              <input
                type="number"
                required
                value={payAmount}
                onChange={(e) => setPayAmount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-[#EAECEF] text-xs font-mono font-bold text-[#059669] bg-[#F8F9FA]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                Payment Mode
              </label>
              <select
                value={payMode}
                onChange={(e) =>
                  setPayMode(e.target.value as ClientPayment['paymentMode'])
                }
                className="w-full px-3 py-2 rounded-xl border border-[#EAECEF] text-xs bg-[#F8F9FA]"
              >
                <option value="UPI">UPI</option>
                <option value="Bank NEFT/IMPS">Bank NEFT/IMPS</option>
                <option value="Cash">Cash</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                Received By
              </label>
              <select
                value={payAccount}
                onChange={(e) => setPayAccount(e.target.value as ExpensePaidBy)}
                className="w-full px-3 py-2 rounded-xl border border-[#EAECEF] text-xs bg-[#F8F9FA]"
              >
                <option value="Studio Account">Studio Account</option>
                <option value="Vansh">Vansh</option>
                <option value="Krishna">Krishna</option>
              </select>
            </div>
            <button
              type="submit"
              className="py-2.5 px-4 rounded-xl bg-[#059669] text-white text-xs font-bold hover:bg-[#047857] cursor-pointer"
            >
              + Record Inflow
            </button>
          </form>

          <div className="bg-white rounded-3xl border border-[#EAECEF] overflow-hidden shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8F9FA] border-b border-[#EAECEF] text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                    <th className="py-3.5 px-5">Date</th>
                    <th className="py-3.5 px-4">Client &amp; Milestone Note</th>
                    <th className="py-3.5 px-4">Payment Mode</th>
                    <th className="py-3.5 px-4">Received By</th>
                    <th className="py-3.5 px-4 text-right">Amount Received (₹)</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAECEF] text-xs">
                  {payments.map((pay) => {
                    const isEditingPay =
                      editingPaymentId === pay.id && paymentDraft !== null;

                    if (isEditingPay && paymentDraft) {
                      return (
                        <tr key={pay.id} className="bg-[#EFF6FF]/40">
                          <td className="py-3 px-5">
                            <input
                              type="date"
                              value={paymentDraft.paymentDate}
                              onChange={(e) =>
                                setPaymentDraft({
                                  ...paymentDraft,
                                  paymentDate: e.target.value,
                                })
                              }
                              className="px-2 py-1 rounded-lg bg-white border border-[#EAECEF] font-mono text-xs"
                            />
                          </td>
                          <td className="py-3 px-4 space-y-1">
                            <input
                              type="text"
                              list="finance-client-list"
                              value={paymentDraft.clientName}
                              onChange={(e) =>
                                setPaymentDraft({
                                  ...paymentDraft,
                                  clientName: e.target.value,
                                })
                              }
                              className="w-full px-2.5 py-1 rounded-lg bg-white border border-[#EAECEF] font-bold text-xs"
                            />
                            <div className="flex gap-1.5">
                              <input
                                type="text"
                                value={paymentDraft.projectTitle}
                                onChange={(e) =>
                                  setPaymentDraft({
                                    ...paymentDraft,
                                    projectTitle: e.target.value,
                                  })
                                }
                                className="flex-1 px-2.5 py-1 rounded-lg bg-white border border-[#EAECEF] text-[11px]"
                              />
                              <select
                                value={paymentDraft.milestone}
                                onChange={(e) =>
                                  setPaymentDraft({
                                    ...paymentDraft,
                                    milestone: e.target.value as ClientPayment['milestone'],
                                  })
                                }
                                className="px-2 py-1 rounded-lg bg-white border border-[#EAECEF] text-[11px]"
                              >
                                <option value="Advance (50%)">Advance (50%)</option>
                                <option value="Final Delivery (50%)">Final Delivery (50%)</option>
                                <option value="Full Upfront">Full Upfront</option>
                                <option value="Meta Ads Retainer">Meta Ads Retainer</option>
                                <option value="Domain Renewal">Domain Renewal</option>
                              </select>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={paymentDraft.paymentMode}
                              onChange={(e) =>
                                setPaymentDraft({
                                  ...paymentDraft,
                                  paymentMode: e.target.value as ClientPayment['paymentMode'],
                                })
                              }
                              className="px-2 py-1 rounded-lg bg-white border border-[#EAECEF] text-xs font-semibold"
                            >
                              <option value="UPI">UPI</option>
                              <option value="Bank NEFT/IMPS">Bank NEFT/IMPS</option>
                              <option value="Cash">Cash</option>
                            </select>
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={paymentDraft.receivedInAccount}
                              onChange={(e) =>
                                setPaymentDraft({
                                  ...paymentDraft,
                                  receivedInAccount: e.target.value as ExpensePaidBy,
                                })
                              }
                              className="px-2 py-1 rounded-lg bg-white border border-[#EAECEF] text-xs font-bold"
                            >
                              <option value="Studio Account">Studio Account</option>
                              <option value="Vansh">Vansh</option>
                              <option value="Krishna">Krishna</option>
                            </select>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <input
                              type="number"
                              value={paymentDraft.amountReceived}
                              onChange={(e) =>
                                setPaymentDraft({
                                  ...paymentDraft,
                                  amountReceived: Number(e.target.value),
                                })
                              }
                              className="w-24 px-2 py-1 rounded-lg bg-white border border-[#EAECEF] text-right font-mono font-extrabold text-xs text-[#059669]"
                            />
                          </td>
                          <td className="py-3 px-5 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={handleSavePaymentEdit}
                                className="px-2.5 py-1 rounded-lg bg-[#2563EB] text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Check className="w-3 h-3" /> Save
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPaymentId(null);
                                  setPaymentDraft(null);
                                }}
                                className="p-1 rounded-lg text-[#64748B] hover:text-[#0B0F19] cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={pay.id} className="hover:bg-[#F8F9FA]/60 transition-colors">
                        <td className="py-3.5 px-5 font-mono text-[#64748B]">
                          {pay.paymentDate}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#0B0F19]">{pay.clientName}</div>
                          <div className="text-[11px] text-[#64748B]">
                            {pay.projectTitle} · {pay.milestone}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-[#475569]">
                          {pay.paymentMode}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-[#0B0F19]">
                          {pay.receivedInAccount}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-extrabold text-[#059669]">
                          +{formatINR(pay.amountReceived)}
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <div className="inline-flex items-center gap-1">
                            {onUpdatePayment && (
                              <button
                                type="button"
                                onClick={() => handleStartEditPayment(pay)}
                                aria-label={`Edit payment from ${pay.clientName}`}
                                className="px-2 py-1 rounded-lg bg-[#F8F9FA] hover:bg-[#EFF6FF] text-[#475569] hover:text-[#2563EB] border border-[#EAECEF] text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Pencil className="w-3 h-3" /> Edit
                              </button>
                            )}
                            <button
                              onClick={() => onDeletePayment(pay.id)}
                              aria-label={`Delete payment from ${pay.clientName}`}
                              className="p-1.5 rounded-lg text-[#94A3B8] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ACCOUNTS RECEIVABLE PER CLIENT */}
      {activeTab === 'receivables' && (
        <div className="bg-white rounded-3xl border border-[#EAECEF] overflow-hidden shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)]">
          <div className="p-5 border-b border-[#EAECEF] flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-[#0B0F19]">
                Client Accounts Receivable &amp; Collection Schedule
              </h3>
              <p className="text-xs text-[#64748B]">
                Every rupee here is directly derived from the unified Client Pipeline.
              </p>
            </div>
            <span className="font-mono text-sm font-extrabold text-amber-700">
              Total Due: {formatINR(finances.pendingReceivables)}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8F9FA] border-b border-[#EAECEF] text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                  <th className="py-3.5 px-5">Client Account</th>
                  <th className="py-3.5 px-4">Stage</th>
                  <th className="py-3.5 px-4 text-right">Agreed Value</th>
                  <th className="py-3.5 px-4 text-right">Paid to Date</th>
                  <th className="py-3.5 px-4 text-right">Balance Due</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAECEF] text-xs">
                {receivableClients.map((client) => {
                  const due = calculatePendingBalance(
                    client.finalAgreedPrice,
                    client.advancePaid
                  );
                  return (
                    <tr key={client.id} className="hover:bg-[#F8F9FA]/60">
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-[#0B0F19]">{client.businessName}</div>
                        <div className="text-[11px] text-[#64748B]">
                          {client.contactPerson} · {client.packageTier}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[#475569]">
                        {client.stage}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-[#0B0F19]">
                        {formatINR(client.finalAgreedPrice)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-[#059669]">
                        {formatINR(client.advancePaid)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-extrabold">
                        {due > 0 ? (
                          <span className="text-amber-700">{formatINR(due)}</span>
                        ) : (
                          <span className="text-[#059669]">Settled</span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        {due > 0 ? (
                          <button
                            onClick={() => {
                              setPayClient(client.businessName);
                              setPayAmount(due);
                              setPayTitle(`${client.packageTier} — Balance Settlement`);
                              setActiveTab('payments');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-[#059669] text-white font-bold text-[11px] cursor-pointer"
                          >
                            Collect {formatINR(due)}
                          </button>
                        ) : (
                          <button
                            onClick={() => onOpenClient360 && onOpenClient360(client.id)}
                            className="px-3 py-1.5 rounded-xl bg-[#F8F9FA] text-[#475569] font-bold text-[11px] cursor-pointer"
                          >
                            360° Dossier
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: INVOICES & PAYMENT RECEIPTS GENERATOR (PART 8) */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          {onAddInvoice && (
            <form
              onSubmit={handleCreateInvoice}
              className="bg-white rounded-3xl p-5 border border-[#EAECEF] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end"
            >
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                  Client Name *
                </label>
                <input
                  type="text"
                  required
                  list="finance-client-list"
                  value={invClient}
                  onChange={(e) => setInvClient(e.target.value)}
                  placeholder="e.g., Balaji Lawns"
                  className="w-full px-3 py-2 rounded-xl border border-[#EAECEF] text-xs bg-[#F8F9FA]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                  Document Type
                </label>
                <select
                  value={invType}
                  onChange={(e) => setInvType(e.target.value as ClientInvoice['type'])}
                  className="w-full px-3 py-2 rounded-xl border border-[#EAECEF] text-xs bg-[#F8F9FA]"
                >
                  <option value="Advance Invoice">Advance Invoice</option>
                  <option value="Milestone Invoice">Milestone Invoice</option>
                  <option value="Final Invoice">Final Invoice</option>
                  <option value="Payment Receipt">Payment Receipt</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  required
                  value={invAmount}
                  onChange={(e) => setInvAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-[#EAECEF] text-xs font-mono font-bold bg-[#F8F9FA]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                  Status
                </label>
                <select
                  value={invStatus}
                  onChange={(e) => setInvStatus(e.target.value as ClientInvoice['status'])}
                  className="w-full px-3 py-2 rounded-xl border border-[#EAECEF] text-xs font-bold bg-[#F8F9FA]"
                >
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                  Line Item Description
                </label>
                <input
                  type="text"
                  value={invDesc}
                  onChange={(e) => setInvDesc(e.target.value)}
                  placeholder="Package / Milestone scope..."
                  className="w-full px-3 py-2 rounded-xl border border-[#EAECEF] text-xs bg-[#F8F9FA]"
                />
              </div>
              <button
                type="submit"
                className="py-2.5 px-4 rounded-xl bg-[#2563EB] text-white text-xs font-bold hover:bg-[#1D4ED8] cursor-pointer"
              >
                + Generate Invoice
              </button>
            </form>
          )}

          <div className="bg-white rounded-3xl border border-[#EAECEF] overflow-hidden shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8F9FA] border-b border-[#EAECEF] text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                    <th className="py-3.5 px-5">Invoice #</th>
                    <th className="py-3.5 px-4">Client &amp; Line Item</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Issued / Due</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Amount (₹)</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAECEF] text-xs">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-[#F8F9FA]/60">
                      <td className="py-3.5 px-5 font-mono font-bold text-[#2563EB]">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#0B0F19]">{inv.clientName}</div>
                        <div className="text-[11px] text-[#64748B]">{inv.projectTitle} · {inv.notes}</div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[#475569]">{inv.type}</td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#64748B]">
                        {inv.issueDate} · Due: {inv.dueDate}
                      </td>
                      <td className="py-3.5 px-4">
                        {onUpdateInvoice ? (
                          <select
                            value={inv.status}
                            onChange={(e) =>
                              onUpdateInvoice({
                                ...inv,
                                status: e.target.value as ClientInvoice['status'],
                              })
                            }
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                              inv.status === 'Paid'
                                ? 'bg-[#D1FAE5] text-[#059669] border-[#A7F3D0]'
                                : inv.status === 'Overdue'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Paid">Paid</option>
                            <option value="Overdue">Overdue</option>
                          </select>
                        ) : (
                          <span className="font-bold">{inv.status}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-extrabold text-[#0B0F19]">
                        {formatINR(inv.amount)}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPreviewInvoice(inv)}
                            className="px-2.5 py-1 rounded-lg bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#2563EB] border border-[#BFDBFE] text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <FileText className="w-3 h-3" /> View / Print
                          </button>
                          {onDeleteInvoice && (
                            <button
                              type="button"
                              onClick={() => onDeleteInvoice(inv.id)}
                              className="p-1.5 rounded-lg text-[#94A3B8] hover:text-rose-600 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: EXPENSES TRACKER */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          <form
            onSubmit={handleCreateExpense}
            className="bg-white rounded-3xl p-5 border border-[#EAECEF] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end"
          >
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                Expense Item
              </label>
              <input
                type="text"
                required
                value={expTitle}
                onChange={(e) => setExpTitle(e.target.value)}
                placeholder="e.g., Hostinger .in Domain or Figma Seat"
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-xs bg-[#F8F9FA]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                Category
              </label>
              <select
                value={expCategory}
                onChange={(e) =>
                  setExpCategory(e.target.value as StudioExpense['category'])
                }
                className="w-full px-3 py-2 rounded-xl border border-[#EAECEF] text-xs bg-[#F8F9FA]"
              >
                <option value="Domain & Hosting">Domain &amp; Hosting</option>
                <option value="Software / SaaS">Software / SaaS</option>
                <option value="Marketing & Samples">Marketing &amp; Samples</option>
                <option value="Operations / Travel">Operations / Travel</option>
                <option value="Equipment">Equipment</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                Amount (₹) &amp; Paid By
              </label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  required
                  value={expAmount}
                  onChange={(e) => setExpAmount(Number(e.target.value))}
                  className="w-24 px-2.5 py-2 rounded-xl border border-[#EAECEF] text-xs font-mono bg-[#F8F9FA]"
                />
                <select
                  value={expPaidBy}
                  onChange={(e) => setExpPaidBy(e.target.value as ExpensePaidBy)}
                  className="flex-1 px-2 py-2 rounded-xl border border-[#EAECEF] text-xs bg-[#F8F9FA]"
                >
                  <option value="Vansh">Vansh</option>
                  <option value="Krishna">Krishna</option>
                  <option value="Studio Account">Studio</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="py-2.5 px-4 rounded-xl bg-[#0B0F19] text-white text-xs font-bold hover:bg-[#1E293B] cursor-pointer"
            >
              + Add Expense
            </button>
          </form>

          <div className="bg-white rounded-3xl border border-[#EAECEF] overflow-hidden shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8F9FA] border-b border-[#EAECEF] text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                    <th className="py-3.5 px-5">Date</th>
                    <th className="py-3.5 px-4">Expense Description</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Paid By</th>
                    <th className="py-3.5 px-4 text-right">Amount (₹)</th>
                    <th className="py-3.5 px-5 text-right">Status &amp; Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAECEF] text-xs">
                  {expenses.map((exp) => {
                    const isDomainSync = Boolean(
                      exp.linkedDomainId || exp.id.startsWith('exp-dom-')
                    );
                    const isMetaSync = Boolean(
                      exp.linkedCampaignId || exp.id.startsWith('exp-meta-')
                    );
                    const matchedClient = clients.find(
                      (c) =>
                        exp.clientRelated &&
                        c.businessName.toLowerCase() === exp.clientRelated.toLowerCase()
                    );
                    const isEditingExp =
                      editingExpenseId === exp.id && expenseDraft !== null;

                    if (isEditingExp && expenseDraft) {
                      return (
                        <tr key={exp.id} className="bg-[#EFF6FF]/40">
                          <td className="py-3 px-5">
                            <input
                              type="date"
                              value={expenseDraft.date}
                              onChange={(e) =>
                                setExpenseDraft({ ...expenseDraft, date: e.target.value })
                              }
                              className="px-2 py-1 rounded-lg bg-white border border-[#EAECEF] font-mono text-xs"
                            />
                          </td>
                          <td className="py-3 px-4 space-y-1">
                            <input
                              type="text"
                              value={expenseDraft.title}
                              onChange={(e) =>
                                setExpenseDraft({ ...expenseDraft, title: e.target.value })
                              }
                              className="w-full px-2.5 py-1 rounded-lg bg-white border border-[#EAECEF] font-bold text-xs"
                            />
                            <input
                              type="text"
                              list="finance-client-list"
                              value={expenseDraft.clientRelated || ''}
                              onChange={(e) =>
                                setExpenseDraft({
                                  ...expenseDraft,
                                  clientRelated: e.target.value,
                                })
                              }
                              placeholder="Client Related"
                              className="w-full px-2.5 py-1 rounded-lg bg-white border border-[#EAECEF] text-[11px]"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={expenseDraft.category}
                              onChange={(e) =>
                                setExpenseDraft({
                                  ...expenseDraft,
                                  category: e.target.value as StudioExpense['category'],
                                })
                              }
                              className="px-2 py-1 rounded-lg bg-white border border-[#EAECEF] text-xs"
                            >
                              <option value="Domain & Hosting">Domain &amp; Hosting</option>
                              <option value="Meta Ad Spend">Meta Ad Spend</option>
                              <option value="Software / SaaS">Software / SaaS</option>
                              <option value="Marketing & Samples">Marketing &amp; Samples</option>
                              <option value="Operations / Travel">Operations / Travel</option>
                              <option value="Equipment">Equipment</option>
                            </select>
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={expenseDraft.paidBy}
                              onChange={(e) =>
                                setExpenseDraft({
                                  ...expenseDraft,
                                  paidBy: e.target.value as ExpensePaidBy,
                                })
                              }
                              className="px-2 py-1 rounded-lg bg-white border border-[#EAECEF] text-xs font-bold"
                            >
                              <option value="Vansh">Vansh</option>
                              <option value="Krishna">Krishna</option>
                              <option value="Studio Account">Studio Account</option>
                            </select>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <input
                              type="number"
                              value={expenseDraft.amount}
                              onChange={(e) =>
                                setExpenseDraft({
                                  ...expenseDraft,
                                  amount: Number(e.target.value),
                                })
                              }
                              className="w-24 px-2 py-1 rounded-lg bg-white border border-[#EAECEF] text-right font-mono font-bold text-xs text-rose-600"
                            />
                          </td>
                          <td className="py-3 px-5 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={handleSaveExpenseEdit}
                                className="px-2.5 py-1 rounded-lg bg-[#2563EB] text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Check className="w-3 h-3" /> Save
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingExpenseId(null);
                                  setExpenseDraft(null);
                                }}
                                className="p-1 rounded-lg text-[#64748B] hover:text-[#0B0F19] cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={exp.id} className="hover:bg-[#F8F9FA]/60">
                        <td className="py-3.5 px-5 font-mono text-[#64748B]">{exp.date}</td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#0B0F19] flex items-center gap-1.5 flex-wrap">
                            <span>{exp.title}</span>
                            {isDomainSync && (
                              <span className="px-2 py-0.5 rounded-md bg-[#EFF6FF] text-[#2563EB] text-[10px] font-bold">
                                Domain Sync
                              </span>
                            )}
                            {isMetaSync && (
                              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                                Meta Ads Sync
                              </span>
                            )}
                          </div>
                          {exp.clientRelated && (
                            <div className="text-[11px] text-[#64748B] mt-0.5">
                              Client:{' '}
                              {matchedClient && onOpenClient360 ? (
                                <button
                                  onClick={() => onOpenClient360(matchedClient.id)}
                                  className="font-semibold text-[#2563EB] hover:underline cursor-pointer"
                                >
                                  {matchedClient.businessName} ↗
                                </button>
                              ) : (
                                <span className="font-semibold text-[#475569]">
                                  {exp.clientRelated}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-[#475569] font-semibold">
                          {exp.category}
                        </td>
                        <td className="py-3.5 px-4">
                          <select
                            value={exp.paidBy}
                            onChange={(e) => {
                              const nextPaidBy = e.target.value as ExpensePaidBy;
                              onUpdateExpense({
                                ...exp,
                                paidBy: nextPaidBy,
                                reimbursed:
                                  nextPaidBy === 'Studio Account' ? true : exp.reimbursed,
                              });
                            }}
                            aria-label={`Paid by for ${exp.title}`}
                            className="px-2.5 py-1 rounded-lg bg-[#F8F9FA] border border-[#EAECEF] font-bold text-[#0B0F19] text-xs cursor-pointer"
                          >
                            <option value="Vansh">Vansh</option>
                            <option value="Krishna">Krishna</option>
                            <option value="Studio Account">Studio Account</option>
                          </select>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-600">
                          <div className="inline-flex items-center justify-end gap-1">
                            <span>-₹</span>
                            <input
                              type="number"
                              value={exp.amount}
                              onChange={(e) =>
                                onUpdateExpense({
                                  ...exp,
                                  amount: Math.max(0, Number(e.target.value) || 0),
                                })
                              }
                              aria-label={`Amount for ${exp.title}`}
                              className="w-20 px-2 py-1 rounded-lg bg-[#F8F9FA] border border-[#EAECEF] text-right font-mono font-bold text-xs text-rose-600"
                            />
                          </div>
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() =>
                                onUpdateExpense({ ...exp, reimbursed: !exp.reimbursed })
                              }
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                                exp.reimbursed
                                  ? 'bg-[#D1FAE5] text-[#059669]'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {exp.reimbursed ? '✓ Reimbursed' : 'Mark Reimbursed'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStartEditExpense(exp)}
                              aria-label={`Edit expense ${exp.title}`}
                              className="px-2 py-1 rounded-lg bg-[#F8F9FA] hover:bg-[#EFF6FF] text-[#475569] hover:text-[#2563EB] border border-[#EAECEF] text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Pencil className="w-3 h-3" /> Edit
                            </button>
                            <button
                              onClick={() => onDeleteExpense(exp.id)}
                              aria-label={`Delete expense ${exp.title}`}
                              className="p-1.5 rounded-lg text-[#94A3B8] hover:text-rose-600 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: PART 9 — 5-CATEGORY ANALYTICS & INTELLIGENCE CENTRE */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Analytics Controls Bar */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#EAECEF] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-[#0B0F19]">Reporting Period:</span>
              <div className="flex items-center bg-[#F8F9FA] p-1 rounded-xl border border-[#EAECEF]">
                {(['All Time', 'This Month', 'This Quarter', 'FY 2026-27'] as const).map((rng) => (
                  <button
                    key={rng}
                    onClick={() => setAnalyticsDateRange(rng)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                      analyticsDateRange === rng
                        ? 'bg-[#0B0F19] text-white'
                        : 'text-[#64748B] hover:text-[#0B0F19]'
                    }`}
                  >
                    {rng}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportFinanceCSV}
                className="px-3.5 py-2 rounded-xl bg-[#F8F9FA] hover:bg-[#EFF6FF] text-[#0B0F19] hover:text-[#2563EB] border border-[#EAECEF] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Export Financial CSV
              </button>
              <button
                onClick={() => window.print()}
                className="px-3.5 py-2 rounded-xl bg-[#0B0F19] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Print Executive PDF
              </button>
            </div>
          </div>

          {/* CATEGORY 1 & 2: BUSINESS ANALYTICS + SALES & LEAD SOURCE ANALYTICS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Business Analytics */}
            <div className="bg-white rounded-3xl p-6 border border-[#EAECEF] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#2563EB]">
                    01 · BUSINESS &amp; INDUSTRY ANALYTICS
                  </div>
                  <h3 className="text-lg font-extrabold text-[#0B0F19]">
                    Revenue, Margin &amp; Niche Performance
                  </h3>
                </div>
                <BarChart3 className="w-5 h-5 text-[#2563EB]" />
              </div>

              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="p-3 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF]">
                  <div className="text-[10px] font-bold uppercase text-[#64748B]">Contracted</div>
                  <div className="text-base font-extrabold font-mono text-[#0B0F19] mt-0.5">
                    {formatINR(finances.totalContractedVolume)}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0]">
                  <div className="text-[10px] font-bold uppercase text-[#059669]">Net Profit</div>
                  <div className="text-base font-extrabold font-mono text-[#059669] mt-0.5">
                    {formatINR(finances.netProfit)}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE]">
                  <div className="text-[10px] font-bold uppercase text-[#2563EB]">Profit Margin</div>
                  <div className="text-base font-extrabold font-mono text-[#2563EB] mt-0.5">
                    {finances.profitMarginPercent}%
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                {nicheBreakdown.map((item) => {
                  const pct =
                    finances.totalContractedVolume > 0
                      ? Math.round((item.contracted / finances.totalContractedVolume) * 100)
                      : 0;
                  return (
                    <div
                      key={item.nicheName}
                      className="p-3 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF] space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#0B0F19]">
                          {item.nicheName} ({item.count} deals)
                        </span>
                        <span className="font-mono font-bold text-[#059669]">
                          {formatINR(item.collected)} / {formatINR(item.contracted)} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#2563EB] rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Sales Analytics & Lead Conversion */}
            <div className="bg-white rounded-3xl p-6 border border-[#EAECEF] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#059669]">
                    02 · SALES &amp; LEAD CONVERSION ANALYTICS
                  </div>
                  <h3 className="text-lg font-extrabold text-[#0B0F19]">
                    Win Rate, Avg Deal Value &amp; Lead Sources
                  </h3>
                </div>
                <Target className="w-5 h-5 text-[#059669]" />
              </div>

              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="p-3 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF]">
                  <div className="text-[10px] font-bold uppercase text-[#64748B]">Win Rate</div>
                  <div className="text-base font-extrabold font-mono text-[#059669] mt-0.5">
                    {salesAnalytics.conversionRatePercent}%
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF]">
                  <div className="text-[10px] font-bold uppercase text-[#64748B]">Avg Deal Size</div>
                  <div className="text-base font-extrabold font-mono text-[#0B0F19] mt-0.5">
                    {formatINR(salesAnalytics.averageDealValue)}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF]">
                  <div className="text-[10px] font-bold uppercase text-[#64748B]">Won / Active</div>
                  <div className="text-base font-extrabold font-mono text-[#2563EB] mt-0.5">
                    {salesAnalytics.wonDeals} / {salesAnalytics.totalLeads}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-extrabold text-[#0B0F19]">
                  Performance by Acquisition Channel (Lead Source)
                </div>
                {Object.entries(salesAnalytics.bySource).map(([sourceName, src]) => (
                  <div
                    key={sourceName}
                    className="p-3 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF] flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-[#0B0F19]">{sourceName}</span>
                      <span className="text-[#64748B] ml-2">
                        ({src.count} leads · {src.won} won)
                      </span>
                    </div>
                    <span className="font-mono font-bold text-[#059669]">
                      {formatINR(src.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CATEGORY 3: CLIENT PROFITABILITY ANALYTICS */}
          <div className="bg-white rounded-3xl p-6 border border-[#EAECEF] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#2563EB]">
                  03 · CLIENT PROFITABILITY ANALYTICS
                </div>
                <h3 className="text-lg font-extrabold text-[#0B0F19]">
                  Per-Client Revenue vs Direct Costs (Domains &amp; Ad Spend)
                </h3>
              </div>
              <Award className="w-5 h-5 text-[#2563EB]" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8F9FA] border-b border-[#EAECEF] text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                    <th className="py-3 px-4">Client Account</th>
                    <th className="py-3 px-4">Package &amp; Build Progress</th>
                    <th className="py-3 px-4 text-right">Contract Value</th>
                    <th className="py-3 px-4 text-right">Revenue Collected</th>
                    <th className="py-3 px-4 text-right">Direct Studio Costs</th>
                    <th className="py-3 px-4 text-right">Projected Net Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAECEF] text-xs">
                  {clientProfitabilityList.map((row) => (
                    <tr key={row.client.id} className="hover:bg-[#F8F9FA]/60">
                      <td className="py-3 px-4 font-bold text-[#0B0F19]">
                        {row.client.businessName}
                      </td>
                      <td className="py-3 px-4 text-[#475569]">
                        {row.client.packageTier} ({row.progressPct}% built)
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[#0B0F19]">
                        {formatINR(row.contractValue)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[#059669]">
                        {formatINR(row.revenueCollected)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                        {formatINR(row.directCosts)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-extrabold text-[#2563EB]">
                        {formatINR(row.projectedNetProfit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* CATEGORY 4 & 5: MARKETING ANALYTICS + OPERATIONAL & DELIVERY ANALYTICS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 4. Marketing Analytics */}
            <div className="bg-white rounded-3xl p-6 border border-[#EAECEF] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">
                    04 · MARKETING &amp; META ADS ANALYTICS
                  </div>
                  <h3 className="text-lg font-extrabold text-[#0B0F19]">
                    Campaign Efficiency, CTR &amp; ROAS Benchmarks
                  </h3>
                </div>
                <Megaphone className="w-5 h-5 text-indigo-600" />
              </div>

              <div className="space-y-2.5">
                {metaCampaigns.map((camp) => {
                  const ctr = calculateCTR(camp.clicks || 0, camp.impressions || 0);
                  const cpc = calculateCPC(camp.amountSpent, camp.clicks || 0);
                  const cpl = calculateCPL(camp.amountSpent, camp.leadsGenerated);
                  return (
                    <div
                      key={camp.id}
                      className="p-3.5 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF] flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-[#0B0F19]">
                          {camp.clientName} — {camp.campaignName}
                        </div>
                        <div className="text-[11px] text-[#64748B] font-mono">
                          Impr: {(camp.impressions || 0).toLocaleString('en-IN')} · Clicks:{' '}
                          {(camp.clicks || 0).toLocaleString('en-IN')} · CTR: {ctr}%
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <div className="font-extrabold text-[#0B0F19]">
                          {formatINR(camp.amountSpent)}
                        </div>
                        <div className="text-[11px] text-[#059669] font-bold">
                          CPC ₹{cpc} · {cpl > 0 ? `CPL ${formatINR(cpl)}` : `${camp.roas || 4.2}x ROAS`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 5. Operational & Delivery Analytics */}
            <div className="bg-white rounded-3xl p-6 border border-[#EAECEF] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#059669]">
                    05 · OPERATIONAL &amp; CO-FOUNDER VELOCITY
                  </div>
                  <h3 className="text-lg font-extrabold text-[#0B0F19]">
                    Founder Workload &amp; Delivery Milestone Completion
                  </h3>
                </div>
                <Activity className="w-5 h-5 text-[#059669]" />
              </div>

              <div className="space-y-3">
                {(['Krishna', 'Vansh', 'Both'] as const).map((owner) => {
                  const ownerDeals = clients.filter(
                    (c) => c.assignedTo === owner && c.stage !== 'Rejected / Dropped'
                  );
                  const vol = ownerDeals.reduce((s, c) => s + c.finalAgreedPrice, 0);
                  const paid = ownerDeals.reduce((s, c) => s + c.advancePaid, 0);
                  return (
                    <div
                      key={owner}
                      className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF] flex items-center justify-between"
                    >
                      <div>
                        <div className="text-sm font-extrabold text-[#0B0F19]">
                          {owner === 'Both' ? 'Joint Studio Deals (Both)' : `${owner} Khakole`}
                        </div>
                        <div className="text-xs text-[#64748B]">
                          {ownerDeals.length} active/pitched client accounts
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <div className="text-sm font-extrabold text-[#0B0F19]">
                          {formatINR(vol)}
                        </div>
                        <div className="text-xs text-[#059669] font-bold">
                          Collected: {formatINR(paid)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CLIENT INVOICE PRINTABLE PREVIEW MODAL */}
      {previewInvoice && (
        <div className="fixed inset-0 z-50 bg-[#0B0F19]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 border border-[#EAECEF] shadow-2xl space-y-6">
            <div className="flex items-start justify-between border-b border-[#EAECEF] pb-4">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#2563EB] font-bold">
                  AETHEL STUDIOS · OFFICIAL {previewInvoice.type.toUpperCase()}
                </div>
                <h2 className="text-2xl font-extrabold font-mono text-[#0B0F19] mt-0.5">
                  {previewInvoice.invoiceNumber}
                </h2>
                <p className="text-xs text-[#64748B]">
                  Issued: {previewInvoice.issueDate} · Due: {previewInvoice.dueDate}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print / Save PDF
                </button>
                <button
                  onClick={() => setPreviewInvoice(null)}
                  className="p-2 rounded-xl bg-[#F8F9FA] text-[#64748B] hover:text-[#0B0F19] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF]">
                <div className="text-[10px] font-bold uppercase text-[#64748B]">From</div>
                <div className="font-extrabold text-[#0B0F19] mt-0.5">Aethel Studios</div>
                <div className="text-[#475569]">Vansh Khakole &amp; Krishna Khakole</div>
                <div className="font-mono text-[11px] text-[#64748B]">aethelstudios.in@gmail.com</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF]">
                <div className="text-[10px] font-bold uppercase text-[#64748B]">Billed To</div>
                <div className="font-extrabold text-[#0B0F19] mt-0.5">
                  {previewInvoice.clientName}
                </div>
                <div className="text-[#475569]">Status: {previewInvoice.status}</div>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-[#EAECEF] space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-[#64748B] border-b border-[#EAECEF] pb-2">
                <span>DESCRIPTION</span>
                <span>AMOUNT (INR)</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-[#0B0F19]">
                  {previewInvoice.projectTitle} — {previewInvoice.notes}
                </span>
                <span className="font-mono font-extrabold text-[#0B0F19]">
                  {formatINR(previewInvoice.amount)}
                </span>
              </div>
              <div className="pt-3 border-t border-[#EAECEF] flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-[#64748B]">Total Payable</span>
                <span className="text-xl font-extrabold font-mono text-[#059669]">
                  {formatINR(previewInvoice.amount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
