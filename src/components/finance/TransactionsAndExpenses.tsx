import React, { useState, useMemo } from 'react';
import {
  AethelDatabaseState,
  ClientLead,
  StudioExpense,
  ClientPayment,
  ClientInvoice,
  FinanceTransaction,
  FinancePaymentMethod,
  ExpenseCategory,
  ExpensePaidBy
} from '../../types';
import { formatINR } from '../../utils/calculations';
import { generateNextDocumentNumber } from '../../utils/financeEngine';
import {
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Plus,
  Search,
  Download,
  Edit3,
  Trash2,
  Eye,
  X,
  AlertTriangle,
  Receipt,
  ArrowUpDown,
  FileText
} from 'lucide-react';

interface TransactionsAndExpensesProps {
  mode: 'transactions' | 'expenses';
  dbState: AethelDatabaseState;
  transactions: FinanceTransaction[];
  expenses: StudioExpense[];
  payments: ClientPayment[];
  invoices: ClientInvoice[];
  clients: ClientLead[];
  onAddPayment: (payment: ClientPayment) => void;
  onUpdatePayment?: (payment: ClientPayment) => void;
  onDeletePayment: (id: string) => void;
  onAddExpense: (expense: StudioExpense) => void;
  onUpdateExpense?: (expense: StudioExpense) => void;
  onDeleteExpense: (id: string) => void;
  onUpdateTransactions: (transactions: FinanceTransaction[]) => void;
  onGeneratePaymentReceipt?: (payment: ClientPayment, invoice?: ClientInvoice) => void;
  onSelectClient?: (clientId: string) => void;
}

const PAYMENT_METHODS: FinancePaymentMethod[] = ['UPI', 'Cash', 'Bank Transfer', 'Other'];

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Hosting',
  'Domains',
  'Software & Subscriptions',
  'Advertising',
  'Client Acquisition',
  'Equipment',
  'Travel',
  'Freelance',
  'Miscellaneous'
];

export const TransactionsAndExpenses: React.FC<TransactionsAndExpensesProps> = ({
  mode,
  dbState,
  transactions,
  expenses,
  payments,
  invoices,
  clients,
  onAddPayment,
  onUpdatePayment,
  onDeletePayment,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  onUpdateTransactions,
  onGeneratePaymentReceipt,
  onSelectClient
}) => {
  // Search, Filters & Sort
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'Income' | 'Expense' | 'Refund'>('ALL');
  const [methodFilter, setMethodFilter] = useState<'ALL' | FinancePaymentMethod>('ALL');
  const [clientFilter, setClientFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');

  // Add/Edit Transaction Modal
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<FinanceTransaction | null>(null);
  const [txType, setTxType] = useState<'Income' | 'Expense' | 'Refund'>('Income');
  const [txDate, setTxDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [txAmount, setTxAmount] = useState('');
  const [txMethod, setTxMethod] = useState<FinancePaymentMethod>('UPI');
  const [txClientId, setTxClientId] = useState('');
  const [txInvoiceId, setTxInvoiceId] = useState('');
  const [txReference, setTxReference] = useState('');
  const [txDescription, setTxDescription] = useState('');
  const [txNotes, setTxNotes] = useState('');
  const [txCategory, setTxCategory] = useState<ExpenseCategory>('Software & Subscriptions');
  const [txPaidBy, setTxPaidBy] = useState<ExpensePaidBy>('Studio Account');
  const [txError, setTxError] = useState<string | null>(null);
  const [confirmOverpayment, setConfirmOverpayment] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add/Edit Expense Modal
  const [isExpModalOpen, setIsExpModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<StudioExpense | null>(null);
  const [expTitle, setExpTitle] = useState('');
  const [expDescription, setExpDescription] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expDate, setExpDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('Software & Subscriptions');
  const [expMethod, setExpMethod] = useState<FinancePaymentMethod>('UPI');
  const [expVendor, setExpVendor] = useState('');
  const [expRef, setExpRef] = useState('');
  const [expNotes, setExpNotes] = useState('');
  const [expClientId, setExpClientId] = useState('');
  const [expPaidBy, setExpPaidBy] = useState<ExpensePaidBy>('Studio Account');

  // View Details & Delete Confirmation
  const [viewingTx, setViewingTx] = useState<FinanceTransaction | null>(null);
  const [viewingExp, setViewingExp] = useState<StudioExpense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: 'tx' | 'expense'; id: string; label: string } | null>(null);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return transactions
      .filter((tx) => {
        if (typeFilter !== 'ALL' && tx.type !== typeFilter) return false;
        if (methodFilter !== 'ALL' && tx.paymentMethod !== methodFilter) return false;
        if (clientFilter !== 'ALL' && tx.clientId !== clientFilter) return false;
        if (!q) return true;
        return (
          tx.description.toLowerCase().includes(q) ||
          (tx.clientName || '').toLowerCase().includes(q) ||
          (tx.invoiceNumber || '').toLowerCase().includes(q) ||
          (tx.referenceNumber || '').toLowerCase().includes(q) ||
          (tx.projectTitle || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') return b.transactionDate.localeCompare(a.transactionDate);
        if (sortBy === 'date-asc') return a.transactionDate.localeCompare(b.transactionDate);
        if (sortBy === 'amount-desc') return b.amount - a.amount;
        return a.amount - b.amount;
      });
  }, [transactions, searchQuery, typeFilter, methodFilter, clientFilter, sortBy]);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return expenses
      .filter((exp) => {
        if (categoryFilter !== 'ALL' && exp.category !== categoryFilter) return false;
        if (methodFilter !== 'ALL' && (exp.paymentMethod || 'UPI') !== methodFilter) return false;
        if (!q) return true;
        return (
          exp.title.toLowerCase().includes(q) ||
          (exp.description || '').toLowerCase().includes(q) ||
          (exp.vendor || '').toLowerCase().includes(q) ||
          (exp.expenseNumber || '').toLowerCase().includes(q) ||
          (exp.referenceNumber || '').toLowerCase().includes(q) ||
          exp.category.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') return b.date.localeCompare(a.date);
        if (sortBy === 'date-asc') return a.date.localeCompare(b.date);
        if (sortBy === 'amount-desc') return b.amount - a.amount;
        return a.amount - b.amount;
      });
  }, [expenses, searchQuery, categoryFilter, methodFilter, sortBy]);

  // Export CSV
  const handleExportTransactionsCSV = () => {
    const headers = ['ID', 'Date', 'Type', 'Amount (INR)', 'Payment Method', 'Client', 'Invoice', 'Reference ID', 'Project/Category', 'Description', 'Notes'];
    const rows = filteredTransactions.map((tx) => [
      tx.id,
      tx.transactionDate,
      tx.type,
      tx.amount,
      tx.paymentMethod,
      tx.clientName || '',
      tx.invoiceNumber || '',
      tx.referenceNumber || '',
      tx.projectTitle || '',
      `"${(tx.description || '').replace(/"/g, '""')}"`,
      `"${(tx.notes || '').replace(/"/g, '""')}"`
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `aethel-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportExpensesCSV = () => {
    const headers = ['Expense ID', 'Date', 'Title', 'Category', 'Amount (INR)', 'Payment Method', 'Vendor', 'Reference Number', 'Paid By', 'Notes'];
    const rows = filteredExpenses.map((e) => [
      e.expenseNumber || e.id,
      e.date,
      `"${(e.title || '').replace(/"/g, '""')}"`,
      e.category,
      e.amount,
      e.paymentMethod || 'UPI',
      `"${(e.vendor || '').replace(/"/g, '""')}"`,
      e.referenceNumber || '',
      e.paidBy,
      `"${(e.notes || '').replace(/"/g, '""')}"`
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `aethel-expenses-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const openAddTransactionModal = () => {
    setEditingTx(null);
    setTxType('Income');
    setTxDate(new Date().toISOString().split('T')[0]);
    setTxAmount('');
    setTxMethod('UPI');
    setTxClientId(clients[0]?.id || '');
    setTxInvoiceId('');
    setTxReference('');
    setTxDescription('');
    setTxNotes('');
    setTxError(null);
    setConfirmOverpayment(false);
    setIsTxModalOpen(true);
  };

  const openEditTransactionModal = (tx: FinanceTransaction) => {
    setEditingTx(tx);
    setTxType(tx.type);
    setTxDate(tx.transactionDate);
    setTxAmount(String(tx.amount));
    setTxMethod(tx.paymentMethod);
    setTxClientId(tx.clientId || '');
    setTxInvoiceId(tx.invoiceId || '');
    setTxReference(tx.referenceNumber || '');
    setTxDescription(tx.description);
    setTxNotes(tx.notes || '');
    setTxCategory((tx.projectTitle as ExpenseCategory) || 'Software & Subscriptions');
    setTxError(null);
    setConfirmOverpayment(false);
    setIsTxModalOpen(true);
  };

  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const numericAmount = Math.round(Number(txAmount) || 0);
    if (numericAmount <= 0) {
      setTxError('Amount must be greater than zero.');
      return;
    }

    const linkedInvoice = invoices.find((inv) => inv.id === txInvoiceId);
    const invBalance = linkedInvoice?.balanceDue ?? linkedInvoice?.amount ?? 0;
    if (txType === 'Income' && linkedInvoice && !editingTx) {
      if (numericAmount > invBalance && !confirmOverpayment) {
        setTxError(
          `Payment of ${formatINR(numericAmount)} exceeds invoice remaining balance of ${formatINR(invBalance)}. Click "Confirm & Record Anyway" to proceed.`
        );
        setConfirmOverpayment(true);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const client = clients.find((c) => c.id === txClientId);
      if (editingTx) {
        if (editingTx.paymentId && onUpdatePayment) {
          const existingPay = payments.find((p) => p.id === editingTx.paymentId);
          if (existingPay) {
            onUpdatePayment({
              ...existingPay,
              clientId: txClientId || existingPay.clientId,
              clientName: client?.businessName || existingPay.clientName,
              invoiceId: txInvoiceId || existingPay.invoiceId,
              invoiceNumber: linkedInvoice?.invoiceNumber || existingPay.invoiceNumber,
              amountReceived: numericAmount,
              paymentDate: txDate,
              paymentMode: txMethod,
              upiReference: txReference.trim() || undefined,
              notes: txNotes.trim() || txDescription.trim() || existingPay.notes
            });
          }
        } else if (editingTx.expenseId && onUpdateExpense) {
          const existingExp = expenses.find((ex) => ex.id === editingTx.expenseId);
          if (existingExp) {
            onUpdateExpense({
              ...existingExp,
              title: txDescription.trim() || existingExp.title,
              amount: numericAmount,
              date: txDate,
              paymentMethod: txMethod,
              category: txCategory,
              referenceNumber: txReference.trim() || undefined,
              notes: txNotes.trim() || existingExp.notes
            });
          }
        } else {
          onUpdateTransactions(
            transactions.map((t) =>
              t.id === editingTx.id
                ? {
                    ...t,
                    transactionDate: txDate,
                    type: txType,
                    amount: numericAmount,
                    paymentMethod: txMethod,
                    clientId: txClientId || undefined,
                    clientName: client?.businessName,
                    invoiceId: txInvoiceId || undefined,
                    invoiceNumber: linkedInvoice?.invoiceNumber,
                    referenceNumber: txReference.trim() || undefined,
                    description: txDescription.trim() || `${txType} Transaction`,
                    notes: txNotes.trim() || undefined,
                    projectTitle: txCategory
                  }
                : t
            )
          );
        }
      } else {
        if (txType === 'Income') {
          const { formatted: receiptNo } = generateNextDocumentNumber('Receipt', dbState);
          onAddPayment({
            id: `pay-${Date.now()}`,
            clientId: txClientId || clients[0]?.id,
            clientName: client?.businessName || linkedInvoice?.clientName || 'General Client',
            projectTitle: linkedInvoice?.projectTitle || client?.packageTier || 'Digital Services',
            totalProjectValue: linkedInvoice?.amount || client?.finalAgreedPrice || numericAmount,
            invoiceId: linkedInvoice?.id,
            invoiceNumber: linkedInvoice?.invoiceNumber,
            receiptNumber: receiptNo,
            amountReceived: numericAmount,
            paymentDate: txDate,
            milestone:
              linkedInvoice && numericAmount < invBalance
                ? 'Partial Payment'
                : 'Invoice Settlement',
            paymentMode: txMethod,
            upiReference: txReference.trim() || undefined,
            receivedInAccount: txPaidBy,
            notes: txNotes.trim() || txDescription.trim() || undefined,
            createdAt: new Date().toISOString()
          });
        } else if (txType === 'Expense') {
          const { formatted: expNo } = generateNextDocumentNumber('Expense', dbState);
          onAddExpense({
            id: `exp-${Date.now()}`,
            expenseNumber: expNo,
            title: txDescription.trim() || `${txCategory} Expense`,
            description: txDescription.trim(),
            category: txCategory,
            amount: numericAmount,
            date: txDate,
            paidBy: txPaidBy,
            paymentMethod: txMethod,
            referenceNumber: txReference.trim() || undefined,
            clientId: txClientId || undefined,
            clientRelated: client?.businessName || 'Studio Operations',
            reimbursed: txPaidBy === 'Studio Account',
            notes: txNotes.trim() || '',
            createdAt: new Date().toISOString()
          });
        } else {
          // Refund transaction
          const newRefund: FinanceTransaction = {
            id: `tx-ref-${Date.now()}`,
            transactionDate: txDate,
            type: 'Refund',
            amount: numericAmount,
            paymentMethod: txMethod,
            clientId: txClientId || undefined,
            clientName: client?.businessName,
            invoiceId: linkedInvoice?.id,
            invoiceNumber: linkedInvoice?.invoiceNumber,
            referenceNumber: txReference.trim() || undefined,
            description: txDescription.trim() || 'Client Refund',
            notes: txNotes.trim() || undefined,
            account: txPaidBy,
            createdAt: new Date().toISOString()
          };
          onUpdateTransactions([newRefund, ...transactions]);
        }
      }
      setIsTxModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAddExpenseModal = () => {
    setEditingExpense(null);
    setExpTitle('');
    setExpDescription('');
    setExpAmount('');
    setExpDate(new Date().toISOString().split('T')[0]);
    setExpCategory('Software & Subscriptions');
    setExpMethod('UPI');
    setExpVendor('');
    setExpRef('');
    setExpNotes('');
    setExpClientId('');
    setExpPaidBy('Studio Account');
    setIsExpModalOpen(true);
  };

  const openEditExpenseModal = (exp: StudioExpense) => {
    setEditingExpense(exp);
    setExpTitle(exp.title);
    setExpDescription(exp.description || '');
    setExpAmount(String(exp.amount));
    setExpDate(exp.date);
    setExpCategory(exp.category);
    setExpMethod(exp.paymentMethod || 'UPI');
    setExpVendor(exp.vendor || '');
    setExpRef(exp.referenceNumber || '');
    setExpNotes(exp.notes || '');
    setExpClientId(exp.clientId || '');
    setExpPaidBy(exp.paidBy || 'Studio Account');
    setIsExpModalOpen(true);
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Math.round(Number(expAmount) || 0);
    if (!expTitle.trim() || numericAmount <= 0) return;

    const client = clients.find((c) => c.id === expClientId);

    if (editingExpense && onUpdateExpense) {
      onUpdateExpense({
        ...editingExpense,
        title: expTitle.trim(),
        description: expDescription.trim() || undefined,
        amount: numericAmount,
        date: expDate,
        category: expCategory,
        paymentMethod: expMethod,
        vendor: expVendor.trim() || undefined,
        referenceNumber: expRef.trim() || undefined,
        notes: expNotes.trim() || '',
        clientId: expClientId || undefined,
        clientRelated: client?.businessName || editingExpense.clientRelated || 'Studio Operations',
        paidBy: expPaidBy
      });
    } else {
      const { formatted: expNo } = generateNextDocumentNumber('Expense', dbState);
      onAddExpense({
        id: `exp-${Date.now()}`,
        expenseNumber: expNo,
        title: expTitle.trim(),
        description: expDescription.trim() || undefined,
        amount: numericAmount,
        date: expDate,
        category: expCategory,
        paymentMethod: expMethod,
        vendor: expVendor.trim() || undefined,
        referenceNumber: expRef.trim() || undefined,
        notes: expNotes.trim() || '',
        clientId: expClientId || undefined,
        clientRelated: client?.businessName || 'Studio Operations',
        reimbursed: expPaidBy === 'Studio Account',
        paidBy: expPaidBy,
        createdAt: new Date().toISOString()
      });
    }
    setIsExpModalOpen(false);
  };

  const confirmDeleteAction = () => {
    if (!deleteTarget) return;
    if (deleteTarget.kind === 'expense') {
      onDeleteExpense(deleteTarget.id);
    } else {
      const tx = transactions.find((t) => t.id === deleteTarget.id);
      if (tx?.paymentId) {
        onDeletePayment(tx.paymentId);
      } else if (tx?.expenseId) {
        onDeleteExpense(tx.expenseId);
      } else {
        onUpdateTransactions(transactions.filter((t) => t.id !== deleteTarget.id));
      }
    }
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#2563EB] font-bold">
              {mode === 'transactions' ? '05. UNIFIED TRANSACTION LEDGER' : '08. EXPENSE MANAGEMENT'}
            </span>
            <h3 className="text-xl font-bold tracking-tight text-[#0B0F19] mt-0.5">
              {mode === 'transactions'
                ? 'All Financial Movements (Income, Expenses & Refunds)'
                : 'Studio Operational & Client Direct Expenses'}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={mode === 'transactions' ? handleExportTransactionsCSV : handleExportExpensesCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8F9FA] text-[#0B0F19] text-xs font-bold transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#475569]" />
              Export CSV
            </button>
            <button
              onClick={mode === 'transactions' ? openAddTransactionModal : openAddExpenseModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B0F19] hover:bg-[#1E293B] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              {mode === 'transactions' ? 'Record Transaction' : 'Add Expense'}
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-[#F1F5F9]">
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                mode === 'transactions'
                  ? 'Search client, invoice, UPI ref, description...'
                  : 'Search expense title, vendor, category, AS-E-...'
              }
              className="w-full pl-9 pr-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs text-[#0B0F19] focus:outline-hidden focus:border-[#2563EB]"
            />
          </div>

          {mode === 'transactions' ? (
            <>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs font-semibold text-[#0B0F19]"
              >
                <option value="ALL">All Types (Income/Expense/Refund)</option>
                <option value="Income">Income Only</option>
                <option value="Expense">Expense Only</option>
                <option value="Refund">Refund Only</option>
              </select>

              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs font-semibold text-[#0B0F19]"
              >
                <option value="ALL">All Clients</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.businessName}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs font-semibold text-[#0B0F19]"
            >
              <option value="ALL">All Expense Categories</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-2">
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value as any)}
              className="flex-1 px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs font-semibold text-[#0B0F19]"
            >
              <option value="ALL">All Methods</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              aria-label="Sort records"
              className="px-2.5 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs font-semibold text-[#0B0F19]"
            >
              <option value="date-desc">Newest</option>
              <option value="date-asc">Oldest</option>
              <option value="amount-desc">Highest ₹</option>
              <option value="amount-asc">Lowest ₹</option>
            </select>
          </div>
        </div>
      </div>

      {/* Mode 1: Transactions Table */}
      {mode === 'transactions' && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden">
          {filteredTransactions.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#F8F9FA] border border-[#E2E8F0] flex items-center justify-center mx-auto mb-3">
                <ArrowUpDown className="w-5 h-5 text-[#64748B]" />
              </div>
              <h4 className="text-sm font-bold text-[#0B0F19]">No transactions match your filters</h4>
              <p className="text-xs text-[#64748B] max-w-md mx-auto mt-1">
                Every payment recorded against an invoice and every studio expense automatically appears here as a unified ledger entry.
              </p>
              <button
                onClick={openAddTransactionModal}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-bold hover:bg-[#1D4ED8] transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Record First Transaction
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8F9FA] font-mono text-[10px] uppercase tracking-wider text-[#64748B]">
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Description & Client</th>
                    <th className="py-3.5 px-4">Invoice / Ref</th>
                    <th className="py-3.5 px-4">Method</th>
                    <th className="py-3.5 px-4 text-right">Amount</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] text-xs">
                  {filteredTransactions.map((tx) => {
                    const isIncome = tx.type === 'Income';
                    const isRefund = tx.type === 'Refund';
                    const sourcePayment = tx.paymentId
                      ? payments.find((p) => p.id === tx.paymentId)
                      : undefined;
                    const linkedInv = tx.invoiceId
                      ? invoices.find((i) => i.id === tx.invoiceId)
                      : undefined;

                    return (
                      <tr key={tx.id} className="hover:bg-[#F8F9FA]/70 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-[11px] text-[#475569] whitespace-nowrap">
                          {tx.transactionDate}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase ${
                              isIncome
                                ? 'bg-[#DCFCE7] text-[#15803D]'
                                : isRefund
                                ? 'bg-[#FEF3C7] text-[#B45309]'
                                : 'bg-[#FEE2E2] text-[#B91C1C]'
                            }`}
                          >
                            {isIncome ? (
                              <ArrowDownLeft className="w-3 h-3" />
                            ) : isRefund ? (
                              <RotateCcw className="w-3 h-3" />
                            ) : (
                              <ArrowUpRight className="w-3 h-3" />
                            )}
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#0B0F19]">{tx.description}</div>
                          <div className="text-[11px] text-[#64748B] flex items-center gap-2 mt-0.5">
                            {tx.clientName && (
                              <button
                                onClick={() => tx.clientId && onSelectClient?.(tx.clientId)}
                                className="text-[#2563EB] hover:underline font-medium cursor-pointer"
                              >
                                {tx.clientName}
                              </button>
                            )}
                            {tx.projectTitle && <span>• {tx.projectTitle}</span>}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-[#475569]">
                          {tx.invoiceNumber && (
                            <span className="px-2 py-0.5 rounded bg-[#EFF6FF] text-[#1D4ED8] font-bold mr-1.5">
                              {tx.invoiceNumber}
                            </span>
                          )}
                          {tx.referenceNumber && (
                            <span className="text-[#64748B]">Ref: {tx.referenceNumber}</span>
                          )}
                          {!tx.invoiceNumber && !tx.referenceNumber && '—'}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-[#F1F5F9] text-[#0B0F19] font-mono text-[11px] font-semibold">
                            {tx.paymentMethod}
                          </span>
                        </td>
                        <td
                          className={`py-3.5 px-4 text-right font-mono text-sm font-bold whitespace-nowrap ${
                            isIncome ? 'text-[#15803D]' : 'text-[#B91C1C]'
                          }`}
                        >
                          {isIncome ? '+' : '-'}{formatINR(tx.amount)}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            {isIncome && sourcePayment && onGeneratePaymentReceipt && (
                              <button
                                onClick={() => onGeneratePaymentReceipt(sourcePayment, linkedInv)}
                                title="Generate Payment Receipt PDF"
                                className="p-1.5 rounded-lg text-[#2563EB] hover:bg-[#EFF6FF] transition-colors cursor-pointer"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => setViewingTx(tx)}
                              title="View Transaction Details"
                              className="p-1.5 rounded-lg text-[#475569] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openEditTransactionModal(tx)}
                              title="Edit Transaction"
                              className="p-1.5 rounded-lg text-[#475569] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                setDeleteTarget({
                                  kind: 'tx',
                                  id: tx.id,
                                  label: `${tx.type} of ${formatINR(tx.amount)} (${tx.description})`
                                })
                              }
                              title="Delete Transaction"
                              className="p-1.5 rounded-lg text-[#DC2626] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
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
          )}
        </div>
      )}

      {/* Mode 2: Expenses Table */}
      {mode === 'expenses' && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden">
          {filteredExpenses.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#F8F9FA] border border-[#E2E8F0] flex items-center justify-center mx-auto mb-3">
                <FileText className="w-5 h-5 text-[#64748B]" />
              </div>
              <h4 className="text-sm font-bold text-[#0B0F19]">No studio expenses recorded</h4>
              <p className="text-xs text-[#64748B] max-w-md mx-auto mt-1">
                Track hosting, domains, software subscriptions, advertising, and operational disbursements with full payment method attribution.
              </p>
              <button
                onClick={openAddExpenseModal}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B0F19] text-white text-xs font-bold hover:bg-[#1E293B] transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add First Expense
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8F9FA] font-mono text-[10px] uppercase tracking-wider text-[#64748B]">
                    <th className="py-3.5 px-4">Expense ID</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Title & Vendor</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Method & Ref</th>
                    <th className="py-3.5 px-4 text-right">Amount</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] text-xs">
                  {filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-[#F8F9FA]/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-[11px] font-bold text-[#0B0F19] whitespace-nowrap">
                        {exp.expenseNumber || exp.id.toUpperCase()}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#475569] whitespace-nowrap">
                        {exp.date}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#0B0F19]">{exp.title}</div>
                        <div className="text-[11px] text-[#64748B]">
                          {exp.vendor ? `Vendor: ${exp.vendor}` : exp.description || `Paid by ${exp.paidBy}`}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-0.5 rounded-md bg-[#F1F5F9] text-[#334155] font-mono text-[10px] font-semibold">
                          {exp.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#475569]">
                        <span className="font-bold text-[#0B0F19]">{exp.paymentMethod || 'UPI'}</span>
                        {exp.referenceNumber && (
                          <span className="block text-[10px] text-[#64748B]">Ref: {exp.referenceNumber}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-sm font-bold text-[#B91C1C] whitespace-nowrap">
                        {formatINR(exp.amount)}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => setViewingExp(exp)}
                            title="View Expense Details"
                            className="p-1.5 rounded-lg text-[#475569] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openEditExpenseModal(exp)}
                            title="Edit Expense"
                            className="p-1.5 rounded-lg text-[#475569] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteTarget({
                                kind: 'expense',
                                id: exp.id,
                                label: `${exp.title} (${formatINR(exp.amount)})`
                              })
                            }
                            title="Delete Expense"
                            className="p-1.5 rounded-lg text-[#DC2626] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Transaction Modal */}
      {isTxModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setIsTxModalOpen(false)}
        >
          <div
            className="bg-white border border-[#E2E8F0] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#2563EB] font-bold">
                  FINANCIAL MOVEMENT
                </span>
                <h3 className="text-lg font-bold text-[#0B0F19]">
                  {editingTx ? 'Edit Transaction' : 'Record New Transaction'}
                </h3>
              </div>
              <button
                onClick={() => setIsTxModalOpen(false)}
                className="p-1.5 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {txError && (
              <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B] flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>{txError}</div>
              </div>
            )}

            <form onSubmit={handleSaveTransaction} className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {(['Income', 'Expense', 'Refund'] as const).map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => {
                      setTxType(t);
                      setTxError(null);
                      setConfirmOverpayment(false);
                    }}
                    className={`py-2 px-3 rounded-xl font-mono text-xs font-bold border transition-all cursor-pointer ${
                      txType === t
                        ? t === 'Income'
                          ? 'bg-[#DCFCE7] border-[#16A34A] text-[#15803D]'
                          : t === 'Expense'
                          ? 'bg-[#FEE2E2] border-[#DC2626] text-[#B91C1C]'
                          : 'bg-[#FEF3C7] border-[#D97706] text-[#B45309]'
                        : 'bg-[#F8F9FA] border-[#E2E8F0] text-[#64748B]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                    Transaction Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs text-[#0B0F19]"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                    Amount (INR ₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={txAmount}
                    onChange={(e) => {
                      setTxAmount(e.target.value);
                      setTxError(null);
                      setConfirmOverpayment(false);
                    }}
                    placeholder="e.g. 4000"
                    className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs font-mono font-bold text-[#0B0F19]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={txMethod}
                    onChange={(e) => setTxMethod(e.target.value as FinancePaymentMethod)}
                    className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs font-semibold text-[#0B0F19]"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                    UPI / Bank Reference ID
                  </label>
                  <input
                    type="text"
                    value={txReference}
                    onChange={(e) => setTxReference(e.target.value)}
                    placeholder="UTR / UPI Ref No."
                    className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs font-mono text-[#0B0F19]"
                  />
                </div>
              </div>

              {txType !== 'Expense' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                      Associated Client
                    </label>
                    <select
                      value={txClientId}
                      onChange={(e) => {
                        setTxClientId(e.target.value);
                        setTxInvoiceId('');
                      }}
                      className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs text-[#0B0F19]"
                    >
                      <option value="">Select Client</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.businessName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                      Link to Invoice (Optional)
                    </label>
                    <select
                      value={txInvoiceId}
                      onChange={(e) => setTxInvoiceId(e.target.value)}
                      className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs text-[#0B0F19]"
                    >
                      <option value="">Unlinked / General</option>
                      {invoices
                        .filter((inv) => (!txClientId || inv.clientId === txClientId) && inv.status !== 'Cancelled')
                        .map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            {inv.invoiceNumber} — Due {formatINR(inv.balanceDue ?? inv.amount)}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                      Expense Category
                    </label>
                    <select
                      value={txCategory}
                      onChange={(e) => setTxCategory(e.target.value as ExpenseCategory)}
                      className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs text-[#0B0F19]"
                    >
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                      Direct Client Tag (Optional)
                    </label>
                    <select
                      value={txClientId}
                      onChange={(e) => setTxClientId(e.target.value)}
                      className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs text-[#0B0F19]"
                    >
                      <option value="">Studio Overhead</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.businessName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                  Description *
                </label>
                <input
                  type="text"
                  required
                  value={txDescription}
                  onChange={(e) => setTxDescription(e.target.value)}
                  placeholder="e.g. Advance milestone payment / Vercel Pro Subscription"
                  className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs text-[#0B0F19]"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                  Internal Notes
                </label>
                <textarea
                  rows={2}
                  value={txNotes}
                  onChange={(e) => setTxNotes(e.target.value)}
                  placeholder="Optional audit remarks..."
                  className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs text-[#0B0F19]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setIsTxModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#475569] hover:bg-[#F8F9FA] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#0B0F19] hover:bg-[#1E293B] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {confirmOverpayment
                    ? 'Confirm & Record Anyway'
                    : editingTx
                    ? 'Save Changes'
                    : 'Save Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Expense Modal */}
      {isExpModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setIsExpModalOpen(false)}
        >
          <div
            className="bg-white border border-[#E2E8F0] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#2563EB] font-bold">
                  STUDIO EXPENSE LEDGER
                </span>
                <h3 className="text-lg font-bold text-[#0B0F19]">
                  {editingExpense ? `Edit Expense (${editingExpense.expenseNumber || ''})` : 'Record New Studio Expense'}
                </h3>
              </div>
              <button
                onClick={() => setIsExpModalOpen(false)}
                className="p-1.5 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-4">
              <div>
                <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                  Expense Title *
                </label>
                <input
                  type="text"
                  required
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  placeholder="e.g. Cloud Hosting & Domain Renewal"
                  className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs text-[#0B0F19]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                    Amount (INR ₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    placeholder="e.g. 2000"
                    className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs font-mono font-bold text-[#0B0F19]"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs text-[#0B0F19]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                    Category *
                  </label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value as ExpenseCategory)}
                    className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs font-semibold text-[#0B0F19]"
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={expMethod}
                    onChange={(e) => setExpMethod(e.target.value as FinancePaymentMethod)}
                    className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs font-semibold text-[#0B0F19]"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                    Vendor / Payee
                  </label>
                  <input
                    type="text"
                    value={expVendor}
                    onChange={(e) => setExpVendor(e.target.value)}
                    placeholder="e.g. Hostinger, Vercel, Meta"
                    className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs text-[#0B0F19]"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                    Reference / Transaction ID
                  </label>
                  <input
                    type="text"
                    value={expRef}
                    onChange={(e) => setExpRef(e.target.value)}
                    placeholder="UPI / Invoice Ref"
                    className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs font-mono text-[#0B0F19]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                    Disbursed By
                  </label>
                  <select
                    value={expPaidBy}
                    onChange={(e) => setExpPaidBy(e.target.value as ExpensePaidBy)}
                    className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs text-[#0B0F19]"
                  >
                    <option value="Studio Account">Studio Treasury</option>
                    <option value="Krishna">Krishna Khakole</option>
                    <option value="Vansh">Vansh Khakole</option>
                  </select>
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                    Link to Client (Optional)
                  </label>
                  <select
                    value={expClientId}
                    onChange={(e) => setExpClientId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs text-[#0B0F19]"
                  >
                    <option value="">General Studio Expense</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.businessName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                  Description & Notes
                </label>
                <textarea
                  rows={2}
                  value={expNotes}
                  onChange={(e) => setExpNotes(e.target.value)}
                  placeholder="Optional details about this expense..."
                  className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs text-[#0B0F19]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setIsExpModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#475569] hover:bg-[#F8F9FA] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0B0F19] hover:bg-[#1E293B] text-white text-xs font-bold cursor-pointer"
                >
                  {editingExpense ? 'Save Changes' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Transaction Details Modal */}
      {viewingTx && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setViewingTx(null)}
        >
          <div
            className="bg-white border border-[#E2E8F0] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#2563EB] font-bold">
                  TRANSACTION RECORD
                </span>
                <h4 className="text-base font-bold text-[#0B0F19]">{viewingTx.description}</h4>
              </div>
              <button
                onClick={() => setViewingTx(null)}
                className="p-1.5 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-[#F1F5F9]">
                <span className="text-[#64748B]">Transaction ID</span>
                <span className="font-mono font-bold text-[#0B0F19]">{viewingTx.id}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#F1F5F9]">
                <span className="text-[#64748B]">Date</span>
                <span className="font-mono text-[#0B0F19]">{viewingTx.transactionDate}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#F1F5F9]">
                <span className="text-[#64748B]">Type</span>
                <span className="font-bold text-[#0B0F19]">{viewingTx.type}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#F1F5F9]">
                <span className="text-[#64748B]">Amount</span>
                <span className="font-mono font-bold text-sm text-[#0B0F19]">
                  {formatINR(viewingTx.amount)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#F1F5F9]">
                <span className="text-[#64748B]">Payment Method</span>
                <span className="font-mono font-semibold text-[#0B0F19]">{viewingTx.paymentMethod}</span>
              </div>
              {viewingTx.clientName && (
                <div className="flex justify-between py-1.5 border-b border-[#F1F5F9]">
                  <span className="text-[#64748B]">Client</span>
                  <span className="font-bold text-[#0B0F19]">{viewingTx.clientName}</span>
                </div>
              )}
              {viewingTx.invoiceNumber && (
                <div className="flex justify-between py-1.5 border-b border-[#F1F5F9]">
                  <span className="text-[#64748B]">Linked Invoice</span>
                  <span className="font-mono font-bold text-[#2563EB]">{viewingTx.invoiceNumber}</span>
                </div>
              )}
              {viewingTx.referenceNumber && (
                <div className="flex justify-between py-1.5 border-b border-[#F1F5F9]">
                  <span className="text-[#64748B]">Reference / UTR</span>
                  <span className="font-mono text-[#0B0F19]">{viewingTx.referenceNumber}</span>
                </div>
              )}
              {viewingTx.notes && (
                <div className="pt-2">
                  <span className="text-[#64748B] block mb-1">Notes</span>
                  <p className="p-2.5 rounded-xl bg-[#F8F9FA] text-[#334155]">{viewingTx.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View Expense Details Modal */}
      {viewingExp && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setViewingExp(null)}
        >
          <div
            className="bg-white border border-[#E2E8F0] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#2563EB] font-bold">
                  {viewingExp.expenseNumber || 'EXPENSE DETAIL'}
                </span>
                <h4 className="text-base font-bold text-[#0B0F19]">{viewingExp.title}</h4>
              </div>
              <button
                onClick={() => setViewingExp(null)}
                className="p-1.5 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-[#F1F5F9]">
                <span className="text-[#64748B]">Category</span>
                <span className="font-bold text-[#0B0F19]">{viewingExp.category}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#F1F5F9]">
                <span className="text-[#64748B]">Date</span>
                <span className="font-mono text-[#0B0F19]">{viewingExp.date}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#F1F5F9]">
                <span className="text-[#64748B]">Amount</span>
                <span className="font-mono font-bold text-sm text-[#B91C1C]">
                  {formatINR(viewingExp.amount)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#F1F5F9]">
                <span className="text-[#64748B]">Payment Method</span>
                <span className="font-mono font-semibold text-[#0B0F19]">{viewingExp.paymentMethod || 'UPI'}</span>
              </div>
              {viewingExp.vendor && (
                <div className="flex justify-between py-1.5 border-b border-[#F1F5F9]">
                  <span className="text-[#64748B]">Vendor</span>
                  <span className="font-bold text-[#0B0F19]">{viewingExp.vendor}</span>
                </div>
              )}
              {viewingExp.referenceNumber && (
                <div className="flex justify-between py-1.5 border-b border-[#F1F5F9]">
                  <span className="text-[#64748B]">Reference Number</span>
                  <span className="font-mono text-[#0B0F19]">{viewingExp.referenceNumber}</span>
                </div>
              )}
              {viewingExp.notes && (
                <div className="pt-2">
                  <span className="text-[#64748B] block mb-1">Notes</span>
                  <p className="p-2.5 rounded-xl bg-[#F8F9FA] text-[#334155]">{viewingExp.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-white border border-[#E2E8F0] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-[#DC2626]" />
              </div>
              <div>
                <h4 className="text-base font-bold text-[#0B0F19]">Confirm Permanent Deletion</h4>
                <p className="text-xs text-[#64748B] mt-1">
                  Are you sure you want to delete <span className="font-bold text-[#0B0F19]">{deleteTarget.label}</span>? This will immediately recalculate all affected invoice balances, net cash flow, and ledger metrics.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E2E8F0]">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#475569] hover:bg-[#F8F9FA] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteAction}
                className="px-4 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold cursor-pointer"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
