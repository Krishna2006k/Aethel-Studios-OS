import React, { useState } from 'react';
import { Plus, Trash2, ExternalLink, Edit3 } from 'lucide-react';
import type {
  DeliveryTicket,
  TicketCategory,
  TicketWorkflowState,
  TicketPriority,
  ScopeBillingTag,
} from '../types';
import { formatINR } from '../utils/calculations';

interface TicketsViewProps {
  tickets: DeliveryTicket[];
  onUpdateTicket: (t: DeliveryTicket) => void;
  onDeleteTicket: (id: string) => void;
  onOpenAddTicket: () => void;
}

const WORKFLOW_STATES: TicketWorkflowState[] = [
  'Reported / To-Do',
  'Working On',
  'Testing',
  'Deployed & Resolved',
];

const TICKET_PRIORITIES: TicketPriority[] = [
  'Low',
  'Medium',
  'High',
  'Critical - Site Down',
];

const BILLING_TAGS: ScopeBillingTag[] = [
  'Included in Plan',
  'Free Goodwill',
  'Billable Extra ₹',
];

const CATEGORY_TABS: ('All Tickets' | TicketCategory)[] = [
  'All Tickets',
  'Website Bugs / Issues',
  'Client Change Requests',
  'Core Delivery Milestones',
];

export const TicketsView: React.FC<TicketsViewProps> = ({
  tickets,
  onUpdateTicket,
  onDeleteTicket,
  onOpenAddTicket,
}) => {
  const [activeTab, setActiveTab] = useState<'All Tickets' | TicketCategory>('All Tickets');
  const [editingTicketId, setEditingTicketId] = useState<string | null>(null);

  const filtered = tickets.filter(
    (t) => activeTab === 'All Tickets' || t.category === activeTab
  );

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header & Filter Tabs */}
      <div className="bg-white border border-[#EAECEF] rounded-3xl p-4 sm:p-6 lg:p-8 shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)] space-y-4 sm:space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold tracking-wider uppercase text-[#2563EB] block">
              05 / DELIVERIES, BUGS &amp; CLIENT CHANGE REQUESTS
            </span>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-[#0B0F19] mt-1">
              Post-Sales Execution &amp; Scope Guardrail Board
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Every WhatsApp revision, production bug, and billable extra tracked from report to deployment · Urgent bugs auto-sync Website Health in Module 04.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenAddTicket}
            className="px-4 py-2.5 rounded-full bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors self-start lg:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Log Bug / Change Request</span>
          </button>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2 border-t border-[#EAECEF]">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 sm:px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === tab
                  ? 'bg-[#0B0F19] text-white'
                  : 'bg-[#F8F9FA] text-slate-600 hover:text-[#0B0F19]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Workflow State Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 items-start">
        {WORKFLOW_STATES.map((state) => {
          const columnTickets = filtered.filter((t) => t.state === state);
          return (
            <div
              key={state}
              className="bg-white border border-[#EAECEF] rounded-3xl p-4 sm:p-5 shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)] space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#EAECEF] pb-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#0B0F19]">
                  {state}
                </h2>
                <span className="font-mono text-xs font-bold text-[#2563EB]">
                  {columnTickets.length}
                </span>
              </div>

              <div className="space-y-3">
                {columnTickets.length === 0 ? (
                  <p className="text-xs text-slate-400 py-8 text-center">
                    No tickets in {state}
                  </p>
                ) : (
                  columnTickets.map((ticket) => {
                    const isEditing = editingTicketId === ticket.id;
                    return (
                      <div
                        key={ticket.id}
                        className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF] space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={`text-[11px] font-bold ${
                              ticket.priority === 'Critical - Site Down' ||
                              ticket.priority === 'High'
                                ? 'text-rose-600'
                                : 'text-[#2563EB]'
                            }`}
                          >
                            {ticket.priority}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-600">
                            {ticket.billingTag}
                            {ticket.extraAmount
                              ? ` (${formatINR(ticket.extraAmount)})`
                              : ''}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-sm font-bold text-[#0B0F19] leading-snug">
                            {ticket.title}
                          </h3>
                          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-700">
                              {ticket.clientName}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{ticket.category}</span>
                          </div>
                        </div>

                        {isEditing ? (
                          <div className="space-y-2 pt-2 border-t border-[#EAECEF] text-xs">
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                                Title
                              </label>
                              <input
                                type="text"
                                value={ticket.title}
                                onChange={(e) =>
                                  onUpdateTicket({
                                    ...ticket,
                                    title: e.target.value,
                                  })
                                }
                                className="w-full px-2.5 py-1 rounded-lg border border-[#EAECEF] bg-white text-xs font-semibold"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                                  Priority
                                </label>
                                <select
                                  value={ticket.priority}
                                  onChange={(e) =>
                                    onUpdateTicket({
                                      ...ticket,
                                      priority: e.target.value as TicketPriority,
                                    })
                                  }
                                  className="w-full px-2 py-1 rounded-lg border border-[#EAECEF] bg-white text-xs"
                                >
                                  {TICKET_PRIORITIES.map((p) => (
                                    <option key={p} value={p}>
                                      {p}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                                  Assigned To
                                </label>
                                <select
                                  value={ticket.assignedTo}
                                  onChange={(e) =>
                                    onUpdateTicket({
                                      ...ticket,
                                      assignedTo: e.target.value as 'Krishna' | 'Vansh',
                                    })
                                  }
                                  className="w-full px-2 py-1 rounded-lg border border-[#EAECEF] bg-white text-xs"
                                >
                                  <option value="Vansh">Vansh</option>
                                  <option value="Krishna">Krishna</option>
                                </select>
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                                Scope / Billing
                              </label>
                              <select
                                value={ticket.billingTag}
                                onChange={(e) =>
                                  onUpdateTicket({
                                    ...ticket,
                                    billingTag: e.target.value as ScopeBillingTag,
                                  })
                                }
                                className="w-full px-2 py-1 rounded-lg border border-[#EAECEF] bg-white text-xs"
                              >
                                {BILLING_TAGS.map((b) => (
                                  <option key={b} value={b}>
                                    {b}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                                Technical Notes
                              </label>
                              <textarea
                                rows={2}
                                value={ticket.notes}
                                onChange={(e) =>
                                  onUpdateTicket({
                                    ...ticket,
                                    notes: e.target.value,
                                  })
                                }
                                className="w-full px-2.5 py-1 rounded-lg border border-[#EAECEF] bg-white text-xs"
                              />
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {ticket.notes}
                          </p>
                        )}

                        {ticket.websiteUrl && (
                          <a
                            href={ticket.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-[11px] text-[#2563EB] hover:underline flex items-center gap-1"
                          >
                            <span>{ticket.websiteUrl.replace(/^https?:\/\//, '')}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}

                        <div className="pt-2.5 border-t border-[#EAECEF] flex items-center justify-between gap-2">
                          <select
                            aria-label={`Change workflow state for ${ticket.title}`}
                            value={ticket.state}
                            onChange={(e) =>
                              onUpdateTicket({
                                ...ticket,
                                state: e.target.value as TicketWorkflowState,
                              })
                            }
                            className="px-2.5 py-1 rounded-full bg-white border border-[#EAECEF] text-[11px] font-semibold text-[#0B0F19]"
                          >
                            {WORKFLOW_STATES.map((ws) => (
                              <option key={ws} value={ws}>
                                {ws}
                              </option>
                            ))}
                          </select>

                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <span>{ticket.assignedTo}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setEditingTicketId(isEditing ? null : ticket.id)
                              }
                              aria-label={`Edit ticket ${ticket.title}`}
                              className="text-slate-400 hover:text-[#2563EB] p-1 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteTicket(ticket.id)}
                              aria-label={`Delete ticket ${ticket.title}`}
                              className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
    </div>
  );
};
