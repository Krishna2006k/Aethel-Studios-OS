import React, { useState } from 'react';
import {
  X,
  Database,
  Copy,
  Check,
  RotateCcw,
  Cloud,
  ShieldCheck,
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
  onConnectionChanged: () => Promise<void>;
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

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !anonKey.trim()) {
      clearSupabaseConfig();
      await onConnectionChanged();
      setStatusNote('Disconnected Supabase. Running in Hybrid Local + Express Server Mode.');
      return;
    }
    saveSupabaseConfig({ url: url.trim(), anonKey: anonKey.trim() });
    await onConnectionChanged();
    setStatusNote('Supabase configuration saved & synchronized.');
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
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#60A5FA]">
                RELATIONAL POSTGRESQL &amp; CLOUD SYNC
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
              <div className="p-3 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-xs font-semibold text-[#059669]">
                {statusNote}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={async () => {
                  await onResetDemoData();
                  setStatusNote('Reset database to reconciled Aethel Studios factory dataset.');
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset to Factory Seed Data
              </button>

              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold cursor-pointer"
              >
                <Cloud className="w-3.5 h-3.5" /> Save &amp; Sync Connection
              </button>
            </div>
          </form>

          {/* Relational SQL Schema Block */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#0B0F19] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#059669]" />
                PostgreSQL Relational Schema (Organizations, Clients, Projects, Milestones, Invoices, Payments, RLS)
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
