import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCPL,
  calculatePendingBalance,
  calculateStudioFinances,
  calculateClientProjectProgress,
  formatINR,
} from './calculations';
import {
  reconcileDatabaseIntegrity,
  recordPaymentAndSyncClient,
  deletePaymentAndSyncClient,
  cascadeClientUpdate,
  cascadeClientDelete,
  convertLeadToActiveProject,
  toggleClientMilestone,
} from './syncEngine';
import { SEED_DATA } from '../data/seedData';
import type { AethelDatabaseState } from '../types';

const REAL_STUDIO_FIXTURE: AethelDatabaseState = {
  lastUpdated: '2026-11-18T06:00:00.000Z',
  clients: [
    {
      id: 'cli-1794853265701',
      businessName: 'Balaji Lawns',
      contactPerson: 'Mangesh',
      phone: '910000000000',
      city: 'Risod',
      niche: 'Banquet/Lawns',
      packageTier: 'Custom Website',
      quotedPrice: 17000,
      finalAgreedPrice: 17000,
      advancePaid: 0,
      stage: 'In Building',
      assignedTo: 'Both',
      sampleLinkSent: '',
      followUpDate: '2026-11-18',
      notes: '',
      createdAt: '2026-11-16',
    },
    {
      id: 'cli-1794853228970',
      businessName: 'Kabra Mobiles',
      contactPerson: 'Sagar Kabra',
      phone: '919999999999',
      city: 'Risod',
      niche: 'Retail/Electronics',
      packageTier: 'Custom Website & Meta Ads 7 days',
      quotedPrice: 10000,
      finalAgreedPrice: 10000,
      advancePaid: 10000,
      stage: 'Delivered / Live',
      assignedTo: 'Both',
      sampleLinkSent: '',
      followUpDate: '2026-11-18',
      notes: '',
      createdAt: '2026-11-16',
    },
    {
      id: 'cli-1794853300739',
      businessName: 'Lambhodar Lawns',
      contactPerson: 'XYZ',
      phone: '910000000000',
      city: 'Risod',
      niche: 'Banquet/Lawns',
      packageTier: 'Custom Website',
      quotedPrice: 25000,
      finalAgreedPrice: 25000,
      advancePaid: 0,
      stage: 'In Talks / Demo Shown',
      assignedTo: 'Both',
      sampleLinkSent: '',
      followUpDate: '2026-11-18',
      notes: '',
      createdAt: '2026-11-16',
    },
    {
      id: 'cli-1794853179793',
      businessName: 'New Sagar Mobiles Risod',
      contactPerson: 'Sagar',
      phone: '918975222238',
      city: 'Pune',
      niche: 'Retail/Electronics',
      packageTier: 'Custom Website & Meta Ads 7 days',
      quotedPrice: 12000,
      finalAgreedPrice: 10000,
      advancePaid: 3000,
      stage: 'Live / Payment Pending',
      assignedTo: 'Krishna',
      sampleLinkSent: '',
      followUpDate: '2026-11-18',
      notes: '',
      createdAt: '2026-11-16',
    },
    {
      id: 'cli-1794853338563',
      businessName: 'Lawns Washim',
      contactPerson: 'XYZ',
      phone: '910000000000',
      city: 'Washim',
      niche: 'Banquet/Lawns',
      packageTier: 'Custom Website & Meta Ads',
      quotedPrice: 25000,
      finalAgreedPrice: 25000,
      advancePaid: 0,
      stage: 'In Talks / Demo Shown',
      assignedTo: 'Both',
      sampleLinkSent: '',
      followUpDate: '2026-11-18',
      notes: '',
      createdAt: '2026-11-16',
    },
  ],
  metaCampaigns: [],
  websites: [],
  tickets: [],
  rndProjects: [],
  expenses: [],
  payments: [
    {
      id: 'pay-1794896687865',
      clientId: 'cli-1794853228970',
      clientName: 'Kabra Mobiles',
      projectTitle: 'Custom Website & Meta Ads 7 days',
      totalProjectValue: 10000,
      amountReceived: 10000,
      paymentDate: '2026-11-17',
      paymentMode: 'Cash',
      receivedInAccount: 'Vansh',
      milestone: 'Full Upfront',
    },
    {
      id: 'pay-1794896703190',
      clientId: 'cli-1794853179793',
      clientName: 'New Sagar Mobiles Risod',
      projectTitle: 'Custom Website & Meta Ads 7 days',
      totalProjectValue: 10000,
      amountReceived: 3000,
      paymentDate: '2026-11-17',
      paymentMode: 'UPI',
      receivedInAccount: 'Vansh',
      milestone: 'Advance (50%)',
    },
  ],
  vaultItems: [],
  tasks: [],
  activityLogs: [],
};

test('SEED_DATA is completely clean with zero demo records', () => {
  assert.equal(SEED_DATA.clients.length, 0);
  assert.equal(SEED_DATA.payments.length, 0);
  assert.equal(SEED_DATA.metaCampaigns.length, 0);
  assert.equal(SEED_DATA.websites.length, 0);
  assert.equal(SEED_DATA.tickets.length, 0);
  assert.equal(SEED_DATA.expenses.length, 0);
  assert.equal(SEED_DATA.tasks?.length || 0, 0);
});

test('reconcileDatabaseIntegrity strips legacy demo seed IDs while preserving real user records', () => {
  const polluted: AethelDatabaseState = {
    ...REAL_STUDIO_FIXTURE,
    clients: [
      ...REAL_STUDIO_FIXTURE.clients,
      {
        id: 'cli-1',
        businessName: "Lotus Women's Hospital & Fertility Center",
        contactPerson: 'Dr. Deshmukh',
        phone: '91000',
        city: 'Pune',
        niche: 'Clinic/Hospital',
        packageTier: 'Demo',
        quotedPrice: 32000,
        finalAgreedPrice: 28500,
        advancePaid: 28500,
        stage: 'Delivered / Live',
        assignedTo: 'Krishna',
        sampleLinkSent: '',
        followUpDate: '2026-11-18',
        notes: '',
        createdAt: '2026-11-01',
      },
    ],
  };

  const cleaned = reconcileDatabaseIntegrity(polluted);
  assert.equal(cleaned.clients.length, 5);
  assert.equal(cleaned.clients.some((c) => c.id === 'cli-1'), false);
  assert.equal(cleaned.clients.some((c) => c.businessName === 'Balaji Lawns'), true);
});

test('calculateStudioFinances guarantees Confirmed Deal Volume == Collected + Pending Receivables', () => {
  const reconciled = reconcileDatabaseIntegrity(REAL_STUDIO_FIXTURE);
  const fin = calculateStudioFinances(
    reconciled.expenses,
    reconciled.payments,
    reconciled.clients,
    reconciled.metaCampaigns,
    reconciled.tickets,
    reconciled.tasks || []
  );

  // 3 confirmed deals: Balaji Lawns (17,000), Kabra Mobiles (10,000), New Sagar Mobiles (10,000) = 37,000
  assert.equal(fin.totalContractedVolume, 37000);
  // Collected: Kabra Mobiles (10,000) + New Sagar Mobiles (3,000) = 13,000
  assert.equal(fin.clientProjectRevenue, 13000);
  // Pending Receivables: Balaji Lawns (17,000) + New Sagar Mobiles (7,000) = 24,000
  assert.equal(fin.pendingReceivables, 24000);
  // Mathematical identity: Confirmed Volume === Collected + Pending Receivables
  assert.equal(fin.totalContractedVolume, fin.clientProjectRevenue + fin.pendingReceivables);
  // Unclosed Sales Pipeline: Lambhodar Lawns (25,000) + Lawns Washim (25,000) = 50,000 across 2 leads
  assert.equal(fin.unclosedPipelineVolume, 50000);
  assert.equal(fin.unclosedLeadsCount, 2);
});

test('calculateCPL and calculatePendingBalance handle edge cases', () => {
  assert.equal(calculateCPL(14200, 118), 120);
  assert.equal(calculateCPL(5000, 0), 0);
  assert.equal(calculatePendingBalance(25000, 10000), 15000);
  assert.equal(calculatePendingBalance(15000, 20000), 0);
  assert.equal(formatINR(13000), '₹13,000');
});

test('Bidirectional Payment Sync: recording and deleting a payment updates client advancePaid and stage', () => {
  const initial = reconcileDatabaseIntegrity(REAL_STUDIO_FIXTURE);
  const sagarBefore = initial.clients.find((c) => c.id === 'cli-1794853179793')!;
  assert.equal(sagarBefore.advancePaid, 3000);
  assert.equal(sagarBefore.stage, 'Live / Payment Pending');

  // Settle remaining ₹7,000 for New Sagar Mobiles Risod
  const afterPay = recordPaymentAndSyncClient(initial, {
    id: 'pay-test-7000',
    clientId: sagarBefore.id,
    clientName: sagarBefore.businessName,
    projectTitle: sagarBefore.packageTier,
    totalProjectValue: sagarBefore.finalAgreedPrice,
    amountReceived: 7000,
    paymentDate: '2026-11-18',
    paymentMode: 'UPI',
    receivedInAccount: 'Studio Account',
    milestone: 'Final Delivery (50%)',
  });

  const sagarAfter = afterPay.clients.find((c) => c.id === 'cli-1794853179793')!;
  assert.equal(sagarAfter.advancePaid, 10000);
  assert.equal(sagarAfter.stage, 'Delivered / Live');

  // Delete that payment -> reverts advancePaid to ₹3,000 and stage to Live / Payment Pending
  const afterDelete = deletePaymentAndSyncClient(afterPay, 'pay-test-7000');
  const sagarReverted = afterDelete.clients.find((c) => c.id === 'cli-1794853179793')!;
  assert.equal(sagarReverted.advancePaid, 3000);
  assert.equal(sagarReverted.stage, 'Live / Payment Pending');
});

test('convertLeadToActiveProject, toggleClientMilestone, and cascadeClientUpdate/Delete work atomically', () => {
  const initial = reconcileDatabaseIntegrity(REAL_STUDIO_FIXTURE);
  const converted = convertLeadToActiveProject(initial, 'cli-1794853300739', 10000, 'Studio Account');
  const lambhodar = converted.clients.find((c) => c.id === 'cli-1794853300739')!;
  assert.equal(lambhodar.stage, 'In Building');
  assert.equal(lambhodar.advancePaid, 10000);

  const toggled = toggleClientMilestone(converted, 'cli-1794853300739', 'Design', 'Vansh');
  const lambhodarToggled = toggled.clients.find((c) => c.id === 'cli-1794853300739')!;
  const prog = calculateClientProjectProgress(lambhodarToggled, toggled.tickets, toggled.websites);
  assert.ok(prog.completedMilestones >= 2);

  const renamed = cascadeClientUpdate(toggled, {
    ...lambhodarToggled,
    businessName: 'Lambhodar Grand Lawns',
  });
  assert.equal(
    renamed.payments.some((p) => p.clientName === 'Lambhodar Grand Lawns'),
    true
  );

  const afterDelete = cascadeClientDelete(renamed, 'cli-1794853300739', true);
  assert.equal(afterDelete.clients.some((c) => c.id === 'cli-1794853300739'), false);
});

test('Domains and Meta Ads automatically sync 1-to-1 into Studio Finance Expenses and Net Profit', () => {
  const withDomainsAndAds: AethelDatabaseState = {
    ...REAL_STUDIO_FIXTURE,
    websites: [
      {
        id: 'web-kabra',
        clientName: 'Kabra Mobiles',
        domainName: 'kabramobiles.com',
        liveUrl: 'https://kabramobiles.com',
        registrar: 'Hostinger',
        hostingPlatform: 'Cloudflare Pages',
        purchaseDate: '2026-11-18',
        expiryDate: '2027-11-18',
        renewalCostINR: 1081,
        sslStatus: 'Active',
        siteStatus: 'Online',
        githubRepo: 'aethel-studios/kabramobiles',
        notes: '',
      },
      {
        id: 'web-sagar',
        clientName: 'New Sagar Mobiles',
        domainName: 'newsagarmobiles.in',
        liveUrl: 'https://newsagarmobiles.in',
        registrar: 'Hostinger',
        hostingPlatform: 'Vercel',
        purchaseDate: '2026-11-18',
        expiryDate: '2027-11-18',
        renewalCostINR: 589,
        sslStatus: 'Active',
        siteStatus: 'Online',
        githubRepo: 'aethel-studios/newsagarmobiles',
        notes: '',
      },
    ],
    metaCampaigns: [
      {
        id: 'meta-kabra',
        clientName: 'Kabra Mobiles',
        campaignName: 'Offer',
        objective: 'Website Traffic',
        status: 'Paused',
        totalBudget: 1652,
        amountSpent: 0, // Should auto-resolve to 1652
        agencyFee: 0,
        leadsGenerated: 0,
        startDate: '2026-11-18',
        endDate: '2026-11-25',
        notes: '',
      },
      {
        id: 'meta-sagar',
        clientName: 'New Sagar Mobiles Risod',
        campaignName: 'Offer',
        objective: 'Website Traffic',
        status: 'Completed',
        totalBudget: 1652,
        amountSpent: 0, // Should auto-resolve to 1652
        agencyFee: 0,
        leadsGenerated: 0,
        startDate: '2026-11-18',
        endDate: '2026-11-25',
        notes: '',
      },
    ],
  };

  const reconciled = reconcileDatabaseIntegrity(withDomainsAndAds);

  // Smart client match should link 'New Sagar Mobiles' domain to 'New Sagar Mobiles Risod'
  const sagarDomain = reconciled.websites.find((w) => w.id === 'web-sagar')!;
  assert.equal(sagarDomain.clientName, 'New Sagar Mobiles Risod');
  assert.equal(sagarDomain.clientId, 'cli-1794853179793');

  // 4 expenses should be automatically synced (2 domains + 2 Meta Ad campaigns)
  assert.equal(reconciled.expenses.length, 4);

  const fin = calculateStudioFinances(
    reconciled.expenses,
    reconciled.payments,
    reconciled.clients,
    reconciled.metaCampaigns,
    reconciled.tickets,
    reconciled.tasks || []
  );

  // 1081 + 589 + 1652 + 1652 = 4974
  assert.equal(fin.totalStudioExpenses, 4974);
  // 13000 - 4974 = 8026
  assert.equal(fin.netProfit, 8026);
  assert.equal(fin.totalClientAdSpendPassThrough, 3304);
});

test('Studio Health, Lead Conversion Analytics, Project Templates, and Approval Checkpoints compute accurately', async () => {
  const {
    calculateStudioHealth,
    calculateLeadConversionAnalytics,
    generateStudioNotifications,
  } = await import('./calculations');
  const {
    applyProjectTemplateToClient,
    toggleClientApprovalCheckpoint,
  } = await import('./syncEngine');

  const reconciled = reconcileDatabaseIntegrity(REAL_STUDIO_FIXTURE);
  const health = calculateStudioHealth(reconciled);
  assert.equal(health.length, 5);
  assert.equal(health[0].id, 'financial');

  const leadAnalytics = calculateLeadConversionAnalytics(reconciled.clients);
  assert.equal(leadAnalytics.totalLeads, 5);
  assert.equal(leadAnalytics.wonDeals, 3);
  assert.equal(leadAnalytics.conversionRatePercent, 60);

  const notifications = generateStudioNotifications(reconciled);
  // New Sagar Mobiles Risod has ₹7,000 pending in Live / Payment Pending -> critical notification
  assert.equal(
    notifications.some((n) => n.clientId === 'cli-1794853179793' && n.severity === 'critical'),
    true
  );

  // Apply project template to Balaji Lawns
  const withTemplate = applyProjectTemplateToClient(
    reconciled,
    'cli-1794853265701',
    'Premium Website Package'
  );
  const balaji = withTemplate.clients.find((c) => c.id === 'cli-1794853265701')!;
  assert.equal(balaji.projectTemplate, 'Premium Website Package');
  assert.ok((balaji.milestones?.[2].subtasks?.length || 0) >= 3);

  // Toggle approval checkpoint
  const withApproval = toggleClientApprovalCheckpoint(
    withTemplate,
    'cli-1794853265701',
    'Website Preview',
    'Krishna'
  );
  const balajiApproved = withApproval.clients.find((c) => c.id === 'cli-1794853265701')!;
  const previewGate = balajiApproved.approvals?.find((a) => a.stage === 'Website Preview');
  assert.equal(previewGate?.approved, true);
});

test('Aethel Brain: Weekly Recap Grounding, Institutional Memory Search, and 1-Click Note-to-Task Conversion', async () => {
  const {
    generateGroundedWeeklyRecap,
    queryAethelBrainMemory,
    autoSuggestBrainCategoryAndTags,
  } = await import('./calculations');
  const {
    convertBrainDumpToTask,
    convertHandoverItemToTask,
  } = await import('./syncEngine');

  const reconciled = reconcileDatabaseIntegrity(REAL_STUDIO_FIXTURE);

  // 1. Default Institutional Memories, Daily Logs, Brain Dumps, and Handovers are initialized
  assert.ok((reconciled.brainMemories?.length || 0) >= 3);
  assert.ok((reconciled.brainDailyLogs?.length || 0) >= 2);
  assert.ok((reconciled.brainDumps?.length || 0) >= 2);
  assert.ok((reconciled.brainHandovers?.length || 0) >= 1);

  // 2. Grounded Weekly Recap strictly separates recorded accomplishments from AI observations
  const recap = generateGroundedWeeklyRecap(reconciled);
  assert.ok(recap.executiveSummary.includes('Aethel Studios'));
  assert.ok(recap.accomplishments.length >= 2);
  assert.ok(recap.krishnaContributions.length >= 1);
  assert.ok(recap.vanshContributions.length >= 1);
  assert.ok(
    recap.aiObservations.some((obs) => obs.startsWith('Observation:'))
  );

  // 3. Institutional Memory Query answers pricing and focus questions accurately
  const pricingAns = queryAethelBrainMemory(reconciled, 'Why did we decide on our pricing?');
  assert.ok(pricingAns.directAnswer.includes('Pricing'));
  assert.ok(pricingAns.matches.length > 0);

  const focusAns = queryAethelBrainMemory(reconciled, 'What should I focus on today?');
  assert.ok(focusAns.focusPriorities.length > 0);

  // 4. AI Auto-Categorize suggests accurate category & tags
  const suggestion = autoSuggestBrainCategoryAndTags(
    'Urgent bug fix needed on marriage lawns WhatsApp lead form'
  );
  assert.equal(suggestion.category, 'Issues / Things to fix');
  assert.equal(suggestion.priority, 'Urgent');

  // 5. 1-Click Convert Brain Dump Note to Task
  const dumpId = reconciled.brainDumps![0].id;
  const afterConvertDump = convertBrainDumpToTask(reconciled, dumpId, 'Vansh');
  const convertedDump = afterConvertDump.brainDumps!.find((d) => d.id === dumpId)!;
  assert.equal(convertedDump.status, 'In Progress');
  assert.ok(convertedDump.convertedTaskId);
  assert.equal(
    afterConvertDump.tasks!.some((t) => t.id === convertedDump.convertedTaskId),
    true
  );

  // 6. 1-Click Convert Handover Action Item to Task
  const handover = afterConvertDump.brainHandovers![0];
  const actionItemId = handover.actionItems[0].id;
  const afterConvertHandover = convertHandoverItemToTask(
    afterConvertDump,
    handover.id,
    actionItemId
  );
  const updatedItem = afterConvertHandover.brainHandovers![0].actionItems[0];
  assert.equal(updatedItem.convertedToTask, true);
});

test('Finance Engine Acceptance Tests 1–9: Invoice Creation, Partial UPI/Cash Payments, Expense Deduction, Client Ledger, Cancellation, Date Filtering & Document Snapshots', async () => {
  const {
    calculateFinanceOverviewMetrics,
    calculateClientFinancialProfile,
    calculateInvoiceDerivedState,
    createDocumentSnapshot,
    generateNextDocumentNumber,
    numberToIndianRupeesWords,
    DEFAULT_FINANCE_SETTINGS,
  } = await import('./financeEngine');
  const { renderDocumentToA4Html } = await import('./pdfDocumentEngine');

  // Start with a clean empty workspace with 1 existing client (Project Contract Value = ₹10,000)
  let state: AethelDatabaseState = reconcileDatabaseIntegrity({
    clients: [
      {
        id: 'cli-test-1',
        businessName: 'Apex Heritage Lawns',
        contactPerson: 'Rajesh Deshmukh',
        phone: '+91 98220 11223',
        email: 'rajesh@apexlawns.in',
        city: 'Pune',
        niche: 'Banquet/Lawns',
        packageTier: 'Premium Website Package',
        quotedPrice: 12000,
        finalAgreedPrice: 10000,
        advancePaid: 0,
        stage: 'In Building',
        assignedTo: 'Krishna',
        sampleLinkSent: '',
        followUpDate: '2026-11-25',
        notes: 'Full lawn booking system',
        createdAt: '2026-11-18',
      },
    ],
    metaCampaigns: [],
    websites: [],
    tickets: [],
    rndProjects: [],
    expenses: [],
    payments: [],
    vaultItems: [],
    invoices: [],
    quotations: [],
    transactions: [],
    generatedDocuments: [],
    financeSettings: DEFAULT_FINANCE_SETTINGS,
    lastUpdated: '2026-11-18T10:00:00.000Z',
  });

  // TEST 1 — Create Invoice for existing client with 2 line items totaling ₹10,000
  const { formatted: invNo } = generateNextDocumentNumber('Invoice', state);
  assert.equal(invNo, 'AS-I-001');

  const newInvoice = calculateInvoiceDerivedState(
    {
      id: 'inv-1001',
      invoiceNumber: invNo,
      clientId: 'cli-test-1',
      clientName: 'Apex Heritage Lawns',
      clientContactPerson: 'Rajesh Deshmukh',
      clientPhone: '+91 98220 11223',
      clientEmail: 'rajesh@apexlawns.in',
      clientAddress: 'Pune',
      projectTitle: 'Premium Website Package',
      type: 'Standard Invoice',
      lineItems: [
        {
          id: 'li-1',
          serviceName: 'Bespoke Web Architecture & UI/UX',
          description: 'Responsive design & booking engine',
          quantity: 1,
          unitPrice: 6000,
          total: 6000,
        },
        {
          id: 'li-2',
          serviceName: 'WhatsApp Lead Funnel & SEO Setup',
          description: 'Automated inquiry routing',
          quantity: 1,
          unitPrice: 4000,
          total: 4000,
        },
      ],
      subtotal: 10000,
      discount: 0,
      amount: 10000,
      amountPaid: 0,
      balanceDue: 10000,
      issueDate: '2026-11-18',
      dueDate: '2026-11-25',
      status: 'Issued',
      notes: 'GST not charged. Supplier is not registered under GST.',
      gstEnabled: false,
    },
    []
  );

  state = reconcileDatabaseIntegrity({
    ...state,
    invoices: [newInvoice],
  });

  let metrics = calculateFinanceOverviewMetrics(state, 'All Time');
  assert.equal(metrics.totalInvoicedRevenue, 10000);
  assert.equal(metrics.totalReceived, 0);
  assert.equal(metrics.outstandingPayments, 10000);
  assert.equal(state.invoices![0].status, 'Issued');

  // TEST 2 — Partial Payment (₹4,000 via UPI)
  const { formatted: recNo1 } = generateNextDocumentNumber('Receipt', state);
  assert.equal(recNo1, 'AS-R-001');
  const pay1 = {
    id: 'pay-acc-1',
    receiptNumber: recNo1,
    invoiceId: 'inv-1001',
    invoiceNumber: 'AS-I-001',
    clientId: 'cli-test-1',
    clientName: 'Apex Heritage Lawns',
    projectTitle: 'Premium Website Package',
    totalProjectValue: 10000,
    amountReceived: 4000,
    paymentDate: '2026-11-18',
    paymentMode: 'UPI' as const,
    receivedInAccount: 'Studio Account' as const,
    milestone: 'Partial Payment' as const,
    upiReference: 'UPI40001122',
  };

  state = reconcileDatabaseIntegrity({
    ...state,
    payments: [pay1],
  });

  metrics = calculateFinanceOverviewMetrics(state, 'All Time');
  assert.equal(state.invoices![0].status, 'Partially Paid');
  assert.equal(state.invoices![0].amountPaid, 4000);
  assert.equal(state.invoices![0].balanceDue, 6000);
  assert.equal(metrics.totalReceived, 4000);
  assert.equal(metrics.outstandingPayments, 6000);
  assert.equal(state.transactions!.length, 1);
  assert.equal(state.transactions![0].paymentMethod, 'UPI');

  // TEST 3 — Second Payment (₹6,000 via Cash)
  const { formatted: recNo2 } = generateNextDocumentNumber('Receipt', state);
  assert.equal(recNo2, 'AS-R-002');
  const pay2 = {
    id: 'pay-acc-2',
    receiptNumber: recNo2,
    invoiceId: 'inv-1001',
    invoiceNumber: 'AS-I-001',
    clientId: 'cli-test-1',
    clientName: 'Apex Heritage Lawns',
    projectTitle: 'Premium Website Package',
    totalProjectValue: 10000,
    amountReceived: 6000,
    paymentDate: '2026-11-19',
    paymentMode: 'Cash' as const,
    receivedInAccount: 'Krishna' as const,
    milestone: 'Invoice Settlement' as const,
  };

  state = reconcileDatabaseIntegrity({
    ...state,
    payments: [pay1, pay2],
  });

  metrics = calculateFinanceOverviewMetrics(state, 'All Time');
  assert.equal(state.invoices![0].status, 'Paid');
  assert.equal(state.invoices![0].amountPaid, 10000);
  assert.equal(state.invoices![0].balanceDue, 0);
  assert.equal(metrics.totalReceived, 10000);
  assert.equal(metrics.outstandingPayments, 0);

  // TEST 4 — Record Expense (₹2,000 under Software & Subscriptions via UPI)
  const { formatted: expNo } = generateNextDocumentNumber('Expense', state);
  assert.equal(expNo, 'AS-E-001');
  const exp1 = {
    id: 'exp-acc-1',
    expenseNumber: expNo,
    title: 'Vercel Pro & Cloud Tooling',
    category: 'Software & Subscriptions' as const,
    amount: 2000,
    paymentMethod: 'UPI' as const,
    paidBy: 'Studio Account' as const,
    date: '2026-11-19',
    reimbursed: true,
    notes: 'Monthly cloud subscription',
  };

  state = reconcileDatabaseIntegrity({
    ...state,
    expenses: [exp1],
  });

  metrics = calculateFinanceOverviewMetrics(state, 'All Time');
  assert.equal(metrics.totalExpenses, 2000);
  assert.equal(metrics.netCashFlow, 8000); // ₹10,000 received - ₹2,000 expenses
  assert.equal(state.transactions!.length, 3); // 2 Income + 1 Expense

  // TEST 5 — Client Financial Summary & Derived Ledger
  const clientProfile = calculateClientFinancialProfile(state.clients[0], state);
  assert.equal(clientProfile.totalProjectValue, 10000);
  assert.equal(clientProfile.totalInvoiced, 10000);
  assert.equal(clientProfile.totalReceived, 10000);
  assert.equal(clientProfile.outstandingBalance, 0);
  assert.equal(clientProfile.ledger.length, 3);
  assert.equal(clientProfile.ledger[0].debit, 10000);
  assert.equal(clientProfile.ledger[0].balance, 10000);
  assert.equal(clientProfile.ledger[1].credit, 4000);
  assert.equal(clientProfile.ledger[1].balance, 6000);
  assert.equal(clientProfile.ledger[2].credit, 6000);
  assert.equal(clientProfile.ledger[2].balance, 0);

  // TEST 6 & 7 — Document Generation, Non-GST Disclaimer, Indian Rupee Words & Immutable Snapshots
  assert.equal(numberToIndianRupeesWords(10000), 'Rupees Ten Thousand Only');
  assert.equal(numberToIndianRupeesWords(4000), 'Rupees Four Thousand Only');

  const invDoc = createDocumentSnapshot(
    'Invoice',
    'AS-I-001',
    'Apex Heritage Lawns',
    10000,
    'Paid',
    state.invoices![0] as unknown as Record<string, unknown>,
    { clientId: 'cli-test-1', invoiceId: 'inv-1001' }
  );
  const invHtml = renderDocumentToA4Html(invDoc, DEFAULT_FINANCE_SETTINGS, undefined, state.payments);
  assert.ok(invHtml.includes('Aethel Studios'));
  assert.ok(invHtml.includes('AS-I-001'));
  assert.ok(invHtml.includes('GST not charged. Supplier is not registered under GST.'));
  assert.ok(!invHtml.includes('undefined'));
  assert.ok(!invHtml.includes('NaN'));

  // TEST 8 — Cancel Unpaid Invoice (₹5,000) -> Excluded from Outstanding & Revenue
  const inv2 = calculateInvoiceDerivedState(
    {
      id: 'inv-1002',
      invoiceNumber: 'AS-I-002',
      clientId: 'cli-test-1',
      clientName: 'Apex Heritage Lawns',
      projectTitle: 'Phase 2 Expansion',
      type: 'Standard Invoice',
      amount: 5000,
      issueDate: '2026-11-19',
      dueDate: '2026-11-26',
      status: 'Issued',
      notes: '',
    },
    state.payments
  );
  state = reconcileDatabaseIntegrity({
    ...state,
    invoices: [...state.invoices!, inv2],
  });
  metrics = calculateFinanceOverviewMetrics(state, 'All Time');
  assert.equal(metrics.outstandingPayments, 5000);

  // Now cancel inv-1002
  const cancelledInv2 = { ...inv2, status: 'Cancelled' as const, balanceDue: 0 };
  state = reconcileDatabaseIntegrity({
    ...state,
    invoices: [state.invoices![0], cancelledInv2],
  });
  metrics = calculateFinanceOverviewMetrics(state, 'All Time');
  assert.equal(metrics.outstandingPayments, 0);
  assert.equal(metrics.totalInvoicedRevenue, 10000);

  // TEST 9 — Date Filter Accuracy
  const thisMonthMetrics = calculateFinanceOverviewMetrics(
    state,
    'This Month',
    undefined,
    undefined,
    new Date('2026-11-19T12:00:00Z')
  );
  assert.equal(thisMonthMetrics.totalReceived, 10000);

  const lastMonthMetrics = calculateFinanceOverviewMetrics(
    state,
    'Last Month',
    undefined,
    undefined,
    new Date('2026-11-19T12:00:00Z')
  );
  assert.equal(lastMonthMetrics.totalReceived, 0);
});




