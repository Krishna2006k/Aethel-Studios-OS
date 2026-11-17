import React, { useState, useEffect } from 'react';
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
  CheckCircle2,
  Save,
} from 'lucide-react';
import type {
  ClientLead,
  ClientLocation,
  ClientNiche,
  PipelineStage,
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
  'Custom Website & Meta Ads 7 days',
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

type StageGroupFilter =
  | 'ALL'
  | 'ACTIVE_SALES'
  | 'EXECUTION_AND_DUE'
  | 'CLOSED';

export const ClientPipelineView: React.FC<ClientPipelineViewProps> = ({
  clients,
  selectedClient,
  onSelectClient,
  onUpdateClient,
  onDeleteClient,
  onOpenAddClient,
}) => {
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [stageGroup, setStageGroup] = useState<StageGroupFilter>('ALL');
  const [mobileFocusedStage, setMobileFocusedStage] = useState<'SWIPE_ALL' | PipelineStage>('SWIPE_ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [nicheFilter, setNicheFilter] = useState<string>('ALL');
  const [locationFilter, setLocationFilter] = useState<string>('ALL');
  const [newNoteText, setNewNoteText] = useState('');
  const [noteAuthor, setNoteAuthor] = useState<'Krishna' | 'Vansh'>('Krishna');

  // Buffered Draft State for the Drawer so typing numbers (e.g. 3000) never fires per-keystroke payment syncs
  const [draftClient, setDraftClient] = useState<ClientLead | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const normalizedClients = clients.map((c) =>
    c.stage === 'Finalized / In Progress'
      ? { ...c, stage: 'In Building' as PipelineStage }
      : c
  );

  // Sync draftClient whenever selectedClient changes or opens
  useEffect(() => {
    if (!selectedClient) {
      setDraftClient(null);
      setHasUnsavedChanges(false);
      return;
    }
    const latest =
      normalizedClients.find((c) => c.id === selectedClient.id) ||
      selectedClient;
    setDraftClient(latest);
    setHasUnsavedChanges(false);
  }, [selectedClient?.id, clients]);

  const filteredClients = normalizedClients.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      c.businessName.toLowerCase().includes(q) ||
      c.contactPerson.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.planSelected.toLowerCase().includes(q);
    const matchesNiche = nicheFilter === 'ALL' || c.niche === nicheFilter;
    const matchesLocation =
      locationFilter === 'ALL' || c.location === locationFilter;
    return matchesSearch && matchesNiche && matchesLocation;
  });

  const visibleStages = PIPELINE_STAGES.filter((st) => {
    if (stageGroup === 'ALL') return true;
    if (stageGroup === 'ACTIVE_SALES') {
      return (
        st === 'Query / Lead' ||
        st === 'In Talks / Demo Shown' ||
        st === 'Follow-up Scheduled'
      );
    }
    if (stageGroup === 'EXECUTION_AND_DUE') {
      return st === 'In Building' || st === 'Live / Payment Pending';
    }
    if (stageGroup === 'CLOSED') {
      return st === 'Delivered / Live' || st === 'Rejected / Dropped';
    }
    return true;
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
    if (draftClient?.id === client.id) {
      setDraftClient(updated);
      setHasUnsavedChanges(false);
    }
  };

  const handleSettleBalanceQuick = (client: ClientLead) => {
    if (client.finalAgreedPrice <= client.advancePaid) return;
    const updated: ClientLead = {
      ...client,
      advancePaid: client.finalAgreedPrice,
      stage:
        client.stage === 'Live / Payment Pending'
          ? 'Delivered / Live'
          : client.stage,
    };
    onUpdateClient(updated);
    if (draftClient?.id === client.id) {
      setDraftClient(updated);
      setHasUnsavedChanges(false);
    }
  };

  const handlePatchDraft = (patch: Partial<ClientLead>) => {
    if (!draftClient) return;
    setDraftClient((prev) => (prev ? { ...prev, ...patch } : null));
    setHasUnsavedChanges(true);
  };

  const handleSaveDraftToDatabase = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!draftClient) return;
    onUpdateClient(draftClient);
    setHasUnsavedChanges(false);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftClient || !newNoteText.trim()) return;
    const now = new Date();
    const timestamp = `${now.toISOString().slice(0, 10)} ${now
      .toTimeString()
      .slice(0, 5)}`;
    const updated: ClientLead = {
      ...draftClient,
      notesLog: [
        {
          id: `note-${Date.now()}`,
          timestamp,
          author: noteAuthor,
          text: newNoteText.trim(),
        },
        ...draftClient.notesLog,
      ],
    };
    setDraftClient(updated);
    onUpdateClient(updated);
    setHasUnsavedChanges(false);
    setNewNoteText('');
  };

  const handleDeleteNote = (noteId: string) => {
    if (!draftClient) return;
    const updated: ClientLead = {
      ...draftClient,
      notesLog: draftClient.notesLog.filter((n) => n.id !== noteId),
    };
    setDraftClient(updated);
    onUpdateClient(updated);
    setHasUnsavedChanges(false);
  };

  const totalPipelineValue = filteredClients
    .filter((c) => c.stage !== 'Rejected / Dropped')
    .reduce((sum, c) => sum + c.finalAgreedPrice, 0);

  const totalAdvanceCollected = filteredClients
    .filter((c) => c.stage !== 'Rejected / Dropped')
    .reduce((sum, c) => sum + c.advancePaid, 0);

  const inBuildingClients = filteredClients.filter(
    (c) => c.stage === 'In Building'
  );
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

  const getStageAccentClasses = (stage: PipelineStage) => {
    switch (stage) {
      case 'Live / Payment Pending':
        return 'border-t-4 border-t-amber-500 bg-amber-50/30';
      case 'In Building':
        return 'border-t-4 border-t-[#2563EB] bg-blue-50/20';
      case 'Delivered / Live':
        return 'border-t-4 border-t-[#059669] bg-emerald-50/20';
      case 'Rejected / Dropped':
        return 'border-t-4 border-t-rose-400 bg-rose-50/20';
      default:
        return 'border-t-4 border-t-slate-300 bg-[#F8F9FA]';
    }
  };

  const shortStageName = (stage: PipelineStage) => {
    switch (stage) {
      case 'Query / Lead':
        return 'Query';
      case 'In Talks / Demo Shown':
        return 'In Talks';
      case 'Follow-up Scheduled':
        return 'Follow-up';
      case 'In Building':
        return 'In Building';
      case 'Live / Payment Pending':
        return 'Live Due';
      case 'Delivered / Live':
        return 'Delivered';
      case 'Rejected / Dropped':
        return 'Rejected';
      default:
        return stage;
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Module Header */}
      <div className="bg-white border border-[#EAECEF] rounded-3xl p-4 sm:p-6 lg:p-8 shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold tracking-wider uppercase text-[#2563EB] block">
              02 / CLIENT PIPELINE &amp; SALES CRM
            </span>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-[#0B0F19] mt-1">
              Local &amp; Enterprise Deal Pipeline
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
              Active Pipeline Volume:{' '}
              <span className="font-mono font-bold text-[#0B0F19]">
                {formatINR(totalPipelineValue)}
              </span>{' '}
              · Advance Collected (Synced to Finance):{' '}
              <span className="font-mono font-bold text-[#059669]">
                {formatINR(totalAdvanceCollected)}
              </span>{' '}
              across {filteredClients.length} accounts.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2.5 sm:gap-3">
            {/* Kanban vs Table Toggle */}
            <div className="inline-flex items-center p-1 bg-[#F8F9FA] border border-[#EAECEF] rounded-full">
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'kanban'
                    ? 'bg-[#0B0F19] text-white'
                    : 'text-slate-600 hover:text-[#0B0F19]'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Kanban</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-[#0B0F19] text-white'
                    : 'text-slate-600 hover:text-[#0B0F19]'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onOpenAddClient}
              className="px-4 py-2 sm:py-2.5 rounded-full bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Client Lead</span>
            </button>
          </div>
        </div>

        {/* Dedicated Execution & Collection Strip */}
        <div className="mt-5 pt-5 border-t border-[#EAECEF] grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF] flex items-center justify-between gap-2">
            <div>
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#2563EB] block">
                IN BUILDING STAGE
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#0B0F19] mt-0.5 block">
                {inBuildingClients.length} Active Studio Build
                {inBuildingClients.length === 1 ? '' : 's'}
              </span>
              <span className="text-[11px] sm:text-xs text-slate-500">
                Milestone balance on completion:{' '}
                <strong className="font-mono text-[#0B0F19]">
                  {formatINR(inBuildingPendingSum)}
                </strong>
              </span>
            </div>
            <span className="font-mono text-xl sm:text-2xl font-bold text-[#2563EB]">
              {inBuildingClients.length}
            </span>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0B0F19] text-white flex items-center justify-between gap-2">
            <div>
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-400 block">
                LIVE — PAYMENT REMAINING TO COLLECT
              </span>
              <span className="font-mono text-lg sm:text-xl font-bold text-white mt-0.5 block">
                {formatINR(liveRemainingToCollectSum)} Due
              </span>
              <span className="text-[11px] sm:text-xs text-[#94A3B8]">
                Across {livePaymentPendingClients.length} live client website
                {livePaymentPendingClients.length === 1 ? '' : 's'}
              </span>
            </div>
            <span className="font-mono text-xl sm:text-2xl font-bold text-emerald-400">
              {livePaymentPendingClients.length}
            </span>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF] flex items-center justify-between gap-2">
            <div>
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#059669] block">
                DELIVERED &amp; FULL PAYMENT SETTLED
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#0B0F19] mt-0.5 block">
                {
                  filteredClients.filter((c) => c.stage === 'Delivered / Live')
                    .length
                }{' '}
                Completed Account
                {filteredClients.filter((c) => c.stage === 'Delivered / Live')
                  .length === 1
                  ? ''
                  : 's'}
              </span>
              <span className="text-[11px] sm:text-xs text-slate-500">
                100% invoice collected &amp; synced to Finance
              </span>
            </div>
            <span className="font-mono text-xl sm:text-2xl font-bold text-[#059669]">
              {
                filteredClients.filter((c) => c.stage === 'Delivered / Live')
                  .length
              }
            </span>
          </div>
        </div>

        {/* Search, Niche, Location & Stage Group Filter Bar */}
        <div className="mt-4 sm:mt-5 pt-4 sm:pt-5 border-t border-[#EAECEF] space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search business name, owner, scope, or phone..."
                aria-label="Search client pipeline"
                className="w-full pl-10 pr-4 py-2 bg-[#F8F9FA] border border-[#EAECEF] rounded-full text-xs text-[#0B0F19] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <select
              aria-label="Filter by Business Niche"
              value={nicheFilter}
              onChange={(e) => setNicheFilter(e.target.value)}
              className="w-full px-4 py-2 bg-[#F8F9FA] border border-[#EAECEF] rounded-full text-xs font-medium text-[#0B0F19] focus:outline-none focus:border-[#2563EB]"
            >
              <option value="ALL">
                All Niches (Hospital, Lawns, Stay, Retail...)
              </option>
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
              className="w-full px-4 py-2 bg-[#F8F9FA] border border-[#EAECEF] rounded-full text-xs font-medium text-[#0B0F19] focus:outline-none focus:border-[#2563EB]"
            >
              <option value="ALL">
                All Locations (Pune, Risod, Washim...)
              </option>
              {CLIENT_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  Location: {loc}
                </option>
              ))}
            </select>
          </div>

          {viewMode === 'kanban' && (
            <div className="space-y-2 pt-1">
              {/* Desktop/Tablet Group Filter */}
              <div className="hidden md:flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {[
                    { id: 'ALL', label: 'All 7 Pipeline Stages' },
                    {
                      id: 'EXECUTION_AND_DUE',
                      label: `In Building & Payment Due (${
                        inBuildingClients.length + livePaymentPendingClients.length
                      })`,
                    },
                    {
                      id: 'ACTIVE_SALES',
                      label: 'Active Sales & Follow-ups (3 Stages)',
                    },
                    {
                      id: 'CLOSED',
                      label: 'Delivered & Rejected (2 Stages)',
                    },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setStageGroup(tab.id as StageGroupFilter)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                        stageGroup === tab.id
                          ? 'bg-[#0B0F19] text-white'
                          : 'bg-[#F8F9FA] border border-[#EAECEF] text-slate-600 hover:text-[#0B0F19]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-slate-400 hidden xl:inline">
                  Scroll horizontally to view all 7 swimlanes side-by-side &rarr;
                </span>
              </div>

              {/* Mobile Single-Stage Quick Selector (Allows 1-Tap Stage Focus or Smooth Swipe on Phones) */}
              <div className="md:hidden space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-500 px-0.5">
                  <span className="font-semibold text-[#0B0F19]">
                    Mobile Stage Switcher:
                  </span>
                  <span>
                    {mobileFocusedStage === 'SWIPE_ALL'
                      ? 'Swipe columns or tap a stage'
                      : 'Showing full-width stage'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                  <button
                    type="button"
                    onClick={() => setMobileFocusedStage('SWIPE_ALL')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                      mobileFocusedStage === 'SWIPE_ALL'
                        ? 'bg-[#0B0F19] text-white'
                        : 'bg-[#F8F9FA] border border-[#EAECEF] text-slate-600'
                    }`}
                  >
                    Swipe All ({filteredClients.length})
                  </button>
                  {PIPELINE_STAGES.map((st) => {
                    const count = filteredClients.filter((c) => c.stage === st).length;
                    const isActive = mobileFocusedStage === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setMobileFocusedStage(st)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                          isActive
                            ? 'bg-[#2563EB] text-white'
                            : 'bg-[#F8F9FA] border border-[#EAECEF] text-slate-600'
                        }`}
                      >
                        {shortStageName(st)} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* View Mode 1: Aligned Horizontal Swimlane Kanban Board */}
      {viewMode === 'kanban' ? (
        <div
          className={
            mobileFocusedStage !== 'SWIPE_ALL'
              ? 'grid grid-cols-1 gap-4 md:flex md:gap-4 md:overflow-x-auto md:pb-4 md:items-stretch'
              : stageGroup === 'ALL'
              ? 'flex gap-3.5 sm:gap-4 overflow-x-auto no-scrollbar pb-4 items-stretch snap-x snap-mandatory'
              : visibleStages.length === 2
              ? 'grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 items-stretch'
              : 'grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 items-stretch'
          }
        >
          {visibleStages.map((stage) => {
            const isHiddenOnMobile =
              mobileFocusedStage !== 'SWIPE_ALL' && mobileFocusedStage !== stage;

            const stageClients = filteredClients.filter(
              (c) => c.stage === stage
            );
            const stageSum = stageClients.reduce(
              (s, c) => s + c.finalAgreedPrice,
              0
            );
            const stageRemainingSum = stageClients.reduce(
              (s, c) =>
                s + calculatePendingBalance(c.finalAgreedPrice, c.advancePaid),
              0
            );
            const isLivePaymentPendingStage =
              stage === 'Live / Payment Pending';

            return (
              <div
                key={stage}
                className={`${isHiddenOnMobile ? 'hidden md:flex' : 'flex'} ${
                  mobileFocusedStage === stage
                    ? 'w-full md:w-[335px] md:shrink-0'
                    : stageGroup === 'ALL'
                    ? 'w-[85vw] max-w-[330px] sm:w-[335px] shrink-0 snap-center sm:snap-start'
                    : 'w-full'
                } rounded-3xl p-3.5 sm:p-4 border border-[#EAECEF] shadow-[0_10px_30px_-10px_rgba(11,15,25,0.03)] flex-col justify-between ${getStageAccentClasses(
                  stage
                )}`}
              >
                <div className="space-y-3">
                  {/* Column Header */}
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-3 px-1">
                    <div>
                      <h2 className="text-xs font-bold uppercase tracking-wider text-[#0B0F19]">
                        {stage}
                      </h2>
                      <span className="font-mono text-[11px] text-slate-500 block mt-0.5">
                        {isLivePaymentPendingStage
                          ? `Remaining Due: ${formatINR(stageRemainingSum)}`
                          : `Stage Volume: ${formatINR(stageSum)}`}
                      </span>
                    </div>
                    <span className="w-6 h-6 rounded-full bg-white border border-[#EAECEF] font-mono text-xs font-bold text-[#2563EB] flex items-center justify-center shadow-2xs">
                      {stageClients.length}
                    </span>
                  </div>

                  {/* Cards List */}
                  <div className="space-y-3 min-h-[200px] sm:min-h-[260px]">
                    {stageClients.length === 0 ? (
                      <div className="h-[180px] sm:h-[220px] rounded-2xl border border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-400">
                        No accounts in {stage}
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
                            className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#EAECEF] hover:border-[#2563EB]/60 shadow-[0_4px_16px_-6px_rgba(11,15,25,0.05)] transition-all space-y-3"
                          >
                            {/* Top Row: Business Title + Delete Button */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
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
                                  <span className="font-semibold text-slate-700">
                                    {client.assignedLead}
                                  </span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  if (selectedClient?.id === client.id) {
                                    onSelectClient(null);
                                  }
                                  onDeleteClient(client.id);
                                }}
                                aria-label={`Delete client ${client.businessName}`}
                                title={`Delete ${client.businessName}`}
                                className="p-1.5 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Custom Scope Box */}
                            <div className="p-2.5 rounded-xl bg-[#F8F9FA] border border-[#EAECEF]">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                Custom Scope / Requirement
                              </span>
                              <span className="font-semibold text-xs text-[#0B0F19] block mt-0.5 leading-snug">
                                {client.planSelected}
                              </span>
                            </div>

                            {/* Crisp 3-Column Financial Metric Strip */}
                            <div className="grid grid-cols-3 gap-1.5 p-2.5 rounded-xl bg-[#F8F9FA] border border-[#EAECEF] text-center">
                              <div>
                                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                                  Agreed
                                </span>
                                <span className="font-mono text-xs font-bold text-[#0B0F19]">
                                  {formatINR(client.finalAgreedPrice)}
                                </span>
                              </div>
                              <div className="border-x border-[#EAECEF]">
                                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                                  Paid
                                </span>
                                <span className="font-mono text-xs font-bold text-[#059669]">
                                  {formatINR(client.advancePaid)}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                                  Remaining
                                </span>
                                <span
                                  className={`font-mono text-xs font-bold ${
                                    pending > 0
                                      ? 'text-amber-700'
                                      : 'text-[#059669]'
                                  }`}
                                >
                                  {pending > 0 ? formatINR(pending) : 'Settled'}
                                </span>
                              </div>
                            </div>

                            {/* Contextual Status Banner */}
                            {client.stage === 'Live / Payment Pending' &&
                              pending > 0 && (
                                <div className="bg-amber-50 border border-amber-200/90 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
                                  <span className="text-[11px] font-mono text-amber-900 font-bold">
                                    Due: {formatINR(pending)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleSettleBalanceQuick(client)
                                    }
                                    className="px-2.5 py-1 rounded-full bg-[#059669] hover:bg-emerald-600 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                                    title="Mark full balance collected & sync to Studio Finance"
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Mark Paid</span>
                                  </button>
                                </div>
                              )}

                            {client.stage === 'Follow-up Scheduled' && (
                              <div className="text-[11px] font-mono text-[#2563EB] font-semibold flex items-center gap-1.5 px-1">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>Follow-up: {client.nextFollowUpDate}</span>
                              </div>
                            )}

                            {client.stage === 'Rejected / Dropped' && (
                              <div className="text-[11px] text-rose-700 font-semibold px-1">
                                Reason: {client.rejectionReason || 'Budget Issue'}
                              </div>
                            )}

                            {/* Card Footer Controls */}
                            <div className="pt-2 border-t border-[#EAECEF] space-y-2">
                              <select
                                aria-label={`Change stage for ${client.businessName}`}
                                value={client.stage}
                                onChange={(e) =>
                                  handleStageChange(
                                    client,
                                    e.target.value as PipelineStage
                                  )
                                }
                                className="w-full bg-[#F8F9FA] border border-[#EAECEF] rounded-full px-3 py-1.5 text-[11px] font-semibold text-[#0B0F19] focus:outline-none focus:border-[#2563EB] truncate"
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
                                  className="flex-1 py-1.5 px-3 rounded-full bg-white border border-[#EAECEF] hover:border-[#0B0F19] text-[11px] font-semibold text-[#0B0F19] cursor-pointer text-center whitespace-nowrap"
                                >
                                  Edit / Dossier
                                </button>
                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Continue on WhatsApp"
                                  className="px-3 py-1.5 rounded-full bg-[#D1FAE5] text-[#0D281D] hover:bg-[#059669] hover:text-white text-[11px] font-semibold flex items-center gap-1 transition-colors shrink-0 whitespace-nowrap"
                                >
                                  <MessageCircle className="w-3 h-3" />
                                  <span>
                                    {client.stage === 'Live / Payment Pending'
                                      ? 'Collect WA'
                                      : 'WhatsApp'}
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
              </div>
            );
          })}
        </div>
      ) : (
        /* View Mode 2: Editorial Table View (Mobile Card Stack + Desktop Table) */
        <div className="space-y-4">
          {/* Mobile Card List (md:hidden) */}
          <div className="md:hidden space-y-3">
            {filteredClients.map((client) => {
              const pending = calculatePendingBalance(
                client.finalAgreedPrice,
                client.advancePaid
              );
              return (
                <div
                  key={client.id}
                  className="bg-white border border-[#EAECEF] rounded-2xl p-4 shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <button
                        type="button"
                        onClick={() => onSelectClient(client)}
                        className="text-sm font-bold text-[#0B0F19] hover:text-[#2563EB] text-left block"
                      >
                        {client.businessName}
                      </button>
                      <span className="text-xs text-slate-500 block">
                        {client.contactPerson} · <span className="font-mono">{client.phone}</span>
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        {client.niche} · {client.location} · Lead: {client.assignedLead}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedClient?.id === client.id) {
                          onSelectClient(null);
                        }
                        onDeleteClient(client.id);
                      }}
                      aria-label={`Delete row ${client.businessName}`}
                      className="p-1.5 rounded-full border border-[#EAECEF] text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-xs font-medium text-[#0B0F19] bg-[#F8F9FA] p-2.5 rounded-xl border border-[#EAECEF]">
                    {client.planSelected}
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 p-2.5 rounded-xl bg-[#F8F9FA] border border-[#EAECEF] text-center text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Agreed</span>
                      <span className="font-mono font-bold text-[#0B0F19]">
                        {formatINR(client.finalAgreedPrice)}
                      </span>
                    </div>
                    <div className="border-x border-[#EAECEF]">
                      <span className="text-[10px] text-slate-400 uppercase block">Paid</span>
                      <span className="font-mono font-bold text-[#059669]">
                        {formatINR(client.advancePaid)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Due</span>
                      <span className="font-mono font-bold text-amber-800">
                        {formatINR(pending)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <select
                      aria-label={`Pipeline stage for ${client.businessName}`}
                      value={client.stage}
                      onChange={(e) =>
                        handleStageChange(
                          client,
                          e.target.value as PipelineStage
                        )
                      }
                      className="w-full bg-[#F8F9FA] border border-[#EAECEF] rounded-full px-3 py-1.5 text-xs font-semibold text-[#0B0F19]"
                    >
                      {PIPELINE_STAGES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-2">
                      {pending > 0 && client.stage === 'Live / Payment Pending' && (
                        <button
                          type="button"
                          onClick={() => handleSettleBalanceQuick(client)}
                          className="px-3 py-1.5 rounded-full bg-[#059669] text-white text-xs font-semibold"
                        >
                          Mark Paid
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onSelectClient(client)}
                        className="flex-1 py-1.5 px-3 rounded-full border border-[#EAECEF] text-xs font-semibold text-[#0B0F19]"
                      >
                        Edit Dossier
                      </button>
                      <a
                        href={buildWhatsAppUrl(
                          client.phone,
                          `Hi ${client.contactPerson}, reaching out from Aethel Studios regarding ${client.businessName}.`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 rounded-full bg-[#D1FAE5] text-[#0D281D] text-xs font-semibold"
                      >
                        WhatsApp
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Editorial Table (hidden md:block) */}
          <div className="hidden md:block bg-white border border-[#EAECEF] rounded-3xl overflow-hidden shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#EAECEF] bg-[#F8F9FA] text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4">Business &amp; Contact</th>
                    <th className="py-3.5 px-4">Niche &amp; Location</th>
                    <th className="py-3.5 px-4">Pipeline Stage</th>
                    <th className="py-3.5 px-4">Custom Requirement &amp; Scope</th>
                    <th className="py-3.5 px-4 text-right">Agreed (₹)</th>
                    <th className="py-3.5 px-4 text-right">Advance Paid (₹)</th>
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
                            {client.contactPerson} ·{' '}
                            <span className="font-mono">{client.phone}</span>
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
                              handleStageChange(
                                client,
                                e.target.value as PipelineStage
                              )
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
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-[#059669]">
                          {formatINR(client.advancePaid)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-amber-800">
                          {formatINR(pending)}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          {client.nextFollowUpDate} ({client.assignedLead})
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {pending > 0 &&
                              client.stage === 'Live / Payment Pending' && (
                                <button
                                  type="button"
                                  onClick={() => handleSettleBalanceQuick(client)}
                                  className="px-2.5 py-1 rounded-full bg-[#059669] hover:bg-emerald-600 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                                >
                                  Mark Paid
                                </button>
                              )}
                            <button
                              type="button"
                              onClick={() => onSelectClient(client)}
                              className="px-3 py-1 rounded-full border border-[#EAECEF] hover:border-[#0B0F19] text-xs font-semibold text-[#0B0F19] cursor-pointer"
                            >
                              Edit
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
                            <button
                              type="button"
                              onClick={() => {
                                if (selectedClient?.id === client.id) {
                                  onSelectClient(null);
                                }
                                onDeleteClient(client.id);
                              }}
                              aria-label={`Delete row ${client.businessName}`}
                              title={`Delete ${client.businessName}`}
                              className="p-1.5 rounded-full border border-[#EAECEF] text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Client Detail & Buffered Sync Drawer */}
      {draftClient && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Client details for ${draftClient.businessName}`}
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex justify-end"
        >
          <div className="w-full max-w-xl bg-white h-full overflow-y-auto shadow-2xl flex flex-col justify-between">
            {/* Sticky Top Header */}
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md px-4 sm:px-8 py-4 border-b border-[#EAECEF] flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#2563EB] block">
                  CLIENT DOSSIER · RELATIONAL SYNC ENGINE
                </span>
                <h2 className="text-lg sm:text-2xl font-bold text-[#0B0F19] truncate">
                  {draftClient.businessName}
                </h2>
                <p className="text-xs text-slate-500 truncate">
                  {draftClient.contactPerson} · {draftClient.phone} ·{' '}
                  {draftClient.location}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onSelectClient(null)}
                aria-label="Close Client Drawer"
                className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-8 space-y-6 flex-1">
              <form
                id="client-dossier-form"
                onSubmit={handleSaveDraftToDatabase}
                className="space-y-6"
              >
                {/* 1-Click Continue on WhatsApp + Quick Balance Settlement */}
                <div className="bg-[#0B0F19] text-white p-4 rounded-2xl space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="text-xs text-[#94A3B8] block">
                        Direct Client Channel
                      </span>
                      <span className="font-mono text-sm font-bold">
                        {draftClient.phone}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${draftClient.phone.replace(/\s+/g, '')}`}
                        className="px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call</span>
                      </a>
                      <a
                        href={buildWhatsAppUrl(
                          draftClient.phone,
                          `Namaskar ${draftClient.contactPerson}, this is ${
                            draftClient.assignedLead === 'Both'
                              ? 'Vansh & Krishna'
                              : draftClient.assignedLead
                          } from Aethel Studios regarding ${
                            draftClient.businessName
                          } (${draftClient.planSelected}).`
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

                  {calculatePendingBalance(
                    draftClient.finalAgreedPrice,
                    draftClient.advancePaid
                  ) > 0 &&
                    draftClient.stage !== 'Rejected / Dropped' && (
                      <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <span className="text-xs text-amber-300 font-mono">
                          Remaining Due:{' '}
                          {formatINR(
                            calculatePendingBalance(
                              draftClient.finalAgreedPrice,
                              draftClient.advancePaid
                            )
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleSettleBalanceQuick(draftClient)}
                          className="px-3.5 py-1.5 rounded-full bg-amber-400 hover:bg-amber-300 text-[#0B0F19] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>
                            Collect Full Balance &amp; Sync to Studio Finance
                          </span>
                        </button>
                      </div>
                    )}
                </div>

                {/* Section 1: Core Identity & Contact Fields */}
                <div className="space-y-3">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB]">
                    1. Business Identity &amp; Contact Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Business / Account Name
                      </label>
                      <input
                        type="text"
                        aria-label="Business Name"
                        value={draftClient.businessName}
                        onChange={(e) =>
                          handlePatchDraft({ businessName: e.target.value })
                        }
                        className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] text-xs font-bold text-[#0B0F19]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Contact Person / Owner
                      </label>
                      <input
                        type="text"
                        aria-label="Contact Person"
                        value={draftClient.contactPerson}
                        onChange={(e) =>
                          handlePatchDraft({ contactPerson: e.target.value })
                        }
                        className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] text-xs font-semibold text-[#0B0F19]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        WhatsApp Phone (+91)
                      </label>
                      <input
                        type="text"
                        aria-label="WhatsApp Phone"
                        value={draftClient.phone}
                        onChange={(e) =>
                          handlePatchDraft({ phone: e.target.value })
                        }
                        className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] font-mono text-xs font-semibold text-[#0B0F19]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Business Niche
                      </label>
                      <select
                        aria-label="Business Niche"
                        value={draftClient.niche}
                        onChange={(e) =>
                          handlePatchDraft({
                            niche: e.target.value as ClientNiche,
                          })
                        }
                        className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] text-xs font-semibold text-[#0B0F19]"
                      >
                        {CLIENT_NICHES.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        City / Location
                      </label>
                      <select
                        aria-label="Client Location"
                        value={draftClient.location}
                        onChange={(e) =>
                          handlePatchDraft({
                            location: e.target.value as ClientLocation,
                          })
                        }
                        className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] text-xs font-semibold text-[#0B0F19]"
                      >
                        {CLIENT_LOCATIONS.map((loc) => (
                          <option key={loc} value={loc}>
                            {loc}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 2: Stage, Custom Scope & Commercial Financials */}
                <div className="space-y-3 pt-4 border-t border-[#EAECEF]">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB]">
                    2. Pipeline Stage, Custom Scope &amp; Financial Sync
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Pipeline Stage
                      </label>
                      <select
                        aria-label="Drawer Pipeline Stage"
                        value={draftClient.stage}
                        onChange={(e) => {
                          const nextStage = e.target.value as PipelineStage;
                          handlePatchDraft({
                            stage: nextStage,
                            rejectionReason:
                              nextStage === 'Rejected / Dropped'
                                ? draftClient.rejectionReason || 'Budget Issue'
                                : undefined,
                          });
                        }}
                        className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] text-xs font-semibold text-[#0B0F19]"
                      >
                        {PIPELINE_STAGES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>

                    {draftClient.stage === 'Rejected / Dropped' ? (
                      <div>
                        <label className="block text-xs font-semibold text-rose-600 mb-1">
                          Mandatory Rejection Reason
                        </label>
                        <select
                          value={draftClient.rejectionReason || 'Budget Issue'}
                          onChange={(e) =>
                            handlePatchDraft({
                              rejectionReason: e.target.value as RejectionReason,
                            })
                          }
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
                          aria-label="Custom Requirement and Scope"
                          value={draftClient.planSelected}
                          onChange={(e) =>
                            handlePatchDraft({ planSelected: e.target.value })
                          }
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
                        aria-label="Quoted Price"
                        value={draftClient.quotedPrice}
                        onChange={(e) =>
                          handlePatchDraft({
                            quotedPrice: Number(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] font-mono text-xs text-[#0B0F19]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Final Agreed Price (₹)
                      </label>
                      <input
                        type="number"
                        aria-label="Final Agreed Price"
                        value={draftClient.finalAgreedPrice}
                        onChange={(e) =>
                          handlePatchDraft({
                            finalAgreedPrice: Number(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] font-mono text-xs font-bold text-[#0B0F19]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Advance / Total Paid (₹) · Syncs to Finance
                      </label>
                      <input
                        type="number"
                        aria-label="Advance Paid"
                        value={draftClient.advancePaid}
                        onChange={(e) =>
                          handlePatchDraft({
                            advancePaid: Number(e.target.value) || 0,
                          })
                        }
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
                            draftClient.finalAgreedPrice,
                            draftClient.advancePaid
                          )
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Assigned Lead
                      </label>
                      <select
                        aria-label="Assigned Lead"
                        value={draftClient.assignedLead}
                        onChange={(e) =>
                          handlePatchDraft({
                            assignedLead: e.target.value as AssignedPerson,
                          })
                        }
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
                        aria-label="Next Follow-up Date"
                        value={draftClient.nextFollowUpDate}
                        onChange={(e) =>
                          handlePatchDraft({ nextFollowUpDate: e.target.value })
                        }
                        className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] font-mono text-xs text-[#0B0F19]"
                      />
                    </div>
                  </div>

                  {/* Explicit Save & Sync Bar */}
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <span className="text-[11px] text-slate-500">
                      {hasUnsavedChanges
                        ? 'Unsaved edits ready — click Save & Sync to update Pipeline & Studio Finance.'
                        : 'All fields synced with Studio Finance & Supabase.'}
                    </span>
                    <button
                      type="submit"
                      className={`px-4 py-2 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        hasUnsavedChanges
                          ? 'bg-[#2563EB] hover:bg-blue-700 text-white shadow-sm'
                          : 'bg-[#0B0F19] hover:bg-slate-800 text-white'
                      }`}
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save &amp; Sync Changes</span>
                    </button>
                  </div>
                </div>
              </form>

              {/* Timestamped Call / Meeting Notes Log */}
              <div className="pt-4 border-t border-[#EAECEF] space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B0F19]">
                  Timestamped Call &amp; Meeting Notes Log
                </h3>

                <form onSubmit={handleAddNote} className="space-y-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      aria-label="Note Author"
                      value={noteAuthor}
                      onChange={(e) =>
                        setNoteAuthor(e.target.value as 'Krishna' | 'Vansh')
                      }
                      className="px-3 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] text-xs font-semibold text-[#0B0F19]"
                    >
                      <option value="Krishna">Krishna</option>
                      <option value="Vansh">Vansh</option>
                    </select>
                    <div className="flex gap-2 flex-1">
                      <input
                        type="text"
                        value={newNoteText}
                        onChange={(e) => setNewNoteText(e.target.value)}
                        placeholder="Log call summary, client requirement, or price negotiation..."
                        className="flex-1 px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] text-xs text-[#0B0F19] focus:outline-none focus:border-[#2563EB]"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Log</span>
                      </button>
                    </div>
                  </div>
                </form>

                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {draftClient.notesLog.map((note) => (
                    <div
                      key={note.id}
                      className="p-3 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF] text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-bold text-[#0B0F19]">
                          {note.author}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{note.timestamp}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteNote(note.id)}
                            aria-label="Delete note"
                            className="text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-slate-700 leading-relaxed">
                        {note.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sticky Bottom Action Bar */}
            <div className="sticky bottom-0 z-10 bg-white/95 backdrop-blur-md px-4 sm:px-8 py-3.5 border-t border-[#EAECEF] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  onDeleteClient(draftClient.id);
                  onSelectClient(null);
                }}
                className="px-3.5 py-2 rounded-full text-rose-600 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Client</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (hasUnsavedChanges) {
                    onUpdateClient(draftClient);
                  }
                  onSelectClient(null);
                }}
                className="px-5 py-2 rounded-full bg-[#0B0F19] text-white text-xs font-semibold cursor-pointer"
              >
                {hasUnsavedChanges ? 'Save & Close' : 'Close Drawer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
