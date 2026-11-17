import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatINR,
  calculateCPL,
  calculatePendingBalance,
  calculateDaysRemaining,
  calculateCampaignProgress,
  calculateStudioFinances,
  buildWhatsAppUrl,
} from './calculations';
import {
  reconcileClientUpdate,
  reconcileClientAddition,
  reconcileClientDeletion,
  reconcilePaymentAddition,
  reconcilePaymentDeletion,
  reconcileWebsiteHealthWithTickets,
  reconcileDatabaseIntegrity,
} from './syncEngine';
import { encryptSecret, decryptSecret } from './cryptoService';
import { SEED_DATA } from '../data/seedData';

test('formatINR formats Indian currency correctly', () => {
  assert.equal(formatINR(25000), '₹25,000');
  assert.equal(formatINR(125000), '₹1,25,000');
  assert.equal(formatINR(-3450), '-₹3,450');
});

test('calculatePendingBalance and calculateCPL work accurately', () => {
  assert.equal(calculatePendingBalance(34000, 25000), 9000);
  assert.equal(calculatePendingBalance(21500, 25000), 0);
  assert.equal(calculateCPL(10400, 142), 73);
  assert.equal(calculateCPL(5000, 0), 0);
});

test('calculateDaysRemaining and calculateCampaignProgress compute accurate days', () => {
  const ref = new Date('2026-11-15T10:00:00Z');
  assert.equal(calculateDaysRemaining('2026-11-17', ref), 2);
  assert.equal(calculateDaysRemaining('2026-11-15', ref), 0);

  const prog = calculateCampaignProgress('2026-11-05', '2026-11-15', ref);
  assert.equal(prog.totalDays, 10);
  assert.equal(prog.elapsedDays, 10);
  assert.equal(prog.daysRemaining, 0);
  assert.equal(prog.percentComplete, 100);
});

test('calculateStudioFinances computes revenue, expenses, receivables, and co-founder split', () => {
  const summary = calculateStudioFinances(
    SEED_DATA.expenses,
    SEED_DATA.payments,
    SEED_DATA.clients
  );

  // Total payments: 25000 + 21500 + 18000 + 5000 = 69500
  assert.equal(summary.totalRevenueCollected, 69500);
  // Total expenses: 3450 + 2850 + 2100 + 840 + 1600 = 10840
  assert.equal(summary.totalStudioExpenses, 10840);
  assert.equal(summary.netProfit, 69500 - 10840);

  // Pending receivables from In Building / Live Payment Pending / Delivered clients:
  // Imperial Pavilion (Live / Payment Pending): 34000 - 25000 = 9000
  // Lotus Women's Hospital (Live / Payment Pending): 22500 - 14000 = 8500
  // Aurelia Sanctuary (In Building): 36000 - 18000 = 18000
  // Silver Oak Banquet (In Building): 24000 - 12000 = 12000
  // Kothari Digital (Delivered / Live): 21500 - 21500 = 0
  assert.equal(summary.pendingReceivables, 9000 + 8500 + 18000 + 12000);

  // Krishna out-of-pocket: 2850 + 2100 = 4950
  assert.equal(summary.krishnaOutOfPocket, 4950);
  // Vansh out-of-pocket: 3450 + 840 = 4290
  assert.equal(summary.vanshOutOfPocket, 4290);
});

test('buildWhatsAppUrl creates valid wa.me URL with +91 prefix', () => {
  const url = buildWhatsAppUrl('+91 98224 51092', 'Hello Rajeshwar Sir');
  assert.equal(url, 'https://wa.me/919822451092?text=Hello%20Rajeshwar%20Sir');
});

test('Web Crypto AES-GCM 256-bit encryptSecret and decryptSecret roundtrip works and rejects wrong passphrase', async () => {
  const secret = 'Aethel#Cloudflare$2026!Prod';
  const payload = await encryptSecret(secret, 'aethel2026');
  assert.ok(payload.ciphertext.length > 10);
  assert.ok(payload.iv.length > 5);
  assert.ok(payload.salt.length > 5);

  const decrypted = await decryptSecret(payload, 'aethel2026');
  assert.equal(decrypted, secret);

  await assert.rejects(async () => {
    await decryptSecret(payload, 'wrong-passphrase');
  });
});

test('reconcileClientUpdate cascades businessName across modules and syncs advancePaid delta to Studio Finance', () => {
  const imperial = SEED_DATA.clients.find((c) => c.id === 'cli-1')!;
  // Settle remaining 9000 balance (from 25000 to 34000) and rename business
  const updatedImperial = {
    ...imperial,
    businessName: 'The Imperial Grand Pavilion',
    advancePaid: 34000,
  };

  const nextState = reconcileClientUpdate(SEED_DATA, updatedImperial);
  const syncedClient = nextState.clients.find((c) => c.id === 'cli-1')!;

  // Stage should auto-promote from 'Live / Payment Pending' to 'Delivered / Live'
  assert.equal(syncedClient.stage, 'Delivered / Live');
  assert.equal(syncedClient.businessName, 'The Imperial Grand Pavilion');

  // Linked Meta Campaign, Website, Ticket, and Expense should have cascaded name
  const linkedCampaign = nextState.metaCampaigns.find((m) => m.id === 'cam-1')!;
  assert.equal(linkedCampaign.clientName, 'The Imperial Grand Pavilion');

  const linkedWebsite = nextState.websites.find((w) => w.id === 'web-1')!;
  assert.equal(linkedWebsite.clientName, 'The Imperial Grand Pavilion');

  // Studio Finance payments should have a new 9000 inflow record
  assert.equal(nextState.payments.length, SEED_DATA.payments.length + 1);
  assert.equal(nextState.payments[0].amountReceived, 9000);
  assert.equal(nextState.payments[0].clientName, 'The Imperial Grand Pavilion');
});

test('reconcilePaymentAddition and reconcilePaymentDeletion sync back to Client Pipeline and reconcileWebsiteHealthWithTickets updates website health', () => {
  // Record 8500 payment for Lotus Women's Hospital & IVF Center (cli-8, agreed 22500, advance 14000)
  const afterPay = reconcilePaymentAddition(SEED_DATA, {
    id: 'pay-test-99',
    date: '2026-11-16',
    clientName: "Lotus Women's Hospital & IVF Center",
    amountReceived: 8500,
    paymentMode: 'UPI',
    receivedBy: 'Krishna',
    notes: 'Final settlement upon launch',
  });

  const lotusAfterPay = afterPay.clients.find((c) => c.id === 'cli-8')!;
  assert.equal(lotusAfterPay.advancePaid, 22500);
  assert.equal(lotusAfterPay.stage, 'Delivered / Live');

  // Delete that payment and verify stage reverts to 'Live / Payment Pending'
  const afterDel = reconcilePaymentDeletion(afterPay, 'pay-test-99');
  const lotusAfterDel = afterDel.clients.find((c) => c.id === 'cli-8')!;
  assert.equal(lotusAfterDel.advancePaid, 14000);
  assert.equal(lotusAfterDel.stage, 'Live / Payment Pending');

  // Adding a new client with advancePaid > 0 creates an initial payment
  const afterAdd = reconcileClientAddition(SEED_DATA, {
    ...SEED_DATA.clients[0],
    id: 'cli-new-test',
    businessName: 'Sunrise Multi-Specialty Clinic',
    advancePaid: 10000,
  });
  assert.equal(afterAdd.payments[0].amountReceived, 10000);

  // Resolving all urgent tickets for Imperial Pavilion (tkt-1) restores web-1 health to 'Live & Healthy'
  const resolvedTickets = SEED_DATA.tickets.map((t) =>
    t.id === 'tkt-1' ? { ...t, state: 'Deployed & Resolved' as const } : t
  );
  const healthSynced = reconcileWebsiteHealthWithTickets({
    ...SEED_DATA,
    tickets: resolvedTickets,
  });
  const web1 = healthSynced.websites.find((w) => w.id === 'web-1')!;
  assert.equal(web1.healthStatus, 'Live & Healthy');
});

test('reconcileDatabaseIntegrity consolidates fragmented keystroke payments and syncs client advancePaid with payments ledger', () => {
  const customState = {
    ...SEED_DATA,
    clients: [
      {
        ...SEED_DATA.clients[0],
        id: 'cli-sagar',
        businessName: 'New Sagar Mobiles Risod',
        finalAgreedPrice: 10000,
        advancePaid: 3000,
        assignedLead: 'Krishna' as const,
        stage: 'Live / Payment Pending' as const,
      },
      {
        ...SEED_DATA.clients[0],
        id: 'cli-kabra',
        businessName: 'Kabra Mobiles',
        finalAgreedPrice: 10000,
        advancePaid: 10000,
        assignedLead: 'Both' as const,
        stage: 'Delivered / Live' as const,
      },
    ],
    payments: [
      {
        id: 'pay-sync-1',
        date: '2026-11-16',
        clientName: 'New Sagar Mobiles Risod',
        amountReceived: 2700,
        paymentMode: 'UPI' as const,
        receivedBy: 'Krishna' as const,
        notes: 'Milestone',
      },
      {
        id: 'pay-sync-2',
        date: '2026-11-16',
        clientName: 'New Sagar Mobiles Risod',
        amountReceived: 270,
        paymentMode: 'UPI' as const,
        receivedBy: 'Krishna' as const,
        notes: 'Milestone',
      },
      {
        id: 'pay-sync-3',
        date: '2026-11-16',
        clientName: 'New Sagar Mobiles Risod',
        amountReceived: 27,
        paymentMode: 'UPI' as const,
        receivedBy: 'Krishna' as const,
        notes: 'Milestone',
      },
      {
        id: 'pay-sync-4',
        date: '2026-11-16',
        clientName: 'New Sagar Mobiles Risod',
        amountReceived: 3,
        paymentMode: 'UPI' as const,
        receivedBy: 'Krishna' as const,
        notes: 'Milestone',
      },
      {
        id: 'pay-sync-5',
        date: '2026-11-16',
        clientName: 'Kabra Mobiles',
        amountReceived: 5000,
        paymentMode: 'UPI' as const,
        receivedBy: 'Studio Account' as const,
        notes: 'Full balance settlement',
      },
    ],
  };

  const reconciled = reconcileDatabaseIntegrity(customState);

  // Should have exactly 2 clean payments: 3000 for New Sagar Mobiles Risod and 10000 for Kabra Mobiles
  assert.equal(reconciled.payments.length, 2);
  const sagarPay = reconciled.payments.find(
    (p) => p.clientName === 'New Sagar Mobiles Risod'
  )!;
  const kabraPay = reconciled.payments.find(
    (p) => p.clientName === 'Kabra Mobiles'
  )!;
  assert.equal(sagarPay.amountReceived, 3000);
  assert.equal(kabraPay.amountReceived, 10000);

  // Deleting New Sagar Mobiles Risod removes its client record and its payment record
  const afterDelete = reconcileClientDeletion(reconciled, 'cli-sagar');
  assert.equal(afterDelete.clients.length, 1);
  assert.equal(afterDelete.payments.length, 1);
  assert.equal(afterDelete.payments[0].clientName, 'Kabra Mobiles');
});

