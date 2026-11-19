import {
  ClientInvoice,
  ClientPayment,
  ClientQuotation,
  DocumentTemplate,
  FinanceSettings,
  GeneratedDocument,
  InvoiceLineItem,
} from '../types';
import { formatINR } from './calculations';
import {
  ClientFinancialProfileSummary,
  DEFAULT_DOCUMENT_TEMPLATES,
  DEFAULT_FINANCE_SETTINGS,
  numberToIndianRupeesWords,
} from './financeEngine';
import {
  AETHEL_LOGO_BADGE_DATA_URI,
  AETHEL_LOGO_DARK_DATA_URI,
  AETHEL_LOGO_WHITE_DATA_URI,
  AETHEL_STAMP_BLUE_DATA_URI,
} from './aethelLogoAssets';

function escapeHtml(str?: string | number): string {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Formats an ISO date string (YYYY-MM-DD) into "19 Nov 2026" as shown in the approved Aethel Studios templates.
 */
export function formatEditorialDate(dateStr?: string): string {
  if (!dateStr) return '';
  const trimmed = String(dateStr).trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return trimmed;
  const year = Number(match[1]);
  const monthIdx = Number(match[2]) - 1;
  const day = Number(match[3]);
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  if (monthIdx < 0 || monthIdx > 11) return trimmed;
  return `${day} ${months[monthIdx]} ${year}`;
}

/**
 * Splits a project title such as "Website Design & Development — Professional Package"
 * into primary project title and package subtitle.
 */
function parseProjectAndPackage(
  rawProjectTitle?: string,
  explicitSubtitle?: string
): { projectTitle: string; packageSubtitle: string } {
  const cleanTitle = (rawProjectTitle || 'Website Design & Development').trim();
  if (explicitSubtitle && explicitSubtitle.trim()) {
    return { projectTitle: cleanTitle, packageSubtitle: explicitSubtitle.trim() };
  }
  const separators = [' — ', ' - ', ' · ', ' | '];
  for (const sep of separators) {
    if (cleanTitle.includes(sep)) {
      const parts = cleanTitle.split(sep).map((s) => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        return {
          projectTitle: parts[0],
          packageSubtitle: parts.slice(1).join(' · '),
        };
      }
    }
  }
  return {
    projectTitle: cleanTitle,
    packageSubtitle: 'Bespoke Digital Package',
  };
}

// ============================================================================
// 7. CLEAN STRUCTURED TEMPLATE-DATA LAYER
// Maps raw Finance records into strongly typed models before rendering HTML/PDF.
// ============================================================================

export interface StructuredStudioIdentity {
  studioName: string;
  tagline: string;
  address: string;
  email: string;
  website: string;
  contactPerson1: string;
  phone1: string;
  contactPerson2: string;
  phone2: string;
  combinedPhones: string;
  upiId: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  gstDisclaimer: string;
}

export interface StructuredClientContext {
  clientId?: string;
  businessName: string;
  contactPerson: string;
  address: string;
  email: string;
  phone: string;
}

export interface StructuredProjectContext {
  projectTitle: string;
  packageSubtitle: string;
}

export interface StructuredInvoiceTemplateData {
  studio: StructuredStudioIdentity;
  client: StructuredClientContext;
  project: StructuredProjectContext;
  invoice: {
    id: string;
    invoiceNumber: string;
    issueDate: string;
    issueDateFormatted: string;
    dueDate: string;
    dueDateFormatted: string;
    status: string;
    paymentTerms: string;
    notes: string;
    version: number;
  };
  items: InvoiceLineItem[];
  totals: {
    subtotal: number;
    discount: number;
    grandTotal: number;
    amountInWords: string;
  };
  paymentSummary: {
    amountReceived: number;
    outstandingBalance: number;
    hasPayments: boolean;
    payments: ClientPayment[];
  };
  paymentDetails: {
    upiId: string;
    phoneDisplay: string;
    bankDisplay: string;
  };
  settings: FinanceSettings;
}

export interface StructuredQuotationTemplateData {
  studio: StructuredStudioIdentity;
  client: StructuredClientContext;
  project: StructuredProjectContext;
  quotation: {
    id: string;
    quotationNumber: string;
    issueDate: string;
    issueDateFormatted: string;
    validUntil: string;
    validUntilFormatted: string;
    status: string;
    paymentTerms: string;
    notes: string;
    termsAndConditions: string;
    version: number;
  };
  items: InvoiceLineItem[];
  totals: {
    subtotal: number;
    discount: number;
    grandTotal: number;
    amountInWords: string;
  };
  paymentDetails: {
    upiId: string;
    phoneDisplay: string;
    bankDisplay: string;
  };
  settings: FinanceSettings;
}

export interface StructuredReceiptTemplateData {
  studio: StructuredStudioIdentity;
  client: StructuredClientContext;
  project: StructuredProjectContext;
  receipt: {
    id: string;
    receiptNumber: string;
    paymentDate: string;
    paymentDateFormatted: string;
    invoiceNumber: string;
    paymentMethod: string;
    transactionReference: string;
    paymentDescription: string;
    milestone: string;
    version: number;
  };
  paymentSummary: {
    amountReceivedThisTxn: number;
    amountInWords: string;
    totalProjectOrInvoiceValue: number;
    totalReceivedToDate: number;
    remainingOutstandingBalance: number;
  };
  settings: FinanceSettings;
}

export function buildStructuredStudioIdentity(
  settings: FinanceSettings = DEFAULT_FINANCE_SETTINGS
): StructuredStudioIdentity {
  const s = { ...DEFAULT_FINANCE_SETTINGS, ...settings };
  const disclaimer =
    s.gstRegistrationStatus === 'Unregistered' || !s.gstEnabled
      ? s.gstDisclaimer || 'GST not charged. Supplier is not registered under GST.'
      : `GSTIN: ${s.gstin} · Tax Rate: ${s.gstRatePercent}%`;

  const phones = [s.phone1, s.phone2].map((p) => (p || '').trim()).filter(Boolean);

  return {
    studioName: s.studioName || 'Aethel Studios',
    tagline: 'DIGITAL EXPERIENCES. THOUGHTFULLY CRAFTED.',
    address: s.address || 'Nanded, Maharashtra',
    email: s.email || 'hello@aethelstudios.in',
    website: (s.website || 'aethelstudios.in').replace(/^https?:\/\//, ''),
    contactPerson1: s.contactPerson1 || 'Krishna Khakole',
    phone1: s.phone1 || '+91 9309970761',
    contactPerson2: s.contactPerson2 || 'Vansh Khakole',
    phone2: s.phone2 || '+91 9763274410',
    combinedPhones: phones.join(' / ') || '+91 9309970761 / +91 9763274410',
    upiId: s.upiId || 'aethelstudios@okicici',
    bankName: s.bankName || '',
    bankAccountName: s.bankAccountName || s.studioName || 'Aethel Studios',
    bankAccountNumber: s.bankAccountNumber || '',
    bankIfsc: s.bankIfsc || '',
    gstDisclaimer: disclaimer,
  };
}

export function mapInvoiceToTemplateData(
  doc: GeneratedDocument,
  settings: FinanceSettings = DEFAULT_FINANCE_SETTINGS,
  allPayments: ClientPayment[] = []
): StructuredInvoiceTemplateData {
  const studio = buildStructuredStudioIdentity(settings);
  const inv = (doc.snapshotPayload || {}) as unknown as ClientInvoice;

  const rawItems =
    inv.lineItems && inv.lineItems.length > 0
      ? inv.lineItems
      : [
          {
            id: 'item-1',
            serviceName: inv.projectTitle || doc.projectTitle || 'Website Design & Development',
            description: inv.notes || '',
            quantity: 1,
            unitPrice: Number(inv.amount ?? doc.amount) || 0,
            total: Number(inv.amount ?? doc.amount) || 0,
          },
        ];

  const items: InvoiceLineItem[] = rawItems.map((item, idx) => {
    const qty = Math.max(0, Number(item.quantity) || 0);
    const unitPrice = Math.max(0, Number(item.unitPrice) || 0);
    const total = Math.max(0, Number(item.total) || Math.round(qty * unitPrice));
    return {
      id: item.id || `item-${idx + 1}`,
      serviceName: item.serviceName || 'Digital Service',
      description: item.description || '',
      quantity: qty,
      unitPrice,
      total,
    };
  });

  const subtotal =
    inv.subtotal !== undefined
      ? Math.max(0, Number(inv.subtotal))
      : items.reduce((sum, i) => sum + i.total, 0);
  const discount = Math.max(0, Number(inv.discount) || 0);
  const grandTotal =
    inv.amount !== undefined
      ? Math.max(0, Number(inv.amount))
      : Math.max(0, subtotal - discount);

  const invoiceNumber = inv.invoiceNumber || doc.documentNumber || 'AS-I-001';
  const linkedPayments = allPayments.filter(
    (p) =>
      (inv.id && p.invoiceId === inv.id) ||
      (invoiceNumber && p.invoiceNumber === invoiceNumber)
  );

  const paidFromPayments = linkedPayments.reduce(
    (sum, p) => sum + (Math.max(0, Number(p.amountReceived)) || 0),
    0
  );
  const amountReceived =
    inv.amountPaid !== undefined
      ? Math.max(0, Number(inv.amountPaid))
      : paidFromPayments;
  const outstandingBalance =
    inv.balanceDue !== undefined
      ? Math.max(0, Number(inv.balanceDue))
      : Math.max(0, grandTotal - amountReceived);

  const projectParsed = parseProjectAndPackage(
    inv.projectTitle || doc.projectTitle,
    inv.packageSubtitle
  );

  const bankParts = [
    studio.bankName,
    studio.bankAccountNumber ? `A/C: ${studio.bankAccountNumber}` : '',
    studio.bankIfsc ? `IFSC: ${studio.bankIfsc}` : '',
  ].filter(Boolean);

  return {
    studio,
    client: {
      clientId: inv.clientId || doc.clientId,
      businessName: inv.clientName || doc.clientName || 'Valued Client',
      contactPerson: inv.clientContactPerson || '',
      address: inv.clientAddress || '',
      email: inv.clientEmail || '',
      phone: inv.clientPhone || '',
    },
    project: projectParsed,
    invoice: {
      id: inv.id || doc.invoiceId || doc.id,
      invoiceNumber,
      issueDate: inv.issueDate || doc.createdDate,
      issueDateFormatted: formatEditorialDate(inv.issueDate || doc.createdDate),
      dueDate: inv.dueDate || doc.createdDate,
      dueDateFormatted: formatEditorialDate(inv.dueDate || doc.createdDate),
      status: inv.status || doc.status || 'Issued',
      paymentTerms: inv.paymentTerms || '50% Advance · 50% Prior to Production Go-Live',
      notes:
        inv.notes && inv.notes !== studio.gstDisclaimer
          ? inv.notes
          : '',
      version: inv.version || doc.version || 1,
    },
    items,
    totals: {
      subtotal,
      discount,
      grandTotal,
      amountInWords: numberToIndianRupeesWords(grandTotal),
    },
    paymentSummary: {
      amountReceived,
      outstandingBalance,
      hasPayments: amountReceived > 0 || linkedPayments.length > 0,
      payments: linkedPayments,
    },
    paymentDetails: {
      upiId: studio.upiId,
      phoneDisplay: studio.combinedPhones,
      bankDisplay: bankParts.join(' · '),
    },
    settings,
  };
}

export function mapQuotationToTemplateData(
  doc: GeneratedDocument,
  settings: FinanceSettings = DEFAULT_FINANCE_SETTINGS
): StructuredQuotationTemplateData {
  const studio = buildStructuredStudioIdentity(settings);
  const q = (doc.snapshotPayload || {}) as unknown as ClientQuotation;

  const rawItems =
    q.lineItems && q.lineItems.length > 0
      ? q.lineItems
      : [
          {
            id: 'q-item-1',
            serviceName: q.projectTitle || doc.projectTitle || 'Website Design & Development',
            description: q.notes || '',
            quantity: 1,
            unitPrice: Number(q.total ?? doc.amount) || 0,
            total: Number(q.total ?? doc.amount) || 0,
          },
        ];

  const items: InvoiceLineItem[] = rawItems.map((item, idx) => {
    const qty = Math.max(0, Number(item.quantity) || 0);
    const unitPrice = Math.max(0, Number(item.unitPrice) || 0);
    const total = Math.max(0, Number(item.total) || Math.round(qty * unitPrice));
    return {
      id: item.id || `q-item-${idx + 1}`,
      serviceName: item.serviceName || 'Proposed Service',
      description: item.description || '',
      quantity: qty,
      unitPrice,
      total,
    };
  });

  const subtotal =
    q.subtotal !== undefined
      ? Math.max(0, Number(q.subtotal))
      : items.reduce((sum, i) => sum + i.total, 0);
  const discount = Math.max(0, Number(q.discount) || 0);
  const grandTotal =
    q.total !== undefined
      ? Math.max(0, Number(q.total))
      : Math.max(0, subtotal - discount);

  const projectParsed = parseProjectAndPackage(
    q.projectTitle || doc.projectTitle,
    q.packageSubtitle
  );

  const bankParts = [
    studio.bankName,
    studio.bankAccountNumber ? `A/C: ${studio.bankAccountNumber}` : '',
    studio.bankIfsc ? `IFSC: ${studio.bankIfsc}` : '',
  ].filter(Boolean);

  return {
    studio,
    client: {
      clientId: q.clientId || doc.clientId,
      businessName: q.clientName || doc.clientName || 'Valued Client',
      contactPerson: q.clientContactPerson || '',
      address: q.clientAddress || '',
      email: q.clientEmail || '',
      phone: q.clientPhone || '',
    },
    project: projectParsed,
    quotation: {
      id: q.id || doc.quotationId || doc.id,
      quotationNumber: q.quoteNumber || doc.documentNumber || 'AS-Q-001',
      issueDate: q.date || doc.createdDate,
      issueDateFormatted: formatEditorialDate(q.date || doc.createdDate),
      validUntil: q.validUntil || doc.createdDate,
      validUntilFormatted: formatEditorialDate(q.validUntil || doc.createdDate),
      status: q.status || doc.status || 'Sent',
      paymentTerms:
        q.paymentTerms || '50% Advance on Onboarding · 50% Prior to Final Deployment',
      notes: q.notes || '',
      termsAndConditions:
        q.termsAndConditions ||
        '50% advance to initiate build, 50% upon final preview approval prior to production deployment.',
      version: doc.version || 1,
    },
    items,
    totals: {
      subtotal,
      discount,
      grandTotal,
      amountInWords: numberToIndianRupeesWords(grandTotal),
    },
    paymentDetails: {
      upiId: studio.upiId,
      phoneDisplay: studio.combinedPhones,
      bankDisplay: bankParts.join(' · '),
    },
    settings,
  };
}

export function mapReceiptToTemplateData(
  doc: GeneratedDocument,
  settings: FinanceSettings = DEFAULT_FINANCE_SETTINGS,
  allPayments: ClientPayment[] = []
): StructuredReceiptTemplateData {
  const studio = buildStructuredStudioIdentity(settings);
  const rawPayload = (doc.snapshotPayload || {}) as {
    payment?: ClientPayment;
    invoiceNumber?: string;
    clientAddress?: string;
    clientContactPerson?: string;
    clientEmail?: string;
    clientPhone?: string;
    packageSubtitle?: string;
    totalProjectOrInvoiceValue?: number;
    totalReceivedToDate?: number;
    outstandingRemaining?: number;
  };

  const p: ClientPayment =
    rawPayload.payment || (rawPayload as unknown as ClientPayment) || ({} as ClientPayment);

  const amountReceivedThisTxn = Math.max(
    0,
    Number(p.amountReceived ?? doc.amount) || 0
  );

  // Calculate cumulative received to date from linked invoice/client payments if not explicitly snapshotted
  const invoiceNumber =
    rawPayload.invoiceNumber || p.invoiceNumber || 'AS-I-001';
  const totalProjectOrInvoiceValue = Math.max(
    0,
    Number(
      rawPayload.totalProjectOrInvoiceValue ??
        p.totalProjectValue ??
        amountReceivedThisTxn
    ) || amountReceivedThisTxn
  );

  let totalReceivedToDate = Number(rawPayload.totalReceivedToDate);
  if (!Number.isFinite(totalReceivedToDate) || totalReceivedToDate <= 0) {
    const matchingPayments = allPayments.filter(
      (pay) =>
        (p.invoiceId && pay.invoiceId === p.invoiceId) ||
        (p.invoiceNumber && pay.invoiceNumber === p.invoiceNumber) ||
        (p.clientId && pay.clientId === p.clientId)
    );
    const sumMatched = matchingPayments.reduce(
      (s, pay) => s + (Math.max(0, Number(pay.amountReceived)) || 0),
      0
    );
    totalReceivedToDate = Math.max(amountReceivedThisTxn, sumMatched);
  }

  const remainingOutstandingBalance =
    rawPayload.outstandingRemaining !== undefined
      ? Math.max(0, Number(rawPayload.outstandingRemaining))
      : Math.max(0, totalProjectOrInvoiceValue - totalReceivedToDate);

  const projectParsed = parseProjectAndPackage(
    p.projectTitle || doc.projectTitle,
    rawPayload.packageSubtitle || p.milestone
  );

  return {
    studio,
    client: {
      clientId: p.clientId || doc.clientId,
      businessName: p.clientName || doc.clientName || 'Valued Client',
      contactPerson: rawPayload.clientContactPerson || '',
      address: rawPayload.clientAddress || '',
      email: rawPayload.clientEmail || '',
      phone: rawPayload.clientPhone || '',
    },
    project: projectParsed,
    receipt: {
      id: p.id || doc.paymentId || doc.id,
      receiptNumber: p.receiptNumber || doc.documentNumber || 'AS-R-001',
      paymentDate: p.paymentDate || doc.createdDate,
      paymentDateFormatted: formatEditorialDate(p.paymentDate || doc.createdDate),
      invoiceNumber,
      paymentMethod: p.paymentMode || 'UPI',
      transactionReference: p.upiReference && p.upiReference.trim() ? p.upiReference.trim() : '',
      paymentDescription: p.notes || p.milestone || 'Project Milestone Payment',
      milestone: p.milestone || 'Milestone Payment',
      version: doc.version || 1,
    },
    paymentSummary: {
      amountReceivedThisTxn,
      amountInWords: numberToIndianRupeesWords(amountReceivedThisTxn),
      totalProjectOrInvoiceValue,
      totalReceivedToDate,
      remainingOutstandingBalance,
    },
    settings,
  };
}

export function resolveTemplate(
  templateId?: string,
  templates: DocumentTemplate[] = DEFAULT_DOCUMENT_TEMPLATES,
  settings: FinanceSettings = DEFAULT_FINANCE_SETTINGS,
  documentType?: GeneratedDocument['documentType']
): DocumentTemplate {
  const byExactId = templates.find((t) => t.id === templateId);
  if (byExactId) return byExactId;

  if (documentType) {
    const byDocType = templates.find(
      (t) => t.documentType === documentType && (t.isDefault || t.isActive !== false)
    );
    if (byDocType) return byDocType;
  }

  const byDefault =
    templates.find((t) => t.id === settings.defaultTemplateId) ||
    DEFAULT_DOCUMENT_TEMPLATES[0];

  return {
    ...byDefault,
    accentColor: settings.accentColor || byDefault.accentColor,
    footerText: settings.footerText || byDefault.footerText,
  };
}

// ============================================================================
// SHARED SVG ICONS & DECORATIVE WAVE BACKGROUNDS (MATCHING UPLOADED DESIGNS)
// ============================================================================

const HEADER_WAVES_SVG = `
<svg class="header-wave-svg" viewBox="0 0 1055 245" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
  <path d="M0 0H1055V245H0V0Z" fill="#0B1325"/>
  <path d="M0 190C140 120 265 25 360 0H0V190Z" fill="#111C35" fill-opacity="0.72"/>
  <path d="M510 0C440 95 530 205 695 245H1055V0H510Z" fill="#070D1A" fill-opacity="0.82"/>
  <path d="M472 -10C445 92 528 195 668 252" stroke="rgba(203, 213, 225, 0.22)" stroke-width="1.4"/>
  <path d="M558 -15C500 100 578 210 795 248" stroke="rgba(203, 213, 225, 0.34)" stroke-width="1.6"/>
  <path d="M845 248C925 225 998 188 1060 142" stroke="rgba(203, 213, 225, 0.25)" stroke-width="1.3"/>
</svg>`;

const ICON_MAIL_DARK = `<svg width="15" height="15" viewBox="0 0 24 24" fill="#0F1C36" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="4" width="20" height="16" rx="3" fill="#0F1C36"/><path d="M4 7L12 13L20 7" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICON_PHONE_DARK = `<svg width="15" height="15" viewBox="0 0 24 24" fill="#0F1C36" xmlns="http://www.w3.org/2000/svg"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;
const ICON_UPI_DARK = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 4L14 12L5 20V4Z" fill="#0F1C36"/><path d="M11 4L20 12L11 20V4Z" fill="#2563EB" fill-opacity="0.85"/></svg>`;
const ICON_GLOBE_DARK = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0F1C36" stroke-width="2" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;

const ICON_PHONE_WHITE = `<svg width="15" height="15" viewBox="0 0 24 24" fill="#FFFFFF" xmlns="http://www.w3.org/2000/svg"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;
const ICON_MAIL_WHITE = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="1.8" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="M22 7L12 13L2 7"/></svg>`;
const ICON_GLOBE_WHITE = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="1.8" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;

// ============================================================================
// TEMPLATE 1 & 2 RENDERER: AETHEL STUDIOS MODERN INVOICE & QUOTATION
// Faithfully reproduces /assets/aistudio/Aethel_Studios_Modern_Invoice_065cd68b.png
// ============================================================================

function renderModernInvoiceOrQuotationHtml(
  mode: 'Invoice' | 'Quotation',
  data: StructuredInvoiceTemplateData | StructuredQuotationTemplateData,
  docVersion: number
): string {
  const isInvoice = mode === 'Invoice';
  const invData = isInvoice ? (data as StructuredInvoiceTemplateData) : null;
  const quoData = !isInvoice ? (data as StructuredQuotationTemplateData) : null;

  const docNumber = isInvoice
    ? invData!.invoice.invoiceNumber
    : quoData!.quotation.quotationNumber;
  const issueDateDisplay = isInvoice
    ? invData!.invoice.issueDateFormatted
    : quoData!.quotation.issueDateFormatted;
  const issueDateRaw = isInvoice
    ? invData!.invoice.issueDate
    : quoData!.quotation.issueDate;
  const secondDateLabel = isInvoice ? 'Due Date' : 'Valid Until';
  const secondDateDisplay = isInvoice
    ? invData!.invoice.dueDateFormatted
    : quoData!.quotation.validUntilFormatted;
  const secondDateRaw = isInvoice
    ? invData!.invoice.dueDate
    : quoData!.quotation.validUntil;

  const docHeadingSpaced = isInvoice ? 'I N V O I C E' : 'Q U O T A T I O N';
  const billToLabel = isInvoice ? 'BILL TO' : 'PREPARED FOR';

  const paymentTerms = isInvoice
    ? invData!.invoice.paymentTerms
    : quoData!.quotation.paymentTerms;
  const notes = isInvoice ? invData!.invoice.notes : quoData!.quotation.notes;
  const termsAndConditions = !isInvoice
    ? quoData!.quotation.termsAndConditions
    : '';

  const showPaymentReconciliation =
    isInvoice &&
    (invData!.paymentSummary.amountReceived > 0 ||
      invData!.paymentSummary.outstandingBalance !== invData!.totals.grandTotal);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(mode)} — ${escapeHtml(docNumber)} (${escapeHtml(data.client.businessName)})</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,400;1,600&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,400;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #F4F7FC;
      color: #0F172A;
      font-family: 'Playfair Display', 'Cormorant Garamond', Georgia, serif;
      font-size: 13px;
      line-height: 1.45;
    }
    .a4-sheet {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: linear-gradient(180deg, #F3F7FC 0%, #F7FAFF 55%, #EFF4FC 100%);
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    /* Subtle decorative porcelain-blue wave arcs on right side */
    .bg-wave-right {
      position: absolute;
      top: 195px;
      right: -120px;
      width: 420px;
      height: 520px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(208, 223, 247, 0.45) 0%, rgba(208, 223, 247, 0) 70%);
      pointer-events: none;
      z-index: 0;
    }
    /* 1. Top Midnight Navy Wave Header */
    .navy-header {
      position: relative;
      background: #0B1325;
      color: #FFFFFF;
      padding: 36px 46px 34px 46px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      overflow: hidden;
      z-index: 1;
    }
    .header-wave-svg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: 0;
      pointer-events: none;
    }
    .header-left {
      position: relative;
      z-index: 2;
      display: flex;
      align-items: center;
      gap: 24px;
    }
    .header-logo-img {
      width: 78px;
      height: 78px;
      object-fit: contain;
      display: block;
    }
    .header-divider {
      width: 1px;
      height: 82px;
      background: rgba(255, 255, 255, 0.34);
    }
    .header-brand-stack {
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .header-brand-title {
      font-family: 'Playfair Display', 'Cormorant Garamond', Georgia, serif;
      font-size: 25px;
      font-weight: 500;
      letter-spacing: 0.28em;
      line-height: 1.22;
      color: #F8FAFC;
      text-transform: uppercase;
    }
    .header-brand-tagline {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 8.5px;
      font-weight: 600;
      letter-spacing: 0.2em;
      color: #CBD5E1;
      margin-top: 8px;
      text-transform: uppercase;
    }
    .header-right {
      position: relative;
      z-index: 2;
      text-align: left;
      min-width: 235px;
    }
    .header-doc-title {
      font-family: 'Playfair Display', 'Cormorant Garamond', Georgia, serif;
      font-size: 26px;
      font-weight: 500;
      letter-spacing: 0.14em;
      color: #FFFFFF;
      margin-bottom: 14px;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .header-meta-table {
      width: 100%;
      border-collapse: collapse;
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 13.5px;
    }
    .header-meta-table td {
      padding: 3px 0;
      color: #E2E8F0;
    }
    .header-meta-table td.label {
      color: #CBD5E1;
      padding-right: 22px;
      font-weight: 400;
    }
    .header-meta-table td.val {
      color: #FFFFFF;
      font-weight: 600;
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 12.5px;
      letter-spacing: 0.02em;
    }

    /* 2. Body Content Area */
    .body-content {
      position: relative;
      z-index: 2;
      padding: 26px 42px 18px 42px;
      flex: 1;
    }

    /* 3. Two Rounded Info Cards (BILL TO / PROJECT) */
    .info-cards-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 22px;
      margin-bottom: 24px;
    }
    .info-card {
      background: rgba(255, 255, 255, 0.88);
      border: 1px solid #E2ECF9;
      border-radius: 18px;
      padding: 20px 24px;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.03);
    }
    .section-eyebrow {
      display: flex;
      align-items: center;
      gap: 12px;
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 11.5px;
      font-weight: 600;
      letter-spacing: 0.16em;
      color: #334155;
      text-transform: uppercase;
      margin-bottom: 10px;
    }
    .section-eyebrow-line {
      display: inline-block;
      width: 38px;
      height: 1.5px;
      background: #6B8DE3;
    }
    .client-name-heading {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 23px;
      font-weight: 700;
      color: #0B1325;
      margin: 0 0 6px 0;
      line-height: 1.2;
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    .client-address-lines {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 13.5px;
      color: #1E293B;
      line-height: 1.45;
      margin-bottom: 12px;
      word-break: break-word;
    }
    .client-contact-strip {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 16px;
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 12.5px;
      color: #0F172A;
      margin-top: 8px;
    }
    .contact-chip {
      display: inline-flex;
      align-items: center;
      gap: 7px;
    }
    .project-title-heading {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 20px;
      font-weight: 600;
      color: #0B1325;
      margin: 0 0 6px 0;
      line-height: 1.28;
      word-break: break-word;
    }
    .project-package-subtitle {
      font-family: 'Playfair Display', Georgia, serif;
      font-style: italic;
      font-size: 15px;
      color: #1E3A5F;
      margin-bottom: 8px;
    }
    .project-meta-note {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 11px;
      color: #475569;
      margin-top: 8px;
    }

    /* 4. Line Items Table Card */
    .table-card-wrapper {
      background: rgba(255, 255, 255, 0.9);
      border: 1px solid #E2ECF9;
      border-radius: 18px;
      padding: 4px 4px 12px 4px;
      box-shadow: 0 10px 28px rgba(15, 23, 42, 0.035);
      margin-bottom: 14px;
    }
    .modern-items-table {
      width: 100%;
      border-collapse: collapse;
    }
    .modern-items-table thead {
      display: table-header-group;
    }
    .modern-items-table thead th {
      background: #0C1527;
      color: #F8FAFC;
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 11.5px;
      font-weight: 500;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      padding: 14px 20px;
    }
    .modern-items-table thead th:first-child {
      border-top-left-radius: 14px;
      text-align: left;
      width: 52%;
    }
    .modern-items-table thead th:nth-child(2) {
      text-align: center;
      width: 12%;
    }
    .modern-items-table thead th:nth-child(3) {
      text-align: right;
      width: 18%;
    }
    .modern-items-table thead th:last-child {
      border-top-right-radius: 14px;
      text-align: right;
      width: 18%;
    }
    .modern-items-table tbody tr {
      border-bottom: 1px solid #E8EFFA;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .modern-items-table tbody tr:last-child {
      border-bottom: none;
    }
    .modern-items-table tbody td {
      padding: 12px 20px;
      font-size: 14px;
      color: #0F172A;
      vertical-align: top;
    }
    .service-name-cell {
      font-family: 'Playfair Display', Georgia, serif;
      font-weight: 500;
      color: #0B1325;
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    .service-desc-cell {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 11px;
      color: #64748B;
      margin-top: 3px;
      line-height: 1.4;
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    .num-cell {
      font-family: 'Playfair Display', Georgia, serif;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    /* 5. Right-Aligned Subtotal, Discount & Dark Navy Total Pill */
    .totals-outer-row {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 20px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .totals-stack {
      width: 320px;
    }
    .totals-line {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 7px 18px;
      border-bottom: 1px solid #E2ECF9;
      font-size: 12px;
    }
    .totals-line .t-label {
      font-family: 'Playfair Display', Georgia, serif;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #334155;
      font-size: 11.5px;
    }
    .totals-line .t-val {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 14.5px;
      font-weight: 700;
      color: #0B1325;
    }
    .total-navy-pill {
      margin-top: 8px;
      background: #0C1527;
      color: #FFFFFF;
      border-radius: 999px;
      padding: 11px 22px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 6px 18px rgba(11, 19, 37, 0.18);
    }
    .total-navy-pill .p-label {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 14px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
    }
    .total-navy-pill .p-val {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 18px;
      font-weight: 700;
    }
    .words-caption {
      text-align: right;
      font-family: 'Playfair Display', Georgia, serif;
      font-style: italic;
      font-size: 11.5px;
      color: #475569;
      margin-top: 6px;
      padding-right: 8px;
    }

    /* 6. Thank You & Payment Details Rounded Split Card */
    .thankyou-payment-card {
      background: rgba(255, 255, 255, 0.88);
      border: 1px solid #E2ECF9;
      border-radius: 18px;
      padding: 20px 26px;
      display: grid;
      grid-template-columns: 1.15fr 1px 1fr;
      gap: 24px;
      align-items: center;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.03);
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .card-v-divider {
      width: 1px;
      height: 100%;
      min-height: 76px;
      background: #CBD5E1;
    }
    .thankyou-quote {
      font-family: 'Playfair Display', Georgia, serif;
      font-style: italic;
      font-size: 13.5px;
      color: #1E293B;
      line-height: 1.55;
      margin: 6px 0 10px 0;
    }
    .thankyou-sign {
      font-family: 'Playfair Display', Georgia, serif;
      font-style: italic;
      font-size: 13.5px;
      color: #0F172A;
    }
    .payment-detail-list {
      display: flex;
      flex-direction: column;
      gap: 9px;
      margin-top: 8px;
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 13px;
      color: #0F172A;
    }
    .payment-detail-item {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    /* 7. Bottom Studio Footer & Dark Navy Non-GST Pill */
    .footer-wrapper {
      position: relative;
      z-index: 2;
      padding: 10px 42px 24px 42px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .studio-footer-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 6px 16px 6px;
      gap: 14px;
    }
    .footer-brand-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .footer-dark-logo {
      width: 44px;
      height: 44px;
      object-fit: contain;
    }
    .footer-v-sep {
      width: 1px;
      height: 36px;
      background: #334155;
    }
    .footer-studio-name {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 14px;
      font-weight: 700;
      color: #0B1325;
    }
    .footer-studio-loc {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 12px;
      color: #334155;
    }
    .footer-links-mid {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 12.5px;
      color: #0F172A;
    }
    .footer-motto-right {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 10.5px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #0B1325;
      font-weight: 600;
    }
    .gst-navy-pill {
      position: relative;
      background: #0B1325;
      color: #F8FAFC;
      border-radius: 16px;
      padding: 13px 26px;
      font-family: 'Playfair Display', Georgia, serif;
      font-style: italic;
      font-size: 13px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <div class="a4-sheet">
    <div class="bg-wave-right"></div>

    <div>
      <!-- 1. AUTHORITATIVE MIDNIGHT NAVY WAVE HEADER -->
      <header class="navy-header">
        ${HEADER_WAVES_SVG}
        <div class="header-left">
          <img class="header-logo-img" src="${AETHEL_LOGO_WHITE_DATA_URI}" alt="Aethel Studios AS Logo" />
          <div class="header-divider"></div>
          <div class="header-brand-stack">
            <div class="header-brand-title">A E T H E L<br/>S T U D I O S</div>
            <div class="header-brand-tagline">${escapeHtml(data.studio.tagline)}</div>
          </div>
        </div>

        <div class="header-right">
          <div class="header-doc-title">${docHeadingSpaced}</div>
          <table class="header-meta-table">
            <tr>
              <td class="label">${isInvoice ? 'Invoice No.' : 'Quotation No.'}</td>
              <td class="val">${escapeHtml(docNumber)}</td>
            </tr>
            <tr>
              <td class="label">Issue Date</td>
              <td class="val" data-iso-date="${escapeHtml(issueDateRaw)}">${escapeHtml(issueDateDisplay)}</td>
            </tr>
            <tr>
              <td class="label">${escapeHtml(secondDateLabel)}</td>
              <td class="val" data-iso-date="${escapeHtml(secondDateRaw)}">${escapeHtml(secondDateDisplay)}</td>
            </tr>
          </table>
        </div>
      </header>

      <!-- 2. MAIN DOCUMENT BODY -->
      <main class="body-content">
        <!-- BILL TO & PROJECT CARDS -->
        <div class="info-cards-grid">
          <div class="info-card">
            <div class="section-eyebrow">
              <span>${billToLabel}</span>
              <span class="section-eyebrow-line"></span>
            </div>
            <h2 class="client-name-heading">${escapeHtml(data.client.businessName)}</h2>
            <div class="client-address-lines">
              ${data.client.contactPerson ? `<div>Attn: ${escapeHtml(data.client.contactPerson)}</div>` : ''}
              ${data.client.address ? `<div>${escapeHtml(data.client.address)}</div>` : ''}
            </div>
            <div class="client-contact-strip">
              ${
                data.client.email
                  ? `<span class="contact-chip">${ICON_MAIL_DARK}<span>${escapeHtml(data.client.email)}</span></span>`
                  : ''
              }
              ${
                data.client.phone
                  ? `<span class="contact-chip">${ICON_PHONE_DARK}<span>${escapeHtml(data.client.phone)}</span></span>`
                  : ''
              }
            </div>
          </div>

          <div class="info-card">
            <div class="section-eyebrow">
              <span>PROJECT</span>
              <span class="section-eyebrow-line"></span>
            </div>
            <h3 class="project-title-heading">${escapeHtml(data.project.projectTitle)}</h3>
            <div class="project-package-subtitle">${escapeHtml(data.project.packageSubtitle)}</div>
            ${
              paymentTerms
                ? `<div class="project-meta-note"><strong>Payment Terms:</strong> ${escapeHtml(paymentTerms)}</div>`
                : ''
            }
          </div>
        </div>

        <!-- LINE ITEMS TABLE -->
        <div class="table-card-wrapper">
          <table class="modern-items-table">
            <thead>
              <tr>
                <th>DESCRIPTION</th>
                <th>QTY</th>
                <th>UNIT PRICE</th>
                <th>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              ${data.items
                .map(
                  (item) => `
                <tr>
                  <td>
                    <div class="service-name-cell">${escapeHtml(item.serviceName)}</div>
                    ${
                      item.description
                        ? `<div class="service-desc-cell">${escapeHtml(item.description)}</div>`
                        : ''
                    }
                  </td>
                  <td class="num-cell" style="text-align: center">${escapeHtml(item.quantity)}</td>
                  <td class="num-cell" style="text-align: right">${escapeHtml(formatINR(item.unitPrice))}</td>
                  <td class="num-cell" style="text-align: right; font-weight: 700">${escapeHtml(formatINR(item.total))}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>

        <!-- SUBTOTAL, DISCOUNT, TOTAL PILL & PAYMENT SUMMARY -->
        <div class="totals-outer-row">
          <div class="totals-stack">
            <div class="totals-line">
              <span class="t-label">SUBTOTAL</span>
              <span class="t-val">${escapeHtml(formatINR(data.totals.subtotal))}</span>
            </div>
            <div class="totals-line">
              <span class="t-label">DISCOUNT</span>
              <span class="t-val">${
                data.totals.discount > 0
                  ? `-${escapeHtml(formatINR(data.totals.discount))}`
                  : '—'
              }</span>
            </div>

            <div class="total-navy-pill">
              <span class="p-label">TOTAL</span>
              <span class="p-val">${escapeHtml(formatINR(data.totals.grandTotal))}</span>
            </div>

            <div class="words-caption">(${escapeHtml(data.totals.amountInWords)})</div>

            ${
              showPaymentReconciliation
                ? `
              <div class="totals-line" style="margin-top: 6px">
                <span class="t-label">PAID TO DATE</span>
                <span class="t-val" style="color: #059669">${escapeHtml(
                  formatINR(invData!.paymentSummary.amountReceived)
                )}</span>
              </div>
              <div class="totals-line">
                <span class="t-label">BALANCE DUE</span>
                <span class="t-val" style="color: ${
                  invData!.paymentSummary.outstandingBalance > 0 ? '#B45309' : '#059669'
                }">${escapeHtml(formatINR(invData!.paymentSummary.outstandingBalance))}</span>
              </div>
            `
                : ''
            }
          </div>
        </div>

        <!-- THANK YOU & PAYMENT DETAILS SPLIT CARD -->
        <div class="thankyou-payment-card">
          <div>
            <div class="section-eyebrow">
              <span>THANK YOU</span>
              <span class="section-eyebrow-line"></span>
            </div>
            <div class="thankyou-quote">
              We appreciate your trust in ${escapeHtml(data.studio.studioName)}.<br/>
              Looking forward to creating something extraordinary together.
            </div>
            <div class="thankyou-sign">— Team ${escapeHtml(data.studio.studioName)}</div>
            ${
              notes
                ? `<div class="project-meta-note" style="margin-top: 8px"><strong>Notes:</strong> ${escapeHtml(notes)}</div>`
                : ''
            }
            ${
              termsAndConditions
                ? `<div class="project-meta-note" style="margin-top: 6px"><strong>Terms &amp; Conditions:</strong> ${escapeHtml(termsAndConditions)}</div>`
                : ''
            }
          </div>

          <div class="card-v-divider"></div>

          <div>
            <div class="section-eyebrow">
              <span>PAYMENT DETAILS</span>
              <span class="section-eyebrow-line"></span>
            </div>
            <div class="payment-detail-list">
              <div class="payment-detail-item">
                ${ICON_UPI_DARK}
                <span>UPI ID: <strong>${escapeHtml(data.paymentDetails.upiId)}</strong></span>
              </div>
              <div class="payment-detail-item">
                ${ICON_PHONE_DARK}
                <span>Phone: ${escapeHtml(data.paymentDetails.phoneDisplay)}</span>
              </div>
              ${
                data.paymentDetails.bankDisplay
                  ? `<div class="payment-detail-item" style="font-size: 11.5px; color: #334155">${escapeHtml(
                      data.paymentDetails.bankDisplay
                    )}</div>`
                  : ''
              }
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- 3. AUTHORITATIVE FOOTER & DARK NAVY GST DISCLAIMER PILL -->
    <footer class="footer-wrapper">
      <div class="studio-footer-bar">
        <div class="footer-brand-left">
          <img class="footer-dark-logo" src="${AETHEL_LOGO_DARK_DATA_URI}" alt="Aethel Studios AS Logo" />
          <div class="footer-v-sep"></div>
          <div>
            <div class="footer-studio-name">${escapeHtml(data.studio.studioName)}</div>
            <div class="footer-studio-loc">${escapeHtml(data.studio.address)}</div>
          </div>
        </div>

        <div class="footer-v-sep"></div>

        <div class="footer-links-mid">
          <span class="contact-chip">${ICON_GLOBE_DARK}<span>${escapeHtml(data.studio.website)}</span></span>
          <span class="contact-chip">${ICON_MAIL_DARK}<span>${escapeHtml(data.studio.email)}</span></span>
        </div>

        <div class="footer-v-sep"></div>

        <div class="footer-motto-right">B U I L D &nbsp; • &nbsp; D E S I G N &nbsp; • &nbsp; G R O W</div>
      </div>

      <div class="gst-navy-pill">
        <span>${escapeHtml(data.studio.gstDisclaimer)}</span>
        <span style="font-style: normal; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 10px; opacity: 0.65">v${escapeHtml(docVersion)}</span>
      </div>
    </footer>
  </div>
</body>
</html>`;
}

// ============================================================================
// TEMPLATE 3 RENDERER: AETHEL STUDIOS PAYMENT RECEIPT
// Faithfully reproduces /assets/aistudio/Aethel_Studios_Payment_Receipt_e4b1d20e.png
// ============================================================================

function renderModernPaymentReceiptHtml(
  data: StructuredReceiptTemplateData
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Payment Receipt — ${escapeHtml(data.receipt.receiptNumber)} (${escapeHtml(data.client.businessName)})</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500&display=swap" rel="stylesheet" />
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #F3F6FC;
      color: #0B1325;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 13px;
      line-height: 1.45;
    }
    .a4-receipt-sheet {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: linear-gradient(165deg, #F3F6FC 0%, #F7FAFF 60%, #ECF2FC 100%);
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .top-right-arcs {
      position: absolute;
      top: -60px;
      right: -80px;
      width: 340px;
      height: 340px;
      border-radius: 50%;
      border: 1.5px solid rgba(59, 130, 246, 0.25);
      background: radial-gradient(circle, rgba(219, 234, 254, 0.55) 0%, rgba(219, 234, 254, 0) 70%);
      pointer-events: none;
      z-index: 0;
    }
    /* 1. Top Brand Header */
    .receipt-top-bar {
      position: relative;
      z-index: 2;
      padding: 36px 48px 20px 48px;
      display: flex;
      align-items: center;
      gap: 18px;
    }
    .receipt-badge-logo {
      width: 58px;
      height: 58px;
      object-fit: contain;
      display: block;
    }
    .receipt-top-divider {
      width: 1px;
      height: 48px;
      background: #CBD5E1;
    }
    .receipt-brand-title {
      font-size: 24px;
      color: #0B1325;
      letter-spacing: -0.01em;
      line-height: 1.15;
    }
    .receipt-brand-title strong {
      font-weight: 800;
    }
    .receipt-brand-title span {
      font-weight: 400;
    }
    .receipt-brand-sub {
      font-size: 12px;
      color: #334155;
      margin-top: 3px;
    }

    /* 2. Main White Receipt Card */
    .receipt-card-outer {
      position: relative;
      z-index: 2;
      padding: 6px 38px 22px 38px;
      flex: 1;
    }
    .receipt-white-card {
      background: #FFFFFF;
      border-radius: 26px;
      padding: 34px 40px;
      box-shadow: 0 14px 36px rgba(15, 23, 42, 0.045);
      border: 1px solid #E6EEF9;
    }
    .hero-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
      padding-bottom: 24px;
      border-bottom: 1px solid #DCE5F2;
    }
    .eyebrow-blue {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #2563EB;
      margin-bottom: 10px;
    }
    .blue-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #2563EB;
      display: inline-block;
    }
    .hero-greeting {
      font-size: 32px;
      line-height: 1.18;
      color: #0B1325;
      margin: 0;
      letter-spacing: -0.02em;
    }
    .hero-greeting strong {
      font-weight: 800;
    }
    .hero-greeting span {
      font-weight: 500;
    }
    .receipt-meta-pill {
      background: #F1F5FA;
      border-radius: 14px;
      padding: 14px 22px;
      min-width: 225px;
    }
    .receipt-meta-pill table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .receipt-meta-pill td {
      padding: 4px 0;
    }
    .receipt-meta-pill td.k {
      color: #334155;
      padding-right: 18px;
    }
    .receipt-meta-pill td.v {
      color: #0B1325;
      font-weight: 700;
      text-align: left;
    }

    /* 3. Received From | Project Two-Column Row */
    .payer-project-row {
      display: grid;
      grid-template-columns: 1fr 1px 1fr;
      gap: 28px;
      padding: 22px 0;
      border-bottom: 1px solid #DCE5F2;
      align-items: start;
    }
    .col-v-line {
      width: 1px;
      height: 100%;
      min-height: 76px;
      background: #DCE5F2;
    }
    .col-label {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #334155;
      margin-bottom: 8px;
    }
    .payer-name {
      font-size: 24px;
      font-weight: 800;
      color: #0B1325;
      margin: 0 0 6px 0;
      line-height: 1.2;
      word-break: break-word;
    }
    .payer-sub {
      font-size: 13.5px;
      color: #1E293B;
      line-height: 1.48;
      word-break: break-word;
    }
    .proj-name {
      font-size: 18.5px;
      font-weight: 700;
      color: #0B1325;
      margin: 0 0 6px 0;
      line-height: 1.3;
      word-break: break-word;
    }
    .proj-pkg {
      font-size: 13.5px;
      font-style: italic;
      color: #334155;
    }

    /* 4. Amount Received Highlight Row */
    .amount-highlight-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 22px 0;
      border-bottom: 1px solid #DCE5F2;
      gap: 20px;
    }
    .amount-label-left {
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #1E293B;
    }
    .amount-value-right {
      text-align: right;
    }
    .amount-big-inr {
      font-size: 38px;
      font-weight: 800;
      color: #0B1325;
      line-height: 1.1;
      letter-spacing: -0.02em;
    }
    .amount-words-italic {
      font-size: 12.5px;
      font-style: italic;
      color: #334155;
      margin-top: 4px;
    }

    /* 5. 6-Row Colon-Aligned Ledger Table */
    .ledger-kv-section {
      padding: 20px 0;
      border-bottom: 1px solid #DCE5F2;
    }
    .ledger-kv-table {
      width: 100%;
      border-collapse: collapse;
    }
    .ledger-kv-table td {
      padding: 6px 0;
      font-size: 13.5px;
      vertical-align: top;
    }
    .ledger-kv-table td.kv-label {
      width: 44%;
      font-size: 11.5px;
      font-weight: 600;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #334155;
    }
    .ledger-kv-table td.kv-colon {
      width: 6%;
      color: #475569;
      font-weight: 600;
    }
    .ledger-kv-table td.kv-val {
      width: 50%;
      color: #0B1325;
      font-weight: 600;
      font-size: 14.5px;
    }

    /* 6. Bottom Gratitude & Official Blue Circular Stamp Row */
    .gratitude-stamp-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 20px;
      gap: 20px;
    }
    .quote-with-bar {
      display: flex;
      align-items: stretch;
      gap: 14px;
      margin-bottom: 16px;
    }
    .blue-v-pill {
      width: 5px;
      border-radius: 999px;
      background: #3B82F6;
      flex-shrink: 0;
    }
    .quote-italic-text {
      font-size: 13.5px;
      font-style: italic;
      color: #1E293B;
      line-height: 1.55;
    }
    .signoff-block {
      font-size: 14px;
      color: #1E293B;
      line-height: 1.35;
    }
    .signoff-block strong {
      display: block;
      font-size: 15px;
      font-weight: 800;
      color: #0B1325;
      margin-top: 2px;
    }
    .official-blue-stamp {
      width: 132px;
      height: 132px;
      object-fit: contain;
      display: block;
    }

    /* 7. Bottom Dark Navy Contact & Non-GST Footer Band */
    .receipt-navy-footer {
      position: relative;
      z-index: 2;
      background: #0B1325;
      color: #FFFFFF;
      border-radius: 22px 22px 0 0;
      padding: 20px 42px 22px 42px;
      overflow: hidden;
    }
    .footer-contacts-grid {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      padding-bottom: 14px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.14);
      font-size: 12px;
    }
    .f-contact-item {
      display: flex;
      align-items: center;
      gap: 9px;
    }
    .f-contact-sub {
      font-size: 10.5px;
      color: #CBD5E1;
      display: block;
    }
    .f-v-div {
      width: 1px;
      height: 28px;
      background: rgba(255, 255, 255, 0.24);
    }
    .footer-gst-row {
      padding-top: 12px;
      font-size: 12px;
      color: #E2E8F0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  </style>
</head>
<body>
  <div class="a4-receipt-sheet">
    <div class="top-right-arcs"></div>

    <!-- 1. TOP BRAND HEADER -->
    <header class="receipt-top-bar">
      <img class="receipt-badge-logo" src="${AETHEL_LOGO_BADGE_DATA_URI}" alt="Aethel Studios Badge" />
      <div class="receipt-top-divider"></div>
      <div>
        <div class="receipt-brand-title"><strong>Aethel</strong> <span>Studios</span></div>
        <div class="receipt-brand-sub">Digital experiences. Thoughtfully crafted.</div>
      </div>
    </header>

    <!-- 2. MAIN WHITE RECEIPT CARD -->
    <main class="receipt-card-outer">
      <div class="receipt-white-card">
        <!-- HERO ROW -->
        <div class="hero-row">
          <div>
            <div class="eyebrow-blue">
              <span class="blue-dot"></span>
              <span>PAYMENT RECEIPT</span>
            </div>
            <h1 class="hero-greeting">
              <strong>Thank you</strong> <span>for<br/>trusting ${escapeHtml(data.studio.studioName)}.</span>
            </h1>
          </div>

          <div class="receipt-meta-pill">
            <table>
              <tr>
                <td class="k">Receipt No.</td>
                <td class="v">${escapeHtml(data.receipt.receiptNumber)}</td>
              </tr>
              <tr>
                <td class="k">Date</td>
                <td class="v" data-iso-date="${escapeHtml(data.receipt.paymentDate)}">${escapeHtml(data.receipt.paymentDateFormatted)}</td>
              </tr>
            </table>
          </div>
        </div>

        <!-- RECEIVED FROM | PROJECT -->
        <div class="payer-project-row">
          <div>
            <div class="col-label">RECEIVED FROM</div>
            <h2 class="payer-name">${escapeHtml(data.client.businessName)}</h2>
            <div class="payer-sub">
              ${data.client.contactPerson ? `<div>${escapeHtml(data.client.contactPerson)}</div>` : ''}
              ${data.client.address ? `<div>${escapeHtml(data.client.address)}</div>` : ''}
              ${data.client.phone ? `<div>${escapeHtml(data.client.phone)}</div>` : ''}
            </div>
          </div>

          <div class="col-v-line"></div>

          <div>
            <div class="col-label">PROJECT</div>
            <h3 class="proj-name">${escapeHtml(data.project.projectTitle)}</h3>
            <div class="proj-pkg">${escapeHtml(data.project.packageSubtitle)}</div>
          </div>
        </div>

        <!-- AMOUNT RECEIVED HIGHLIGHT -->
        <div class="amount-highlight-row">
          <div class="amount-label-left">AMOUNT RECEIVED</div>
          <div class="amount-value-right">
            <div class="amount-big-inr">${escapeHtml(formatINR(data.paymentSummary.amountReceivedThisTxn))}</div>
            <div class="amount-words-italic">(${escapeHtml(data.paymentSummary.amountInWords)})</div>
          </div>
        </div>

        <!-- 6-ROW COLON-ALIGNED RECONCILIATION TABLE -->
        <div class="ledger-kv-section">
          <table class="ledger-kv-table">
            <tr>
              <td class="kv-label">PAYMENT METHOD</td>
              <td class="kv-colon">:</td>
              <td class="kv-val">${escapeHtml(data.receipt.paymentMethod)}</td>
            </tr>
            ${
              data.receipt.transactionReference
                ? `
            <tr>
              <td class="kv-label">TRANSACTION REFERENCE</td>
              <td class="kv-colon">:</td>
              <td class="kv-val">${escapeHtml(data.receipt.transactionReference)}</td>
            </tr>`
                : ''
            }
            <tr>
              <td class="kv-label">INVOICE NO.</td>
              <td class="kv-colon">:</td>
              <td class="kv-val">${escapeHtml(data.receipt.invoiceNumber)}</td>
            </tr>
            <tr>
              <td class="kv-label">TOTAL PROJECT VALUE</td>
              <td class="kv-colon">:</td>
              <td class="kv-val">${escapeHtml(formatINR(data.paymentSummary.totalProjectOrInvoiceValue))}</td>
            </tr>
            <tr>
              <td class="kv-label">TOTAL RECEIVED TO DATE</td>
              <td class="kv-colon">:</td>
              <td class="kv-val">${escapeHtml(formatINR(data.paymentSummary.totalReceivedToDate))}</td>
            </tr>
            <tr>
              <td class="kv-label">OUTSTANDING BALANCE</td>
              <td class="kv-colon">:</td>
              <td class="kv-val">${escapeHtml(formatINR(data.paymentSummary.remainingOutstandingBalance))}</td>
            </tr>
          </table>
        </div>

        <!-- GRATITUDE QUOTE & OFFICIAL BLUE CIRCULAR STAMP -->
        <div class="gratitude-stamp-row">
          <div>
            <div class="quote-with-bar">
              <div class="blue-v-pill"></div>
              <div class="quote-italic-text">
                Your support fuels our creativity.<br/>
                We look forward to working with you again.
              </div>
            </div>
            <div class="signoff-block">
              With gratitude,
              <strong>${escapeHtml(data.studio.studioName)}</strong>
            </div>
          </div>

          <img class="official-blue-stamp" src="${AETHEL_STAMP_BLUE_DATA_URI}" alt="Aethel Studios Official Stamp" />
        </div>
      </div>
    </main>

    <!-- 3. BOTTOM DARK NAVY CONTACT & NON-GST FOOTER -->
    <footer class="receipt-navy-footer">
      <div class="footer-contacts-grid">
        <div class="f-contact-item">
          ${ICON_PHONE_WHITE}
          <div>
            <strong>${escapeHtml(data.studio.phone1)}</strong>
            <span class="f-contact-sub">(${escapeHtml(data.studio.contactPerson1)})</span>
          </div>
        </div>

        <div class="f-v-div"></div>

        <div class="f-contact-item">
          ${ICON_PHONE_WHITE}
          <div>
            <strong>${escapeHtml(data.studio.phone2)}</strong>
            <span class="f-contact-sub">(${escapeHtml(data.studio.contactPerson2)})</span>
          </div>
        </div>

        <div class="f-v-div"></div>

        <div class="f-contact-item">
          ${ICON_MAIL_WHITE}
          <span>${escapeHtml(data.studio.email)}</span>
        </div>

        <div class="f-v-div"></div>

        <div class="f-contact-item">
          ${ICON_GLOBE_WHITE}
          <span>www.${escapeHtml(data.studio.website.replace(/^www\./, ''))}</span>
        </div>
      </div>

      <div class="footer-gst-row">
        <span>${escapeHtml(data.studio.gstDisclaimer)}</span>
        <span style="font-size: 10px; opacity: 0.65">v${escapeHtml(data.receipt.version)}</span>
      </div>
    </footer>
  </div>
</body>
</html>`;
}

// ============================================================================
// STATEMENT OF ACCOUNT RENDERER (MATCHING AETHEL STUDIOS MODERN IDENTITY)
// ============================================================================

function renderModernStatementHtml(
  doc: GeneratedDocument,
  settings: FinanceSettings = DEFAULT_FINANCE_SETTINGS
): string {
  const studio = buildStructuredStudioIdentity(settings);
  const profile = (doc.snapshotPayload || {}) as unknown as ClientFinancialProfileSummary;
  const ledger = profile.ledger || [];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Statement of Account — ${escapeHtml(doc.documentNumber)} (${escapeHtml(doc.clientName)})</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { margin: 0; padding: 0; background: #F4F7FC; color: #0B1325; font-family: 'Playfair Display', Georgia, serif; font-size: 12.5px; }
    .a4-sheet { width: 210mm; min-height: 297mm; margin: 0 auto; background: #F4F7FC; display: flex; flex-direction: column; justify-content: space-between; }
    .navy-header { position: relative; background: #0B1325; color: #FFF; padding: 34px 44px; display: flex; justify-content: space-between; align-items: center; overflow: hidden; }
    .header-wave-svg { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 0; }
    .header-left, .header-right { position: relative; z-index: 2; }
    .header-left { display: flex; align-items: center; gap: 22px; }
    .header-logo-img { width: 72px; height: 72px; object-fit: contain; }
    .header-divider { width: 1px; height: 76px; background: rgba(255,255,255,0.34); }
    .header-brand-title { font-size: 24px; letter-spacing: 0.26em; line-height: 1.2; }
    .header-brand-tagline { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 8.5px; letter-spacing: 0.18em; color: #CBD5E1; margin-top: 6px; }
    .body-content { padding: 26px 42px; flex: 1; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 22px; }
    .summary-card { background: #FFF; border: 1px solid #E2ECF9; border-radius: 14px; padding: 14px 16px; }
    .summary-label { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748B; }
    .summary-val { font-size: 18px; font-weight: 700; margin-top: 4px; color: #0B1325; }
    .modern-items-table { width: 100%; border-collapse: collapse; background: #FFF; border-radius: 14px; overflow: hidden; }
    .modern-items-table th { background: #0C1527; color: #FFF; font-size: 10.5px; letter-spacing: 0.12em; text-transform: uppercase; padding: 12px 14px; text-align: left; }
    .modern-items-table td { padding: 11px 14px; border-bottom: 1px solid #E8EFFA; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11.5px; }
    .footer-wrapper { padding: 12px 42px 24px 42px; }
    .gst-navy-pill { background: #0B1325; color: #F8FAFC; border-radius: 16px; padding: 13px 26px; font-style: italic; font-size: 13px; display: flex; justify-content: space-between; }
  </style>
</head>
<body>
  <div class="a4-sheet">
    <div>
      <header class="navy-header">
        ${HEADER_WAVES_SVG}
        <div class="header-left">
          <img class="header-logo-img" src="${AETHEL_LOGO_WHITE_DATA_URI}" alt="Aethel Studios AS Logo" />
          <div class="header-divider"></div>
          <div>
            <div class="header-brand-title">A E T H E L<br/>S T U D I O S</div>
            <div class="header-brand-tagline">${escapeHtml(studio.tagline)}</div>
          </div>
        </div>
        <div class="header-right" style="text-align: right">
          <div style="font-size: 22px; letter-spacing: 0.18em; margin-bottom: 8px">S T A T E M E N T</div>
          <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px">Ref: <strong>${escapeHtml(doc.documentNumber)}</strong></div>
          <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px">Date: <strong>${escapeHtml(formatEditorialDate(doc.createdDate))}</strong></div>
        </div>
      </header>
      <main class="body-content">
        <h2 style="margin: 0 0 14px 0; font-size: 22px">Account Ledger — ${escapeHtml(profile.clientName || doc.clientName)}</h2>
        <div class="summary-grid">
          <div class="summary-card"><div class="summary-label">Contract Value</div><div class="summary-val">${escapeHtml(formatINR(profile.totalProjectValue || 0))}</div></div>
          <div class="summary-card"><div class="summary-label">Total Invoiced</div><div class="summary-val">${escapeHtml(formatINR(profile.totalInvoiced || 0))}</div></div>
          <div class="summary-card"><div class="summary-label">Total Received</div><div class="summary-val" style="color: #059669">${escapeHtml(formatINR(profile.totalReceived || 0))}</div></div>
          <div class="summary-card"><div class="summary-label">Outstanding</div><div class="summary-val" style="color: ${(profile.outstandingBalance || 0) > 0 ? '#B45309' : '#059669'}">${escapeHtml(formatINR(profile.outstandingBalance || 0))}</div></div>
        </div>
        <table class="modern-items-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Ref #</th>
              <th>Description</th>
              <th style="text-align: right">Debit</th>
              <th style="text-align: right">Credit</th>
              <th style="text-align: right">Balance</th>
            </tr>
          </thead>
          <tbody>
            ${
              ledger.length === 0
                ? `<tr><td colspan="6" style="text-align: center; padding: 22px; color: #64748B">No ledger transactions recorded yet.</td></tr>`
                : ledger
                    .map(
                      (row) => `
                  <tr>
                    <td>${escapeHtml(formatEditorialDate(row.date))}</td>
                    <td><strong>${escapeHtml(row.referenceNumber)}</strong></td>
                    <td>${escapeHtml(row.description)}</td>
                    <td style="text-align: right">${row.debit > 0 ? escapeHtml(formatINR(row.debit)) : '—'}</td>
                    <td style="text-align: right; color: #059669">${row.credit > 0 ? escapeHtml(formatINR(row.credit)) : '—'}</td>
                    <td style="text-align: right; font-weight: 700">${escapeHtml(formatINR(row.balance))}</td>
                  </tr>
                `
                    )
                    .join('')
            }
          </tbody>
        </table>
      </main>
    </div>
    <footer class="footer-wrapper">
      <div class="gst-navy-pill">
        <span>${escapeHtml(studio.gstDisclaimer)}</span>
        <span>${escapeHtml(studio.studioName)} · ${escapeHtml(studio.website)}</span>
      </div>
    </footer>
  </div>
</body>
</html>`;
}

/**
 * Generates a complete, self-contained A4-sized print-ready HTML document for any
 * Quotation, Invoice, Payment Receipt, or Statement of Account using the approved Aethel Studios templates.
 */
export function renderDocumentToA4Html(
  doc: GeneratedDocument,
  settings: FinanceSettings = DEFAULT_FINANCE_SETTINGS,
  _templates: DocumentTemplate[] = DEFAULT_DOCUMENT_TEMPLATES,
  allPayments: ClientPayment[] = []
): string {
  if (doc.documentType === 'Invoice') {
    const structured = mapInvoiceToTemplateData(doc, settings, allPayments);
    return renderModernInvoiceOrQuotationHtml('Invoice', structured, doc.version || 1);
  }
  if (doc.documentType === 'Quotation') {
    const structured = mapQuotationToTemplateData(doc, settings);
    return renderModernInvoiceOrQuotationHtml('Quotation', structured, doc.version || 1);
  }
  if (doc.documentType === 'Payment Receipt') {
    const structured = mapReceiptToTemplateData(doc, settings, allPayments);
    return renderModernPaymentReceiptHtml(structured);
  }
  return renderModernStatementHtml(doc, settings);
}

/**
 * Generates a live sample/test document for any template in Finance Settings -> Document Templates.
 */
export function createSampleTestDocumentForTemplate(
  template: DocumentTemplate,
  settings: FinanceSettings = DEFAULT_FINANCE_SETTINGS
): GeneratedDocument {
  const docType =
    template.documentType && template.documentType !== 'All'
      ? template.documentType
      : template.id.includes('quotation')
      ? 'Quotation'
      : template.id.includes('receipt')
      ? 'Payment Receipt'
      : 'Invoice';

  const today = new Date().toISOString().slice(0, 10);

  if (docType === 'Payment Receipt') {
    return {
      id: `doc-test-receipt-${Date.now()}`,
      documentNumber: `${settings.receiptPrefix || 'AS-R-'}001`,
      documentType: 'Payment Receipt',
      version: 1,
      clientName: 'ABC Café',
      projectTitle: 'Website Design & Development — Professional Package',
      createdDate: '2026-11-19',
      amount: 5500,
      status: 'Verified Receipt',
      templateId: template.id,
      snapshotPayload: {
        payment: {
          id: 'pay-sample-1',
          receiptNumber: 'AS-R-001',
          invoiceNumber: 'AS-I-001',
          clientName: 'ABC Café',
          projectTitle: 'Website Design & Development',
          totalProjectValue: 11000,
          amountReceived: 5500,
          paymentDate: '2026-11-19',
          paymentMode: 'UPI',
          receivedInAccount: 'Studio Account',
          milestone: 'Advance (50%)',
          upiReference: 'UPIRef_238746XXXX',
        },
        invoiceNumber: 'AS-I-001',
        clientAddress: '123 Business Park, Nanded, Maharashtra – 431601',
        packageSubtitle: 'Professional Package',
        totalProjectOrInvoiceValue: 11000,
        totalReceivedToDate: 5500,
        outstandingRemaining: 5500,
      },
    };
  }

  const sampleItems: InvoiceLineItem[] = [
    {
      id: 's-1',
      serviceName: 'Website Design & Development',
      description: '',
      quantity: 1,
      unitPrice: 8000,
      total: 8000,
    },
    {
      id: 's-2',
      serviceName: 'WhatsApp Integration',
      description: '',
      quantity: 1,
      unitPrice: 500,
      total: 500,
    },
    {
      id: 's-3',
      serviceName: 'Catalogue Setup',
      description: '',
      quantity: 1,
      unitPrice: 1000,
      total: 1000,
    },
    {
      id: 's-4',
      serviceName: 'Google Maps Integration',
      description: '',
      quantity: 1,
      unitPrice: 500,
      total: 500,
    },
    {
      id: 's-5',
      serviceName: 'Gallery & Offers Section',
      description: '',
      quantity: 1,
      unitPrice: 1000,
      total: 1000,
    },
  ];

  if (docType === 'Quotation') {
    return {
      id: `doc-test-quotation-${Date.now()}`,
      documentNumber: `${settings.quotationPrefix || 'AS-Q-'}001`,
      documentType: 'Quotation',
      version: 1,
      clientName: 'ABC Café',
      projectTitle: 'Website Design & Development',
      createdDate: '2026-11-19',
      amount: 11000,
      status: 'Sent',
      templateId: template.id,
      snapshotPayload: {
        id: 'quo-sample-1',
        quoteNumber: 'AS-Q-001',
        clientName: 'ABC Café',
        clientAddress: '123 Business Park, Nanded, Maharashtra – 431601',
        clientEmail: 'abc@cafe.in',
        clientPhone: '+91 98765 43210',
        projectTitle: 'Website Design & Development',
        packageSubtitle: 'Professional Package',
        date: '2026-11-19',
        validUntil: '2026-11-26',
        status: 'Sent',
        lineItems: sampleItems,
        subtotal: 11000,
        discount: 0,
        total: 11000,
        paymentTerms: '50% Advance · 50% on Completion',
        notes: '',
        termsAndConditions:
          'Quotation valid for 7 days from issue date. 50% advance payment initiates project development.',
        createdAt: today,
      },
    };
  }

  return {
    id: `doc-test-invoice-${Date.now()}`,
    documentNumber: `${settings.invoicePrefix || 'AS-I-'}001`,
    documentType: 'Invoice',
    version: 1,
    clientName: 'ABC Café',
    projectTitle: 'Website Design & Development',
    createdDate: '2026-11-19',
    amount: 11000,
    status: 'Issued',
    templateId: template.id,
    snapshotPayload: {
      id: 'inv-sample-1',
      invoiceNumber: 'AS-I-001',
      clientName: 'ABC Café',
      clientAddress: '123 Business Park, Nanded, Maharashtra – 431601',
      clientEmail: 'abc@cafe.in',
      clientPhone: '+91 98765 43210',
      projectTitle: 'Website Design & Development',
      packageSubtitle: 'Professional Package',
      type: 'Standard Invoice',
      lineItems: sampleItems,
      subtotal: 11000,
      discount: 0,
      amount: 11000,
      amountPaid: 0,
      balanceDue: 11000,
      issueDate: '2026-11-19',
      dueDate: '2026-11-26',
      status: 'Issued',
      notes: '',
      gstEnabled: false,
      gstDisclaimer: settings.gstDisclaimer,
    },
  };
}

/**
 * Triggers native A4 PDF printing/saving inside an invisible iframe (works inside sandboxed preview iframes without window.open!).
 */
export function triggerPrintA4Document(
  doc: GeneratedDocument,
  settings: FinanceSettings = DEFAULT_FINANCE_SETTINGS,
  templates: DocumentTemplate[] = DEFAULT_DOCUMENT_TEMPLATES,
  allPayments: ClientPayment[] = []
): void {
  const html = renderDocumentToA4Html(doc, settings, templates, allPayments);
  const existingFrame = document.getElementById('aethel-a4-print-frame');
  if (existingFrame) {
    existingFrame.remove();
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'aethel-a4-print-frame';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const frameDoc = iframe.contentWindow?.document;
  if (frameDoc) {
    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        downloadDocumentFile(doc, settings, templates, allPayments);
      }
    }, 350);
  }
}

/**
 * Downloads a standalone A4 print-ready document file to the user's device.
 */
export function downloadDocumentFile(
  doc: GeneratedDocument,
  settings: FinanceSettings = DEFAULT_FINANCE_SETTINGS,
  templates: DocumentTemplate[] = DEFAULT_DOCUMENT_TEMPLATES,
  allPayments: ClientPayment[] = []
): void {
  const html = renderDocumentToA4Html(doc, settings, templates, allPayments);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeClient = (doc.clientName || 'Client').replace(/[^a-zA-Z0-9_-]/g, '_');
  a.href = url;
  a.download = `${doc.documentNumber}_${doc.documentType.replace(/\s+/g, '_')}_${safeClient}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Builds a WhatsApp share URL with an accurate, transparent summary of the document.
 */
export function buildWhatsAppDocumentShareUrl(
  doc: GeneratedDocument,
  settings: FinanceSettings = DEFAULT_FINANCE_SETTINGS,
  clientPhone?: string
): string {
  const disclaimer =
    settings.gstRegistrationStatus === 'Unregistered'
      ? settings.gstDisclaimer
      : `GSTIN: ${settings.gstin}`;

  const lines = [
    `Hello *${doc.clientName}*,`,
    `Here are the details for your *${doc.documentType}* (*${doc.documentNumber}*) from *${settings.studioName}*:`,
    `• Document: ${doc.documentType} #${doc.documentNumber}`,
    doc.projectTitle ? `• Project: ${doc.projectTitle}` : '',
    `• Amount: ${formatINR(doc.amount)}`,
    `• Status: ${doc.status}`,
    `• Date: ${formatEditorialDate(doc.createdDate)}`,
    settings.upiId ? `• Studio UPI ID: ${settings.upiId}` : '',
    `_${disclaimer}_`,
    `— ${settings.contactPerson1} & ${settings.contactPerson2}, ${settings.studioName}`,
  ].filter(Boolean);

  const text = encodeURIComponent(lines.join('\n'));
  const cleanPhone = (clientPhone || '').replace(/\D/g, '');
  if (cleanPhone.length >= 10) {
    const withCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    return `https://wa.me/${withCountry}?text=${text}`;
  }
  return `https://wa.me/?text=${text}`;
}
