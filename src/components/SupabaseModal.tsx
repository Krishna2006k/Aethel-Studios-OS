import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  Copy,
  Check,
  RotateCcw,
  Cloud,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import {
  SUPABASE_COMPLETE_SQL_SCHEMA,
  getSavedSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
} from '../services/dbService';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncMode: 'supabase' | 'local';
  onConnectionChanged: () => Promise<{ mode: 'supabase' | 'local'; error?: string }>;
  onResetDemoData: () => Promise<void>;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  syncMode,
  onConnectionChanged,
  onResetDemoData,
}) => {
  const existing = getSavedSupabaseConfig();
  const [url, setUrl] = useState(existing.url || '');
  const [anonKey, setAnonKey] = useState(existing.anonKey || '');
  const [copiedSql, setCopiedSql] = useState(false);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'success' | 'warning' | 'info'>('info');
  const [isTesting, setIsTesting] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const latest = getSavedSupabaseConfig();
      setUrl(latest.url || '');
      setAnonKey(latest.anonKey || '');
      setConfirmClear(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setStatusNote(null);

    if (!url.trim() || !anonKey.trim()) {
      clearSupabaseConfig();
      await onConnectionChanged();
      setIsTesting(false);
      setStatusType('info');
      setStatusNote(
        'Disconnected Supabase. Running on Unified Studio Server (/api/db) shared across all browsers.'
      );
      return;
    }

    saveSupabaseConfig({ url: url.trim(), anonKey: anonKey.trim() });
    const result = await onConnectionChanged();
    setIsTesting(false);

    if (result.mode === 'supabase' && !result.error) {
      setStatusType('success');
      setStatusNote(
        'Connected & Synchronized with Supabase Cloud! All records are live-synced across Supabase PostgreSQL and the Studio Server.'
      );
    } else {
      setStatusType('warning');
      setStatusNote(
        `Supabase returned: "${result.error || 'Table public.aethel_os_state not found'}". Please click "Copy SQL Schema" below and run it in your Supabase SQL Editor, then click "Save & Sync Connection" again. Meanwhile, your workspace data is safely synced on the Studio Server.`
      );
    }
  };

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_COMPLETE_SQL_SCHEMA);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0B0F19]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-[#EAECEF] shadow-2xl max-w-3xl w-full overflow-hidden my-auto">
        <div className="bg-[#0B0F19] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-[#60A5FA]" />
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#60A5FA] flex items-center gap-2">
                <span>RELATIONAL POSTGRESQL &amp; CLOUD SYNC</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    syncMode === 'supabase'
                      ? 'bg-[#059669]/30 text-[#34D399]'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {syncMode === 'supabase' ? 'CLOUD CONNECTED' : 'STUDIO SERVER MODE'}
                </span>
              </div>
              <h2 className="text-base font-bold">
                Supabase Cloud Persistence &amp; Relational Schema
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Supabase Modal"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                  Supabase Anon Public Key
                </label>
                <input
                  type="password"
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5..."
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-xs font-mono"
                />
              </div>
            </div>

            {statusNote && (
              <div
                className={`p-3.5 rounded-xl border text-xs font-semibold flex items-start gap-2.5 ${
                  statusType === 'success'
                    ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#059669]'
                    : statusType === 'warning'
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                {statusType === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#059669]" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                )}
                <span>{statusNote}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              {!confirmClear ? (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Clear All Workspace Data (Start Empty)
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await onResetDemoData();
                      setConfirmClear(false);
                      setStatusType('info');
                      setStatusNote('Workspace cleared to a clean empty state (0 records).');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                  >
                    Confirm Wipe All Records
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={isTesting}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 text-white text-xs font-bold cursor-pointer"
              >
                <Cloud className="w-3.5 h-3.5" />
                {isTesting ? 'Verifying & Syncing...' : 'Save & Sync Connection'}
              </button>
            </div>
          </form>

          {/* Relational SQL Schema Block */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#0B0F19] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#059669]" />
                PostgreSQL Relational Schema (Run once in Supabase SQL Editor)
              </span>
              <button
                type="button"
                onClick={handleCopySql}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0B0F19] text-white text-xs font-bold cursor-pointer"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#34D399]" /> Copied SQL!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy SQL Schema
                  </>
                )}
              </button>
            </div>

            <pre className="p-4 rounded-2xl bg-[#0B0F19] text-slate-200 font-mono text-[11px] overflow-x-auto max-h-60 leading-relaxed">
              {SUPABASE_COMPLETE_SQL_SCHEMA}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
