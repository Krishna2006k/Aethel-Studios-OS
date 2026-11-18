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
  Bell,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import {
  AethelDatabaseState,
  ClientLead,
  FounderName,
  ModuleId,
} from '../types';
import {
  formatINR,
  generateStudioNotifications,
} from '../utils/calculations';
import { DEFAULT_AUTOMATION_RULES } from '../utils/syncEngine';
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
  dbState?: AethelDatabaseState;
  onOpenClient360?: (clientId: string) => void;
  onToggleAutomationRule?: (ruleId: string) => void;
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
  dbState,
  onOpenClient360,
  onToggleAutomationRule,
}) => {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAutomationsModal, setShowAutomationsModal] = useState(false);

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

  // Universal Search across Clients, Campaigns, Domains, Payments, Tasks, Vault
  const q = globalSearch.trim().toLowerCase();
  const matchingClients =
    q.length > 0
      ? clients
          .filter(
            (c) =>
              c.businessName.toLowerCase().includes(q) ||
              c.contactPerson.toLowerCase().includes(q) ||
              c.city.toLowerCase().includes(q) ||
              c.packageTier.toLowerCase().includes(q) ||
              (c.leadSource || '').toLowerCase().includes(q)
          )
          .slice(0, 5)
      : [];

  const matchingCampaigns =
    q.length > 0 && dbState
      ? dbState.metaCampaigns
          .filter(
            (m) =>
              m.campaignName.toLowerCase().includes(q) ||
              m.clientName.toLowerCase().includes(q) ||
              m.objective.toLowerCase().includes(q)
          )
          .slice(0, 3)
      : [];

  const matchingDomains =
    q.length > 0 && dbState
      ? dbState.websites
          .filter(
            (w) =>
              w.domainName.toLowerCase().includes(q) ||
              w.clientName.toLowerCase().includes(q) ||
              w.registrar.toLowerCase().includes(q)
          )
          .slice(0, 3)
      : [];

  const matchingPayments =
    q.length > 0 && dbState
      ? dbState.payments
          .filter(
            (p) =>
              p.clientName.toLowerCase().includes(q) ||
              p.projectTitle.toLowerCase().includes(q) ||
              p.milestone.toLowerCase().includes(q)
          )
          .slice(0, 3)
      : [];

  const matchingTasks =
    q.length > 0 && dbState
      ? (dbState.tasks || [])
          .filter(
            (t) =>
              t.title.toLowerCase().includes(q) ||
              t.clientName.toLowerCase().includes(q)
          )
          .slice(0, 3)
      : [];

  const matchingVault =
    q.length > 0 && dbState
      ? dbState.vaultItems
          .filter(
            (v) =>
              v.title.toLowerCase().includes(q) ||
              v.clientAssociated.toLowerCase().includes(q) ||
              v.category.toLowerCase().includes(q)
          )
          .slice(0, 3)
      : [];

  const totalSearchMatches =
    matchingClients.length +
    matchingCampaigns.length +
    matchingDomains.length +
    matchingPayments.length +
    matchingTasks.length +
    matchingVault.length;

  const notifications = dbState ? generateStudioNotifications(dbState) : [];
  const criticalNotifCount = notifications.filter((n) => n.severity === 'critical').length;
  const automationRules =
    dbState?.automationRules && dbState.automationRules.length > 0
      ? dbState.automationRules
      : DEFAULT_AUTOMATION_RULES;

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

        {/* Bottom Section: Automations, Install App, Settings, Help & Support, Krishna / Vansh Profile */}
        <div className="p-2.5 border-t border-[#EAECEF] space-y-1 bg-[#FAFBFC]">
          <PWAInstallButton variant="sidebar" collapsed={sidebarCollapsed} />

          <button
            onClick={() => setShowAutomationsModal(true)}
            title="Studio Automation Engine"
            className={`w-full flex items-center ${
              sidebarCollapsed ? 'justify-center px-0' : 'justify-between px-2.5'
            } py-1.5 rounded-lg text-xs font-medium text-[#475569] hover:text-[#0B0F19] hover:bg-white transition-colors cursor-pointer`}
          >
            <span className="flex items-center gap-2 truncate">
              <Zap className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
              {!sidebarCollapsed && <span>Automations</span>}
            </span>
            {!sidebarCollapsed && (
              <span className="text-[10px] font-mono font-bold text-[#059669] bg-[#D1FAE5] px-1.5 py-0.2 rounded">
                {automationRules.filter((r) => r.enabled).length} ON
              </span>
            )}
          </button>

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

          {/* Persistent Workspace Switcher */}
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
                    {activeFounderFilter === 'All'
                      ? 'KV'
                      : activeFounderFilter === 'Krishna'
                      ? 'KK'
                      : 'VK'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold text-[#0B0F19] truncate">
                      {activeFounderFilter === 'All'
                        ? 'Krishna & Vansh'
                        : `${activeFounderFilter}'s Workspace`}
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
        className={`sticky top-0 z-30 h-15 bg-white/95 backdrop-blur-md border-b border-[#EAECEF] px-3 sm:px-6 flex items-center justify-between gap-3 transition-all duration-200 ${
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

          <div className="hidden md:flex items-center gap-2 text-xs min-w-0">
            <span className="font-bold uppercase tracking-wider text-[#94A3B8] text-[10px]">
              {activeNavMeta.category}
            </span>
            <span className="text-[#CBD5E1]">/</span>
            <span className="font-bold text-[#0B0F19] text-sm truncate">
              {activeNavMeta.label}
            </span>
          </div>
        </div>

        {/* Center: Universal Global Search Bar across ALL Entities */}
        <div className="relative flex-1 max-w-lg">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={globalSearch}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Universal search: clients, projects, invoices, campaigns, domains..."
              aria-label="Universal search across Aethel OS"
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

          {/* Universal Search Categorized Dropdown */}
          {searchFocused && q.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl border border-[#EAECEF] shadow-2xl p-2.5 z-50 max-h-[75vh] overflow-y-auto space-y-2.5">
              {totalSearchMatches === 0 ? (
                <div className="px-3 py-4 text-xs text-[#64748B] text-center">
                  No studio records matching "{globalSearch}". Press{' '}
                  <button
                    onMouseDown={() => onOpenQuickAction()}
                    className="text-[#2563EB] font-bold underline"
                  >
                    + Quick Command
                  </button>{' '}
                  to create one.
                </div>
              ) : (
                <>
                  {/* 1. Clients & Projects */}
                  {matchingClients.length > 0 && (
                    <div>
                      <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] flex items-center justify-between">
                        <span>Client 360° & Projects ({matchingClients.length})</span>
                        <span>Open 360°</span>
                      </div>
                      <div className="space-y-0.5 mt-0.5">
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
                            className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-[#F8F9FA] text-left transition-colors cursor-pointer"
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-[#0B0F19] truncate">
                                {client.businessName}
                              </div>
                              <div className="text-[11px] text-[#64748B] truncate">
                                {client.contactPerson} · {client.city} · {client.stage} ·{' '}
                                <span className="font-mono">{formatINR(client.finalAgreedPrice)}</span>
                              </div>
                            </div>
                            <span className="text-[11px] font-bold text-[#2563EB] flex items-center gap-0.5 shrink-0 ml-2">
                              360° <ArrowUpRight className="w-3 h-3" />
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2. Payments & Invoices */}
                  {matchingPayments.length > 0 && (
                    <div className="pt-1 border-t border-[#F1F3F5]">
                      <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                        Payments & Invoices ({matchingPayments.length})
                      </div>
                      <div className="space-y-0.5">
                        {matchingPayments.map((pay) => (
                          <button
                            key={pay.id}
                            onMouseDown={() => {
                              onSelectModule('finance');
                              setGlobalSearch('');
                            }}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-[#F8F9FA] text-left cursor-pointer"
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-[#0B0F19] truncate">
                                {pay.clientName} — {pay.milestone}
                              </div>
                              <div className="text-[11px] text-[#64748B] truncate">
                                {pay.paymentDate} · {pay.paymentMode} ({pay.receivedInAccount})
                              </div>
                            </div>
                            <span className="text-xs font-mono font-bold text-[#059669] ml-2">
                              +{formatINR(pay.amountReceived)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 3. Meta Ad Campaigns */}
                  {matchingCampaigns.length > 0 && (
                    <div className="pt-1 border-t border-[#F1F3F5]">
                      <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                        Meta Ad Campaigns ({matchingCampaigns.length})
                      </div>
                      <div className="space-y-0.5">
                        {matchingCampaigns.map((camp) => (
                          <button
                            key={camp.id}
                            onMouseDown={() => {
                              onSelectModule('meta-ads');
                              setGlobalSearch('');
                            }}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-[#F8F9FA] text-left cursor-pointer"
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-[#0B0F19] truncate">
                                {camp.campaignName} ({camp.clientName})
                              </div>
                              <div className="text-[11px] text-[#64748B] truncate">
                                {camp.objective} · {camp.status}
                              </div>
                            </div>
                            <span className="text-xs font-mono font-bold text-[#0B0F19] ml-2">
                              {formatINR(camp.amountSpent)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 4. Domains & Hosting */}
                  {matchingDomains.length > 0 && (
                    <div className="pt-1 border-t border-[#F1F3F5]">
                      <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                        Domains & Hosting ({matchingDomains.length})
                      </div>
                      <div className="space-y-0.5">
                        {matchingDomains.map((dom) => (
                          <button
                            key={dom.id}
                            onMouseDown={() => {
                              onSelectModule('domains');
                              setGlobalSearch('');
                            }}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-[#F8F9FA] text-left cursor-pointer"
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-[#0B0F19] font-mono truncate">
                                {dom.domainName}
                              </div>
                              <div className="text-[11px] text-[#64748B] truncate">
                                {dom.clientName} · {dom.hostingPlatform}
                              </div>
                            </div>
                            <span className="text-[11px] font-bold text-[#059669] ml-2">
                              {dom.siteStatus}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 5. Tasks & Vault */}
                  {(matchingTasks.length > 0 || matchingVault.length > 0) && (
                    <div className="pt-1 border-t border-[#F1F3F5]">
                      <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                        Tasks & Vault ({matchingTasks.length + matchingVault.length})
                      </div>
                      <div className="space-y-0.5">
                        {matchingTasks.map((t) => (
                          <button
                            key={t.id}
                            onMouseDown={() => {
                              onSelectModule('tasks');
                              setGlobalSearch('');
                            }}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-[#F8F9FA] text-left cursor-pointer"
                          >
                            <span className="text-xs font-semibold text-[#0B0F19] truncate">
                              Task: {t.title} ({t.clientName})
                            </span>
                            <span className="text-[10px] font-mono text-[#64748B] ml-2">
                              {t.dueDate}
                            </span>
                          </button>
                        ))}
                        {matchingVault.map((v) => (
                          <button
                            key={v.id}
                            onMouseDown={() => {
                              onSelectModule('vault');
                              setGlobalSearch('');
                            }}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-[#F8F9FA] text-left cursor-pointer"
                          >
                            <span className="text-xs font-semibold text-[#0B0F19] truncate">
                              Vault: {v.title} ({v.clientAssociated})
                            </span>
                            <span className="text-[10px] text-[#2563EB] font-bold ml-2">
                              Encrypted
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Right: Workspace Pill + Notification Bell + Install App + Sync Status + Command Trigger */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Top-Bar Quick Workspace Filter Pill */}
          <div className="hidden xl:flex items-center bg-[#F8F9FA] p-0.5 rounded-xl border border-[#EAECEF]">
            {(['All', 'Krishna', 'Vansh'] as const).map((f) => (
              <button
                key={f}
                onClick={() => onChangeFounderFilter(f)}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  activeFounderFilter === f
                    ? 'bg-[#0B0F19] text-white shadow-2xs'
                    : 'text-[#64748B] hover:text-[#0B0F19]'
                }`}
              >
                {f === 'All' ? 'All Studio' : f}
              </button>
            ))}
          </div>

          {/* Notification Centre Trigger */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications((prev) => !prev)}
              aria-label="Open Studio Notification Centre"
              title="Studio Notification Centre"
              className="relative w-9 h-9 rounded-xl bg-[#F8F9FA] hover:bg-[#F1F5F9] border border-[#EAECEF] flex items-center justify-center text-[#0B0F19] transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {notifications.length > 0 && (
                <span
                  className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-mono font-bold text-white flex items-center justify-center ${
                    criticalNotifCount > 0 ? 'bg-[#E11D48]' : 'bg-[#2563EB]'
                  }`}
                >
                  {notifications.length}
                </span>
              )}
            </button>

            {/* Notification Centre Dropdown Drawer */}
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-[#EAECEF] shadow-2xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-[#EAECEF] bg-[#F8F9FA] flex items-center justify-between">
                  <div>
                    <div className="text-xs font-extrabold text-[#0B0F19] flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-[#2563EB]" /> Studio Notification Centre
                    </div>
                    <div className="text-[10px] text-[#64748B]">
                      Live alerts across Receivables, Domains, Tasks & Deliveries
                    </div>
                  </div>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="w-6 h-6 rounded-lg text-[#64748B] hover:text-[#0B0F19] flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="max-h-96 overflow-y-auto divide-y divide-[#F1F3F5]">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#64748B]">
                      <CheckCircle2 className="w-6 h-6 text-[#059669] mx-auto mb-1.5" />
                      All clear! No overdue payments, expiring domains, or urgent tickets.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => {
                          if (n.clientId && onOpenClient360) {
                            onOpenClient360(n.clientId);
                          } else {
                            onSelectModule(n.targetModule);
                          }
                          setShowNotifications(false);
                        }}
                        className="w-full p-3.5 text-left hover:bg-[#F8F9FA] transition-colors flex items-start gap-3 cursor-pointer"
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            n.severity === 'critical'
                              ? 'bg-[#FFE4E6] text-[#E11D48]'
                              : n.severity === 'warning'
                              ? 'bg-[#FEF3C7] text-[#D97706]'
                              : 'bg-[#EFF6FF] text-[#2563EB]'
                          }`}
                        >
                          {n.severity === 'critical' ? (
                            <AlertTriangle className="w-3.5 h-3.5" />
                          ) : (
                            <Clock className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                              {n.category}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                n.severity === 'critical'
                                  ? 'bg-[#FFE4E6] text-[#E11D48]'
                                  : n.severity === 'warning'
                                  ? 'bg-[#FEF3C7] text-[#D97706]'
                                  : 'bg-[#EFF6FF] text-[#2563EB]'
                              }`}
                            >
                              {n.severity === 'critical' ? 'Action Required' : 'Reminder'}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-[#0B0F19] mt-0.5 truncate">
                            {n.title}
                          </div>
                          <div className="text-[11px] text-[#64748B] mt-0.5 line-clamp-2">
                            {n.description}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                <div className="px-4 py-2.5 bg-[#F8F9FA] border-t border-[#EAECEF] flex items-center justify-between">
                  <button
                    onClick={() => {
                      setShowNotifications(false);
                      setShowAutomationsModal(true);
                    }}
                    className="text-[11px] font-bold text-[#2563EB] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Zap className="w-3 h-3" /> Configure Automation Rules
                  </button>
                  <span className="text-[10px] font-mono text-[#64748B]">
                    {notifications.length} active alert{notifications.length === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
            )}
          </div>

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

      {/* PART 11 — AUTOMATION ENGINE RULES MODAL */}
      {showAutomationsModal && (
        <div className="fixed inset-0 z-50 bg-[#0B0F19]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#EAECEF] max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-[#2563EB] flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> Proactive Operations Engine
                </div>
                <h3 className="text-lg font-extrabold text-[#0B0F19] mt-0.5">
                  Aethel OS — Automated Studio Workflows
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Deterministic relational triggers that keep CRM, Deliveries, Domains, and Finance synchronized in real time.
                </p>
              </div>
              <button
                onClick={() => setShowAutomationsModal(false)}
                className="w-8 h-8 rounded-full bg-[#F8F9FA] flex items-center justify-center text-[#64748B] hover:text-[#0B0F19] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              {automationRules.map((rule) => (
                <div
                  key={rule.id}
                  className="p-4 rounded-2xl border border-[#EAECEF] bg-[#F8F9FA] flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-[#0B0F19]">
                        {rule.name}
                      </span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white border border-[#EAECEF] text-[#475569]">
                        {rule.category}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#475569]">
                      <strong className="text-[#0B0F19]">IF:</strong> {rule.trigger}
                    </div>
                    <div className="text-[11px] text-[#2563EB] font-medium">
                      <strong>THEN:</strong> {rule.action}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <button
                      onClick={() =>
                        onToggleAutomationRule && onToggleAutomationRule(rule.id)
                      }
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                        rule.enabled
                          ? 'bg-[#059669] text-white'
                          : 'bg-[#E2E8F0] text-[#64748B]'
                      }`}
                    >
                      {rule.enabled ? 'Active' : 'Paused'}
                    </button>
                    <span className="text-[10px] font-mono text-[#64748B]">
                      Active across studio
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-[#EAECEF]">
              <span className="text-[11px] text-[#64748B]">
                All rules execute atomically inside the relational sync engine.
              </span>
              <button
                onClick={() => setShowAutomationsModal(false)}
                className="px-4 py-2 rounded-xl bg-[#0B0F19] text-white text-xs font-bold cursor-pointer"
              >
                Done
              </button>
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
                  <Sparkles className="w-3.5 h-3.5" /> Aethel OS v4.0 — Unified Agency ERP
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
                  1. 9-Tab Unified Client 360° Workspace
                </div>
                Click any client row in <strong>CRM & Pipeline</strong> or search from the top bar to open their 9-tab Client 360° Workspace (Overview, Projects & Approvals, Payments & Invoices, Tasks, Marketing, Domains, Documents & Vault, Communication Log, and Activity Timeline).
              </div>
              <div className="p-3.5 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF]">
                <div className="font-bold text-[#0B0F19] mb-1">
                  2. Single Financial Source of Truth & Co-Founder Ledger
                </div>
                Every payment recorded in <strong>CRM Pipeline</strong>, <strong>Client 360°</strong>, or <strong>Finance & Ledger</strong> automatically reconciles through the canonical financial engine, updating Co-Founder 50/50 profit shares, personal reimbursements, and numbered client invoices.
              </div>
              <div className="p-3.5 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF]">
                <div className="font-bold text-[#0B0F19] mb-1">
                  3. Universal Search & Command Palette (Ctrl+K)
                </div>
                Use the top search bar to query across all entities (clients, projects, invoices, Meta campaigns, domains, tasks, and vault credentials) or press <kbd className="px-1.5 py-0.5 bg-white border rounded font-mono">Ctrl+K</kbd> anywhere.
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
