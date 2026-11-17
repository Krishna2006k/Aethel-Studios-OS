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
} from 'lucide-react';
import { HostedWebsite } from '../types';
import { calculateDaysUntilExpiry, formatINR } from '../utils/calculations';

interface DomainsVaultViewProps {
  websites: HostedWebsite[];
  onUpdateWebsite: (updated: HostedWebsite) => void;
  onAddWebsite: (newSite: HostedWebsite) => void;
  onOpenClient360?: (clientId: string) => void;
}

export const DomainsVaultView: React.FC<DomainsVaultViewProps> = ({
  websites,
  onUpdateWebsite,
  onAddWebsite,
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
  const [renewalCostINR, setRenewalCostINR] = useState(1499);
  const [githubRepo, setGithubRepo] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainName.trim()) return;
    const cleanDomain = domainName.trim().replace(/^https?:\/\//, '');
    onAddWebsite({
      id: `web-${Date.now()}`,
      clientName: clientName.trim() || 'Aethel Client',
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
    });
    setClientName('');
    setDomainName('');
    setGithubRepo('');
    setShowAdd(false);
  };

  // Sort websites by upcoming renewal date for the Renewal Calendar Strip
  const sortedByRenewal = [...websites].sort(
    (a, b) => calculateDaysUntilExpiry(a.expiryDate) - calculateDaysUntilExpiry(b.expiryDate)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EAECEF] shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)] flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-[#2563EB] mb-1">
            GROWTH & INFRASTRUCTURE · DOMAINS, SSL & HOSTING
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B0F19]">
            Live Websites & Renewal Calendar
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
            Track registrar renewals, SSL health, Vercel/Hostinger deployments, and client ownership.
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

      {/* PART 5: DOMAIN RENEWAL TIMELINE & CALENDAR STRIP */}
      <div className="bg-white rounded-3xl p-5 border border-[#EAECEF] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-extrabold text-[#0B0F19]">
            <Calendar className="w-4 h-4 text-[#2563EB]" /> Upcoming Domain Renewal Schedule
          </div>
          <span className="text-[11px] font-mono text-[#64748B]">
            Annual Renewal Liability:{' '}
            <strong className="text-[#0B0F19]">
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
                <div className="text-[11px] text-[#64748B] truncate">{site.clientName}</div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Domain Name *
              </label>
              <input
                type="text"
                required
                value={domainName}
                onChange={(e) => setDomainName(e.target.value)}
                placeholder="imperialpavilion.in"
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Client Business Name
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="The Imperial Pavilion"
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm"
              />
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
                <option value="Client Owned">Client Owned</option>
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
                <option value="Hostinger VPS">Hostinger VPS</option>
                <option value="Netlify">Netlify</option>
                <option value="Cloudflare Pages">Cloudflare Pages</option>
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
                Annual Renewal (₹)
              </label>
              <input
                type="number"
                value={renewalCostINR}
                onChange={(e) => setRenewalCostINR(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm font-mono"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-full bg-[#2563EB] text-white text-xs font-bold cursor-pointer"
            >
              Add Domain Record
            </button>
          </div>
        </form>
      )}

      {/* Domains Table */}
      <div className="bg-white rounded-3xl border border-[#EAECEF] shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8F9FA] border-b border-[#EAECEF] text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                <th className="py-4 px-6">Domain & Live URL</th>
                <th className="py-4 px-4">Client</th>
                <th className="py-4 px-4">Registrar & Edge Host</th>
                <th className="py-4 px-4">SSL & Status</th>
                <th className="py-4 px-4">Expiry Countdown</th>
                <th className="py-4 px-6 text-right">Renewal Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAECEF] text-xs">
              {websites.map((site) => {
                const daysLeft = calculateDaysUntilExpiry(site.expiryDate);
                const isExpiring = daysLeft <= 45;

                return (
                  <tr key={site.id} className="hover:bg-[#F8F9FA]/60 transition-colors">
                    <td className="py-4 px-6">
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
                    <td className="py-4 px-6 text-right font-mono font-bold text-[#0B0F19]">
                      {formatINR(site.renewalCostINR)}/yr
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
