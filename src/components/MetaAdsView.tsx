import React, { useState } from 'react';
import {
  Plus,
  CheckSquare,
  Square,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import type {
  MetaCampaign,
  CampaignStatus,
} from '../types';
import {
  formatINR,
  calculateCPL,
  calculateCampaignProgress,
} from '../utils/calculations';

interface MetaAdsViewProps {
  campaigns: MetaCampaign[];
  onUpdateCampaign: (c: MetaCampaign) => void;
  onDeleteCampaign: (id: string) => void;
  onOpenAddCampaign: () => void;
}

const CAMPAIGN_STATUSES: CampaignStatus[] = [
  'Active & Scaling',
  'Learning Phase',
  'Creative Testing',
  'Paused',
  'Completed',
];

export const MetaAdsView: React.FC<MetaAdsViewProps> = ({
  campaigns,
  onUpdateCampaign,
  onDeleteCampaign,
  onOpenAddCampaign,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filtered = campaigns.filter(
    (c) => statusFilter === 'ALL' || c.status === statusFilter
  );

  const totalBudget = campaigns.reduce((s, c) => s + c.totalAdBudget, 0);
  const totalSpend = campaigns.reduce((s, c) => s + c.adSpendUsed, 0);
  const totalAgencyFees = campaigns.reduce((s, c) => s + c.agencyFee, 0);
  const totalLeads = campaigns.reduce((s, c) => s + c.leadsGenerated, 0);
  const blendedCPL = calculateCPL(totalSpend, totalLeads);

  return (
    <div className="space-y-6">
      {/* Header & Summary Strip */}
      <div className="bg-white border border-[#EAECEF] rounded-3xl p-6 sm:p-8 shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)] space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold tracking-wider uppercase text-[#2563EB] block">
              03 / META ADS &amp; LOCAL GROWTH MANAGER
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B0F19] mt-1">
              Hyperlocal Performance &amp; CPL Command
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Managing 7-day Starter, 15-day Growth, and 30-day Scale Meta Ad sprints across Maharashtra.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              aria-label="Filter campaigns by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 rounded-full bg-[#F8F9FA] border border-[#EAECEF] text-xs font-semibold text-[#0B0F19]"
            >
              <option value="ALL">All Campaign Statuses</option>
              {CAMPAIGN_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={onOpenAddCampaign}
              className="px-4 py-2.5 rounded-full bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Launch Meta Campaign</span>
            </button>
          </div>
        </div>

        {/* 4 Metric Summary Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-[#EAECEF]">
          <div>
            <span className="text-xs text-slate-500 block">Total Ad Budget Managed</span>
            <span className="font-mono text-2xl font-bold text-[#0B0F19] mt-0.5 block">
              {formatINR(totalBudget)}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-500 block">Ad Spend Utilized</span>
            <span className="font-mono text-2xl font-bold text-[#2563EB] mt-0.5 block">
              {formatINR(totalSpend)}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-500 block">Aethel Agency Retainer Fees</span>
            <span className="font-mono text-2xl font-bold text-[#059669] mt-0.5 block">
              {formatINR(totalAgencyFees)}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-500 block">Total Leads &amp; Blended CPL</span>
            <span className="font-mono text-2xl font-bold text-[#0B0F19] mt-0.5 block">
              {totalLeads} leads · {formatINR(blendedCPL)}/lead
            </span>
          </div>
        </div>
      </div>

      {/* Campaign Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {filtered.map((campaign) => {
          const cpl = calculateCPL(campaign.adSpendUsed, campaign.leadsGenerated);
          const prog = calculateCampaignProgress(campaign.startDate, campaign.endDate);
          const isEndingSoon = prog.daysRemaining <= 3 && campaign.status !== 'Completed';

          return (
            <div
              key={campaign.id}
              className="bg-white border border-[#EAECEF] rounded-3xl p-6 shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)] flex flex-col justify-between space-y-5"
            >
              <div className="space-y-4">
                {/* Top Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB]">
                      {campaign.packageDuration} · {campaign.objective}
                    </span>
                    <h2 className="text-lg font-bold text-[#0B0F19] mt-0.5">
                      {campaign.clientName}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {campaign.niche} · Lead: {campaign.assignedLead}
                    </p>
                  </div>

                  <select
                    aria-label={`Status for ${campaign.clientName}`}
                    value={campaign.status}
                    onChange={(e) =>
                      onUpdateCampaign({
                        ...campaign,
                        status: e.target.value as CampaignStatus,
                      })
                    }
                    className="px-3 py-1 rounded-full bg-[#F8F9FA] border border-[#EAECEF] text-xs font-semibold text-[#0B0F19]"
                  >
                    {CAMPAIGN_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Progress Bar of Days Remaining */}
                <div className="space-y-1.5 bg-[#F8F9FA] p-3.5 rounded-2xl border border-[#EAECEF]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-600">
                      {campaign.startDate} &rarr; {campaign.endDate}
                    </span>
                    <span
                      className={`font-mono font-bold ${
                        isEndingSoon ? 'text-rose-600' : 'text-[#0B0F19]'
                      }`}
                    >
                      {prog.daysRemaining}d remaining ({prog.percentComplete}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isEndingSoon ? 'bg-amber-500' : 'bg-[#2563EB]'
                      }`}
                      style={{ width: `${prog.percentComplete}%` }}
                    />
                  </div>
                </div>

                {/* Financial & ROI Metrics (Inline Editable Spend & Leads) */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF]">
                    <span className="text-slate-500 block">Total Ad Budget</span>
                    <span className="font-mono text-sm font-bold text-[#0B0F19] mt-0.5 block">
                      {formatINR(campaign.totalAdBudget)}
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Agency Fee: <strong className="font-mono">{formatINR(campaign.agencyFee)}</strong>
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#0B0F19] text-white">
                    <span className="text-[#94A3B8] block flex items-center justify-between">
                      <span>Auto CPL (INR)</span>
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    </span>
                    <span className="font-mono text-lg font-bold text-emerald-400 mt-0.5 block">
                      {formatINR(cpl)} / lead
                    </span>
                    <span className="text-[11px] text-[#94A3B8] block">
                      {campaign.leadsGenerated} WhatsApp / Leads
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Ad Spend Used (₹)
                    </label>
                    <input
                      type="number"
                      aria-label={`Ad spend used for ${campaign.clientName}`}
                      value={campaign.adSpendUsed}
                      onChange={(e) =>
                        onUpdateCampaign({
                          ...campaign,
                          adSpendUsed: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] font-mono text-xs font-bold text-[#0B0F19]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Leads / Clicks Generated
                    </label>
                    <input
                      type="number"
                      aria-label={`Leads generated for ${campaign.clientName}`}
                      value={campaign.leadsGenerated}
                      onChange={(e) =>
                        onUpdateCampaign({
                          ...campaign,
                          leadsGenerated: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] font-mono text-xs font-bold text-[#059669]"
                    />
                  </div>
                </div>

                {/* Technical Checklist Controls */}
                <div className="space-y-1.5 pt-2 border-t border-[#EAECEF]">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Technical Funnel Checklist
                  </span>
                  <div className="flex flex-col gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateCampaign({
                          ...campaign,
                          metaPixelInstalled: !campaign.metaPixelInstalled,
                        })
                      }
                      className="flex items-center gap-2 text-left text-slate-700 hover:text-[#0B0F19] cursor-pointer"
                    >
                      {campaign.metaPixelInstalled ? (
                        <CheckSquare className="w-4 h-4 text-[#059669] shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <span>Meta Pixel Installed</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onUpdateCampaign({
                          ...campaign,
                          whatsappFlowConnected: !campaign.whatsappFlowConnected,
                        })
                      }
                      className="flex items-center gap-2 text-left text-slate-700 hover:text-[#0B0F19] cursor-pointer"
                    >
                      {campaign.whatsappFlowConnected ? (
                        <CheckSquare className="w-4 h-4 text-[#059669] shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <span>WhatsApp Direct Flow Connected</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onUpdateCampaign({
                          ...campaign,
                          gbpSynced: !campaign.gbpSynced,
                        })
                      }
                      className="flex items-center gap-2 text-left text-slate-700 hover:text-[#0B0F19] cursor-pointer"
                    >
                      {campaign.gbpSynced ? (
                        <CheckSquare className="w-4 h-4 text-[#059669] shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <span>Google Business Profile Synced</span>
                    </button>
                  </div>
                </div>

                {/* Audience & Hook Notes */}
                <div className="pt-2 border-t border-[#EAECEF]">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Ad Creative &amp; Audience Notes
                  </span>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {campaign.audienceNotes}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-[#EAECEF] flex items-center justify-between text-xs">
                <span className="font-mono text-slate-500">
                  Remaining Budget: {formatINR(Math.max(0, campaign.totalAdBudget - campaign.adSpendUsed))}
                </span>
                <button
                  type="button"
                  onClick={() => onDeleteCampaign(campaign.id)}
                  aria-label={`Delete campaign for ${campaign.clientName}`}
                  className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Performance Comparison Table */}
      <div className="bg-white border border-[#EAECEF] rounded-3xl overflow-hidden shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)]">
        <div className="px-6 py-4 border-b border-[#EAECEF] flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#0B0F19]">
            Campaign ROI &amp; Cost-Per-Lead Ledger
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            All metrics in ₹ INR
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#EAECEF] bg-[#F8F9FA] text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Client &amp; Niche</th>
                <th className="py-3 px-4">Objective &amp; Package</th>
                <th className="py-3 px-4 text-right">Total Budget</th>
                <th className="py-3 px-4 text-right">Spend Used</th>
                <th className="py-3 px-4 text-right">Agency Fee</th>
                <th className="py-3 px-4 text-right">Leads</th>
                <th className="py-3 px-4 text-right">CPL (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAECEF] text-xs">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/80">
                  <td className="py-3 px-4 font-bold text-[#0B0F19]">
                    {c.clientName}
                    <span className="block text-[11px] font-normal text-slate-500">
                      {c.niche}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {c.objective} ({c.packageDuration})
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    {formatINR(c.totalAdBudget)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-[#2563EB]">
                    {formatINR(c.adSpendUsed)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-[#059669] font-semibold">
                    {formatINR(c.agencyFee)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold">
                    {c.leadsGenerated}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-[#0B0F19]">
                    {formatINR(calculateCPL(c.adSpendUsed, c.leadsGenerated))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
