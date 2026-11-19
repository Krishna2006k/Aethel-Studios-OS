import {
  ClientInvoice,
  ClientPayment,
  ClientQuotation,
  DocumentTemplate,
  FinanceSettings,
  GeneratedDocument,
} from '../types';
import { formatINR } from './calculations';
import {
  ClientFinancialProfileSummary,
  DEFAULT_DOCUMENT_TEMPLATES,
  DEFAULT_FINANCE_SETTINGS,
  numberToIndianRupeesWords,
} from './financeEngine';

function escapeHtml(str?: string | number): string {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function resolveTemplate(
  templateId?: string,
  templates: DocumentTemplate[] = DEFAULT_DOCUMENT_TEMPLATES,
  settings: FinanceSettings = DEFAULT_FINANCE_SETTINGS
): DocumentTemplate {
  const found =
    templates.find((t) => t.id === templateId) ||
    templates.find((t) => t.id === settings.defaultTemplateId) ||
    DEFAULT_DOCUMENT_TEMPLATES[0];
  return {
    ...found,
    accentColor: settings.accentColor || found.accentColor,
    footerText: settings.footerText || found.footerText,
  };
}

/**
 * Generates a complete, self-contained A4-sized print-ready HTML document for any Invoice, Quotation, Payment Receipt, or Statement of Account.
 */
export function renderDocumentToA4Html(
  doc: GeneratedDocument,
  settings: FinanceSettings = DEFAULT_FINANCE_SETTINGS,
  templates: DocumentTemplate[] = DEFAULT_DOCUMENT_TEMPLATES,
  allPayments: ClientPayment[] = []
): string {
  const tpl = resolveTemplate(doc.templateId, templates, settings);
  const accent = tpl.accentColor || '#2563EB';
  const payload = doc.snapshotPayload || {};

  const isDarkHeader = tpl.headerStyle === 'editorial-dark';
  const isBoldHeader = tpl.headerStyle === 'bold-accent';

  const headerBg = isDarkHeader
    ? '#0B0F19'
    : isBoldHeader
    ? accent
    : '#FFFFFF';
  const headerText = isDarkHeader || isBoldHeader ? '#FFFFFF' : '#0B0F19';
  const headerSub = isDarkHeader || isBoldHeader ? 'rgba(255,255,255,0.76)' : '#64748B';

  const disclaimerText =
    settings.gstRegistrationStatus === 'Unregistered' || !settings.gstEnabled
      ? settings.gstDisclaimer || 'GST not charged. Supplier is not registered under GST.'
      : `GSTIN: ${settings.gstin} · Tax Rate: ${settings.gstRatePercent}%`;

  let bodySectionHtml = '';

  if (doc.documentType === 'Invoice') {
    const inv = payload as unknown as ClientInvoice;
    const items =
      inv.lineItems && inv.lineItems.length > 0
        ? inv.lineItems
        : [
            {
              id: '1',
              serviceName: inv.projectTitle || 'Digital Agency Services',
              description: inv.notes || '',
              quantity: 1,
              unitPrice: inv.amount || doc.amount,
              total: inv.amount || doc.amount,
            },
          ];
    const subtotal = inv.subtotal ?? items.reduce((s, i) => s + i.total, 0);
    const discount = inv.discount ?? 0;
    const grandTotal = inv.amount ?? Math.max(0, subtotal - discount);
    const paid = inv.amountPaid ?? 0;
    const balance = inv.balanceDue ?? Math.max(0, grandTotal - paid);

    const linkedPayments = allPayments.filter(
      (p) => p.invoiceId === inv.id || p.invoiceNumber === inv.invoiceNumber
    );

    bodySectionHtml = `
      <div class="meta-grid">
        <div class="meta-box">
          <div class="meta-label">BILLED TO</div>
          <div class="meta-title">${escapeHtml(inv.clientName || doc.clientName)}</div>
          ${inv.clientContactPerson ? `<div class="meta-line">Attn: ${escapeHtml(inv.clientContactPerson)}</div>` : ''}
          ${inv.clientPhone ? `<div class="meta-line">Phone: ${escapeHtml(inv.clientPhone)}</div>` : ''}
          ${inv.clientEmail ? `<div class="meta-line">Email: ${escapeHtml(inv.clientEmail)}</div>` : ''}
          ${inv.clientAddress ? `<div class="meta-line">${escapeHtml(inv.clientAddress)}</div>` : ''}
        </div>
        <div class="meta-box meta-right">
          <div class="meta-row"><span>Invoice Number:</span><strong>${escapeHtml(inv.invoiceNumber || doc.documentNumber)}</strong></div>
          <div class="meta-row"><span>Issue Date:</span><strong>${escapeHtml(inv.issueDate || doc.createdDate)}</strong></div>
          <div class="meta-row"><span>Due Date:</span><strong>${escapeHtml(inv.dueDate || doc.createdDate)}</strong></div>
          <div class="meta-row"><span>Project:</span><strong>${escapeHtml(inv.projectTitle || doc.projectTitle || 'Website & Growth')}</strong></div>
          <div class="meta-row"><span>Status:</span><strong class="status-badge">${escapeHtml(inv.status || doc.status)}</strong></div>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 6%">#</th>
            <th style="width: 48%">Service &amp; Deliverables</th>
            <th style="width: 12%; text-align: right">Qty</th>
            <th style="width: 17%; text-align: right">Unit Price</th>
            <th style="width: 17%; text-align: right">Line Total</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map(
              (item, idx) => `
            <tr>
              <td class="mono">${idx + 1}</td>
              <td>
                <div class="item-title">${escapeHtml(item.serviceName)}</div>
                ${item.description ? `<div class="item-desc">${escapeHtml(item.description)}</div>` : ''}
              </td>
              <td class="mono" style="text-align: right">${escapeHtml(item.quantity)}</td>
              <td class="mono" style="text-align: right">${escapeHtml(formatINR(item.unitPrice))}</td>
              <td class="mono" style="text-align: right; font-weight: 700">${escapeHtml(formatINR(item.total))}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>

      <div class="totals-section avoid-break">
        <div class="payment-instructions">
          <div class="meta-label">PAYMENT DETAILS &amp; TERMS</div>
          <div class="meta-line"><strong>UPI ID:</strong> <span class="mono">${escapeHtml(settings.upiId)}</span></div>
          ${settings.bankName ? `<div class="meta-line"><strong>Bank:</strong> ${escapeHtml(settings.bankName)} ${settings.bankAccountNumber ? `· A/C: ${escapeHtml(settings.bankAccountNumber)}` : ''} ${settings.bankIfsc ? `· IFSC: ${escapeHtml(settings.bankIfsc)}` : ''}</div>` : ''}
          <div class="meta-line"><strong>Terms:</strong> ${escapeHtml(inv.paymentTerms || 'Due upon receipt / milestone schedule')}</div>
          <div class="words-box"><strong>Amount in Words:</strong> ${escapeHtml(numberToIndianRupeesWords(grandTotal))}</div>
          ${inv.notes ? `<div class="notes-box"><strong>Notes:</strong> ${escapeHtml(inv.notes)}</div>` : ''}
        </div>

        <div class="totals-card">
          <div class="totals-row"><span>Subtotal</span><span class="mono">${escapeHtml(formatINR(subtotal))}</span></div>
          ${discount > 0 ? `<div class="totals-row"><span>Discount</span><span class="mono">- ${escapeHtml(formatINR(discount))}</span></div>` : ''}
          <div class="totals-row grand"><span>Invoice Grand Total</span><span class="mono">${escapeHtml(formatINR(grandTotal))}</span></div>
          <div class="totals-row paid"><span>Amount Paid to Date</span><span class="mono">${escapeHtml(formatINR(paid))}</span></div>
          <div class="totals-row balance"><span>Remaining Balance Due</span><span class="mono">${escapeHtml(formatINR(balance))}</span></div>
        </div>
      </div>

      ${
        linkedPayments.length > 0
          ? `
        <div class="history-block avoid-break">
          <div class="meta-label">RECORDED PAYMENT HISTORY (${linkedPayments.length})</div>
          <table class="items-table compact">
            <thead>
              <tr>
                <th>Date</th>
                <th>Receipt #</th>
                <th>Method / Reference</th>
                <th>Milestone</th>
                <th style="text-align: right">Amount Paid</th>
              </tr>
            </thead>
            <tbody>
              ${linkedPayments
                .map(
                  (p) => `
                <tr>
                  <td class="mono">${escapeHtml(p.paymentDate)}</td>
                  <td class="mono">${escapeHtml(p.receiptNumber || p.id)}</td>
                  <td>${escapeHtml(p.paymentMode)}${p.upiReference ? ` (${escapeHtml(p.upiReference)})` : ''}</td>
                  <td>${escapeHtml(p.milestone)}</td>
                  <td class="mono" style="text-align: right; font-weight: 700; color: #059669">${escapeHtml(formatINR(p.amountReceived))}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `
          : ''
      }
    `;
  } else if (doc.documentType === 'Quotation') {
    const q = payload as unknown as ClientQuotation;
    const items = q.lineItems || [];
    bodySectionHtml = `
      <div class="meta-grid">
        <div class="meta-box">
          <div class="meta-label">PREPARED FOR</div>
          <div class="meta-title">${escapeHtml(q.clientName || doc.clientName)}</div>
          ${q.clientContactPerson ? `<div class="meta-line">Attn: ${escapeHtml(q.clientContactPerson)}</div>` : ''}
          ${q.clientPhone ? `<div class="meta-line">Phone: ${escapeHtml(q.clientPhone)}</div>` : ''}
          ${q.clientEmail ? `<div class="meta-line">Email: ${escapeHtml(q.clientEmail)}</div>` : ''}
          ${q.clientAddress ? `<div class="meta-line">${escapeHtml(q.clientAddress)}</div>` : ''}
        </div>
        <div class="meta-box meta-right">
          <div class="meta-row"><span>Quotation Number:</span><strong>${escapeHtml(q.quoteNumber || doc.documentNumber)}</strong></div>
          <div class="meta-row"><span>Date Issued:</span><strong>${escapeHtml(q.date || doc.createdDate)}</strong></div>
          <div class="meta-row"><span>Valid Until:</span><strong>${escapeHtml(q.validUntil || doc.createdDate)}</strong></div>
          <div class="meta-row"><span>Project Scope:</span><strong>${escapeHtml(q.projectTitle || doc.projectTitle)}</strong></div>
          <div class="meta-row"><span>Quotation Status:</span><strong class="status-badge">${escapeHtml(q.status || doc.status)}</strong></div>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 6%">#</th>
            <th style="width: 48%">Proposed Service &amp; Deliverables</th>
            <th style="width: 12%; text-align: right">Qty</th>
            <th style="width: 17%; text-align: right">Unit Investment</th>
            <th style="width: 17%; text-align: right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map(
              (item, idx) => `
            <tr>
              <td class="mono">${idx + 1}</td>
              <td>
                <div class="item-title">${escapeHtml(item.serviceName)}</div>
                ${item.description ? `<div class="item-desc">${escapeHtml(item.description)}</div>` : ''}
              </td>
              <td class="mono" style="text-align: right">${escapeHtml(item.quantity)}</td>
              <td class="mono" style="text-align: right">${escapeHtml(formatINR(item.unitPrice))}</td>
              <td class="mono" style="text-align: right; font-weight: 700">${escapeHtml(formatINR(item.total))}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>

      <div class="totals-section avoid-break">
        <div class="payment-instructions">
          <div class="meta-label">TERMS &amp; CONDITIONS</div>
          <div class="meta-line">${escapeHtml(q.termsAndConditions || '50% advance to initiate build, 50% upon final preview approval prior to production deployment.')}</div>
          <div class="words-box"><strong>Total in Words:</strong> ${escapeHtml(numberToIndianRupeesWords(q.total || doc.amount))}</div>
          ${q.notes ? `<div class="notes-box"><strong>Scope Notes:</strong> ${escapeHtml(q.notes)}</div>` : ''}
        </div>

        <div class="totals-card">
          <div class="totals-row"><span>Subtotal</span><span class="mono">${escapeHtml(formatINR(q.subtotal || doc.amount))}</span></div>
          ${q.discount > 0 ? `<div class="totals-row"><span>Special Studio Discount</span><span class="mono">- ${escapeHtml(formatINR(q.discount))}</span></div>` : ''}
          <div class="totals-row grand"><span>Estimated Project Total</span><span class="mono">${escapeHtml(formatINR(q.total || doc.amount))}</span></div>
        </div>
      </div>
    `;
  } else if (doc.documentType === 'Payment Receipt') {
    const receiptData = payload as {
      payment: ClientPayment;
      invoiceNumber?: string;
      totalProjectOrInvoiceValue: number;
      totalReceivedToDate: number;
      outstandingRemaining: number;
    };
    const p = receiptData.payment || (payload as unknown as ClientPayment);
    const amountThisTxn = Number(p.amountReceived) || doc.amount;
    const totalVal =
      receiptData.totalProjectOrInvoiceValue ?? Number(p.totalProjectValue) ?? amountThisTxn;
    const totalReceivedToDate = receiptData.totalReceivedToDate ?? amountThisTxn;
    const outstandingRemaining =
      receiptData.outstandingRemaining ?? Math.max(0, totalVal - totalReceivedToDate);

    bodySectionHtml = `
      <div class="receipt-banner avoid-break">
        <div>
          <div class="meta-label">OFFICIAL PAYMENT ACKNOWLEDGEMENT</div>
          <div class="receipt-title">Payment Received with Thanks</div>
          <div class="meta-line">Received from <strong>${escapeHtml(p.clientName || doc.clientName)}</strong> towards <strong>${escapeHtml(p.projectTitle || doc.projectTitle)}</strong></div>
        </div>
        <div class="receipt-amount-box">
          <div class="receipt-amount-label">AMOUNT RECEIVED (THIS TRANSACTION)</div>
          <div class="receipt-amount-val mono">${escapeHtml(formatINR(amountThisTxn))}</div>
        </div>
      </div>

      <div class="meta-grid">
        <div class="meta-box">
          <div class="meta-label">PAYER &amp; PROJECT DETAILS</div>
          <div class="meta-row"><span>Received From:</span><strong>${escapeHtml(p.clientName || doc.clientName)}</strong></div>
          <div class="meta-row"><span>Project / Service:</span><strong>${escapeHtml(p.projectTitle || doc.projectTitle)}</strong></div>
          <div class="meta-row"><span>Milestone / Stage:</span><strong>${escapeHtml(p.milestone || 'Milestone Payment')}</strong></div>
          ${receiptData.invoiceNumber || p.invoiceNumber ? `<div class="meta-row"><span>Associated Invoice:</span><strong class="mono">${escapeHtml(receiptData.invoiceNumber || p.invoiceNumber)}</strong></div>` : ''}
        </div>
        <div class="meta-box">
          <div class="meta-label">TRANSACTION METADATA</div>
          <div class="meta-row"><span>Receipt Number:</span><strong class="mono">${escapeHtml(doc.documentNumber)}</strong></div>
          <div class="meta-row"><span>Receipt Date:</span><strong class="mono">${escapeHtml(p.paymentDate || doc.createdDate)}</strong></div>
          <div class="meta-row"><span>Payment Method:</span><strong>${escapeHtml(p.paymentMode || 'UPI')}</strong></div>
          <div class="meta-row"><span>Transaction Reference:</span><strong class="mono">${escapeHtml(p.upiReference || 'Verified Direct Transfer')}</strong></div>
        </div>
      </div>

      <div class="words-box" style="margin: 18px 0">
        <strong>Amount Received in Words:</strong> ${escapeHtml(numberToIndianRupeesWords(amountThisTxn))}
      </div>

      <div class="meta-label" style="margin-top: 20px; margin-bottom: 8px">ACCOUNT RECONCILIATION SUMMARY</div>
      <table class="items-table">
        <thead>
          <tr>
            <th>Financial Metric</th>
            <th>Description</th>
            <th style="text-align: right">Amount (INR)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Total Project / Invoice Value</strong></td>
            <td>Agreed total contract or invoice value</td>
            <td class="mono" style="text-align: right; font-weight: 700">${escapeHtml(formatINR(totalVal))}</td>
          </tr>
          <tr>
            <td><strong>Amount Received in This Transaction</strong></td>
            <td>Verified payment acknowledged by this receipt (${escapeHtml(doc.documentNumber)})</td>
            <td class="mono" style="text-align: right; font-weight: 700; color: #059669">${escapeHtml(formatINR(amountThisTxn))}</td>
          </tr>
          <tr>
            <td><strong>Total Amount Received to Date</strong></td>
            <td>Cumulative verified payments received across all milestones</td>
            <td class="mono" style="text-align: right; font-weight: 700; color: #2563EB">${escapeHtml(formatINR(totalReceivedToDate))}</td>
          </tr>
          <tr>
            <td><strong>Outstanding Balance Remaining</strong></td>
            <td>Remaining unpaid balance on this invoice/project</td>
            <td class="mono" style="text-align: right; font-weight: 700; color: ${outstandingRemaining > 0 ? '#D97706' : '#059669'}">${escapeHtml(formatINR(outstandingRemaining))}</td>
          </tr>
        </tbody>
      </table>
    `;
  } else if (doc.documentType === 'Statement of Account') {
    const profile = payload as unknown as ClientFinancialProfileSummary;
    const ledger = profile.ledger || [];

    bodySectionHtml = `
      <div class="meta-grid">
        <div class="meta-box">
          <div class="meta-label">CLIENT STATEMENT OF ACCOUNT</div>
          <div class="meta-title">${escapeHtml(profile.clientName || doc.clientName)}</div>
          <div class="meta-line">Statement Number: <strong class="mono">${escapeHtml(doc.documentNumber)}</strong></div>
          <div class="meta-line">Generated Date: <strong class="mono">${escapeHtml(doc.createdDate)}</strong></div>
        </div>
        <div class="meta-box meta-right">
          <div class="meta-row"><span>Total Project Value:</span><strong class="mono">${escapeHtml(formatINR(profile.totalProjectValue || 0))}</strong></div>
          <div class="meta-row"><span>Total Invoiced (Debit):</span><strong class="mono">${escapeHtml(formatINR(profile.totalInvoiced || 0))}</strong></div>
          <div class="meta-row"><span>Total Received (Credit):</span><strong class="mono" style="color:#059669">${escapeHtml(formatINR(profile.totalReceived || 0))}</strong></div>
          <div class="meta-row"><span>Net Outstanding Balance:</span><strong class="mono" style="color:${(profile.outstandingBalance || 0) > 0 ? '#D97706' : '#059669'}">${escapeHtml(formatINR(profile.outstandingBalance || 0))}</strong></div>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 14%">Date</th>
            <th style="width: 16%">Reference</th>
            <th style="width: 34%">Description</th>
            <th style="width: 12%; text-align: right">Debit (₹)</th>
            <th style="width: 12%; text-align: right">Credit (₹)</th>
            <th style="width: 12%; text-align: right">Balance (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${
            ledger.length === 0
              ? `<tr><td colspan="6" style="text-align: center; padding: 24px; color: #64748B">No invoice or payment entries recorded yet for this account.</td></tr>`
              : ledger
                  .map(
                    (row) => `
                <tr>
                  <td class="mono">${escapeHtml(row.date)}</td>
                  <td class="mono">${escapeHtml(row.referenceNumber)}</td>
                  <td>${escapeHtml(row.description)}</td>
                  <td class="mono" style="text-align: right">${row.debit > 0 ? escapeHtml(formatINR(row.debit)) : '—'}</td>
                  <td class="mono" style="text-align: right; color: #059669">${row.credit > 0 ? escapeHtml(formatINR(row.credit)) : '—'}</td>
                  <td class="mono" style="text-align: right; font-weight: 700">${escapeHtml(formatINR(row.balance))}</td>
                </tr>
              `
                  )
                  .join('')
          }
        </tbody>
      </table>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(doc.documentType)} — ${escapeHtml(doc.documentNumber)} (${escapeHtml(doc.clientName)})</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    @page {
      size: A4 portrait;
      margin: 14mm 14mm 16mm 14mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #0B0F19;
      background: #FFFFFF;
      font-size: 12px;
      line-height: 1.5;
    }
    .a4-container {
      max-width: 210mm;
      margin: 0 auto;
      padding: 24px 28px;
      background: #FFFFFF;
    }
    .mono {
      font-family: 'JetBrains Mono', monospace;
    }
    .doc-header {
      background: ${headerBg};
      color: ${headerText};
      padding: 26px 28px;
      border-radius: 16px;
      border: ${isDarkHeader || isBoldHeader ? 'none' : '2px solid #0B0F19'};
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      margin-bottom: 22px;
    }
    .brand-mark {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-logo {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: ${isDarkHeader || isBoldHeader ? '#FFFFFF' : '#0B0F19'};
      color: ${isDarkHeader || isBoldHeader ? '#0B0F19' : '#FFFFFF'};
      font-weight: 800;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .brand-name {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .brand-sub {
      font-size: 11px;
      color: ${headerSub};
      margin-top: 2px;
    }
    .doc-badge-block {
      text-align: right;
    }
    .doc-type-pill {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      background: ${isDarkHeader || isBoldHeader ? 'rgba(255,255,255,0.16)' : '#EFF6FF'};
      color: ${isDarkHeader || isBoldHeader ? '#FFFFFF' : accent};
    }
    .doc-number-large {
      font-family: 'JetBrains Mono', monospace;
      font-size: 20px;
      font-weight: 800;
      margin-top: 6px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 20px;
    }
    .meta-box {
      padding: 16px 18px;
      border-radius: 12px;
      border: 1px solid #E2E8F0;
      background: #F8FAFC;
    }
    .meta-label {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: ${accent};
      margin-bottom: 6px;
    }
    .meta-title {
      font-size: 15px;
      font-weight: 800;
      color: #0B0F19;
      margin-bottom: 4px;
    }
    .meta-line {
      font-size: 11.5px;
      color: #475569;
      margin-top: 2px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      font-size: 11.5px;
      padding: 3px 0;
      border-bottom: 1px dashed #E2E8F0;
    }
    .meta-row:last-child {
      border-bottom: none;
    }
    .status-badge {
      color: ${accent};
      text-transform: uppercase;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .items-table thead {
      display: table-header-group;
    }
    .items-table th {
      background: #0B0F19;
      color: #FFFFFF;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 10px 12px;
      text-align: left;
    }
    .items-table td {
      padding: 11px 12px;
      border-bottom: 1px solid #E2E8F0;
      vertical-align: top;
      font-size: 11.5px;
    }
    .items-table tr {
      page-break-inside: avoid;
    }
    .item-title {
      font-weight: 700;
      color: #0B0F19;
    }
    .item-desc {
      font-size: 11px;
      color: #64748B;
      margin-top: 2px;
    }
    .totals-section {
      display: grid;
      grid-template-columns: 1.25fr 1fr;
      gap: 20px;
      align-items: start;
      margin-top: 12px;
    }
    .totals-card {
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 14px 16px;
      background: #F8FAFC;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      font-size: 12px;
      color: #475569;
    }
    .totals-row.grand {
      border-top: 2px solid #0B0F19;
      border-bottom: 1px solid #E2E8F0;
      margin-top: 4px;
      padding: 10px 0;
      font-size: 14px;
      font-weight: 800;
      color: #0B0F19;
    }
    .totals-row.paid {
      color: #059669;
      font-weight: 700;
    }
    .totals-row.balance {
      font-weight: 800;
      color: #0B0F19;
    }
    .words-box, .notes-box {
      margin-top: 10px;
      padding: 8px 12px;
      border-radius: 8px;
      background: #F1F5F9;
      font-size: 11px;
      color: #334155;
    }
    .receipt-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 18px 20px;
      border-radius: 14px;
      background: #ECFDF5;
      border: 1px solid #A7F3D0;
      margin-bottom: 18px;
    }
    .receipt-title {
      font-size: 16px;
      font-weight: 800;
      color: #065F46;
    }
    .receipt-amount-box {
      text-align: right;
    }
    .receipt-amount-label {
      font-size: 9px;
      font-weight: 800;
      color: #047857;
      letter-spacing: 0.06em;
    }
    .receipt-amount-val {
      font-size: 22px;
      font-weight: 800;
      color: #059669;
    }
    .avoid-break {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .doc-footer {
      margin-top: 28px;
      padding-top: 14px;
      border-top: 1px solid #E2E8F0;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 10.5px;
      color: #64748B;
    }
    .gst-disclaimer {
      font-weight: 700;
      color: #0B0F19;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      padding: 6px 10px;
      border-radius: 6px;
      display: inline-block;
      margin-bottom: 6px;
    }
  </style>
</head>
<body>
  <div class="a4-container">
    <div class="doc-header">
      <div>
        <div class="brand-mark">
          ${tpl.showLogo ? `<div class="brand-logo">A</div>` : ''}
          <div>
            <div class="brand-name">${escapeHtml(settings.studioName)}</div>
            <div class="brand-sub">${escapeHtml(settings.address)} · ${escapeHtml(settings.email)}</div>
          </div>
        </div>
        <div class="brand-sub" style="margin-top: 8px">
          ${escapeHtml(settings.contactPerson1)} (${escapeHtml(settings.phone1)}) · ${escapeHtml(settings.contactPerson2)} (${escapeHtml(settings.phone2)})
        </div>
      </div>

      <div class="doc-badge-block">
        <div class="doc-type-pill">${escapeHtml(doc.documentType)}</div>
        <div class="doc-number-large">${escapeHtml(doc.documentNumber)}</div>
        <div class="brand-sub">Version v${escapeHtml(doc.version || 1)} · ${escapeHtml(doc.createdDate)}</div>
      </div>
    </div>

    ${bodySectionHtml}

    <div class="doc-footer avoid-break">
      <div>
        <div class="gst-disclaimer">${escapeHtml(disclaimerText)}</div>
        <div>${escapeHtml(tpl.footerText)}</div>
      </div>
      <div style="text-align: right">
        <div style="font-weight: 800; color: #0B0F19">For ${escapeHtml(settings.studioName)}</div>
        <div style="margin-top: 2px">Authorized Signatory</div>
      </div>
    </div>
  </div>
</body>
</html>`;
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
        // Fallback to direct download if print is blocked
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
    `• Date: ${doc.createdDate}`,
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
