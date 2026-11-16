import React, { useState } from 'react';
import { Plus, Trash2, ExternalLink } from 'lucide-react';
import type {
  DeliveryTicket,
  TicketCategory,
  TicketWorkflowState,
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

  const filtered = tickets.filter(
    (t) => activeTab === 'All Tickets' || t.category === activeTab
  );

  return (
    <div className="space-y-6">
      {/* Header & Filter Tabs */}
      <div className="bg-white border border-[#EAECEF] rounded-3xl p-6 sm:p-8 shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)] space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold tracking-wider uppercase text-[#2563EB] block">
              05 / DELIVERIES, BUGS &amp; CLIENT CHANGE REQUESTS
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B0F19] mt-1">
              Post-Sales Execution &amp; Scope Guardrail Board
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Every WhatsApp revision, production bug, and billable extra tracked from report to deployment.
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
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-[#EAECEF]">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-start">
        {WORKFLOW_STATES.map((state) => {
          const columnTickets = filtered.filter((t) => t.state === state);
          return (
            <div
              key={state}
              className="bg-white border border-[#EAECEF] rounded-3xl p-5 shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)] space-y-4"
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
                  columnTickets.map((ticket) => (
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

                      <p className="text-xs text-slate-600 leading-relaxed">
                        {ticket.notes}
                      </p>

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

                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>{ticket.assignedTo}</span>
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
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
