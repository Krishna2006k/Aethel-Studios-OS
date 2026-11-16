import React from 'react';
import {
  ArrowUpRight,
  MessageCircle,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import type {
  AethelDatabaseState,
  FounderFilter,
  ModuleId,
  ClientLead,
  DeliveryTicket,
} from '../types';
import {
  formatINR,
  calculateStudioFinances,
  calculateDaysRemaining,
  calculatePendingBalance,
  buildWhatsAppUrl,
} from '../utils/calculations';

interface CommandCenterViewProps {
  db: AethelDatabaseState;
  founderFilter: FounderFilter;
  onChangeFounderFilter: (f: FounderFilter) => void;
  onNavigateModule: (m: ModuleId) => void;
  onSelectClientForDrawer: (client: ClientLead) => void;
  onResolveTicketQuick: (ticketId: string) => void;
  onOpenQuickActionWithTab: (tab: 'client' | 'expense' | 'ticket' | 'campaign' | 'prototype' | 'vault') => void;
}

export const CommandCenterView: React.FC<CommandCenterViewProps> = ({
  db,
  founderFilter,
  onChangeFounderFilter,
  onNavigateModule,
  onSelectClientForDrawer,
  onResolveTicketQuick,
  onOpenQuickActionWithTab,
}) => {
  const matchesFounder = (assigned: string) => {
    if (founderFilter === 'All Studio') return true;
    return assigned === founderFilter || assigned === 'Both';
  };

  const finance = calculateStudioFinances(db.expenses, db.payments, db.clients);

  const filteredClients = db.clients.filter((c) => matchesFounder(c.assignedLead));
  const followUpsDue = filteredClients.filter((c) => {
    if (c.stage === 'Rejected / Dropped') return false;
    const days = calculateDaysRemaining(c.nextFollowUpDate);
    return days <= 1; // Due today, tomorrow, or overdue
  });

  const activeCampaigns = db.metaCampaigns.filter(
    (m) => m.status !== 'Completed' && m.status !== 'Paused' && matchesFounder(m.assignedLead)
  );
  const totalMetaBudgetUnderMgmt = activeCampaigns.reduce((s, c) => s + c.totalAdBudget, 0);
  const totalMetaSpendSoFar = activeCampaigns.reduce((s, c) => s + c.adSpendUsed, 0);
  const campaignsEndingSoon = activeCampaigns.filter(
    (c) => calculateDaysRemaining(c.endDate) <= 3
  );

  const openHighTickets = db.tickets.filter(
    (t) =>
      t.state !== 'Deployed & Resolved' &&
      (t.priority === 'Critical - Site Down' || t.priority === 'High') &&
      matchesFounder(t.assignedTo)
  );

  const expiringDomains = db.websites.filter((w) => {
    const days = calculateDaysRemaining(w.renewalDate);
    return days <= 30 && matchesFounder(w.assignedLead);
  });

  const criticalAlertsCount = openHighTickets.length + expiringDomains.length;

  const activePrototypes = db.prototypes.filter(
    (p) =>
      (p.stage === 'Working On / In Development' || p.stage === 'Interactive Prototype') &&
      matchesFounder(p.leadBuilder)
  );

  const openTicketsQueue: DeliveryTicket[] = db.tickets.filter(
    (t) => t.state !== 'Deployed & Resolved' && matchesFounder(t.assignedTo)
  );

  const todayFormatted = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="space-y-8">
      {/* Hero Editorial Banner */}
      <section className="bg-white border border-[#EAECEF] rounded-3xl p-6 sm:p-8 shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)]">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-3 text-xs font-bold tracking-wider text-[#2563EB]">
              <span>01 / COMMAND CENTER</span>
              <span className="text-slate-300" aria-hidden="true">/</span>
              <span className="font-mono text-slate-500 font-normal">{todayFormatted}</span>
              <span className="text-slate-300" aria-hidden="true">/</span>
              <span className="text-[#0D281D] font-medium">Pune • Risod • Washim</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#0B0F19] text-balance">
              Good day, Vansh &amp; Krishna. Here is your live studio pulse.
            </h1>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Active Sprint Focus: Closing <strong className="text-[#0B0F19] font-semibold">Sanjeevani Hospital Clinic OS</strong>, scaling <strong className="text-[#0B0F19] font-semibold">Imperial Pavilion Wedding Ads</strong>, and shipping <strong className="text-[#0B0F19] font-semibold">Aurelia Sanctuary</strong> suite booking flow.
            </p>
          </div>

          {/* Founder Quick-Filter Segmented Control */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div
              role="group"
              aria-label="Filter Command Center by Co-Founder"
              className="inline-flex items-center p-1 bg-[#F8F9FA] border border-[#EAECEF] rounded-full"
            >
              {(['All Studio', 'Krishna', 'Vansh'] as FounderFilter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => onChangeFounderFilter(f)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    founderFilter === f
                      ? 'bg-[#0B0F19] text-white shadow-xs'
                      : 'text-slate-600 hover:text-[#0B0F19]'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4 High-Contrast KPI Cards (1 Obsidian #0B0F19 + 3 Crisp White #FFFFFF) */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* KPI 1: Obsidian Card - Net Studio Cashflow */}
        <div className="bg-[#0B0F19] text-white rounded-3xl p-6 flex flex-col justify-between shadow-[0_14px_34px_-12px_rgba(11,15,25,0.22)]">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold tracking-wider uppercase text-[#94A3B8]">
                NET STUDIO CASHFLOW
              </span>
              <button
                type="button"
                onClick={() => onNavigateModule('finance')}
                className="text-xs font-medium text-[#94A3B8] hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>Ledger</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="mt-3 font-mono text-3xl sm:text-4xl font-bold tracking-tight text-white tabular-nums">
              {formatINR(finance.netProfit)}
            </div>
            <p className="mt-1 text-xs text-[#94A3B8]">
              Collected <span className="font-mono text-emerald-400">{formatINR(finance.totalRevenueCollected)}</span> − Expenses <span className="font-mono text-slate-300">{formatINR(finance.totalStudioExpenses)}</span>
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
            <div>
              <span className="text-[#94A3B8] block">Pending Client Receivables</span>
              <span className="font-mono font-bold text-sm text-[#D1FAE5] mt-0.5 block">
                +{formatINR(finance.pendingReceivables)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onOpenQuickActionWithTab('expense')}
              className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
            >
              + Log Entry
            </button>
          </div>
        </div>

        {/* KPI 2: Follow-ups Due Today / Overdue */}
        <div className="bg-white border border-[#EAECEF] rounded-3xl p-6 flex flex-col justify-between shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)]">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold tracking-wider uppercase text-[#2563EB]">
                FOLLOW-UPS DUE / URGENT
              </span>
              <button
                type="button"
                onClick={() => onNavigateModule('pipeline')}
                className="text-xs font-medium text-slate-500 hover:text-[#0B0F19] flex items-center gap-1 cursor-pointer"
              >
                <span>Pipeline</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="font-mono text-3xl sm:text-4xl font-bold tracking-tight text-[#0B0F19] tabular-nums">
                {followUpsDue.length}
              </span>
              <span className="text-xs text-slate-500">
                client{followUpsDue.length === 1 ? '' : 's'} awaiting action
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {followUpsDue.slice(0, 2).map((client) => {
                const waUrl = buildWhatsAppUrl(
                  client.phone,
                  `Hi ${client.contactPerson}, this is ${
                    client.assignedLead === 'Both' ? 'Vansh & Krishna' : client.assignedLead
                  } from Aethel Studios regarding ${client.businessName}.`
                );
                return (
                  <div
                    key={client.id}
                    className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-100 last:border-b-0"
                  >
                    <button
                      type="button"
                      onClick={() => onSelectClientForDrawer(client)}
                      className="text-xs font-semibold text-[#0B0F19] hover:text-[#2563EB] truncate text-left cursor-pointer"
                    >
                      {client.businessName}
                    </button>
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-full bg-[#D1FAE5] text-[#0D281D] hover:bg-[#059669] hover:text-white text-[11px] font-semibold flex items-center gap-1 transition-colors shrink-0"
                    >
                      <MessageCircle className="w-3 h-3" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#EAECEF] flex items-center justify-between text-xs text-slate-500">
            <span>Total active pipeline leads: {filteredClients.length}</span>
            <button
              type="button"
              onClick={() => onOpenQuickActionWithTab('client')}
              className="font-semibold text-[#2563EB] hover:underline cursor-pointer"
            >
              + Add Lead
            </button>
          </div>
        </div>

        {/* KPI 3: Active Meta Ads Spend & Live Campaigns */}
        <div className="bg-white border border-[#EAECEF] rounded-3xl p-6 flex flex-col justify-between shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)]">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold tracking-wider uppercase text-[#2563EB]">
                META ADS &amp; GROWTH
              </span>
              <button
                type="button"
                onClick={() => onNavigateModule('meta-ads')}
                className="text-xs font-medium text-slate-500 hover:text-[#0B0F19] flex items-center gap-1 cursor-pointer"
              >
                <span>Campaigns</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="mt-3 font-mono text-3xl sm:text-4xl font-bold tracking-tight text-[#0B0F19] tabular-nums">
              {formatINR(totalMetaBudgetUnderMgmt)}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              <span className="font-mono font-semibold text-[#0B0F19]">{formatINR(totalMetaSpendSoFar)}</span> spent across {activeCampaigns.length} live campaigns
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-[#EAECEF] flex items-center justify-between text-xs">
            <span className="text-slate-600">
              Ending in &le; 3 days:{' '}
              <strong className="font-mono text-amber-700 font-bold">
                {campaignsEndingSoon.length}
              </strong>
            </span>
            <button
              type="button"
              onClick={() => onNavigateModule('meta-ads')}
              className="font-semibold text-[#059669] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>View CPL</span>
            </button>
          </div>
        </div>

        {/* KPI 4: Critical Alerts (Bugs & Expiring Domains) */}
        <div className="bg-white border border-[#EAECEF] rounded-3xl p-6 flex flex-col justify-between shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)]">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold tracking-wider uppercase text-[#2563EB]">
                CRITICAL ALERTS
              </span>
              <button
                type="button"
                onClick={() => onNavigateModule('domains')}
                className="text-xs font-medium text-slate-500 hover:text-[#0B0F19] flex items-center gap-1 cursor-pointer"
              >
                <span>Assets</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="font-mono text-3xl sm:text-4xl font-bold tracking-tight text-[#0B0F19] tabular-nums">
                {criticalAlertsCount}
              </span>
              <span className="text-xs text-slate-500">
                priority item{criticalAlertsCount === 1 ? '' : 's'}
              </span>
            </div>
            <div className="mt-3 space-y-1.5 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span>High/Critical Website Bugs</span>
                <span className="font-mono font-bold text-rose-600">{openHighTickets.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Domains Renewing &lt; 30 Days</span>
                <span className="font-mono font-bold text-amber-700">{expiringDomains.length}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#EAECEF] flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => onNavigateModule('tickets')}
              className="text-slate-600 hover:text-[#0B0F19] font-medium cursor-pointer"
            >
              Open Tickets ({openTicketsQueue.length})
            </button>
            <button
              type="button"
              onClick={() => onOpenQuickActionWithTab('ticket')}
              className="font-semibold text-[#2563EB] hover:underline cursor-pointer"
            >
              + Log Issue
            </button>
          </div>
        </div>
      </section>

      {/* Today's Action Queue: Unified 3-Column Split View */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-bold tracking-wider uppercase text-[#2563EB] block">
              TODAY&apos;S EXECUTION QUEUE
            </span>
            <h2 className="text-xl font-bold tracking-tight text-[#0B0F19]">
              Urgent Client Follow-ups, Active Bugs &amp; R&amp;D Builds
            </h2>
          </div>
          <div className="text-xs text-slate-500">
            Showing items for <strong className="text-[#0B0F19]">{founderFilter}</strong>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Urgent Client Follow-ups & Receivables */}
          <div className="bg-white border border-[#EAECEF] rounded-3xl p-6 shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)] flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#EAECEF] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-[#0B0F19]">
                    01. Client Follow-ups &amp; Dues
                  </h3>
                  <p className="text-xs text-slate-500">
                    Direct WhatsApp outreach with pre-filled context
                  </p>
                </div>
                <span className="font-mono text-xs font-semibold text-slate-500">
                  {followUpsDue.length} due
                </span>
              </div>

              {followUpsDue.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  All scheduled follow-ups are clear for {founderFilter}.
                </p>
              ) : (
                <div className="divide-y divide-[#EAECEF]">
                  {followUpsDue.map((client) => {
                    const isFinalizedOrLive =
                      client.stage === 'In Building' ||
                      client.stage === 'Live / Payment Pending' ||
                      client.stage === 'Finalized / In Progress' ||
                      client.stage === 'Delivered / Live';
                    const pending = isFinalizedOrLive
                      ? calculatePendingBalance(client.finalAgreedPrice, client.advancePaid)
                      : 0;
                    const waMsg =
                      pending > 0
                        ? `Namaskar ${client.contactPerson}, this is ${
                            client.assignedLead === 'Both'
                              ? 'Vansh & Krishna'
                              : client.assignedLead
                          } from Aethel Studios regarding ${
                            client.businessName
                          }. Checking in on the project & pending balance of ${formatINR(
                            pending
                          )}.`
                        : `Namaskar ${client.contactPerson}, this is ${
                            client.assignedLead === 'Both'
                              ? 'Vansh & Krishna'
                              : client.assignedLead
                          } from Aethel Studios following up on our ${
                            client.planSelected
                          } demo for ${client.businessName}.`;

                    return (
                      <div key={client.id} className="py-3.5 first:pt-0 last:pb-0 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <button
                              type="button"
                              onClick={() => onSelectClientForDrawer(client)}
                              className="text-sm font-bold text-[#0B0F19] hover:text-[#2563EB] text-left transition-colors cursor-pointer"
                            >
                              {client.businessName}
                            </button>
                            <div className="text-xs text-slate-500 mt-0.5">
                              <span>{client.contactPerson}</span>
                              <span aria-hidden="true"> · </span>
                              <span>{client.location}</span>
                              <span aria-hidden="true"> · </span>
                              <span>{client.stage}</span>
                            </div>
                          </div>
                          {pending > 0 ? (
                            <span className="font-mono text-xs font-bold text-amber-800 shrink-0">
                              Due {formatINR(pending)}
                            </span>
                          ) : (
                            <span className="font-mono text-xs font-semibold text-slate-500 shrink-0">
                              Pitch {formatINR(client.finalAgreedPrice)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1">
                          <span className="font-mono text-[11px] text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            Follow-up: {client.nextFollowUpDate} ({client.assignedLead})
                          </span>
                          <a
                            href={buildWhatsAppUrl(client.phone, waMsg)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 rounded-full bg-[#0D281D] hover:bg-[#059669] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => onNavigateModule('pipeline')}
              className="mt-5 w-full py-2.5 rounded-full border border-[#EAECEF] hover:border-[#0B0F19] text-xs font-semibold text-[#0B0F19] transition-colors cursor-pointer"
            >
              Open Full CRM Pipeline &rarr;
            </button>
          </div>

          {/* Column 2: Open Website Bugs & Client Revisions */}
          <div className="bg-white border border-[#EAECEF] rounded-3xl p-6 shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)] flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#EAECEF] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-[#0B0F19]">
                    02. Open Website Bugs &amp; Revisions
                  </h3>
                  <p className="text-xs text-slate-500">
                    Post-sales execution &amp; domain expiry watch
                  </p>
                </div>
                <span className="font-mono text-xs font-semibold text-slate-500">
                  {openTicketsQueue.length} open
                </span>
              </div>

              <div className="divide-y divide-[#EAECEF]">
                {openTicketsQueue.map((ticket) => (
                  <div key={ticket.id} className="py-3.5 first:pt-0 last:pb-0 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-[#0B0F19] leading-snug">
                        {ticket.title}
                      </p>
                      <button
                        type="button"
                        onClick={() => onResolveTicketQuick(ticket.id)}
                        title="Mark Deployed & Resolved"
                        className="p-1 text-slate-400 hover:text-[#059669] transition-colors shrink-0 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-xs text-slate-500">
                      <span>{ticket.clientName}</span>
                      <span aria-hidden="true"> · </span>
                      <span
                        className={
                          ticket.priority === 'Critical - Site Down' || ticket.priority === 'High'
                            ? 'text-rose-600 font-semibold'
                            : 'text-slate-600'
                        }
                      >
                        {ticket.priority}
                      </span>
                      <span aria-hidden="true"> · </span>
                      <span>{ticket.billingTag}</span>
                      <span aria-hidden="true"> · </span>
                      <span>Assigned: {ticket.assignedTo}</span>
                    </div>
                  </div>
                ))}

                {expiringDomains.map((dom) => {
                  const daysLeft = calculateDaysRemaining(dom.renewalDate);
                  return (
                    <div key={dom.id} className="py-3.5 first:pt-0 last:pb-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          Domain Renewal: {dom.liveDomainUrl.replace('https://', '')}
                        </span>
                        <span className="font-mono text-xs font-bold text-rose-600">
                          {daysLeft}d left
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {dom.domainRegistrar} ({dom.domainOwner}) · Annual cost{' '}
                        <span className="font-mono">{formatINR(dom.annualRenewalCost)}</span>
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigateModule('tickets')}
              className="mt-5 w-full py-2.5 rounded-full border border-[#EAECEF] hover:border-[#0B0F19] text-xs font-semibold text-[#0B0F19] transition-colors cursor-pointer"
            >
              Manage Deliveries &amp; Tickets &rarr;
            </button>
          </div>

          {/* Column 3: Active R&D Lab & Pitch Prototypes */}
          <div className="bg-white border border-[#EAECEF] rounded-3xl p-6 shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)] flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#EAECEF] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-[#0B0F19]">
                    03. Active R&amp;D Prototypes &amp; IP
                  </h3>
                  <p className="text-xs text-slate-500">
                    Vibe-coded demos ready to pitch local businesses
                  </p>
                </div>
                <Sparkles className="w-4 h-4 text-[#2563EB]" />
              </div>

              <div className="divide-y divide-[#EAECEF]">
                {activePrototypes.map((proto) => (
                  <div key={proto.id} className="py-3.5 first:pt-0 last:pb-0 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-[#0B0F19]">
                          {proto.projectName}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {proto.stage} · Lead: {proto.leadBuilder}
                        </p>
                      </div>
                      <a
                        href={proto.livePrototypeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-full bg-slate-100 hover:bg-[#2563EB] hover:text-white text-slate-700 transition-colors shrink-0"
                        title="Open Live Prototype"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2">
                      {proto.coreUxHook}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigateModule('rnd-lab')}
              className="mt-5 w-full py-2.5 rounded-full border border-[#EAECEF] hover:border-[#0B0F19] text-xs font-semibold text-[#0B0F19] transition-colors cursor-pointer"
            >
              Explore R&amp;D Lab &amp; Prompts &rarr;
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
