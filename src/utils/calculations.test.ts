import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateClientProjectProgress,
  calculatePendingBalance,
  calculateStudioFinances,
} from './calculations';
import {
  convertLeadToActiveProject,
  recordPaymentAndSyncClient,
  reconcileDatabaseIntegrity,
  toggleClientMilestone,
} from './syncEngine';
import { SEED_DATA } from '../data/seedData';

test('Unified Financial Engine: CRM Pipeline Paid and Finance Revenue Collected match 100%', () => {
  const reconciled = reconcileDatabaseIntegrity(SEED_DATA);
  const finances = calculateStudioFinances(
    reconciled.expenses,
    reconciled.payments,
    reconciled.clients,
    reconciled.metaCampaigns,
    reconciled.tickets,
    reconciled.tasks || []
  );

  // Sum of non-retainer payments in ledger must equal sum of client advancePaid
  const pipelineAdvanceSum = reconciled.clients.reduce((s, c) => s + c.advancePaid, 0);
  assert.equal(finances.clientProjectRevenue, pipelineAdvanceSum);
  assert.equal(
    finances.totalRevenueCollected,
    finances.clientProjectRevenue + finances.agencyRetainerRevenue
  );

  // Pending receivables must equal sum of pending balances on contracted active stages (12,000 + 10,000 = 22,000)
  assert.equal(finances.pendingReceivables, 22000);
});

test('3-Stream Financial Separation: Client Ad Spend pass-through is excluded from Studio Expenses', () => {
  const reconciled = reconcileDatabaseIntegrity(SEED_DATA);
  const finances = calculateStudioFinances(
    reconciled.expenses,
    reconciled.payments,
    reconciled.clients,
    reconciled.metaCampaigns
  );

  assert.equal(finances.totalClientAdSpendPassThrough, 30050);
  assert.equal(finances.totalStudioExpenses, 15350);
  assert.equal(finances.netProfit, finances.totalRevenueCollected - finances.totalStudioExpenses);
});

test('Bidirectional Payment Sync: Recording a payment updates client advancePaid and stage', () => {
  const reconciled = reconcileDatabaseIntegrity(SEED_DATA);
  // Lotus Women's Hospital has 26,000 agreed, 14,000 paid, 12,000 due in 'Live / Payment Pending'
  const updated = recordPaymentAndSyncClient(reconciled, {
    id: 'pay-test-lotus',
    clientId: 'cli-8',
    clientName: "Lotus Women's & Maternity Hospital",
    projectTitle: 'Final Handover Settlement',
    totalProjectValue: 26000,
    amountReceived: 12000,
    paymentDate: '2025-05-15',
    paymentMode: 'UPI',
    receivedInAccount: 'Studio Account',
    milestone: 'Final Delivery (50%)',
  });

  const lotus = updated.clients.find((c) => c.id === 'cli-8')!;
  assert.equal(lotus.advancePaid, 26000);
  assert.equal(lotus.stage, 'Delivered / Live');
  assert.equal(calculatePendingBalance(lotus.finalAgreedPrice, lotus.advancePaid), 0);
});

test('1-Click Deal Conversion & 6-Stage Project Milestones', () => {
  const reconciled = reconcileDatabaseIntegrity(SEED_DATA);
  // Convert cli-4 (Royal Orchid Wedding Lawns) from 'In Talks / Demo Shown' to 'In Building'
  const afterConvert = convertLeadToActiveProject(reconciled, 'cli-4', 13500, 'Vansh');
  const royal = afterConvert.clients.find((c) => c.id === 'cli-4')!;

  assert.equal(royal.stage, 'In Building');
  assert.equal(royal.advancePaid, 13500);
  assert.equal(royal.milestones?.length, 6);

  const prog1 = calculateClientProjectProgress(royal);
  assert.equal(prog1.completedMilestones, 1); // Requirements completed on kickoff

  // Toggle Design milestone complete
  const afterDesign = toggleClientMilestone(afterConvert, 'cli-4', 'Design', 'Vansh');
  const royal2 = afterDesign.clients.find((c) => c.id === 'cli-4')!;
  const prog2 = calculateClientProjectProgress(royal2);
  assert.equal(prog2.completedMilestones, 2);
  assert.equal(prog2.percent, 33);
});
