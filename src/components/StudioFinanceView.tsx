import React, { useState } from 'react';
import {
  Wallet,
  Plus,
  CheckCircle2,
  ArrowUpRight,
  Scale,
  Receipt,
  CreditCard,
  Trash2,
  BarChart3,
  Layers,
  Megaphone,
  TrendingUp,
} from 'lucide-react';
import {
  StudioExpense,
  ClientPayment,
  ClientLead,
  ExpensePaidBy,
  MetaAdCampaign,
} from '../types';
import {
  calculatePendingBalance,
  calculateStudioFinances,
  formatINR,
} from '../utils/calculations';

interface StudioFinanceViewProps {
  expenses: StudioExpense[];
  payments: ClientPayment[];
  clients: ClientLead[];
  metaCampaigns?: MetaAdCampaign[];
  initialSubView?: 'ledger' | 'analytics';
  onUpdateExpense: (updated: StudioExpense) => void;
  onAddExpense: (newExp: StudioExpense) => void;
  onDeleteExpense: (expenseId: string) => void;
  onAddPayment: (newPay: ClientPayment) => void;
  onDeletePayment: (paymentId: string) => void;
  onOpenClient360?: (clientId: string) => void;
}

export const StudioFinanceView: React.FC<StudioFinanceViewProps> = ({
  expenses,
  payments,
  clients,
  metaCampaigns = [],
  initialSubView = 'ledger',
  onUpdateExpense,
  onAddExpense,
  onDeleteExpense,
  onAddPayment,
  onDeletePayment,
  onOpenClient360,
}) => {
  const [activeTab, setActiveTab] = useState<'receivables' | 'payments' | 'expenses' | 'analytics'>(
    initialSubView === 'analytics' ? 'analytics' : 'payments'
  );

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

  // Single Canonical Financial Calculation (Part 5 & Part 13)
  const finances = calculateStudioFinances(expenses, payments, clients, metaCampaigns);

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

  // Accounts Receivable breakdown per client
  const receivableClients = clients.filter(
    (c) =>
      c.stage !== 'Rejected / Dropped' &&
      (c.finalAgreedPrice > 0 || c.advancePaid > 0)
  );

  // Niche revenue analytics
  const nicheBreakdown = ['Banquet/Lawns', 'Clinic/Hospital', 'Retail/Electronics', 'Cafe/Restaurant', 'Real Estate/Interior'].map(
    (nicheName) => {
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
    }
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white rounded-3xl p-5 sm:p-6 border border-[#EAECEF] shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)]">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-[#2563EB] mb-1">
            MANAGEMENT · UNIFIED FINANCIAL LEDGER & ANALYTICS
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B0F19]">
            {activeTab === 'analytics'
              ? 'Studio Analytics & Financial Reports'
              : 'Treasury, Ledger & Co-Founder Split'}
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
            Strictly separates <strong>Agency Revenue</strong>, <strong>Client Pass-Through Ad Spend</strong>, and <strong>Operational Expenses</strong>. 100% synchronized with CRM Pipeline.
          </p>
        </div>

        {/* Sub-view Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#F8F9FA] p-1 rounded-2xl border border-[#EAECEF]">
          {[
            { id: 'payments', label: `Client Inflows (${payments.length})` },
            { id: 'receivables', label: `Receivables (${formatINR(finances.pendingReceivables)})` },
            { id: 'expenses', label: `Expenses (${expenses.length})` },
            { id: 'analytics', label: 'Analytics & Reports' },
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

      {/* PART 5: 3-STREAM FINANCIAL SEPARATION (Agency Revenue vs Client Ad Spend vs Studio Expenses) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Stream 1: Agency Revenue & Receivables */}
        <div className="bg-[#0B0F19] text-white rounded-3xl p-5 border border-[#0B0F19] flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#34D399] font-bold">
              STREAM 01 · AGENCY REVENUE
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

        {/* Stream 2: Agency Operational Expenses & Net Profit */}
        <div className="bg-white rounded-3xl p-5 border border-[#EAECEF] flex flex-col justify-between space-y-4 shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#2563EB] font-bold">
              STREAM 02 · STUDIO NET PROFIT & OPS
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

        {/* Stream 3: Client Advertising Expenditure (Strictly Separated Pass-Through) */}
        <div className="bg-white rounded-3xl p-5 border border-[#EAECEF] flex flex-col justify-between space-y-4 shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-600 font-bold">
              STREAM 03 · CLIENT AD SPEND (PASS-THROUGH)
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

      {/* Co-Founder Out-of-Pocket Split & Reimbursement Calculator */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EAECEF] shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-4 border-b border-[#EAECEF]">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-[#2563EB]" />
            <h2 className="text-base font-extrabold text-[#0B0F19]">
              Co-Founder Out-of-Pocket Split & Reimbursement Calculator
            </h2>
          </div>
          <span className="text-xs font-mono text-[#64748B]">
            Unreimbursed Personal Spend Settlement
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF]">
            <div className="text-xs font-bold text-[#64748B] mb-1">
              Vansh Personal Out-of-Pocket (Unreimbursed)
            </div>
            <div className="text-2xl font-extrabold font-mono text-[#0B0F19]">
              {formatINR(finances.vanshOutOfPocketUnreimbursed)}
            </div>
            <div className="text-[11px] text-[#64748B] mt-1">
              Client Payments Received Directly:{' '}
              <span className="font-mono font-semibold text-[#0B0F19]">
                {formatINR(finances.vanshCollectedDirectly)}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF]">
            <div className="text-xs font-bold text-[#64748B] mb-1">
              Krishna Personal Out-of-Pocket (Unreimbursed)
            </div>
            <div className="text-2xl font-extrabold font-mono text-[#0B0F19]">
              {formatINR(finances.krishnaOutOfPocketUnreimbursed)}
            </div>
            <div className="text-[11px] text-[#64748B] mt-1">
              Client Payments Received Directly:{' '}
              <span className="font-mono font-semibold text-[#0B0F19]">
                {formatINR(finances.krishnaCollectedDirectly)}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#EFF6FF]/60 border border-[#BFDBFE] flex flex-col justify-center">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB] mb-1">
              Settlement Verdict
            </div>
            <p className="text-xs text-[#0B0F19] font-medium leading-relaxed">
              {finances.settlementSummary}
            </p>
          </div>
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
                    <th className="py-3.5 px-4">Client & Milestone Note</th>
                    <th className="py-3.5 px-4">Payment Mode</th>
                    <th className="py-3.5 px-4">Received By</th>
                    <th className="py-3.5 px-4 text-right">Amount Received (₹)</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAECEF] text-xs">
                  {payments.map((pay) => (
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
                        <button
                          onClick={() => onDeletePayment(pay.id)}
                          aria-label={`Delete payment from ${pay.clientName}`}
                          className="p-1.5 rounded-lg text-[#94A3B8] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
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
                Client Accounts Receivable & Collection Schedule
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

      {/* TAB 3: EXPENSES TRACKER */}
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
                <option value="Domain & Hosting">Domain & Hosting</option>
                <option value="Software / SaaS">Software / SaaS</option>
                <option value="Marketing & Samples">Marketing & Samples</option>
                <option value="Operations / Travel">Operations / Travel</option>
                <option value="Equipment">Equipment</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                Amount (₹) & Paid By
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
                    <th className="py-3.5 px-5 text-right">Status & Action</th>
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
                          <div className="inline-flex items-center gap-2">
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

      {/* TAB 4: ANALYTICS & REPORTS */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl p-6 border border-[#EAECEF] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#2563EB]">
                  INDUSTRY PERFORMANCE
                </div>
                <h3 className="text-lg font-extrabold text-[#0B0F19]">
                  Revenue by Client Niche
                </h3>
              </div>
              <BarChart3 className="w-5 h-5 text-[#2563EB]" />
            </div>

            <div className="space-y-3">
              {nicheBreakdown.map((item) => {
                const pct =
                  finances.totalContractedVolume > 0
                    ? Math.round((item.contracted / finances.totalContractedVolume) * 100)
                    : 0;
                return (
                  <div
                    key={item.nicheName}
                    className="p-3.5 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF] space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#0B0F19]">
                        {item.nicheName} ({item.count} deals)
                      </span>
                      <span className="font-mono font-bold text-[#059669]">
                        {formatINR(item.collected)} / {formatINR(item.contracted)}
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

          <div className="bg-white rounded-3xl p-6 border border-[#EAECEF] space-y-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#2563EB]">
                CO-FOUNDER PERFORMANCE
              </div>
              <h3 className="text-lg font-extrabold text-[#0B0F19]">
                Deal Ownership & Cashflow Split
              </h3>
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
      )}
    </div>
  );
};
