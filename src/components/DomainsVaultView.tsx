import React, { useState } from 'react';
import {
  Plus,
  ExternalLink,
  GitBranch,
  Trash2,
  Globe,
  Search,
} from 'lucide-react';
import type { TechAsset, HealthStatus } from '../types';
import { formatINR, calculateDaysRemaining } from '../utils/calculations';

interface DomainsVaultViewProps {
  websites: TechAsset[];
  onUpdateWebsite: (w: TechAsset) => void;
  onDeleteWebsite: (id: string) => void;
  onOpenAddWebsite: () => void;
}

const HEALTH_STATUSES: HealthStatus[] = [
  'Live & Healthy',
  'Maintenance',
  'Issue Reported',
];

export const DomainsVaultView: React.FC<DomainsVaultViewProps> = ({
  websites,
  onUpdateWebsite,
  onDeleteWebsite,
  onOpenAddWebsite,
}) => {
  const [search, setSearch] = useState('');

  const filtered = websites.filter((w) => {
    const q = search.toLowerCase();
    return (
      !q ||
      w.projectName.toLowerCase().includes(q) ||
      w.clientName.toLowerCase().includes(q) ||
      w.liveDomainUrl.toLowerCase().includes(q) ||
      w.hostingPlatform.toLowerCase().includes(q)
    );
  });

  const totalAnnualRenewal = websites.reduce(
    (sum, w) => sum + w.annualRenewalCost,
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-[#EAECEF] rounded-3xl p-6 sm:p-8 shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold tracking-wider uppercase text-[#2563EB] block">
              04 / TECH ASSETS, DOMAINS &amp; HOSTING VAULT
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B0F19] mt-1">
              Production Websites, Edge Workers &amp; Domain Registry
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Tracking {websites.length} deployed properties · Total Annual Renewal Commitment:{' '}
              <span className="font-mono font-bold text-[#0B0F19]">
                {formatINR(totalAnnualRenewal)}/yr
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search domain, client, or stack..."
                aria-label="Search deployed websites"
                className="pl-10 pr-4 py-2 rounded-full bg-[#F8F9FA] border border-[#EAECEF] text-xs text-[#0B0F19] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <button
              type="button"
              onClick={onOpenAddWebsite}
              className="px-4 py-2.5 rounded-full bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Register Deployed Site</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filtered.map((site) => {
          const daysLeft = calculateDaysRemaining(site.renewalDate);
          const isExpiringUnder30 = daysLeft <= 30;

          return (
            <div
              key={site.id}
              className="bg-white border border-[#EAECEF] rounded-3xl p-6 shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)] flex flex-col justify-between space-y-5"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-[#2563EB]">
                      {site.clientName}
                    </span>
                    <h2 className="text-lg font-bold text-[#0B0F19] mt-0.5">
                      {site.projectName}
                    </h2>
                    <div className="text-xs text-slate-500 mt-0.5">
                      <span>{site.hostingPlatform}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{site.domainRegistrar}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{site.domainOwner}</span>
                    </div>
                  </div>

                  <select
                    aria-label={`Health status for ${site.projectName}`}
                    value={site.healthStatus}
                    onChange={(e) =>
                      onUpdateWebsite({
                        ...site,
                        healthStatus: e.target.value as HealthStatus,
                      })
                    }
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                      site.healthStatus === 'Live & Healthy'
                        ? 'bg-[#D1FAE5]/60 border-[#059669]/30 text-[#0D281D]'
                        : site.healthStatus === 'Issue Reported'
                        ? 'bg-rose-50 border-rose-200 text-rose-800'
                        : 'bg-amber-50 border-amber-200 text-amber-800'
                    }`}
                  >
                    {HEALTH_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Live Domain & Staging Worker Links */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#F8F9FA] p-4 rounded-2xl border border-[#EAECEF] text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px] font-semibold uppercase block">
                      Live Production Domain
                    </span>
                    <a
                      href={site.liveDomainUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono font-bold text-[#0B0F19] hover:text-[#2563EB] flex items-center gap-1 mt-0.5 truncate"
                    >
                      <Globe className="w-3.5 h-3.5 shrink-0 text-[#2563EB]" />
                      <span className="truncate">
                        {site.liveDomainUrl.replace(/^https?:\/\//, '')}
                      </span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px] font-semibold uppercase block">
                      Staging / Worker Endpoint
                    </span>
                    <a
                      href={site.stagingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-slate-700 hover:text-[#2563EB] flex items-center gap-1 mt-0.5 truncate"
                    >
                      <span className="truncate">
                        {site.stagingUrl.replace(/^https?:\/\//, '')}
                      </span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Deploying Account</span>
                    <span className="font-mono text-[11px] font-semibold text-[#0B0F19] break-all">
                      {site.deployingEmail}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block">Renewal Countdown</span>
                    <span
                      className={`font-mono font-bold ${
                        isExpiringUnder30 ? 'text-rose-600' : 'text-[#0B0F19]'
                      }`}
                    >
                      {site.renewalDate} ({daysLeft}d left)
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block">Annual Cost</span>
                    <span className="font-mono font-bold text-[#0B0F19]">
                      {formatINR(site.annualRenewalCost)}/yr
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-600 pt-2 border-t border-[#EAECEF] flex flex-wrap items-center justify-between gap-2">
                  <span>
                    Stack: <strong className="text-[#0B0F19]">{site.techStack}</strong>
                  </span>
                  <a
                    href={site.githubRepoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-[#2563EB] hover:underline flex items-center gap-1"
                  >
                    <GitBranch className="w-3.5 h-3.5" />
                    <span>GitHub Repo</span>
                  </a>
                </div>
              </div>

              <div className="pt-3 border-t border-[#EAECEF] flex items-center justify-between text-xs text-slate-500">
                <span>Assigned Engineer: {site.assignedLead}</span>
                <button
                  type="button"
                  onClick={() => onDeleteWebsite(site.id)}
                  aria-label={`Remove ${site.projectName}`}
                  className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
