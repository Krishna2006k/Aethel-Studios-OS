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

function sanitizeSupabaseError(rawMessage?: string): string {
  if (!rawMessage) return 'Unknown Supabase connection error';
  const trimmed = rawMessage.trim();
  if (
    trimmed.toLowerCase().includes('<!doctype html') ||
    trimmed.toLowerCase().includes('<html')
  ) {
    // If a stale service worker intercepted the cross-origin fetch, force-update/unregister it
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => r.update().catch(() => {})))
        .catch(() => {});
    }
    return 'Could not reach Supabase REST API (received an HTML fallback instead of JSON). Verify your Supabase Project URL is active (not paused), or refresh the page once to clear any cached Service Worker.';
  }
  return trimmed;
}

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
  const clean = {
    url: config.url.trim().replace(/\/+$/, ''),
    anonKey: config.anonKey.trim(),
  };
  localStorage.setItem(LOCAL_STORAGE_SUPA_CONFIG_KEY, JSON.stringify(clean));
  supabaseInstance = null;
  fetch('/api/config/supabase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(clean),
  }).catch(() => {
    // ignore network error
  });
}

export function clearSupabaseConfig(): void {
  localStorage.removeItem(LOCAL_STORAGE_SUPA_CONFIG_KEY);
  supabaseInstance = null;
  fetch('/api/config/supabase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: '', anonKey: '' }),
  }).catch(() => {
    // ignore network error
  });
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

async function fetchServerMirror(): Promise<AethelDatabaseState | null> {
  try {
    const res = await fetch('/api/db');
    if (res.ok) {
      const json = await res.json();
      if (json?.supabaseConfig?.url && json?.supabaseConfig?.anonKey) {
        const currentLocal = getSavedSupabaseConfig();
        if (!currentLocal.url || !currentLocal.anonKey) {
          localStorage.setItem(
            LOCAL_STORAGE_SUPA_CONFIG_KEY,
            JSON.stringify(json.supabaseConfig)
          );
          supabaseInstance = null;
        }
      }
      if (json && json.state && Array.isArray(json.state.clients)) {
        const reconciled = reconcileDatabaseIntegrity(json.state as AethelDatabaseState);
        saveToLocalStorage(reconciled);
        return reconciled;
      }
    }
  } catch {
    // Server unreachable
  }
  return null;
}

async function pushToServerMirror(state: AethelDatabaseState): Promise<void> {
  try {
    await fetch('/api/db', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        state,
        supabaseConfig: getSavedSupabaseConfig().url ? getSavedSupabaseConfig() : undefined,
      }),
    });
  } catch {
    // Ignore offline error
  }
}

export async function loadDatabaseState(): Promise<{
  state: AethelDatabaseState;
  mode: 'supabase' | 'local';
  error?: string;
}> {
  // 1. Always consult the unified server mirror first so all browser profiles share state & config
  const serverState = await fetchServerMirror();
  const baseFallback = serverState ?? loadFromLocalStorage();

  // 2. If Supabase credentials are configured, synchronize with Supabase Cloud
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
          state: baseFallback,
          mode: 'local',
          error: sanitizeSupabaseError(error.message),
        };
      }

      if (data && data.payload) {
        const rawPayload = data.payload as AethelDatabaseState;
        const remoteState = reconcileDatabaseIntegrity({
          ...SEED_DATA,
          ...rawPayload,
        });

        // If remote Supabase row was empty while our local server has real clients,
        // push our local server state up to Supabase so we never wipe out existing work.
        if (remoteState.clients.length === 0 && baseFallback.clients.length > 0) {
          await client.from('aethel_os_state').upsert({
            id: 'studio-primary',
            payload: baseFallback,
            updated_at: new Date().toISOString(),
          });
          saveToLocalStorage(baseFallback);
          await pushToServerMirror(baseFallback);
          return { state: baseFallback, mode: 'supabase' };
        }

        // Persist reconciled state (including newly synced Domain & Meta Ads expenses) back to Supabase
        if ((rawPayload.expenses || []).length !== remoteState.expenses.length) {
          await client.from('aethel_os_state').upsert({
            id: 'studio-primary',
            payload: remoteState,
            updated_at: new Date().toISOString(),
          });
        }

        saveToLocalStorage(remoteState);
        await pushToServerMirror(remoteState);
        return { state: remoteState, mode: 'supabase' };
      } else {
        // Initialize the remote Supabase row with our current workspace state
        const initial = reconcileDatabaseIntegrity(baseFallback);
        const { error: upsertErr } = await client.from('aethel_os_state').upsert({
          id: 'studio-primary',
          payload: initial,
          updated_at: new Date().toISOString(),
        });

        if (upsertErr) {
          return {
            state: initial,
            mode: 'local',
            error: sanitizeSupabaseError(upsertErr.message),
          };
        }

        saveToLocalStorage(initial);
        await pushToServerMirror(initial);
        return { state: initial, mode: 'supabase' };
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown connection error';
      return {
        state: baseFallback,
        mode: 'local',
        error: sanitizeSupabaseError(message),
      };
    }
  }

  return { state: baseFallback, mode: 'local' };
}

export async function saveDatabaseState(
  newState: AethelDatabaseState
): Promise<{ synced: boolean; error?: string }> {
  const reconciledState = reconcileDatabaseIntegrity({
    ...newState,
    lastUpdated: new Date().toISOString(),
  });
  saveToLocalStorage(reconciledState);
  await pushToServerMirror(reconciledState);

  const client = getSupabaseClient();
  if (!client) {
    return { synced: false };
  }

  try {
    const { error } = await client.from('aethel_os_state').upsert({
      id: 'studio-primary',
      payload: reconciledState,
      updated_at: reconciledState.lastUpdated,
    });

    if (error) {
      return { synced: false, error: sanitizeSupabaseError(error.message) };
    }
    return { synced: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sync failed';
    return { synced: false, error: sanitizeSupabaseError(message) };
  }
}

export function loadFromLocalStorage(): AethelDatabaseState {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const reconciled = reconcileDatabaseIntegrity({ ...SEED_DATA, ...parsed });
      saveToLocalStorage(reconciled);
      return reconciled;
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
-- AETHEL OS v3.0 — COMPLETE ENTERPRISE, FINANCE ENGINE & AETHEL BRAIN SCHEMA
-- Founders: Vansh Khakole & Krishna Khakole (aethelstudios.in@gmail.com)
-- Safe to run on BOTH new and existing Supabase databases (100% Idempotent)
-- ============================================================================

-- 0. Enable UUID extension
create extension if not exists "pgcrypto";

-- 1. Primary Real-Time Sync State Table (Stores full atomic OS state including Aethel Brain)
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
  email text,
  city text not null,
  niche text not null,
  package_tier text not null,
  quoted_price numeric not null default 0,
  final_agreed_price numeric not null default 0,
  advance_paid numeric not null default 0,
  stage text not null,
  lead_source text default 'Direct Outreach',
  assigned_to text not null,
  sample_link_sent text,
  follow_up_date date,
  notes text,
  milestones jsonb default '[]'::jsonb,
  proposal_url text,
  contract_url text,
  project_template text,
  project_start_date date,
  project_end_date date,
  approvals jsonb default '[]'::jsonb,
  communication_logs jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- Idempotent migration for existing public.clients tables
alter table public.clients add column if not exists email text;
alter table public.clients add column if not exists lead_source text default 'Direct Outreach';
alter table public.clients add column if not exists proposal_url text;
alter table public.clients add column if not exists contract_url text;
alter table public.clients add column if not exists project_template text;
alter table public.clients add column if not exists project_start_date date;
alter table public.clients add column if not exists project_end_date date;
alter table public.clients add column if not exists approvals jsonb default '[]'::jsonb;
alter table public.clients add column if not exists communication_logs jsonb default '[]'::jsonb;

-- 4. Projects & 6-Stage Delivery Milestones Table (With Subtasks & Checkpoints)
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id text references public.clients(id) on delete cascade,
  service_scope text not null,
  project_template text,
  status text not null default 'In Building',
  progress_percent integer not null default 0,
  assigned_founder text not null,
  start_date date default current_date,
  target_delivery_date date,
  created_at timestamptz default now()
);

alter table public.projects add column if not exists project_template text;

create table if not exists public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  client_id text references public.clients(id) on delete cascade,
  stage text not null, -- Requirements | Design | Development | Testing | Deployment | Handover
  completed boolean not null default false,
  completed_date date,
  owner text not null,
  notes text,
  subtasks jsonb default '[]'::jsonb
);

alter table public.project_milestones add column if not exists notes text;
alter table public.project_milestones add column if not exists subtasks jsonb default '[]'::jsonb;

-- 5. Tasks, Follow-ups & Revision Tickets
create table if not exists public.tasks (
  id text primary key,
  client_id text references public.clients(id) on delete cascade,
  client_name text not null,
  title text not null,
  task_type text not null,
  category text default 'Client Communication',
  recurrence text default 'None',
  priority text not null default 'Normal',
  status text not null default 'Pending',
  assigned_to text not null,
  due_date date,
  notes text,
  subtasks jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

alter table public.tasks add column if not exists category text default 'Client Communication';
alter table public.tasks add column if not exists recurrence text default 'None';
alter table public.tasks add column if not exists subtasks jsonb default '[]'::jsonb;

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

-- 6. Financial Operating Engine: Invoices, Line Items, Quotations, Payments, Expenses, Transactions & Documents
-- Automatically migrate legacy v1/v2 UUID primary/foreign keys on finance tables to TEXT IDs (e.g. 'inv-1001', 'AS-I-001')
do $$
declare
  fk_record record;
begin
  -- 1. Drop any legacy foreign key constraints referencing or originating from finance tables with UUID columns
  for fk_record in
    select
      tc.table_name,
      tc.constraint_name
    from information_schema.table_constraints tc
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_name = tc.constraint_name
      and ccu.table_schema = tc.table_schema
    where tc.constraint_type = 'FOREIGN KEY'
      and tc.table_schema = 'public'
      and (
        ccu.table_name in ('invoices', 'client_payments', 'payments', 'quotations', 'expenses')
        or tc.table_name in ('invoices', 'invoice_items', 'client_payments', 'payments', 'quotations', 'quotation_items', 'expenses', 'finance_transactions')
      )
  loop
    execute format('alter table public.%I drop constraint if exists %I', fk_record.table_name, fk_record.constraint_name);
  end loop;

  -- 2. Upgrade any legacy UUID primary or foreign key columns on finance tables to TEXT
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'invoices' and column_name = 'id' and data_type = 'uuid'
  ) then
    alter table public.invoices alter column id drop default;
    alter table public.invoices alter column id type text using id::text;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'invoices' and column_name = 'client_id' and data_type = 'uuid'
  ) then
    alter table public.invoices alter column client_id type text using client_id::text;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'client_payments' and column_name = 'id' and data_type = 'uuid'
  ) then
    alter table public.client_payments alter column id drop default;
    alter table public.client_payments alter column id type text using id::text;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'client_payments' and column_name = 'invoice_id' and data_type = 'uuid'
  ) then
    alter table public.client_payments alter column invoice_id type text using invoice_id::text;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'payments' and column_name = 'invoice_id' and data_type = 'uuid'
  ) then
    alter table public.payments alter column invoice_id type text using invoice_id::text;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'quotations' and column_name = 'id' and data_type = 'uuid'
  ) then
    alter table public.quotations alter column id drop default;
    alter table public.quotations alter column id type text using id::text;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'expenses' and column_name = 'id' and data_type = 'uuid'
  ) then
    alter table public.expenses alter column id drop default;
    alter table public.expenses alter column id type text using id::text;
  end if;
end $$;

create table if not exists public.invoices (
  id text primary key,
  client_id text references public.clients(id) on delete cascade,
  client_name text,
  client_contact_person text,
  client_email text,
  client_phone text,
  client_address text,
  project_title text,
  invoice_title text,
  invoice_number text not null,
  invoice_type text default 'Standard Invoice',
  payment_terms text,
  line_items jsonb default '[]'::jsonb,
  subtotal numeric not null default 0,
  discount numeric not null default 0,
  total_amount numeric not null default 0,
  amount_paid numeric not null default 0,
  balance_due numeric not null default 0,
  status text not null default 'Issued', -- Draft | Issued | Partially Paid | Paid | Overdue | Cancelled
  issue_date date default current_date,
  due_date date,
  notes text,
  gst_enabled boolean not null default false,
  gst_rate_percent numeric not null default 0,
  gst_disclaimer text default 'GST not charged. Supplier is not registered under GST.',
  template_id text default 'tpl-aethel-editorial',
  source_quotation_id text,
  version integer not null default 1,
  created_at timestamptz default now()
);

alter table public.invoices add column if not exists client_name text;
alter table public.invoices add column if not exists client_contact_person text;
alter table public.invoices add column if not exists client_email text;
alter table public.invoices add column if not exists client_phone text;
alter table public.invoices add column if not exists client_address text;
alter table public.invoices add column if not exists project_title text;
alter table public.invoices add column if not exists invoice_title text;
alter table public.invoices add column if not exists invoice_type text default 'Standard Invoice';
alter table public.invoices add column if not exists payment_terms text;
alter table public.invoices add column if not exists line_items jsonb default '[]'::jsonb;
alter table public.invoices add column if not exists subtotal numeric not null default 0;
alter table public.invoices add column if not exists discount numeric not null default 0;
alter table public.invoices add column if not exists balance_due numeric not null default 0;
alter table public.invoices add column if not exists issue_date date default current_date;
alter table public.invoices add column if not exists notes text;
alter table public.invoices add column if not exists gst_enabled boolean not null default false;
alter table public.invoices add column if not exists gst_rate_percent numeric not null default 0;
alter table public.invoices add column if not exists gst_disclaimer text default 'GST not charged. Supplier is not registered under GST.';
alter table public.invoices add column if not exists template_id text default 'tpl-aethel-editorial';
alter table public.invoices add column if not exists source_quotation_id text;
alter table public.invoices add column if not exists version integer not null default 1;

create table if not exists public.invoice_items (
  id text primary key,
  invoice_id text references public.invoices(id) on delete cascade,
  service_name text not null,
  description text,
  quantity numeric not null default 1,
  unit_price numeric not null default 0,
  total numeric not null default 0,
  sort_order integer not null default 0
);

create table if not exists public.quotations (
  id text primary key,
  quote_number text not null,
  client_id text references public.clients(id) on delete set null,
  client_name text not null,
  client_contact_person text,
  client_email text,
  client_phone text,
  client_address text,
  project_title text not null,
  quote_date date default current_date,
  valid_until date,
  status text not null default 'Draft', -- Draft | Sent | Accepted | Rejected | Expired
  line_items jsonb default '[]'::jsonb,
  subtotal numeric not null default 0,
  discount numeric not null default 0,
  total numeric not null default 0,
  notes text,
  terms_and_conditions text,
  converted_invoice_id text,
  converted_invoice_number text,
  template_id text default 'tpl-aethel-editorial',
  created_at timestamptz default now()
);

create table if not exists public.quotation_items (
  id text primary key,
  quotation_id text references public.quotations(id) on delete cascade,
  service_name text not null,
  description text,
  quantity numeric not null default 1,
  unit_price numeric not null default 0,
  total numeric not null default 0,
  sort_order integer not null default 0
);

create table if not exists public.client_payments (
  id text primary key,
  receipt_number text,
  invoice_id text references public.invoices(id) on delete set null,
  invoice_number text,
  client_id text references public.clients(id) on delete set null,
  client_name text not null,
  project_title text not null,
  total_project_value numeric not null default 0,
  amount_received numeric not null default 0,
  payment_date date,
  payment_mode text not null, -- UPI | Cash | Bank Transfer | Other
  received_in_account text not null,
  milestone text not null,
  upi_reference text,
  notes text,
  created_at timestamptz default now()
);

alter table public.client_payments add column if not exists receipt_number text;
alter table public.client_payments add column if not exists invoice_id text;
alter table public.client_payments add column if not exists invoice_number text;
alter table public.client_payments add column if not exists upi_reference text;
alter table public.client_payments add column if not exists notes text;

create table if not exists public.expenses (
  id text primary key,
  expense_number text,
  title text not null,
  description text,
  category text not null, -- Hosting | Domains | Software & Subscriptions | Advertising | Client Acquisition | Equipment | Travel | Freelance | Miscellaneous
  amount numeric not null default 0,
  payment_method text default 'UPI',
  vendor text,
  reference_number text,
  attachment_url text,
  paid_by text not null,
  expense_date date,
  client_id text references public.clients(id) on delete set null,
  client_related text,
  reimbursed boolean default false,
  notes text,
  linked_domain_id text,
  linked_campaign_id text,
  created_at timestamptz default now()
);

alter table public.expenses add column if not exists expense_number text;
alter table public.expenses add column if not exists description text;
alter table public.expenses add column if not exists payment_method text default 'UPI';
alter table public.expenses add column if not exists vendor text;
alter table public.expenses add column if not exists reference_number text;
alter table public.expenses add column if not exists attachment_url text;
alter table public.expenses add column if not exists client_id text;
alter table public.expenses add column if not exists linked_domain_id text;
alter table public.expenses add column if not exists linked_campaign_id text;

create table if not exists public.finance_transactions (
  id text primary key,
  transaction_date date not null default current_date,
  transaction_type text not null, -- Income | Expense | Refund
  amount numeric not null default 0,
  payment_method text not null default 'UPI', -- UPI | Cash | Bank Transfer | Other
  client_id text references public.clients(id) on delete set null,
  client_name text,
  project_title text,
  invoice_id text,
  invoice_number text,
  payment_id text,
  expense_id text,
  reference_number text,
  description text not null,
  notes text,
  account text,
  created_at timestamptz default now()
);

create table if not exists public.generated_documents (
  id text primary key,
  document_number text not null,
  document_type text not null, -- Quotation | Invoice | Payment Receipt | Statement of Account
  version integer not null default 1,
  client_id text references public.clients(id) on delete set null,
  client_name text not null,
  project_title text,
  invoice_id text,
  quotation_id text,
  payment_id text,
  created_date date not null default current_date,
  amount numeric not null default 0,
  status text not null,
  template_id text not null default 'tpl-aethel-editorial',
  snapshot_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.document_templates (
  id text primary key,
  name text not null,
  description text,
  accent_color text not null default '#2563EB',
  header_style text not null default 'editorial-dark',
  font_family text not null default 'Plus Jakarta Sans',
  show_logo boolean not null default true,
  footer_text text,
  created_at timestamptz default now()
);

create table if not exists public.finance_settings (
  id text primary key default 'studio-finance-settings',
  studio_name text not null default 'Aethel Studios',
  contact_person_1 text not null default 'Krishna Khakole',
  phone_1 text,
  contact_person_2 text not null default 'Vansh Khakole',
  phone_2 text,
  email text not null default 'aethelstudios.in@gmail.com',
  website text,
  address text,
  upi_id text,
  bank_name text,
  bank_account_name text,
  bank_account_number text,
  bank_ifsc text,
  gst_registration_status text not null default 'Unregistered',
  gst_enabled boolean not null default false,
  gstin text,
  gst_rate_percent numeric not null default 0,
  gst_disclaimer text not null default 'GST not charged. Supplier is not registered under GST.',
  default_template_id text not null default 'tpl-aethel-editorial',
  invoice_prefix text not null default 'AS-I-',
  receipt_prefix text not null default 'AS-R-',
  quotation_prefix text not null default 'AS-Q-',
  statement_prefix text not null default 'AS-S-',
  expense_prefix text not null default 'AS-E-',
  next_invoice_number integer not null default 1,
  next_receipt_number integer not null default 1,
  next_quotation_number integer not null default 1,
  next_statement_number integer not null default 1,
  next_expense_number integer not null default 1,
  updated_at timestamptz default now()
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
  paid_by text default 'Studio Account',
  impressions integer default 0,
  reach integer default 0,
  clicks integer default 0,
  conversions integer default 0,
  roas numeric default 0,
  created_at timestamptz default now()
);

alter table public.meta_campaigns add column if not exists paid_by text default 'Studio Account';
alter table public.meta_campaigns add column if not exists impressions integer default 0;
alter table public.meta_campaigns add column if not exists reach integer default 0;
alter table public.meta_campaigns add column if not exists clicks integer default 0;
alter table public.meta_campaigns add column if not exists conversions integer default 0;
alter table public.meta_campaigns add column if not exists roas numeric default 0;

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
  paid_by text default 'Studio Account',
  hosting_plan text,
  backup_status text default 'Verified Daily',
  last_backup_date date,
  uptime_percent numeric default 99.98,
  response_time_ms integer default 142,
  last_checked_at timestamptz,
  client_payment_status text default 'Client Paid',
  created_at timestamptz default now()
);

alter table public.websites add column if not exists paid_by text default 'Studio Account';
alter table public.websites add column if not exists hosting_plan text;
alter table public.websites add column if not exists backup_status text default 'Verified Daily';
alter table public.websites add column if not exists last_backup_date date;
alter table public.websites add column if not exists uptime_percent numeric default 99.98;
alter table public.websites add column if not exists response_time_ms integer default 142;
alter table public.websites add column if not exists last_checked_at timestamptz;
alter table public.websites add column if not exists client_payment_status text default 'Client Paid';

-- 8. Workshop: R&D Lab Prototypes, AES-256 Encrypted Vault & Automation Rules
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
  linked_client_ids text[] default '{}',
  updated_at date,
  created_at timestamptz default now()
);

alter table public.rnd_projects add column if not exists linked_client_ids text[] default '{}';

create table if not exists public.vault_credentials (
  id text primary key,
  title text not null,
  category text not null,
  account_identifier text not null,
  login_url text,
  client_associated text,
  project_associated text,
  owner text default 'Both',
  notes text,
  cipher_text text not null,
  iv text not null,
  salt text not null,
  updated_at date,
  created_at timestamptz default now()
);

alter table public.vault_credentials add column if not exists project_associated text;
alter table public.vault_credentials add column if not exists owner text default 'Both';
alter table public.vault_credentials add column if not exists notes text;

create table if not exists public.automation_rules (
  id text primary key,
  name text not null,
  trigger_condition text not null,
  action_description text not null,
  category text not null,
  enabled boolean not null default true,
  triggered_count integer not null default 0,
  updated_at timestamptz default now()
);

-- 9. AETHEL BRAIN — Shared Memory & Co-Founder Communication Centre (5 Pillars)

-- 9A. Component 1: The Daily Log (Chronological Co-Founder Activity Journal)
create table if not exists public.brain_daily_logs (
  id text primary key,
  author text not null, -- 'Krishna' | 'Vansh'
  content text not null,
  log_date date not null default current_date,
  log_time text not null,
  linked_client_id text references public.clients(id) on delete set null,
  linked_client_name text,
  linked_task_id text,
  mentions text[] default '{}',
  reactions text[] default '{}',
  pinned boolean default false,
  created_at timestamptz default now()
);

-- 9B. Component 2: Brain Dump (Quick Capture & Idea Inbox)
create table if not exists public.brain_dumps (
  id text primary key,
  title text not null,
  description text not null,
  author text not null, -- 'Krishna' | 'Vansh'
  dump_date date not null default current_date,
  category text not null,
  priority text not null default 'Normal',
  linked_client_id text references public.clients(id) on delete set null,
  linked_client_name text,
  status text not null default 'Unsorted', -- 'Unsorted' | 'In Progress' | 'Archived'
  pinned boolean default false,
  converted_task_id text,
  tags text[] default '{}',
  created_at timestamptz default now()
);

-- 9C. Component 3: Handover Notes (Structured Async Co-Founder Messages)
create table if not exists public.brain_handovers (
  id text primary key,
  from_founder text not null,
  to_founder text not null,
  handover_date date not null default current_date,
  handover_time text not null,
  title text not null,
  content text not null,
  action_items jsonb default '[]'::jsonb,
  linked_client_id text references public.clients(id) on delete set null,
  linked_client_name text,
  status text not null default 'Unread', -- 'Unread' | 'Read' | 'Acknowledged'
  replies jsonb default '[]'::jsonb,
  reactions text[] default '{}',
  created_at timestamptz default now()
);

-- 9D. Component 4: Weekly Recaps (AI Executive Briefs & Studio Metrics)
create table if not exists public.brain_weekly_recaps (
  id text primary key,
  week_range text not null,
  generated_at timestamptz not null default now(),
  executive_summary text not null,
  accomplishments jsonb default '[]'::jsonb,
  krishna_contributions jsonb default '[]'::jsonb,
  vansh_contributions jsonb default '[]'::jsonb,
  pending_items jsonb default '[]'::jsonb,
  important_discussions jsonb default '[]'::jsonb,
  next_week_priorities jsonb default '[]'::jsonb,
  ai_observations jsonb default '[]'::jsonb,
  metrics jsonb default '{}'::jsonb
);

-- 9E. Component 5: Aethel Memory (Permanent Institutional Knowledge Wiki & SOPs)
create table if not exists public.brain_memories (
  id text primary key,
  title text not null,
  category text not null, -- 'Decisions' | 'Processes & SOPs' | 'Pricing & Packages' | 'Lessons Learned' | 'Tech Stack & Architecture' | 'Marketing Playbooks'
  content text not null,
  reasoning text,
  author text not null,
  memory_date date not null default current_date,
  pinned boolean default false,
  tags text[] default '{}',
  created_at timestamptz default now()
);

-- 10. Studio Activity Stream
create table if not exists public.activity_logs (
  id text primary key,
  actor text not null,
  action text not null,
  target_name text not null,
  category text not null,
  timestamp timestamptz not null default now()
);

-- 11. Enable Row Level Security (RLS) & Studio Access Policies
alter table public.aethel_os_state enable row level security;
drop policy if exists "Allow studio full access" on public.aethel_os_state;
create policy "Allow studio full access"
  on public.aethel_os_state
  for all
  using (true)
  with check (true);
`;
