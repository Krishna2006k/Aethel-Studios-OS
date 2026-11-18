import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { CommandCenterView } from './components/CommandCenterView';
import { ClientPipelineView } from './components/ClientPipelineView';
import { MetaAdsView } from './components/MetaAdsView';
import { DomainsVaultView } from './components/DomainsVaultView';
import { TicketsView } from './components/TicketsView';
import { RnDLabView } from './components/RnDLabView';
import { StudioFinanceView } from './components/StudioFinanceView';
import { EncryptedVaultView } from './components/EncryptedVaultView';
import { SupabaseModal } from './components/SupabaseModal';
import { QuickActionModal } from './components/QuickActionModal';
import {
  AethelDatabaseState,
  ModuleId,
  ClientLead,
  MetaAdCampaign,
  HostedWebsite,
  ClientTicket,
  RnDProject,
  StudioExpense,
  ClientPayment,
  EncryptedVaultItem,
  FounderName,
  ProjectMilestoneStage,
  StudioTask,
  ExpensePaidBy,
} from './types';
import { SEED_DATA } from './data/seedData';
import {
  loadDatabaseState,
  saveDatabaseState,
  saveToLocalStorage,
} from './services/dbService';
import { calculateDaysUntilExpiry } from './utils/calculations';
import {
  appendActivityLog,
  cascadeClientDelete,
  cascadeClientUpdate,
  convertLeadToActiveProject,
  deleteExpenseAndSyncSource,
  deletePaymentAndSyncClient,
  reconcileDatabaseIntegrity,
  recordPaymentAndSyncClient,
  toggleClientMilestone,
  updateExpenseAndSyncSource,
  updatePaymentAndSyncClient,
} from './utils/syncEngine';

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>('command-center');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeFounderFilter, setActiveFounderFilter] = useState<'All' | FounderName>('All');
  const [selectedClient360Id, setSelectedClient360Id] = useState<string | null>(null);

  const [dbState, setDbState] = useState<AethelDatabaseState>(() =>
    reconcileDatabaseIntegrity(SEED_DATA)
  );
  const [syncMode, setSyncMode] = useState<'supabase' | 'local'>('local');
  const [isSyncing, setIsSyncing] = useState(false);
  const [supabaseModalOpen, setSupabaseModalOpen] = useState(false);
  const [quickActionOpen, setQuickActionOpen] = useState(false);

  const refreshFromSource = useCallback(async (): Promise<{
    mode: 'supabase' | 'local';
    error?: string;
  }> => {
    setIsSyncing(true);
    const result = await loadDatabaseState();
    setDbState(result.state);
    setSyncMode(result.mode);
    setIsSyncing(false);
    return { mode: result.mode, error: result.error };
  }, []);

  useEffect(() => {
    refreshFromSource();
  }, [refreshFromSource]);

  // Keep multiple browser tabs / profiles in sync when focusing the window
  useEffect(() => {
    const handleFocus = () => {
      refreshFromSource();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refreshFromSource]);

  // Global Ctrl+K / Cmd+K shortcut for Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setQuickActionOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const persistUpdate = async (updater: (prev: AethelDatabaseState) => AethelDatabaseState) => {
    setDbState((prev) => {
      const updated = reconcileDatabaseIntegrity(updater(prev));
      saveToLocalStorage(updated);
      setIsSyncing(true);
      saveDatabaseState(updated).then((res) => {
        if (res.synced) {
          setSyncMode('supabase');
        } else if (res.error) {
          setSyncMode('local');
        }
        setIsSyncing(false);
      });
      return updated;
    });
  };

  // Jump to any Client's 360° Profile Drawer from anywhere in Aethel OS
  const handleOpenClient360 = (clientId: string) => {
    setSelectedClient360Id(clientId);
    if (activeModule !== 'pipeline') {
      setActiveModule('pipeline');
    }
  };

  // Module State Updaters with Bidirectional Relational Sync
  const handleUpdateClient = (updated: ClientLead) => {
    persistUpdate((prev) => cascadeClientUpdate(prev, updated));
  };

  const handleAddClient = (newLead: ClientLead) => {
    persistUpdate((prev) =>
      reconcileDatabaseIntegrity({
        ...prev,
        clients: [newLead, ...prev.clients],
        activityLogs: appendActivityLog(prev, {
          actor: newLead.assignedTo === 'Both' ? 'Krishna' : newLead.assignedTo,
          action: `Added new client lead (${newLead.stage})`,
          targetName: newLead.businessName,
          category: 'CRM',
        }),
      })
    );
  };

  const handleDeleteClient = (clientId: string) => {
    if (selectedClient360Id === clientId) setSelectedClient360Id(null);
    persistUpdate((prev) => cascadeClientDelete(prev, clientId, true));
  };

  const handleConvertLeadToProject = (
    clientId: string,
    advanceNow?: number,
    receivedBy: ExpensePaidBy = 'Studio Account'
  ) => {
    persistUpdate((prev) => convertLeadToActiveProject(prev, clientId, advanceNow, receivedBy));
  };

  const handleToggleMilestone = (clientId: string, stage: ProjectMilestoneStage) => {
    persistUpdate((prev) =>
      toggleClientMilestone(
        prev,
        clientId,
        stage,
        activeFounderFilter === 'All' ? 'Krishna' : activeFounderFilter
      )
    );
  };

  const handleUpdateCampaign = (updated: MetaAdCampaign) => {
    persistUpdate((prev) => ({
      ...prev,
      metaCampaigns: prev.metaCampaigns.map((c) => (c.id === updated.id ? updated : c)),
    }));
  };

  const handleAddCampaign = (newCampaign: MetaAdCampaign) => {
    persistUpdate((prev) => ({
      ...prev,
      metaCampaigns: [newCampaign, ...prev.metaCampaigns],
      activityLogs: appendActivityLog(prev, {
        actor: 'Krishna',
        action: `Launched Meta Ad campaign (${newCampaign.objective})`,
        targetName: newCampaign.clientName,
        category: 'Growth',
      }),
    }));
  };

  const handleDeleteCampaign = (campaignId: string) => {
    persistUpdate((prev) => ({
      ...prev,
      metaCampaigns: prev.metaCampaigns.filter((c) => c.id !== campaignId),
    }));
  };

  const handleUpdateWebsite = (updated: HostedWebsite) => {
    persistUpdate((prev) => ({
      ...prev,
      websites: prev.websites.map((w) => (w.id === updated.id ? updated : w)),
    }));
  };

  const handleAddWebsite = (newSite: HostedWebsite) => {
    persistUpdate((prev) => ({
      ...prev,
      websites: [newSite, ...prev.websites],
      activityLogs: appendActivityLog(prev, {
        actor: 'Vansh',
        action: `Registered domain ${newSite.domainName}`,
        targetName: newSite.clientName,
        category: 'Domain',
      }),
    }));
  };

  const handleDeleteWebsite = (websiteId: string) => {
    persistUpdate((prev) => ({
      ...prev,
      websites: prev.websites.filter((w) => w.id !== websiteId),
    }));
  };

  const handleUpdateTicket = (updated: ClientTicket) => {
    persistUpdate((prev) => ({
      ...prev,
      tickets: prev.tickets.map((t) => (t.id === updated.id ? updated : t)),
      activityLogs: appendActivityLog(prev, {
        actor: updated.assignedTo === 'Both' ? 'Vansh' : updated.assignedTo,
        action: `Updated ticket: ${updated.title} (${updated.status})`,
        targetName: updated.clientName,
        category: 'Project',
      }),
    }));
  };

  const handleAddTicket = (newTicket: ClientTicket) => {
    persistUpdate((prev) => ({
      ...prev,
      tickets: [newTicket, ...prev.tickets],
      activityLogs: appendActivityLog(prev, {
        actor: newTicket.assignedTo === 'Both' ? 'Vansh' : newTicket.assignedTo,
        action: `Created delivery ticket: ${newTicket.title}`,
        targetName: newTicket.clientName,
        category: 'Project',
      }),
    }));
  };

  const handleDeleteTicket = (ticketId: string) => {
    persistUpdate((prev) => ({
      ...prev,
      tickets: prev.tickets.filter((t) => t.id !== ticketId),
    }));
  };

  const handleAddTask = (newTask: StudioTask) => {
    persistUpdate((prev) => ({
      ...prev,
      tasks: [newTask, ...(prev.tasks || [])],
      activityLogs: appendActivityLog(prev, {
        actor: newTask.assignedTo === 'Both' ? 'Krishna' : newTask.assignedTo,
        action: `Scheduled ${newTask.type}: ${newTask.title}`,
        targetName: newTask.clientName,
        category: 'CRM',
      }),
    }));
  };

  const handleUpdateTask = (updated: StudioTask) => {
    persistUpdate((prev) => ({
      ...prev,
      tasks: (prev.tasks || []).map((t) => (t.id === updated.id ? updated : t)),
    }));
  };

  const handleToggleTaskStatus = (taskId: string) => {
    persistUpdate((prev) => {
      const target = (prev.tasks || []).find((t) => t.id === taskId);
      const nextStatus = target?.status === 'Completed' ? 'Pending' : 'Completed';
      return {
        ...prev,
        tasks: (prev.tasks || []).map((t) =>
          t.id === taskId ? { ...t, status: nextStatus } : t
        ),
        activityLogs: target
          ? appendActivityLog(prev, {
              actor: target.assignedTo === 'Both' ? 'Krishna' : target.assignedTo,
              action: `${nextStatus === 'Completed' ? 'Completed' : 'Reopened'} task: ${target.title}`,
              targetName: target.clientName,
              category: 'CRM',
            })
          : prev.activityLogs,
      };
    });
  };

  const handleDeleteTask = (taskId: string) => {
    persistUpdate((prev) => ({
      ...prev,
      tasks: (prev.tasks || []).filter((t) => t.id !== taskId),
    }));
  };

  const handleUpdateRnD = (updated: RnDProject) => {
    persistUpdate((prev) => ({
      ...prev,
      rndProjects: prev.rndProjects.map((r) => (r.id === updated.id ? updated : r)),
    }));
  };

  const handleAddRnD = (newProject: RnDProject) => {
    persistUpdate((prev) => ({
      ...prev,
      rndProjects: [newProject, ...prev.rndProjects],
    }));
  };

  const handleDeleteRnD = (projectId: string) => {
    persistUpdate((prev) => ({
      ...prev,
      rndProjects: prev.rndProjects.filter((r) => r.id !== projectId),
    }));
  };

  const handleUpdateExpense = (updated: StudioExpense) => {
    persistUpdate((prev) => updateExpenseAndSyncSource(prev, updated));
  };

  const handleAddExpense = (newExp: StudioExpense) => {
    persistUpdate((prev) => ({
      ...prev,
      expenses: [newExp, ...prev.expenses],
      activityLogs: appendActivityLog(prev, {
        actor: newExp.paidBy === 'Studio Account' ? 'Krishna' : newExp.paidBy,
        action: `Logged ₹${newExp.amount.toLocaleString('en-IN')} expense (${newExp.category})`,
        targetName: newExp.title,
        category: 'Finance',
      }),
    }));
  };

  const handleDeleteExpense = (expenseId: string) => {
    persistUpdate((prev) => deleteExpenseAndSyncSource(prev, expenseId));
  };

  const handleAddPayment = (newPay: ClientPayment) => {
    persistUpdate((prev) => recordPaymentAndSyncClient(prev, newPay));
  };

  const handleUpdatePayment = (updated: ClientPayment) => {
    persistUpdate((prev) => updatePaymentAndSyncClient(prev, updated));
  };

  const handleDeletePayment = (paymentId: string) => {
    persistUpdate((prev) => deletePaymentAndSyncClient(prev, paymentId));
  };

  const handleAddVaultItem = (item: EncryptedVaultItem) => {
    persistUpdate((prev) => ({
      ...prev,
      vaultItems: [item, ...prev.vaultItems],
      activityLogs: appendActivityLog(prev, {
        actor: 'Krishna',
        action: `Encrypted credential in Vault: ${item.title}`,
        targetName: item.clientAssociated,
        category: 'Vault',
      }),
    }));
  };

  const handleUpdateVaultItem = (updated: EncryptedVaultItem) => {
    persistUpdate((prev) => ({
      ...prev,
      vaultItems: prev.vaultItems.map((v) => (v.id === updated.id ? updated : v)),
    }));
  };

  const handleDeleteVaultItem = (id: string) => {
    persistUpdate((prev) => ({
      ...prev,
      vaultItems: prev.vaultItems.filter((v) => v.id !== id),
    }));
  };

  const handleResetDemoData = async () => {
    try {
      await fetch('/api/db/reset', { method: 'POST' });
    } catch {
      // ignore if offline
    }
    const emptyState = reconcileDatabaseIntegrity(SEED_DATA);
    setDbState(emptyState);
    saveToLocalStorage(emptyState);
    await saveDatabaseState(emptyState);
  };

  // Urgent Badges for Sidebar Navigation
  const urgentCounts = {
    followUps: dbState.clients.filter(
      (c) =>
        c.stage === 'Sample Sent / WhatsApp' ||
        c.stage === 'In Talks / Demo Shown' ||
        c.stage === 'In Building' ||
        c.stage === 'Live / Payment Pending'
    ).length,
    openTickets: dbState.tickets.filter((t) => t.status !== 'Resolved').length,
    expiringDomains: dbState.websites.filter(
      (w) => calculateDaysUntilExpiry(w.expiryDate) <= 45
    ).length,
    pendingTasks: (dbState.tasks || []).filter((t) => t.status !== 'Completed').length,
  };

  const activeClientContext = selectedClient360Id
    ? dbState.clients.find((c) => c.id === selectedClient360Id) || null
    : null;

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#0B0F19] flex flex-col justify-between selection:bg-[#2563EB] selection:text-white">
      {/* Collapsible Sidebar + Sticky Top Context Bar */}
      <Navbar
        activeModule={activeModule}
        onSelectModule={setActiveModule}
        syncMode={syncMode}
        isSyncing={isSyncing}
        onOpenSupabaseModal={() => setSupabaseModalOpen(true)}
        onOpenQuickAction={() => setQuickActionOpen(true)}
        urgentCounts={urgentCounts}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
        activeFounderFilter={activeFounderFilter}
        onChangeFounderFilter={setActiveFounderFilter}
        clients={dbState.clients}
        onOpenClient360={handleOpenClient360}
      />

      {/* Main Workspace Container */}
      <div
        className={`flex-1 flex flex-col justify-between transition-all duration-200 ${
          sidebarCollapsed ? 'lg:pl-[68px]' : 'lg:pl-[240px]'
        }`}
      >
        <main className="max-w-[1440px] w-full mx-auto px-3 sm:px-6 lg:px-8 pt-5 pb-12">
          {activeModule === 'command-center' && (
            <CommandCenterView
              dbState={dbState}
              onNavigate={setActiveModule}
              onOpenQuickAction={() => setQuickActionOpen(true)}
              activeFounderFilter={activeFounderFilter}
              onChangeFounderFilter={setActiveFounderFilter}
              onOpenClient360={handleOpenClient360}
              onToggleMilestone={handleToggleMilestone}
              onToggleTaskStatus={handleToggleTaskStatus}
            />
          )}

          {activeModule === 'pipeline' && (
            <ClientPipelineView
              clients={dbState.clients}
              dbState={dbState}
              onUpdateClient={handleUpdateClient}
              onAddClient={handleAddClient}
              onDeleteClient={handleDeleteClient}
              onConvertLeadToProject={handleConvertLeadToProject}
              onToggleMilestone={handleToggleMilestone}
              onAddPayment={handleAddPayment}
              onAddTicket={handleAddTicket}
              onAddCampaign={handleAddCampaign}
              onAddWebsite={handleAddWebsite}
              onAddTask={handleAddTask}
              onToggleTaskStatus={handleToggleTaskStatus}
              selectedClient360Id={selectedClient360Id}
              onSelectClient360={setSelectedClient360Id}
            />
          )}

          {(activeModule === 'tickets' || activeModule === 'tasks') && (
            <TicketsView
              tickets={dbState.tickets}
              clients={dbState.clients}
              websites={dbState.websites}
              tasks={dbState.tasks || []}
              initialSubView={activeModule === 'tasks' ? 'tasks' : 'projects'}
              onUpdateClient={handleUpdateClient}
              onUpdateTicket={handleUpdateTicket}
              onAddTicket={handleAddTicket}
              onDeleteTicket={handleDeleteTicket}
              onToggleMilestone={handleToggleMilestone}
              onAddTask={handleAddTask}
              onUpdateTask={handleUpdateTask}
              onToggleTaskStatus={handleToggleTaskStatus}
              onDeleteTask={handleDeleteTask}
              onOpenClient360={handleOpenClient360}
            />
          )}

          {activeModule === 'meta-ads' && (
            <MetaAdsView
              campaigns={dbState.metaCampaigns}
              clients={dbState.clients}
              onUpdateCampaign={handleUpdateCampaign}
              onAddCampaign={handleAddCampaign}
              onDeleteCampaign={handleDeleteCampaign}
              onOpenClient360={handleOpenClient360}
            />
          )}

          {activeModule === 'domains' && (
            <DomainsVaultView
              websites={dbState.websites}
              clients={dbState.clients}
              onUpdateWebsite={handleUpdateWebsite}
              onAddWebsite={handleAddWebsite}
              onDeleteWebsite={handleDeleteWebsite}
              onOpenClient360={handleOpenClient360}
            />
          )}

          {(activeModule === 'finance' || activeModule === 'analytics') && (
            <StudioFinanceView
              expenses={dbState.expenses}
              payments={dbState.payments}
              clients={dbState.clients}
              metaCampaigns={dbState.metaCampaigns}
              initialSubView={activeModule === 'analytics' ? 'analytics' : 'ledger'}
              onUpdateExpense={handleUpdateExpense}
              onAddExpense={handleAddExpense}
              onDeleteExpense={handleDeleteExpense}
              onAddPayment={handleAddPayment}
              onUpdatePayment={handleUpdatePayment}
              onDeletePayment={handleDeletePayment}
              onOpenClient360={handleOpenClient360}
            />
          )}

          {activeModule === 'rnd-lab' && (
            <RnDLabView
              projects={dbState.rndProjects}
              clients={dbState.clients}
              onUpdateProject={handleUpdateRnD}
              onAddProject={handleAddRnD}
              onDeleteProject={handleDeleteRnD}
              onOpenClient360={handleOpenClient360}
            />
          )}

          {activeModule === 'vault' && (
            <EncryptedVaultView
              vaultItems={dbState.vaultItems}
              onAddVaultItem={handleAddVaultItem}
              onUpdateVaultItem={handleUpdateVaultItem}
              onDeleteVaultItem={handleDeleteVaultItem}
            />
          )}
        </main>

        {/* Editorial Studio Footer */}
        <footer className="border-t border-[#EAECEF] bg-white py-4 px-4 sm:px-8">
          <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748B]">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-[#0B0F19] text-white flex items-center justify-center font-bold text-[11px]">
                A
              </div>
              <span>
                <strong className="text-[#0B0F19]">Aethel Studios</strong> — Unified Agency &amp; Growth Operating System · Founded by{' '}
                <strong className="text-[#0B0F19]">Vansh Khakole</strong> &amp;{' '}
                <strong className="text-[#0B0F19]">Krishna Khakole</strong>
              </span>
            </div>
            <div className="flex items-center gap-4 font-mono text-[11px]">
              <span>aethelstudios.in@gmail.com</span>
              <span>·</span>
              <span>Pune &amp; Maharashtra, India</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Modals */}
      <SupabaseModal
        isOpen={supabaseModalOpen}
        onClose={() => setSupabaseModalOpen(false)}
        syncMode={syncMode}
        onConnectionChanged={refreshFromSource}
        onResetDemoData={handleResetDemoData}
      />

      <QuickActionModal
        isOpen={quickActionOpen}
        onClose={() => setQuickActionOpen(false)}
        dbState={dbState}
        activeClientContext={activeClientContext}
        onAddLead={handleAddClient}
        onAddExpense={handleAddExpense}
        onAddPayment={handleAddPayment}
        onAddTicket={handleAddTicket}
        onAddCampaign={handleAddCampaign}
        onAddWebsite={handleAddWebsite}
        onAddTask={handleAddTask}
        onOpenClient360={handleOpenClient360}
      />
    </div>
  );
}
