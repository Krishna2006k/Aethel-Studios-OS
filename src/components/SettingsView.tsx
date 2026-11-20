import React, { useState, useEffect } from 'react';
import {
  Database,
  Zap,
  Smartphone,
  HelpCircle,
  Cloud,
  Check,
  Copy,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Download,
  Share,
  MoreVertical,
  ExternalLink,
  Sparkles,
  Brain,
  ShieldCheck,
  Layers,
  Terminal,
} from 'lucide-react';
import {
  getSavedSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  SUPABASE_COMPLETE_SQL_SCHEMA,
} from '../services/dbService';
import { AethelDatabaseState } from '../types';
import { DEFAULT_AUTOMATION_RULES } from '../utils/syncEngine';
import { usePWAInstall } from '../hooks/usePWAInstall';

export type SettingsTabId = 'cloud-sync' | 'automations' | 'install-app' | 'help-architecture';

interface SettingsViewProps {
  dbState: AethelDatabaseState;
  syncMode: 'supabase' | 'local';
  isSyncing: boolean;
  initialTab?: SettingsTabId;
  onConnectionChanged: () => Promise<{ mode: 'supabase' | 'local'; error?: string }>;
  onResetDemoData: () => Promise<void>;
  onToggleAutomationRule: (ruleId: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  dbState,
  syncMode,
  isSyncing,
  initialTab = 'cloud-sync',
  onConnectionChanged,
  onResetDemoData,
  onToggleAutomationRule,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialTab);
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'success' | 'error'>('success');
  const [isTesting, setIsTesting] = useState(false);
  const [confirmClearData, setConfirmClearData] = useState(false);
  const [copiedAppUrl, setCopiedAppUrl] = useState(false);

  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();

  useEffect(() => {
    const saved = getSavedSupabaseConfig();
    setUrl(saved.url);
    setAnonKey(saved.anonKey);
  }, []);

  const automationRules =
    dbState.automationRules && dbState.automationRules.length > 0
      ? dbState.automationRules
      : DEFAULT_AUTOMATION_RULES;

  const activeAutomationsCount = automationRules.filter((r) => r.enabled).length;

  const handleSaveSupabase = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setStatusMessage(null);
    saveSupabaseConfig({ url, anonKey });
    const res = await onConnectionChanged();
    setIsTesting(false);

    if (res.mode === 'supabase') {
      setStatusType('success');
      setStatusMessage(
        'Supabase Cloud connected and synchronized! All CRM, Finance, Deliveries, and Aethel Brain records are backed up.'
      );
    } else if (res.error) {
      setStatusType('error');
      setStatusMessage(
        `Supabase notice: ${res.error}. Copy the Updated v2.0 SQL Schema below and run it in your Supabase SQL Editor, then click "Save & Sync Connection" again.`
      );
    } else {
      setStatusType('error');
      setStatusMessage('Please enter both a valid Supabase Project URL and Anon Public Key.');
    }
  };

  const handleDisconnectSupabase = async () => {
    clearSupabaseConfig();
    setUrl('');
    setAnonKey('');
    await onConnectionChanged();
    setStatusType('success');
    setStatusMessage('Disconnected from Supabase Cloud. Running on Studio Server persistence.');
  };

  const handleCopySchema = () => {
    navigator.clipboard.writeText(SUPABASE_COMPLETE_SQL_SCHEMA);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2500);
  };

  const handleCopyAppUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopiedAppUrl(true);
      setTimeout(() => setCopiedAppUrl(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-[#EAECEF] p-5 sm:p-7 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#2563EB]">
              STUDIO CONFIGURATION &amp; SYSTEM ARCHITECTURE
            </span>
            <span
              className={`inline-flex items-center gap-1.5 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-md ${
                syncMode === 'supabase'
                  ? 'bg-[#D1FAE5] text-[#059669]'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  syncMode === 'supabase' ? 'bg-[#059669]' : 'bg-amber-600'
                }`}
              />
              {syncMode === 'supabase'
                ? isSyncing
                  ? 'SYNCING TO SUPABASE...'
                  : 'SUPABASE CLOUD SYNCED'
                : 'STUDIO SERVER ENGINE'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0B0F19] tracking-tight mt-1">
            Settings, Cloud Database, Automations &amp; App Setup
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1">
            Manage Supabase PostgreSQL v2.0 schema sync, automated studio workflows, standalone mobile/desktop app installation, and OS architecture documentation.
          </p>
        </div>

        {/* Sub-Tab Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#F8F9FA] p-1.5 rounded-2xl border border-[#EAECEF] shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('cloud-sync')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'cloud-sync'
                ? 'bg-[#0B0F19] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#0B0F19]'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Cloud Sync &amp; SQL</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('automations')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'automations'
                ? 'bg-[#0B0F19] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#0B0F19]'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Automations ({activeAutomationsCount} ON)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('install-app')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'install-app'
                ? 'bg-[#0B0F19] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#0B0F19]'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Install App</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('help-architecture')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'help-architecture'
                ? 'bg-[#0B0F19] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#0B0F19]'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Help &amp; Architecture</span>
          </button>
        </div>
      </div>

      {/* TAB 1: CLOUD SYNC & UPDATED v2.0 SUPABASE SQL SCHEMA */}
      {activeTab === 'cloud-sync' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Connection Credentials & Actions */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white rounded-3xl border border-[#EAECEF] p-6 shadow-2xs space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#2563EB]">
                    REAL-TIME CLOUD PERSISTENCE
                  </span>
                  <h2 className="text-base font-extrabold text-[#0B0F19] mt-0.5">
                    Supabase Connection Credentials
                  </h2>
                </div>
                <span
                  className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-md ${
                    syncMode === 'supabase'
                      ? 'bg-[#D1FAE5] text-[#059669]'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {syncMode === 'supabase' ? 'CONNECTED' : 'LOCAL MIRROR'}
                </span>
              </div>

              <form onSubmit={handleSaveSupabase} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1.5">
                    Supabase Project URL
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://your-project-id.supabase.co"
                    className="w-full bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 text-sm text-[#0B0F19] font-mono focus:outline-none focus:border-[#2563EB] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1.5">
                    Supabase Anon Public Key
                  </label>
                  <input
                    type="password"
                    value={anonKey}
                    onChange={(e) => setAnonKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI..."
                    className="w-full bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 text-sm text-[#0B0F19] font-mono focus:outline-none focus:border-[#2563EB] focus:bg-white"
                  />
                </div>

                {statusMessage && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs font-medium flex items-start gap-2.5 leading-relaxed ${
                      statusType === 'success'
                        ? 'bg-[#D1FAE5]/60 border-[#059669]/30 text-[#059669]'
                        : 'bg-amber-50 border-amber-300 text-amber-900'
                    }`}
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{statusMessage}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button
                    type="submit"
                    disabled={isTesting}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    <Cloud className="w-4 h-4" />
                    {isTesting ? 'Verifying & Syncing...' : 'Save & Sync Connection'}
                  </button>

                  {url && (
                    <button
                      type="button"
                      onClick={handleDisconnectSupabase}
                      className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#64748B] hover:text-[#0B0F19] bg-[#F8F9FA] border border-[#EAECEF] transition-colors cursor-pointer"
                    >
                      Disconnect
                    </button>
                  )}
                </div>
              </form>

              <div className="pt-4 border-t border-[#EAECEF] space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                  How Aethel OS v2.0 Hybrid Sync Works
                </div>
                <div className="p-3.5 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF] text-xs text-[#475569] space-y-2 leading-relaxed">
                  <p>
                    <strong className="text-[#0B0F19]">1. Zero-Loss Atomic Sync (`aethel_os_state`):</strong>{' '}
                    Every change across CRM, Projects, Approvals, Subtasks, Finance, Invoices, Automations, and all 5 pillars of <strong>Aethel Brain</strong> is immediately saved as an atomic JSONB snapshot in <code className="font-mono text-[#2563EB]">public.aethel_os_state</code>.
                  </p>
                  <p>
                    <strong className="text-[#0B0F19]">2. Upgraded v2.0 Relational Schema:</strong>{' '}
                    The updated SQL script on the right uses <code className="font-mono text-[#059669]">CREATE TABLE IF NOT EXISTS</code> and <code className="font-mono text-[#059669]">ALTER TABLE ... ADD COLUMN IF NOT EXISTS</code> so you can safely run it on an existing Supabase project to add the new <strong>Aethel Brain</strong> (<code className="font-mono">brain_daily_logs</code>, <code className="font-mono">brain_dumps</code>, <code className="font-mono">brain_handovers</code>, <code className="font-mono">brain_weekly_recaps</code>, <code className="font-mono">brain_memories</code>), <strong>Approvals</strong>, and <strong>Automation Rules</strong> tables without losing any existing data.
                  </p>
                </div>
              </div>

              {/* Danger Zone: Clear Workspace Data */}
              <div className="pt-4 border-t border-[#EAECEF] flex items-center justify-between gap-3">
                <div className="text-xs text-[#64748B]">
                  Need to reset all workspace records to an empty studio state?
                </div>
                {!confirmClearData ? (
                  <button
                    type="button"
                    onClick={() => setConfirmClearData(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#E11D48] bg-[#FFE4E6]/50 hover:bg-[#FFE4E6] transition-colors cursor-pointer shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Clear Workspace Data
                  </button>
                ) : (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={async () => {
                        await onResetDemoData();
                        setConfirmClearData(false);
                        setStatusType('success');
                        setStatusMessage('All workspace records cleared to an empty studio state.');
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#E11D48] text-white cursor-pointer"
                    >
                      Confirm Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClearData(false)}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-[#F8F9FA] text-[#64748B] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Updated v2.0 PostgreSQL Relational Schema */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-3xl border border-[#EAECEF] p-6 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#059669]">
                    IDEMPOTENT MIGRATION &amp; FULL SCHEMA (v2.0)
                  </span>
                  <h2 className="text-base font-extrabold text-[#0B0F19] mt-0.5 flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-[#2563EB]" />
                    Supabase PostgreSQL Schema (Includes Aethel Brain &amp; Automations)
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleCopySchema}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0B0F19] hover:bg-[#1E293B] text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
                >
                  {copiedSchema ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#34D399]" />
                      Copied v2.0 SQL Schema
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Updated SQL Schema
                    </>
                  )}
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[
                  'aethel_os_state',
                  'clients (+approvals/logs)',
                  'projects & subtasks',
                  'invoices & payments',
                  'meta_campaigns',
                  'websites',
                  'brain_daily_logs',
                  'brain_dumps',
                  'brain_handovers',
                  'brain_weekly_recaps',
                  'brain_memories',
                  'automation_rules',
                ].map((tbl) => (
                  <span
                    key={tbl}
                    className="px-2 py-0.5 rounded-md bg-[#F8F9FA] border border-[#EAECEF] text-[10px] font-mono font-semibold text-[#475569]"
                  >
                    {tbl}
                  </span>
                ))}
              </div>

              <pre className="bg-[#0B0F19] text-slate-200 p-4 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-[540px] overflow-y-auto leading-relaxed border border-slate-800">
                {SUPABASE_COMPLETE_SQL_SCHEMA}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STUDIO AUTOMATIONS ENGINE */}
      {activeTab === 'automations' && (
        <div className="bg-white rounded-3xl border border-[#EAECEF] p-6 sm:p-7 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EAECEF] pb-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-[#2563EB] flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" /> Proactive Operations Engine
              </div>
              <h2 className="text-lg font-extrabold text-[#0B0F19] mt-0.5">
                Automation Preferences ({activeAutomationsCount} of {automationRules.length} Enabled)
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                These are saved configuration preferences. A configurable trigger runner and scheduled workflow execution are not implemented yet.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#D1FAE5]/70 text-[#059669] text-xs font-bold">
              <AlertCircle className="w-4 h-4" /> Preferences Only · No Background Runner
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {automationRules.map((rule) => (
              <div
                key={rule.id}
                className="p-5 rounded-2xl border border-[#EAECEF] bg-[#F8F9FA] flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-extrabold text-[#0B0F19]">
                      {rule.name}
                    </span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white border border-[#EAECEF] text-[#475569]">
                      {rule.category}
                    </span>
                  </div>
                  <div className="text-xs text-[#475569] leading-relaxed">
                    <strong className="text-[#0B0F19]">PLANNED TRIGGER:</strong> {rule.trigger}
                  </div>
                  <div className="text-xs text-[#2563EB] font-medium leading-relaxed">
                    <strong>PLANNED ACTION:</strong> {rule.action}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#EAECEF] flex items-center justify-between">
                  <span className="text-[11px] font-mono text-[#64748B]">
                    Configuration only — no rule executor connected
                  </span>
                  <button
                    type="button"
                    onClick={() => onToggleAutomationRule(rule.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      rule.enabled
                        ? 'bg-[#059669] text-white'
                        : 'bg-[#E2E8F0] text-[#64748B]'
                    }`}
                  >
                    {rule.enabled ? 'Enabled (Saved)' : 'Disabled (Saved)'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: INSTALL APP (MOBILE & DESKTOP PWA) */}
      {activeTab === 'install-app' && (
        <div className="bg-white rounded-3xl border border-[#EAECEF] p-6 sm:p-7 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAECEF] pb-5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#0B0F19] text-white flex items-center justify-center font-extrabold text-xl shrink-0 shadow-sm">
                A
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-[#2563EB]">
                  NATIVE STANDALONE PWA
                </div>
                <h2 className="text-lg font-extrabold text-[#0B0F19]">
                  Install Aethel OS on Phone, Tablet &amp; Desktop
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Run Aethel OS in full-screen standalone mode from your home screen or desktop dock with instant offline shell caching.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {isInstalled ? (
                <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#D1FAE5] text-[#059669] text-xs font-extrabold">
                  <CheckCircle2 className="w-4 h-4" /> Running as Installed Standalone App
                </span>
              ) : isInstallable ? (
                <button
                  type="button"
                  onClick={() => install()}
                  className="py-2.5 px-5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-extrabold flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Install Aethel OS Now (1-Click)
                </button>
              ) : null}

              <button
                type="button"
                onClick={handleCopyAppUrl}
                className="py-2.5 px-4 rounded-xl bg-[#F8F9FA] hover:bg-[#EFF6FF] border border-[#EAECEF] text-xs font-bold text-[#0B0F19] flex items-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#2563EB]" />
                {copiedAppUrl ? 'Copied Direct App Link!' : 'Copy Direct App Link'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[#475569]">
            {/* Android Chrome */}
            <div
              className={`p-5 rounded-2xl border space-y-2.5 ${
                isAndroid
                  ? 'bg-[#EFF6FF]/60 border-[#93C5FD]'
                  : 'bg-[#F8F9FA] border-[#EAECEF]'
              }`}
            >
              <div className="font-extrabold text-sm text-[#0B0F19] flex items-center justify-between">
                <span>1. Android (Google Chrome)</span>
                {isAndroid && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2563EB] text-white font-bold">
                    Your Device
                  </span>
                )}
              </div>
              <ol className="list-decimal list-inside space-y-2 leading-relaxed">
                <li>
                  Open the direct app URL in <strong>Chrome for Android</strong>.
                </li>
                <li>
                  Tap the <strong>three-dot menu</strong>{' '}
                  <span className="inline-flex items-center px-1 py-0.5 rounded bg-white border border-[#E2E8F0]">
                    <MoreVertical className="w-3 h-3" />
                  </span>{' '}
                  in the top-right corner of Chrome.
                </li>
                <li>
                  Tap <strong>Install app</strong> (or <strong>Add to Home screen → Install</strong>).
                </li>
              </ol>
            </div>

            {/* iOS Safari */}
            <div
              className={`p-5 rounded-2xl border space-y-2.5 ${
                isIOS
                  ? 'bg-[#EFF6FF]/60 border-[#93C5FD]'
                  : 'bg-[#F8F9FA] border-[#EAECEF]'
              }`}
            >
              <div className="font-extrabold text-sm text-[#0B0F19] flex items-center justify-between">
                <span>2. iPhone &amp; iPad (Safari)</span>
                {isIOS && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2563EB] text-white font-bold">
                    Your Device
                  </span>
                )}
              </div>
              <ol className="list-decimal list-inside space-y-2 leading-relaxed">
                <li>
                  Open Aethel OS in <strong>Safari</strong> on your iPhone or iPad.
                </li>
                <li>
                  Tap the <strong>Share</strong> button{' '}
                  <span className="inline-flex items-center px-1 py-0.5 rounded bg-white border border-[#E2E8F0]">
                    <Share className="w-3 h-3" />
                  </span>{' '}
                  at the bottom of Safari.
                </li>
                <li>
                  Scroll down and tap <strong>Add to Home Screen</strong>.
                </li>
              </ol>
            </div>

            {/* Desktop Chrome / Edge */}
            <div className="p-5 rounded-2xl border border-[#EAECEF] bg-[#F8F9FA] space-y-2.5">
              <div className="font-extrabold text-sm text-[#0B0F19]">
                3. Desktop (Chrome / Edge)
              </div>
              <ol className="list-decimal list-inside space-y-2 leading-relaxed">
                <li>
                  Click the <strong>Install Aethel OS</strong> button above, or click the install icon in the right side of your browser address bar.
                </li>
                <li>
                  Confirm <strong>Install</strong> to pin Aethel OS to your Windows taskbar or macOS Dock.
                </li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: HELP & OS ARCHITECTURE */}
      {activeTab === 'help-architecture' && (
        <div className="bg-white rounded-3xl border border-[#EAECEF] p-6 sm:p-7 shadow-2xs space-y-6">
          <div className="border-b border-[#EAECEF] pb-4">
            <div className="text-[11px] font-bold uppercase tracking-widest text-[#2563EB] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Aethel OS v4.0 — Unified Agency ERP &amp; Shared Brain
            </div>
            <h2 className="text-lg font-extrabold text-[#0B0F19] mt-0.5">
              System Architecture &amp; Co-Founder Operating Manual
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Built for Vansh Khakole &amp; Krishna Khakole — One Client, One Financial Source of Truth, and One Shared Studio Brain.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-[#475569] leading-relaxed">
            <div className="p-5 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF] space-y-2">
              <div className="font-extrabold text-sm text-[#0B0F19] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#2563EB]" />
                1. 9-Tab Unified Client 360° Workspace
              </div>
              <p>
                Click any client row in <strong>CRM &amp; Pipeline</strong> or search from the top bar to open their 9-tab Client 360° Workspace: Overview, Projects &amp; Approvals, Payments &amp; Invoices, Tasks, Marketing, Domains, Documents &amp; Vault, Communication Log, and Activity Timeline.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF] space-y-2">
              <div className="font-extrabold text-sm text-[#0B0F19] flex items-center gap-2">
                <Brain className="w-4 h-4 text-[#2563EB]" />
                2. Aethel Brain — 5-Component Shared Memory
              </div>
              <p>
                <strong>The Daily Log</strong> records chronological updates; <strong>Brain Dump</strong> captures raw ideas with 1-click conversion into Studio Tasks; <strong>Handover Notes</strong> keeps async founder transitions structured with Read/Acknowledged receipts; <strong>Weekly Recaps</strong> synthesizes executive briefs; and <strong>Aethel Memory</strong> stores permanent pricing, SOPs, and decisions.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF] space-y-2">
              <div className="font-extrabold text-sm text-[#0B0F19] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#059669]" />
                3. Canonical Financial Ledger &amp; 50/50 Co-Founder Split
              </div>
              <p>
                Every payment and expense across CRM, Domains, Meta Ads, and Finance reconciles through the deterministic sync engine:
              </p>
              <ul className="list-disc list-inside space-y-1 font-mono text-[11px] text-[#0B0F19]">
                <li>Confirmed Deal Volume = Collected + Pending Receivables</li>
                <li>Net Profit = Revenue Collected − Operational Expenses</li>
                <li>Founder Payout = 50% Net Profit + Reimbursable Out-of-Pocket</li>
              </ul>
            </div>

            <div className="p-5 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF] space-y-2">
              <div className="font-extrabold text-sm text-[#0B0F19] flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#2563EB]" />
                4. Global Command Palette &amp; Quick Capture (Ctrl+K)
              </div>
              <p>
                Press <kbd className="px-1.5 py-0.5 bg-white border rounded font-mono font-bold">Ctrl+K</kbd> (or click <strong>+ Quick Action</strong>) from any screen to log a new Client Lead, Task, Payment, Expense, Delivery Ticket, Meta Ad Campaign, Domain, Brain Dump idea, or Daily Log update without leaving your current workflow.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
