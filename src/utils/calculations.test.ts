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
