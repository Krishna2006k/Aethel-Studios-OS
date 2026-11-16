import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  CheckCircle2,
  Scale,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import type {
  ExpenseItem,
  ExpenseCategory,
  ClientPayment,
  ClientLead,
  PaymentAccount,
  PaymentMode,
} from '../types';
import { formatINR, calculateStudioFinances } from '../utils/calculations';

interface StudioFinanceViewProps {
  expenses: ExpenseItem[];
  payments: ClientPayment[];
  clients: ClientLead[];
  onAddExpenseModal: () => void;
  onUpdateExpense: (e: ExpenseItem) => void;
  onDeleteExpense: (id: string) => void;
  onAddPayment: (p: ClientPayment) => void;
  onDeletePayment: (id: string) => void;
}

const EXPENSE_CATEGORIES: ('ALL' | ExpenseCategory)[] = [
  'ALL',
  'Studio Expense',
  'Tech Expense',
  'Food & Chai Expense',
  'Client-Billable Expense',
];

export const StudioFinanceView: React.FC<StudioFinanceViewProps> = ({
  expenses,
  payments,
  clients,
  onAddExpenseModal,
  onUpdateExpense,
  onDeleteExpense,
  onAddPayment,
  onDeletePayment,
}) => {
  const [subTab, setSubTab] = useState<'expenses' | 'payments'>('expenses');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | ExpenseCategory>('ALL');

  // Inline form for logging a Client Payment inflow
  const [payClientName, setPayClientName] = useState(
    clients[0]?.businessName || 'The Imperial Pavilion & Lawns'
  );
  const [payAmount, setPayAmount] = useState('7999');
  const [payMode, setPayMode] = useState<PaymentMode>('UPI');
  const [payReceivedBy, setPayReceivedBy] = useState<PaymentAccount>('Studio Account');
  const [payNotes, setPayNotes] = useState('');

  const finance = calculateStudioFinances(expenses, payments, clients);

  const filteredExpenses = expenses.filter(
    (e) => categoryFilter === 'ALL' || e.category === categoryFilter
  );

  const handleLogPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = Number(payAmount);
    if (!payClientName.trim() || !numeric || numeric <= 0) return;

    onAddPayment({
      id: `pay-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      clientName: payClientName.trim(),
      amountReceived: numeric,
      paymentMode: payMode,
      receivedBy: payReceivedBy,
      notes: payNotes.trim() || 'Client payment logged via Studio Finance.',
    });
    setPayAmount('');
    setPayNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Top Financial Summary Bar */}
      <div className="bg-white border border-[#EAECEF] rounded-3xl p-6 sm:p-8 shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)] space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold tracking-wider uppercase text-[#2563EB] block">
              07 / STUDIO FINANCE, REVENUE &amp; CO-FOUNDER SPLIT LEDGER
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B0F19] mt-1">
              Studio Treasury &amp; Co-Founder Settlement Engine
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Transparent INR ledger tracking client inflows, out-of-pocket expenses, and Krishna vs Vansh reimbursements.
            </p>
          </div>

          <button
            type="button"
            onClick={onAddExpenseModal}
            className="px-4 py-2.5 rounded-full bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors self-start lg:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Log Studio / Tech / Chai Expense</span>
          </button>
        </div>

        {/* 3 Primary Financial Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF]">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Total Revenue Collected (₹)</span>
              <ArrowDownLeft className="w-4 h-4 text-[#059669]" />
            </div>
            <div className="font-mono text-3xl font-bold text-[#059669] mt-2">
              {formatINR(finance.totalRevenueCollected)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Across {payments.length} verified client payments (+{formatINR(finance.pendingReceivables)} receivables pending)
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF]">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Total Studio Expenses (₹)</span>
              <ArrowUpRight className="w-4 h-4 text-rose-600" />
            </div>
            <div className="font-mono text-3xl font-bold text-[#0B0F19] mt-2">
              {formatINR(finance.totalStudioExpenses)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Across {expenses.length} studio, tech, chai &amp; client-billable entries
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#0B0F19] text-white">
            <div className="flex items-center justify-between text-xs text-[#94A3B8]">
              <span>Net Studio Profit (₹)</span>
              <span className="font-mono text-emerald-400">Net Margin</span>
            </div>
            <div className="font-mono text-3xl font-bold text-white mt-2">
              {formatINR(finance.netProfit)}
            </div>
            <p className="text-xs text-[#94A3B8] mt-1">
              50/50 Co-Founder Profit Share:{' '}
              <strong className="font-mono text-emerald-400">
                {formatINR(Math.round(finance.netProfit / 2))} each
              </strong>
            </p>
          </div>
        </div>

        {/* Co-Founder Out-of-Pocket Split Calculator */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#2563EB]" />
              <h2 className="text-sm font-bold text-[#0B0F19]">
                Co-Founder Out-of-Pocket Split &amp; Reimbursement Calculator
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-500">
              Unreimbursed Personal Spend Settlement
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-white p-4 rounded-2xl border border-[#EAECEF]">
              <span className="text-slate-500 block">
                Krishna Paid Out-of-Pocket (Personal)
              </span>
              <span className="font-mono text-xl font-bold text-[#0B0F19] mt-1 block">
                {formatINR(finance.krishnaOutOfPocket)}
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Client Payments Received Directly: <strong className="font-mono">{formatINR(finance.krishnaCollectedDirect)}</strong>
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#EAECEF]">
              <span className="text-slate-500 block">
                Vansh Paid Out-of-Pocket (Personal)
              </span>
              <span className="font-mono text-xl font-bold text-[#0B0F19] mt-1 block">
                {formatINR(finance.vanshOutOfPocket)}
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Client Payments Received Directly: <strong className="font-mono">{formatINR(finance.vanshCollectedDirect)}</strong>
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#EAECEF]">
              <span className="text-slate-500 block">
                Paid from Shared Studio Account
              </span>
              <span className="font-mono text-xl font-bold text-[#2563EB] mt-1 block">
                {formatINR(finance.studioAccountExpenses)}
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Inflows to Studio Account: <strong className="font-mono">{formatINR(finance.studioAccountCollected)}</strong>
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#D1FAE5]/60 border border-[#059669]/25 text-xs font-medium text-[#0D281D]">
            <strong>Settlement Verdict:</strong> {finance.settlementHeadline}
          </div>
        </div>
      </div>

      {/* Sub-Tabs: Expenses Tracker vs Client Payments / Inflow Log */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="inline-flex items-center p-1 bg-white border border-[#EAECEF] rounded-full">
          <button
            type="button"
            onClick={() => setSubTab('expenses')}
            className={`px-5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              subTab === 'expenses'
                ? 'bg-[#0B0F19] text-white'
                : 'text-slate-600 hover:text-[#0B0F19]'
            }`}
          >
            1. Expenses Tracker ({expenses.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('payments')}
            className={`px-5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              subTab === 'payments'
                ? 'bg-[#0B0F19] text-white'
                : 'text-slate-600 hover:text-[#0B0F19]'
            }`}
          >
            2. Client Payments / Inflow Log ({payments.length})
          </button>
        </div>

        {subTab === 'expenses' && (
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {EXPENSE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-[#2563EB] text-white'
                    : 'bg-white border border-[#EAECEF] text-slate-600 hover:text-[#0B0F19]'
                }`}
              >
                {cat === 'ALL' ? 'All Categories' : cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {subTab === 'expenses' ? (
        <div className="bg-white border border-[#EAECEF] rounded-3xl overflow-hidden shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#EAECEF] bg-[#F8F9FA] text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Expense Item &amp; Notes</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Paid By</th>
                  <th className="py-3.5 px-4 text-right">Amount (₹)</th>
                  <th className="py-3.5 px-4">Reimbursed</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAECEF] text-xs">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                      {exp.date}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-[#0B0F19] block">
                        {exp.title}
                      </span>
                      <span className="text-slate-500">
                        {exp.notes}
                        {exp.linkedClient ? ` · Client: ${exp.linkedClient}` : ''}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {exp.category}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#0B0F19]">
                      {exp.paidBy}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-[#0B0F19]">
                      {formatINR(exp.amount)}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateExpense({
                            ...exp,
                            reimbursed: !exp.reimbursed,
                          })
                        }
                        className={`inline-flex items-center gap-1 text-xs font-semibold cursor-pointer ${
                          exp.reimbursed ? 'text-[#059669]' : 'text-amber-700'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{exp.reimbursed ? 'Settled' : 'Pending Split'}</span>
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onDeleteExpense(exp.id)}
                        aria-label={`Delete expense ${exp.title}`}
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Quick Inline Client Payment Logger */}
          <form
            onSubmit={handleLogPaymentSubmit}
            className="bg-white border border-[#EAECEF] rounded-3xl p-5 shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end"
          >
            <div className="lg:col-span-2">
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                Client Name (Syncs with Pipeline)
              </label>
              <input
                type="text"
                list="studio-finance-client-list"
                value={payClientName}
                onChange={(e) => setPayClientName(e.target.value)}
                placeholder="Select or type client name"
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] text-xs font-semibold text-[#0B0F19]"
              />
              <datalist id="studio-finance-client-list">
                {clients.map((c) => (
                  <option key={c.id} value={c.businessName} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                Amount Received (₹)
              </label>
              <input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] font-mono text-xs font-bold text-[#059669]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                Payment Mode
              </label>
              <select
                value={payMode}
                onChange={(e) => setPayMode(e.target.value as PaymentMode)}
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] text-xs font-semibold text-[#0B0F19]"
              >
                <option value="UPI">UPI</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                Received By
              </label>
              <select
                value={payReceivedBy}
                onChange={(e) => setPayReceivedBy(e.target.value as PaymentAccount)}
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] text-xs font-semibold text-[#0B0F19]"
              >
                <option value="Studio Account">Studio Account</option>
                <option value="Krishna">Krishna</option>
                <option value="Vansh">Vansh</option>
              </select>
            </div>

            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#0D281D] hover:bg-[#059669] text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              + Record Inflow
            </button>
          </form>

          {/* Inflow Table */}
          <div className="bg-white border border-[#EAECEF] rounded-3xl overflow-hidden shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#EAECEF] bg-[#F8F9FA] text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Client &amp; Milestone Note</th>
                    <th className="py-3.5 px-4">Payment Mode</th>
                    <th className="py-3.5 px-4">Received By</th>
                    <th className="py-3.5 px-4 text-right">Amount Received (₹)</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAECEF] text-xs">
                  {payments.map((pay) => (
                    <tr key={pay.id} className="hover:bg-slate-50/80">
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {pay.date}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-[#0B0F19] block">
                          {pay.clientName}
                        </span>
                        <span className="text-slate-500">{pay.notes}</span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {pay.paymentMode}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[#0B0F19]">
                        {pay.receivedBy}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-[#059669]">
                        +{formatINR(pay.amountReceived)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => onDeletePayment(pay.id)}
                          aria-label={`Delete payment from ${pay.clientName}`}
                          className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
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
    </div>
  );
};
