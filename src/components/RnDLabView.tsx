import React, { useState } from 'react';
import {
  Plus,
  ExternalLink,
  Copy,
  Check,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import { ClientLead, FounderName, RnDProject } from '../types';

interface RnDLabViewProps {
  projects: RnDProject[];
  clients?: ClientLead[];
  onUpdateProject: (updated: RnDProject) => void;
  onAddProject: (newProject: RnDProject) => void;
  onDeleteProject?: (projectId: string) => void;
  onOpenClient360?: (clientId: string) => void;
}

export const RnDLabView: React.FC<RnDLabViewProps> = ({
  projects,
  clients = [],
  onUpdateProject,
  onAddProject,
  onDeleteProject,
  onOpenClient360,
}) => {
  const [showAdd, setShowAdd] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Create Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<RnDProject['category']>('Sample Template');
  const [targetNiche, setTargetNiche] = useState('Banquet Hall & Wedding Lawns');
  const [leadFounder, setLeadFounder] = useState<FounderName>('Vansh');
  const [previewUrl, setPreviewUrl] = useState('');
  const [techStackStr, setTechStackStr] = useState('React 19, Tailwind v4, WhatsApp API');
  const [impactNotes, setImpactNotes] = useState('');

  // Inline Edit State for existing R&D Prototypes
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<RnDProject | null>(null);
  const [editTechStackStr, setEditTechStackStr] = useState('');

  const handleStartEdit = (proj: RnDProject) => {
    setEditingId(proj.id);
    setEditDraft({ ...proj });
    setEditTechStackStr((proj.techStack || []).join(', '));
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDraft || !editDraft.title.trim()) return;
    onUpdateProject({
      ...editDraft,
      title: editDraft.title.trim(),
      targetNiche: editDraft.targetNiche.trim() || 'General',
      previewUrl: editDraft.previewUrl.trim() || 'https://aethel-demo.vercel.app',
      techStack: editTechStackStr
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      impactNotes: editDraft.impactNotes.trim(),
      updatedAt: new Date().toISOString().slice(0, 10),
    });
    setEditingId(null);
    setEditDraft(null);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAddProject({
      id: `rnd-${Date.now()}`,
      title: title.trim(),
      category,
      targetNiche: targetNiche.trim(),
      status: 'Ready to Pitch',
      leadFounder,
      previewUrl: previewUrl.trim() || 'https://aethel-demo.vercel.app',
      techStack: techStackStr
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      impactNotes: impactNotes.trim(),
      updatedAt: new Date().toISOString().slice(0, 10),
    });
    setTitle('');
    setPreviewUrl('');
    setImpactNotes('');
    setShowAdd(false);
  };

  const handleCopyPitch = async (proj: RnDProject) => {
    const text = `Hi! Here is our interactive ${proj.title} prototype built by Aethel Studios: ${proj.previewUrl}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(proj.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EAECEF] shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)] flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-[#2563EB] mb-1">
            WORKSHOP · R&amp;D LAB &amp; PITCH PROTOTYPES
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B0F19]">
            Proprietary Templates &amp; Niche Accelerators
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
            Reusable 3D virtual tours, clinic booking micro-engines, and pitch demos connected directly to your CRM opportunities.
          </p>
        </div>

        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0B0F19] hover:bg-[#1E293B] text-white text-xs font-bold shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[#60A5FA]" />
          New R&amp;D Prototype
        </button>
      </div>

      {showAdd && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-3xl p-6 border-2 border-[#2563EB]/20 shadow-lg space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Prototype / Accelerator Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Interactive Wedding Lawn Date & Decor Configurator"
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as RnDProject['category'])}
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm bg-white"
              >
                <option value="Sample Template">Sample Template</option>
                <option value="3D / WebGL Experience">3D / WebGL Experience</option>
                <option value="Internal Tool">Internal Tool</option>
                <option value="Ad Creative Concept">Ad Creative Concept</option>
                <option value="Automation Script">Automation Script</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Target Industry Niche
              </label>
              <input
                type="text"
                value={targetNiche}
                onChange={(e) => setTargetNiche(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Live Demo URL
              </label>
              <input
                type="text"
                value={previewUrl}
                onChange={(e) => setPreviewUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Lead Founder
              </label>
              <select
                value={leadFounder}
                onChange={(e) => setLeadFounder(e.target.value as FounderName)}
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm bg-white"
              >
                <option value="Vansh">Vansh</option>
                <option value="Krishna">Krishna</option>
                <option value="Both">Both</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Tech Stack (Comma separated)
              </label>
              <input
                type="text"
                value={techStackStr}
                onChange={(e) => setTechStackStr(e.target.value)}
                placeholder="React 19, Tailwind v4, WhatsApp API"
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Commercial Impact &amp; Pitch Notes
              </label>
              <input
                type="text"
                value={impactNotes}
                onChange={(e) => setImpactNotes(e.target.value)}
                placeholder="How this prototype helps close higher-ticket deals..."
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 rounded-full bg-[#F8F9FA] text-[#64748B] text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-full bg-[#2563EB] text-white text-xs font-bold cursor-pointer"
            >
              Save Prototype
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {projects.map((proj) => {
          const linkedClients = clients.filter((c) =>
            (proj.linkedClientIds || []).includes(c.id)
          );
          const isEditing = editingId === proj.id && editDraft !== null;

          if (isEditing && editDraft) {
            return (
              <form
                key={proj.id}
                onSubmit={handleSaveEdit}
                className="bg-white rounded-3xl p-6 border-2 border-[#2563EB] shadow-lg flex flex-col justify-between space-y-3"
              >
                <div className="flex items-center justify-between border-b border-[#EAECEF] pb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB]">
                    Editing Prototype
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setEditDraft(null);
                    }}
                    className="p-1 rounded-lg text-[#64748B] hover:text-[#0B0F19] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-0.5">
                      Prototype Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={editDraft.title}
                      onChange={(e) =>
                        setEditDraft({ ...editDraft, title: e.target.value })
                      }
                      className="w-full px-3 py-1.5 rounded-xl border border-[#EAECEF] text-xs font-bold text-[#0B0F19]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-0.5">
                        Category
                      </label>
                      <select
                        value={editDraft.category}
                        onChange={(e) =>
                          setEditDraft({
                            ...editDraft,
                            category: e.target.value as RnDProject['category'],
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-xl border border-[#EAECEF] text-xs bg-white"
                      >
                        <option value="Sample Template">Sample Template</option>
                        <option value="3D / WebGL Experience">3D / WebGL Experience</option>
                        <option value="Internal Tool">Internal Tool</option>
                        <option value="Ad Creative Concept">Ad Creative Concept</option>
                        <option value="Automation Script">Automation Script</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-0.5">
                        Status
                      </label>
                      <select
                        value={editDraft.status}
                        onChange={(e) =>
                          setEditDraft({
                            ...editDraft,
                            status: e.target.value as RnDProject['status'],
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-xl border border-[#EAECEF] text-xs bg-white font-bold"
                      >
                        <option value="Ideation">Ideation</option>
                        <option value="Building">Building</option>
                        <option value="Ready to Pitch">Ready to Pitch</option>
                        <option value="Shipped">Shipped</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-0.5">
                        Target Niche
                      </label>
                      <input
                        type="text"
                        value={editDraft.targetNiche}
                        onChange={(e) =>
                          setEditDraft({ ...editDraft, targetNiche: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 rounded-xl border border-[#EAECEF] text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-0.5">
                        Lead Founder
                      </label>
                      <select
                        value={editDraft.leadFounder}
                        onChange={(e) =>
                          setEditDraft({
                            ...editDraft,
                            leadFounder: e.target.value as FounderName,
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-xl border border-[#EAECEF] text-xs bg-white"
                      >
                        <option value="Vansh">Vansh</option>
                        <option value="Krishna">Krishna</option>
                        <option value="Both">Both</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-0.5">
                      Live Preview URL
                    </label>
                    <input
                      type="text"
                      value={editDraft.previewUrl}
                      onChange={(e) =>
                        setEditDraft({ ...editDraft, previewUrl: e.target.value })
                      }
                      className="w-full px-3 py-1.5 rounded-xl border border-[#EAECEF] text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-0.5">
                      Tech Stack (Comma separated)
                    </label>
                    <input
                      type="text"
                      value={editTechStackStr}
                      onChange={(e) => setEditTechStackStr(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-[#EAECEF] text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-0.5">
                      Commercial Impact &amp; Notes
                    </label>
                    <input
                      type="text"
                      value={editDraft.impactNotes}
                      onChange={(e) =>
                        setEditDraft({ ...editDraft, impactNotes: e.target.value })
                      }
                      className="w-full px-3 py-1.5 rounded-xl border border-[#EAECEF] text-xs"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setEditDraft(null);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[#F8F9FA] text-[#64748B] text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-bold cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            );
          }

          return (
            <div
              key={proj.id}
              className="bg-white rounded-3xl p-6 border border-[#EAECEF] shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)] flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-[#2563EB]">
                    {proj.category}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={proj.status}
                      onChange={(e) =>
                        onUpdateProject({
                          ...proj,
                          status: e.target.value as RnDProject['status'],
                        })
                      }
                      aria-label={`Status for ${proj.title}`}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#F8F9FA] border border-[#EAECEF] cursor-pointer"
                    >
                      <option value="Ideation">Ideation</option>
                      <option value="Building">Building</option>
                      <option value="Ready to Pitch">Ready to Pitch</option>
                      <option value="Shipped">Shipped</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => handleStartEdit(proj)}
                      aria-label={`Edit ${proj.title}`}
                      className="px-2.5 py-1 rounded-lg bg-[#F8F9FA] hover:bg-[#EFF6FF] text-[#475569] hover:text-[#2563EB] border border-[#EAECEF] text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Pencil className="w-3 h-3" /> Edit
                    </button>

                    {onDeleteProject && (
                      <button
                        type="button"
                        onClick={() => onDeleteProject(proj.id)}
                        aria-label={`Delete ${proj.title}`}
                        className="p-1.5 rounded-lg text-[#94A3B8] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-extrabold text-[#0B0F19] leading-snug">
                    {proj.title}
                  </h3>
                  <div className="text-xs text-[#64748B] mt-0.5">
                    Target: <strong className="text-[#0B0F19]">{proj.targetNiche}</strong> · Lead:{' '}
                    {proj.leadFounder}
                  </div>
                </div>

                {proj.impactNotes && (
                  <p className="text-xs text-[#475569] leading-relaxed">{proj.impactNotes}</p>
                )}

                <div className="text-[11px] font-mono text-[#64748B]">
                  Stack: {proj.techStack.join(' · ')}
                </div>

                {/* Linked Client Opportunities */}
                {linkedClients.length > 0 && (
                  <div className="pt-2 border-t border-[#F1F5F9]">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] mb-1.5">
                      Pitched / Deployed To CRM Accounts:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {linkedClients.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => onOpenClient360 && onOpenClient360(c.id)}
                          className="text-[11px] font-bold text-[#2563EB] hover:underline bg-[#EFF6FF] px-2.5 py-1 rounded-lg cursor-pointer"
                        >
                          {c.businessName} →
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-between gap-2">
                <button
                  onClick={() => handleCopyPitch(proj)}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#F8F9FA] hover:bg-[#EFF6FF] text-xs font-bold text-[#0B0F19] hover:text-[#2563EB] border border-[#EAECEF] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copiedId === proj.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#059669]" /> Copied Pitch Link
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy WA Pitch
                    </>
                  )}
                </button>
                <a
                  href={proj.previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2 px-3.5 rounded-xl bg-[#0B0F19] text-white text-xs font-bold flex items-center gap-1"
                >
                  Preview <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
