import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Megaphone,
  Globe,
  Wrench,
  FlaskConical,
  Wallet,
  ShieldCheck,
  Plus,
  Cloud,
  HardDrive,
  CheckSquare,
  BarChart3,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  HelpCircle,
  Menu,
  X,
  ArrowUpRight,
  Command,
  Sparkles,
} from 'lucide-react';
import { ClientLead, FounderName, ModuleId } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  activeModule: ModuleId;
  onSelectModule: (id: ModuleId) => void;
  syncMode: 'supabase' | 'local';
  isSyncing: boolean;
  onOpenSupabaseModal: () => void;
  onOpenQuickAction: () => void;
  urgentCounts: {
    followUps: number;
    openTickets: number;
    expiringDomains: number;
    pendingTasks?: number;
  };
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  activeFounderFilter: 'All' | FounderName;
  onChangeFounderFilter: (f: 'All' | FounderName) => void;
  clients?: ClientLead[];
  onOpenClient360?: (clientId: string) => void;
}

interface NavGroup {
  category: string;
  items: {
    id: ModuleId;
    label: string;
    shortLabel: string;
    icon: React.ComponentType<{ className?: string }>;
    badgeKey?: 'followUps' | 'openTickets' | 'expiringDomains' | 'pendingTasks';
  }[];
}

export const SIDEBAR_GROUPS: NavGroup[] = [
  {
    category: 'WORKSPACE',
    items: [
      {
        id: 'command-center',
        label: 'Overview',
        shortLabel: 'Overview',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    category: 'CLIENT OPERATIONS',
    items: [
      {
        id: 'pipeline',
        label: 'CRM & Pipeline',
        shortLabel: 'Pipeline',
        icon: Users,
        badgeKey: 'followUps',
      },
      {
        id: 'tickets',
        label: 'Projects & Deliveries',
        shortLabel: 'Projects',
        icon: Wrench,
        badgeKey: 'openTickets',
      },
      {
        id: 'tasks',
        label: 'Tasks & Follow-ups',
        shortLabel: 'Tasks',
        icon: CheckSquare,
        badgeKey: 'pendingTasks',
      },
    ],
  },
  {
    category: 'GROWTH',
    items: [
      {
        id: 'meta-ads',
        label: 'Meta Ads',
        shortLabel: 'Meta Ads',
        icon: Megaphone,
      },
      {
        id: 'domains',
        label: 'Domains & Hosting',
        shortLabel: 'Domains',
        icon: Globe,
        badgeKey: 'expiringDomains',
      },
    ],
  },
  {
    category: 'MANAGEMENT',
    items: [
      {
        id: 'finance',
        label: 'Finance & Ledger',
        shortLabel: 'Finance',
        icon: Wallet,
      },
      {
        id: 'analytics',
        label: 'Analytics & Reports',
        shortLabel: 'Analytics',
        icon: BarChart3,
      },
    ],
  },
  {
    category: 'WORKSHOP',
    items: [
      {
        id: 'rnd-lab',
        label: 'R&D Lab',
        shortLabel: 'R&D Lab',
        icon: FlaskConical,
      },
      {
        id: 'vault',
        label: 'Vault & Documents',
        shortLabel: 'Vault',
        icon: ShieldCheck,
      },
    ],
  },
];

export const Navbar: React.FC<NavbarProps> = ({
  activeModule,
  onSelectModule,
  syncMode,
  isSyncing,
  onOpenSupabaseModal,
  onOpenQuickAction,
  urgentCounts,
  sidebarCollapsed,
  onToggleSidebar,
  activeFounderFilter,
  onChangeFounderFilter,
  clients = [],
  onOpenClient360,
}) => {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const getBadgeValue = (key?: 'followUps' | 'openTickets' | 'expiringDomains' | 'pendingTasks') => {
    if (!key) return 0;
    return urgentCounts[key] || 0;
  };

  const activeNavMeta =
    SIDEBAR_GROUPS.flatMap((g) =>
      g.items.map((item) => ({ ...item, category: g.category }))
    ).find((i) => i.id === activeModule) || {
      id: 'command-center',
      label: 'Overview',
      category: 'WORKSPACE',
    };

  const matchingClients =
    globalSearch.trim().length > 0
      ? clients
          .filter(
            (c) =>
              c.businessName.toLowerCase().includes(globalSearch.toLowerCase()) ||
              c.contactPerson.toLowerCase().includes(globalSearch.toLowerCase()) ||
              c.city.toLowerCase().includes(globalSearch.toLowerCase()) ||
              c.packageTier.toLowerCase().includes(globalSearch.toLowerCase())
          )
          .slice(0, 6)
      : [];

  return (
    <>
      {/* DESKTOP COLLAPSIBLE SIDEBAR (240px Expanded / 68px Collapsed) */}
      <aside
        aria-label="Primary Sidebar Navigation"
        className={`hidden lg:flex flex-col fixed top-0 left-0 bottom-0 z-40 bg-white border-r border-[#EAECEF] transition-all duration-200 select-none ${
          sidebarCollapsed ? 'w-[68px]' : 'w-[240px]'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-3.5 flex items-center justify-between border-b border-[#F1F3F5]">
          <button
            onClick={() => onSelectModule('command-center')}
            className="flex items-center gap-2.5 text-left group cursor-pointer min-w-0"
            title="Aethel OS — Return to Overview"
          >
            <div className="w-9 h-9 rounded-xl bg-[#0B0F19] text-white flex items-center justify-center font-bold text-sm tracking-tighter shadow-sm shrink-0 group-hover:bg-[#2563EB] transition-colors">
              A
            </div>
            {!sidebarCollapsed && (
              <div className="truncate">
                <div className="text-sm font-extrabold tracking-tight text-[#0B0F19] leading-none">
                  Aethel OS
                </div>
                <div className="text-[10px] font-medium text-[#64748B] tracking-wider uppercase mt-0.5">
                  Aethel Studios ERP
                </div>
              </div>
            )}
          </button>

          <button
            onClick={onToggleSidebar}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="w-7 h-7 rounded-lg text-[#64748B] hover:text-[#0B0F19] hover:bg-[#F8F9FA] flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Quick Command Trigger inside Sidebar */}
        <div className="px-3 pt-3 pb-1">
          <button
            onClick={onOpenQuickAction}
            className={`w-full flex items-center ${
              sidebarCollapsed ? 'justify-center px-0' : 'justify-between px-3'
            } py-2 rounded-xl bg-[#0B0F19] hover:bg-[#1E293B] text-white text-xs font-semibold transition-all shadow-xs cursor-pointer`}
            title="Open Command Palette (Ctrl+K)"
          >
            <span className="flex items-center gap-2 truncate">
              <Plus className="w-3.5 h-3.5 text-[#60A5FA] shrink-0" />
              {!sidebarCollapsed && <span>Quick Command</span>}
            </span>
            {!sidebarCollapsed && (
              <kbd className="text-[10px] font-mono bg-white/10 text-slate-300 px-1.5 py-0.5 rounded">
                ⌘K
              </kbd>
            )}
          </button>
        </div>

        {/* Categorized Navigation Groups */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-2 space-y-4">
          {SIDEBAR_GROUPS.map((group) => (
            <div key={group.category}>
              {!sidebarCollapsed ? (
                <div className="px-2.5 mb-1 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                  {group.category}
                </div>
              ) : (
                <div className="h-px bg-[#F1F3F5] mx-2 my-1.5" />
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeModule === item.id;
                  const badge = getBadgeValue(item.badgeKey);

                  return (
                    <button
                      key={item.id}
                      onClick={() => onSelectModule(item.id)}
                      title={sidebarCollapsed ? `${item.label} (${group.category})` : undefined}
                      className={`w-full flex items-center ${
                        sidebarCollapsed ? 'justify-center px-0 py-2.5' : 'justify-between px-2.5 py-2'
                      } rounded-xl text-xs font-semibold transition-all cursor-pointer relative ${
                        isActive
                          ? 'bg-[#EFF6FF] text-[#2563EB] font-bold shadow-2xs'
                          : 'text-[#475569] hover:text-[#0B0F19] hover:bg-[#F8F9FA]'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? 'text-[#2563EB]' : 'text-[#64748B]'
                          }`}
                        />
                        {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                      </span>

                      {badge > 0 && !sidebarCollapsed && (
                        <span
                          className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-md ${
                            isActive
                              ? 'bg-[#2563EB] text-white'
                              : 'bg-[#F1F5F9] text-[#475569]'
                          }`}
                        >
                          {badge}
                        </span>
                      )}

                      {badge > 0 && sidebarCollapsed && (
                        <span className="w-2 h-2 rounded-full bg-[#2563EB] absolute top-1.5 right-2" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom Section: Install App, Settings, Help & Support, Krishna / Vansh Profile */}
        <div className="p-2.5 border-t border-[#EAECEF] space-y-1 bg-[#FAFBFC]">
          <PWAInstallButton variant="sidebar" collapsed={sidebarCollapsed} />

          <button
            onClick={onOpenSupabaseModal}
            title="Database & Cloud Settings"
            className={`w-full flex items-center ${
              sidebarCollapsed ? 'justify-center px-0' : 'justify-between px-2.5'
            } py-1.5 rounded-lg text-xs font-medium text-[#475569] hover:text-[#0B0F19] hover:bg-white transition-colors cursor-pointer`}
          >
            <span className="flex items-center gap-2 truncate">
              <Settings className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
              {!sidebarCollapsed && <span>Settings & Cloud DB</span>}
            </span>
            {!sidebarCollapsed && (
              <span
                className={`w-2 h-2 rounded-full ${
                  syncMode === 'supabase' ? 'bg-[#059669]' : 'bg-amber-500'
                }`}
              />
            )}
          </button>

          <button
            onClick={() => setShowHelpModal(true)}
            title="Help & OS Architecture Guide"
            className={`w-full flex items-center ${
              sidebarCollapsed ? 'justify-center px-0' : ' gap-2 px-2.5'
            } py-1.5 rounded-lg text-xs font-medium text-[#475569] hover:text-[#0B0F19] hover:bg-white transition-colors cursor-pointer`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
            {!sidebarCollapsed && <span>Help & Architecture</span>}
          </button>

          {/* Founder Profile Selector */}
          <div
            className={`pt-1.5 mt-1 border-t border-[#EAECEF] ${
              sidebarCollapsed ? 'flex justify-center' : ''
            }`}
          >
            {sidebarCollapsed ? (
              <button
                onClick={() =>
                  onChangeFounderFilter(
                    activeFounderFilter === 'All'
                      ? 'Krishna'
                      : activeFounderFilter === 'Krishna'
                      ? 'Vansh'
                      : 'All'
                  )
                }
                title={`Active Workspace Lens: ${activeFounderFilter} (Click to switch)`}
                className="w-9 h-9 rounded-xl bg-[#0B0F19] text-white text-[11px] font-bold flex items-center justify-center cursor-pointer"
              >
                {activeFounderFilter === 'All'
                  ? 'KV'
                  : activeFounderFilter === 'Krishna'
                  ? 'KK'
                  : 'VK'}
              </button>
            ) : (
              <div className="bg-white border border-[#EAECEF] rounded-xl p-2">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-7 h-7 rounded-lg bg-[#0B0F19] text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                    KV
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold text-[#0B0F19] truncate">
                      Krishna & Vansh
                    </div>
                    <div className="text-[10px] text-[#64748B] truncate">
                      Co-Founders · Pune
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1 bg-[#F8F9FA] p-0.5 rounded-lg border border-[#EAECEF]">
                  {(['All', 'Krishna', 'Vansh'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => onChangeFounderFilter(f)}
                      className={`py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                        activeFounderFilter === f
                          ? 'bg-[#0B0F19] text-white shadow-2xs'
                          : 'text-[#64748B] hover:text-[#0B0F19]'
                      }`}
                    >
                      {f === 'All' ? 'Studio' : f}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* STICKY TOP CONTEXT BAR */}
      <header
        className={`sticky top-0 z-30 h-15 bg-white/90 backdrop-blur-md border-b border-[#EAECEF] px-3 sm:px-6 flex items-center justify-between gap-3 transition-all duration-200 ${
          sidebarCollapsed ? 'lg:pl-[88px]' : 'lg:pl-[264px]'
        }`}
      >
        {/* Left: Mobile Menu Button + Active Category Breadcrumb */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => setMobileDrawerOpen(true)}
            aria-label="Open navigation menu"
            className="lg:hidden w-9 h-9 rounded-xl bg-[#F8F9FA] border border-[#EAECEF] flex items-center justify-center text-[#0B0F19] cursor-pointer shrink-0"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 text-xs min-w-0">
            <span className="hidden sm:inline font-bold uppercase tracking-wider text-[#94A3B8] text-[10px]">
              {activeNavMeta.category}
            </span>
            <span className="hidden sm:inline text-[#CBD5E1]">/</span>
            <span className="font-bold text-[#0B0F19] text-sm truncate">
              {activeNavMeta.label}
            </span>
          </div>
        </div>

        {/* Center: Universal Client & Command Search Bar */}
        <div className="relative flex-1 max-w-md">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={globalSearch}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Jump to any client 360° profile, city, or scope..."
              aria-label="Search clients across Aethel OS"
              className="w-full bg-[#F8F9FA] hover:bg-[#F1F5F9] focus:bg-white border border-[#EAECEF] focus:border-[#2563EB] rounded-xl pl-8 pr-16 py-1.5 text-xs text-[#0B0F19] placeholder-[#94A3B8] focus:outline-none transition-all"
            />
            {globalSearch ? (
              <button
                onClick={() => setGlobalSearch('')}
                className="absolute right-2.5 text-[10px] font-bold text-[#64748B] hover:text-[#0B0F19]"
              >
                Clear
              </button>
            ) : (
              <button
                onClick={onOpenQuickAction}
                className="hidden sm:flex items-center gap-0.5 absolute right-2 px-1.5 py-0.5 rounded bg-white border border-[#E2E8F0] text-[10px] font-mono text-[#64748B] hover:text-[#0B0F19]"
              >
                <Command className="w-2.5 h-2.5" />K
              </button>
            )}
          </div>

          {/* Instant Client 360° Search Dropdown */}
          {searchFocused && globalSearch.trim().length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl border border-[#EAECEF] shadow-xl p-2 z-50">
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] flex items-center justify-between">
                <span>Client 360° Profiles ({matchingClients.length})</span>
                <span>Click to inspect</span>
              </div>
              {matchingClients.length === 0 ? (
                <div className="px-3 py-3 text-xs text-[#64748B]">
                  No client matching "{globalSearch}". Press{' '}
                  <button
                    onMouseDown={() => onOpenQuickAction()}
                    className="text-[#2563EB] font-bold underline"
                  >
                    + Quick Command
                  </button>{' '}
                  to create one.
                </div>
              ) : (
                <div className="space-y-1 mt-1">
                  {matchingClients.map((client) => (
                    <button
                      key={client.id}
                      onMouseDown={() => {
                        if (onOpenClient360) {
                          onOpenClient360(client.id);
                        } else {
                          onSelectModule('pipeline');
                        }
                        setGlobalSearch('');
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[#F8F9FA] text-left transition-colors cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#0B0F19] truncate">
                          {client.businessName}
                        </div>
                        <div className="text-[11px] text-[#64748B] truncate">
                          {client.contactPerson} · {client.city} · {client.stage}
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-[#2563EB] flex items-center gap-0.5 shrink-0 ml-2">
                        360° <ArrowUpRight className="w-3 h-3" />
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Install App + Sync Status + Command Palette Trigger */}
        <div className="flex items-center gap-2 shrink-0">
          <PWAInstallButton variant="header" />

          <button
            onClick={onOpenSupabaseModal}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer ${
              syncMode === 'supabase'
                ? 'bg-[#D1FAE5]/60 text-[#059669] border-[#A7F3D0] hover:bg-[#D1FAE5]'
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
            }`}
            title="Configure Supabase Cloud Persistence & View SQL Schema"
          >
            {syncMode === 'supabase' ? (
              <>
                <Cloud className={`w-3.5 h-3.5 ${isSyncing ? 'animate-bounce' : ''}`} />
                <span className="hidden md:inline">
                  {isSyncing ? 'Syncing...' : 'Cloud Synced'}
                </span>
              </>
            ) : (
              <>
                <HardDrive className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Local Engine</span>
              </>
            )}
          </button>

          <button
            onClick={onOpenQuickAction}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0B0F19] hover:bg-[#1E293B] text-white text-xs font-semibold transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#60A5FA]" />
            <span>Quick Action</span>
            <kbd className="hidden sm:inline-block ml-1 text-[10px] font-mono bg-white/15 text-slate-200 px-1.5 py-0.5 rounded">
              Ctrl+K
            </kbd>
          </button>
        </div>
      </header>

      {/* MOBILE SLIDE-OVER DRAWER */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#0B0F19]/50 backdrop-blur-xs"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="relative w-72 max-w-[82vw] bg-white h-full flex flex-col justify-between z-10 shadow-2xl">
            <div className="p-4 border-b border-[#EAECEF] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#0B0F19] text-white flex items-center justify-center font-bold text-sm">
                  A
                </div>
                <div>
                  <div className="text-sm font-extrabold text-[#0B0F19]">Aethel OS</div>
                  <div className="text-[10px] text-[#64748B] uppercase tracking-wider">
                    Aethel Studios
                  </div>
                </div>
              </div>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Close navigation drawer"
                className="w-8 h-8 rounded-lg bg-[#F8F9FA] flex items-center justify-center text-[#64748B]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {SIDEBAR_GROUPS.map((group) => (
                <div key={group.category}>
                  <div className="px-2.5 mb-1 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                    {group.category}
                  </div>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeModule === item.id;
                      const badge = getBadgeValue(item.badgeKey);
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            onSelectModule(item.id);
                            setMobileDrawerOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold ${
                            isActive
                              ? 'bg-[#EFF6FF] text-[#2563EB] font-bold'
                              : 'text-[#475569] hover:bg-[#F8F9FA]'
                          }`}
                        >
                          <span className="flex items-center gap-2.5">
                            <Icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </span>
                          {badge > 0 && (
                            <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-[#2563EB] text-white">
                              {badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-[#EAECEF] bg-[#F8F9FA] space-y-2.5">
              <PWAInstallButton variant="mobile-drawer" />
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1.5">
                  Founder Workspace Filter
                </div>
              <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-xl border border-[#EAECEF]">
                {(['All', 'Krishna', 'Vansh'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => onChangeFounderFilter(f)}
                    className={`py-1.5 rounded-lg text-xs font-bold ${
                      activeFounderFilter === f
                        ? 'bg-[#0B0F19] text-white'
                        : 'text-[#64748B]'
                    }`}
                  >
                    {f === 'All' ? 'All Studio' : f}
                  </button>
                ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HELP & OS ARCHITECTURE MODAL */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-[#0B0F19]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#EAECEF] max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-[#2563EB] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Aethel OS v3.0 — Unified Agency ERP
                </div>
                <h3 className="text-lg font-extrabold text-[#0B0F19] mt-0.5">
                  One Client. One Central Source of Truth.
                </h3>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="w-8 h-8 rounded-full bg-[#F8F9FA] flex items-center justify-center text-[#64748B] hover:text-[#0B0F19]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#475569] leading-relaxed">
              <div className="p-3.5 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF]">
                <div className="font-bold text-[#0B0F19] mb-1">
                  1. Unified Client 360° Profile
                </div>
                Click any client row in <strong>CRM & Pipeline</strong> or search from the top bar to open their 7-tab Client 360° Profile (Overview, Projects & 6-Stage Milestones, Payments, Meta Ads, Domains, Tasks & Notes, and Credentials).
              </div>
              <div className="p-3.5 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF]">
                <div className="font-bold text-[#0B0F19] mb-1">
                  2. Single Financial Source of Truth
                </div>
                Every payment recorded in <strong>CRM Pipeline</strong>, <strong>Client 360°</strong>, or <strong>Finance & Ledger</strong> automatically reconciles through the canonical financial engine. Agency Revenue, Client Pass-Through Ad Spend, and Operational Expenses are strictly separated.
              </div>
              <div className="p-3.5 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF]">
                <div className="font-bold text-[#0B0F19] mb-1">
                  3. Universal Command Palette (Ctrl+K)
                </div>
                Press <kbd className="px-1.5 py-0.5 bg-white border rounded font-mono">Ctrl+K</kbd> anywhere to search commands, convert leads into active projects, log payments, or create tasks.
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 rounded-xl bg-[#0B0F19] text-white text-xs font-bold cursor-pointer"
              >
                Got it, back to work
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
