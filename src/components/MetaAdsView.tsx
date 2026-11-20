import React, { useState } from 'react';
import {
  Megaphone,
  Plus,
  Target,
  IndianRupee,
  Users,
  ArrowUpRight,
  Sparkles,
  Trash2,
  CheckCircle2,
  Pencil,
  X,
  FileBarChart,
  Printer,
  MousePointerClick,
  Eye,
} from 'lucide-react';
import { ClientLead, ExpensePaidBy, MetaAdCampaign } from '../types';
import {
  calculateCPC,
  calculateCPL,
  calculateCTR,
  formatINR,
} from '../utils/calculations';

interface MetaAdsViewProps {
  campaigns: MetaAdCampaign[];
  clients?: ClientLead[];
  onUpdateCampaign: (updated: MetaAdCampaign) => void;
  onAddCampaign: (newCampaign: MetaAdCampaign) => void;
  onDeleteCampaign?: (campaignId: string) => void;
  onOpenClient360?: (clientId: string) => void;
}

export const MetaAdsView: React.FC<MetaAdsViewProps> = ({
  campaigns,
  clients = [],
  onUpdateCampaign,
  onAddCampaign,
  onDeleteCampaign,
  onOpenClient360,
}) => {
  const [showAdd, setShowAdd] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'All' | MetaAdCampaign['status']>('All');
  const [clientName, setClientName] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [objective, setObjective] = useState<MetaAdCampaign['objective']>('Website Traffic');
  const [totalBudget, setTotalBudget] = useState(0);
  const [amountSpent, setAmountSpent] = useState(0);
  const [agencyFee, setAgencyFee] = useState(0);
  const [paidBy, setPaidBy] = useState<ExpensePaidBy>('Vansh');
  const [impressions, setImpressions] = useState(0);
  const [reach, setReach] = useState(0);
  const [clicks, setClicks] = useState(0);
  const [roas, setRoas] = useState(0);
  const [notes, setNotes] = useState('');

  // Full Card Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<MetaAdCampaign | null>(null);

  // Client Monthly Performance Report Modal State
  const [reportCampaign, setReportCampaign] = useState<MetaAdCampaign | null>(null);

  const handleStartEdit = (camp: MetaAdCampaign) => {
    setEditingId(camp.id);
    setEditDraft({ ...camp });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDraft || !editDraft.campaignName.trim()) return;
    const matched = clients.find(
      (c) =>
        c.businessName.toLowerCase() === editDraft.clientName.trim().toLowerCase() ||
        c.businessName.toLowerCase().includes(editDraft.clientName.trim().toLowerCase())
    );
    const cleanBudget = Math.max(0, Number(editDraft.totalBudget) || 0);
    const cleanSpent = Math.max(0, Number(editDraft.amountSpent) || 0);
    onUpdateCampaign({
      ...editDraft,
      clientId: matched ? matched.id : editDraft.clientId,
      clientName: matched ? matched.businessName : editDraft.clientName.trim(),
      campaignName: editDraft.campaignName.trim(),
      totalBudget: Math.max(cleanBudget, cleanSpent),
      amountSpent: cleanSpent,
      agencyFee: Math.max(0, Number(editDraft.agencyFee) || 0),
      leadsGenerated: Math.max(0, Number(editDraft.leadsGenerated) || 0),
      impressions: Math.max(0, Number(editDraft.impressions) || 0),
      reach: Math.max(0, Number(editDraft.reach) || 0),
      clicks: Math.max(0, Number(editDraft.clicks) || 0),
      conversions: Math.max(0, Number(editDraft.conversions) || 0),
      roas: Math.max(0, Number(editDraft.roas) || 0),
      notes: editDraft.notes.trim(),
    });
    setEditingId(null);
    setEditDraft(null);
  };

  const filteredCampaigns = campaigns.filter((c) =>
    statusFilter === 'All' ? true : c.status === statusFilter
  );

  const totalBudgetManaged = campaigns.reduce((s, c) => s + c.totalBudget, 0);
  const totalSpent = campaigns.reduce((s, c) => s + c.amountSpent, 0);
  const totalAgencyFees = campaigns.reduce((s, c) => s + c.agencyFee, 0);
  const totalLeads = campaigns.reduce((s, c) => s + c.leadsGenerated, 0);
  const totalImpressions = campaigns.reduce((s, c) => s + (c.impressions || 0), 0);
  const totalClicks = campaigns.reduce((s, c) => s + (c.clicks || 0), 0);
  const avgCPL = calculateCPL(totalSpent, totalLeads);
  const avgCTR = calculateCTR(totalClicks, totalImpressions);
  const avgCPC = calculateCPC(totalSpent, totalClicks);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !campaignName.trim()) return;
    const matched = clients.find(
      (c) =>
        c.businessName.toLowerCase() === clientName.trim().toLowerCase() ||
        c.businessName.toLowerCase().includes(clientName.trim().toLowerCase())
    );
    const today = new Date().toISOString().slice(0, 10);
    const budgetNum = Math.max(0, Number(totalBudget) || 0);
    const spentNum = Math.max(0, Number(amountSpent) || budgetNum);

    onAddCampaign({
      id: `meta-${Date.now()}`,
      clientId: matched?.id,
      clientName: matched ? matched.businessName : clientName.trim(),
      campaignName: campaignName.trim(),
      objective,
      status: 'Active',
      totalBudget: budgetNum,
      amountSpent: spentNum,
      agencyFee: Math.max(0, Number(agencyFee) || 0),
      leadsGenerated: 0,
      impressions: Math.max(0, Number(impressions) || 0),
      reach: Math.max(0, Number(reach) || 0),
      clicks: Math.max(0, Number(clicks) || 0),
      conversions: 0,
      roas: Math.max(0, Number(roas) || 0),
      startDate: today,
      endDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      notes: notes.trim() || 'Targeted hyper-local lead generation campaign.',
      paidBy,
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
            GROWTH · META ADS CAMPAIGN TRACKER (MANUAL METRICS · FINANCE SYNC)
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B0F19]">
            Client Ad Spend, CTR, CPL &amp; Retainer Tracker
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
            Track full funnel metrics (<strong>Impressions, Reach, Clicks, CTR, CPC, CPL, ROAS</strong>) and generate printable Monthly Performance Reports for clients.
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

          {campaigns.length > 0 && (
            <button
              onClick={() => setReportCampaign(campaigns[0])}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#2563EB] border border-[#BFDBFE] text-xs font-bold cursor-pointer"
            >
              <FileBarChart className="w-4 h-4" />
              Monthly Ad Report
            </button>
          )}

          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B0F19] hover:bg-[#1E293B] text-white text-xs font-bold shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#60A5FA]" />
            Add Campaign Tracker
          </button>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-[#0B0F19] text-white rounded-3xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#94A3B8] text-xs font-medium">
            <span>Total Meta Ad Spend Synced</span>
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
          <div className="text-[11px] text-[#34D399] font-mono flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Synced to Studio Finance
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-[#EAECEF] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#64748B] text-xs font-medium">
            <span>Total Impressions &amp; Reach</span>
            <Eye className="w-4 h-4 text-[#2563EB]" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-[#0B0F19] my-2">
            {totalImpressions.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-[#64748B] font-mono">
            Clicks: <strong className="text-[#0B0F19]">{totalClicks.toLocaleString('en-IN')}</strong> · CTR: <strong className="text-[#2563EB]">{avgCTR}%</strong>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-[#EAECEF] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#64748B] text-xs font-medium">
            <span>Average CPC &amp; CPL</span>
            <MousePointerClick className="w-4 h-4 text-[#059669]" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-[#0B0F19] my-2">
            ₹{avgCPC} <span className="text-xs font-normal text-[#64748B]">CPC</span>
          </div>
          <div className="text-[11px] text-[#059669] font-semibold font-mono">
            Avg CPL: {avgCPL > 0 ? formatINR(avgCPL) : '₹0'}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-[#EAECEF] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#64748B] text-xs font-medium">
            <span>Total Leads Generated</span>
            <Users className="w-4 h-4 text-[#2563EB]" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-[#0B0F19] my-2">
            {totalLeads}
          </div>
          <div className="text-[11px] text-[#64748B]">Qualified WhatsApp &amp; Web inquiries</div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-[#EAECEF] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#64748B] text-xs font-medium">
            <span>Aethel Agency Retainer Fees</span>
            <IndianRupee className="w-4 h-4 text-[#059669]" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-[#059669] my-2">
            {formatINR(totalAgencyFees)}
          </div>
          <div className="text-[11px] text-[#64748B]">Standalone management retainer</div>
        </div>
      </div>

      {showAdd && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-3xl p-6 border-2 border-[#2563EB]/20 shadow-lg space-y-4"
        >
          <div className="flex items-center justify-between border-b border-[#EAECEF] pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">
              + Add Campaign Tracker (Syncs Recorded Spend to Finance)
            </h3>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="text-xs text-[#64748B]"
            >
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                placeholder="e.g., Kabra Mobiles"
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
                placeholder="Offer / Lead Funnel"
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
                <option value="Website Traffic">Website Traffic</option>
                <option value="WhatsApp Messages">WhatsApp Messages</option>
                <option value="Lead Generation Form">Lead Generation Form</option>
                <option value="Instagram Reach">Instagram Reach</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Paid By (Syncs to Finance)
              </label>
              <select
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value as ExpensePaidBy)}
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm font-bold bg-white"
              >
                <option value="Vansh">Vansh</option>
                <option value="Krishna">Krishna</option>
                <option value="Studio Account">Studio Account</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Campaign Budget (₹)
              </label>
              <input
                type="number"
                value={totalBudget}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setTotalBudget(val);
                  setAmountSpent(val);
                }}
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Ad Spend Utilized (₹)
              </label>
              <input
                type="number"
                value={amountSpent}
                onChange={(e) => setAmountSpent(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm font-mono font-bold text-[#2563EB]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Impressions / Reach / Clicks
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <input
                  type="number"
                  value={impressions}
                  onChange={(e) => setImpressions(Number(e.target.value))}
                  placeholder="Impr"
                  className="px-2 py-2 rounded-xl border border-[#EAECEF] text-xs font-mono"
                />
                <input
                  type="number"
                  value={reach}
                  onChange={(e) => setReach(Number(e.target.value))}
                  placeholder="Reach"
                  className="px-2 py-2 rounded-xl border border-[#EAECEF] text-xs font-mono"
                />
                <input
                  type="number"
                  value={clicks}
                  onChange={(e) => setClicks(Number(e.target.value))}
                  placeholder="Clicks"
                  className="px-2 py-2 rounded-xl border border-[#EAECEF] text-xs font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Retainer Fee (₹) &amp; ROAS
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="number"
                  value={agencyFee}
                  onChange={(e) => setAgencyFee(Number(e.target.value))}
                  placeholder="Retainer"
                  className="px-2.5 py-2 rounded-xl border border-[#EAECEF] text-xs font-mono"
                />
                <input
                  type="number"
                  step="0.1"
                  value={roas}
                  onChange={(e) => setRoas(Number(e.target.value))}
                  placeholder="ROAS 4.2x"
                  className="px-2.5 py-2 rounded-xl border border-[#EAECEF] text-xs font-mono"
                />
              </div>
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Creative / Targeting Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="25 miles Radius, Festive Offer..."
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-full bg-[#2563EB] text-white text-xs font-bold cursor-pointer"
            >
              Save &amp; Sync Campaign to Finance
            </button>
          </div>
        </form>
      )}

      {/* Campaign Cards */}
      {filteredCampaigns.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 border border-[#EAECEF] text-center max-w-xl mx-auto space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-extrabold text-[#0B0F19]">
            No {statusFilter !== 'All' ? statusFilter : ''} Meta Ad Campaigns Yet
          </h3>
          <p className="text-xs text-[#64748B] leading-relaxed">
            Campaign details and performance metrics are entered manually. Recorded ad spend is synchronized with Studio Finance expenses; this screen does not create or edit campaigns in Meta Ads Manager.
          </p>
          <button
            onClick={() => setShowAdd(true)}
            className="px-5 py-2.5 rounded-xl bg-[#2563EB] text-white text-xs font-bold cursor-pointer"
          >
            + Add First Campaign Tracker
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredCampaigns.map((camp) => {
            const cpl = calculateCPL(camp.amountSpent, camp.leadsGenerated);
            const ctr = calculateCTR(camp.clicks || 0, camp.impressions || 0);
            const cpc = calculateCPC(camp.amountSpent, camp.clicks || 0);
            const burnPercent =
              camp.totalBudget > 0
                ? Math.min(100, Math.round((camp.amountSpent / camp.totalBudget) * 100))
                : 0;
            const isEditing = editingId === camp.id && editDraft !== null;

            if (isEditing && editDraft) {
              return (
                <form
                  key={camp.id}
                  onSubmit={handleSaveEdit}
                  className="bg-white rounded-3xl p-6 border-2 border-[#2563EB] shadow-lg flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-[#EAECEF] pb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB]">
                      Edit Campaign Metrics &amp; Finance Sync
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setEditDraft(null);
                      }}
                      className="p-1 rounded-lg text-[#64748B] hover:text-[#0B0F19] cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-0.5">
                          Client Business Name *
                        </label>
                        <input
                          type="text"
                          required
                          list="meta-client-list"
                          value={editDraft.clientName}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, clientName: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 rounded-xl border border-[#EAECEF] text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-0.5">
                          Campaign Title *
                        </label>
                        <input
                          type="text"
                          required
                          value={editDraft.campaignName}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, campaignName: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 rounded-xl border border-[#EAECEF] text-xs font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-0.5">
                          Objective
                        </label>
                        <select
                          value={editDraft.objective}
                          onChange={(e) =>
                            setEditDraft({
                              ...editDraft,
                              objective: e.target.value as MetaAdCampaign['objective'],
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-xl border border-[#EAECEF] text-xs bg-white"
                        >
                          <option value="Website Traffic">Website Traffic</option>
                          <option value="WhatsApp Messages">WhatsApp Messages</option>
                          <option value="Lead Generation Form">Lead Generation Form</option>
                          <option value="Instagram Reach">Instagram Reach</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-0.5">
                          Status
                        </label>
                        <select
                          value={editDraft.status}
                          onChange={(e) =>
                            setEditDraft({
                              ...editDraft,
                              status: e.target.value as MetaAdCampaign['status'],
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-xl border border-[#EAECEF] text-xs bg-white font-bold"
                        >
                          <option value="Active">Active</option>
                          <option value="Learning">Learning</option>
                          <option value="Paused">Paused</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-0.5">
                          Budget (₹)
                        </label>
                        <input
                          type="number"
                          value={editDraft.totalBudget}
                          onChange={(e) =>
                            setEditDraft({
                              ...editDraft,
                              totalBudget: Number(e.target.value),
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-xl border border-[#EAECEF] text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-0.5">
                          Spend (₹)
                        </label>
                        <input
                          type="number"
                          value={editDraft.amountSpent}
                          onChange={(e) =>
                            setEditDraft({
                              ...editDraft,
                              amountSpent: Number(e.target.value),
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-xl border border-[#EAECEF] text-xs font-mono font-bold text-[#2563EB]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-0.5">
                          Retainer (₹)
                        </label>
                        <input
                          type="number"
                          value={editDraft.agencyFee}
                          onChange={(e) =>
                            setEditDraft({
                              ...editDraft,
                              agencyFee: Number(e.target.value),
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-xl border border-[#EAECEF] text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-0.5">
                          Impressions
                        </label>
                        <input
                          type="number"
                          value={editDraft.impressions || 0}
                          onChange={(e) =>
                            setEditDraft({
                              ...editDraft,
                              impressions: Number(e.target.value),
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-xl border border-[#EAECEF] text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-0.5">
                          Reach
                        </label>
                        <input
                          type="number"
                          value={editDraft.reach || 0}
                          onChange={(e) =>
                            setEditDraft({
                              ...editDraft,
                              reach: Number(e.target.value),
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-xl border border-[#EAECEF] text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-0.5">
                          Clicks
                        </label>
                        <input
                          type="number"
                          value={editDraft.clicks || 0}
                          onChange={(e) =>
                            setEditDraft({
                              ...editDraft,
                              clicks: Number(e.target.value),
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-xl border border-[#EAECEF] text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-0.5">
                          ROAS (x)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={editDraft.roas || 4.2}
                          onChange={(e) =>
                            setEditDraft({
                              ...editDraft,
                              roas: Number(e.target.value),
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-xl border border-[#EAECEF] text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-0.5">
                          Leads Generated
                        </label>
                        <input
                          type="number"
                          value={editDraft.leadsGenerated}
                          onChange={(e) =>
                            setEditDraft({
                              ...editDraft,
                              leadsGenerated: Number(e.target.value),
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-xl border border-[#EAECEF] text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-0.5">
                          Paid By (Finance)
                        </label>
                        <select
                          value={editDraft.paidBy || 'Vansh'}
                          onChange={(e) =>
                            setEditDraft({
                              ...editDraft,
                              paidBy: e.target.value as ExpensePaidBy,
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-xl border border-[#EAECEF] text-xs font-bold bg-white"
                        >
                          <option value="Vansh">Vansh</option>
                          <option value="Krishna">Krishna</option>
                          <option value="Studio Account">Studio Account</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-0.5">
                        Targeting / Creative Notes
                      </label>
                      <input
                        type="text"
                        value={editDraft.notes}
                        onChange={(e) =>
                          setEditDraft({ ...editDraft, notes: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 rounded-xl border border-[#EAECEF] text-xs"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setEditDraft(null);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-[#F8F9FA] text-[#64748B] text-xs font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-bold cursor-pointer"
                    >
                      Save &amp; Sync
                    </button>
                  </div>
                </form>
              );
            }

            return (
              <div
                key={camp.id}
                className="bg-white rounded-3xl p-6 border border-[#EAECEF] shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)] flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[11px] font-bold text-[#2563EB]">
                      {camp.objective}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <select
                        value={camp.status}
                        onChange={(e) => {
                          const nextStatus = e.target.value as MetaAdCampaign['status'];
                          onUpdateCampaign({
                            ...camp,
                            status: nextStatus,
                            amountSpent:
                              nextStatus === 'Completed' && camp.amountSpent === 0
                                ? camp.totalBudget
                                : camp.amountSpent,
                          });
                        }}
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

                      <button
                        type="button"
                        onClick={() => setReportCampaign(camp)}
                        className="px-2.5 py-1 rounded-lg bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#2563EB] border border-[#BFDBFE] text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <FileBarChart className="w-3 h-3" /> Report
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStartEdit(camp)}
                        aria-label={`Edit campaign ${camp.campaignName}`}
                        className="px-2.5 py-1 rounded-lg bg-[#F8F9FA] hover:bg-[#EFF6FF] text-[#475569] hover:text-[#2563EB] border border-[#EAECEF] text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </button>

                      {onDeleteCampaign && (
                        <button
                          onClick={() => onDeleteCampaign(camp.id)}
                          aria-label={`Delete campaign ${camp.campaignName}`}
                          className="p-1.5 rounded-lg text-[#94A3B8] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
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
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded-md border border-[#A7F3D0]">
                        <CheckCircle2 className="w-3 h-3" /> Synced to Finance
                      </span>
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

                  {/* Part 6: Rich Campaign Performance Metrics Grid */}
                  <div className="grid grid-cols-5 gap-2 pt-1 text-center">
                    <div className="p-2 rounded-xl bg-[#F8F9FA] border border-[#EAECEF]">
                      <div className="text-[9px] font-bold uppercase text-[#64748B]">Impr.</div>
                      <div className="text-xs font-mono font-extrabold text-[#0B0F19]">
                        {(camp.impressions || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-[#F8F9FA] border border-[#EAECEF]">
                      <div className="text-[9px] font-bold uppercase text-[#64748B]">Reach</div>
                      <div className="text-xs font-mono font-extrabold text-[#0B0F19]">
                        {(camp.reach || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-[#F8F9FA] border border-[#EAECEF]">
                      <div className="text-[9px] font-bold uppercase text-[#64748B]">Clicks</div>
                      <div className="text-xs font-mono font-extrabold text-[#0B0F19]">
                        {(camp.clicks || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE]">
                      <div className="text-[9px] font-bold uppercase text-[#2563EB]">CTR / CPC</div>
                      <div className="text-xs font-mono font-extrabold text-[#2563EB]">
                        {ctr}% · ₹{cpc}
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0]">
                      <div className="text-[9px] font-bold uppercase text-[#059669]">ROAS</div>
                      <div className="text-xs font-mono font-extrabold text-[#059669]">
                        {camp.roas || 4.2}x
                      </div>
                    </div>
                  </div>

                  {/* Inline Editable Spend, Leads & Paid By (Syncs directly to Finance) */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="p-2.5 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF]">
                      <label className="block text-[9px] font-bold uppercase text-[#64748B]">
                        Spend (₹)
                      </label>
                      <input
                        type="number"
                        value={camp.amountSpent}
                        onChange={(e) => {
                          const nextSpent = Math.max(0, Number(e.target.value) || 0);
                          onUpdateCampaign({
                            ...camp,
                            amountSpent: nextSpent,
                            totalBudget: Math.max(camp.totalBudget, nextSpent),
                          });
                        }}
                        className="w-full mt-0.5 bg-white px-2 py-1 rounded-lg border border-[#EAECEF] text-xs font-mono font-extrabold text-[#0B0F19]"
                      />
                    </div>

                    <div className="p-2.5 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF]">
                      <label className="block text-[9px] font-bold uppercase text-[#64748B]">
                        Leads ({cpl > 0 ? `${formatINR(cpl)} CPL` : 'CPL —'})
                      </label>
                      <input
                        type="number"
                        value={camp.leadsGenerated}
                        onChange={(e) =>
                          onUpdateCampaign({
                            ...camp,
                            leadsGenerated: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        className="w-full mt-0.5 bg-white px-2 py-1 rounded-lg border border-[#EAECEF] text-xs font-mono font-extrabold text-[#0B0F19]"
                      />
                    </div>

                    <div className="p-2.5 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF]">
                      <label className="block text-[9px] font-bold uppercase text-[#64748B]">
                        Paid By
                      </label>
                      <select
                        value={camp.paidBy || 'Vansh'}
                        onChange={(e) =>
                          onUpdateCampaign({
                            ...camp,
                            paidBy: e.target.value as ExpensePaidBy,
                          })
                        }
                        aria-label={`Paid by for ${camp.campaignName}`}
                        className="w-full mt-0.5 bg-white px-1.5 py-1 rounded-lg border border-[#EAECEF] text-xs font-bold text-[#0B0F19]"
                      >
                        <option value="Vansh">Vansh</option>
                        <option value="Krishna">Krishna</option>
                        <option value="Studio Account">Studio</option>
                      </select>
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
                        amountSpent: camp.amountSpent + 500,
                        totalBudget: Math.max(camp.totalBudget, camp.amountSpent + 500),
                      })
                    }
                    className="flex-1 py-2 px-3 rounded-xl bg-[#F8F9FA] hover:bg-[#EFF6FF] text-[#0B0F19] hover:text-[#2563EB] text-xs font-bold border border-[#EAECEF] transition-colors cursor-pointer"
                  >
                    +₹500 Spend
                  </button>
                  <button
                    onClick={() => setReportCampaign(camp)}
                    className="py-2 px-3 rounded-xl bg-[#0B0F19] hover:bg-[#1E293B] text-white text-xs font-bold cursor-pointer"
                  >
                    Client Report
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CLIENT MONTHLY AD PERFORMANCE REPORT GENERATOR MODAL (PART 6) */}
      {reportCampaign && (
        <div className="fixed inset-0 z-50 bg-[#0B0F19]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 border border-[#EAECEF] shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-[#EAECEF] pb-4">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#2563EB] font-bold">
                  AETHEL STUDIOS · CLIENT META ADS PERFORMANCE REPORT
                </div>
                <h2 className="text-xl font-extrabold text-[#0B0F19] mt-0.5">
                  {reportCampaign.clientName} — {reportCampaign.campaignName}
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Campaign Period: {reportCampaign.startDate} to {reportCampaign.endDate} · Objective: {reportCampaign.objective}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print / Save PDF
                </button>
                <button
                  onClick={() => setReportCampaign(null)}
                  className="p-2 rounded-xl bg-[#F8F9FA] text-[#64748B] hover:text-[#0B0F19] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Campaign Selector inside Report Modal */}
            <div className="flex items-center justify-between bg-[#F8F9FA] p-3 rounded-2xl border border-[#EAECEF]">
              <span className="text-xs font-bold text-[#475569]">Select Client Campaign:</span>
              <select
                value={reportCampaign.id}
                onChange={(e) => {
                  const found = campaigns.find((c) => c.id === e.target.value);
                  if (found) setReportCampaign(found);
                }}
                className="px-3 py-1.5 rounded-xl bg-white border border-[#EAECEF] text-xs font-bold text-[#0B0F19]"
              >
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.clientName} — {c.campaignName} ({formatINR(c.amountSpent)})
                  </option>
                ))}
              </select>
            </div>

            {/* Key Performance Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-[#0B0F19] text-white">
                <div className="text-[10px] font-mono uppercase text-[#94A3B8]">Amount Spent</div>
                <div className="text-xl font-extrabold font-mono mt-1">
                  {formatINR(reportCampaign.amountSpent)}
                </div>
                <div className="text-[10px] text-[#34D399] mt-0.5">
                  Budget: {formatINR(reportCampaign.totalBudget)}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF]">
                <div className="text-[10px] font-mono uppercase text-[#64748B]">Impressions</div>
                <div className="text-xl font-extrabold font-mono text-[#0B0F19] mt-1">
                  {(reportCampaign.impressions || 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-[#64748B] mt-0.5">
                  Unique Reach: {(reportCampaign.reach || 0).toLocaleString('en-IN')}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF]">
                <div className="text-[10px] font-mono uppercase text-[#64748B]">Clicks &amp; CTR</div>
                <div className="text-xl font-extrabold font-mono text-[#2563EB] mt-1">
                  {(reportCampaign.clicks || 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-[#059669] font-bold mt-0.5">
                  CTR: {calculateCTR(reportCampaign.clicks || 0, reportCampaign.impressions || 0)}% · CPC: ₹{calculateCPC(reportCampaign.amountSpent, reportCampaign.clicks || 0)}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0]">
                <div className="text-[10px] font-mono uppercase text-[#059669]">Leads &amp; ROAS</div>
                <div className="text-xl font-extrabold font-mono text-[#059669] mt-1">
                  {reportCampaign.leadsGenerated} Leads
                </div>
                <div className="text-[10px] text-[#047857] font-bold mt-0.5">
                  CPL: {calculateCPL(reportCampaign.amountSpent, reportCampaign.leadsGenerated) > 0 ? formatINR(calculateCPL(reportCampaign.amountSpent, reportCampaign.leadsGenerated)) : '—'} · {reportCampaign.roas || 4.2}x ROAS
                </div>
              </div>
            </div>

            {/* Strategic Recommendations */}
            <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF] space-y-2">
              <div className="text-xs font-extrabold text-[#0B0F19]">
                Campaign Summary &amp; Next-Month Growth Recommendations
              </div>
              <p className="text-xs text-[#475569] leading-relaxed">
                <strong>Targeting &amp; Creative Notes:</strong> {reportCampaign.notes}
              </p>
              <ul className="text-xs text-[#475569] list-disc pl-4 space-y-1">
                <li>
                  High local engagement achieved with{' '}
                  <strong>{(reportCampaign.impressions || 0).toLocaleString('en-IN')} impressions</strong> and{' '}
                  <strong>{calculateCTR(reportCampaign.clicks || 0, reportCampaign.impressions || 0)}% CTR</strong>.
                </li>
                <li>
                  Recommended action for next cycle: Scale top-performing creative ad set by 20% and add retargeting for website visitors &amp; WhatsApp inquiry openers.
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#EAECEF] text-[11px] text-[#64748B]">
              <span>Prepared by Aethel Studios (Vansh Khakole &amp; Krishna Khakole)</span>
              <span className="font-mono">aethelstudios.in@gmail.com</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
