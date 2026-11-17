import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AethelDatabaseState } from '../types';
import { SEED_DATA } from '../data/seedData';
import { reconcileDatabaseIntegrity } from '../utils/syncEngine';

const LOCAL_STORAGE_DB_KEY = 'aethel_os_db_v3';
const LOCAL_STORAGE_SUPA_CONFIG_KEY = 'aethel_os_supabase_config_v1';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

let supabaseInstance: SupabaseClient | null = null;

export function getSavedSupabaseConfig(): SupabaseConfig {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SUPA_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.url && parsed.anonKey) return parsed;
    }
  } catch {
    // ignore
  }
  return {
    url: (import.meta as unknown as { env: Record<string, string> }).env?.VITE_SUPABASE_URL || '',
    anonKey: (import.meta as unknown as { env: Record<string, string> }).env?.VITE_SUPABASE_ANON_KEY || '',
  };
}

export function saveSupabaseConfig(config: SupabaseConfig): void {
  localStorage.setItem(LOCAL_STORAGE_SUPA_CONFIG_KEY, JSON.stringify(config));
  supabaseInstance = null;
}

export function clearSupabaseConfig(): void {
  localStorage.removeItem(LOCAL_STORAGE_SUPA_CONFIG_KEY);
  supabaseInstance = null;
}

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;
  const { url, anonKey } = getSavedSupabaseConfig();
  if (!url || !anonKey || !url.startsWith('http')) return null;
  try {
    supabaseInstance = createClient(url, anonKey);
    return supabaseInstance;
  } catch {
    return null;
  }
}

export async function loadDatabaseState(): Promise<{
  state: AethelDatabaseState;
  mode: 'supabase' | 'local';
  error?: string;
}> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('aethel_os_state')
        .select('payload, updated_at')
        .eq('id', 'studio-primary')
        .maybeSingle();

      if (error) {
        return {
          state: loadFromLocalStorage(),
          mode: 'local',
          error: error.message,
        };
      }

      if (data && data.payload) {
        const merged = reconcileDatabaseIntegrity({
          ...SEED_DATA,
          ...(data.payload as AethelDatabaseState),
        });
        saveToLocalStorage(merged);
        return { state: merged, mode: 'supabase' };
      } else {
        const initial = reconcileDatabaseIntegrity(loadFromLocalStorage());
        await client.from('aethel_os_state').upsert({
          id: 'studio-primary',
          studio_email: 'aethelstudios.in@gmail.com',
          payload: initial,
          updated_at: new Date().toISOString(),
        });
        return { state: initial, mode: 'supabase' };
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown connection error';
      return {
        state: loadFromLocalStorage(),
        mode: 'local',
        error: message,
      };
    }
  }

  try {
    const res = await fetch('/api/db');
    if (res.ok) {
      const json = await res.json();
      if (json && json.state && Array.isArray(json.state.clients)) {
        const reconciled = reconcileDatabaseIntegrity(json.state as AethelDatabaseState);
        saveToLocalStorage(reconciled);
        return { state: reconciled, mode: 'local' };
      }
    }
  } catch {
    // Fallback to browser localStorage if API is unreachable
  }

  return { state: loadFromLocalStorage(), mode: 'local' };
}

export async function saveDatabaseState(
  newState: AethelDatabaseState
): Promise<{ synced: boolean; error?: string }> {
  const reconciledState = reconcileDatabaseIntegrity({
    ...newState,
    lastUpdated: new Date().toISOString(),
  });
  saveToLocalStorage(reconciledState);

  try {
    await fetch('/api/db', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reconciledState),
    });
  } catch {
    // Continue even if offline
  }

  const client = getSupabaseClient();
  if (!client) {
    return { synced: false };
  }

  try {
    const { error } = await client.from('aethel_os_state').upsert({
      id: 'studio-primary',
      studio_email: 'aethelstudios.in@gmail.com',
      payload: reconciledState,
      updated_at: reconciledState.lastUpdated,
    });

    if (error) {
      return { synced: false, error: error.message };
    }
    return { synced: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sync failed';
    return { synced: false, error: message };
  }
}

export function loadFromLocalStorage(): AethelDatabaseState {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return reconcileDatabaseIntegrity({ ...SEED_DATA, ...parsed });
    }
  } catch {
    // ignore
  }
  const initial = reconcileDatabaseIntegrity(SEED_DATA);
  saveToLocalStorage(initial);
  return initial;
}

export function saveToLocalStorage(state: AethelDatabaseState): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_DB_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export const SUPABASE_COMPLETE_SQL_SCHEMA = `-- ============================================================================
-- AETHEL OS — ENTERPRISE RELATIONAL & HYBRID PostgreSQL SCHEMA (SUPABASE)
-- Founders: Vansh Khakole & Krishna Khakole (aethelstudios.in@gmail.com)
-- Architecture: Multi-tenant Organizations + Relational Core + Real-time Sync
-- ============================================================================

-- 0. Enable UUID extension
create extension if not exists "pgcrypto";

-- 1. Primary Real-Time Sync State Table (Used for instant atomic OS state snapshots)
create table if not exists public.aethel_os_state (
  id text primary key default 'studio-primary',
  studio_email text not null default 'aethelstudios.in@gmail.com',
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

-- 2. Organizations & Founder Profiles (Multi-Tenant Auth Ready)
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Aethel Studios',
  studio_email text not null default 'aethelstudios.in@gmail.com',
  created_at timestamptz default now()
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  full_name text not null,
  role text not null default 'Founder',
  phone text,
  created_at timestamptz default now()
);

-- 3. Central CRM Clients Table (Single Source of Truth for Client 360)
create table if not exists public.clients (
  id text primary key,
  organization_id uuid references public.organizations(id) on delete set null,
  business_name text not null,
  contact_person text not null,
  phone text not null,
  city text not null,
  niche text not null,
  package_tier text not null,
  quoted_price numeric not null default 0,
  final_agreed_price numeric not null default 0,
  advance_paid numeric not null default 0,
  stage text not null,
  assigned_to text not null,
  sample_link_sent text,
  follow_up_date date,
  notes text,
  milestones jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- 4. Projects & 6-Stage Delivery Milestones Table
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id text references public.clients(id) on delete cascade,
  service_scope text not null,
  status text not null default 'In Building',
  progress_percent integer not null default 0,
  assigned_founder text not null,
  start_date date default current_date,
  target_delivery_date date,
  created_at timestamptz default now()
);

create table if not exists public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  client_id text references public.clients(id) on delete cascade,
  stage text not null, -- Requirements | Design | Development | Testing | Deployment | Handover
  completed boolean not null default false,
  completed_date date,
  owner text not null
);

-- 5. Tasks, Follow-ups & Revision Tickets
create table if not exists public.tasks (
  id text primary key,
  client_id text references public.clients(id) on delete cascade,
  client_name text not null,
  title text not null,
  task_type text not null,
  priority text not null default 'Normal',
  status text not null default 'Pending',
  assigned_to text not null,
  due_date date,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.tickets (
  id text primary key,
  client_id text references public.clients(id) on delete cascade,
  client_name text not null,
  domain_name text,
  title text not null,
  category text not null,
  priority text not null,
  status text not null,
  assigned_to text not null,
  due_date date,
  description text,
  created_at timestamptz default now()
);

-- 6. Financial Ledger: Invoices, Verified Client Payments & Operational Expenses
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  client_id text references public.clients(id) on delete cascade,
  invoice_number text not null,
  total_amount numeric not null default 0,
  amount_paid numeric not null default 0,
  balance_due numeric generated always as (greatest(0, total_amount - amount_paid)) stored,
  status text not null default 'Partial',
  due_date date,
  created_at timestamptz default now()
);

create table if not exists public.client_payments (
  id text primary key,
  client_id text references public.clients(id) on delete set null,
  client_name text not null,
  project_title text not null,
  total_project_value numeric not null default 0,
  amount_received numeric not null default 0,
  payment_date date,
  payment_mode text not null,
  received_in_account text not null,
  milestone text not null,
  created_at timestamptz default now()
);

create table if not exists public.expenses (
  id text primary key,
  title text not null,
  category text not null,
  amount numeric not null default 0,
  paid_by text not null,
  expense_date date,
  client_related text,
  reimbursed boolean default false,
  notes text,
  created_at timestamptz default now()
);

-- 7. Growth & Infrastructure: Meta Ad Campaigns & Hosted Domains
create table if not exists public.meta_campaigns (
  id text primary key,
  client_id text references public.clients(id) on delete set null,
  client_name text not null,
  campaign_name text not null,
  objective text not null,
  status text not null,
  total_budget numeric not null default 0,
  amount_spent numeric not null default 0,
  agency_fee numeric not null default 0,
  leads_generated integer not null default 0,
  start_date date,
  end_date date,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.websites (
  id text primary key,
  client_id text references public.clients(id) on delete set null,
  client_name text not null,
  domain_name text not null,
  live_url text not null,
  registrar text not null,
  hosting_platform text not null,
  purchase_date date,
  expiry_date date,
  renewal_cost_inr numeric not null default 0,
  ssl_status text not null,
  site_status text not null,
  github_repo text,
  notes text,
  created_at timestamptz default now()
);

-- 8. Workshop: R&D Lab Prototypes, AES-256 Encrypted Vault & Audit Activity Logs
create table if not exists public.rnd_projects (
  id text primary key,
  title text not null,
  category text not null,
  target_niche text not null,
  status text not null,
  lead_founder text not null,
  preview_url text,
  tech_stack text[],
  impact_notes text,
  updated_at date,
  created_at timestamptz default now()
);

create table if not exists public.vault_credentials (
  id text primary key,
  title text not null,
  category text not null,
  account_identifier text not null,
  login_url text,
  client_associated text,
  cipher_text text not null,
  iv text not null,
  salt text not null,
  updated_at date,
  created_at timestamptz default now()
);

create table if not exists public.activity_logs (
  id text primary key,
  actor text not null,
  action text not null,
  target_name text not null,
  category text not null,
  timestamp timestamptz not null default now()
);

-- Enable Row Level Security (RLS) & Studio Access Policies
alter table public.aethel_os_state enable row level security;
drop policy if exists "Allow studio full access" on public.aethel_os_state;
create policy "Allow studio full access"
  on public.aethel_os_state
  for all
  using (true)
  with check (true);
`;
