import React, { useState } from 'react';
import {
  Megaphone,
  Plus,
  TrendingUp,
  Target,
  IndianRupee,
  Users,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { ClientLead, MetaAdCampaign } from '../types';
import { calculateCPL, formatINR } from '../utils/calculations';

interface MetaAdsViewProps {
  campaigns: MetaAdCampaign[];
  clients?: ClientLead[];
  onUpdateCampaign: (updated: MetaAdCampaign) => void;
  onAddCampaign: (newCampaign: MetaAdCampaign) => void;
  onOpenClient360?: (clientId: string) => void;
}

export const MetaAdsView: React.FC<MetaAdsViewProps> = ({
  campaigns,
  clients = [],
  onUpdateCampaign,
  onAddCampaign,
  onOpenClient360,
}) => {
  const [showAdd, setShowAdd] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'All' | MetaAdCampaign['status']>('All');
  const [clientName, setClientName] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [objective, setObjective] = useState<MetaAdCampaign['objective']>('WhatsApp Messages');
  const [totalBudget, setTotalBudget] = useState(12000);
  const [agencyFee, setAgencyFee] = useState(4000);
  const [notes, setNotes] = useState('');

  const filteredCampaigns = campaigns.filter((c) =>
    statusFilter === 'All' ? true : c.status === statusFilter
  );

  const totalBudgetManaged = campaigns.reduce((s, c) => s + c.totalBudget, 0);
  const totalSpent = campaigns.reduce((s, c) => s + c.amountSpent, 0);
  const totalAgencyFees = campaigns.reduce((s, c) => s + c.agencyFee, 0);
  const totalLeads = campaigns.reduce((s, c) => s + c.leadsGenerated, 0);
  const avgCPL = calculateCPL(totalSpent, totalLeads);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !campaignName.trim()) return;
    const matched = clients.find(
      (c) => c.businessName.toLowerCase() === clientName.trim().toLowerCase()
    );
    const today = new Date().toISOString().slice(0, 10);
    onAddCampaign({
      id: `meta-${Date.now()}`,
      clientId: matched?.id,
      clientName: matched ? matched.businessName : clientName.trim(),
      campaignName: campaignName.trim(),
      objective,
      status: 'Active',
      totalBudget: Number(totalBudget),
      amountSpent: 0,
      agencyFee: Number(agencyFee),
      leadsGenerated: 0,
      startDate: today,
      endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      notes: notes.trim() || 'Targeted hyper-local lead generation campaign.',
    });
    setClientName('');
    setCampaignName('');
    setNotes('');
    setShowAdd(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EAECEF] shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)] flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-[#2563EB] mb-1">
            GROWTH · META ADS & LEAD FUNNELS
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B0F19]">
            Client Ad Spend, CPL & Retainer Tracker
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
            Client Ad Spend is tracked as a pass-through budget, strictly separated from Aethel Studios' Agency Retainer revenue.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-[#F8F9FA] p-1 rounded-xl border border-[#EAECEF]">
            {(['All', 'Active', 'Completed', 'Paused'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st as typeof statusFilter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === st
                    ? 'bg-[#0B0F19] text-white'
                    : 'text-[#64748B] hover:text-[#0B0F19]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B0F19] hover:bg-[#1E293B] text-white text-xs font-bold shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#60A5FA]" />
            Launch Campaign
          </button>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0B0F19] text-white rounded-3xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#94A3B8] text-xs font-medium">
            <span>Client Ad Spend (Pass-Through)</span>
            <Megaphone className="w-4 h-4 text-[#60A5FA]" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-extrabold font-mono text-white">
              {formatINR(totalSpent)}{' '}
              <span className="text-xs text-[#94A3B8] font-normal">
                / {formatINR(totalBudgetManaged)}
              </span>
            </div>
          </div>
          <div className="text-[11px] text-[#34D399] font-mono">
            Excluded from studio operational expenses
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-[#EAECEF] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#64748B] text-xs font-medium">
            <span>Aethel Agency Retainer Fees</span>
            <IndianRupee className="w-4 h-4 text-[#059669]" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-[#059669] my-2">
            {formatINR(totalAgencyFees)}
          </div>
          <div className="text-[11px] text-[#64748B]">Pure studio management revenue</div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-[#EAECEF] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#64748B] text-xs font-medium">
            <span>Total Client Leads Generated</span>
            <Users className="w-4 h-4 text-[#2563EB]" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-[#0B0F19] my-2">
            {totalLeads}
          </div>
          <div className="text-[11px] text-[#64748B]">Qualified WhatsApp & Form inquiries</div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-[#EAECEF] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#64748B] text-xs font-medium">
            <span>Studio Average CPL</span>
            <Target className="w-4 h-4 text-[#059669]" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-[#0B0F19] my-2">
            {formatINR(avgCPL)}
          </div>
          <div className="text-[11px] text-[#059669] font-semibold">
            High-converting hyper-local funnels
          </div>
        </div>
      </div>

      {showAdd && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-3xl p-6 border-2 border-[#2563EB]/20 shadow-lg space-y-4"
        >
          <div className="flex items-center justify-between border-b border-[#EAECEF] pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">
              + Launch New Meta Ad Campaign
            </h3>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="text-xs text-[#64748B]"
            >
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Client Business Name *
              </label>
              <input
                type="text"
                required
                list="meta-client-list"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g., Royal Orchid Lawns"
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm"
              />
              <datalist id="meta-client-list">
                {clients.map((c) => (
                  <option key={c.id} value={c.businessName} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Campaign Title *
              </label>
              <input
                type="text"
                required
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="Wedding Season Inquiry Funnel"
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Objective
              </label>
              <select
                value={objective}
                onChange={(e) =>
                  setObjective(e.target.value as MetaAdCampaign['objective'])
                }
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm bg-white"
              >
                <option value="WhatsApp Messages">WhatsApp Messages</option>
                <option value="Lead Generation Form">Lead Generation Form</option>
                <option value="Website Traffic">Website Traffic</option>
                <option value="Instagram Reach">Instagram Reach</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Client Ad Budget (₹)
              </label>
              <input
                type="number"
                value={totalBudget}
                onChange={(e) => setTotalBudget(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Aethel Agency Fee (₹)
              </label>
              <input
                type="number"
                value={agencyFee}
                onChange={(e) => setAgencyFee(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Creative / Targeting Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="10km radius, 24-50 age group..."
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-full bg-[#2563EB] text-white text-xs font-bold cursor-pointer"
            >
              Save Campaign
            </button>
          </div>
        </form>
      )}

      {/* Campaign Cards or Clean Empty State Onboarding (Part 5) */}
      {filteredCampaigns.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 border border-[#EAECEF] text-center max-w-xl mx-auto space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-extrabold text-[#0B0F19]">
            No {statusFilter !== 'All' ? statusFilter : ''} Meta Ad Campaigns Yet
          </h3>
          <p className="text-xs text-[#64748B] leading-relaxed">
            Launch a hyper-local WhatsApp or Instant Form lead generation campaign for any client in your CRM pipeline to track Ad Spend, CPL, and Agency Retainer fees automatically.
          </p>
          <button
            onClick={() => setShowAdd(true)}
            className="px-5 py-2.5 rounded-xl bg-[#2563EB] text-white text-xs font-bold cursor-pointer"
          >
            + Launch First Campaign
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {filteredCampaigns.map((camp) => {
            const cpl = calculateCPL(camp.amountSpent, camp.leadsGenerated);
            const burnPercent =
              camp.totalBudget > 0
                ? Math.min(100, Math.round((camp.amountSpent / camp.totalBudget) * 100))
                : 0;

            return (
              <div
                key={camp.id}
                className="bg-white rounded-3xl p-6 border border-[#EAECEF] shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)] flex flex-col justify-between space-y-5"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-[#2563EB]">
                      {camp.objective}
                    </span>
                    <select
                      value={camp.status}
                      onChange={(e) =>
                        onUpdateCampaign({
                          ...camp,
                          status: e.target.value as MetaAdCampaign['status'],
                        })
                      }
                      aria-label={`Campaign status for ${camp.campaignName}`}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border cursor-pointer ${
                        camp.status === 'Active'
                          ? 'bg-[#D1FAE5]/60 text-[#059669] border-[#A7F3D0]'
                          : camp.status === 'Completed'
                          ? 'bg-slate-100 text-slate-700 border-slate-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      <option value="Active">● Active</option>
                      <option value="Learning">◐ Learning</option>
                      <option value="Paused">❚❚ Paused</option>
                      <option value="Completed">✓ Completed</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() =>
                          camp.clientId && onOpenClient360 && onOpenClient360(camp.clientId)
                        }
                        className="text-xs font-bold uppercase tracking-wider text-[#64748B] hover:text-[#2563EB] flex items-center gap-1 cursor-pointer"
                      >
                        {camp.clientName}
                        {camp.clientId && <ArrowUpRight className="w-3 h-3" />}
                      </button>
                    </div>
                    <h3 className="text-base font-extrabold text-[#0B0F19] leading-snug mt-0.5">
                      {camp.campaignName}
                    </h3>
                  </div>

                  {/* Budget Progress Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#64748B]">Ad Spend Utilized</span>
                      <span className="font-mono font-bold text-[#0B0F19]">
                        {formatINR(camp.amountSpent)} / {formatINR(camp.totalBudget)} ({burnPercent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#F1F5F9] overflow-hidden">
                      <div
                        className="h-full bg-[#2563EB] rounded-full transition-all"
                        style={{ width: `${burnPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <div className="p-3 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF]">
                      <div className="text-[10px] font-bold uppercase text-[#64748B]">
                        Leads
                      </div>
                      <div className="text-base font-extrabold font-mono text-[#0B0F19] mt-0.5">
                        {camp.leadsGenerated}
                      </div>
                    </div>
                    <div className="p-3 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF]">
                      <div className="text-[10px] font-bold uppercase text-[#64748B]">
                        CPL
                      </div>
                      <div className="text-base font-extrabold font-mono text-[#059669] mt-0.5">
                        {cpl > 0 ? formatINR(cpl) : '—'}
                      </div>
                    </div>
                    <div className="p-3 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF]">
                      <div className="text-[10px] font-bold uppercase text-[#64748B]">
                        Retainer
                      </div>
                      <div className="text-base font-extrabold font-mono text-[#2563EB] mt-0.5">
                        {formatINR(camp.agencyFee)}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-[#64748B] leading-relaxed">{camp.notes}</p>
                </div>

                {/* Fast Inline Update Controls */}
                <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-between gap-2">
                  <button
                    onClick={() =>
                      onUpdateCampaign({
                        ...camp,
                        leadsGenerated: camp.leadsGenerated + 5,
                      })
                    }
                    className="flex-1 py-2 px-3 rounded-xl bg-[#F8F9FA] hover:bg-[#EFF6FF] text-[#0B0F19] hover:text-[#2563EB] text-xs font-bold border border-[#EAECEF] transition-colors cursor-pointer"
                  >
                    +5 Leads
                  </button>
                  <button
                    onClick={() =>
                      onUpdateCampaign({
                        ...camp,
                        amountSpent: Math.min(camp.totalBudget, camp.amountSpent + 1000),
                      })
                    }
                    className="flex-1 py-2 px-3 rounded-xl bg-[#F8F9FA] hover:bg-[#EFF6FF] text-[#0B0F19] hover:text-[#2563EB] text-xs font-bold border border-[#EAECEF] transition-colors cursor-pointer"
                  >
                    +₹1k Spend
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
