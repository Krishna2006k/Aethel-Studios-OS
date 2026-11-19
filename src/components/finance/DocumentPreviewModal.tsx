import React, { useState } from 'react';
import {
  X,
  Printer,
  Download,
  Share2,
  FileText,
  History,
  Check,
  Palette,
} from 'lucide-react';
import {
  ClientPayment,
  DocumentTemplate,
  FinanceSettings,
  GeneratedDocument,
} from '../../types';
import {
  buildWhatsAppDocumentShareUrl,
  downloadDocumentFile,
  renderDocumentToA4Html,
  triggerPrintA4Document,
} from '../../utils/pdfDocumentEngine';
import {
  DEFAULT_DOCUMENT_TEMPLATES,
  DEFAULT_FINANCE_SETTINGS,
} from '../../utils/financeEngine';
import { formatINR } from '../../utils/calculations';

interface DocumentPreviewModalProps {
  document: GeneratedDocument | null;
  allDocuments?: GeneratedDocument[];
  settings?: FinanceSettings;
  templates?: DocumentTemplate[];
  payments?: ClientPayment[];
  clientPhone?: string;
  onClose: () => void;
  onSelectVersion?: (doc: GeneratedDocument) => void;
  onChangeTemplate?: (docId: string, templateId: string) => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  document: activeDoc,
  allDocuments = [],
  settings = DEFAULT_FINANCE_SETTINGS,
  templates = DEFAULT_DOCUMENT_TEMPLATES,
  payments = [],
  clientPhone,
  onClose,
  onSelectVersion,
  onChangeTemplate,
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    activeDoc?.templateId || settings.defaultTemplateId || 'tpl-aethel-editorial'
  );
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (activeDoc?.templateId) {
      setSelectedTemplateId(activeDoc.templateId);
    }
  }, [activeDoc?.id, activeDoc?.templateId]);

  if (!activeDoc) return null;

  const docWithTemplate: GeneratedDocument = {
    ...activeDoc,
    templateId: selectedTemplateId || activeDoc.templateId,
  };

  const htmlPreview = renderDocumentToA4Html(
    docWithTemplate,
    settings,
    templates,
    payments
  );

  // Find all versions of this document
  const relatedVersions = allDocuments
    .filter(
      (d) =>
        d.documentNumber === activeDoc.documentNumber ||
        (activeDoc.invoiceId &&
          d.invoiceId === activeDoc.invoiceId &&
          d.documentType === activeDoc.documentType) ||
        (activeDoc.quotationId &&
          d.quotationId === activeDoc.quotationId &&
          d.documentType === activeDoc.documentType)
    )
    .sort((a, b) => (b.version || 1) - (a.version || 1));

  const handlePrintPdf = () => {
    triggerPrintA4Document(docWithTemplate, settings, templates, payments);
    setToastMsg('Opened A4 PDF print/save dialog.');
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleDownload = () => {
    downloadDocumentFile(docWithTemplate, settings, templates, payments);
    setToastMsg(`Downloaded ${activeDoc.documentNumber} A4 document.`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const whatsappUrl = buildWhatsAppDocumentShareUrl(
    docWithTemplate,
    settings,
    clientPhone
  );

  return (
    <div className="fixed inset-0 z-[90] bg-[#0B0F19]/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-3xl border border-[#EAECEF] max-w-5xl w-full h-[92vh] flex flex-col justify-between shadow-2xl overflow-hidden">
        {/* Top Action Bar */}
        <div className="bg-[#0B0F19] text-white px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#2563EB] flex items-center justify-center font-bold">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#60A5FA]">
                  A4 DOCUMENT ENGINE · {activeDoc.documentType.toUpperCase()}
                </span>
                <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-mono font-bold text-white">
                  v{activeDoc.version || 1}
                </span>
              </div>
              <div className="text-sm sm:text-base font-extrabold flex items-center gap-2">
                <span className="font-mono">{activeDoc.documentNumber}</span>
                <span>·</span>
                <span>{activeDoc.clientName}</span>
                <span className="text-[#34D399] font-mono">
                  ({formatINR(activeDoc.amount)})
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Canva-Inspired Template Selector */}
            <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1.5 rounded-xl border border-white/15">
              <Palette className="w-3.5 h-3.5 text-[#60A5FA]" />
              <select
                aria-label="Select Document Template"
                value={selectedTemplateId}
                onChange={(e) => {
                  setSelectedTemplateId(e.target.value);
                  if (onChangeTemplate) {
                    onChangeTemplate(activeDoc.id, e.target.value);
                  }
                }}
                className="bg-transparent text-white text-xs font-bold focus:outline-none cursor-pointer"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id} className="text-[#0B0F19]">
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handlePrintPdf}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold cursor-pointer transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save A4 PDF</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share via WhatsApp</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close document preview"
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Version History Bar if multiple versions exist */}
        {relatedVersions.length > 1 && (
          <div className="bg-[#F8F9FA] border-b border-[#EAECEF] px-6 py-2 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-[#475569] font-semibold">
              <History className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Preserved Immutable Document Versions:</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {relatedVersions.map((ver) => (
                <button
                  key={ver.id}
                  type="button"
                  onClick={() => onSelectVersion && onSelectVersion(ver)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold cursor-pointer ${
                    ver.id === activeDoc.id
                      ? 'bg-[#0B0F19] text-white'
                      : 'bg-white border border-[#EAECEF] text-[#475569] hover:border-[#2563EB]'
                  }`}
                >
                  v{ver.version} ({ver.createdDate} · {formatINR(ver.amount)})
                </button>
              ))}
            </div>
          </div>
        )}

        {toastMsg && (
          <div className="bg-[#ECFDF5] border-b border-[#A7F3D0] px-6 py-2 text-xs font-bold text-[#059669] flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Embedded A4 Sheet Preview */}
        <div className="flex-1 bg-[#E2E8F0] p-3 sm:p-6 overflow-y-auto flex justify-center items-start">
          <div className="w-full max-w-[210mm] bg-white rounded-2xl shadow-xl overflow-hidden border border-[#CBD5E1] shrink-0">
            <iframe
              title={`A4 Preview ${activeDoc.documentNumber}`}
              srcDoc={htmlPreview}
              className="w-full h-[1125px] border-0 block"
            />
          </div>
        </div>

        {/* Bottom Status Bar */}
        <div className="bg-white border-t border-[#EAECEF] px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#64748B]">
          <div>
            <span>
              Non-GST Compliance Active:{' '}
              <strong className="text-[#0B0F19]">
                &ldquo;{settings.gstDisclaimer}&rdquo;
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono">
              Issued documents retain their original snapshot data permanently.
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-[#0B0F19] text-white text-xs font-bold cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
