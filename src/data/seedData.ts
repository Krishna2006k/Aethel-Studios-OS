import type { AethelDatabaseState } from '../types';

/**
 * Production-safe factory state.
 * Never place real client details, demo credentials, or fabricated activity here.
 * New installations start empty; persisted workspace records are loaded separately.
 */
export const SEED_DATA: AethelDatabaseState = {
  clients: [],
  metaCampaigns: [],
  websites: [],
  tickets: [],
  rndProjects: [],
  expenses: [],
  payments: [],
  vaultItems: [],
  tasks: [],
  invoices: [],
  quotations: [],
  transactions: [],
  generatedDocuments: [],
  documentTemplates: [],
  automationRules: [],
  activityLogs: [],
  brainDailyLogs: [],
  brainDumps: [],
  brainHandovers: [],
  brainMemories: [],
  brainWeeklyRecaps: [],
  lastUpdated: new Date().toISOString(),
};
