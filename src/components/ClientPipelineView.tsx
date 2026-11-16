import React, { useState } from 'react';
import {
  Search,
  Plus,
  MessageCircle,
  LayoutGrid,
  Table as TableIcon,
  X,
  Trash2,
  Send,
  Phone,
  Calendar,
} from 'lucide-react';
import type {
  ClientLead,
  ClientLocation,
  ClientNiche,
  PipelineStage,
  PlanTier,
  RejectionReason,
  AssignedPerson,
} from '../types';
import {
  formatINR,
  calculatePendingBalance,
  buildWhatsAppUrl,
} from '../utils/calculations';

interface ClientPipelineViewProps {
  clients: ClientLead[];
  selectedClient: ClientLead | null;
  onSelectClient: (c: ClientLead | null) => void;
  onUpdateClient: (c: ClientLead) => void;
  onDeleteClient: (id: string) => void;
  onOpenAddClient: () => void;
}

export const PIPELINE_STAGES: PipelineStage[] = [
  'Query / Lead',
  'In Talks / Demo Shown',
  'Follow-up Scheduled',
  'In Building',
  'Live / Payment Pending',
  'Delivered / Live',
  'Rejected / Dropped',
];

export const CLIENT_NICHES: ClientNiche[] = [
  'Hospital/Clinic',
  'Banquet/Lawns',
  'Stay Hotel',
  'Retail/Electronics',
  'Restaurant/Cafe',
  'Coaching/Institute',
];

export const CLIENT_LOCATIONS: ClientLocation[] = [
  'Pune',
  'Risod',
  'Washim',
  'Maharashtra / Remote',
];

export const REQUIREMENT_SCOPE_SUGGESTIONS: string[] = [
  'Custom Website & Brand Experience',
  '3D Venue Portal & Digital Wedding Invite System',
  'Interactive Suite Explorer & Direct WhatsApp Booking',
  'Single-Screen Clinic Management & Prescription OS',
  'Smart Digital Catalog & Local Meta Ads',
  'Editorial QR Table Menu & Pairing Upsell System',
  'Custom Web App & Admin Dashboard',
];

export const REJECTION_REASONS: Exclude<RejectionReason, ''>[] = [
  'Budget Issue',
  'Ghosted',
  'Delayed',
  'Competitor',
];

export const ClientPipelineView: React.FC<ClientPipelineViewProps> = ({
  clients,
  selectedClient,
  onSelectClient,
  onUpdateClient,
  onDeleteClient,
  onOpenAddClient,
}) => {
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [nicheFilter, setNicheFilter] = useState<string>('ALL');
  const [locationFilter, setLocationFilter] = useState<string>('ALL');
  const [newNoteText, setNewNoteText] = useState('');
  const [noteAuthor, setNoteAuthor] = useState<'Krishna' | 'Vansh'>('Krishna');

  const normalizedClients = clients.map((c) =>
    c.stage === 'Finalized / In Progress' ? { ...c, stage: 'In Building' as PipelineStage } : c
  );

  const filteredClients = normalizedClients.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      c.businessName.toLowerCase().includes(q) ||
      c.contactPerson.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q);
    const matchesNiche = nicheFilter === 'ALL' || c.niche === nicheFilter;
    const matchesLocation = locationFilter === 'ALL' || c.location === locationFilter;
    return matchesSearch && matchesNiche && matchesLocation;
  });

  const handleStageChange = (client: ClientLead, nextStage: PipelineStage) => {
    const updated: ClientLead = {
      ...client,
      stage: nextStage,
      rejectionReason:
        nextStage === 'Rejected / Dropped'
          ? client.rejectionReason || 'Budget Issue'
          : undefined,
    };
    onUpdateClient(updated);
    if (selectedClient?.id === client.id) {
      onSelectClient(updated);
    }
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !newNoteText.trim()) return;
    const now = new Date();
    const timestamp = `${now.toISOString().slice(0, 10)} ${now
      .toTimeString()
      .slice(0, 5)}`;
    const updated: ClientLead = {
      ...selectedClient,
      notesLog: [
        {
          id: `note-${Date.now()}`,
          timestamp,
          author: noteAuthor,
          text: newNoteText.trim(),
        },
        ...selectedClient.notesLog,
      ],
    };
    onUpdateClient(updated);
    onSelectClient(updated);
    setNewNoteText('');
  };

  const totalPipelineValue = filteredClients
    .filter((c) => c.stage !== 'Rejected / Dropped')
    .reduce((sum, c) => sum + c.finalAgreedPrice, 0);

  const inBuildingClients = filteredClients.filter((c) => c.stage === 'In Building');
  const inBuildingPendingSum = inBuildingClients.reduce(
    (sum, c) => sum + calculatePendingBalance(c.finalAgreedPrice, c.advancePaid),
    0
  );

  const livePaymentPendingClients = filteredClients.filter(
    (c) => c.stage === 'Live / Payment Pending'
  );
  const liveRemainingToCollectSum = livePaymentPendingClients.reduce(
    (sum, c) => sum + calculatePendingBalance(c.finalAgreedPrice, c.advancePaid),
    0
  );

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="bg-white border border-[#EAECEF] rounded-3xl p-6 sm:p-8 shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold tracking-wider uppercase text-[#2563EB] block">
              02 / CLIENT PIPELINE &amp; SALES CRM
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B0F19] mt-1">
              Local &amp; Enterprise Deal Pipeline
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Active Pipeline Volume:{' '}
              <span className="font-mono font-bold text-[#0B0F19]">
                {formatINR(totalPipelineValue)}
              </span>{' '}
              across {filteredClients.length} leads in Pune, Risod &amp; Washim.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Kanban vs Table Toggle */}
            <div className="inline-flex items-center p-1 bg-[#F8F9FA] border border-[#EAECEF] rounded-full">
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'kanban'
                    ? 'bg-[#0B0F19] text-white'
                    : 'text-slate-600 hover:text-[#0B0F19]'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Kanban Board</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-[#0B0F19] text-white'
                    : 'text-slate-600 hover:text-[#0B0F19]'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Editorial Table</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onOpenAddClient}
              className="px-4 py-2.5 rounded-full bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Client Lead</span>
            </button>
          </div>
        </div>

        {/* Dedicated Execution & Collection Strip */}
        <div className="mt-6 pt-5 border-t border-[#EAECEF] grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF] flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB] block">
                IN BUILDING STAGE
              </span>
              <span className="text-sm font-bold text-[#0B0F19] mt-0.5 block">
                {inBuildingClients.length} Active Studio Build{inBuildingClients.length === 1 ? '' : 's'}
              </span>
              <span className="text-xs text-slate-500">
                Milestone balance on completion: <strong className="font-mono text-[#0B0F19]">{formatINR(inBuildingPendingSum)}</strong>
              </span>
            </div>
            <span className="font-mono text-2xl font-bold text-[#2563EB]">
              {inBuildingClients.length}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#0B0F19] text-white flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block">
                LIVE — PAYMENT REMAINING TO COLLECT
              </span>
              <span className="font-mono text-xl font-bold text-white mt-0.5 block">
                {formatINR(liveRemainingToCollectSum)} Due
              </span>
              <span className="text-xs text-[#94A3B8]">
                Across {livePaymentPendingClients.length} live client website{livePaymentPendingClients.length === 1 ? '' : 's'}
              </span>
            </div>
            <span className="font-mono text-2xl font-bold text-emerald-400">
              {livePaymentPendingClients.length}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF] flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#059669] block">
                DELIVERED &amp; FULL PAYMENT SETTLED
              </span>
              <span className="text-sm font-bold text-[#0B0F19] mt-0.5 block">
                {filteredClients.filter((c) => c.stage === 'Delivered / Live').length} Completed Account{filteredClients.filter((c) => c.stage === 'Delivered / Live').length === 1 ? '' : 's'}
              </span>
              <span className="text-xs text-slate-500">
                100% invoice collected &amp; handed over
              </span>
            </div>
            <span className="font-mono text-2xl font-bold text-[#059669]">
              {filteredClients.filter((c) => c.stage === 'Delivered / Live').length}
            </span>
          </div>
        </div>

        {/* Search & Niche / Location Filter Bar */}
        <div className="mt-5 pt-5 border-t border-[#EAECEF] grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search business name, owner, or phone..."
              aria-label="Search client pipeline"
              className="w-full pl-10 pr-4 py-2 bg-[#F8F9FA] border border-[#EAECEF] rounded-full text-xs text-[#0B0F19] focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <select
            aria-label="Filter by Business Niche"
            value={nicheFilter}
            onChange={(e) => setNicheFilter(e.target.value)}
            className="px-4 py-2 bg-[#F8F9FA] border border-[#EAECEF] rounded-full text-xs font-medium text-[#0B0F19] focus:outline-none focus:border-[#2563EB]"
          >
            <option value="ALL">All Niches (Hospital, Lawns, Stay, Retail...)</option>
            {CLIENT_NICHES.map((n) => (
              <option key={n} value={n}>
                Niche: {n}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by Location"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="px-4 py-2 bg-[#F8F9FA] border border-[#EAECEF] rounded-full text-xs font-medium text-[#0B0F19] focus:outline-none focus:border-[#2563EB]"
          >
            <option value="ALL">All Locations (Pune, Risod, Washim...)</option>
            {CLIENT_LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>
                Location: {loc}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* View Mode 1: Kanban Board */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
          {PIPELINE_STAGES.map((stage) => {
            const stageClients = filteredClients.filter((c) => c.stage === stage);
            const stageSum = stageClients.reduce((s, c) => s + c.finalAgreedPrice, 0);
            const stageRemainingSum = stageClients.reduce(
              (s, c) => s + calculatePendingBalance(c.finalAgreedPrice, c.advancePaid),
              0
            );
            const isLivePaymentPendingStage = stage === 'Live / Payment Pending';
            const isInBuildingStage = stage === 'In Building';

            return (
              <div
                key={stage}
                className={`bg-white rounded-3xl p-4 shadow-[0_10px_30px_-10px_rgba(11,15,25,0.03)] space-y-3 border ${
                  isLivePaymentPendingStage
                    ? 'border-amber-300/90'
                    : isInBuildingStage
                    ? 'border-[#2563EB]/40'
                    : 'border-[#EAECEF]'
                }`}
              >
                <div className="flex items-center justify-between border-b border-[#EAECEF] pb-2.5">
                  <div>
                    <h2 className="text-xs font-bold text-[#0B0F19]">{stage}</h2>
                    <span className="font-mono text-[11px] text-slate-500">
                      {isLivePaymentPendingStage
                        ? `Remaining to collect: ${formatINR(stageRemainingSum)}`
                        : `Volume: ${formatINR(stageSum)}`}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#2563EB]">
                    {stageClients.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {stageClients.length === 0 ? (
                    <div className="py-8 text-center text-[11px] text-slate-400">
                      No leads in this stage
                    </div>
                  ) : (
                    stageClients.map((client) => {
                      const pending = calculatePendingBalance(
                        client.finalAgreedPrice,
                        client.advancePaid
                      );
                      const waUrl = buildWhatsAppUrl(
                        client.phone,
                        client.stage === 'Live / Payment Pending'
                          ? `Namaskar ${client.contactPerson}, this is Aethel Studios. Your website for ${client.businessName} is live! Sharing a gentle reminder for the remaining balance of ${formatINR(pending)}.`
                          : `Hi ${client.contactPerson}, this is Aethel Studios regarding ${client.businessName}.`
                      );

                      return (
                        <div
                          key={client.id}
                          className="p-3.5 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF] hover:border-[#2563EB]/50 transition-all space-y-2.5"
                        >
                          <div>
                            <button
                              type="button"
                              onClick={() => onSelectClient(client)}
                              className="text-sm font-bold text-[#0B0F19] hover:text-[#2563EB] text-left block leading-snug cursor-pointer"
                            >
                              {client.businessName}
                            </button>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              <span>{client.niche}</span>
                              <span aria-hidden="true"> · </span>
                              <span>{client.location}</span>
                              <span aria-hidden="true"> · </span>
                              <span>Lead: {client.assignedLead}</span>
                            </div>
                          </div>

                          <div className="text-xs text-slate-700 space-y-1">
                            <div className="space-y-0.5 pb-1 border-b border-slate-200/60">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                                Custom Scope / Requirement
                              </span>
                              <span className="font-semibold text-[11px] text-[#0B0F19] block leading-snug">
                                {client.planSelected}
                              </span>
                            </div>
                            <div className="flex items-center justify-between font-mono text-xs">
                              <span className="text-slate-500 font-sans">Agreed:</span>
                              <span className="font-bold text-[#0B0F19]">
                                {formatINR(client.finalAgreedPrice)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between font-mono text-[11px]">
                              <span className="text-slate-500 font-sans">Advance Paid:</span>
                              <span className="text-[#059669] font-semibold">
                                {formatINR(client.advancePaid)}
                              </span>
                            </div>
                            {pending > 0 && client.stage !== 'Rejected / Dropped' && (
                              <div className="flex items-center justify-between font-mono text-xs pt-0.5">
                                <span className="text-slate-700 font-sans font-semibold">
                                  Remaining to Collect:
                                </span>
                                <span className="text-amber-800 font-bold">
                                  {formatINR(pending)}
                                </span>
                              </div>
                            )}
                          </div>

                          {client.stage === 'Live / Payment Pending' && (
                            <div className="text-[11px] font-mono text-amber-900 bg-amber-50 border border-amber-200/80 rounded-xl px-2.5 py-1.5 font-semibold flex items-center justify-between">
                              <span>Site Live · Collect Due</span>
                              <span>{formatINR(pending)}</span>
                            </div>
                          )}

                          {client.stage === 'In Building' && (
                            <div className="text-[11px] font-mono text-[#2563EB] bg-blue-50/70 border border-blue-200/70 rounded-xl px-2.5 py-1.5 font-semibold flex items-center justify-between">
                              <span>In Building Stage</span>
                              <span>Due {formatINR(pending)}</span>
                            </div>
                          )}

                          {client.stage === 'Follow-up Scheduled' && (
                            <div className="text-[11px] font-mono text-[#2563EB] font-semibold flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>Follow-up: {client.nextFollowUpDate}</span>
                            </div>
                          )}

                          {client.stage === 'Rejected / Dropped' && (
                            <div className="text-[11px] text-rose-700 font-semibold">
                              Reason: {client.rejectionReason || 'Budget Issue'}
                            </div>
                          )}

                          <div className="pt-2.5 border-t border-[#EAECEF] space-y-2">
                            <select
                              aria-label={`Change stage for ${client.businessName}`}
                              value={client.stage}
                              onChange={(e) =>
                                handleStageChange(client, e.target.value as PipelineStage)
                              }
                              className="w-full bg-white border border-[#EAECEF] rounded-full px-2.5 py-1 text-[11px] font-medium text-slate-700 focus:outline-none truncate"
                            >
                              {PIPELINE_STAGES.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>

                            <div className="flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => onSelectClient(client)}
                                className="flex-1 py-1 px-2.5 rounded-full bg-white border border-[#EAECEF] hover:border-[#0B0F19] text-[11px] font-semibold text-[#0B0F19] cursor-pointer text-center whitespace-nowrap"
                              >
                                Open Dossier
                              </button>
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Continue on WhatsApp"
                                className="px-2.5 py-1 rounded-full bg-[#D1FAE5] text-[#0D281D] hover:bg-[#059669] hover:text-white text-[11px] font-semibold flex items-center gap-1 transition-colors shrink-0 whitespace-nowrap"
                              >
                                <MessageCircle className="w-3 h-3" />
                                <span>
                                  {client.stage === 'Live / Payment Pending'
                                    ? 'Collect WA'
                                    : 'WA'}
                                </span>
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* View Mode 2: Editorial Table View */
        <div className="bg-white border border-[#EAECEF] rounded-3xl overflow-hidden shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#EAECEF] bg-[#F8F9FA] text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">Business &amp; Contact</th>
                  <th className="py-3.5 px-4">Niche &amp; Location</th>
                  <th className="py-3.5 px-4">Pipeline Stage</th>
                  <th className="py-3.5 px-4">Custom Requirement &amp; Scope</th>
                  <th className="py-3.5 px-4 text-right">Agreed (₹)</th>
                  <th className="py-3.5 px-4 text-right">Pending (₹)</th>
                  <th className="py-3.5 px-4">Next Follow-up</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAECEF] text-xs">
                {filteredClients.map((client) => {
                  const pending = calculatePendingBalance(
                    client.finalAgreedPrice,
                    client.advancePaid
                  );
                  return (
                    <tr
                      key={client.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => onSelectClient(client)}
                          className="font-bold text-[#0B0F19] hover:text-[#2563EB] text-left block cursor-pointer"
                        >
                          {client.businessName}
                        </button>
                        <span className="text-slate-500">
                          {client.contactPerson} · <span className="font-mono">{client.phone}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {client.niche} · {client.location}
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          aria-label={`Pipeline stage for ${client.businessName}`}
                          value={client.stage}
                          onChange={(e) =>
                            handleStageChange(client, e.target.value as PipelineStage)
                          }
                          className="bg-[#F8F9FA] border border-[#EAECEF] rounded-full px-3 py-1 text-xs font-semibold text-[#0B0F19]"
                        >
                          {PIPELINE_STAGES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        {client.stage === 'Rejected / Dropped' && (
                          <span className="block text-[11px] text-rose-600 mt-0.5">
                            Reason: {client.rejectionReason || 'Budget Issue'}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-[#0B0F19]">
                        {client.planSelected}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-[#0B0F19]">
                        {formatINR(client.finalAgreedPrice)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-amber-800">
                        {formatINR(pending)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {client.nextFollowUpDate} ({client.assignedLead})
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onSelectClient(client)}
                            className="px-3 py-1 rounded-full border border-[#EAECEF] hover:border-[#0B0F19] text-xs font-semibold text-[#0B0F19] cursor-pointer"
                          >
                            Drawer
                          </button>
                          <a
                            href={buildWhatsAppUrl(
                              client.phone,
                              `Hi ${client.contactPerson}, reaching out from Aethel Studios regarding ${client.businessName}.`
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 rounded-full bg-[#D1FAE5] text-[#0D281D] hover:bg-[#059669] hover:text-white font-semibold transition-colors"
                          >
                            WhatsApp
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Client Detail & Inline Edit Drawer */}
      {selectedClient && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Client details for ${selectedClient.businessName}`}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end"
        >
          <div className="w-full max-w-xl bg-white h-full overflow-y-auto p-6 sm:p-8 shadow-2xl flex flex-col justify-between space-y-6">
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4 border-b border-[#EAECEF] pb-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB]">
                    CLIENT DOSSIER &amp; CALL LOG
                  </span>
                  <h2 className="text-2xl font-bold text-[#0B0F19] mt-0.5">
                    {selectedClient.businessName}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedClient.contactPerson} · {selectedClient.phone} · {selectedClient.location}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectClient(null)}
                  aria-label="Close Client Drawer"
                  className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 1-Click Continue on WhatsApp */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0B0F19] text-white p-4 rounded-2xl">
                <div>
                  <span className="text-xs text-[#94A3B8] block">Direct Client Channel</span>
                  <span className="font-mono text-sm font-bold">{selectedClient.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${selectedClient.phone.replace(/\s+/g, '')}`}
                    className="px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call</span>
                  </a>
                  <a
                    href={buildWhatsAppUrl(
                      selectedClient.phone,
                      `Namaskar ${selectedClient.contactPerson}, this is ${
                        selectedClient.assignedLead === 'Both'
                          ? 'Vansh & Krishna'
                          : selectedClient.assignedLead
                      } from Aethel Studios regarding ${selectedClient.businessName} (${
                        selectedClient.planSelected
                      }).`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-full bg-[#059669] hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Continue on WhatsApp</span>
                  </a>
                </div>
              </div>

              {/* Inline Editable Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Pipeline Stage
                  </label>
                  <select
                    value={selectedClient.stage}
                    onChange={(e) =>
                      handleStageChange(selectedClient, e.target.value as PipelineStage)
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] text-xs font-semibold text-[#0B0F19]"
                  >
                    {PIPELINE_STAGES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedClient.stage === 'Rejected / Dropped' ? (
                  <div>
                    <label className="block text-xs font-semibold text-rose-600 mb-1">
                      Mandatory Rejection Reason
                    </label>
                    <select
                      value={selectedClient.rejectionReason || 'Budget Issue'}
                      onChange={(e) => {
                        const updated = {
                          ...selectedClient,
                          rejectionReason: e.target.value as RejectionReason,
                        };
                        onUpdateClient(updated);
                        onSelectClient(updated);
                      }}
                      className="w-full px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-900"
                    >
                      {REJECTION_REASONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Custom Requirement &amp; Scope
                    </label>
                    <input
                      type="text"
                      list="aethel-scope-suggestions"
                      value={selectedClient.planSelected}
                      onChange={(e) => {
                        const updated = {
                          ...selectedClient,
                          planSelected: e.target.value,
                        };
                        onUpdateClient(updated);
                        onSelectClient(updated);
                      }}
                      placeholder="Describe client-specific scope & deliverables..."
                      className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] text-xs font-semibold text-[#0B0F19]"
                    />
                    <datalist id="aethel-scope-suggestions">
                      {REQUIREMENT_SCOPE_SUGGESTIONS.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Quoted Price (₹)
                  </label>
                  <input
                    type="number"
                    value={selectedClient.quotedPrice}
                    onChange={(e) => {
                      const updated = {
                        ...selectedClient,
                        quotedPrice: Number(e.target.value) || 0,
                      };
                      onUpdateClient(updated);
                      onSelectClient(updated);
                    }}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] font-mono text-xs text-[#0B0F19]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Final Agreed Price (₹)
                  </label>
                  <input
                    type="number"
                    value={selectedClient.finalAgreedPrice}
                    onChange={(e) => {
                      const updated = {
                        ...selectedClient,
                        finalAgreedPrice: Number(e.target.value) || 0,
                      };
                      onUpdateClient(updated);
                      onSelectClient(updated);
                    }}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] font-mono text-xs font-bold text-[#0B0F19]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Advance Paid (₹)
                  </label>
                  <input
                    type="number"
                    value={selectedClient.advancePaid}
                    onChange={(e) => {
                      const updated = {
                        ...selectedClient,
                        advancePaid: Number(e.target.value) || 0,
                      };
                      onUpdateClient(updated);
                      onSelectClient(updated);
                    }}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] font-mono text-xs font-bold text-[#059669]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Pending Balance (Auto)
                  </label>
                  <div className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-slate-100 font-mono text-xs font-bold text-amber-800">
                    {formatINR(
                      calculatePendingBalance(
                        selectedClient.finalAgreedPrice,
                        selectedClient.advancePaid
                      )
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Assigned Lead
                  </label>
                  <select
                    value={selectedClient.assignedLead}
                    onChange={(e) => {
                      const updated = {
                        ...selectedClient,
                        assignedLead: e.target.value as AssignedPerson,
                      };
                      onUpdateClient(updated);
                      onSelectClient(updated);
                    }}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] text-xs font-semibold text-[#0B0F19]"
                  >
                    <option value="Krishna">Krishna</option>
                    <option value="Vansh">Vansh</option>
                    <option value="Both">Both</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Next Follow-up Date
                  </label>
                  <input
                    type="date"
                    value={selectedClient.nextFollowUpDate}
                    onChange={(e) => {
                      const updated = {
                        ...selectedClient,
                        nextFollowUpDate: e.target.value,
                      };
                      onUpdateClient(updated);
                      onSelectClient(updated);
                    }}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] font-mono text-xs text-[#0B0F19]"
                  />
                </div>
              </div>

              {/* Timestamped Call / Meeting Notes Log */}
              <div className="pt-4 border-t border-[#EAECEF] space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B0F19]">
                  Timestamped Call &amp; Meeting Notes Log
                </h3>

                <form onSubmit={handleAddNote} className="space-y-2">
                  <div className="flex gap-2">
                    <select
                      aria-label="Note Author"
                      value={noteAuthor}
                      onChange={(e) => setNoteAuthor(e.target.value as 'Krishna' | 'Vansh')}
                      className="px-3 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] text-xs font-semibold text-[#0B0F19]"
                    >
                      <option value="Krishna">Krishna</option>
                      <option value="Vansh">Vansh</option>
                    </select>
                    <input
                      type="text"
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      placeholder="Log call summary, client requirement, or price negotiation..."
                      className="flex-1 px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] text-xs text-[#0B0F19] focus:outline-none focus:border-[#2563EB]"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Log</span>
                    </button>
                  </div>
                </form>

                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {selectedClient.notesLog.map((note) => (
                    <div
                      key={note.id}
                      className="p-3 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF] text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-bold text-[#0B0F19]">{note.author}</span>
                        <span className="font-mono">{note.timestamp}</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">{note.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#EAECEF] flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  onDeleteClient(selectedClient.id);
                  onSelectClient(null);
                }}
                className="px-3.5 py-2 rounded-full text-rose-600 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Client</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectClient(null)}
                className="px-5 py-2 rounded-full bg-[#0B0F19] text-white text-xs font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
