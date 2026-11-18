import React, { useState } from 'react';
import {
  Globe,
  Plus,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Server,
  GitBranch,
  Calendar,
  ArrowUpRight,
  Trash2,
  CheckCircle2,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import { ClientLead, ExpensePaidBy, HostedWebsite } from '../types';
import { calculateDaysUntilExpiry, formatINR } from '../utils/calculations';

interface DomainsVaultViewProps {
  websites: HostedWebsite[];
  clients?: ClientLead[];
  onUpdateWebsite: (updated: HostedWebsite) => void;
  onAddWebsite: (newSite: HostedWebsite) => void;
  onDeleteWebsite?: (websiteId: string) => void;
  onOpenClient360?: (clientId: string) => void;
}

export const DomainsVaultView: React.FC<DomainsVaultViewProps> = ({
  websites,
  clients = [],
  onUpdateWebsite,
  onAddWebsite,
  onDeleteWebsite,
  onOpenClient360,
}) => {
  const [showAdd, setShowAdd] = useState(false);
  const [clientName, setClientName] = useState('');
  const [domainName, setDomainName] = useState('');
  const [registrar, setRegistrar] = useState<HostedWebsite['registrar']>('Hostinger');
  const [hostingPlatform, setHostingPlatform] =
    useState<HostedWebsite['hostingPlatform']>('Vercel');
  const [expiryDate, setExpiryDate] = useState(
    new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10)
  );
  const [renewalCostINR, setRenewalCostINR] = useState(1081);
  const [paidBy, setPaidBy] = useState<ExpensePaidBy>('Vansh');
  const [githubRepo, setGithubRepo] = useState('');

  // Inline Row Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<HostedWebsite | null>(null);

  const handleStartEdit = (site: HostedWebsite) => {
    setEditingId(site.id);
    setEditDraft({ ...site });
  };

  const handleSaveEdit = () => {
    if (!editDraft || !editDraft.domainName.trim()) return;
    const cleanDomain = editDraft.domainName.trim().replace(/^https?:\/\//, '');
    const matched = clients.find(
      (c) =>
        c.businessName.toLowerCase() === editDraft.clientName.trim().toLowerCase() ||
        c.businessName.toLowerCase().includes(editDraft.clientName.trim().toLowerCase())
    );
    onUpdateWebsite({
      ...editDraft,
      clientId: matched ? matched.id : editDraft.clientId,
      clientName: matched ? matched.businessName : editDraft.clientName.trim(),
      domainName: cleanDomain,
      liveUrl: `https://${cleanDomain}`,
      renewalCostINR: Math.max(0, Number(editDraft.renewalCostINR) || 0),
    });
    setEditingId(null);
    setEditDraft(null);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainName.trim()) return;
    const cleanDomain = domainName.trim().replace(/^https?:\/\//, '');
    const matched = clients.find(
      (c) =>
        c.businessName.toLowerCase() === clientName.trim().toLowerCase() ||
        c.businessName.toLowerCase().includes(clientName.trim().toLowerCase())
    );
    onAddWebsite({
      id: `web-${Date.now()}`,
      clientId: matched?.id,
      clientName: matched ? matched.businessName : clientName.trim() || 'Aethel Client',
      domainName: cleanDomain,
      liveUrl: `https://${cleanDomain}`,
      registrar,
      hostingPlatform,
      purchaseDate: new Date().toISOString().slice(0, 10),
      expiryDate,
      renewalCostINR: Number(renewalCostINR),
      sslStatus: 'Active',
      siteStatus: 'Online',
      githubRepo: githubRepo.trim() || `aethel-studios/${cleanDomain.split('.')[0]}`,
      notes: 'Configured with edge caching & SSL.',
      paidBy,
    });
    setClientName('');
    setDomainName('');
    setGithubRepo('');
    setShowAdd(false);
  };

  const sortedByRenewal = [...websites].sort(
    (a, b) => calculateDaysUntilExpiry(a.expiryDate) - calculateDaysUntilExpiry(b.expiryDate)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EAECEF] shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)] flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-[#2563EB] mb-1">
            GROWTH &amp; INFRASTRUCTURE · DOMAINS, SSL &amp; HOSTING (AUTO-SYNCED TO FINANCE)
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B0F19]">
            Live Websites &amp; Renewal Calendar
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
            Every domain cost and payer (<strong>Vansh</strong>, <strong>Krishna</strong>, or <strong>Studio Account</strong>) automatically syncs 1-to-1 with <strong>Studio Finance &amp; Expenses</strong>.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0B0F19] hover:bg-[#1E293B] text-white text-xs font-bold shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[#60A5FA]" />
          Register Domain
        </button>
      </div>

      {/* DOMAIN RENEWAL TIMELINE & CALENDAR STRIP */}
      <div className="bg-white rounded-3xl p-5 border border-[#EAECEF] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-extrabold text-[#0B0F19]">
            <Calendar className="w-4 h-4 text-[#2563EB]" /> Upcoming Domain Renewal Schedule
          </div>
          <span className="text-[11px] font-mono text-[#64748B]">
            Total Domain Cost Synced to Finance:{' '}
            <strong className="text-[#059669]">
              {formatINR(websites.reduce((s, w) => s + w.renewalCostINR, 0))}/yr
            </strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {sortedByRenewal.map((site) => {
            const daysLeft = calculateDaysUntilExpiry(site.expiryDate);
            const isSoon = daysLeft <= 45;
            return (
              <div
                key={site.id}
                className={`p-3 rounded-2xl border text-xs ${
                  isSoon
                    ? 'bg-amber-50/70 border-amber-200'
                    : 'bg-[#F8F9FA] border-[#EAECEF]'
                }`}
              >
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className={isSoon ? 'text-amber-800 font-bold' : 'text-[#64748B]'}>
                    {daysLeft}d remaining
                  </span>
                  <span className="font-bold text-[#0B0F19]">
                    {formatINR(site.renewalCostINR)}
                  </span>
                </div>
                <div className="font-mono font-bold text-[#0B0F19] truncate mt-1">
                  {site.domainName}
                </div>
                <div className="text-[11px] text-[#64748B] truncate flex items-center justify-between mt-0.5">
                  <span className="truncate">{site.clientName}</span>
                  <span className="text-[10px] font-bold text-[#059669]">
                    {site.paidBy || 'Vansh'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showAdd && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-3xl p-6 border-2 border-[#2563EB]/20 shadow-lg space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Domain Name *
              </label>
              <input
                type="text"
                required
                value={domainName}
                onChange={(e) => setDomainName(e.target.value)}
                placeholder="kabramobiles.com"
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Client Business Name
              </label>
              <input
                type="text"
                list="domain-client-list"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Kabra Mobiles"
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm"
              />
              <datalist id="domain-client-list">
                {clients.map((c) => (
                  <option key={c.id} value={c.businessName} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Registrar
              </label>
              <select
                value={registrar}
                onChange={(e) =>
                  setRegistrar(e.target.value as HostedWebsite['registrar'])
                }
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm bg-white"
              >
                <option value="Hostinger">Hostinger</option>
                <option value="GoDaddy">GoDaddy</option>
                <option value="Namecheap">Namecheap</option>
                <option value="Cloudflare">Cloudflare</option>
                <option value="Client Owned">Client Owned (₹0 Expense)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Hosting Platform
              </label>
              <select
                value={hostingPlatform}
                onChange={(e) =>
                  setHostingPlatform(e.target.value as HostedWebsite['hostingPlatform'])
                }
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm bg-white"
              >
                <option value="Vercel">Vercel</option>
                <option value="Cloudflare Pages">Cloudflare Pages</option>
                <option value="Hostinger VPS">Hostinger VPS</option>
                <option value="Netlify">Netlify</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Expiry Date
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Purchase / Renewal Cost (₹)
              </label>
              <input
                type="number"
                value={renewalCostINR}
                onChange={(e) => setRenewalCostINR(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm font-mono font-bold"
              />
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
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full px-5 py-2.5 rounded-xl bg-[#2563EB] text-white text-xs font-bold cursor-pointer"
              >
                Add &amp; Sync Domain to Finance
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Domains Table */}
      <div className="bg-white rounded-3xl border border-[#EAECEF] shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8F9FA] border-b border-[#EAECEF] text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                <th className="py-4 px-5">Domain &amp; Live URL</th>
                <th className="py-4 px-4">Client</th>
                <th className="py-4 px-4">Registrar &amp; Edge Host</th>
                <th className="py-4 px-4">SSL &amp; Status</th>
                <th className="py-4 px-4">Expiry Countdown</th>
                <th className="py-4 px-4">Paid By (Finance Sync)</th>
                <th className="py-4 px-4 text-right">Domain Cost (₹)</th>
                <th className="py-4 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAECEF] text-xs">
              {websites.map((site) => {
                const daysLeft = calculateDaysUntilExpiry(site.expiryDate);
                const isExpiring = daysLeft <= 45;
                const isEditing = editingId === site.id && editDraft !== null;

                if (isEditing && editDraft) {
                  return (
                    <tr key={site.id} className="bg-[#EFF6FF]/40">
                      <td className="py-3.5 px-5 space-y-1">
                        <input
                          type="text"
                          value={editDraft.domainName}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, domainName: e.target.value })
                          }
                          className="w-full px-2.5 py-1 rounded-lg bg-white border border-[#EAECEF] font-mono font-bold text-xs"
                          placeholder="domain.com"
                        />
                        <input
                          type="text"
                          value={editDraft.githubRepo}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, githubRepo: e.target.value })
                          }
                          className="w-full px-2.5 py-1 rounded-lg bg-white border border-[#EAECEF] font-mono text-[11px]"
                          placeholder="github-org/repo"
                        />
                      </td>
                      <td className="py-3.5 px-4">
                        <input
                          type="text"
                          list="domain-client-list"
                          value={editDraft.clientName}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, clientName: e.target.value })
                          }
                          className="w-full px-2.5 py-1 rounded-lg bg-white border border-[#EAECEF] font-bold text-xs"
                        />
                      </td>
                      <td className="py-3.5 px-4 space-y-1">
                        <select
                          value={editDraft.registrar}
                          onChange={(e) =>
                            setEditDraft({
                              ...editDraft,
                              registrar: e.target.value as HostedWebsite['registrar'],
                            })
                          }
                          className="w-full px-2 py-1 rounded-lg bg-white border border-[#EAECEF] text-xs"
                        >
                          <option value="Hostinger">Hostinger</option>
                          <option value="GoDaddy">GoDaddy</option>
                          <option value="Namecheap">Namecheap</option>
                          <option value="Cloudflare">Cloudflare</option>
                          <option value="Client Owned">Client Owned</option>
                        </select>
                        <select
                          value={editDraft.hostingPlatform}
                          onChange={(e) =>
                            setEditDraft({
                              ...editDraft,
                              hostingPlatform:
                                e.target.value as HostedWebsite['hostingPlatform'],
                            })
                          }
                          className="w-full px-2 py-1 rounded-lg bg-white border border-[#EAECEF] text-xs"
                        >
                          <option value="Vercel">Vercel</option>
                          <option value="Cloudflare Pages">Cloudflare Pages</option>
                          <option value="Hostinger VPS">Hostinger VPS</option>
                          <option value="Netlify">Netlify</option>
                        </select>
                      </td>
                      <td className="py-3.5 px-4 space-y-1">
                        <select
                          value={editDraft.siteStatus}
                          onChange={(e) =>
                            setEditDraft({
                              ...editDraft,
                              siteStatus: e.target.value as HostedWebsite['siteStatus'],
                            })
                          }
                          className="w-full px-2 py-1 rounded-lg bg-white border border-[#EAECEF] text-xs font-bold"
                        >
                          <option value="Online">Online</option>
                          <option value="Maintenance">Maintenance</option>
                          <option value="Staging">Staging</option>
                        </select>
                      </td>
                      <td className="py-3.5 px-4">
                        <input
                          type="date"
                          value={editDraft.expiryDate}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, expiryDate: e.target.value })
                          }
                          className="px-2 py-1 rounded-lg bg-white border border-[#EAECEF] font-mono text-xs"
                        />
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          value={editDraft.paidBy || 'Vansh'}
                          onChange={(e) =>
                            setEditDraft({
                              ...editDraft,
                              paidBy: e.target.value as ExpensePaidBy,
                            })
                          }
                          className="px-2 py-1 rounded-lg bg-white border border-[#EAECEF] text-xs font-bold"
                        >
                          <option value="Vansh">Vansh</option>
                          <option value="Krishna">Krishna</option>
                          <option value="Studio Account">Studio Account</option>
                        </select>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <input
                          type="number"
                          value={editDraft.renewalCostINR}
                          onChange={(e) =>
                            setEditDraft({
                              ...editDraft,
                              renewalCostINR: Number(e.target.value),
                            })
                          }
                          className="w-24 px-2 py-1 rounded-lg bg-white border border-[#EAECEF] text-right font-mono font-bold text-xs"
                        />
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={handleSaveEdit}
                            className="px-2.5 py-1 rounded-lg bg-[#2563EB] text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3 h-3" /> Save
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(null);
                              setEditDraft(null);
                            }}
                            className="p-1 rounded-lg text-[#64748B] hover:text-[#0B0F19] cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={site.id} className="hover:bg-[#F8F9FA]/60 transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-[#2563EB] shrink-0" />
                        <div>
                          <a
                            href={site.liveUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono font-bold text-[#0B0F19] hover:text-[#2563EB] flex items-center gap-1"
                          >
                            {site.domainName}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          <div className="text-[11px] text-[#64748B] flex items-center gap-1 mt-0.5 font-mono">
                            <GitBranch className="w-3 h-3" />
                            {site.githubRepo}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-bold text-[#0B0F19]">
                      {site.clientId && onOpenClient360 ? (
                        <button
                          onClick={() => onOpenClient360(site.clientId!)}
                          className="text-[#2563EB] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          {site.clientName} <ArrowUpRight className="w-3 h-3" />
                        </button>
                      ) : (
                        site.clientName
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-semibold text-[#0B0F19]">{site.registrar}</div>
                      <div className="text-[11px] text-[#64748B] flex items-center gap-1">
                        <Server className="w-3 h-3" /> {site.hostingPlatform}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 font-bold text-[11px] ${
                            site.siteStatus === 'Online'
                              ? 'text-[#059669]'
                              : 'text-amber-700'
                          }`}
                        >
                          ● {site.siteStatus}
                        </span>
                        <span className="text-[#CBD5E1]">·</span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#475569]">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" />
                          SSL {site.sslStatus}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div
                        className={`inline-flex items-center gap-1.5 font-mono font-bold text-xs ${
                          isExpiring ? 'text-amber-700' : 'text-[#0B0F19]'
                        }`}
                      >
                        {isExpiring && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                        {daysLeft} days ({site.expiryDate})
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5">
                        <select
                          value={site.paidBy || 'Vansh'}
                          onChange={(e) =>
                            onUpdateWebsite({
                              ...site,
                              paidBy: e.target.value as ExpensePaidBy,
                            })
                          }
                          aria-label={`Paid by for ${site.domainName}`}
                          className="px-2 py-1 rounded-lg bg-[#F8F9FA] border border-[#EAECEF] text-xs font-bold text-[#0B0F19] cursor-pointer"
                        >
                          <option value="Vansh">Vansh</option>
                          <option value="Krishna">Krishna</option>
                          <option value="Studio Account">Studio Account</option>
                        </select>
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#059669] bg-[#ECFDF5] px-1.5 py-0.5 rounded border border-[#A7F3D0]">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Synced
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <span className="text-[#64748B] font-mono">₹</span>
                        <input
                          type="number"
                          value={site.renewalCostINR}
                          onChange={(e) =>
                            onUpdateWebsite({
                              ...site,
                              renewalCostINR: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          aria-label={`Renewal cost for ${site.domainName}`}
                          className="w-20 px-2 py-1 rounded-lg bg-[#F8F9FA] border border-[#EAECEF] text-right font-mono font-bold text-xs text-[#0B0F19]"
                        />
                        <span className="text-[10px] font-mono text-[#64748B]">/yr</span>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(site)}
                          aria-label={`Edit domain ${site.domainName}`}
                          className="px-2 py-1 rounded-lg bg-[#F8F9FA] hover:bg-[#EFF6FF] text-[#475569] hover:text-[#2563EB] border border-[#EAECEF] text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" /> Edit
                        </button>
                        {onDeleteWebsite && (
                          <button
                            onClick={() => onDeleteWebsite(site.id)}
                            aria-label={`Delete domain ${site.domainName}`}
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
    </div>
  );
};
