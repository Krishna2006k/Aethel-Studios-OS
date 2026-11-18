import React from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  TrendingUp,
  Wallet,
  Plus,
  CheckSquare,
  Activity,
  Layers,
  ChevronRight,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  BarChart3,
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
  calculateLeadConversionAnalytics,
  calculatePendingBalance,
  calculateStudioFinances,
  calculateStudioHealth,
  formatINR,
  generateUpcoming7DaysTimeline,
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

  const healthIndicators = calculateStudioHealth(dbState, finances);
  const leadAnalytics = calculateLeadConversionAnalytics(dbState.clients);
  const upcomingTimeline = generateUpcoming7DaysTimeline(dbState).filter((ev) =>
    matchesFounder(ev.assignedTo)
  );

  const filteredClients = dbState.clients.filter((c) => matchesFounder(c.assignedTo));
  const filteredTickets = dbState.tickets.filter((t) => matchesFounder(t.assignedTo));
  const filteredTasks = (dbState.tasks || []).filter((t) => matchesFounder(t.assignedTo));

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

  // 1. Live / Payment Pending clients (Highest financial priority)
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
      categoryBadge: tsk.category || tsk.type,
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

  // 4. Sales Follow-ups in "In Talks / Demo Shown"
  filteredClients
    .filter((c) => c.stage === 'In Talks / Demo Shown' || c.stage === 'Sample Sent / WhatsApp')
    .forEach((c) => {
      priorityRows.push({
        id: `prio-lead-${c.id}`,
        priority: 'High',
        taskTitle: `Follow up on ${c.packageTier} proposal (${formatINR(c.finalAgreedPrice)})`,
        categoryBadge: c.stage,
        clientName: c.businessName,
        clientId: c.id,
        assignedTo: c.assignedTo,
        deadline: c.followUpDate || 'Today',
        phone: c.phone,
        actionLabel: 'Client 360°',
        onAction: () => onOpenClient360(c.id),
      });
    });

  const formattedToday = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const activityLogs = (dbState.activityLogs || []).slice(0, 8);

  const domainExpensesSum = dbState.expenses
    .filter((e) => e.category === 'Domain & Hosting')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const metaExpensesSum = dbState.expenses
    .filter((e) => e.category === 'Meta Ad Spend')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  return (
    <div className="space-y-6 min-w-0">
      {/* SECTION 1 — HEADER & WORKSPACE SWITCHER */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 bg-white rounded-3xl p-4 sm:p-6 border border-[#EAECEF] shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)] min-w-0">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#2563EB] mb-1">
            <span>STUDIO COMMAND CENTER</span>
            <span className="text-[#CBD5E1]">·</span>
            <span className="font-mono text-[#64748B]">{formattedToday}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B0F19]">
            Good day, {activeFounderFilter === 'All' ? 'Krishna & Vansh' : activeFounderFilter}
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1">
            Studio Overview — Real-time financial snapshot, studio health indicators, daily priorities, and 7-day execution horizon.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Persistent Workspace Switcher */}
          <div className="flex flex-wrap items-center bg-[#F8F9FA] border border-[#EAECEF] rounded-xl p-1">
            {(['All', 'Krishna', 'Vansh'] as const).map((f) => (
              <button
                key={f}
                onClick={() => onChangeFounderFilter(f)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeFounderFilter === f
                    ? 'bg-[#0B0F19] text-white shadow-2xs'
                    : 'text-[#64748B] hover:text-[#0B0F19]'
                }`}
              >
                {f === 'All' ? 'All Studio' : f}
              </button>
            ))}
          </div>

          <button
            onClick={onOpenQuickAction}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Quick Action</span>
            <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-white/20 rounded">
              Ctrl+K
            </kbd>
          </button>
        </div>
      </div>

      {/* SECTION 2 — FINANCIAL & OPERATIONAL SNAPSHOT (4 RICH CONTEXT CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Agency Revenue */}
        <div
          onClick={() => onNavigate('finance')}
          className="bg-white rounded-2xl p-5 border border-[#EAECEF] hover:border-[#2563EB] transition-all cursor-pointer group shadow-[0_8px_24px_-12px_rgba(11,15,25,0.05)] flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                1. Agency Revenue
              </span>
              <span className="px-2 py-0.5 rounded-md bg-[#ECFDF5] text-[#059669] text-[10px] font-mono font-bold">
                {finances.collectionRatePercent}% Collected
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-3xl font-extrabold font-mono text-[#0B0F19]">
                {formatINR(finances.totalRevenueCollected)}
              </div>
              <span className="text-[11px] font-mono text-[#64748B]">
                of {formatINR(finances.totalContractedVolume)}
              </span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-[#F1F5F9] text-xs space-y-1">
            <div className="flex items-center justify-between text-[#475569]">
              <span>Website Projects</span>
              <span className="font-mono font-bold text-[#0B0F19]">
                {formatINR(finances.clientProjectRevenue)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[#64748B]">
              <span>Confirmed Active Deals</span>
              <span className="font-mono font-semibold text-[#059669]">
                {finances.activeClientsCount} accounts
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Net Studio Profit */}
        <div
          onClick={() => onNavigate('finance')}
          className="bg-white rounded-2xl p-5 border border-[#EAECEF] hover:border-[#2563EB] transition-all cursor-pointer group shadow-[0_8px_24px_-12px_rgba(11,15,25,0.05)] flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                2. Net Studio Profit
              </span>
              <span className="px-2 py-0.5 rounded-md bg-[#EFF6FF] text-[#2563EB] text-[10px] font-mono font-bold">
                {finances.profitMarginPercent}% Margin
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-3xl font-extrabold font-mono text-[#059669]">
                {formatINR(finances.netProfit)}
              </div>
              <span className="text-[11px] font-semibold text-[#64748B]">
                50/50 Co-Founder Split
              </span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-[#F1F5F9] text-xs space-y-1">
            <div className="flex items-center justify-between text-[#475569]">
              <span>Krishna's 50% Share</span>
              <span className="font-mono font-bold text-[#0B0F19]">
                {formatINR(finances.krishnaProfitShare50)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[#475569]">
              <span>Vansh's 50% Share</span>
              <span className="font-mono font-bold text-[#0B0F19]">
                {formatINR(finances.vanshProfitShare50)}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Pending Receivables */}
        <div
          onClick={() => onNavigate('pipeline')}
          className="bg-white rounded-2xl p-5 border border-[#EAECEF] hover:border-[#2563EB] transition-all cursor-pointer group shadow-[0_8px_24px_-12px_rgba(11,15,25,0.05)] flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                3. Pending Receivables
              </span>
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                  finances.overdueReceivables > 0
                    ? 'bg-[#FFE4E6] text-[#E11D48]'
                    : 'bg-[#FEF3C7] text-[#D97706]'
                }`}
              >
                {finances.livePaymentPendingCount} Live Due
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-3xl font-extrabold font-mono text-[#0B0F19]">
                {formatINR(finances.pendingReceivables)}
              </div>
              <span className="text-[11px] font-semibold text-[#D97706]">
                Contracted Balance
              </span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-[#F1F5F9] text-xs space-y-1">
            <div className="flex items-center justify-between text-[#E11D48]">
              <span>Overdue / Live Deployed</span>
              <span className="font-mono font-bold">
                {formatINR(finances.overdueReceivables)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[#64748B]">
              <span>In-Build Milestone Balance</span>
              <span className="font-mono font-semibold text-[#0B0F19]">
                {formatINR(finances.dueThisWeekReceivables)}
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Operational Expenses & Pipeline */}
        <div
          onClick={() => onNavigate('finance')}
          className="bg-white rounded-2xl p-5 border border-[#EAECEF] hover:border-[#2563EB] transition-all cursor-pointer group shadow-[0_8px_24px_-12px_rgba(11,15,25,0.05)] flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                4. Studio Expenses
              </span>
              <span className="px-2 py-0.5 rounded-md bg-[#F1F5F9] text-[#475569] text-[10px] font-mono font-bold">
                {dbState.expenses.length} Entries
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-3xl font-extrabold font-mono text-[#0B0F19]">
                {formatINR(finances.totalStudioExpenses)}
              </div>
              <span className="text-[11px] font-semibold text-[#64748B]">
                Auto-Synced
              </span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-[#F1F5F9] text-xs space-y-1">
            <div className="flex items-center justify-between text-[#475569]">
              <span>Domains & Hosting Sync</span>
              <span className="font-mono font-bold text-[#0B0F19]">
                {formatINR(domainExpensesSum)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[#475569]">
              <span>Meta Ad Spend Sync</span>
              <span className="font-mono font-bold text-[#0B0F19]">
                {formatINR(metaExpensesSum)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* STUDIO HEALTH INDICATOR BAR (5 CALCULATED INDICATORS — PART 2) */}
      <div className="bg-white rounded-2xl border border-[#EAECEF] p-4 shadow-[0_8px_24px_-12px_rgba(11,15,25,0.04)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#0B0F19]">
              Studio Health Diagnostic Strip
            </span>
          </div>
          <span className="text-[11px] font-mono text-[#64748B]">
            Calculated live from financial, delivery & infrastructure telemetry
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {healthIndicators.map((ind) => (
            <div
              key={ind.id}
              className="p-3 rounded-xl bg-[#F8F9FA] border border-[#EAECEF] flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] font-bold text-[#475569]">{ind.label}</span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    ind.status === 'Healthy'
                      ? 'bg-[#D1FAE5] text-[#059669]'
                      : ind.status === 'Needs Attention'
                      ? 'bg-[#FEF3C7] text-[#D97706]'
                      : 'bg-[#FFE4E6] text-[#E11D48]'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      ind.status === 'Healthy'
                        ? 'bg-[#059669]'
                        : ind.status === 'Needs Attention'
                        ? 'bg-[#D97706]'
                        : 'bg-[#E11D48]'
                    }`}
                  />
                  {ind.status}
                </span>
              </div>
              <div className="text-sm font-extrabold font-mono text-[#0B0F19]">
                {ind.metric}
              </div>
              <div className="text-[11px] text-[#64748B] mt-0.5 truncate" title={ind.detail}>
                {ind.detail}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 3 — DAILY OPERATIONS (TWO-COLUMN SPLIT: TODAY'S PRIORITIES + UPCOMING 7 DAYS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Today's Priorities & Immediate Follow-ups (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-[#EAECEF] shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)] overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-5 sm:px-6 border-b border-[#EAECEF] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#2563EB]">
                  DAILY OPERATIONS · LEFT PANEL
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
                  All Tasks
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
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#EAECEF] bg-[#F8F9FA] text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                      <th className="py-2.5 px-4">Priority</th>
                      <th className="py-2.5 px-3">Task / Action Required</th>
                      <th className="py-2.5 px-3">Client</th>
                      <th className="py-2.5 px-3">Owner</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] text-xs">
                    {priorityRows.slice(0, 7).map((row) => (
                      <tr
                        key={row.id}
                        className="hover:bg-[#F8F9FA]/80 transition-colors"
                      >
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 font-bold text-[11px] ${
                              row.priority === 'Urgent'
                                ? 'text-[#E11D48]'
                                : row.priority === 'High'
                                ? 'text-[#D97706]'
                                : 'text-[#2563EB]'
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                row.priority === 'Urgent'
                                  ? 'bg-[#E11D48]'
                                  : row.priority === 'High'
                                  ? 'bg-[#D97706]'
                                  : 'bg-[#2563EB]'
                              }`}
                            />
                            {row.priority}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-[#0B0F19]">{row.taskTitle}</div>
                          <div className="text-[11px] text-[#64748B]">
                            {row.categoryBadge} · Due <span className="font-mono">{row.deadline}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {row.clientId ? (
                            <button
                              onClick={() => onOpenClient360(row.clientId!)}
                              className="font-bold text-[#2563EB] hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                              {row.clientName}
                              <ArrowUpRight className="w-3 h-3" />
                            </button>
                          ) : (
                            <span className="font-semibold text-[#0B0F19]">{row.clientName}</span>
                          )}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap text-[#475569] font-semibold">
                          {row.assignedTo}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {row.taskId && (
                              <button
                                onClick={() => onToggleTaskStatus(row.taskId!)}
                                className="px-2 py-1 rounded-lg bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#059669] font-bold text-[11px] cursor-pointer"
                              >
                                ✓ Done
                              </button>
                            )}
                            {row.phone && (
                              <a
                                href={`https://wa.me/${row.phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-1 rounded-lg bg-[#F8F9FA] hover:bg-[#ECFDF5] text-[#059669] border border-[#EAECEF] font-bold text-[11px]"
                              >
                                WA
                              </a>
                            )}
                            <button
                              onClick={row.onAction}
                              className="px-2.5 py-1 rounded-lg bg-[#0B0F19] hover:bg-[#2563EB] text-white font-bold text-[11px] cursor-pointer"
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
        </div>

        {/* Right Column: Upcoming 7 Days Schedule & Horizon (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-5 sm:p-6 border border-[#EAECEF] shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#2563EB] flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> DAILY OPERATIONS · RIGHT PANEL
                </div>
                <h2 className="text-lg font-extrabold text-[#0B0F19]">
                  Upcoming 7 Days & Deadlines
                </h2>
              </div>
              <span className="text-[11px] font-mono text-[#64748B]">
                {upcomingTimeline.length} scheduled
              </span>
            </div>

            {upcomingTimeline.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF] text-center text-xs text-[#64748B]">
                No upcoming deadlines or renewals scheduled.
              </div>
            ) : (
              <div className="space-y-2.5">
                {upcomingTimeline.slice(0, 6).map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => ev.clientId && onOpenClient360(ev.clientId)}
                    className="p-3 rounded-2xl bg-[#F8F9FA] hover:bg-[#F1F5F9] border border-[#EAECEF] flex items-center justify-between gap-3 transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            ev.type === 'Milestone'
                              ? 'bg-[#EFF6FF] text-[#2563EB]'
                              : ev.type === 'Domain Renewal'
                              ? 'bg-[#FEF3C7] text-[#D97706]'
                              : 'bg-white border border-[#EAECEF] text-[#475569]'
                          }`}
                        >
                          {ev.type}
                        </span>
                        <span className="text-xs font-bold text-[#0B0F19] truncate">
                          {ev.title}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#64748B] mt-0.5 truncate">
                        {ev.subtitle} · Assigned to <strong className="text-[#0B0F19]">{ev.assignedTo}</strong>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[11px] font-mono font-bold text-[#0B0F19]">
                        {ev.date}
                      </div>
                      <div
                        className={`text-[10px] font-mono ${
                          ev.daysFromNow < 0
                            ? 'text-[#E11D48] font-bold'
                            : ev.daysFromNow === 0
                            ? 'text-[#D97706] font-bold'
                            : 'text-[#64748B]'
                        }`}
                      >
                        {ev.daysFromNow < 0
                          ? `${Math.abs(ev.daysFromNow)}d ago`
                          : ev.daysFromNow === 0
                          ? 'Today'
                          : `in ${ev.daysFromNow}d`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-xs text-[#64748B]">
            <span>Synchronized across CRM, Projects & Domains</span>
            <button
              onClick={() => onNavigate('tasks')}
              className="font-bold text-[#2563EB] hover:underline cursor-pointer"
            >
              Open Full Schedule →
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 4 — BUSINESS PERFORMANCE (3 CLEAN VISUAL CHARTS — PART 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart 1: Revenue vs Expenses & Net Profit */}
        <div className="bg-white rounded-2xl p-5 border border-[#EAECEF] shadow-[0_8px_24px_-12px_rgba(11,15,25,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#2563EB]">
                  PERFORMANCE CHART 01
                </div>
                <h3 className="text-sm font-extrabold text-[#0B0F19]">
                  Revenue vs Operational Expenses
                </h3>
              </div>
              <BarChart3 className="w-4 h-4 text-[#64748B]" />
            </div>

            <div className="space-y-3 mt-4">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-[#475569]">Collected Revenue</span>
                  <span className="font-mono font-bold text-[#059669]">
                    {formatINR(finances.totalRevenueCollected)}
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[#F1F5F9] overflow-hidden">
                  <div className="h-full bg-[#059669] rounded-full" style={{ width: '100%' }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-[#475569]">Operational Expenses</span>
                  <span className="font-mono font-bold text-[#E11D48]">
                    {formatINR(finances.totalStudioExpenses)}
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[#F1F5F9] overflow-hidden">
                  <div
                    className="h-full bg-[#E11D48] rounded-full"
                    style={{
                      width: `${
                        finances.totalRevenueCollected > 0
                          ? Math.min(
                              100,
                              Math.round(
                                (finances.totalStudioExpenses / finances.totalRevenueCollected) * 100
                              )
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-[#475569]">Net Studio Profit</span>
                  <span className="font-mono font-bold text-[#2563EB]">
                    {formatINR(finances.netProfit)} ({finances.profitMarginPercent}%)
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[#F1F5F9] overflow-hidden">
                  <div
                    className="h-full bg-[#2563EB] rounded-full"
                    style={{ width: `${Math.max(0, Math.min(100, finances.profitMarginPercent))}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-[11px] text-[#64748B]">
            <span>Client Pass-Through Ad Spend</span>
            <span className="font-mono font-bold text-[#0B0F19]">
              {formatINR(finances.totalClientAdSpendPassThrough)}
            </span>
          </div>
        </div>

        {/* Chart 2: Client Acquisition & Conversion Funnel */}
        <div className="bg-white rounded-2xl p-5 border border-[#EAECEF] shadow-[0_8px_24px_-12px_rgba(11,15,25,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#2563EB]">
                  PERFORMANCE CHART 02
                </div>
                <h3 className="text-sm font-extrabold text-[#0B0F19]">
                  Client Acquisition & Deal Funnel
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-[#059669]">
                {leadAnalytics.conversionRatePercent}% Win Rate
              </span>
            </div>

            <div className="space-y-2.5 mt-3">
              <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-[#F8F9FA]">
                <span className="text-[#475569] font-medium">Total Opportunities</span>
                <span className="font-mono font-bold text-[#0B0F19]">
                  {leadAnalytics.totalLeads} leads ({formatINR(finances.totalAllPipelineVolume)})
                </span>
              </div>
              <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-[#EFF6FF]/60">
                <span className="text-[#2563EB] font-semibold">Proposals / In Talks</span>
                <span className="font-mono font-bold text-[#2563EB]">
                  {finances.unclosedLeadsCount} active ({formatINR(finances.unclosedPipelineVolume)})
                </span>
              </div>
              <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-[#ECFDF5]">
                <span className="text-[#059669] font-semibold">Confirmed Won Deals</span>
                <span className="font-mono font-bold text-[#059669]">
                  {leadAnalytics.wonDeals} deals ({formatINR(finances.totalContractedVolume)})
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-[11px] text-[#64748B]">
            <span>Average Confirmed Deal Size</span>
            <span className="font-mono font-bold text-[#0B0F19]">
              {formatINR(leadAnalytics.averageDealValue)}
            </span>
          </div>
        </div>

        {/* Chart 3: Receivables vs Collected Breakdown */}
        <div className="bg-white rounded-2xl p-5 border border-[#EAECEF] shadow-[0_8px_24px_-12px_rgba(11,15,25,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#2563EB]">
                  PERFORMANCE CHART 03
                </div>
                <h3 className="text-sm font-extrabold text-[#0B0F19]">
                  Receivables vs Collected Breakdown
                </h3>
              </div>
              <Wallet className="w-4 h-4 text-[#64748B]" />
            </div>

            {/* Stacked Visual Bar */}
            <div className="w-full h-3.5 rounded-full bg-[#F1F5F9] overflow-hidden flex my-3">
              <div
                className="h-full bg-[#059669]"
                style={{ width: `${finances.collectionRatePercent}%` }}
                title={`Collected: ${formatINR(finances.clientProjectRevenue)}`}
              />
              <div
                className="h-full bg-[#E11D48]"
                style={{
                  width: `${
                    finances.totalContractedVolume > 0
                      ? Math.round(
                          (finances.overdueReceivables / finances.totalContractedVolume) * 100
                        )
                      : 0
                  }%`,
                }}
                title={`Live Due: ${formatINR(finances.overdueReceivables)}`}
              />
              <div
                className="h-full bg-[#F59E0B]"
                style={{
                  width: `${
                    finances.totalContractedVolume > 0
                      ? Math.round(
                          (finances.dueThisWeekReceivables / finances.totalContractedVolume) * 100
                        )
                      : 0
                  }%`,
                }}
                title={`In-Build Balance: ${formatINR(finances.dueThisWeekReceivables)}`}
              />
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[#475569]">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#059669]" /> Collected Revenue
                </span>
                <span className="font-mono font-bold text-[#059669]">
                  {formatINR(finances.clientProjectRevenue)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[#475569]">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#E11D48]" /> Overdue / Live Pending
                </span>
                <span className="font-mono font-bold text-[#E11D48]">
                  {formatINR(finances.overdueReceivables)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[#475569]">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#F59E0B]" /> In-Build Milestone Balance
                </span>
                <span className="font-mono font-bold text-[#D97706]">
                  {formatINR(finances.dueThisWeekReceivables)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-[11px] text-[#64748B]">
            <span>Total Confirmed Contract Volume</span>
            <span className="font-mono font-bold text-[#0B0F19]">
              {formatINR(finances.totalContractedVolume)}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 5 & 6 — ACTIVE CLIENT PROJECTS (WITH DEADLINES & APPROVALS) + RECENT ACTIVITY FEED */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SECTION 5: Active Projects (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-5 sm:p-6 border border-[#EAECEF] shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#2563EB]">
                  DELIVERY ENGINE · ACTIVE PROJECTS
                </div>
                <h2 className="text-lg font-extrabold text-[#0B0F19]">
                  Active Client Projects ({activeBuildProjects.length})
                </h2>
              </div>
              <button
                onClick={() => onNavigate('tickets')}
                className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-1 cursor-pointer"
              >
                All Projects, Templates & Approvals <ChevronRight className="w-3.5 h-3.5" />
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
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => onOpenClient360(client.id)}
                              className="text-sm font-extrabold text-[#0B0F19] hover:text-[#2563EB] transition-colors cursor-pointer text-left"
                            >
                              {client.businessName}
                            </button>
                            <span className="text-[11px] text-[#64748B]">
                              · {client.city}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-white border border-[#EAECEF] text-[10px] font-mono font-bold text-[#475569]">
                              {prog.approvedCheckpointsCount}/{prog.totalCheckpointsCount} Approvals
                            </span>
                            {prog.daysRemaining !== null && (
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                                  prog.daysRemaining < 0
                                    ? 'bg-[#FFE4E6] text-[#E11D48]'
                                    : 'bg-[#EFF6FF] text-[#2563EB]'
                                }`}
                              >
                                {prog.daysRemaining < 0
                                  ? `${Math.abs(prog.daysRemaining)}d overdue`
                                  : `${prog.daysRemaining}d remaining`}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[#475569] mt-0.5">
                            Service: <span className="font-semibold">{client.packageTier}</span>
                            {client.projectEndDate && (
                              <span className="ml-2 text-[11px] font-mono text-[#64748B]">
                                · Target: {client.projectEndDate}
                              </span>
                            )}
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

        {/* SECTION 6: Recent Activity Feed (5 cols) */}
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
              View Studio Intelligence Reports →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
