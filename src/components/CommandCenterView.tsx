import React from 'react';
import {
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  Globe,
  Megaphone,
  TrendingUp,
  Users,
  Wallet,
  Wrench,
  MessageSquare,
  Plus,
  Sparkles,
  CheckSquare,
  Activity,
  Layers,
  ChevronRight,
} from 'lucide-react';
import {
  AethelDatabaseState,
  FounderName,
  ModuleId,
  ProjectMilestoneStage,
} from '../types';
import {
  calculateClientProjectProgress,
  calculateDaysUntilExpiry,
  calculatePendingBalance,
  calculateStudioFinances,
  formatINR,
} from '../utils/calculations';

interface CommandCenterViewProps {
  dbState: AethelDatabaseState;
  onNavigate: (module: ModuleId) => void;
  onOpenQuickAction: () => void;
  activeFounderFilter: 'All' | FounderName;
  onChangeFounderFilter: (f: 'All' | FounderName) => void;
  onOpenClient360: (clientId: string) => void;
  onToggleMilestone: (clientId: string, stage: ProjectMilestoneStage) => void;
  onToggleTaskStatus: (taskId: string) => void;
}

export const CommandCenterView: React.FC<CommandCenterViewProps> = ({
  dbState,
  onNavigate,
  onOpenQuickAction,
  activeFounderFilter,
  onChangeFounderFilter,
  onOpenClient360,
  onToggleMilestone,
  onToggleTaskStatus,
}) => {
  const matchesFounder = (owner: FounderName) => {
    if (activeFounderFilter === 'All') return true;
    return owner === activeFounderFilter || owner === 'Both';
  };

  // Canonical Financial Engine — 100% identical to CRM & Finance Ledger
  const finances = calculateStudioFinances(
    dbState.expenses,
    dbState.payments,
    dbState.clients,
    dbState.metaCampaigns,
    dbState.tickets,
    dbState.tasks || []
  );

  const filteredClients = dbState.clients.filter((c) => matchesFounder(c.assignedTo));
  const filteredTickets = dbState.tickets.filter((t) => matchesFounder(t.assignedTo));
  const filteredTasks = (dbState.tasks || []).filter((t) => matchesFounder(t.assignedTo));

  const activeClients = filteredClients.filter(
    (c) =>
      c.stage === 'In Building' ||
      c.stage === 'Live / Payment Pending' ||
      c.stage === 'Delivered / Live'
  );

  const activeBuildProjects = filteredClients.filter(
    (c) => c.stage === 'In Building' || c.stage === 'Live / Payment Pending'
  );

  const openTickets = filteredTickets.filter((t) => t.status !== 'Resolved');
  const pendingTasks = filteredTasks.filter((t) => t.status !== 'Completed');

  const expiringDomains = dbState.websites.filter(
    (w) => calculateDaysUntilExpiry(w.expiryDate) <= 45
  );

  // Build unified "Today's Priorities" table rows
  interface PriorityRow {
    id: string;
    priority: 'Urgent' | 'High' | 'Normal';
    taskTitle: string;
    categoryBadge: string;
    clientName: string;
    clientId?: string;
    assignedTo: FounderName;
    deadline: string;
    phone?: string;
    taskId?: string;
    actionLabel: string;
    onAction: () => void;
  }

  const priorityRows: PriorityRow[] = [];

  // 1. Live / Payment Pending clients (Highest financial priority, if not already in pendingTasks)
  filteredClients
    .filter(
      (c) =>
        c.stage === 'Live / Payment Pending' &&
        calculatePendingBalance(c.finalAgreedPrice, c.advancePaid) > 0 &&
        !pendingTasks.some(
          (t) =>
            (t.clientId === c.id ||
              t.clientName.toLowerCase() === c.businessName.toLowerCase()) &&
            t.type === 'Payment Collection'
        )
    )
    .forEach((c) => {
      const due = calculatePendingBalance(c.finalAgreedPrice, c.advancePaid);
      priorityRows.push({
        id: `prio-pay-${c.id}`,
        priority: 'Urgent',
        taskTitle: `Collect pending balance (${formatINR(due)}) — site is live`,
        categoryBadge: 'Receivable',
        clientName: c.businessName,
        clientId: c.id,
        assignedTo: c.assignedTo,
        deadline: c.followUpDate || 'Today',
        phone: c.phone,
        actionLabel: 'Collect / 360°',
        onAction: () => onOpenClient360(c.id),
      });
    });

  // 2. Pending Studio Tasks
  pendingTasks.forEach((tsk) => {
    const matchedClient = dbState.clients.find(
      (c) =>
        c.id === tsk.clientId ||
        c.businessName.toLowerCase() === tsk.clientName.toLowerCase()
    );
    priorityRows.push({
      id: `prio-tsk-${tsk.id}`,
      priority: tsk.priority,
      taskTitle: tsk.title,
      categoryBadge: tsk.type,
      clientName: tsk.clientName,
      clientId: matchedClient?.id,
      assignedTo: tsk.assignedTo,
      deadline: tsk.dueDate || 'Today',
      phone: matchedClient?.phone,
      taskId: tsk.id,
      actionLabel: matchedClient ? 'Client 360°' : 'Mark Done',
      onAction: () => {
        if (matchedClient) {
          onOpenClient360(matchedClient.id);
        } else {
          onToggleTaskStatus(tsk.id);
        }
      },
    });
  });

  // 3. Open Urgent/High Revision Tickets
  openTickets.forEach((tkt) => {
    const matchedClient = dbState.clients.find(
      (c) =>
        c.id === tkt.clientId ||
        c.businessName.toLowerCase() === tkt.clientName.toLowerCase()
    );
    priorityRows.push({
      id: `prio-tkt-${tkt.id}`,
      priority: tkt.priority === 'Urgent' ? 'Urgent' : 'High',
      taskTitle: `${tkt.title} (${tkt.domainName})`,
      categoryBadge: tkt.category,
      clientName: tkt.clientName,
      clientId: matchedClient?.id,
      assignedTo: tkt.assignedTo,
      deadline: tkt.dueDate,
      actionLabel: matchedClient ? 'Client 360°' : 'Open Ticket',
      onAction: () => {
        if (matchedClient) {
          onOpenClient360(matchedClient.id);
        } else {
          onNavigate('tickets');
        }
      },
    });
  });

  const formattedToday = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const activityLogs = (dbState.activityLogs || []).slice(0, 8);

  return (
    <div className="space-y-6">
      {/* SECTION A — WELCOME HEADER & FOUNDER LENS */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 bg-white rounded-3xl p-5 sm:p-6 border border-[#EAECEF] shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)]">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#2563EB] mb-1">
            <span>WORKSPACE OVERVIEW</span>
            <span className="text-[#CBD5E1]">·</span>
            <span className="font-mono text-[#64748B]">{formattedToday}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B0F19]">
            Good day, {activeFounderFilter === 'All' ? 'Krishna & Vansh' : activeFounderFilter}
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Here is what needs your attention across Aethel Studios today. Click any client or priority to open their unified 360° dossier.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Founder Filter Pill */}
          <div className="inline-flex items-center bg-[#F8F9FA] border border-[#EAECEF] rounded-xl p-1">
            {(['All', 'Krishna', 'Vansh'] as const).map((f) => (
              <button
                key={f}
                onClick={() => onChangeFounderFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeFounderFilter === f
                    ? 'bg-[#0B0F19] text-white shadow-2xs'
                    : 'text-[#64748B] hover:text-[#0B0F19]'
                }`}
              >
                {f === 'All' ? 'All Studio' : `${f}'s Queue`}
              </button>
            ))}
          </div>

          <button
            onClick={onOpenQuickAction}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Action</span>
            <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-white/20 rounded">
              Ctrl+K
            </kbd>
          </button>
        </div>
      </div>

      {/* SECTION B — 4 PRIMARY OPERATIONAL KPI CARDS (Part 2B) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Clients */}
        <div
          onClick={() => onNavigate('pipeline')}
          className="bg-white rounded-2xl p-5 border border-[#EAECEF] hover:border-[#2563EB] transition-all cursor-pointer group shadow-[0_8px_24px_-12px_rgba(11,15,25,0.05)]"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              1. Active Clients
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center group-hover:bg-[#2563EB] group-hover:text-white transition-colors">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-3xl font-extrabold font-mono text-[#0B0F19]">
              {activeClients.length}
            </div>
            <span className="text-[11px] font-semibold text-[#059669]">
              {filteredClients.length} total in CRM →
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-[#F1F5F9] text-xs text-[#64748B] space-y-1">
            <div className="flex items-center justify-between">
              <span>Confirmed Deal Volume</span>
              <span className="font-mono font-bold text-[#0B0F19]">
                {formatINR(finances.totalContractedVolume)}
              </span>
            </div>
            {finances.unclosedLeadsCount > 0 && (
              <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                <span>Unclosed Leads ({finances.unclosedLeadsCount})</span>
                <span className="font-mono font-semibold text-[#475569]">
                  {formatINR(finances.unclosedPipelineVolume)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Pending Receivables (Single Financial Source of Truth) */}
        <div
          onClick={() => onNavigate('finance')}
          className="bg-white rounded-2xl p-5 border border-[#EAECEF] hover:border-[#2563EB] transition-all cursor-pointer group shadow-[0_8px_24px_-12px_rgba(11,15,25,0.05)]"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              2. Pending Receivables
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-3xl font-extrabold font-mono text-[#0B0F19]">
              {formatINR(finances.pendingReceivables)}
            </div>
            <span className="text-[11px] font-semibold text-amber-700">
              {finances.livePaymentPendingCount} live due →
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-[#F1F5F9] text-xs text-[#64748B] flex items-center justify-between">
            <span>Verified Collected</span>
            <span className="font-mono font-bold text-[#059669]">
              {formatINR(finances.totalRevenueCollected)}
            </span>
          </div>
        </div>

        {/* Card 3: Active Projects */}
        <div
          onClick={() => onNavigate('tickets')}
          className="bg-white rounded-2xl p-5 border border-[#EAECEF] hover:border-[#2563EB] transition-all cursor-pointer group shadow-[0_8px_24px_-12px_rgba(11,15,25,0.05)]"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              3. Active Projects
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#ECFDF5] text-[#059669] flex items-center justify-center group-hover:bg-[#059669] group-hover:text-white transition-colors">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-3xl font-extrabold font-mono text-[#0B0F19]">
              {activeBuildProjects.length}
            </div>
            <span className="text-[11px] font-semibold text-[#2563EB]">
              6-stage tracker →
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-[#F1F5F9] text-xs text-[#64748B] flex items-center justify-between">
            <span>Live Hosted Sites</span>
            <span className="font-mono font-bold text-[#0B0F19]">
              {dbState.websites.filter((w) => w.siteStatus === 'Online').length} online
            </span>
          </div>
        </div>

        {/* Card 4: Outstanding Tasks & Revisions */}
        <div
          onClick={() => onNavigate('tasks')}
          className="bg-white rounded-2xl p-5 border border-[#EAECEF] hover:border-[#2563EB] transition-all cursor-pointer group shadow-[0_8px_24px_-12px_rgba(11,15,25,0.05)]"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              4. Outstanding Tasks
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-3xl font-extrabold font-mono text-[#0B0F19]">
              {pendingTasks.length + openTickets.length}
            </div>
            <span className="text-[11px] font-semibold text-rose-600">
              {openTickets.length} revisions · {pendingTasks.length} tasks →
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-[#F1F5F9] text-xs text-[#64748B] flex items-center justify-between">
            <span>Expiring Domains</span>
            <span className="font-mono font-bold text-[#0B0F19]">
              {expiringDomains.length} in 45d
            </span>
          </div>
        </div>
      </div>

      {/* UNIFIED STUDIO TREASURY STRIP (Guarantees 100% alignment between Overview, Pipeline & Finance) */}
      <div className="bg-[#0B0F19] text-white rounded-2xl p-4 sm:px-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-[#60A5FA] shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#94A3B8]">
              UNIFIED FINANCIAL LEDGER · CANONICAL SOURCE OF TRUTH
            </div>
            <div className="text-xs text-slate-300">
              Synchronized across CRM Pipeline, Client 360° Dossiers, and Studio Finance
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 pt-3 lg:pt-0 border-t lg:border-t-0 border-white/10">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[#94A3B8]">
              Agency Revenue Collected
            </div>
            <div className="text-base font-extrabold font-mono text-[#34D399]">
              {formatINR(finances.totalRevenueCollected)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[#94A3B8]">
              Studio Ops Expenses
            </div>
            <div className="text-base font-extrabold font-mono text-rose-400">
              {formatINR(finances.totalStudioExpenses)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[#94A3B8]">
              Net Studio Profit (50/50)
            </div>
            <div className="text-base font-extrabold font-mono text-white">
              {formatINR(finances.netProfit)}{' '}
              <span className="text-[10px] font-normal text-[#94A3B8]">
                ({formatINR(finances.krishnaProfitShare50)} ea)
              </span>
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[#94A3B8]">
              Client Ad Spend (Pass-Thru)
            </div>
            <div className="text-base font-extrabold font-mono text-[#60A5FA]">
              {formatINR(finances.totalClientAdSpendPassThrough)}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION C — TODAY'S PRIORITIES TABLE (Part 2C) */}
      <div className="bg-white rounded-3xl border border-[#EAECEF] shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)] overflow-hidden">
        <div className="p-5 sm:px-6 border-b border-[#EAECEF] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#2563EB]">
              ACTION QUEUE
            </div>
            <h2 className="text-lg font-extrabold text-[#0B0F19]">
              Today's Priorities & Immediate Follow-ups ({priorityRows.length})
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('tasks')}
              className="px-3 py-1.5 rounded-xl bg-[#F8F9FA] hover:bg-[#F1F5F9] text-xs font-bold text-[#0B0F19] border border-[#EAECEF] cursor-pointer"
            >
              View All Tasks
            </button>
            <button
              onClick={onOpenQuickAction}
              className="px-3 py-1.5 rounded-xl bg-[#0B0F19] hover:bg-[#1E293B] text-white text-xs font-bold cursor-pointer"
            >
              + Add Task
            </button>
          </div>
        </div>

        {priorityRows.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#64748B]">
            All priority tasks for {activeFounderFilter} are complete.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[720px]">
              <thead>
                <tr className="border-b border-[#EAECEF] bg-[#F8F9FA] text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                  <th className="py-3 px-5">Priority</th>
                  <th className="py-3 px-4">Task / Action Required</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Assigned</th>
                  <th className="py-3 px-4">Deadline</th>
                  <th className="py-3 px-5 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-xs">
                {priorityRows.slice(0, 8).map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-[#F8F9FA]/80 transition-colors group"
                  >
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 font-bold text-[11px] ${
                          row.priority === 'Urgent'
                            ? 'text-rose-600'
                            : row.priority === 'High'
                            ? 'text-amber-600'
                            : 'text-[#2563EB]'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            row.priority === 'Urgent'
                              ? 'bg-rose-600'
                              : row.priority === 'High'
                              ? 'bg-amber-500'
                              : 'bg-[#2563EB]'
                          }`}
                        />
                        {row.priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#0B0F19]">{row.taskTitle}</div>
                      <div className="text-[11px] text-[#64748B]">{row.categoryBadge}</div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {row.clientId ? (
                        <button
                          onClick={() => onOpenClient360(row.clientId!)}
                          className="font-bold text-[#2563EB] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          {row.clientName}
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      ) : (
                        <span className="font-semibold text-[#0B0F19]">{row.clientName}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-[#475569] font-medium">
                      {row.assignedTo}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-[#475569]">
                      {row.deadline}
                    </td>
                    <td className="py-3.5 px-5 whitespace-nowrap text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {row.taskId && (
                          <button
                            onClick={() => onToggleTaskStatus(row.taskId!)}
                            title="Mark task completed"
                            className="px-2.5 py-1 rounded-lg bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#059669] font-bold text-[11px] transition-colors cursor-pointer"
                          >
                            ✓ Done
                          </button>
                        )}
                        {row.phone && (
                          <a
                            href={`https://wa.me/${row.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-[#F8F9FA] hover:bg-[#ECFDF5] text-[#059669] border border-[#EAECEF] font-bold text-[11px] transition-colors"
                          >
                            WA
                          </a>
                        )}
                        <button
                          onClick={row.onAction}
                          className="px-3 py-1 rounded-lg bg-[#0B0F19] hover:bg-[#2563EB] text-white font-bold text-[11px] transition-colors cursor-pointer"
                        >
                          {row.actionLabel}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION D & E — ACTIVE PROJECTS (WITH MILESTONE PROGRESS) + RECENT ACTIVITY FEED */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SECTION D: Active Projects (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-5 sm:p-6 border border-[#EAECEF] shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#2563EB]">
                  DELIVERY ENGINE
                </div>
                <h2 className="text-lg font-extrabold text-[#0B0F19]">
                  Active Client Projects ({activeBuildProjects.length})
                </h2>
              </div>
              <button
                onClick={() => onNavigate('tickets')}
                className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-1 cursor-pointer"
              >
                All Projects & Milestones <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {activeBuildProjects.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF] text-center text-xs text-[#64748B]">
                No projects currently in active build stage for this filter. Convert a lead from the CRM Pipeline to start tracking milestones!
              </div>
            ) : (
              <div className="space-y-3.5">
                {activeBuildProjects.map((client) => {
                  const prog = calculateClientProjectProgress(
                    client,
                    dbState.tickets,
                    dbState.websites
                  );
                  const pending = calculatePendingBalance(
                    client.finalAgreedPrice,
                    client.advancePaid
                  );

                  return (
                    <div
                      key={client.id}
                      className="p-4 rounded-2xl border border-[#EAECEF] hover:border-[#2563EB]/50 bg-[#FAFBFC] transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onOpenClient360(client.id)}
                              className="text-sm font-extrabold text-[#0B0F19] hover:text-[#2563EB] transition-colors cursor-pointer text-left"
                            >
                              {client.businessName}
                            </button>
                            <span className="text-[11px] text-[#64748B]">
                              · {client.city}
                            </span>
                          </div>
                          <div className="text-xs text-[#475569] mt-0.5">
                            Service: <span className="font-semibold">{client.packageTier}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => onOpenClient360(client.id)}
                            className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#0B0F19] text-[#0B0F19] hover:text-white border border-[#EAECEF] text-xs font-bold transition-colors cursor-pointer"
                          >
                            Open Project 360°
                          </button>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-semibold text-[#475569]">
                            Progress:{' '}
                            <span className="font-mono font-bold text-[#0B0F19]">
                              {prog.percent}%
                            </span>{' '}
                            ({prog.completedMilestones}/{prog.totalMilestones} milestones)
                          </span>
                          <span className="text-[11px] font-mono text-[#2563EB] font-semibold">
                            Next: {prog.nextMilestoneLabel}
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-[#E2E8F0] overflow-hidden">
                          <div
                            className="h-full bg-[#2563EB] rounded-full transition-all duration-300"
                            style={{ width: `${prog.percent}%` }}
                          />
                        </div>
                      </div>

                      {/* Interactive 6-Stage Milestone Strip */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {(client.milestones || []).map((m) => (
                            <button
                              key={m.stage}
                              onClick={() => onToggleMilestone(client.id, m.stage)}
                              title={`Click to toggle ${m.stage} milestone`}
                              className={`px-2 py-0.5 rounded-md font-medium transition-all cursor-pointer ${
                                m.completed
                                  ? 'bg-[#D1FAE5] text-[#059669] font-semibold'
                                  : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:border-[#2563EB]'
                              }`}
                            >
                              {m.completed ? '✓ ' : ''}
                              {m.stage}
                            </button>
                          ))}
                        </div>
                        <div className="text-[#64748B] font-mono">
                          Assigned: <strong className="text-[#0B0F19]">{client.assignedTo}</strong>
                          {pending > 0 && (
                            <span className="ml-2 text-amber-700 font-bold">
                              · Due: {formatINR(pending)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* SECTION E: Recent Activity Feed (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-5 sm:p-6 border border-[#EAECEF] shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#2563EB] flex items-center gap-1">
                  <Activity className="w-3 h-3" /> STUDIO AUDIT STREAM
                </div>
                <h2 className="text-lg font-extrabold text-[#0B0F19]">
                  Recent Activity Feed
                </h2>
              </div>
              <span className="text-[11px] font-mono text-[#64748B]">Live Sync</span>
            </div>

            <div className="space-y-3">
              {activityLogs.map((log) => {
                const timeStr = new Date(log.timestamp).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-3 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF]"
                  >
                    <div
                      className={`w-7 h-7 rounded-lg text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                        log.actor === 'Krishna'
                          ? 'bg-[#2563EB] text-white'
                          : log.actor === 'Vansh'
                          ? 'bg-[#0B0F19] text-white'
                          : 'bg-[#059669] text-white'
                      }`}
                    >
                      {log.actor.slice(0, 1)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-[#0B0F19] leading-snug">
                        <span className="font-bold">{log.actor}</span>{' '}
                        <span className="text-[#475569]">{log.action}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-[#64748B]">
                        <span className="font-semibold text-[#0B0F19] truncate">
                          {log.targetName}
                        </span>
                        <span>·</span>
                        <span className="font-mono">{log.category}</span>
                        <span>·</span>
                        <span className="font-mono">{timeStr}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-xs text-[#64748B]">
            <span>All studio events logged automatically</span>
            <button
              onClick={() => onNavigate('analytics')}
              className="font-bold text-[#2563EB] hover:underline cursor-pointer"
            >
              View Studio Reports →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
