import React, { useState, useMemo } from 'react';
import {
  AethelDatabaseState,
  ClientLead,
  ClientInvoice,
  ClientPayment,
  ClientQuotation,
  InvoiceLineItem,
  InvoiceStatus,
  QuotationStatus,
  FinancePaymentMethod,
  FinanceSettings,
  ExpensePaidBy,
  GeneratedDocument
} from '../../types';
import { formatINR } from '../../utils/calculations';
import {
  generateNextDocumentNumber,
  calculateInvoiceDerivedState,
  convertQuotationToInvoice
} from '../../utils/financeEngine';
import {
  Plus,
  Search,
  FileText,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  X,
  Edit3,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Ban,
  Eye,
  ArrowRight,
  CreditCard,
  ShieldAlert
} from 'lucide-react';

interface InvoicesAndQuotationsProps {
  mode: 'invoices' | 'quotations';
  dbState: AethelDatabaseState;
  invoices: ClientInvoice[];
  quotations: ClientQuotation[];
  payments: ClientPayment[];
  clients: ClientLead[];
  financeSettings: FinanceSettings;
  onUpdateInvoices: (invoices: ClientInvoice[]) => void;
  onUpdateQuotations: (quotations: ClientQuotation[]) => void;
  onUpdateFinanceSettings?: (settings: FinanceSettings) => void;
  onAddPayment: (payment: ClientPayment) => void;
  onGenerateInvoicePdf: (invoice: ClientInvoice) => void;
  onGenerateQuotationPdf: (quotation: ClientQuotation) => void;
  onGenerateReceiptPdf: (payment: ClientPayment, invoice?: ClientInvoice) => void;
  onPreviewDraftDocument?: (doc: GeneratedDocument) => void;
  onSelectClient?: (clientId: string) => void;
  onDeleteInvoice?: (
    invoice: ClientInvoice,
    options: { deleteLinkedPayments: boolean; deleteLinkedDocuments: boolean }
  ) => void;
  onDeleteQuotation?: (
    quotation: ClientQuotation,
    options: { deleteLinkedDocuments: boolean }
  ) => void;
}

const PAYMENT_METHODS: FinancePaymentMethod[] = ['UPI', 'Cash', 'Bank Transfer', 'Other'];

export const InvoicesAndQuotations: React.FC<InvoicesAndQuotationsProps> = ({
  mode,
  dbState,
  invoices,
  quotations,
  payments,
  clients,
  financeSettings,
  onUpdateInvoices,
  onUpdateQuotations,
  onUpdateFinanceSettings,
  onAddPayment,
  onGenerateInvoicePdf,
  onGenerateQuotationPdf,
  onGenerateReceiptPdf,
  onPreviewDraftDocument,
  onSelectClient,
  onDeleteInvoice,
  onDeleteQuotation
}) => {
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [clientFilter, setClientFilter] = useState<string>('ALL');

  // Invoice Create/Edit Modal
  const [isInvModalOpen, setIsInvModalOpen] = useState(false);
  const [editingInv, setEditingInv] = useState<ClientInvoice | null>(null);
  const [invNumber, setInvNumber] = useState('');
  const [invClientId, setInvClientId] = useState('');
  const [invClientName, setInvClientName] = useState('');
  const [invContactPerson, setInvContactPerson] = useState('');
  const [invClientEmail, setInvClientEmail] = useState('');
  const [invClientPhone, setInvClientPhone] = useState('');
  const [invClientAddress, setInvClientAddress] = useState('');
  const [invProjectTitle, setInvProjectTitle] = useState('');
  const [invPackageSubtitle, setInvPackageSubtitle] = useState('Professional Package');
  const [invIssueDate, setInvIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [invDueDate, setInvDueDate] = useState('');
  const [invPaymentTerms, setInvPaymentTerms] = useState('Due within 7 days of issue');
  const [invItems, setInvItems] = useState<InvoiceLineItem[]>([
    { id: 'item-1', serviceName: 'Web & Digital Architecture Package', description: '', quantity: 1, unitPrice: 10000, total: 10000 }
  ]);
  const [invDiscount, setInvDiscount] = useState('0');
  const [invNotes, setInvNotes] = useState('');
  const [invError, setInvError] = useState<string | null>(null);
  const [allowPaidEditUnlock, setAllowPaidEditUnlock] = useState(false);

  // Record Payment Modal
  const [paymentModalInv, setPaymentModalInv] = useState<ClientInvoice | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [payMethod, setPayMethod] = useState<FinancePaymentMethod>('UPI');
  const [payReference, setPayReference] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payCollectedBy, setPayCollectedBy] = useState<ExpensePaidBy>('Studio Account');
  const [payError, setPayError] = useState<string | null>(null);
  const [confirmOverpayment, setConfirmOverpayment] = useState(false);
  const [isRecordingPay, setIsRecordingPay] = useState(false);
  const [lastRecordedReceipt, setLastRecordedReceipt] = useState<{
    payment: ClientPayment;
    invoice: ClientInvoice;
  } | null>(null);

  // Cancel Invoice Confirmation
  const [cancelTargetInv, setCancelTargetInv] = useState<ClientInvoice | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Delete Invoice Confirmation
  const [deleteTargetInv, setDeleteTargetInv] = useState<ClientInvoice | null>(null);
  const [deleteInvLinkedPayments, setDeleteInvLinkedPayments] = useState(false);
  const [deleteInvLinkedDocs, setDeleteInvLinkedDocs] = useState(true);

  // Delete Quotation Confirmation
  const [deleteTargetQuo, setDeleteTargetQuo] = useState<ClientQuotation | null>(null);
  const [deleteQuoLinkedDocs, setDeleteQuoLinkedDocs] = useState(true);

  // Quotation Create/Edit Modal
  const [isQuoModalOpen, setIsQuoModalOpen] = useState(false);
  const [editingQuo, setEditingQuo] = useState<ClientQuotation | null>(null);
  const [quoNumber, setQuoNumber] = useState('');
  const [quoClientId, setQuoClientId] = useState('');
  const [quoClientName, setQuoClientName] = useState('');
  const [quoContactPerson, setQuoContactPerson] = useState('');
  const [quoClientEmail, setQuoClientEmail] = useState('');
  const [quoClientPhone, setQuoClientPhone] = useState('');
  const [quoClientAddress, setQuoClientAddress] = useState('');
  const [quoProjectTitle, setQuoProjectTitle] = useState('');
  const [quoPackageSubtitle, setQuoPackageSubtitle] = useState('Professional Package');
  const [quoIssueDate, setQuoIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [quoValidUntil, setQuoValidUntil] = useState('');
  const [quoItems, setQuoItems] = useState<InvoiceLineItem[]>([
    { id: 'q-item-1', serviceName: 'Complete Digital Transformation & Web Experience', description: '', quantity: 1, unitPrice: 15000, total: 15000 }
  ]);
  const [quoDiscount, setQuoDiscount] = useState('0');
  const [quoNotes, setQuoNotes] = useState('');
  const [quoTerms, setQuoTerms] = useState('50% advance to initiate build, 50% upon final preview approval.');
  const [quoStatus, setQuoStatus] = useState<QuotationStatus>('Draft');

  // Derived invoices list with real-time payment calculation
  const enrichedInvoices = useMemo(() => {
    return invoices.map((inv) => calculateInvoiceDerivedState(inv, payments));
  }, [invoices, payments]);

  const filteredInvoices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return enrichedInvoices
      .filter((inv) => {
        if (statusFilter !== 'ALL' && inv.status !== statusFilter) return false;
        if (clientFilter !== 'ALL' && inv.clientId !== clientFilter) return false;
        if (!q) return true;
        return (
          inv.invoiceNumber.toLowerCase().includes(q) ||
          inv.clientName.toLowerCase().includes(q) ||
          (inv.projectTitle || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.issueDate.localeCompare(a.issueDate));
  }, [enrichedInvoices, searchQuery, statusFilter, clientFilter]);

  const filteredQuotations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return quotations
      .filter((quo) => {
        if (statusFilter !== 'ALL' && quo.status !== statusFilter) return false;
        if (clientFilter !== 'ALL' && quo.clientId !== clientFilter) return false;
        if (!q) return true;
        return (
          quo.quoteNumber.toLowerCase().includes(q) ||
          quo.clientName.toLowerCase().includes(q) ||
          (quo.projectTitle || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [quotations, searchQuery, statusFilter, clientFilter]);

  // Autofill helper when selecting a client in Invoice editor
  const handleSelectClientForInvoice = (selectedId: string) => {
    setInvClientId(selectedId);
    const found = clients.find((c) => c.id === selectedId);
    if (found) {
      setInvClientName(found.businessName);
      setInvContactPerson(found.contactPerson || '');
      setInvClientEmail(found.email || '');
      setInvClientPhone(found.phone || '');
      setInvClientAddress(found.city || '');
      setInvPackageSubtitle(found.packageTier ? `${found.packageTier} Package` : 'Professional Package');
      if (!invProjectTitle) {
        setInvProjectTitle('Website Design & Development');
      }
    }
  };

  // Autofill helper for Quotation editor
  const handleSelectClientForQuotation = (selectedId: string) => {
    setQuoClientId(selectedId);
    const found = clients.find((c) => c.id === selectedId);
    if (found) {
      setQuoClientName(found.businessName);
      setQuoContactPerson(found.contactPerson || '');
      setQuoClientEmail(found.email || '');
      setQuoClientPhone(found.phone || '');
      setQuoClientAddress(found.city || '');
      setQuoPackageSubtitle(found.packageTier ? `${found.packageTier} Package` : 'Professional Package');
      if (!quoProjectTitle) {
        setQuoProjectTitle('Website Design & Development');
      }
    }
  };

  // Line Item handlers
  const updateLineItem = (
    list: InvoiceLineItem[],
    setList: React.Dispatch<React.SetStateAction<InvoiceLineItem[]>>,
    index: number,
    patch: Partial<InvoiceLineItem>
  ) => {
    const updated = list.map((item, idx) => {
      if (idx !== index) return item;
      const next = { ...item, ...patch };
      next.total = Math.max(0, Math.round((Number(next.quantity) || 0) * (Number(next.unitPrice) || 0)));
      return next;
    });
    setList(updated);
  };

  const moveLineItem = (
    list: InvoiceLineItem[],
    setList: React.Dispatch<React.SetStateAction<InvoiceLineItem[]>>,
    index: number,
    direction: 'up' | 'down'
  ) => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const copy = [...list];
    const [removed] = copy.splice(index, 1);
    copy.splice(targetIdx, 0, removed);
    setList(copy);
  };

  const openCreateInvoiceModal = () => {
    setEditingInv(null);
    setAllowPaidEditUnlock(false);
    const { formatted: nextNo } = generateNextDocumentNumber('Invoice', dbState);
    setInvNumber(nextNo);
    const today = new Date().toISOString().split('T')[0];
    const due = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    setInvIssueDate(today);
    setInvDueDate(due);
    setInvPaymentTerms('Due within 7 days of issue');
    setInvDiscount('0');
    setInvNotes(financeSettings.gstDisclaimer);
    setInvError(null);

    if (clients.length > 0) {
      const first = clients[0];
      setInvClientId(first.id);
      setInvClientName(first.businessName);
      setInvContactPerson(first.contactPerson || '');
      setInvClientEmail(first.email || '');
      setInvClientPhone(first.phone || '');
      setInvClientAddress(first.city || '');
      setInvProjectTitle('Website Design & Development');
      setInvPackageSubtitle(first.packageTier ? `${first.packageTier} Package` : 'Professional Package');
      const defaultRate = first.finalAgreedPrice > 0 ? first.finalAgreedPrice : 10000;
      setInvItems([
        {
          id: `item-${Date.now()}`,
          serviceName: `${first.packageTier || 'Web & Growth'} Architecture`,
          description: 'End-to-end design, engineering & deployment',
          quantity: 1,
          unitPrice: defaultRate,
          total: defaultRate
        }
      ]);
    } else {
      setInvClientId('');
      setInvClientName('');
      setInvContactPerson('');
      setInvClientEmail('');
      setInvClientPhone('');
      setInvClientAddress('');
      setInvProjectTitle('Website Design & Development');
      setInvPackageSubtitle('Professional Package');
      setInvItems([
        {
          id: `item-${Date.now()}`,
          serviceName: 'Digital Services & Consulting',
          description: '',
          quantity: 1,
          unitPrice: 10000,
          total: 10000
        }
      ]);
    }
    setIsInvModalOpen(true);
  };

  const openEditInvoiceModal = (inv: ClientInvoice) => {
    setEditingInv(inv);
    setAllowPaidEditUnlock(false);
    setInvNumber(inv.invoiceNumber);
    setInvClientId(inv.clientId || '');
    setInvClientName(inv.clientName);
    setInvContactPerson(inv.clientContactPerson || '');
    setInvClientEmail(inv.clientEmail || '');
    setInvClientPhone(inv.clientPhone || '');
    setInvClientAddress(inv.clientAddress || '');
    setInvProjectTitle(inv.projectTitle || '');
    setInvPackageSubtitle(inv.packageSubtitle || 'Professional Package');
    setInvIssueDate(inv.issueDate);
    setInvDueDate(inv.dueDate);
    setInvPaymentTerms(inv.paymentTerms || 'Due within 7 days');
    setInvItems(inv.lineItems && inv.lineItems.length > 0 ? inv.lineItems : []);
    setInvDiscount(String(inv.discount || 0));
    setInvNotes(inv.notes || financeSettings.gstDisclaimer);
    setInvError(null);
    setIsInvModalOpen(true);
  };

  const handleDuplicateInvoice = (inv: ClientInvoice) => {
    const { formatted: nextNo } = generateNextDocumentNumber('Invoice', dbState);
    const today = new Date().toISOString().split('T')[0];
    const due = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    const duplicated: ClientInvoice = {
      ...inv,
      id: `inv-${Date.now()}`,
      invoiceNumber: nextNo,
      issueDate: today,
      dueDate: due,
      amountPaid: 0,
      balanceDue: inv.amount,
      status: 'Draft',
      version: 1,
      createdAt: new Date().toISOString()
    };
    onUpdateInvoices([duplicated, ...invoices]);
  };

  const handleSaveInvoice = (saveAsStatus: 'Draft' | 'Issued') => {
    if (!invClientName.trim()) {
      setInvError('Please select or enter a client name.');
      return;
    }
    if (invItems.length === 0) {
      setInvError('Please add at least one service line item.');
      return;
    }

    const subtotal = invItems.reduce((s, item) => s + (Number(item.total) || 0), 0);
    const discountNum = Math.max(0, Math.round(Number(invDiscount) || 0));
    const totalAmount = Math.max(0, subtotal - discountNum);

    if (totalAmount <= 0) {
      setInvError('Invoice grand total must be greater than ₹0.');
      return;
    }

    if (editingInv) {
      const updatedBase: ClientInvoice = {
        ...editingInv,
        invoiceNumber: invNumber.trim() || editingInv.invoiceNumber,
        clientId: invClientId || editingInv.clientId,
        clientName: invClientName.trim(),
        clientContactPerson: invContactPerson.trim() || undefined,
        clientEmail: invClientEmail.trim() || undefined,
        clientPhone: invClientPhone.trim() || undefined,
        clientAddress: invClientAddress.trim() || undefined,
        projectTitle: invProjectTitle.trim() || editingInv.projectTitle || 'Website Design & Development',
        packageSubtitle: invPackageSubtitle.trim() || undefined,
        issueDate: invIssueDate,
        dueDate: invDueDate || invIssueDate,
        paymentTerms: invPaymentTerms.trim() || undefined,
        lineItems: invItems,
        subtotal,
        discount: discountNum,
        amount: totalAmount,
        status: (editingInv.amountPaid || 0) > 0 ? editingInv.status : saveAsStatus,
        notes: invNotes.trim() || financeSettings.gstDisclaimer,
        gstEnabled: financeSettings.gstEnabled,
        gstRatePercent: financeSettings.gstEnabled ? financeSettings.gstRatePercent : 0,
        gstDisclaimer: financeSettings.gstDisclaimer,
        version: (editingInv.version || 1) + 1
      };
      const recalculated = calculateInvoiceDerivedState(updatedBase, payments);
      onUpdateInvoices(invoices.map((i) => (i.id === editingInv.id ? recalculated : i)));
    } else {
      const newBase: ClientInvoice = {
        id: `inv-${Date.now()}`,
        invoiceNumber: invNumber.trim(),
        clientId: invClientId || 'custom-client',
        clientName: invClientName.trim(),
        clientContactPerson: invContactPerson.trim() || undefined,
        clientEmail: invClientEmail.trim() || undefined,
        clientPhone: invClientPhone.trim() || undefined,
        clientAddress: invClientAddress.trim() || undefined,
        projectTitle: invProjectTitle.trim() || 'Website Design & Development',
        packageSubtitle: invPackageSubtitle.trim() || undefined,
        type: 'Standard Invoice',
        issueDate: invIssueDate,
        dueDate: invDueDate || invIssueDate,
        paymentTerms: invPaymentTerms.trim() || undefined,
        lineItems: invItems,
        subtotal,
        discount: discountNum,
        amount: totalAmount,
        amountPaid: 0,
        balanceDue: totalAmount,
        status: saveAsStatus,
        notes: invNotes.trim() || financeSettings.gstDisclaimer,
        gstEnabled: financeSettings.gstEnabled,
        gstRatePercent: financeSettings.gstEnabled ? financeSettings.gstRatePercent : 0,
        gstDisclaimer: financeSettings.gstDisclaimer,
        templateId: financeSettings.defaultTemplateId,
        version: 1,
        createdAt: new Date().toISOString()
      };
      const recalculated = calculateInvoiceDerivedState(newBase, payments);
      onUpdateInvoices([recalculated, ...invoices]);
    }
    setIsInvModalOpen(false);
  };

  // Section 9: In-Editor Live A4 Preview for Unsaved Invoice Draft
  const handlePreviewDraftInvoice = () => {
    const subtotal = invItems.reduce((s, item) => s + (Number(item.total) || 0), 0);
    const discountNum = Math.max(0, Math.round(Number(invDiscount) || 0));
    const totalAmount = Math.max(0, subtotal - discountNum);
    const paidAmount = editingInv?.amountPaid || 0;
    const balanceAmount = Math.max(0, totalAmount - paidAmount);

    const draftInvoice: ClientInvoice = {
      id: editingInv?.id || 'draft-invoice-preview',
      invoiceNumber: invNumber.trim() || 'AS-I-DRAFT',
      clientId: invClientId || 'draft-client',
      clientName: invClientName.trim() || 'Client Name',
      clientContactPerson: invContactPerson.trim() || undefined,
      clientEmail: invClientEmail.trim() || undefined,
      clientPhone: invClientPhone.trim() || undefined,
      clientAddress: invClientAddress.trim() || undefined,
      projectTitle: invProjectTitle.trim() || 'Website Design & Development',
      packageSubtitle: invPackageSubtitle.trim() || undefined,
      type: editingInv?.type || 'Standard Invoice',
      issueDate: invIssueDate,
      dueDate: invDueDate || invIssueDate,
      paymentTerms: invPaymentTerms.trim() || undefined,
      lineItems: invItems,
      subtotal,
      discount: discountNum,
      amount: totalAmount,
      amountPaid: paidAmount,
      balanceDue: balanceAmount,
      status: editingInv?.status || 'Draft',
      notes: invNotes.trim() || financeSettings.gstDisclaimer,
      gstEnabled: financeSettings.gstEnabled,
      gstRatePercent: financeSettings.gstEnabled ? financeSettings.gstRatePercent : 0,
      gstDisclaimer: financeSettings.gstDisclaimer,
      templateId: editingInv?.templateId || 'tpl-aethel-editorial',
      version: editingInv?.version || 1
    };

    const previewDoc: GeneratedDocument = {
      id: `draft-preview-inv-${Date.now()}`,
      documentNumber: draftInvoice.invoiceNumber,
      documentType: 'Invoice',
      clientId: draftInvoice.clientId,
      clientName: draftInvoice.clientName,
      projectTitle: draftInvoice.projectTitle,
      invoiceId: draftInvoice.id,
      createdDate: draftInvoice.issueDate,
      amount: draftInvoice.amount,
      status: 'Draft',
      version: draftInvoice.version || 1,
      templateId: draftInvoice.templateId || 'tpl-aethel-editorial',
      snapshotPayload: draftInvoice as unknown as Record<string, unknown>
    };

    if (onPreviewDraftDocument) {
      onPreviewDraftDocument(previewDoc);
    } else {
      onGenerateInvoicePdf(draftInvoice);
    }
  };

  // Open Record Payment Modal
  const openRecordPaymentForInvoice = (inv: ClientInvoice) => {
    const balance = inv.balanceDue ?? inv.amount;
    setPaymentModalInv(inv);
    setPayAmount(String(balance > 0 ? balance : inv.amount));
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayMethod('UPI');
    setPayReference('');
    setPayNotes('');
    setPayCollectedBy('Studio Account');
    setPayError(null);
    setConfirmOverpayment(false);
  };

  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalInv || isRecordingPay) return;
    const numericAmount = Math.round(Number(payAmount) || 0);
    if (numericAmount <= 0) {
      setPayError('Payment amount must be greater than zero.');
      return;
    }

    const currentBalance = paymentModalInv.balanceDue ?? paymentModalInv.amount;
    if (numericAmount > currentBalance && !confirmOverpayment) {
      setPayError(
        `Amount ${formatINR(numericAmount)} exceeds remaining balance of ${formatINR(currentBalance)}. Click "Confirm Overpayment" to proceed.`
      );
      setConfirmOverpayment(true);
      return;
    }

    setIsRecordingPay(true);
    try {
      const { formatted: receiptNo } = generateNextDocumentNumber('Receipt', dbState);
      const createdPayment: ClientPayment = {
        id: `pay-${Date.now()}`,
        clientId: paymentModalInv.clientId,
        clientName: paymentModalInv.clientName,
        projectTitle: paymentModalInv.projectTitle,
        totalProjectValue: paymentModalInv.amount,
        invoiceId: paymentModalInv.id,
        invoiceNumber: paymentModalInv.invoiceNumber,
        receiptNumber: receiptNo,
        amountReceived: numericAmount,
        paymentDate: payDate,
        milestone: numericAmount >= currentBalance ? 'Invoice Settlement' : 'Partial Payment',
        paymentMode: payMethod,
        upiReference: payReference.trim() || undefined,
        receivedInAccount: payCollectedBy,
        notes: payNotes.trim() || `Payment against ${paymentModalInv.invoiceNumber}`,
        createdAt: new Date().toISOString()
      };

      onAddPayment(createdPayment);

      // Update invoice derived state immediately
      const updatedInv = calculateInvoiceDerivedState(
        {
          ...paymentModalInv,
          status: paymentModalInv.status === 'Draft' ? 'Issued' : paymentModalInv.status
        },
        [createdPayment, ...payments]
      );
      onUpdateInvoices(invoices.map((i) => (i.id === paymentModalInv.id ? updatedInv : i)));

      setLastRecordedReceipt({
        payment: createdPayment,
        invoice: updatedInv
      });
      setPaymentModalInv(null);
    } finally {
      setIsRecordingPay(false);
    }
  };

  // Cancel Invoice
  const handleConfirmCancelInvoice = () => {
    if (!cancelTargetInv) return;
    const cancelled: ClientInvoice = {
      ...cancelTargetInv,
      status: 'Cancelled',
      balanceDue: 0,
      notes: cancelReason.trim()
        ? `${cancelTargetInv.notes} [Cancelled: ${cancelReason.trim()}]`
        : cancelTargetInv.notes
    };
    onUpdateInvoices(invoices.map((i) => (i.id === cancelTargetInv.id ? cancelled : i)));
    setCancelTargetInv(null);
    setCancelReason('');
  };

  // Delete Invoice
  const openDeleteInvoiceModal = (inv: ClientInvoice) => {
    setDeleteTargetInv(inv);
    setDeleteInvLinkedPayments(false);
    setDeleteInvLinkedDocs(true);
  };

  const handleConfirmDeleteInvoice = () => {
    if (!deleteTargetInv) return;
    if (onDeleteInvoice) {
      onDeleteInvoice(deleteTargetInv, {
        deleteLinkedPayments: deleteInvLinkedPayments,
        deleteLinkedDocuments: deleteInvLinkedDocs
      });
    } else {
      onUpdateInvoices(invoices.filter((i) => i.id !== deleteTargetInv.id));
    }
    setDeleteTargetInv(null);
    setIsInvModalOpen(false);
    setEditingInv(null);
  };

  // Delete Quotation
  const openDeleteQuotationModal = (quo: ClientQuotation) => {
    setDeleteTargetQuo(quo);
    setDeleteQuoLinkedDocs(true);
  };

  const handleConfirmDeleteQuotation = () => {
    if (!deleteTargetQuo) return;
    if (onDeleteQuotation) {
      onDeleteQuotation(deleteTargetQuo, {
        deleteLinkedDocuments: deleteQuoLinkedDocs
      });
    } else {
      onUpdateQuotations(quotations.filter((q) => q.id !== deleteTargetQuo.id));
    }
    setDeleteTargetQuo(null);
    setIsQuoModalOpen(false);
    setEditingQuo(null);
  };

  // Quotation Modal handlers
  const openCreateQuotationModal = () => {
    setEditingQuo(null);
    const { formatted: nextNo } = generateNextDocumentNumber('Quotation', dbState);
    setQuoNumber(nextNo);
    const today = new Date().toISOString().split('T')[0];
    const valid = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
    setQuoIssueDate(today);
    setQuoValidUntil(valid);
    setQuoDiscount('0');
    setQuoStatus('Draft');
    setQuoNotes(financeSettings.gstDisclaimer);
    setQuoTerms('50% advance to initiate build, 50% upon final preview approval.');

    if (clients.length > 0) {
      const first = clients[0];
      setQuoClientId(first.id);
      setQuoClientName(first.businessName);
      setQuoContactPerson(first.contactPerson || '');
      setQuoClientEmail(first.email || '');
      setQuoClientPhone(first.phone || '');
      setQuoClientAddress(first.city || '');
      setQuoProjectTitle('Website Design & Development');
      setQuoPackageSubtitle(first.packageTier ? `${first.packageTier} Package` : 'Professional Package');
      const rate = first.finalAgreedPrice > 0 ? first.finalAgreedPrice : 15000;
      setQuoItems([
        {
          id: `q-item-${Date.now()}`,
          serviceName: `${first.packageTier || 'Web & Growth'} Proposal`,
          description: 'Complete UI/UX, full-stack development & launch',
          quantity: 1,
          unitPrice: rate,
          total: rate
        }
      ]);
    } else {
      setQuoClientId('');
      setQuoClientName('');
      setQuoContactPerson('');
      setQuoClientEmail('');
      setQuoClientPhone('');
      setQuoClientAddress('');
      setQuoProjectTitle('Website Design & Development');
      setQuoPackageSubtitle('Professional Package');
      setQuoItems([
        {
          id: `q-item-${Date.now()}`,
          serviceName: 'Web Design & Development Package',
          description: '',
          quantity: 1,
          unitPrice: 15000,
          total: 15000
        }
      ]);
    }
    setIsQuoModalOpen(true);
  };

  const openEditQuotationModal = (quo: ClientQuotation) => {
    setEditingQuo(quo);
    setQuoNumber(quo.quoteNumber);
    setQuoClientId(quo.clientId || '');
    setQuoClientName(quo.clientName);
    setQuoContactPerson(quo.clientContactPerson || '');
    setQuoClientEmail(quo.clientEmail || '');
    setQuoClientPhone(quo.clientPhone || '');
    setQuoClientAddress(quo.clientAddress || '');
    setQuoProjectTitle(quo.projectTitle || '');
    setQuoPackageSubtitle(quo.packageSubtitle || 'Professional Package');
    setQuoIssueDate(quo.date);
    setQuoValidUntil(quo.validUntil);
    setQuoItems(quo.lineItems);
    setQuoDiscount(String(quo.discount || 0));
    setQuoNotes(quo.notes || financeSettings.gstDisclaimer);
    setQuoTerms(quo.termsAndConditions || '50% advance, 50% on completion');
    setQuoStatus(quo.status);
    setIsQuoModalOpen(true);
  };

  const handleSaveQuotation = (statusOverride?: QuotationStatus) => {
    if (!quoClientName.trim() || quoItems.length === 0) return;
    const subtotal = quoItems.reduce((s, i) => s + (Number(i.total) || 0), 0);
    const discountNum = Math.max(0, Math.round(Number(quoDiscount) || 0));
    const totalAmount = Math.max(0, subtotal - discountNum);

    if (editingQuo) {
      const updated: ClientQuotation = {
        ...editingQuo,
        quoteNumber: quoNumber.trim() || editingQuo.quoteNumber,
        clientId: quoClientId || editingQuo.clientId,
        clientName: quoClientName.trim(),
        clientContactPerson: quoContactPerson.trim() || undefined,
        clientEmail: quoClientEmail.trim() || undefined,
        clientPhone: quoClientPhone.trim() || undefined,
        clientAddress: quoClientAddress.trim() || undefined,
        projectTitle: quoProjectTitle.trim() || 'Website Design & Development',
        packageSubtitle: quoPackageSubtitle.trim() || undefined,
        date: quoIssueDate,
        validUntil: quoValidUntil || quoIssueDate,
        lineItems: quoItems,
        subtotal,
        discount: discountNum,
        total: totalAmount,
        status: statusOverride || quoStatus,
        notes: quoNotes.trim() || financeSettings.gstDisclaimer,
        termsAndConditions: quoTerms.trim()
      };
      onUpdateQuotations(quotations.map((q) => (q.id === editingQuo.id ? updated : q)));
    } else {
      const created: ClientQuotation = {
        id: `quo-${Date.now()}`,
        quoteNumber: quoNumber.trim(),
        clientId: quoClientId || 'custom-client',
        clientName: quoClientName.trim(),
        clientContactPerson: quoContactPerson.trim() || undefined,
        clientEmail: quoClientEmail.trim() || undefined,
        clientPhone: quoClientPhone.trim() || undefined,
        clientAddress: quoClientAddress.trim() || undefined,
        projectTitle: quoProjectTitle.trim() || 'Website Design & Development',
        packageSubtitle: quoPackageSubtitle.trim() || undefined,
        date: quoIssueDate,
        validUntil: quoValidUntil || quoIssueDate,
        lineItems: quoItems,
        subtotal,
        discount: discountNum,
        total: totalAmount,
        status: statusOverride || quoStatus,
        notes: quoNotes.trim() || financeSettings.gstDisclaimer,
        termsAndConditions: quoTerms.trim(),
        templateId: 'tpl-aethel-quotation',
        createdAt: new Date().toISOString()
      };
      onUpdateQuotations([created, ...quotations]);
    }
    setIsQuoModalOpen(false);
  };

  // Section 9: In-Editor Live A4 Preview for Unsaved Quotation Draft
  const handlePreviewDraftQuotation = () => {
    const subtotal = quoItems.reduce((s, i) => s + (Number(i.total) || 0), 0);
    const discountNum = Math.max(0, Math.round(Number(quoDiscount) || 0));
    const totalAmount = Math.max(0, subtotal - discountNum);

    const draftQuotation: ClientQuotation = {
      id: editingQuo?.id || 'draft-quotation-preview',
      quoteNumber: quoNumber.trim() || 'AS-Q-DRAFT',
      clientId: quoClientId || 'draft-client',
      clientName: quoClientName.trim() || 'Client Name',
      clientContactPerson: quoContactPerson.trim() || undefined,
      clientEmail: quoClientEmail.trim() || undefined,
      clientPhone: quoClientPhone.trim() || undefined,
      clientAddress: quoClientAddress.trim() || undefined,
      projectTitle: quoProjectTitle.trim() || 'Website Design & Development',
      packageSubtitle: quoPackageSubtitle.trim() || undefined,
      date: quoIssueDate,
      validUntil: quoValidUntil || quoIssueDate,
      lineItems: quoItems,
      subtotal,
      discount: discountNum,
      total: totalAmount,
      status: quoStatus,
      notes: quoNotes.trim() || financeSettings.gstDisclaimer,
      termsAndConditions: quoTerms.trim(),
      templateId: editingQuo?.templateId || 'tpl-aethel-quotation',
      createdAt: editingQuo?.createdAt || new Date().toISOString()
    };

    const previewDoc: GeneratedDocument = {
      id: `draft-preview-quo-${Date.now()}`,
      documentNumber: draftQuotation.quoteNumber,
      documentType: 'Quotation',
      clientId: draftQuotation.clientId,
      clientName: draftQuotation.clientName,
      projectTitle: draftQuotation.projectTitle,
      quotationId: draftQuotation.id,
      createdDate: draftQuotation.date,
      amount: draftQuotation.total,
      status: 'Draft',
      version: 1,
      templateId: draftQuotation.templateId || 'tpl-aethel-quotation',
      snapshotPayload: draftQuotation as unknown as Record<string, unknown>
    };

    if (onPreviewDraftDocument) {
      onPreviewDraftDocument(previewDoc);
    } else {
      onGenerateQuotationPdf(draftQuotation);
    }
  };

  const handleConvertQuotationToInvoice = (quo: ClientQuotation) => {
    const { invoice, updatedQuotation, updatedSettings } = convertQuotationToInvoice(quo, dbState);
    onUpdateInvoices([invoice, ...invoices]);
    onUpdateQuotations(quotations.map((q) => (q.id === quo.id ? updatedQuotation : q)));
    onUpdateFinanceSettings?.(updatedSettings);
  };

  const getStatusBadgeStyle = (status: InvoiceStatus | QuotationStatus) => {
    switch (status) {
      case 'Paid':
      case 'Accepted':
        return 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]';
      case 'Partially Paid':
      case 'Sent':
        return 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]';
      case 'Issued':
        return 'bg-[#F0F9FF] text-[#0369A1] border-[#BAE6FD]';
      case 'Overdue':
      case 'Rejected':
      case 'Expired':
        return 'bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA]';
      case 'Cancelled':
        return 'bg-[#F1F5F9] text-[#64748B] border-[#E2E8F0] line-through';
      default:
        return 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]';
    }
  };

  const invSubtotal = invItems.reduce((s, i) => s + (Number(i.total) || 0), 0);
  const invGrandTotal = Math.max(0, invSubtotal - (Number(invDiscount) || 0));

  const quoSubtotal = quoItems.reduce((s, i) => s + (Number(i.total) || 0), 0);
  const quoGrandTotal = Math.max(0, quoSubtotal - (Number(quoDiscount) || 0));

  const isEditingLockedByPayments = Boolean(
    editingInv && (editingInv.amountPaid || 0) > 0 && !allowPaidEditUnlock
  );

  return (
    <div className="space-y-6">
      {/* Receipt Generated Banner after Recording Payment */}
      {lastRecordedReceipt && (
        <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#16A34A] text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#14532D]">
                Payment of {formatINR(lastRecordedReceipt.payment.amountReceived)} Recorded ({lastRecordedReceipt.payment.receiptNumber})
              </div>
              <div className="text-[11px] text-[#166534]">
                Invoice {lastRecordedReceipt.invoice.invoiceNumber} is now{' '}
                <span className="font-bold">{lastRecordedReceipt.invoice.status}</span> (Remaining Balance:{' '}
                {formatINR(lastRecordedReceipt.invoice.balanceDue || 0)}).
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                onGenerateReceiptPdf(lastRecordedReceipt.payment, lastRecordedReceipt.invoice)
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <Receipt className="w-3.5 h-3.5" />
              Generate Payment Receipt PDF
            </button>
            <button
              onClick={() => setLastRecordedReceipt(null)}
              className="p-1.5 rounded-lg text-[#166534] hover:bg-[#DCFCE7] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top Header & Filter Controls */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#2563EB] font-bold">
              {mode === 'invoices' ? '06. INVOICES & BILLING ENGINE' : '10. QUOTATIONS & ESTIMATES'}
            </span>
            <h3 className="text-xl font-bold tracking-tight text-[#0B0F19] mt-0.5">
              {mode === 'invoices'
                ? 'Client Invoices, Partial Payments & Receivables'
                : 'Client Quotations & 1-Click Invoice Conversion'}
            </h3>
          </div>

          <button
            onClick={mode === 'invoices' ? openCreateInvoiceModal : openCreateQuotationModal}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0B0F19] hover:bg-[#1E293B] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            {mode === 'invoices' ? 'Create Invoice' : 'Create Quotation'}
          </button>
        </div>

        {/* Search & Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#F1F5F9]">
          <div className="relative">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                mode === 'invoices'
                  ? 'Search AS-I-001, client name, project...'
                  : 'Search AS-Q-001, client name, proposal...'
              }
              className="w-full pl-9 pr-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs text-[#0B0F19]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs font-semibold text-[#0B0F19]"
          >
            <option value="ALL">All Statuses</option>
            {mode === 'invoices' ? (
              <>
                <option value="Draft">Draft</option>
                <option value="Issued">Issued</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Paid">Paid</option>
                <option value="Overdue">Overdue</option>
                <option value="Cancelled">Cancelled</option>
              </>
            ) : (
              <>
                <option value="Draft">Draft</option>
                <option value="Sent">Sent</option>
                <option value="Accepted">Accepted</option>
                <option value="Rejected">Rejected</option>
                <option value="Expired">Expired</option>
              </>
            )}
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
        </div>
      </div>

      {/* Mode 1: Invoices Table */}
      {mode === 'invoices' && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden">
          {filteredInvoices.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#F8F9FA] border border-[#E2E8F0] flex items-center justify-center mx-auto mb-3">
                <FileText className="w-5 h-5 text-[#64748B]" />
              </div>
              <h4 className="text-sm font-bold text-[#0B0F19]">No invoices found</h4>
              <p className="text-xs text-[#64748B] max-w-md mx-auto mt-1">
                Create non-GST compliant invoices with sequential numbering (AS-I-001), partial payment tracking, and instant A4 PDF export.
              </p>
              <button
                onClick={openCreateInvoiceModal}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-bold hover:bg-[#1D4ED8] transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Create First Invoice
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8F9FA] font-mono text-[10px] uppercase tracking-wider text-[#64748B]">
                    <th className="py-3.5 px-4">Invoice #</th>
                    <th className="py-3.5 px-4">Client & Project</th>
                    <th className="py-3.5 px-4">Issue / Due</th>
                    <th className="py-3.5 px-4 text-right">Total</th>
                    <th className="py-3.5 px-4 text-right">Paid</th>
                    <th className="py-3.5 px-4 text-right">Balance</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] text-xs">
                  {filteredInvoices.map((inv) => {
                    const paid = inv.amountPaid || 0;
                    const balance = inv.balanceDue ?? Math.max(0, inv.amount - paid);
                    return (
                      <tr key={inv.id} className="hover:bg-[#F8F9FA]/70 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#2563EB] whitespace-nowrap">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => inv.clientId && onSelectClient?.(inv.clientId)}
                            className="font-bold text-[#0B0F19] hover:text-[#2563EB] text-left cursor-pointer"
                          >
                            {inv.clientName}
                          </button>
                          <div className="text-[11px] text-[#64748B]">
                            {inv.projectTitle || `${(inv.lineItems || []).length} line item(s)`}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-[#475569] whitespace-nowrap">
                          <div>Issued: {inv.issueDate}</div>
                          <div className="text-[#64748B]">Due: {inv.dueDate}</div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-[#0B0F19] whitespace-nowrap">
                          {formatINR(inv.amount)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-[#15803D] whitespace-nowrap">
                          {formatINR(paid)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-[#B91C1C] whitespace-nowrap">
                          {formatINR(balance)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-md border font-mono text-[10px] font-bold uppercase ${getStatusBadgeStyle(
                              inv.status
                            )}`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            {inv.status !== 'Cancelled' && balance > 0 && (
                              <button
                                onClick={() => openRecordPaymentForInvoice(inv)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#DCFCE7] hover:bg-[#BBF7D0] text-[#15803D] font-mono text-[10px] font-bold transition-colors cursor-pointer mr-1"
                              >
                                <CreditCard className="w-3 h-3" />
                                Record Payment
                              </button>
                            )}
                            <button
                              onClick={() => onGenerateInvoicePdf(inv)}
                              title="Preview & Download A4 Invoice PDF"
                              className="p-1.5 rounded-lg text-[#2563EB] hover:bg-[#EFF6FF] transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openEditInvoiceModal(inv)}
                              title="Edit Invoice"
                              className="p-1.5 rounded-lg text-[#475569] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDuplicateInvoice(inv)}
                              title="Duplicate Invoice"
                              className="p-1.5 rounded-lg text-[#475569] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            {inv.status !== 'Cancelled' && (
                              <button
                                onClick={() => setCancelTargetInv(inv)}
                                title="Cancel Invoice"
                                className="p-1.5 rounded-lg text-[#D97706] hover:bg-[#FEF3C7] transition-colors cursor-pointer"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => openDeleteInvoiceModal(inv)}
                              title="Delete Invoice"
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

      {/* Mode 2: Quotations Table */}
      {mode === 'quotations' && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden">
          {filteredQuotations.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#F8F9FA] border border-[#E2E8F0] flex items-center justify-center mx-auto mb-3">
                <FileText className="w-5 h-5 text-[#64748B]" />
              </div>
              <h4 className="text-sm font-bold text-[#0B0F19]">No quotations created yet</h4>
              <p className="text-xs text-[#64748B] max-w-md mx-auto mt-1">
                Send structured proposals (AS-Q-001) to prospective clients and convert accepted quotations into active invoices in one click.
              </p>
              <button
                onClick={openCreateQuotationModal}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B0F19] text-white text-xs font-bold hover:bg-[#1E293B] transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Create First Quotation
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8F9FA] font-mono text-[10px] uppercase tracking-wider text-[#64748B]">
                    <th className="py-3.5 px-4">Quotation #</th>
                    <th className="py-3.5 px-4">Client & Project</th>
                    <th className="py-3.5 px-4">Issue / Valid Until</th>
                    <th className="py-3.5 px-4 text-right">Amount</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] text-xs">
                  {filteredQuotations.map((quo) => (
                    <tr key={quo.id} className="hover:bg-[#F8F9FA]/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#2563EB] whitespace-nowrap">
                        {quo.quoteNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#0B0F19]">{quo.clientName}</div>
                        <div className="text-[11px] text-[#64748B]">
                          {quo.projectTitle || `${quo.lineItems.length} item(s)`}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#475569] whitespace-nowrap">
                        <div>Issued: {quo.date}</div>
                        <div className="text-[#64748B]">Valid: {quo.validUntil}</div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-[#0B0F19] whitespace-nowrap">
                        {formatINR(quo.total)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-md border font-mono text-[10px] font-bold uppercase ${getStatusBadgeStyle(
                            quo.status
                          )}`}
                        >
                          {quo.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          {!quo.convertedInvoiceId && (
                            <button
                              onClick={() => handleConvertQuotationToInvoice(quo)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#1D4ED8] font-mono text-[10px] font-bold transition-colors cursor-pointer mr-1"
                            >
                              <ArrowRight className="w-3 h-3" />
                              Convert to Invoice
                            </button>
                          )}
                          <button
                            onClick={() => onGenerateQuotationPdf(quo)}
                            title="Preview & Download Quotation PDF"
                            className="p-1.5 rounded-lg text-[#2563EB] hover:bg-[#EFF6FF] transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openEditQuotationModal(quo)}
                            title="Edit Quotation"
                            className="p-1.5 rounded-lg text-[#475569] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openDeleteQuotationModal(quo)}
                            title="Delete Quotation"
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

      {/* Create / Edit Invoice Modal */}
      {isInvModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setIsInvModalOpen(false)}
        >
          <div
            className="bg-white border border-[#E2E8F0] rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#2563EB] font-bold">
                  AETHEL STUDIOS BILLING ENGINE • NON-GST DEFAULT
                </span>
                <h3 className="text-lg font-bold text-[#0B0F19]">
                  {editingInv ? `Edit Invoice ${editingInv.invoiceNumber}` : `Create New Invoice (${invNumber})`}
                </h3>
              </div>
              <button
                onClick={() => setIsInvModalOpen(false)}
                className="p-1.5 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {invError && (
              <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{invError}</span>
              </div>
            )}

            {isEditingLockedByPayments && (
              <div className="p-3.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#92400E] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>
                    This invoice already has {formatINR(editingInv?.amountPaid || 0)} in recorded payments. Financial line items are locked to protect payment history.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAllowPaidEditUnlock(true)}
                  className="px-2.5 py-1 rounded-lg bg-[#F59E0B] text-white font-mono text-[10px] font-bold shrink-0 cursor-pointer"
                >
                  Create Versioned Revision
                </button>
              </div>
            )}

            {/* Client Selection & Autofill */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                  Select Existing Client
                </label>
                <select
                  value={invClientId}
                  onChange={(e) => handleSelectClientForInvoice(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs font-semibold text-[#0B0F19]"
                >
                  <option value="">-- Custom / New Client --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.businessName} ({c.city})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                  Client / Business Name *
                </label>
                <input
                  type="text"
                  value={invClientName}
                  onChange={(e) => setInvClientName(e.target.value)}
                  placeholder="Client Business Name"
                  className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs font-bold text-[#0B0F19]"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                  Invoice Number *
                </label>
                <input
                  type="text"
                  value={invNumber}
                  onChange={(e) => setInvNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs font-mono font-bold text-[#2563EB]"
                />
              </div>
            </div>

            {/* Editable Client Snapshot Details */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                  Contact Person
                </label>
                <input
                  type="text"
                  value={invContactPerson}
                  onChange={(e) => setInvContactPerson(e.target.value)}
                  placeholder="Contact Name"
                  className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs text-[#0B0F19]"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                  Client Phone
                </label>
                <input
                  type="text"
                  value={invClientPhone}
                  onChange={(e) => setInvClientPhone(e.target.value)}
                  placeholder="+91..."
                  className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs text-[#0B0F19]"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                  Client Email
                </label>
                <input
                  type="email"
                  value={invClientEmail}
                  onChange={(e) => setInvClientEmail(e.target.value)}
                  placeholder="client@domain.com"
                  className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs text-[#0B0F19]"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                  City / Billing Address
                </label>
                <input
                  type="text"
                  value={invClientAddress}
                  onChange={(e) => setInvClientAddress(e.target.value)}
                  placeholder="Pune, Maharashtra"
                  className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs text-[#0B0F19]"
                />
              </div>
            </div>

            {/* Project Title, Package Subtitle, Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                  Project / Invoice Title
                </label>
                <input
                  type="text"
                  value={invProjectTitle}
                  onChange={(e) => setInvProjectTitle(e.target.value)}
                  placeholder="e.g. Website Design & Development"
                  className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs text-[#0B0F19]"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                  Package Subtitle
                </label>
                <input
                  type="text"
                  value={invPackageSubtitle}
                  onChange={(e) => setInvPackageSubtitle(e.target.value)}
                  placeholder="e.g. Professional Package"
                  className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs text-[#0B0F19]"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                  Issue Date *
                </label>
                <input
                  type="date"
                  value={invIssueDate}
                  onChange={(e) => setInvIssueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs text-[#0B0F19]"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                  Due Date *
                </label>
                <input
                  type="date"
                  value={invDueDate}
                  onChange={(e) => setInvDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs text-[#0B0F19]"
                />
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#64748B] font-bold">
                  Service Line Items
                </span>
                {!isEditingLockedByPayments && (
                  <button
                    type="button"
                    onClick={() =>
                      setInvItems([
                        ...invItems,
                        {
                          id: `item-${Date.now()}`,
                          serviceName: '',
                          description: '',
                          quantity: 1,
                          unitPrice: 5000,
                          total: 5000
                        }
                      ])
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#EFF6FF] text-[#2563EB] font-mono text-[10px] font-bold hover:bg-[#DBEAFE] cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    Add Line Item
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {invItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-3 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] items-center"
                  >
                    <div className="sm:col-span-5 space-y-1">
                      <input
                        type="text"
                        disabled={isEditingLockedByPayments}
                        value={item.serviceName}
                        onChange={(e) =>
                          updateLineItem(invItems, setInvItems, idx, { serviceName: e.target.value })
                        }
                        placeholder="Service name (e.g. Full-Stack Web Application)"
                        className="w-full px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-bold text-[#0B0F19]"
                      />
                      <input
                        type="text"
                        disabled={isEditingLockedByPayments}
                        value={item.description || ''}
                        onChange={(e) =>
                          updateLineItem(invItems, setInvItems, idx, { description: e.target.value })
                        }
                        placeholder="Optional deliverable description..."
                        className="w-full px-2.5 py-1 bg-white border border-[#E2E8F0] rounded-lg text-[11px] text-[#64748B]"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block sm:hidden font-mono text-[9px] uppercase text-[#64748B]">Qty</label>
                      <input
                        type="number"
                        min="1"
                        disabled={isEditingLockedByPayments}
                        value={item.quantity}
                        onChange={(e) =>
                          updateLineItem(invItems, setInvItems, idx, { quantity: Number(e.target.value) || 1 })
                        }
                        className="w-full px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-mono text-center text-[#0B0F19]"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block sm:hidden font-mono text-[9px] uppercase text-[#64748B]">Unit Price</label>
                      <input
                        type="number"
                        min="0"
                        disabled={isEditingLockedByPayments}
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateLineItem(invItems, setInvItems, idx, { unitPrice: Number(e.target.value) || 0 })
                        }
                        className="w-full px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-mono text-right text-[#0B0F19]"
                      />
                    </div>
                    <div className="sm:col-span-2 text-right font-mono text-xs font-bold text-[#0B0F19] px-1">
                      {formatINR(item.total)}
                    </div>
                    <div className="sm:col-span-1 flex items-center justify-end gap-0.5">
                      {!isEditingLockedByPayments && (
                        <>
                          <button
                            type="button"
                            onClick={() => moveLineItem(invItems, setInvItems, idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 text-[#64748B] hover:text-[#0B0F19] disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveLineItem(invItems, setInvItems, idx, 'down')}
                            disabled={idx === invItems.length - 1}
                            className="p-1 text-[#64748B] hover:text-[#0B0F19] disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          {invItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setInvItems(invItems.filter((_, i) => i !== idx))}
                              className="p-1 text-[#DC2626] hover:bg-[#FEF2F2] rounded cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals & Non-GST Notice */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#E2E8F0]">
              <div className="space-y-2">
                <label className="block font-mono text-[10px] uppercase text-[#64748B]">
                  Payment Terms & Non-GST Declaration
                </label>
                <input
                  type="text"
                  value={invPaymentTerms}
                  onChange={(e) => setInvPaymentTerms(e.target.value)}
                  placeholder="Payment terms..."
                  className="w-full px-3 py-1.5 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs text-[#0B0F19]"
                />
                <textarea
                  rows={2}
                  value={invNotes}
                  onChange={(e) => setInvNotes(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs text-[#475569]"
                />
                <div className="text-[11px] font-mono text-[#64748B] bg-[#F8F9FA] px-3 py-1.5 rounded-lg border border-[#E2E8F0]">
                  {financeSettings.gstEnabled
                    ? `GST Registered (${financeSettings.gstin || 'GSTIN'})`
                    : 'Non-GST Invoice: "GST not charged. Supplier is not registered under GST."'}
                </div>
              </div>

              <div className="bg-[#F8F9FA] border border-[#E2E8F0] rounded-2xl p-4 space-y-2.5">
                <div className="flex justify-between text-xs text-[#475569]">
                  <span>Subtotal</span>
                  <span className="font-mono font-bold text-[#0B0F19]">{formatINR(invSubtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-[#475569]">
                  <span>Discount (₹)</span>
                  <input
                    type="number"
                    min="0"
                    disabled={isEditingLockedByPayments}
                    value={invDiscount}
                    onChange={(e) => setInvDiscount(e.target.value)}
                    className="w-28 px-2.5 py-1 bg-white border border-[#E2E8F0] rounded-lg text-right font-mono text-xs text-[#0B0F19]"
                  />
                </div>
                <div className="flex justify-between text-sm font-bold text-[#0B0F19] pt-2 border-t border-[#E2E8F0]">
                  <span>Grand Total</span>
                  <span className="font-mono text-base text-[#2563EB]">{formatINR(invGrandTotal)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-[#E2E8F0]">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handlePreviewDraftInvoice}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#1D4ED8] text-xs font-bold cursor-pointer transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Preview A4 Document
                </button>
                {editingInv && (
                  <button
                    type="button"
                    onClick={() => openDeleteInvoiceModal(editingInv)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] text-xs font-bold cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Invoice
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsInvModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#475569] hover:bg-[#F8F9FA] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveInvoice('Draft')}
                  className="px-4 py-2 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F8F9FA] text-xs font-bold text-[#0B0F19] cursor-pointer"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveInvoice('Issued')}
                  className="px-5 py-2 rounded-xl bg-[#0B0F19] hover:bg-[#1E293B] text-white text-xs font-bold cursor-pointer"
                >
                  {editingInv ? 'Save & Update Invoice' : 'Issue Invoice'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 07. Record Payment Modal */}
      {paymentModalInv && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPaymentModalInv(null)}
        >
          <div
            className="bg-white border border-[#E2E8F0] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3.5">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#16A34A] font-bold">
                  07. RECORD INVOICE PAYMENT
                </span>
                <h3 className="text-lg font-bold text-[#0B0F19]">
                  {paymentModalInv.invoiceNumber} — {paymentModalInv.clientName}
                </h3>
              </div>
              <button
                onClick={() => setPaymentModalInv(null)}
                className="p-1.5 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl p-3 text-center">
              <div>
                <div className="font-mono text-[9px] uppercase text-[#64748B]">Invoice Total</div>
                <div className="font-mono text-xs font-bold text-[#0B0F19] mt-0.5">
                  {formatINR(paymentModalInv.amount)}
                </div>
              </div>
              <div>
                <div className="font-mono text-[9px] uppercase text-[#64748B]">Paid So Far</div>
                <div className="font-mono text-xs font-bold text-[#15803D] mt-0.5">
                  {formatINR(paymentModalInv.amountPaid || 0)}
                </div>
              </div>
              <div>
                <div className="font-mono text-[9px] uppercase text-[#64748B]">Remaining Due</div>
                <div className="font-mono text-xs font-bold text-[#B91C1C] mt-0.5">
                  {formatINR(paymentModalInv.balanceDue ?? paymentModalInv.amount)}
                </div>
              </div>
            </div>

            {payError && (
              <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{payError}</span>
              </div>
            )}

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                    Amount Received (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={payAmount}
                    onChange={(e) => {
                      setPayAmount(e.target.value);
                      setPayError(null);
                      setConfirmOverpayment(false);
                    }}
                    className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs font-mono font-bold text-[#0B0F19]"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs text-[#0B0F19]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as FinancePaymentMethod)}
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
                    UPI / Transaction Ref
                  </label>
                  <input
                    type="text"
                    value={payReference}
                    onChange={(e) => setPayReference(e.target.value)}
                    placeholder="UTR / UPI ID"
                    className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs font-mono text-[#0B0F19]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. Partial milestone 1 via GPay"
                  className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs text-[#0B0F19]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setPaymentModalInv(null)}
                  className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#475569] hover:bg-[#F8F9FA] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRecordingPay}
                  className="px-5 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {confirmOverpayment ? 'Confirm Overpayment' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Invoice Modal */}
      {cancelTargetInv && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setCancelTargetInv(null)}
        >
          <div
            className="bg-white border border-[#E2E8F0] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center shrink-0">
                <Ban className="w-5 h-5 text-[#DC2626]" />
              </div>
              <div>
                <h4 className="text-base font-bold text-[#0B0F19]">
                  Cancel Invoice {cancelTargetInv.invoiceNumber}?
                </h4>
                <p className="text-xs text-[#64748B] mt-1">
                  Cancelling an invoice excludes its unpaid balance from Outstanding Payments and Invoiced Revenue totals while preserving historical audit records.
                </p>
              </div>
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                Cancellation Reason
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Revised scope / Duplicate invoice"
                className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs text-[#0B0F19]"
              />
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E2E8F0]">
              <button
                onClick={() => setCancelTargetInv(null)}
                className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#475569] cursor-pointer"
              >
                Keep Invoice
              </button>
              <button
                onClick={handleConfirmCancelInvoice}
                className="px-4 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold cursor-pointer"
              >
                Confirm Cancel Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Invoice Confirmation Modal */}
      {deleteTargetInv && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setDeleteTargetInv(null)}
        >
          <div
            className="bg-white border border-[#E2E8F0] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-[#DC2626]" />
              </div>
              <div>
                <h4 className="text-base font-bold text-[#0B0F19]">
                  Delete Invoice {deleteTargetInv.invoiceNumber}?
                </h4>
                <p className="text-xs text-[#64748B] mt-1">
                  Permanently remove invoice <span className="font-mono font-bold text-[#0B0F19]">{deleteTargetInv.invoiceNumber}</span> for{' '}
                  <span className="font-bold text-[#0B0F19]">{deleteTargetInv.clientName}</span> ({formatINR(deleteTargetInv.amount)}).
                </p>
              </div>
            </div>

            <div className="space-y-2.5 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl p-3.5 text-xs">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteInvLinkedDocs}
                  onChange={(e) => setDeleteInvLinkedDocs(e.target.checked)}
                  className="mt-0.5 rounded border-[#CBD5E1]"
                />
                <span className="text-[#334155]">
                  Also remove archived PDF snapshots for <span className="font-mono font-bold">{deleteTargetInv.invoiceNumber}</span> from the Documents Library
                </span>
              </label>

              {payments.some(
                (p) => p.invoiceId === deleteTargetInv.id || p.invoiceNumber === deleteTargetInv.invoiceNumber
              ) && (
                <label className="flex items-start gap-2.5 cursor-pointer pt-2 border-t border-[#E2E8F0]">
                  <input
                    type="checkbox"
                    checked={deleteInvLinkedPayments}
                    onChange={(e) => setDeleteInvLinkedPayments(e.target.checked)}
                    className="mt-0.5 rounded border-[#CBD5E1]"
                  />
                  <span className="text-[#991B1B] font-medium">
                    Also delete payment records linked directly to this invoice (leave unchecked to preserve client payment history)
                  </span>
                </label>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setDeleteTargetInv(null)}
                className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#475569] hover:bg-[#F8F9FA] cursor-pointer"
              >
                Keep Invoice
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteInvoice}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Quotation Confirmation Modal */}
      {deleteTargetQuo && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setDeleteTargetQuo(null)}
        >
          <div
            className="bg-white border border-[#E2E8F0] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-[#DC2626]" />
              </div>
              <div>
                <h4 className="text-base font-bold text-[#0B0F19]">
                  Delete Quotation {deleteTargetQuo.quoteNumber}?
                </h4>
                <p className="text-xs text-[#64748B] mt-1">
                  Permanently remove quotation <span className="font-mono font-bold text-[#0B0F19]">{deleteTargetQuo.quoteNumber}</span> for{' '}
                  <span className="font-bold text-[#0B0F19]">{deleteTargetQuo.clientName}</span> ({formatINR(deleteTargetQuo.total)}).
                </p>
              </div>
            </div>

            <div className="bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl p-3.5 text-xs">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteQuoLinkedDocs}
                  onChange={(e) => setDeleteQuoLinkedDocs(e.target.checked)}
                  className="mt-0.5 rounded border-[#CBD5E1]"
                />
                <span className="text-[#334155]">
                  Also remove archived PDF snapshots for <span className="font-mono font-bold">{deleteTargetQuo.quoteNumber}</span> from the Documents Library
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setDeleteTargetQuo(null)}
                className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#475569] hover:bg-[#F8F9FA] cursor-pointer"
              >
                Keep Quotation
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteQuotation}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Quotation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Quotation Modal */}
      {isQuoModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setIsQuoModalOpen(false)}
        >
          <div
            className="bg-white border border-[#E2E8F0] rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#2563EB] font-bold">
                  10. CLIENT QUOTATION & ESTIMATE
                </span>
                <h3 className="text-lg font-bold text-[#0B0F19]">
                  {editingQuo ? `Edit Quotation ${editingQuo.quoteNumber}` : `New Quotation (${quoNumber})`}
                </h3>
              </div>
              <button
                onClick={() => setIsQuoModalOpen(false)}
                className="p-1.5 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                  Select Existing Client
                </label>
                <select
                  value={quoClientId}
                  onChange={(e) => handleSelectClientForQuotation(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs font-semibold text-[#0B0F19]"
                >
                  <option value="">-- Custom / New Client --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.businessName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                  Client Name *
                </label>
                <input
                  type="text"
                  value={quoClientName}
                  onChange={(e) => setQuoClientName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs font-bold text-[#0B0F19]"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                  Quotation Number *
                </label>
                <input
                  type="text"
                  value={quoNumber}
                  onChange={(e) => setQuoNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs font-mono font-bold text-[#2563EB]"
                />
              </div>
            </div>

            {/* Editable Client Contact & Address Details for Quotation */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                  Contact Person
                </label>
                <input
                  type="text"
                  value={quoContactPerson}
                  onChange={(e) => setQuoContactPerson(e.target.value)}
                  placeholder="Contact Name"
                  className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs text-[#0B0F19]"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                  Client Phone
                </label>
                <input
                  type="text"
                  value={quoClientPhone}
                  onChange={(e) => setQuoClientPhone(e.target.value)}
                  placeholder="+91..."
                  className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs text-[#0B0F19]"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                  Client Email
                </label>
                <input
                  type="email"
                  value={quoClientEmail}
                  onChange={(e) => setQuoClientEmail(e.target.value)}
                  placeholder="client@domain.com"
                  className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs text-[#0B0F19]"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                  City / Billing Address
                </label>
                <input
                  type="text"
                  value={quoClientAddress}
                  onChange={(e) => setQuoClientAddress(e.target.value)}
                  placeholder="Nanded, Maharashtra"
                  className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs text-[#0B0F19]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <div>
                <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                  Project Title
                </label>
                <input
                  type="text"
                  value={quoProjectTitle}
                  onChange={(e) => setQuoProjectTitle(e.target.value)}
                  placeholder="Website Design & Development"
                  className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs text-[#0B0F19]"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                  Package Subtitle
                </label>
                <input
                  type="text"
                  value={quoPackageSubtitle}
                  onChange={(e) => setQuoPackageSubtitle(e.target.value)}
                  placeholder="Professional Package"
                  className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs text-[#0B0F19]"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                  Issue Date
                </label>
                <input
                  type="date"
                  value={quoIssueDate}
                  onChange={(e) => setQuoIssueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs text-[#0B0F19]"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                  Valid Until
                </label>
                <input
                  type="date"
                  value={quoValidUntil}
                  onChange={(e) => setQuoValidUntil(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs text-[#0B0F19]"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                  Status
                </label>
                <select
                  value={quoStatus}
                  onChange={(e) => setQuoStatus(e.target.value as QuotationStatus)}
                  className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs font-bold text-[#0B0F19]"
                >
                  <option value="Draft">Draft</option>
                  <option value="Sent">Sent</option>
                  <option value="Accepted">Accepted</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Expired">Expired</option>
                </select>
              </div>
            </div>

            {/* Quotation Line Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#64748B] font-bold">
                  Proposed Deliverables & Pricing
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setQuoItems([
                      ...quoItems,
                      {
                        id: `q-item-${Date.now()}`,
                        serviceName: '',
                        description: '',
                        quantity: 1,
                        unitPrice: 5000,
                        total: 5000
                      }
                    ])
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#EFF6FF] text-[#2563EB] font-mono text-[10px] font-bold cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  Add Line Item
                </button>
              </div>

              {quoItems.map((item, idx) => (
                <div
                  key={item.id}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-3 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] items-center"
                >
                  <div className="sm:col-span-5 space-y-1">
                    <input
                      type="text"
                      value={item.serviceName}
                      onChange={(e) =>
                        updateLineItem(quoItems, setQuoItems, idx, { serviceName: e.target.value })
                      }
                      placeholder="Service / Deliverable title"
                      className="w-full px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-bold text-[#0B0F19]"
                    />
                    <input
                      type="text"
                      value={item.description || ''}
                      onChange={(e) =>
                        updateLineItem(quoItems, setQuoItems, idx, { description: e.target.value })
                      }
                      placeholder="Optional service description..."
                      className="w-full px-2.5 py-1 bg-white border border-[#E2E8F0] rounded-lg text-[11px] text-[#64748B]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        updateLineItem(quoItems, setQuoItems, idx, { quantity: Number(e.target.value) || 1 })
                      }
                      className="w-full px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-mono text-center text-[#0B0F19]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="number"
                      min="0"
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateLineItem(quoItems, setQuoItems, idx, { unitPrice: Number(e.target.value) || 0 })
                      }
                      className="w-full px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-mono text-right text-[#0B0F19]"
                    />
                  </div>
                  <div className="sm:col-span-2 text-right font-mono text-xs font-bold text-[#0B0F19] px-1">
                    {formatINR(item.total)}
                  </div>
                  <div className="sm:col-span-1 flex items-center justify-end gap-0.5">
                    <button
                      type="button"
                      onClick={() => moveLineItem(quoItems, setQuoItems, idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 text-[#64748B] hover:text-[#0B0F19] disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveLineItem(quoItems, setQuoItems, idx, 'down')}
                      disabled={idx === quoItems.length - 1}
                      className="p-1 text-[#64748B] hover:text-[#0B0F19] disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    {quoItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setQuoItems(quoItems.filter((_, i) => i !== idx))}
                        className="p-1 text-[#DC2626] hover:bg-[#FEF2F2] rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Quotation Terms, Notes & Totals */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#E2E8F0]">
              <div className="space-y-2">
                <label className="block font-mono text-[10px] uppercase text-[#64748B]">
                  Payment Terms & Notes
                </label>
                <input
                  type="text"
                  value={quoTerms}
                  onChange={(e) => setQuoTerms(e.target.value)}
                  placeholder="Payment terms / validity terms..."
                  className="w-full px-3 py-1.5 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs text-[#0B0F19]"
                />
                <textarea
                  rows={2}
                  value={quoNotes}
                  onChange={(e) => setQuoNotes(e.target.value)}
                  placeholder="Notes or Non-GST disclaimer..."
                  className="w-full px-3 py-1.5 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs text-[#475569]"
                />
              </div>

              <div className="bg-[#F8F9FA] border border-[#E2E8F0] rounded-2xl p-4 space-y-2.5">
                <div className="flex justify-between text-xs text-[#475569]">
                  <span>Subtotal</span>
                  <span className="font-mono font-bold text-[#0B0F19]">{formatINR(quoSubtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-[#475569]">
                  <span>Discount (₹)</span>
                  <input
                    type="number"
                    min="0"
                    value={quoDiscount}
                    onChange={(e) => setQuoDiscount(e.target.value)}
                    className="w-28 px-2.5 py-1 bg-white border border-[#E2E8F0] rounded-lg text-right font-mono text-xs text-[#0B0F19]"
                  />
                </div>
                <div className="flex justify-between text-sm font-bold text-[#0B0F19] pt-2 border-t border-[#E2E8F0]">
                  <span>Proposal Grand Total</span>
                  <span className="font-mono text-base text-[#2563EB]">{formatINR(quoGrandTotal)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-[#E2E8F0]">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handlePreviewDraftQuotation}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#1D4ED8] text-xs font-bold cursor-pointer transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Preview A4 Document
                </button>
                {editingQuo && (
                  <button
                    type="button"
                    onClick={() => openDeleteQuotationModal(editingQuo)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] text-xs font-bold cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Quotation
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuoModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#475569] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveQuotation()}
                  className="px-5 py-2 rounded-xl bg-[#0B0F19] hover:bg-[#1E293B] text-white text-xs font-bold cursor-pointer"
                >
                  Save Quotation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
