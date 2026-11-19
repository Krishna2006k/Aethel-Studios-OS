import React, { useState, useMemo } from 'react';
import {
  ClientLead,
  ClientInvoice,
  ClientQuotation,
  ClientPayment,
  GeneratedDocument,
  DocumentTemplate,
  FinanceSettings,
  FinanceDocumentType
} from '../../types';
import { formatINR } from '../../utils/calculations';
import { DEFAULT_DOCUMENT_TEMPLATES } from '../../utils/financeEngine';
import {
  FileText,
  Search,
  Eye,
  Download,
  Share2,
  CheckCircle2,
  Building2,
  CreditCard,
  Palette,
  Hash,
  Receipt,
  BookOpen,
  RotateCcw,
  Upload,
  Sparkles,
  Check,
  Trash2
} from 'lucide-react';
import {
  downloadDocumentFile,
  buildWhatsAppDocumentShareUrl,
  createSampleTestDocumentForTemplate
} from '../../utils/pdfDocumentEngine';

interface DocumentsAndSettingsProps {
  mode: 'documents' | 'settings';
  generatedDocuments: GeneratedDocument[];
  documentTemplates: DocumentTemplate[];
  financeSettings: FinanceSettings;
  invoices: ClientInvoice[];
  quotations: ClientQuotation[];
  payments: ClientPayment[];
  clients: ClientLead[];
  onPreviewDocument: (doc: GeneratedDocument) => void;
  onArchiveTestDocument?: (doc: GeneratedDocument) => void;
  onGenerateInvoiceDoc: (invoice: ClientInvoice) => void;
  onGenerateQuotationDoc: (quotation: ClientQuotation) => void;
  onGenerateReceiptDoc: (payment: ClientPayment, invoice?: ClientInvoice) => void;
  onGenerateStatementDoc: (client: ClientLead) => void;
  onUpdateFinanceSettings: (settings: FinanceSettings) => void;
  onUpdateDocumentTemplates?: (templates: DocumentTemplate[]) => void;
  onDeleteDocument?: (docId: string) => void;
}

export const DocumentsAndSettings: React.FC<DocumentsAndSettingsProps> = ({
  mode,
  generatedDocuments,
  documentTemplates,
  financeSettings,
  invoices,
  quotations,
  payments,
  clients,
  onPreviewDocument,
  onArchiveTestDocument,
  onGenerateInvoiceDoc,
  onGenerateQuotationDoc,
  onGenerateReceiptDoc,
  onGenerateStatementDoc,
  onUpdateFinanceSettings,
  onUpdateDocumentTemplates,
  onDeleteDocument
}) => {
  // Documents Library Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState<'ALL' | FinanceDocumentType>('ALL');
  const [clientFilter, setClientFilter] = useState<string>('ALL');
  const [quickGenClientId, setQuickGenClientId] = useState<string>(clients[0]?.id || '');

  // Finance Settings Form State
  const [formSettings, setFormSettings] = useState<FinanceSettings>(financeSettings);
  const [savedBanner, setSavedBanner] = useState(false);
  const [templateActionFeedback, setTemplateActionFeedback] = useState<string | null>(null);

  React.useEffect(() => {
    setFormSettings(financeSettings);
  }, [financeSettings]);

  const showTemplateToast = (msg: string) => {
    setTemplateActionFeedback(msg);
    setTimeout(() => setTemplateActionFeedback(null), 3500);
  };

  const filteredDocs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return generatedDocuments
      .filter((doc) => {
        if (docTypeFilter !== 'ALL' && doc.documentType !== docTypeFilter) return false;
        if (clientFilter !== 'ALL' && doc.clientId !== clientFilter) return false;
        if (!q) return true;
        return (
          doc.documentNumber.toLowerCase().includes(q) ||
          doc.clientName.toLowerCase().includes(q) ||
          doc.documentType.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.createdDate.localeCompare(a.createdDate));
  }, [generatedDocuments, searchQuery, docTypeFilter, clientFilter]);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateFinanceSettings(formSettings);
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 3500);
  };

  const handleSetTemplateAsDefault = (tpl: DocumentTemplate) => {
    const updatedSettings: FinanceSettings = {
      ...formSettings,
      defaultTemplateId: tpl.id,
      accentColor: tpl.accentColor,
      headerStyle: tpl.headerStyle
    };
    setFormSettings(updatedSettings);
    onUpdateFinanceSettings(updatedSettings);

    if (onUpdateDocumentTemplates) {
      const nextTemplates = documentTemplates.map((item) => ({
        ...item,
        isDefault: item.id === tpl.id || item.documentType === tpl.documentType
      }));
      onUpdateDocumentTemplates(nextTemplates);
    }
    showTemplateToast(`"${tpl.name}" set as default template for ${tpl.documentType || 'Documents'}.`);
  };

  const handlePreviewTemplate = (tpl: DocumentTemplate) => {
    const sampleDoc = createSampleTestDocumentForTemplate(tpl, formSettings);
    onPreviewDocument(sampleDoc);
  };

  const handleGenerateTestDocument = (tpl: DocumentTemplate) => {
    const sampleDoc = createSampleTestDocumentForTemplate(tpl, formSettings);
    if (onArchiveTestDocument) {
      onArchiveTestDocument(sampleDoc);
    } else {
      onPreviewDocument(sampleDoc);
    }
    showTemplateToast(`Generated and archived test ${sampleDoc.documentType} (${sampleDoc.documentNumber}) using "${tpl.name}".`);
  };

  const handleReplaceReferenceDesign = (tpl: DocumentTemplate, file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) return;
      if (onUpdateDocumentTemplates) {
        const nextTemplates = documentTemplates.map((item) =>
          item.id === tpl.id ? { ...item, referenceImageUrl: dataUrl } : item
        );
        onUpdateDocumentTemplates(nextTemplates);
      }
      showTemplateToast(`Updated reference design image for "${tpl.name}".`);
    };
    reader.readAsDataURL(file);
  };

  const handleRestoreConfiguredTemplate = (tpl: DocumentTemplate) => {
    const canonical =
      DEFAULT_DOCUMENT_TEMPLATES.find(
        (d) => d.id === tpl.id || d.documentType === tpl.documentType
      ) || DEFAULT_DOCUMENT_TEMPLATES[0];

    if (onUpdateDocumentTemplates) {
      const nextTemplates = documentTemplates.map((item) =>
        item.id === tpl.id ? { ...canonical, id: tpl.id } : item
      );
      onUpdateDocumentTemplates(nextTemplates);
    }
    showTemplateToast(`Restored "${tpl.name}" to official Aethel Studios reference configuration.`);
  };

  if (mode === 'documents') {
    return (
      <div className="space-y-6">
        {/* Header & Quick Document Generator Bar */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#2563EB] font-bold">
                14. DOCUMENTS LIBRARY & IMMUTABLE SNAPSHOT ARCHIVE
              </span>
              <h3 className="text-xl font-bold tracking-tight text-[#0B0F19] mt-0.5">
                Generated Quotations, Invoices, Receipts & Statements of Account
              </h3>
            </div>

            {/* 1-Click Statement of Account Generator */}
            {clients.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 bg-[#F8F9FA] border border-[#E2E8F0] p-2 rounded-xl">
                <select
                  value={quickGenClientId}
                  onChange={(e) => setQuickGenClientId(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#0B0F19]"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.businessName}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    const found = clients.find((c) => c.id === quickGenClientId) || clients[0];
                    if (found) onGenerateStatementDoc(found);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B0F19] hover:bg-[#1E293B] text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Generate Statement PDF (AS-S)
                </button>
              </div>
            )}
          </div>

          {/* Search & Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#F1F5F9]">
            <div className="relative">
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search AS-I-001, AS-R-001, AS-Q-001, client..."
                className="w-full pl-9 pr-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs text-[#0B0F19]"
              />
            </div>

            <select
              value={docTypeFilter}
              onChange={(e) => setDocTypeFilter(e.target.value as any)}
              className="px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs font-semibold text-[#0B0F19]"
            >
              <option value="ALL">All Document Types</option>
              <option value="Quotation">Quotations (AS-Q)</option>
              <option value="Invoice">Invoices (AS-I)</option>
              <option value="Payment Receipt">Payment Receipts (AS-R)</option>
              <option value="Statement of Account">Statements of Account (AS-S)</option>
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

        {/* Active Records Quick Snapshot Strip */}
        {(invoices.length > 0 || payments.length > 0 || quotations.length > 0) && (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs">
            <div className="font-mono text-[10px] uppercase tracking-wider text-[#64748B] font-bold mb-2.5">
              Quick Generate A4 Document From Active Records
            </div>
            <div className="flex flex-wrap gap-2">
              {invoices.slice(0, 4).map((inv) => (
                <button
                  key={inv.id}
                  onClick={() => onGenerateInvoiceDoc(inv)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] hover:bg-[#EFF6FF] hover:border-[#BFDBFE] text-xs font-semibold text-[#0B0F19] transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>{inv.invoiceNumber}</span>
                  <span className="text-[#64748B]">({inv.clientName})</span>
                </button>
              ))}
              {payments.slice(0, 4).map((pay) => {
                const inv = invoices.find((i) => i.id === pay.invoiceId);
                return (
                  <button
                    key={pay.id}
                    onClick={() => onGenerateReceiptDoc(pay, inv)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] hover:bg-[#F0FDF4] hover:border-[#BBF7D0] text-xs font-semibold text-[#0B0F19] transition-colors cursor-pointer"
                  >
                    <Receipt className="w-3.5 h-3.5 text-[#16A34A]" />
                    <span>{pay.receiptNumber || 'Receipt'}</span>
                    <span className="text-[#64748B]">({formatINR(pay.amountReceived)})</span>
                  </button>
                );
              })}
              {quotations.slice(0, 3).map((quo) => (
                <button
                  key={quo.id}
                  onClick={() => onGenerateQuotationDoc(quo)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] hover:bg-[#EFF6FF] text-xs font-semibold text-[#0B0F19] transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-[#0284C7]" />
                  <span>{quo.quoteNumber}</span>
                  <span className="text-[#64748B]">({quo.clientName})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Documents Archive Table */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden">
          {filteredDocs.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#F8F9FA] border border-[#E2E8F0] flex items-center justify-center mx-auto mb-3">
                <FileText className="w-5 h-5 text-[#64748B]" />
              </div>
              <h4 className="text-sm font-bold text-[#0B0F19]">No archived documents yet</h4>
              <p className="text-xs text-[#64748B] max-w-md mx-auto mt-1">
                Every time you generate an Invoice PDF, Quotation PDF, Payment Receipt, or Statement of Account, an immutable versioned snapshot is archived here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8F9FA] font-mono text-[10px] uppercase tracking-wider text-[#64748B]">
                    <th className="py-3.5 px-4">Document #</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Client</th>
                    <th className="py-3.5 px-4">Created Date</th>
                    <th className="py-3.5 px-4 text-right">Amount</th>
                    <th className="py-3.5 px-4">Status / Version</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] text-xs">
                  {filteredDocs.map((doc) => {
                    const waUrl = buildWhatsAppDocumentShareUrl(doc, financeSettings);
                    return (
                      <tr key={doc.id} className="hover:bg-[#F8F9FA]/70 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#2563EB] whitespace-nowrap">
                          {doc.documentNumber}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="px-2.5 py-0.5 rounded-md bg-[#F1F5F9] text-[#0B0F19] font-mono text-[10px] font-bold">
                            {doc.documentType}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-[#0B0F19]">{doc.clientName}</td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-[#475569] whitespace-nowrap">
                          {doc.createdDate}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-[#0B0F19] whitespace-nowrap">
                          {formatINR(doc.amount)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-[#DCFCE7] text-[#15803D] font-mono text-[10px] font-bold mr-1.5">
                            {doc.status}
                          </span>
                          <span className="font-mono text-[10px] text-[#64748B]">v{doc.version}</span>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => onPreviewDocument(doc)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#1D4ED8] font-mono text-[10px] font-bold transition-colors cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              View A4 PDF
                            </button>
                            <button
                              onClick={() =>
                                downloadDocumentFile(
                                  doc,
                                  financeSettings,
                                  documentTemplates,
                                  payments
                                )
                              }
                              title="Download Standalone Document"
                              className="p-1.5 rounded-lg text-[#475569] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Share via WhatsApp"
                              className="p-1.5 rounded-lg text-[#15803D] hover:bg-[#DCFCE7] transition-colors"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </a>
                            {onDeleteDocument && (
                              <button
                                onClick={() => onDeleteDocument(doc.id)}
                                title="Delete Archived Document"
                                className="p-1.5 rounded-lg text-[#DC2626] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
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
      </div>
    );
  }

  // Mode 2: Finance Settings & Section 8 Document Template Management
  return (
    <form onSubmit={handleSaveSettings} className="space-y-6">
      {savedBanner && (
        <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-2xl p-4 flex items-center gap-3 text-xs font-bold text-[#15803D]">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Finance Settings, Non-GST Compliance & Document Template Preferences Saved.</span>
        </div>
      )}

      {templateActionFeedback && (
        <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl p-4 flex items-center gap-3 text-xs font-bold text-[#1D4ED8]">
          <Check className="w-4 h-4 shrink-0" />
          <span>{templateActionFeedback}</span>
        </div>
      )}

      {/* Section 8: Document Template Management */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#2563EB] font-bold">
                DOCUMENT TEMPLATES • APPROVED AETHEL STUDIOS IDENTITY
              </span>
              <h3 className="text-base font-bold text-[#0B0F19]">
                Dynamic Quotation, Invoice & Payment Receipt A4 Templates
              </h3>
            </div>
          </div>
          <span className="px-3 py-1 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] font-mono text-[10px] text-[#475569] font-bold">
            3 Active Templates Configured
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {documentTemplates.map((tpl) => {
            const isDefault =
              formSettings.defaultTemplateId === tpl.id || Boolean(tpl.isDefault);
            const docTypeBadge =
              tpl.documentType ||
              (tpl.id.includes('quotation')
                ? 'Quotation'
                : tpl.id.includes('receipt')
                  ? 'Payment Receipt'
                  : 'Invoice');

            return (
              <div
                key={tpl.id}
                className={`rounded-2xl border-2 transition-all flex flex-col justify-between overflow-hidden ${
                  isDefault
                    ? 'border-[#2563EB] bg-[#EFF6FF]/25 shadow-xs'
                    : 'border-[#E2E8F0] bg-white'
                }`}
              >
                {/* Reference Design Visual Preview Header */}
                <div>
                  <div className="relative h-44 bg-[#0B1325] border-b border-[#E2E8F0] overflow-hidden flex items-center justify-center p-3">
                    {tpl.referenceImageUrl ? (
                      <img
                        src={tpl.referenceImageUrl}
                        alt={`${tpl.name} Reference`}
                        className="h-full w-auto object-contain rounded-lg shadow-md border border-white/15"
                      />
                    ) : (
                      <div className="text-xs font-mono text-white/70">
                        {tpl.name}
                      </div>
                    )}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-md bg-[#0B1325]/90 backdrop-blur-xs text-white border border-white/15 font-mono text-[10px] font-bold">
                        {docTypeBadge}
                      </span>
                    </div>
                    <div className="absolute top-2.5 right-2.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-md font-mono text-[9px] font-bold uppercase ${
                          tpl.isActive !== false
                            ? 'bg-[#16A34A] text-white'
                            : 'bg-[#64748B] text-white'
                        }`}
                      >
                        {isDefault ? 'Active • Default' : 'Active'}
                      </span>
                    </div>
                  </div>

                  {/* Template Info */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-sm text-[#0B0F19]">{tpl.name}</h4>
                      <span
                        className="w-4 h-4 rounded-full border border-white shadow-xs shrink-0"
                        style={{ backgroundColor: tpl.accentColor }}
                        title={`Accent: ${tpl.accentColor}`}
                      />
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-mono text-[#475569]">
                      <span>Type: <strong>{docTypeBadge}</strong></span>
                      <span>•</span>
                      <span>Font: <strong>{tpl.fontFamily}</strong></span>
                    </div>
                    <p className="text-xs text-[#64748B] leading-relaxed">
                      {tpl.description}
                    </p>
                  </div>
                </div>

                {/* Template Management Actions (Section 8) */}
                <div className="p-4 pt-0 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handlePreviewTemplate(tpl)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#0B0F19] hover:bg-[#1E293B] text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Preview Template
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGenerateTestDocument(tpl)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#1D4ED8] text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Generate Test Doc
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleSetTemplateAsDefault(tpl)}
                      className={`inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-colors cursor-pointer ${
                        formSettings.defaultTemplateId === tpl.id
                          ? 'border-[#2563EB] bg-[#2563EB] text-white'
                          : 'border-[#E2E8F0] bg-[#F8F9FA] hover:bg-[#F1F5F9] text-[#0B0F19]'
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      {formSettings.defaultTemplateId === tpl.id ? 'Default Active' : 'Set as Default'}
                    </button>

                    <label className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] hover:bg-[#F1F5F9] text-[#0B0F19] text-[11px] font-bold transition-colors cursor-pointer">
                      <Upload className="w-3 h-3 text-[#2563EB]" />
                      <span>Replace Design</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handleReplaceReferenceDesign(tpl, e.target.files?.[0])
                        }
                      />
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRestoreConfiguredTemplate(tpl)}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E2E8F0] hover:bg-[#F8F9FA] text-[#64748B] hover:text-[#0B0F19] text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Restore Configured Template
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Studio Details & Payment Instructions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-[#F1F5F9] pb-3">
            <Building2 className="w-4 h-4 text-[#2563EB]" />
            <h4 className="text-sm font-bold text-[#0B0F19]">Studio Identity & Co-Founders</h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                Studio Name
              </label>
              <input
                type="text"
                value={formSettings.studioName}
                onChange={(e) => setFormSettings({ ...formSettings, studioName: e.target.value })}
                className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs font-bold text-[#0B0F19]"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                Tagline / Subtitle
              </label>
              <input
                type="text"
                value={formSettings.tagline || 'Digital experiences. Thoughtfully crafted.'}
                onChange={(e) => setFormSettings({ ...formSettings, tagline: e.target.value })}
                className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs text-[#0B0F19]"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                Co-Founder 1
              </label>
              <input
                type="text"
                value={formSettings.contactPerson1}
                onChange={(e) => setFormSettings({ ...formSettings, contactPerson1: e.target.value })}
                className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs text-[#0B0F19]"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                Co-Founder 2
              </label>
              <input
                type="text"
                value={formSettings.contactPerson2}
                onChange={(e) => setFormSettings({ ...formSettings, contactPerson2: e.target.value })}
                className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs text-[#0B0F19]"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                Official Email
              </label>
              <input
                type="email"
                value={formSettings.email}
                onChange={(e) => setFormSettings({ ...formSettings, email: e.target.value })}
                className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs text-[#0B0F19]"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                Studio Address
              </label>
              <input
                type="text"
                value={formSettings.address}
                onChange={(e) => setFormSettings({ ...formSettings, address: e.target.value })}
                className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs text-[#0B0F19]"
              />
            </div>
          </div>
        </div>

        {/* Payment Details & GST Configuration */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-[#F1F5F9] pb-3">
            <CreditCard className="w-4 h-4 text-[#2563EB]" />
            <h4 className="text-sm font-bold text-[#0B0F19]">Payment Details & Non-GST Configuration</h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                Studio UPI ID
              </label>
              <input
                type="text"
                value={formSettings.upiId}
                onChange={(e) => setFormSettings({ ...formSettings, upiId: e.target.value })}
                className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs font-mono font-bold text-[#0B0F19]"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                Website Domain
              </label>
              <input
                type="text"
                value={formSettings.website || 'aethelstudios.in'}
                onChange={(e) => setFormSettings({ ...formSettings, website: e.target.value })}
                className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs text-[#0B0F19]"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                GST Registration Status
              </label>
              <select
                value={formSettings.gstRegistrationStatus}
                onChange={(e) => {
                  const status = e.target.value as 'Unregistered' | 'Registered';
                  setFormSettings({
                    ...formSettings,
                    gstRegistrationStatus: status,
                    gstEnabled: status === 'Registered'
                  });
                }}
                className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs font-bold text-[#0B0F19]"
              >
                <option value="Unregistered">Unregistered (Non-GST Default)</option>
                <option value="Registered">GST Registered</option>
              </select>
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase text-[#64748B] mb-1">
                Non-GST Document Note
              </label>
              <input
                type="text"
                value={formSettings.gstDisclaimer}
                onChange={(e) =>
                  setFormSettings({ ...formSettings, gstDisclaimer: e.target.value })
                }
                className="w-full px-3 py-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-xs text-[#0B0F19]"
              />
            </div>
          </div>

          {/* Document Numbering Prefixes */}
          <div className="pt-2 border-t border-[#F1F5F9]">
            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase text-[#64748B] mb-2">
              <Hash className="w-3.5 h-3.5" />
              Sequential Document Numbering Prefixes
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <span className="text-[10px] text-[#64748B] block">Invoice</span>
                <input
                  type="text"
                  value={formSettings.invoicePrefix}
                  onChange={(e) =>
                    setFormSettings({ ...formSettings, invoicePrefix: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 bg-[#F8F9FA] border border-[#E2E8F0] rounded-lg font-mono text-xs font-bold"
                />
              </div>
              <div>
                <span className="text-[10px] text-[#64748B] block">Receipt</span>
                <input
                  type="text"
                  value={formSettings.receiptPrefix}
                  onChange={(e) =>
                    setFormSettings({ ...formSettings, receiptPrefix: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 bg-[#F8F9FA] border border-[#E2E8F0] rounded-lg font-mono text-xs font-bold"
                />
              </div>
              <div>
                <span className="text-[10px] text-[#64748B] block">Quotation</span>
                <input
                  type="text"
                  value={formSettings.quotationPrefix}
                  onChange={(e) =>
                    setFormSettings({ ...formSettings, quotationPrefix: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 bg-[#F8F9FA] border border-[#E2E8F0] rounded-lg font-mono text-xs font-bold"
                />
              </div>
              <div>
                <span className="text-[10px] text-[#64748B] block">Statement</span>
                <input
                  type="text"
                  value={formSettings.statementPrefix}
                  onChange={(e) =>
                    setFormSettings({ ...formSettings, statementPrefix: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 bg-[#F8F9FA] border border-[#E2E8F0] rounded-lg font-mono text-xs font-bold"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="px-6 py-2.5 rounded-xl bg-[#0B0F19] hover:bg-[#1E293B] text-white text-xs font-bold cursor-pointer shadow-xs"
        >
          Save Finance & Document Settings
        </button>
      </div>
    </form>
  );
};
