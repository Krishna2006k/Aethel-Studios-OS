import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  ExternalLink,
  MessageSquare,
  CheckCircle2,
  Trash2,
  X,
  Save,
  LayoutGrid,
  Table as TableIcon,
  Globe,
  Megaphone,
  CreditCard,
  Layers,
  CheckSquare,
  ShieldCheck,
  Rocket,
  FileText,
  ArrowUpRight,
  Download,
  ArrowUpDown,
  PhoneCall,
  Activity,
  Award,
} from 'lucide-react';
import {
  AethelDatabaseState,
  ApprovalCheckpointStage,
  ClientCommunicationLog,
  ClientLead,
  ClientPayment,
  ClientTicket,
  ExpensePaidBy,
  FounderName,
  HostedWebsite,
  LeadSource,
  LeadStage,
  MetaAdCampaign,
  ProjectMilestoneStage,
  ProjectTemplateName,
  StudioTask,
  GeneratedDocument,
} from '../types';
import {
  ALL_LEAD_SOURCES,
  calculateClientProjectProgress,
  calculateCPL,
  calculateDaysUntilExpiry,
  calculateLeadConversionAnalytics,
  calculatePendingBalance,
  calculateStudioFinances,
  formatINR,
} from '../utils/calculations';
import {
  calculateClientFinancialProfile,
  createDocumentSnapshot,
  generateNextDocumentNumber,
} from '../utils/financeEngine';
import { DocumentPreviewModal } from './finance/DocumentPreviewModal';

interface ClientPipelineViewProps {
  clients: ClientLead[];
  dbState: AethelDatabaseState;
  onUpdateClient: (updated: ClientLead) => void;
  onAddClient: (newLead: ClientLead) => void;
  onDeleteClient: (clientId: string) => void;
  onConvertLeadToProject: (clientId: string, advanceNow?: number, receivedBy?: ExpensePaidBy) => void;
  onToggleMilestone: (clientId: string, stage: ProjectMilestoneStage) => void;
  onAddPayment: (payment: ClientPayment) => void;
  onAddTicket: (ticket: ClientTicket) => void;
  onAddCampaign: (campaign: MetaAdCampaign) => void;
  onAddWebsite: (website: HostedWebsite) => void;
  onAddTask: (task: StudioTask) => void;
  onToggleTaskStatus: (taskId: string) => void;
  selectedClient360Id: string | null;
  onSelectClient360: (clientId: string | null) => void;
  onApplyProjectTemplate?: (clientId: string, templateName: ProjectTemplateName) => void;
  onToggleApprovalCheckpoint?: (clientId: string, stage: ApprovalCheckpointStage) => void;
  onToggleMilestoneSubtask?: (
    clientId: string,
    milestoneStage: ProjectMilestoneStage,
    subtaskId: string
  ) => void;
  onAddCommunicationLog?: (
    clientId: string,
    entry: Omit<ClientCommunicationLog, 'id'>
  ) => void;
}

const STAGES: LeadStage[] = [
  'Cold Lead',
  'Sample Sent / WhatsApp',
  'In Talks / Demo Shown',
  'In Building',
  'Live / Payment Pending',
  'Delivered / Live',
  'Rejected / Dropped',
];

const PROJECT_TEMPLATES: ProjectTemplateName[] = [
  'Basic Website Package',
  'Standard Website Package',
  'Premium Website Package',
  'Custom Website + Meta Ads',
];

type StageGroupFilter = 'all' | 'sales' | 'execution' | 'closed';
type SortField = 'default' | 'value_desc' | 'value_asc' | 'pending_desc' | 'name_asc';

type Client360Tab =
  | 'overview'
  | 'projects'
  | 'payments'
  | 'tasks'
  | 'meta-ads'
  | 'domains'
  | 'files'
  | 'communication'
  | 'activity';

export const ClientPipelineView: React.FC<ClientPipelineViewProps> = ({
  clients,
  dbState,
  onUpdateClient,
  onAddClient,
  onDeleteClient,
  onConvertLeadToProject,
  onToggleMilestone,
  onAddPayment,
  onAddTicket,
  onAddCampaign,
  onAddWebsite,
  onAddTask,
  onToggleTaskStatus,
  selectedClient360Id,
  onSelectClient360,
  onApplyProjectTemplate,
  onToggleApprovalCheckpoint,
  onToggleMilestoneSubtask,
  onAddCommunicationLog,
}) => {
  // PART 3: Table View is the Default View in CRM & Pipeline
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [stageGroup, setStageGroup] = useState<StageGroupFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [founderFilter, setFounderFilter] = useState<'All' | FounderName>('All');
  const [nicheFilter, setNicheFilter] = useState<string>('All');
  const [leadSourceFilter, setLeadSourceFilter] = useState<string>('All');
  const [sortField, setSortField] = useState<SortField>('default');
  const [showAddForm, setShowAddForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Client 360° Active Tab (9 Tabs)
  const [active360Tab, setActive360Tab] = useState<Client360Tab>('overview');
  const [previewStatementDoc, setPreviewStatementDoc] = useState<GeneratedDocument | null>(null);

  // Inline Quick Add States inside Client 360°
  const [quickPayAmount, setQuickPayAmount] = useState<number>(0);
  const [quickPayMode, setQuickPayMode] = useState<ClientPayment['paymentMode']>('UPI');
  const [quickPayAccount, setQuickPayAccount] = useState<ExpensePaidBy>('Studio Account');
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskDue, setQuickTaskDue] = useState(
    new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  );
  const [quickTicketTitle, setQuickTicketTitle] = useState('');
  const [quickCampaignName, setQuickCampaignName] = useState('');
  const [quickCampaignBudget, setQuickCampaignBudget] = useState(12000);
  const [quickCampaignFee, setQuickCampaignFee] = useState(4000);
  const [quickDomainName, setQuickDomainName] = useState('');
  const [draftOverview, setDraftOverview] = useState<ClientLead | null>(null);
  const [overviewSavedNotice, setOverviewSavedNotice] = useState(false);

  // Communication Logger State
  const [commType, setCommType] = useState<ClientCommunicationLog['type']>('WhatsApp');
  const [commSummary, setCommSummary] = useState('');
  const [commLoggedBy, setCommLoggedBy] = useState<FounderName>('Krishna');

  // New Client Lead Form State
  const [businessName, setBusinessName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('+91 ');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('Pune');
  const [niche, setNiche] = useState<ClientLead['niche']>('Banquet/Lawns');
  const [leadSource, setLeadSource] = useState<LeadSource>('Direct Outreach');
  const [packageTier, setPackageTier] = useState('Custom Website + Lead Funnel');
  const [quotedPrice, setQuotedPrice] = useState(25000);
  const [finalAgreedPrice, setFinalAgreedPrice] = useState(22000);
  const [advancePaid, setAdvancePaid] = useState(0);
  const [stage, setStage] = useState<LeadStage>('Sample Sent / WhatsApp');
  const [assignedTo, setAssignedTo] = useState<FounderName>('Vansh');
  const [sampleLinkSent, setSampleLinkSent] = useState('');
  const [notes, setNotes] = useState('');

  // Canonical Financial Engine & Lead Conversion Analytics
  const canonicalFinances = calculateStudioFinances(
    dbState.expenses,
    dbState.payments,
    dbState.clients,
    dbState.metaCampaigns,
    dbState.tickets,
    dbState.tasks || []
  );
  const leadAnalytics = calculateLeadConversionAnalytics(clients);

  const filteredClients = clients
    .filter((c) => {
      const matchesSearch =
        c.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.packageTier.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.leadSource || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFounder =
        founderFilter === 'All' || c.assignedTo === founderFilter || c.assignedTo === 'Both';
      const matchesNiche = nicheFilter === 'All' || c.niche === nicheFilter;
      const matchesSource =
        leadSourceFilter === 'All' || (c.leadSource || 'Direct Outreach') === leadSourceFilter;
      const matchesStageGroup =
        stageGroup === 'all'
          ? true
          : stageGroup === 'sales'
          ? ['Cold Lead', 'Sample Sent / WhatsApp', 'In Talks / Demo Shown'].includes(c.stage)
          : stageGroup === 'execution'
          ? ['In Building', 'Live / Payment Pending'].includes(c.stage)
          : ['Delivered / Live', 'Rejected / Dropped'].includes(c.stage);
      return (
        matchesSearch &&
        matchesFounder &&
        matchesNiche &&
        matchesSource &&
        matchesStageGroup
      );
    })
    .sort((a, b) => {
      if (sortField === 'value_desc') return b.finalAgreedPrice - a.finalAgreedPrice;
      if (sortField === 'value_asc') return a.finalAgreedPrice - b.finalAgreedPrice;
      if (sortField === 'pending_desc') {
        return (
          calculatePendingBalance(b.finalAgreedPrice, b.advancePaid) -
          calculatePendingBalance(a.finalAgreedPrice, a.advancePaid)
        );
      }
      if (sortField === 'name_asc') return a.businessName.localeCompare(b.businessName);
      return 0;
    });

  const visibleKanbanStages: LeadStage[] =
    stageGroup === 'sales'
      ? ['Cold Lead', 'Sample Sent / WhatsApp', 'In Talks / Demo Shown']
      : stageGroup === 'execution'
      ? ['In Building', 'Live / Payment Pending']
      : stageGroup === 'closed'
      ? ['Delivered / Live', 'Rejected / Dropped']
      : STAGES;

  const handleExportCSV = () => {
    const headers = [
      'Business Name',
      'Contact Person',
      'Phone',
      'Email',
      'City',
      'Niche',
      'Lead Source',
      'Package / Scope',
      'Stage',
      'Agreed Price (INR)',
      'Advance Paid (INR)',
      'Pending Balance (INR)',
      'Assigned To',
      'Follow-Up Date',
    ];
    const rows = filteredClients.map((c) => [
      `"${c.businessName.replace(/"/g, '""')}"`,
      `"${c.contactPerson.replace(/"/g, '""')}"`,
      `"${c.phone}"`,
      `"${c.email || ''}"`,
      `"${c.city}"`,
      `"${c.niche}"`,
      `"${c.leadSource || 'Direct Outreach'}"`,
      `"${c.packageTier.replace(/"/g, '""')}"`,
      `"${c.stage}"`,
      c.finalAgreedPrice,
      c.advancePaid,
      calculatePendingBalance(c.finalAgreedPrice, c.advancePaid),
      c.assignedTo,
      c.followUpDate,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `aethel-crm-pipeline-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) return;
    onAddClient({
      id: `cli-${Date.now()}`,
      businessName: businessName.trim(),
      contactPerson: contactPerson.trim() || 'Owner',
      phone: phone.trim(),
      email: email.trim(),
      city: city.trim(),
      niche,
      leadSource,
      packageTier,
      quotedPrice: Number(quotedPrice),
      finalAgreedPrice: Number(finalAgreedPrice),
      advancePaid: Number(advancePaid),
      stage,
      assignedTo,
      sampleLinkSent: sampleLinkSent.trim(),
      followUpDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
      notes: notes.trim(),
      createdAt: new Date().toISOString().slice(0, 10),
    });
    setBusinessName('');
    setContactPerson('');
    setEmail('');
    setSampleLinkSent('');
    setNotes('');
    setShowAddForm(false);
  };

  const openClient360 = (client: ClientLead, defaultTab: Client360Tab = 'overview') => {
    onSelectClient360(client.id);
    setActive360Tab(defaultTab);
    const pending = calculatePendingBalance(client.finalAgreedPrice, client.advancePaid);
    setQuickPayAmount(pending > 0 ? pending : 5000);
  };

  const activeClient360 = selectedClient360Id
    ? clients.find((c) => c.id === selectedClient360Id) || null
    : null;

  useEffect(() => {
    if (activeClient360) {
      setDraftOverview(activeClient360);
      setOverviewSavedNotice(false);
    } else {
      setDraftOverview(null);
    }
  }, [activeClient360?.id]);

  const generateWhatsAppPitch = (client: ClientLead) => {
    const cleanPhone = client.phone.replace(/[^0-9]/g, '');
    const balance = calculatePendingBalance(client.finalAgreedPrice, client.advancePaid);
    const message =
      client.stage === 'Live / Payment Pending' && balance > 0
        ? `Hi ${client.contactPerson}, greetings from *Aethel Studios*! Your website for *${client.businessName}* is live. Kindly process the remaining milestone balance of *${formatINR(balance)}* via UPI/Bank so we can complete final handover.`
        : `Hi ${client.contactPerson}, this is ${
            client.assignedTo === 'Both' ? 'Vansh & Krishna' : client.assignedTo
          } from *Aethel Studios* (aethelstudios.in). We built an interactive preview tailored for *${
            client.businessName
          }* (${client.city}): ${
            client.sampleLinkSent || 'https://aethelstudios.in'
          } — Let us know when we can walk you through it!`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  const getStageStyle = (s: LeadStage) => {
    switch (s) {
      case 'Delivered / Live':
        return 'text-[#059669] bg-[#D1FAE5]/60';
      case 'Live / Payment Pending':
        return 'text-amber-700 bg-amber-100/80';
      case 'In Building':
        return 'text-[#2563EB] bg-[#EFF6FF]';
      case 'In Talks / Demo Shown':
        return 'text-indigo-700 bg-indigo-50';
      case 'Rejected / Dropped':
        return 'text-rose-600 bg-rose-50';
      default:
        return 'text-[#475569] bg-[#F1F5F9]';
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & Unified Financial + Lead Conversion Summary Strip */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EAECEF] shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)] space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-[#2563EB] mb-1">
              CLIENT OPERATIONS · CENTRAL CRM & PIPELINE
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B0F19]">
              Client Accounts, Lead Funnel & 360° Workspace
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
              Click any client row to open their <strong>Unified 9-Tab Client 360° Workspace</strong> (Overview, Projects & Approvals, Payments & Invoices, Tasks, Meta Ads, Domains, Vault, Communication & Activity).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Table (Default) vs Kanban Switcher */}
            <div className="flex items-center bg-[#F8F9FA] p-1 rounded-xl border border-[#EAECEF]">
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-[#0B0F19] text-white shadow-xs'
                    : 'text-[#64748B] hover:text-[#0B0F19]'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                Table View
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'kanban'
                    ? 'bg-[#0B0F19] text-white shadow-xs'
                    : 'text-[#64748B] hover:text-[#0B0F19]'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Kanban Board
              </button>
            </div>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#F8F9FA] hover:bg-[#F1F5F9] text-[#0B0F19] border border-[#EAECEF] text-xs font-bold transition-all cursor-pointer"
              title="Export CRM Pipeline to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Client / Lead</span>
            </button>
          </div>
        </div>

        {/* Canonical 4-Metric Financial Strip (Matches Overview & Finance 100%) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-[#F1F5F9]">
          <div className="p-3.5 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
              Confirmed Deal Volume
            </div>
            <div className="text-xl font-extrabold font-mono text-[#0B0F19] mt-0.5">
              {formatINR(canonicalFinances.totalContractedVolume)}
            </div>
            <div className="text-[11px] text-[#64748B] mt-0.5">
              {canonicalFinances.activeClientsCount} active/delivered (= Collected + Pending)
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#ECFDF5]/60 border border-[#A7F3D0]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#059669]">
              Verified Revenue Collected
            </div>
            <div className="text-xl font-extrabold font-mono text-[#059669] mt-0.5">
              {formatINR(canonicalFinances.totalRevenueCollected)}
            </div>
            <div className="text-[11px] text-[#047857] mt-0.5">
              {canonicalFinances.collectionRatePercent}% collection rate · Synced with Ledger
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
              Pending Receivables (Active)
            </div>
            <div className="text-xl font-extrabold font-mono text-amber-700 mt-0.5">
              {formatINR(canonicalFinances.pendingReceivables)}
            </div>
            <div className="text-[11px] text-amber-800 mt-0.5">
              {canonicalFinances.livePaymentPendingCount} live sites · {canonicalFinances.activeProjectsCount} total active builds
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#EFF6FF]/60 border border-[#BFDBFE]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB]">
              Unclosed Sales Pipeline
            </div>
            <div className="text-xl font-extrabold font-mono text-[#1E40AF] mt-0.5">
              {formatINR(canonicalFinances.unclosedPipelineVolume)}
            </div>
            <div className="text-[11px] text-[#2563EB] mt-0.5">
              {canonicalFinances.unclosedLeadsCount} leads · {leadAnalytics.conversionRatePercent}% Deal Win Rate
            </div>
          </div>
        </div>

        {/* PART 3 — LEAD CONVERSION ANALYTICS STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-[#F1F5F9]">
          <div className="px-3 py-2 rounded-xl bg-[#FAFBFC] border border-[#EAECEF] flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#64748B]">Total Leads</span>
            <span className="text-xs font-mono font-extrabold text-[#0B0F19]">
              {leadAnalytics.totalLeads}
            </span>
          </div>
          <div className="px-3 py-2 rounded-xl bg-[#FAFBFC] border border-[#EAECEF] flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#64748B]">Qualified</span>
            <span className="text-xs font-mono font-extrabold text-[#2563EB]">
              {leadAnalytics.qualifiedLeads}
            </span>
          </div>
          <div className="px-3 py-2 rounded-xl bg-[#FAFBFC] border border-[#EAECEF] flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#64748B]">Proposals / Talks</span>
            <span className="text-xs font-mono font-extrabold text-[#2563EB]">
              {leadAnalytics.proposalsSent}
            </span>
          </div>
          <div className="px-3 py-2 rounded-xl bg-[#FAFBFC] border border-[#EAECEF] flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#64748B]">Won Deals</span>
            <span className="text-xs font-mono font-extrabold text-[#059669]">
              {leadAnalytics.wonDeals}
            </span>
          </div>
          <div className="px-3 py-2 rounded-xl bg-[#FAFBFC] border border-[#EAECEF] flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#64748B]">Conversion Rate</span>
            <span className="text-xs font-mono font-extrabold text-[#059669]">
              {leadAnalytics.conversionRatePercent}%
            </span>
          </div>
          <div className="px-3 py-2 rounded-xl bg-[#FAFBFC] border border-[#EAECEF] flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#64748B]">Avg Deal Size</span>
            <span className="text-xs font-mono font-extrabold text-[#0B0F19]">
              {formatINR(leadAnalytics.averageDealValue)}
            </span>
          </div>
        </div>
      </div>

      {/* Collapsible New Client Form */}
      {showAddForm && (
        <form
          onSubmit={handleCreateLead}
          className="bg-white rounded-3xl p-6 border-2 border-[#2563EB]/20 shadow-lg space-y-4"
        >
          <div className="flex items-center justify-between border-b border-[#EAECEF] pb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#2563EB]">
              + Add New Client Account or Prospect
            </h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs font-semibold text-[#64748B] hover:text-[#0B0F19]"
            >
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Business Name *
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g., Shagun Lawns & Banquet"
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Decision Maker
              </label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="Owner / Manager Name"
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                WhatsApp Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@business.com"
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                City / Area
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Industry Niche
              </label>
              <select
                value={niche}
                onChange={(e) => setNiche(e.target.value as ClientLead['niche'])}
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm bg-white"
              >
                <option value="Banquet/Lawns">Banquet/Lawns</option>
                <option value="Clinic/Hospital">Clinic/Hospital</option>
                <option value="Cafe/Restaurant">Cafe/Restaurant</option>
                <option value="Retail/Electronics">Retail/Electronics</option>
                <option value="Real Estate/Interior">Real Estate/Interior</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Lead Source
              </label>
              <select
                value={leadSource}
                onChange={(e) => setLeadSource(e.target.value as LeadSource)}
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm bg-white"
              >
                {ALL_LEAD_SOURCES.map((src) => (
                  <option key={src} value={src}>
                    {src}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Custom Scope / Deliverables
              </label>
              <input
                type="text"
                value={packageTier}
                onChange={(e) => setPackageTier(e.target.value)}
                placeholder="e.g., Custom Website + Booking Flow"
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Final Agreed Price (₹)
              </label>
              <input
                type="number"
                value={finalAgreedPrice}
                onChange={(e) => setFinalAgreedPrice(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Advance Paid (₹)
              </label>
              <input
                type="number"
                value={advancePaid}
                onChange={(e) => setAdvancePaid(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Pipeline Stage
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as LeadStage)}
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm bg-white"
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Lead Owner
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value as FounderName)}
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm bg-white"
              >
                <option value="Vansh">Vansh</option>
                <option value="Krishna">Krishna</option>
                <option value="Both">Both</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Sample Prototype Link
              </label>
              <input
                type="text"
                value={sampleLinkSent}
                onChange={(e) => setSampleLinkSent(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Deal context..."
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#0B0F19] text-white text-xs font-bold hover:bg-[#1E293B] cursor-pointer"
            >
              Create Client Record
            </button>
          </div>
        </form>
      )}

      {/* Search, Lead Source, Sort & Stage Filters Bar */}
      <div className="bg-white rounded-2xl p-3.5 border border-[#EAECEF] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by client name, contact person, city, source, or scope..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#F8F9FA] border border-[#EAECEF] text-xs focus:outline-none focus:border-[#2563EB]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Stage Group Segmented Filter */}
          <div className="flex items-center bg-[#F8F9FA] p-1 rounded-xl border border-[#EAECEF]">
            {[
              { id: 'all', label: `All (${clients.length})` },
              {
                id: 'sales',
                label: `Sales Leads (${
                  clients.filter((c) =>
                    ['Cold Lead', 'Sample Sent / WhatsApp', 'In Talks / Demo Shown'].includes(c.stage)
                  ).length
                })`,
              },
              {
                id: 'execution',
                label: `Building & Due (${
                  clients.filter((c) =>
                    ['In Building', 'Live / Payment Pending'].includes(c.stage)
                  ).length
                })`,
              },
              {
                id: 'closed',
                label: `Delivered (${
                  clients.filter((c) =>
                    ['Delivered / Live', 'Rejected / Dropped'].includes(c.stage)
                  ).length
                })`,
              },
            ].map((grp) => (
              <button
                key={grp.id}
                onClick={() => setStageGroup(grp.id as StageGroupFilter)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  stageGroup === grp.id
                    ? 'bg-white text-[#2563EB] shadow-2xs'
                    : 'text-[#64748B] hover:text-[#0B0F19]'
                }`}
              >
                {grp.label}
              </button>
            ))}
          </div>

          <select
            value={leadSourceFilter}
            onChange={(e) => setLeadSourceFilter(e.target.value)}
            aria-label="Filter by lead source"
            className="px-3 py-1.5 rounded-xl bg-[#F8F9FA] border border-[#EAECEF] text-xs font-semibold text-[#475569]"
          >
            <option value="All">All Sources</option>
            {ALL_LEAD_SOURCES.map((src) => (
              <option key={src} value={src}>
                {src}
              </option>
            ))}
          </select>

          <select
            value={founderFilter}
            onChange={(e) => setFounderFilter(e.target.value as 'All' | FounderName)}
            aria-label="Filter by founder"
            className="px-3 py-1.5 rounded-xl bg-[#F8F9FA] border border-[#EAECEF] text-xs font-semibold text-[#475569]"
          >
            <option value="All">All Founders</option>
            <option value="Krishna">Krishna</option>
            <option value="Vansh">Vansh</option>
            <option value="Both">Shared (Both)</option>
          </select>

          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            aria-label="Sort table rows"
            className="px-3 py-1.5 rounded-xl bg-[#F8F9FA] border border-[#EAECEF] text-xs font-semibold text-[#475569]"
          >
            <option value="default">Sort: Default</option>
            <option value="value_desc">Value: High → Low</option>
            <option value="value_asc">Value: Low → High</option>
            <option value="pending_desc">Pending Balance: High → Low</option>
            <option value="name_asc">Name: A → Z</option>
          </select>
        </div>
      </div>

      {/* PRIMARY VIEW: HIGH-DENSITY CRM TABLE (PART 3 DEFAULT) */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-3xl border border-[#EAECEF] shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[820px]">
              <thead>
                <tr className="bg-[#F8F9FA] border-b border-[#EAECEF] text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                  <th
                    onClick={() =>
                      setSortField(sortField === 'name_asc' ? 'default' : 'name_asc')
                    }
                    className="py-3 px-4 cursor-pointer hover:text-[#0B0F19]"
                  >
                    <span className="inline-flex items-center gap-1">
                      Client & Source <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                  <th className="py-3 px-3">Project / Scope</th>
                  <th
                    onClick={() =>
                      setSortField(sortField === 'value_desc' ? 'value_asc' : 'value_desc')
                    }
                    className="py-3 px-3 text-right cursor-pointer hover:text-[#0B0F19]"
                  >
                    <span className="inline-flex items-center justify-end gap-1">
                      Value <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                  <th className="py-3 px-3">Stage</th>
                  <th className="py-3 px-3 text-right">Paid</th>
                  <th
                    onClick={() =>
                      setSortField(sortField === 'pending_desc' ? 'default' : 'pending_desc')
                    }
                    className="py-3 px-3 text-right cursor-pointer hover:text-[#0B0F19]"
                  >
                    <span className="inline-flex items-center justify-end gap-1">
                      Pending <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                  <th className="py-3 px-2.5">Owner</th>
                  <th className="py-3 px-4 text-right">Next Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-xs">
                {filteredClients.map((client) => {
                  const pending = calculatePendingBalance(
                    client.finalAgreedPrice,
                    client.advancePaid
                  );
                  const prog = calculateClientProjectProgress(
                    client,
                    dbState.tickets,
                    dbState.websites
                  );
                  const isLeadStage = [
                    'Cold Lead',
                    'Sample Sent / WhatsApp',
                    'In Talks / Demo Shown',
                  ].includes(client.stage);

                  return (
                    <tr
                      key={client.id}
                      onClick={() => openClient360(client, 'overview')}
                      className="hover:bg-[#F8F9FA] transition-colors cursor-pointer group"
                    >
                      {/* Client & Source */}
                      <td className="py-3 px-4 max-w-[200px]">
                        <div className="font-extrabold text-[#0B0F19] group-hover:text-[#2563EB] flex items-center gap-1 truncate">
                          <span className="truncate">{client.businessName}</span>
                          <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-[#2563EB] transition-opacity shrink-0" />
                        </div>
                        <div className="text-[11px] text-[#64748B] mt-0.5 truncate flex items-center gap-1.5">
                          <span>
                            {client.contactPerson} · {client.city}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-[#F1F5F9] text-[#475569] text-[10px] font-semibold">
                            {client.leadSource || 'Direct Outreach'}
                          </span>
                        </div>
                      </td>

                      {/* Project & Milestone Progress */}
                      <td className="py-3 px-3 max-w-[190px]">
                        <div className="font-semibold text-[#0B0F19] truncate">
                          {client.packageTier}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-16 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#2563EB] rounded-full"
                              style={{ width: `${prog.percent}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-[#64748B]">
                            {prog.percent}% ({prog.completedMilestones}/6)
                          </span>
                        </div>
                      </td>

                      {/* Value */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-[#0B0F19] whitespace-nowrap">
                        {formatINR(client.finalAgreedPrice)}
                      </td>

                      {/* Stage Dropdown */}
                      <td
                        className="py-3 px-3 whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <select
                          value={client.stage}
                          onChange={(e) =>
                            onUpdateClient({
                              ...client,
                              stage: e.target.value as LeadStage,
                            })
                          }
                          aria-label={`Stage for ${client.businessName}`}
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold border border-transparent focus:border-[#2563EB] cursor-pointer ${getStageStyle(
                            client.stage
                          )}`}
                        >
                          {STAGES.map((s) => (
                            <option key={s} value={s} className="bg-white text-[#0B0F19]">
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Paid */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-[#059669] whitespace-nowrap">
                        {formatINR(client.advancePaid)}
                      </td>

                      {/* Pending */}
                      <td className="py-3 px-3 text-right font-mono font-bold whitespace-nowrap">
                        {isLeadStage && client.advancePaid === 0 ? (
                          <span className="text-[#64748B] font-medium">
                            Quote: {formatINR(client.finalAgreedPrice)}
                          </span>
                        ) : pending > 0 ? (
                          <span className="text-amber-700">{formatINR(pending)} Due</span>
                        ) : (
                          <span className="text-[#059669]">₹0 Settled</span>
                        )}
                      </td>

                      {/* Owner */}
                      <td className="py-3 px-2.5 whitespace-nowrap font-semibold text-[#475569]">
                        {client.assignedTo}
                      </td>

                      {/* Next Action */}
                      <td
                        className="py-3 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center justify-end gap-1">
                          {isLeadStage && (
                            <button
                              onClick={() =>
                                onConvertLeadToProject(
                                  client.id,
                                  Math.round(client.finalAgreedPrice * 0.5)
                                )
                              }
                              title="Convert lead to Active Project (In Building) + initialize 6 milestones"
                              className="px-2 py-1 rounded-lg bg-[#EFF6FF] hover:bg-[#2563EB] text-[#2563EB] hover:text-white font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <Rocket className="w-3 h-3" /> Convert
                            </button>
                          )}

                          {pending > 0 && !isLeadStage && (
                            <button
                              onClick={() => openClient360(client, 'payments')}
                              className="px-2 py-1 rounded-lg bg-[#ECFDF5] hover:bg-[#059669] text-[#059669] hover:text-white font-bold text-[11px] transition-colors cursor-pointer"
                            >
                              + Pay
                            </button>
                          )}

                          <a
                            href={generateWhatsAppPitch(client)}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-1 rounded-lg bg-[#F8F9FA] hover:bg-[#D1FAE5] text-[#059669] border border-[#EAECEF] font-bold text-[11px] transition-colors"
                          >
                            WA
                          </a>

                          <button
                            onClick={() => openClient360(client, 'overview')}
                            className="px-2.5 py-1 rounded-lg bg-[#0B0F19] hover:bg-[#2563EB] text-white font-bold text-[11px] transition-colors cursor-pointer"
                          >
                            360° Profile
                          </button>

                          {confirmDeleteId === client.id ? (
                            <div className="inline-flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
                              <button
                                onClick={() => {
                                  onDeleteClient(client.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="text-[10px] text-[#64748B] cursor-pointer"
                              >
                                ×
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(client.id)}
                              aria-label={`Delete ${client.businessName}`}
                              className="p-1.5 rounded-lg text-[#94A3B8] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* SECONDARY VIEW: KANBAN BOARD */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {visibleKanbanStages.map((stageName) => {
            const stageClients = filteredClients.filter((c) => c.stage === stageName);
            const stageValue = stageClients.reduce((s, c) => s + c.finalAgreedPrice, 0);

            return (
              <div
                key={stageName}
                className="bg-white rounded-3xl p-4 border border-[#EAECEF] flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#F1F5F9]">
                    <div>
                      <h3 className="text-xs font-extrabold text-[#0B0F19]">{stageName}</h3>
                      <div className="text-[10px] font-mono text-[#64748B]">
                        Vol: {formatINR(stageValue)}
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#2563EB]">
                      {stageClients.length}
                    </span>
                  </div>

                  {stageClients.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#94A3B8]">
                      No accounts in this stage
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {stageClients.map((client) => {
                        const pending = calculatePendingBalance(
                          client.finalAgreedPrice,
                          client.advancePaid
                        );
                        return (
                          <div
                            key={client.id}
                            onClick={() => openClient360(client, 'overview')}
                            className="p-3.5 rounded-2xl bg-[#F8F9FA] hover:bg-white border border-[#EAECEF] hover:border-[#2563EB] transition-all cursor-pointer space-y-2.5 shadow-2xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="text-xs font-extrabold text-[#0B0F19]">
                                  {client.businessName}
                                </div>
                                <div className="text-[11px] text-[#64748B]">
                                  {client.city} · {client.assignedTo} · {client.leadSource || 'Direct'}
                                </div>
                              </div>
                            </div>

                            <div className="text-[11px] font-medium text-[#475569] line-clamp-1">
                              {client.packageTier}
                            </div>

                            <div className="pt-2 border-t border-[#EAECEF] flex items-center justify-between text-[11px] font-mono">
                              <span className="text-[#059669] font-bold">
                                Paid: {formatINR(client.advancePaid)}
                              </span>
                              <span
                                className={
                                  pending > 0 ? 'text-amber-700 font-bold' : 'text-[#64748B]'
                                }
                              >
                                Due: {formatINR(pending)}
                              </span>
                            </div>

                            <div
                              className="flex items-center justify-between gap-1.5 pt-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => openClient360(client, 'overview')}
                                className="flex-1 py-1.5 rounded-xl bg-white border border-[#EAECEF] hover:border-[#0B0F19] text-[11px] font-bold text-[#0B0F19] cursor-pointer"
                              >
                                Open 360° Dossier
                              </button>
                              <a
                                href={generateWhatsAppPitch(client)}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1.5 rounded-xl bg-[#D1FAE5] text-[#059669] text-[11px] font-bold"
                              >
                                WA
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================================
          PART 3 & PART 4 — UNIFIED 9-TAB CLIENT 360° WORKSPACE DRAWER
          "One Client. One Central Source of Truth."
         ============================================================================ */}
      {activeClient360 && (() => {
        const client = activeClient360;
        const pending = calculatePendingBalance(client.finalAgreedPrice, client.advancePaid);
        const prog = calculateClientProjectProgress(client, dbState.tickets, dbState.websites);

        const clientPayments = dbState.payments.filter(
          (p) =>
            p.clientId === client.id ||
            p.clientName.toLowerCase().trim() === client.businessName.toLowerCase().trim()
        );
        const clientInvoices = (dbState.invoices || []).filter(
          (inv) =>
            inv.clientId === client.id ||
            inv.clientName.toLowerCase().trim() === client.businessName.toLowerCase().trim()
        );
        const clientCampaigns = dbState.metaCampaigns.filter(
          (m) =>
            m.clientId === client.id ||
            m.clientName.toLowerCase().trim() === client.businessName.toLowerCase().trim()
        );
        const clientDomains = dbState.websites.filter(
          (w) =>
            w.clientId === client.id ||
            w.clientName.toLowerCase().trim() === client.businessName.toLowerCase().trim()
        );
        const clientTickets = dbState.tickets.filter(
          (t) =>
            t.clientId === client.id ||
            t.clientName.toLowerCase().trim() === client.businessName.toLowerCase().trim()
        );
        const clientTasks = (dbState.tasks || []).filter(
          (tsk) =>
            tsk.clientId === client.id ||
            tsk.clientName.toLowerCase().trim() === client.businessName.toLowerCase().trim()
        );
        const clientVaultItems = dbState.vaultItems.filter(
          (v) =>
            v.clientAssociated.toLowerCase().includes(client.businessName.toLowerCase()) ||
            v.clientAssociated === 'All Hosted Clients'
        );
        const clientActivityLogs = (dbState.activityLogs || []).filter((log) =>
          log.targetName.toLowerCase().includes(client.businessName.toLowerCase())
        );
        const commLogs = client.communicationLogs || [];

        return (
          <div className="fixed inset-0 z-50 bg-[#0B0F19]/60 backdrop-blur-xs flex justify-end">
            <div className="bg-white w-full max-w-4xl h-full flex flex-col justify-between shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200">
              {/* Top Profile Header */}
              <div className="bg-[#0B0F19] text-white p-5 sm:px-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-[#60A5FA]">
                      <span>CLIENT 360° UNIFIED WORKSPACE</span>
                      <span>·</span>
                      <span>{client.niche}</span>
                      <span>·</span>
                      <span>{client.city}</span>
                      <span>·</span>
                      <span>Source: {client.leadSource || 'Direct Outreach'}</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight mt-1">
                      {client.businessName}
                    </h2>
                    <div className="text-xs text-slate-300 mt-0.5 flex flex-wrap items-center gap-2">
                      <span>Contact: <strong>{client.contactPerson}</strong></span>
                      <span>·</span>
                      <span className="font-mono">{client.phone}</span>
                      {client.email && (
                        <>
                          <span>·</span>
                          <span>{client.email}</span>
                        </>
                      )}
                      <span>·</span>
                      <span>Owner: <strong>{client.assignedTo}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={generateWhatsAppPitch(client)}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                    </a>
                    <button
                      onClick={() => onSelectClient360(null)}
                      aria-label="Close Client 360 Profile"
                      className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Quick Financial & Progress Summary Strip inside Header */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-white/10 text-xs">
                  <div>
                    <div className="text-[10px] uppercase text-[#94A3B8]">Agreed Value</div>
                    <div className="text-base font-extrabold font-mono text-white">
                      {formatINR(client.finalAgreedPrice)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-[#94A3B8]">Paid to Date</div>
                    <div className="text-base font-extrabold font-mono text-[#34D399]">
                      {formatINR(client.advancePaid)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-[#94A3B8]">Pending Balance</div>
                    <div className="text-base font-extrabold font-mono text-amber-400">
                      {formatINR(pending)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-[#94A3B8]">Delivery & Approvals</div>
                    <div className="text-base font-extrabold font-mono text-[#60A5FA]">
                      {prog.percent}% · {prog.approvedCheckpointsCount}/5 Approved
                    </div>
                  </div>
                </div>
              </div>

              {/* 9-TAB NAVIGATION BAR (Part 3 Client 360° Workspace) */}
              <div className="px-4 bg-[#F8F9FA] border-b border-[#EAECEF] flex items-center gap-0.5 overflow-x-auto no-scrollbar shrink-0">
                {[
                  { id: 'overview', label: '1. Overview', icon: Users },
                  {
                    id: 'projects',
                    label: `2. Projects (${prog.completedMilestones}/6)`,
                    icon: Layers,
                  },
                  {
                    id: 'payments',
                    label: `3. Payments & Invoices (${clientPayments.length})`,
                    icon: CreditCard,
                  },
                  {
                    id: 'tasks',
                    label: `4. Tasks (${clientTasks.length})`,
                    icon: CheckSquare,
                  },
                  {
                    id: 'meta-ads',
                    label: `5. Marketing (${clientCampaigns.length})`,
                    icon: Megaphone,
                  },
                  {
                    id: 'domains',
                    label: `6. Domains (${clientDomains.length})`,
                    icon: Globe,
                  },
                  {
                    id: 'files',
                    label: `7. Vault & Docs (${clientVaultItems.length})`,
                    icon: ShieldCheck,
                  },
                  {
                    id: 'communication',
                    label: `8. Comms (${commLogs.length})`,
                    icon: PhoneCall,
                  },
                  {
                    id: 'activity',
                    label: `9. Activity (${clientActivityLogs.length})`,
                    icon: Activity,
                  },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const active = active360Tab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActive360Tab(tab.id as Client360Tab)}
                      className={`flex items-center gap-1.5 px-3 py-3 border-b-2 text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                        active
                          ? 'border-[#2563EB] text-[#2563EB] bg-white'
                          : 'border-transparent text-[#64748B] hover:text-[#0B0F19]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* TAB CONTENT AREA */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
                {/* TAB 1: OVERVIEW */}
                {active360Tab === 'overview' && draftOverview && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      onUpdateClient(draftOverview);
                      setOverviewSavedNotice(true);
                      setTimeout(() => setOverviewSavedNotice(false), 2500);
                    }}
                    className="space-y-5"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-[#475569] mb-1">
                          Business Name
                        </label>
                        <input
                          type="text"
                          value={draftOverview.businessName}
                          onChange={(e) =>
                            setDraftOverview({ ...draftOverview, businessName: e.target.value })
                          }
                          className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-[#475569] mb-1">
                          Pipeline Stage
                        </label>
                        <select
                          value={draftOverview.stage}
                          onChange={(e) =>
                            setDraftOverview({
                              ...draftOverview,
                              stage: e.target.value as LeadStage,
                            })
                          }
                          className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm font-bold bg-white"
                        >
                          {STAGES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-[#475569] mb-1">
                          Lead Source
                        </label>
                        <select
                          value={draftOverview.leadSource || 'Direct Outreach'}
                          onChange={(e) =>
                            setDraftOverview({
                              ...draftOverview,
                              leadSource: e.target.value as LeadSource,
                            })
                          }
                          className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm bg-white"
                        >
                          {ALL_LEAD_SOURCES.map((src) => (
                            <option key={src} value={src}>
                              {src}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-[#475569] mb-1">
                          Contact Person
                        </label>
                        <input
                          type="text"
                          value={draftOverview.contactPerson}
                          onChange={(e) =>
                            setDraftOverview({
                              ...draftOverview,
                              contactPerson: e.target.value,
                            })
                          }
                          className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-[#475569] mb-1">
                          WhatsApp Phone
                        </label>
                        <input
                          type="text"
                          value={draftOverview.phone}
                          onChange={(e) =>
                            setDraftOverview({ ...draftOverview, phone: e.target.value })
                          }
                          className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-[#475569] mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={draftOverview.email || ''}
                          onChange={(e) =>
                            setDraftOverview({ ...draftOverview, email: e.target.value })
                          }
                          placeholder="owner@business.com"
                          className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold uppercase text-[#475569] mb-1">
                          Custom Service Scope / Package
                        </label>
                        <input
                          type="text"
                          value={draftOverview.packageTier}
                          onChange={(e) =>
                            setDraftOverview({ ...draftOverview, packageTier: e.target.value })
                          }
                          className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-[#475569] mb-1">
                          Final Agreed Price (₹)
                        </label>
                        <input
                          type="number"
                          value={draftOverview.finalAgreedPrice}
                          onChange={(e) =>
                            setDraftOverview({
                              ...draftOverview,
                              finalAgreedPrice: Number(e.target.value),
                            })
                          }
                          className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-[#475569] mb-1">
                          Assigned Co-Founder
                        </label>
                        <select
                          value={draftOverview.assignedTo}
                          onChange={(e) =>
                            setDraftOverview({
                              ...draftOverview,
                              assignedTo: e.target.value as FounderName,
                            })
                          }
                          className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm bg-white"
                        >
                          <option value="Krishna">Krishna Khakole</option>
                          <option value="Vansh">Vansh Khakole</option>
                          <option value="Both">Both Founders</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-[#475569] mb-1">
                          Project Start Date
                        </label>
                        <input
                          type="date"
                          value={draftOverview.projectStartDate || draftOverview.createdAt}
                          onChange={(e) =>
                            setDraftOverview({
                              ...draftOverview,
                              projectStartDate: e.target.value,
                            })
                          }
                          className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-[#475569] mb-1">
                          Target Completion Date
                        </label>
                        <input
                          type="date"
                          value={draftOverview.projectEndDate || draftOverview.followUpDate}
                          onChange={(e) =>
                            setDraftOverview({
                              ...draftOverview,
                              projectEndDate: e.target.value,
                            })
                          }
                          className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-[#475569] mb-1">
                        Client Executive Summary & Scope Notes
                      </label>
                      <textarea
                        rows={3}
                        value={draftOverview.notes}
                        onChange={(e) =>
                          setDraftOverview({ ...draftOverview, notes: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div>
                        {overviewSavedNotice && (
                          <span className="text-xs font-bold text-[#059669] flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> Client details saved & synced across all modules.
                          </span>
                        )}
                      </div>
                      <button
                        type="submit"
                        className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold shadow-xs cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" /> Save Client Details
                      </button>
                    </div>
                  </form>
                )}

                {/* TAB 2: PROJECTS, TEMPLATES, SUBTASKS & CLIENT APPROVAL CHECKPOINTS */}
                {active360Tab === 'projects' && (
                  <div className="space-y-6">
                    {/* Project Template Selector (Part 4) */}
                    <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB]">
                          STANDARDIZED AGENCY WORKFLOW TEMPLATE
                        </div>
                        <div className="text-xs font-bold text-[#0B0F19]">
                          Apply 1-Click Package Template & Granular Subtasks
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {PROJECT_TEMPLATES.map((tpl) => (
                          <button
                            key={tpl}
                            onClick={() =>
                              onApplyProjectTemplate && onApplyProjectTemplate(client.id, tpl)
                            }
                            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer ${
                              client.projectTemplate === tpl
                                ? 'bg-[#0B0F19] text-white border-[#0B0F19]'
                                : 'bg-white text-[#475569] border-[#EAECEF] hover:border-[#2563EB]'
                            }`}
                          >
                            {tpl.replace(' Package', '')}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 5 Client Approval Checkpoints (Part 4) */}
                    <div className="p-5 rounded-2xl bg-white border border-[#EAECEF] space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB] flex items-center gap-1">
                            <Award className="w-3.5 h-3.5" /> CLIENT SIGN-OFF GATES
                          </div>
                          <h4 className="text-sm font-extrabold text-[#0B0F19]">
                            Client Approval Checkpoints ({prog.approvedCheckpointsCount}/5 Approved)
                          </h4>
                        </div>
                        <span className="text-[11px] text-[#64748B]">Click any gate to record sign-off</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                        {(client.approvals || []).map((app) => (
                          <button
                            key={app.stage}
                            onClick={() =>
                              onToggleApprovalCheckpoint &&
                              onToggleApprovalCheckpoint(client.id, app.stage)
                            }
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              app.approved
                                ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#059669]'
                                : 'bg-[#F8F9FA] border-[#EAECEF] text-[#64748B] hover:border-[#2563EB]'
                            }`}
                          >
                            <div className="text-[10px] font-mono font-bold uppercase">
                              {app.approved ? '✓ APPROVED' : 'AWAITING'}
                            </div>
                            <div className="text-xs font-extrabold text-[#0B0F19] mt-0.5">
                              {app.stage}
                            </div>
                            {app.approvedDate && (
                              <div className="text-[10px] font-mono text-[#059669] mt-0.5">
                                {app.approvedDate}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 6-Stage Milestones + Granular Subtasks */}
                    <div className="p-5 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF] space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB]">
                            6-STAGE DELIVERY PIPELINE & SUBTASKS
                          </div>
                          <h3 className="text-base font-extrabold text-[#0B0F19]">
                            {client.packageTier}
                          </h3>
                        </div>
                        <span className="text-sm font-mono font-extrabold text-[#2563EB]">
                          {prog.percent}% Complete
                        </span>
                      </div>

                      <div className="w-full h-2.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#2563EB] transition-all duration-300"
                          style={{ width: `${prog.percent}%` }}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(client.milestones || []).map((m, idx) => (
                          <div
                            key={m.stage}
                            className={`p-3.5 rounded-2xl border transition-all ${
                              m.completed
                                ? 'bg-[#ECFDF5]/60 border-[#A7F3D0]'
                                : 'bg-white border-[#EAECEF]'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <span className="text-[10px] font-mono text-[#64748B]">
                                  STAGE 0{idx + 1}
                                </span>
                                <div className="text-xs font-extrabold text-[#0B0F19]">
                                  {m.stage}
                                </div>
                              </div>
                              <button
                                onClick={() => onToggleMilestone(client.id, m.stage)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold cursor-pointer ${
                                  m.completed
                                    ? 'bg-[#059669] text-white'
                                    : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#2563EB] hover:text-white'
                                }`}
                              >
                                {m.completed ? '✓ COMPLETED' : 'Mark Stage Done'}
                              </button>
                            </div>

                            {/* Subtasks */}
                            {m.subtasks && m.subtasks.length > 0 && (
                              <div className="space-y-1.5 pt-2 border-t border-[#EAECEF]/80">
                                {m.subtasks.map((st) => (
                                  <label
                                    key={st.id}
                                    className="flex items-center gap-2 text-[11px] cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={st.completed}
                                      onChange={() =>
                                        onToggleMilestoneSubtask &&
                                        onToggleMilestoneSubtask(client.id, m.stage, st.id)
                                      }
                                      className="w-3.5 h-3.5 accent-[#2563EB]"
                                    />
                                    <span
                                      className={
                                        st.completed
                                          ? 'line-through text-[#94A3B8]'
                                          : 'text-[#334155] font-medium'
                                      }
                                    >
                                      {st.title}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Linked Revision / Delivery Tickets */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#475569]">
                        Revision & Bug Tickets ({clientTickets.length})
                      </h4>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={quickTicketTitle}
                          onChange={(e) => setQuickTicketTitle(e.target.value)}
                          placeholder="Add a revision or delivery ticket for this client..."
                          className="flex-1 px-3.5 py-2 rounded-xl border border-[#EAECEF] text-xs"
                        />
                        <button
                          onClick={() => {
                            if (!quickTicketTitle.trim()) return;
                            onAddTicket({
                              id: `tkt-${Date.now()}`,
                              clientId: client.id,
                              clientName: client.businessName,
                              domainName: clientDomains[0]?.domainName || 'staging.vercel.app',
                              title: quickTicketTitle.trim(),
                              category: 'Copy/Image Update',
                              priority: 'High',
                              status: 'Open',
                              assignedTo: client.assignedTo,
                              dueDate: new Date(Date.now() + 2 * 86400000)
                                .toISOString()
                                .slice(0, 10),
                              description: 'Created from Client 360° Projects tab.',
                              createdAt: new Date().toISOString().slice(0, 10),
                            });
                            setQuickTicketTitle('');
                          }}
                          className="px-4 py-2 rounded-xl bg-[#0B0F19] text-white text-xs font-bold cursor-pointer"
                        >
                          + Add Ticket
                        </button>
                      </div>

                      {clientTickets.map((tkt) => (
                        <div
                          key={tkt.id}
                          className="p-3.5 rounded-2xl border border-[#EAECEF] flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-bold text-[#0B0F19]">{tkt.title}</div>
                            <div className="text-[11px] text-[#64748B]">
                              {tkt.category} · Priority: {tkt.priority} · Due: {tkt.dueDate}
                            </div>
                          </div>
                          <span className="font-mono font-bold text-[#2563EB]">{tkt.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 3: 09. CLIENT FINANCIAL PROFILE, LEDGER & STATEMENT OF ACCOUNT */}
                {active360Tab === 'payments' && (() => {
                  const finProfile = calculateClientFinancialProfile(client, dbState);
                  return (
                    <div className="space-y-6">
                      {/* Client Financial Summary Header & Statement of Account PDF Button */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F8F9FA] border border-[#EAECEF] rounded-2xl p-4">
                        <div>
                          <div className="text-[10px] font-mono uppercase tracking-widest text-[#2563EB] font-bold">
                            09. CLIENT FINANCIAL PROFILE & LEDGER
                          </div>
                          <h4 className="text-sm font-extrabold text-[#0B0F19]">
                            {client.businessName} — Statement of Account
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const { formatted: statementNo } = generateNextDocumentNumber(
                              'Statement',
                              dbState
                            );
                            const snap = createDocumentSnapshot(
                              'Statement of Account',
                              statementNo,
                              client.businessName,
                              finProfile.outstandingBalance,
                              'Finalized',
                              finProfile as unknown as Record<string, unknown>,
                              {
                                clientId: client.id,
                                projectTitle: client.packageTier,
                                templateId: dbState.financeSettings?.defaultTemplateId,
                                existingDocuments: dbState.generatedDocuments || [],
                              }
                            );
                            setPreviewStatementDoc(snap);
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0B0F19] hover:bg-[#1E293B] text-white text-xs font-bold cursor-pointer shadow-xs"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#60A5FA]" />
                          Generate Statement of Account PDF
                        </button>
                      </div>

                      {/* 5 Client Financial Profile Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <div className="p-3.5 rounded-2xl bg-white border border-[#EAECEF]">
                          <div className="text-[10px] font-mono uppercase text-[#64748B]">
                            Project Value
                          </div>
                          <div className="text-sm font-mono font-extrabold text-[#0B0F19] mt-1">
                            {formatINR(finProfile.totalProjectValue)}
                          </div>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-white border border-[#EAECEF]">
                          <div className="text-[10px] font-mono uppercase text-[#64748B]">
                            Total Invoiced
                          </div>
                          <div className="text-sm font-mono font-extrabold text-[#2563EB] mt-1">
                            {formatINR(finProfile.totalInvoiced)}
                          </div>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-white border border-[#EAECEF]">
                          <div className="text-[10px] font-mono uppercase text-[#64748B]">
                            Total Received
                          </div>
                          <div className="text-sm font-mono font-extrabold text-[#059669] mt-1">
                            {formatINR(finProfile.totalReceived)}
                          </div>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-white border border-[#EAECEF]">
                          <div className="text-[10px] font-mono uppercase text-[#64748B]">
                            Outstanding
                          </div>
                          <div className="text-sm font-mono font-extrabold text-[#D97706] mt-1">
                            {formatINR(finProfile.outstandingBalance)}
                          </div>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-white border border-[#EAECEF] col-span-2 sm:col-span-1">
                          <div className="text-[10px] font-mono uppercase text-[#64748B]">
                            Direct Expenses
                          </div>
                          <div className="text-sm font-mono font-extrabold text-[#E11D48] mt-1">
                            {formatINR(finProfile.directExpensesTotal)}
                          </div>
                        </div>
                      </div>

                      {/* Quick Record Payment Box */}
                      <div className="p-5 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF] space-y-3">
                        <div className="text-xs font-bold text-[#0B0F19]">
                          Record New Payment for {client.businessName}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                          <input
                            type="number"
                            value={quickPayAmount}
                            onChange={(e) => setQuickPayAmount(Number(e.target.value))}
                            placeholder="Amount (₹)"
                            className="px-3 py-2 rounded-xl border border-[#EAECEF] bg-white text-xs font-mono font-bold"
                          />
                          <select
                            value={quickPayMode}
                            onChange={(e) =>
                              setQuickPayMode(e.target.value as ClientPayment['paymentMode'])
                            }
                            className="px-3 py-2 rounded-xl border border-[#EAECEF] bg-white text-xs"
                          >
                            <option value="UPI">UPI</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Cash">Cash</option>
                            <option value="Other">Other</option>
                          </select>
                          <select
                            value={quickPayAccount}
                            onChange={(e) =>
                              setQuickPayAccount(e.target.value as ExpensePaidBy)
                            }
                            className="px-3 py-2 rounded-xl border border-[#EAECEF] bg-white text-xs"
                          >
                            <option value="Studio Account">Studio Account</option>
                            <option value="Krishna">Krishna Account</option>
                            <option value="Vansh">Vansh Account</option>
                          </select>
                          <button
                            onClick={() => {
                              if (quickPayAmount <= 0) return;
                              const { formatted: receiptNo } = generateNextDocumentNumber(
                                'Receipt',
                                dbState
                              );
                              onAddPayment({
                                id: `pay-${Date.now()}`,
                                receiptNumber: receiptNo,
                                clientId: client.id,
                                clientName: client.businessName,
                                projectTitle: `${client.packageTier} — Milestone Payment`,
                                totalProjectValue: client.finalAgreedPrice,
                                amountReceived: Number(quickPayAmount),
                                paymentDate: new Date().toISOString().slice(0, 10),
                                paymentMode: quickPayMode,
                                receivedInAccount: quickPayAccount,
                                milestone:
                                  client.advancePaid + quickPayAmount >= client.finalAgreedPrice
                                    ? 'Final Delivery (50%)'
                                    : 'Advance (50%)',
                              });
                            }}
                            className="px-4 py-2 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold cursor-pointer"
                          >
                            + Record Inflow
                          </button>
                        </div>
                      </div>

                      {/* Derived Client Ledger (Date | Reference | Description | Debit | Credit | Balance) */}
                      <div className="space-y-2.5">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#475569]">
                          Derived Client Ledger (Debit / Credit / Running Balance)
                        </h4>
                        <div className="border border-[#EAECEF] rounded-2xl overflow-hidden bg-white">
                          {finProfile.ledger.length === 0 ? (
                            <div className="p-6 text-center text-xs text-[#64748B]">
                              No invoice or payment entries recorded yet for this client.
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                  <tr className="bg-[#F8F9FA] border-b border-[#EAECEF] font-mono text-[10px] uppercase text-[#64748B]">
                                    <th className="py-2.5 px-3">Date</th>
                                    <th className="py-2.5 px-3">Ref #</th>
                                    <th className="py-2.5 px-3">Description</th>
                                    <th className="py-2.5 px-3 text-right">Debit (Invoiced)</th>
                                    <th className="py-2.5 px-3 text-right">Credit (Paid)</th>
                                    <th className="py-2.5 px-3 text-right">Balance</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#F1F5F9]">
                                  {finProfile.ledger.map((row) => (
                                    <tr key={row.id} className="hover:bg-[#F8F9FA]">
                                      <td className="py-2.5 px-3 font-mono text-[11px] text-[#475569] whitespace-nowrap">
                                        {row.date}
                                      </td>
                                      <td className="py-2.5 px-3 font-mono font-bold text-[#2563EB] whitespace-nowrap">
                                        {row.referenceNumber}
                                      </td>
                                      <td className="py-2.5 px-3 text-[#0B0F19]">
                                        {row.description}
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-mono text-[#0B0F19] whitespace-nowrap">
                                        {row.debit > 0 ? formatINR(row.debit) : '—'}
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[#059669] whitespace-nowrap">
                                        {row.credit > 0 ? formatINR(row.credit) : '—'}
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-mono font-extrabold text-[#0B0F19] whitespace-nowrap">
                                        {formatINR(row.balance)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Auto-Synced Client Invoices */}
                      {finProfile.invoices.length > 0 && (
                        <div className="space-y-2.5">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-[#475569]">
                            Client Invoices ({finProfile.invoices.length})
                          </h4>
                          {finProfile.invoices.map((inv) => (
                            <div
                              key={inv.id}
                              className="p-3.5 rounded-2xl border border-[#EAECEF] bg-[#FAFBFC] flex items-center justify-between text-xs"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-extrabold text-[#2563EB]">
                                    {inv.invoiceNumber}
                                  </span>
                                  <span className="font-bold text-[#0B0F19]">
                                    {inv.projectTitle}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      inv.status === 'Paid'
                                        ? 'bg-[#D1FAE5] text-[#059669]'
                                        : inv.status === 'Overdue'
                                        ? 'bg-[#FFE4E6] text-[#E11D48]'
                                        : 'bg-[#FEF3C7] text-[#D97706]'
                                    }`}
                                  >
                                    {inv.status}
                                  </span>
                                </div>
                                <div className="text-[11px] text-[#64748B] mt-0.5">
                                  Paid: {formatINR(inv.amountPaid || 0)} · Due:{' '}
                                  {formatINR(inv.balanceDue ?? inv.amount)}
                                </div>
                              </div>
                              <span className="font-mono font-extrabold text-[#0B0F19] text-sm">
                                {formatINR(inv.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="space-y-2.5">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#475569]">
                          Verified Payment History ({finProfile.payments.length})
                        </h4>
                        {finProfile.payments.length === 0 ? (
                          <div className="p-6 text-center text-xs text-[#64748B] border border-[#EAECEF] rounded-2xl">
                            No payments recorded yet for this client.
                          </div>
                        ) : (
                          finProfile.payments.map((pay) => (
                            <div
                              key={pay.id}
                              className="p-3.5 rounded-2xl border border-[#EAECEF] flex items-center justify-between text-xs"
                            >
                              <div>
                                <div className="font-bold text-[#0B0F19]">
                                  {pay.receiptNumber ? `${pay.receiptNumber} · ` : ''}
                                  {pay.projectTitle}
                                </div>
                                <div className="text-[11px] text-[#64748B]">
                                  {pay.paymentDate} · {pay.paymentMode} · Received by:{' '}
                                  <strong>{pay.receivedInAccount}</strong>
                                </div>
                              </div>
                              <span className="font-mono font-extrabold text-[#059669] text-sm">
                                +{formatINR(pay.amountReceived)}
                              </span>
                            </div>
                          ))
                        )}
                      </div>

                      {previewStatementDoc && (
                        <DocumentPreviewModal
                          document={previewStatementDoc}
                          allDocuments={dbState.generatedDocuments || []}
                          settings={dbState.financeSettings}
                          templates={dbState.documentTemplates}
                          payments={dbState.payments}
                          clientPhone={client.phone}
                          onClose={() => setPreviewStatementDoc(null)}
                        />
                      )}
                    </div>
                  );
                })()}

                {/* TAB 4: TASKS */}
                {active360Tab === 'tasks' && (
                  <div className="space-y-5">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={quickTaskTitle}
                        onChange={(e) => setQuickTaskTitle(e.target.value)}
                        placeholder="Schedule a follow-up call, invoice reminder, or milestone check..."
                        className="flex-1 px-3.5 py-2 rounded-xl border border-[#EAECEF] text-xs"
                      />
                      <input
                        type="date"
                        value={quickTaskDue}
                        onChange={(e) => setQuickTaskDue(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-[#EAECEF] text-xs font-mono"
                      />
                      <button
                        onClick={() => {
                          if (!quickTaskTitle.trim()) return;
                          onAddTask({
                            id: `tsk-${Date.now()}`,
                            clientId: client.id,
                            clientName: client.businessName,
                            title: quickTaskTitle.trim(),
                            type: 'Follow-up',
                            category: 'Client Communication',
                            recurrence: 'None',
                            priority: 'High',
                            status: 'Pending',
                            assignedTo: client.assignedTo,
                            dueDate: quickTaskDue,
                            notes: '',
                            createdAt: new Date().toISOString().slice(0, 10),
                          });
                          setQuickTaskTitle('');
                        }}
                        className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-bold cursor-pointer"
                      >
                        + Add Task
                      </button>
                    </div>

                    <div className="space-y-2">
                      {clientTasks.length === 0 ? (
                        <div className="p-6 text-center text-xs text-[#64748B] border border-[#EAECEF] rounded-2xl">
                          No tasks scheduled for {client.businessName}.
                        </div>
                      ) : (
                        clientTasks.map((tsk) => (
                          <div
                            key={tsk.id}
                            className="p-3.5 rounded-2xl border border-[#EAECEF] flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={tsk.status === 'Completed'}
                                onChange={() => onToggleTaskStatus(tsk.id)}
                                className="w-4 h-4 accent-[#2563EB] cursor-pointer"
                              />
                              <div>
                                <div
                                  className={`font-bold ${
                                    tsk.status === 'Completed'
                                      ? 'line-through text-[#94A3B8]'
                                      : 'text-[#0B0F19]'
                                  }`}
                                >
                                  {tsk.title}
                                </div>
                                <div className="text-[11px] text-[#64748B]">
                                  {tsk.category || tsk.type} · Assigned: {tsk.assignedTo} · Due:{' '}
                                  {tsk.dueDate}
                                </div>
                              </div>
                            </div>
                            <span className="font-mono text-[11px] font-bold text-[#475569]">
                              {tsk.status}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 5: MARKETING (META ADS) */}
                {active360Tab === 'meta-ads' && (
                  <div className="space-y-5">
                    <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF] space-y-3">
                      <div className="text-xs font-bold text-[#0B0F19]">
                        Launch Meta Ad Campaign for {client.businessName}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <input
                          type="text"
                          value={quickCampaignName}
                          onChange={(e) => setQuickCampaignName(e.target.value)}
                          placeholder="Campaign title..."
                          className="sm:col-span-2 px-3 py-2 rounded-xl border border-[#EAECEF] bg-white text-xs"
                        />
                        <input
                          type="number"
                          value={quickCampaignBudget}
                          onChange={(e) => setQuickCampaignBudget(Number(e.target.value))}
                          placeholder="Ad Budget (₹)"
                          className="px-3 py-2 rounded-xl border border-[#EAECEF] bg-white text-xs font-mono"
                        />
                        <button
                          onClick={() => {
                            if (!quickCampaignName.trim()) return;
                            onAddCampaign({
                              id: `meta-${Date.now()}`,
                              clientId: client.id,
                              clientName: client.businessName,
                              campaignName: quickCampaignName.trim(),
                              objective: 'WhatsApp Messages',
                              status: 'Active',
                              totalBudget: quickCampaignBudget,
                              amountSpent: quickCampaignBudget,
                              agencyFee: quickCampaignFee,
                              leadsGenerated: 0,
                              startDate: new Date().toISOString().slice(0, 10),
                              endDate: new Date(Date.now() + 30 * 86400000)
                                .toISOString()
                                .slice(0, 10),
                              notes: 'Launched from Client 360° profile.',
                            });
                            setQuickCampaignName('');
                          }}
                          className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-bold cursor-pointer"
                        >
                          + Launch Ad
                        </button>
                      </div>
                    </div>

                    {clientCampaigns.length === 0 ? (
                      <div className="p-6 text-center text-xs text-[#64748B] border border-[#EAECEF] rounded-2xl">
                        No Meta Ad campaigns linked to {client.businessName}.
                      </div>
                    ) : (
                      clientCampaigns.map((camp) => (
                        <div
                          key={camp.id}
                          className="p-4 rounded-2xl border border-[#EAECEF] space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-bold text-[#0B0F19]">{camp.campaignName}</div>
                            <span className="font-mono font-bold text-[#059669]">
                              {camp.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[#F1F5F9] font-mono">
                            <div>
                              <span className="text-[10px] text-[#64748B] block">Ad Budget</span>
                              {formatINR(camp.totalBudget)}
                            </div>
                            <div>
                              <span className="text-[10px] text-[#64748B] block">Spent</span>
                              {formatINR(camp.amountSpent)}
                            </div>
                            <div>
                              <span className="text-[10px] text-[#64748B] block">Leads / CPL</span>
                              {camp.leadsGenerated} ({formatINR(calculateCPL(camp.amountSpent, camp.leadsGenerated))})
                            </div>
                            <div>
                              <span className="text-[10px] text-[#64748B] block">Agency Fee</span>
                              {formatINR(camp.agencyFee)}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* TAB 6: DOMAINS & HOSTING */}
                {active360Tab === 'domains' && (
                  <div className="space-y-5">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={quickDomainName}
                        onChange={(e) => setQuickDomainName(e.target.value)}
                        placeholder="e.g., clientbusiness.in"
                        className="flex-1 px-3.5 py-2 rounded-xl border border-[#EAECEF] text-xs font-mono"
                      />
                      <button
                        onClick={() => {
                          if (!quickDomainName.trim()) return;
                          const clean = quickDomainName.trim().replace(/^https?:\/\//, '');
                          onAddWebsite({
                            id: `web-${Date.now()}`,
                            clientId: client.id,
                            clientName: client.businessName,
                            domainName: clean,
                            liveUrl: `https://${clean}`,
                            registrar: 'Hostinger',
                            hostingPlatform: 'Vercel',
                            purchaseDate: new Date().toISOString().slice(0, 10),
                            expiryDate: new Date(Date.now() + 365 * 86400000)
                              .toISOString()
                              .slice(0, 10),
                            renewalCostINR: 1499,
                            sslStatus: 'Active',
                            siteStatus: 'Online',
                            githubRepo: `aethel-studios/${clean.split('.')[0]}`,
                            notes: 'Linked via Client 360° profile.',
                          });
                          setQuickDomainName('');
                        }}
                        className="px-4 py-2 rounded-xl bg-[#0B0F19] text-white text-xs font-bold cursor-pointer"
                      >
                        + Link Domain
                      </button>
                    </div>

                    {clientDomains.length === 0 ? (
                      <div className="p-6 text-center text-xs text-[#64748B] border border-[#EAECEF] rounded-2xl">
                        No custom domains linked yet. Staging preview: {client.sampleLinkSent || 'None'}
                      </div>
                    ) : (
                      clientDomains.map((dom) => (
                        <div
                          key={dom.id}
                          className="p-4 rounded-2xl border border-[#EAECEF] flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-mono font-bold text-[#0B0F19] text-sm">
                              {dom.domainName}
                            </div>
                            <div className="text-[11px] text-[#64748B]">
                              {dom.registrar} · {dom.hostingPlatform} · SSL: {dom.sslStatus} · Uptime:{' '}
                              {dom.uptimePercent || 99.98}% · Expires in{' '}
                              {calculateDaysUntilExpiry(dom.expiryDate)} days
                            </div>
                          </div>
                          <a
                            href={dom.liveUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-[#EFF6FF] text-[#2563EB] font-bold flex items-center gap-1"
                          >
                            Visit <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* TAB 7: DOCUMENTS & VAULT */}
                {active360Tab === 'files' && (
                  <div className="space-y-5">
                    <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF] space-y-3">
                      <div className="text-xs font-bold text-[#0B0F19] flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-[#2563EB]" /> Staging, Proposal & Contract Links
                      </div>
                      <div className="grid grid-cols-1 gap-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-[#64748B] w-28">
                            Prototype URL:
                          </span>
                          <input
                            type="text"
                            value={client.sampleLinkSent}
                            onChange={(e) =>
                              onUpdateClient({ ...client, sampleLinkSent: e.target.value })
                            }
                            placeholder="https://client-preview.vercel.app"
                            className="flex-1 px-3 py-1.5 rounded-xl border border-[#EAECEF] bg-white text-xs font-mono"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-[#64748B] w-28">
                            Proposal Doc:
                          </span>
                          <input
                            type="text"
                            value={client.proposalUrl || ''}
                            onChange={(e) =>
                              onUpdateClient({ ...client, proposalUrl: e.target.value })
                            }
                            placeholder="https://docs.google.com/proposal..."
                            className="flex-1 px-3 py-1.5 rounded-xl border border-[#EAECEF] bg-white text-xs font-mono"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-[#64748B] w-28">
                            Signed Contract:
                          </span>
                          <input
                            type="text"
                            value={client.contractUrl || ''}
                            onChange={(e) =>
                              onUpdateClient({ ...client, contractUrl: e.target.value })
                            }
                            placeholder="https://drive.google.com/contract..."
                            className="flex-1 px-3 py-1.5 rounded-xl border border-[#EAECEF] bg-white text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#475569]">
                        Associated Encrypted Vault Credentials ({clientVaultItems.length})
                      </h4>
                      {clientVaultItems.map((v) => (
                        <div
                          key={v.id}
                          className="p-3.5 rounded-2xl border border-[#EAECEF] flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-bold text-[#0B0F19]">{v.title}</div>
                            <div className="text-[11px] text-[#64748B] font-mono">
                              {v.accountIdentifier} · {v.category}
                            </div>
                          </div>
                          <span className="font-mono text-[10px] text-[#059669] bg-[#ECFDF5] px-2.5 py-1 rounded-lg font-bold">
                            AES-256 Protected
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 8: COMMUNICATION LOG (Calls, WhatsApp, Emails, Meetings, Decisions) */}
                {active360Tab === 'communication' && (
                  <div className="space-y-5">
                    <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF] space-y-3">
                      <div className="text-xs font-bold text-[#0B0F19]">
                        Log Client Interaction or Key Decision
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <select
                          value={commType}
                          onChange={(e) =>
                            setCommType(e.target.value as ClientCommunicationLog['type'])
                          }
                          className="px-3 py-2 rounded-xl border border-[#EAECEF] bg-white text-xs font-semibold"
                        >
                          <option value="WhatsApp">WhatsApp Chat</option>
                          <option value="Call">Phone Call</option>
                          <option value="Meeting">In-Person / Zoom Meeting</option>
                          <option value="Email">Email</option>
                          <option value="Decision">Client Decision / Sign-off</option>
                        </select>
                        <input
                          type="text"
                          value={commSummary}
                          onChange={(e) => setCommSummary(e.target.value)}
                          placeholder="Summary of call, feedback, or price agreement..."
                          className="sm:col-span-2 px-3 py-2 rounded-xl border border-[#EAECEF] bg-white text-xs"
                        />
                        <button
                          onClick={() => {
                            if (!commSummary.trim()) return;
                            const newEntry = {
                              date: new Date().toISOString().slice(0, 10),
                              type: commType,
                              summary: commSummary.trim(),
                              loggedBy: commLoggedBy,
                            };
                            if (onAddCommunicationLog) {
                              onAddCommunicationLog(client.id, newEntry);
                            } else {
                              onUpdateClient({
                                ...client,
                                communicationLogs: [
                                  { id: `comm-${Date.now()}`, ...newEntry },
                                  ...(client.communicationLogs || []),
                                ],
                              });
                            }
                            setCommSummary('');
                          }}
                          className="px-4 py-2 rounded-xl bg-[#0B0F19] text-white text-xs font-bold cursor-pointer"
                        >
                          + Log Entry
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {commLogs.length === 0 ? (
                        <div className="p-6 text-center text-xs text-[#64748B] border border-[#EAECEF] rounded-2xl">
                          No communication logs recorded yet. Log calls, WhatsApp discussions, or client decisions above.
                        </div>
                      ) : (
                        commLogs.map((log) => (
                          <div
                            key={log.id}
                            className="p-3.5 rounded-2xl border border-[#EAECEF] flex items-start justify-between gap-3 text-xs"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded bg-[#EFF6FF] text-[#2563EB] text-[10px] font-bold">
                                  {log.type}
                                </span>
                                <span className="font-mono text-[11px] text-[#64748B]">
                                  {log.date}
                                </span>
                                <span className="text-[11px] text-[#64748B]">
                                  by <strong className="text-[#0B0F19]">{log.loggedBy}</strong>
                                </span>
                              </div>
                              <div className="text-[#0B0F19] font-medium mt-1">
                                {log.summary}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 9: ACTIVITY TIMELINE */}
                {active360Tab === 'activity' && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#475569]">
                      Chronological Client Audit Stream ({clientActivityLogs.length})
                    </h4>
                    {clientActivityLogs.length === 0 ? (
                      <div className="p-6 text-center text-xs text-[#64748B] border border-[#EAECEF] rounded-2xl">
                        All future milestone updates, payment inflows, and stage changes for {client.businessName} appear here automatically.
                      </div>
                    ) : (
                      clientActivityLogs.map((log) => (
                        <div
                          key={log.id}
                          className="p-3.5 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF] flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-[#0B0F19]">{log.actor}</span>{' '}
                            <span className="text-[#475569]">{log.action}</span>
                          </div>
                          <span className="font-mono text-[11px] text-[#64748B]">
                            {new Date(log.timestamp).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-4 px-6 bg-[#F8F9FA] border-t border-[#EAECEF] flex items-center justify-between">
                <span className="text-[11px] text-[#64748B]">
                  All changes auto-sync with Finance, Projects & Cloud Database.
                </span>
                <button
                  onClick={() => onSelectClient360(null)}
                  className="px-5 py-2 rounded-xl bg-[#0B0F19] text-white text-xs font-bold cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
