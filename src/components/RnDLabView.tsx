import React, { useState } from 'react';
import {
  Plus,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  Sparkles,
  FileCode2,
} from 'lucide-react';
import type { PrototypeItem, PrototypeStage } from '../types';

interface RnDLabViewProps {
  prototypes: PrototypeItem[];
  onUpdatePrototype: (p: PrototypeItem) => void;
  onDeletePrototype: (id: string) => void;
  onOpenAddPrototype: () => void;
  onNotify: (msg: string) => void;
}

const PROTOTYPE_STAGES: PrototypeStage[] = [
  'Raw Idea',
  'Working On / In Development',
  'Interactive Prototype',
  'Finished Product / Reusable System',
];

export const RnDLabView: React.FC<RnDLabViewProps> = ({
  prototypes,
  onUpdatePrototype,
  onDeletePrototype,
  onOpenAddPrototype,
  onNotify,
}) => {
  const [stageFilter, setStageFilter] = useState<'ALL' | PrototypeStage>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);

  const filtered = prototypes.filter(
    (p) => stageFilter === 'ALL' || p.stage === stageFilter
  );

  const handleCopyPitchLink = async (proto: PrototypeItem) => {
    const pitchText = `Check out our interactive ${proto.projectName} demo built by Aethel Studios: ${proto.livePrototypeUrl}`;
    try {
      await navigator.clipboard.writeText(pitchText);
      setCopiedId(proto.id);
      onNotify(`Copied WhatsApp pitch link for ${proto.projectName}`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      onNotify(`Pitch URL: ${proto.livePrototypeUrl}`);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="bg-white border border-[#EAECEF] rounded-3xl p-4 sm:p-6 lg:p-8 shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)] space-y-4 sm:space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold tracking-wider uppercase text-[#2563EB] block">
              06 / R&amp;D LAB &amp; PROTOTYPES
            </span>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-[#0B0F19] mt-1">
              Proprietary IP, Vibe-Coding Lab &amp; Pitch Demos
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Reusable industry systems built with Google AI Studio, ChatGPT Codex, Cursor, v0, Bolt &amp; Supabase.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenAddPrototype}
            className="px-4 py-2.5 rounded-full bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors self-start lg:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add R&amp;D Prototype / Idea</span>
          </button>
        </div>

        {/* 4 Stage Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2 border-t border-[#EAECEF]">
          <button
            type="button"
            onClick={() => setStageFilter('ALL')}
            className={`px-3.5 sm:px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              stageFilter === 'ALL'
                ? 'bg-[#0B0F19] text-white'
                : 'bg-[#F8F9FA] text-slate-600 hover:text-[#0B0F19]'
            }`}
          >
            All Stages ({prototypes.length})
          </button>
          {PROTOTYPE_STAGES.map((stage) => {
            const count = prototypes.filter((p) => p.stage === stage).length;
            return (
              <button
                key={stage}
                type="button"
                onClick={() => setStageFilter(stage)}
                className={`px-3.5 sm:px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  stageFilter === stage
                    ? 'bg-[#0B0F19] text-white'
                    : 'bg-[#F8F9FA] text-slate-600 hover:text-[#0B0F19]'
                }`}
              >
                {stage} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Prototypes Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {filtered.map((proto) => {
          const isEditingPrompt = editingPromptId === proto.id;
          return (
            <div
              key={proto.id}
              className="bg-white border border-[#EAECEF] rounded-3xl p-4 sm:p-6 shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)] flex flex-col justify-between space-y-5"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-[#2563EB] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{proto.targetIndustry}</span>
                    </span>
                    <h2 className="text-xl font-bold text-[#0B0F19] mt-1">
                      {proto.projectName}
                    </h2>
                  </div>

                  <select
                    aria-label={`Stage for ${proto.projectName}`}
                    value={proto.stage}
                    onChange={(e) =>
                      onUpdatePrototype({
                        ...proto,
                        stage: e.target.value as PrototypeStage,
                      })
                    }
                    className="px-3 py-1.5 rounded-full bg-[#F8F9FA] border border-[#EAECEF] text-xs font-semibold text-[#0B0F19]"
                  >
                    {PROTOTYPE_STAGES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Core UX Hook */}
                <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF] space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Core UX &amp; Conversion Hook
                  </span>
                  <p className="text-xs sm:text-sm text-[#0B0F19] font-medium leading-relaxed">
                    {proto.coreUxHook}
                  </p>
                </div>

                {/* AI / Dev Stack */}
                <div className="text-xs text-slate-600">
                  <span className="font-semibold text-slate-400 uppercase text-[11px] tracking-wider block mb-1">
                    AI &amp; Engineering Stack
                  </span>
                  <p className="font-medium text-[#0B0F19]">
                    {proto.devStack.join(' · ')}
                  </p>
                </div>

                {/* Live Prototype URL + 1-Click Copy Link for WhatsApp Pitches */}
                <div className="p-3.5 rounded-2xl bg-[#0B0F19] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-[11px] text-[#94A3B8] block">
                      Live Pitch Prototype URL
                    </span>
                    <a
                      href={proto.livePrototypeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs text-emerald-400 hover:underline flex items-center gap-1 truncate mt-0.5"
                    >
                      <span className="truncate">{proto.livePrototypeUrl}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyPitchLink(proto)}
                    className="px-3.5 py-2 rounded-full bg-[#2563EB] hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                  >
                    {copiedId === proto.id ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied Pitch!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Pitch Link</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Saved Master Prompt / Architecture Notes */}
                <div className="space-y-2 pt-2 border-t border-[#EAECEF]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <FileCode2 className="w-3.5 h-3.5 text-[#2563EB]" />
                      <span>Master Prompt &amp; System Architecture Notes</span>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingPromptId(isEditingPrompt ? null : proto.id)
                      }
                      className="text-xs font-semibold text-[#2563EB] hover:underline cursor-pointer"
                    >
                      {isEditingPrompt ? 'Done Editing' : 'Edit Prompt'}
                    </button>
                  </div>

                  {isEditingPrompt ? (
                    <textarea
                      rows={3}
                      aria-label={`Master prompt notes for ${proto.projectName}`}
                      value={proto.masterPromptNotes}
                      onChange={(e) =>
                        onUpdatePrototype({
                          ...proto,
                          masterPromptNotes: e.target.value,
                        })
                      }
                      className="w-full p-3 rounded-xl border border-[#2563EB] bg-[#F8F9FA] font-mono text-xs text-[#0B0F19]"
                    />
                  ) : (
                    <p className="text-xs font-mono text-slate-600 bg-[#F8F9FA] p-3 rounded-xl border border-[#EAECEF] leading-relaxed">
                      {proto.masterPromptNotes}
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-[#EAECEF] flex items-center justify-between text-xs text-slate-500">
                <span>
                  Lead Builder: <strong className="text-[#0B0F19]">{proto.leadBuilder}</strong> · Updated {proto.updatedAt}
                </span>
                <button
                  type="button"
                  onClick={() => onDeletePrototype(proto.id)}
                  aria-label={`Delete prototype ${proto.projectName}`}
                  className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
