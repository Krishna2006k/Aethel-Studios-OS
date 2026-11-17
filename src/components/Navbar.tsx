import React from 'react';
import { Plus, Cloud, Database } from 'lucide-react';
import type { ModuleId } from '../types';

interface NavbarProps {
  activeModule: ModuleId;
  onSelectModule: (id: ModuleId) => void;
  onOpenQuickAction: () => void;
  onOpenSupabaseModal: () => void;
  syncMode: 'cloud' | 'local';
  urgentCount: number;
}

export const MODULE_NAV_ITEMS: { id: ModuleId; shortLabel: string; kicker: string }[] = [
  { id: 'command-center', shortLabel: '01 Command', kicker: '01 / COMMAND CENTER' },
  { id: 'pipeline', shortLabel: '02 Pipeline', kicker: '02 / CLIENT PIPELINE' },
  { id: 'meta-ads', shortLabel: '03 Meta Ads', kicker: '03 / META ADS & GROWTH' },
  { id: 'domains', shortLabel: '04 Domains', kicker: '04 / DOMAINS & HOSTING' },
  { id: 'tickets', shortLabel: '05 Deliveries', kicker: '05 / BUGS & DELIVERIES' },
  { id: 'rnd-lab', shortLabel: '06 R&D Lab', kicker: '06 / R&D LAB & PROTOTYPES' },
  { id: 'finance', shortLabel: '07 Finance', kicker: '07 / STUDIO FINANCE' },
  { id: 'vault', shortLabel: '08 Vault', kicker: '08 / ENCRYPTED VAULT' },
];

export const Navbar: React.FC<NavbarProps> = ({
  activeModule,
  onSelectModule,
  onOpenQuickAction,
  onOpenSupabaseModal,
  syncMode,
}) => {
  return (
    <header className="sticky top-0 z-40 py-2.5 sm:py-3 px-3 sm:px-6 lg:px-8 bg-[#F8F9FA]/95 backdrop-blur-md border-b border-[#EAECEF]/70 lg:border-b-0">
      <div className="mx-auto max-w-[1440px]">
        {/* Desktop Floating Pill Bar (lg and up) + Mobile Top Row */}
        <div className="bg-white/95 backdrop-blur-md border border-[#EAECEF] rounded-2xl lg:rounded-full px-3 sm:px-4 py-2 shadow-[0_10px_30px_-10px_rgba(11,15,25,0.06)] flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-3">
          <div className="flex items-center justify-between gap-2">
            {/* Zone 1: Brand Mark */}
            <button
              type="button"
              onClick={() => onSelectModule('command-center')}
              className="flex items-center gap-2.5 text-left group shrink-0 focus:outline-none cursor-pointer"
            >
              <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#0B0F19] text-white font-bold text-xs sm:text-sm flex items-center justify-center tracking-tighter group-hover:bg-[#2563EB] transition-colors">
                A
              </span>
              <div>
                <span className="text-xs sm:text-sm font-bold tracking-tight text-[#0B0F19] block leading-none">
                  Aethel OS
                </span>
                <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium block mt-0.5">
                  Aethel Studios
                </span>
              </div>
            </button>

            {/* Mobile/Tablet Action Buttons (shown on < lg right inside top row) */}
            <div className="flex lg:hidden items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onOpenSupabaseModal}
                className={`px-2.5 py-1.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  syncMode === 'cloud'
                    ? 'bg-[#D1FAE5]/70 border-[#059669]/30 text-[#0D281D]'
                    : 'bg-amber-50 border-amber-200/80 text-amber-900'
                }`}
                title="Configure Hybrid Supabase Cloud or Backup JSON"
              >
                {syncMode === 'cloud' ? (
                  <>
                    <Cloud className="w-3.5 h-3.5 text-[#059669]" />
                    <span>Cloud</span>
                  </>
                ) : (
                  <>
                    <Database className="w-3.5 h-3.5 text-amber-600" />
                    <span>Supabase</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onOpenQuickAction}
                className="px-3 py-1.5 rounded-full bg-[#0B0F19] hover:bg-[#2563EB] text-white text-[11px] font-semibold flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Quick Action</span>
              </button>
            </div>
          </div>

          {/* Zone 2: Floating Pill Module Switcher (Full-width touch scroll on mobile, centered on desktop) */}
          <nav
            aria-label="Primary Operating Modules"
            className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1 lg:py-0.5 px-0.5 border-t border-[#EAECEF]/80 lg:border-t-0 -mx-1 px-1"
          >
            {MODULE_NAV_ITEMS.map((item) => {
              const isActive = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectModule(item.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-[#2563EB] text-white shadow-xs'
                      : 'text-slate-600 hover:text-[#0B0F19] hover:bg-slate-100'
                  }`}
                >
                  {item.shortLabel}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Desktop Supabase Sync Status & Quick Action (Ctrl+K) */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenSupabaseModal}
              className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                syncMode === 'cloud'
                  ? 'bg-[#D1FAE5]/70 border-[#059669]/30 text-[#0D281D] hover:bg-[#D1FAE5]'
                  : 'bg-amber-50 border-amber-200/80 text-amber-900 hover:bg-amber-100/80'
              }`}
              title="Configure Hybrid Supabase Cloud or Backup JSON"
            >
              {syncMode === 'cloud' ? (
                <>
                  <Cloud className="w-3.5 h-3.5 text-[#059669]" />
                  <span>Cloud Connected</span>
                </>
              ) : (
                <>
                  <Database className="w-3.5 h-3.5 text-amber-600" />
                  <span>Local Mode (Connect Supabase)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onOpenQuickAction}
              className="px-3.5 py-1.5 rounded-full bg-[#0B0F19] hover:bg-[#2563EB] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Quick Action</span>
              <kbd className="hidden xl:inline-block ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-white/15 rounded-full text-slate-200">
                Ctrl+K
              </kbd>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

