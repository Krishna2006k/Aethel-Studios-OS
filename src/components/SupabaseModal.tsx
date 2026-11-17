import React, { useState } from 'react';
import {
  X,
  Database,
  Copy,
  Check,
  Download,
  Upload,
  RotateCcw,
  Cloud,
} from 'lucide-react';
import type { AethelDatabaseState } from '../types';
import {
  SUPABASE_COMPLETE_SQL_SCHEMA,
  getSavedSupabaseConfig,
  saveSupabaseConfig,
} from '../services/dbService';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  dbState: AethelDatabaseState;
  syncMode: 'cloud' | 'local';
  onConnectSupabase: () => Promise<void>;
  onImportBackupJson: (newState: AethelDatabaseState) => void;
  onResetFactorySeed: () => Promise<void>;
  onNotify: (msg: string) => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  dbState,
  syncMode,
  onConnectSupabase,
  onImportBackupJson,
  onResetFactorySeed,
  onNotify,
}) => {
  const existing = getSavedSupabaseConfig();
  const [url, setUrl] = useState(existing?.url || '');
  const [anonKey, setAnonKey] = useState(existing?.anonKey || '');
  const [copiedSql, setCopiedSql] = useState(false);

  if (!isOpen) return null;

  const handleSaveConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !anonKey.trim()) {
      saveSupabaseConfig(null);
      await onConnectSupabase();
      onNotify('Disconnected Supabase. Running in Local Storage Mode.');
      return;
    }
    const ok = saveSupabaseConfig({ url, anonKey });
    if (ok) {
      await onConnectSupabase();
      onNotify('Supabase credentials saved & synchronized.');
    } else {
      onNotify('Invalid Supabase URL or Anon Key.');
    }
  };

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_COMPLETE_SQL_SCHEMA);
      setCopiedSql(true);
      onNotify('Copied complete PostgreSQL CREATE TABLE + RLS schema!');
      setTimeout(() => setCopiedSql(false), 2500);
    } catch {
      onNotify('Select the SQL block below to copy.');
    }
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(dbState, null, 2)], {
      type: 'application/json',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `aethel-os-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onNotify('Exported complete Aethel OS JSON backup.');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(String(ev.target?.result)) as AethelDatabaseState;
        if (parsed && Array.isArray(parsed.clients)) {
          onImportBackupJson(parsed);
          onNotify('Restored Aethel OS state from JSON backup!');
          onClose();
        } else {
          onNotify('Invalid backup JSON structure.');
        }
      } catch {
        onNotify('Failed to parse JSON backup file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Supabase Cloud Connection and SQL Schema Setup"
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div className="bg-white border border-[#EAECEF] rounded-t-3xl sm:rounded-3xl w-full max-w-3xl p-4 sm:p-8 shadow-2xl space-y-5 sm:space-y-6 max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 border-b border-[#EAECEF] pb-3.5 sm:pb-4">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#2563EB] flex items-center gap-1.5">
              {syncMode === 'cloud' ? (
                <Cloud className="w-3.5 h-3.5 text-[#059669] shrink-0" />
              ) : (
                <Database className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              )}
              <span>HYBRID SUPABASE CLOUD + LOCAL FALLBACK ENGINE</span>
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-[#0B0F19] mt-0.5">
              Supabase PostgreSQL Connection, SQL Schema &amp; JSON Backup
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Supabase Setup Modal"
            className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Connection Form */}
        <form onSubmit={handleSaveConnection} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            <div>
              <label className="block font-bold text-[#0B0F19] mb-1">
                SUPABASE_URL
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://xyzcompany.supabase.co"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] font-mono text-xs"
              />
            </div>
            <div>
              <label className="block font-bold text-[#0B0F19] mb-1">
                SUPABASE_ANON_KEY
              </label>
              <input
                type="password"
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] font-mono text-xs"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-slate-500">
              Credentials are persisted in <code className="font-mono">localStorage</code> and initialize <code className="font-mono">@supabase/supabase-js</code> dynamically.
            </span>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {existing && (
                <button
                  type="button"
                  onClick={async () => {
                    setUrl('');
                    setAnonKey('');
                    saveSupabaseConfig(null);
                    await onConnectSupabase();
                    onNotify('Switched to Local Mode.');
                  }}
                  className="px-4 py-2 rounded-full border border-rose-200 text-rose-700 font-semibold cursor-pointer"
                >
                  Disconnect Cloud
                </button>
              )}
              <button
                type="submit"
                className="px-5 py-2 rounded-full bg-[#2563EB] hover:bg-blue-700 text-white font-semibold transition-colors cursor-pointer"
              >
                Save &amp; Connect Supabase
              </button>
            </div>
          </div>
        </form>

        {/* 2. 1-Click JSON Export & Import Backup */}
        <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B0F19]">
              1-Click Studio Snapshot Backup (JSON)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Export all 8 modules to a portable JSON file or restore from an existing backup.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportJson}
              className="px-3.5 py-2 rounded-full bg-[#0B0F19] hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Backup JSON</span>
            </button>

            <label className="px-3.5 py-2 rounded-full bg-white border border-[#EAECEF] hover:border-[#0B0F19] text-[#0B0F19] text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Import JSON</span>
              <input
                type="file"
                accept="application/json"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={onResetFactorySeed}
              title="Reset to default Aethel Studios seed dataset"
              className="px-3 py-2 rounded-full bg-white border border-[#EAECEF] hover:border-amber-500 text-slate-600 text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Seed</span>
            </button>
          </div>
        </div>

        {/* 3. Complete PostgreSQL Schema with Copy Button */}
        <div className="space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B0F19]">
                30-Second Supabase SQL Setup Schema
              </h3>
              <p className="text-xs text-slate-500">
                Paste into your Supabase SQL Editor to create all 8 tables with RLS policies enabled.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCopySql}
              className="px-4 py-2 rounded-full bg-[#0D281D] hover:bg-[#059669] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              {copiedSql ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied Complete SQL Schema!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Complete SQL Schema</span>
                </>
              )}
            </button>
          </div>

          <pre className="p-3.5 sm:p-4 rounded-2xl bg-[#0B0F19] text-slate-200 font-mono text-[11px] overflow-x-auto max-h-56 leading-relaxed">
            {SUPABASE_COMPLETE_SQL_SCHEMA}
          </pre>
        </div>
      </div>
    </div>
  );
};
