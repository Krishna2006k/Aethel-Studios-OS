import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { AethelDatabaseState, VaultCredential } from '../types';
import { SEED_DATA, SEED_RAW_VAULT_ITEMS } from '../data/seedData';
import { encryptSecret } from '../utils/cryptoService';

const STORAGE_KEY_DATA = 'aethel_os_db_v3';
const STORAGE_KEY_SUPABASE_CFG = 'aethel_os_supabase_config_v1';

export const DEMO_MASTER_PASSPHRASE = 'aethel2026';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

let supabaseInstance: SupabaseClient | null = null;

export function getSavedSupabaseConfig(): SupabaseConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SUPABASE_CFG);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SupabaseConfig;
    if (parsed.url && parsed.anonKey) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveSupabaseConfig(config: SupabaseConfig | null): boolean {
  try {
    if (!config || !config.url.trim() || !config.anonKey.trim()) {
      localStorage.removeItem(STORAGE_KEY_SUPABASE_CFG);
      supabaseInstance = null;
      return false;
    }
    const cleanConfig = {
      url: config.url.trim(),
      anonKey: config.anonKey.trim(),
    };
    supabaseInstance = createClient(cleanConfig.url, cleanConfig.anonKey);
    localStorage.setItem(STORAGE_KEY_SUPABASE_CFG, JSON.stringify(cleanConfig));
    return true;
  } catch {
    supabaseInstance = null;
    return false;
  }
}

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;
  const saved = getSavedSupabaseConfig();
  if (saved) {
    try {
      supabaseInstance = createClient(saved.url, saved.anonKey);
      return supabaseInstance;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Generates real AES-GCM encrypted seed vault records using DEMO_MASTER_PASSPHRASE ('aethel2026')
 */
export async function buildEncryptedSeedVault(): Promise<VaultCredential[]> {
  const credentials: VaultCredential[] = [];
  for (const item of SEED_RAW_VAULT_ITEMS) {
    const encrypted = await encryptSecret(item.plainSecret, DEMO_MASTER_PASSPHRASE);
    credentials.push({
      id: item.id,
      servicePlatform: item.servicePlatform,
      ownerClientTag: item.ownerClientTag,
      usernameEmail: item.usernameEmail,
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      salt: encrypted.salt,
      url: item.url,
      notes: item.notes,
      createdAt: item.createdAt,
    });
  }
  return credentials;
}

export async function loadInitialDatabase(): Promise<{
  state: AethelDatabaseState;
  mode: 'cloud' | 'local';
  syncNote?: string;
}> {
  // 1. Ensure local storage has initialized seed data with real AES-GCM vault records
  let localState: AethelDatabaseState | null = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DATA);
    if (raw) {
      localState = JSON.parse(raw) as AethelDatabaseState;
    }
  } catch {
    localState = null;
  }

  if (!localState || !localState.clients) {
    const vaultCredentials = await buildEncryptedSeedVault();
    localState = {
      ...SEED_DATA,
      vaultCredentials,
    };
    try {
      localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(localState));
    } catch {
      // Ignore quota errors
    }
  } else if (!localState.vaultCredentials || localState.vaultCredentials.length === 0) {
    localState.vaultCredentials = await buildEncryptedSeedVault();
    try {
      localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(localState));
    } catch {
      // Ignore
    }
  }

  // 2. If Supabase is configured, try syncing from Supabase tables
  const sb = getSupabaseClient();
  if (!sb) {
    return { state: localState, mode: 'local' };
  }

  try {
    const [
      clientsRes,
      campaignsRes,
      websitesRes,
      ticketsRes,
      prototypesRes,
      expensesRes,
      paymentsRes,
      vaultRes,
    ] = await Promise.all([
      sb.from('clients').select('id, payload'),
      sb.from('meta_campaigns').select('id, payload'),
      sb.from('websites').select('id, payload'),
      sb.from('tickets').select('id, payload'),
      sb.from('prototypes').select('id, payload'),
      sb.from('expenses').select('id, payload'),
      sb.from('client_payments').select('id, payload'),
      sb.from('vault_credentials').select('id, payload'),
    ]);

    if (clientsRes.error) {
      return {
        state: localState,
        mode: 'local',
        syncNote: `Supabase connected, awaiting schema setup (${clientsRes.error.message})`,
      };
    }

    const hasCloudData =
      (clientsRes.data && clientsRes.data.length > 0) ||
      (campaignsRes.data && campaignsRes.data.length > 0);

    if (!hasCloudData) {
      // Seed cloud tables automatically with current local state so user gets instant cloud persistence
      await pushFullStateToSupabase(localState);
      return { state: localState, mode: 'cloud', syncNote: 'Synced initial studio data to Supabase' };
    }

    const cloudState: AethelDatabaseState = {
      clients: (clientsRes.data || []).map((r: { payload: any }) => r.payload),
      metaCampaigns: (campaignsRes.data || []).map((r: { payload: any }) => r.payload),
      websites: (websitesRes.data || []).map((r: { payload: any }) => r.payload),
      tickets: (ticketsRes.data || []).map((r: { payload: any }) => r.payload),
      prototypes: (prototypesRes.data || []).map((r: { payload: any }) => r.payload),
      expenses: (expensesRes.data || []).map((r: { payload: any }) => r.payload),
      payments: (paymentsRes.data || []).map((r: { payload: any }) => r.payload),
      vaultCredentials: (vaultRes.data || []).map((r: { payload: any }) => r.payload),
    };

    localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(cloudState));
    return { state: cloudState, mode: 'cloud' };
  } catch (err: any) {
    return {
      state: localState,
      mode: 'local',
      syncNote: err?.message || 'Fallback to Local Mode',
    };
  }
}

export async function persistDatabaseState(state: AethelDatabaseState): Promise<void> {
  try {
    localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(state));
  } catch {
    // Ignore storage error
  }
  const sb = getSupabaseClient();
  if (sb) {
    try {
      await pushFullStateToSupabase(state);
    } catch {
      // Silent fallback to localStorage
    }
  }
}

export async function pushFullStateToSupabase(state: AethelDatabaseState): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb) return;

  const syncTable = async (tableName: string, items: { id: string }[]) => {
    const rows = items.map((item) => ({
      id: item.id,
      payload: item,
      updated_at: new Date().toISOString(),
    }));
    if (rows.length > 0) {
      await sb.from(tableName).upsert(rows, { onConflict: 'id' });
    }
  };

  await Promise.all([
    syncTable('clients', state.clients),
    syncTable('meta_campaigns', state.metaCampaigns),
    syncTable('websites', state.websites),
    syncTable('tickets', state.tickets),
    syncTable('prototypes', state.prototypes),
    syncTable('expenses', state.expenses),
    syncTable('client_payments', state.payments),
    syncTable('vault_credentials', state.vaultCredentials),
  ]);
}

export async function deleteRecordFromSupabase(
  tableName:
    | 'clients'
    | 'meta_campaigns'
    | 'websites'
    | 'tickets'
    | 'prototypes'
    | 'expenses'
    | 'client_payments'
    | 'vault_credentials',
  id: string
): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb) return;
  try {
    await sb.from(tableName).delete().eq('id', id);
  } catch {
    // Ignore offline error
  }
}

export async function resetToFactorySeed(): Promise<AethelDatabaseState> {
  const vaultCredentials = await buildEncryptedSeedVault();
  const fresh: AethelDatabaseState = {
    ...SEED_DATA,
    vaultCredentials,
  };
  localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(fresh));
  return fresh;
}

export const SUPABASE_COMPLETE_SQL_SCHEMA = `-- ============================================================================
-- AETHEL OS — INTERNAL AGENCY & GROWTH OPERATING SYSTEM
-- Complete PostgreSQL Schema for Supabase (Run in Supabase SQL Editor)
-- Founders: Vansh Khakole & Krishna Khakole (aethelstudios.in@gmail.com)
-- ============================================================================

create extension if not exists "pgcrypto";

-- 1. Clients & Sales Pipeline
create table if not exists public.clients (
  id text primary key,
  payload jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Meta Ads & Local Growth Campaigns
create table if not exists public.meta_campaigns (
  id text primary key,
  payload jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Tech Assets, Domains & Hosting Vault
create table if not exists public.websites (
  id text primary key,
  payload jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. Deliveries, Bugs & Client Change Requests
create table if not exists public.tickets (
  id text primary key,
  payload jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. R&D Lab & Vibe Coding Prototypes
create table if not exists public.prototypes (
  id text primary key,
  payload jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. Studio Expenses Ledger
create table if not exists public.expenses (
  id text primary key,
  payload jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 7. Client Payments & Inflow Log
create table if not exists public.client_payments (
  id text primary key,
  payload jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 8. Zero-Knowledge AES-GCM Encrypted Vault Credentials
create table if not exists public.vault_credentials (
  id text primary key,
  payload jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security (RLS) across all 8 tables
alter table public.clients enable row level security;
alter table public.meta_campaigns enable row level security;
alter table public.websites enable row level security;
alter table public.tickets enable row level security;
alter table public.prototypes enable row level security;
alter table public.expenses enable row level security;
alter table public.client_payments enable row level security;
alter table public.vault_credentials enable row level security;

-- Studio Workspace Policies (Allow authenticated / anon key access for internal OS)
create policy "Allow studio access on clients" on public.clients for all using (true) with check (true);
create policy "Allow studio access on meta_campaigns" on public.meta_campaigns for all using (true) with check (true);
create policy "Allow studio access on websites" on public.websites for all using (true) with check (true);
create policy "Allow studio access on tickets" on public.tickets for all using (true) with check (true);
create policy "Allow studio access on prototypes" on public.prototypes for all using (true) with check (true);
create policy "Allow studio access on expenses" on public.expenses for all using (true) with check (true);
create policy "Allow studio access on client_payments" on public.client_payments for all using (true) with check (true);
create policy "Allow studio access on vault_credentials" on public.vault_credentials for all using (true) with check (true);
`;
