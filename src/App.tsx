import { useState, useEffect, useCallback } from 'react';
import type {
  AethelDatabaseState,
  ModuleId,
  FounderFilter,
  ClientLead,
  MetaCampaign,
  TechAsset,
  DeliveryTicket,
  PrototypeItem,
  ExpenseItem,
  ClientPayment,
  VaultCredential,
} from './types';
import { SEED_DATA } from './data/seedData';
import {
  loadInitialDatabase,
  persistDatabaseState,
  deleteRecordFromSupabase,
  resetToFactorySeed,
  DEMO_MASTER_PASSPHRASE,
} from './services/dbService';
import { Navbar } from './components/Navbar';
import { CommandCenterView } from './components/CommandCenterView';
import { ClientPipelineView } from './components/ClientPipelineView';
import { MetaAdsView } from './components/MetaAdsView';
import { DomainsVaultView } from './components/DomainsVaultView';
import { TicketsView } from './components/TicketsView';
import { RnDLabView } from './components/RnDLabView';
import { StudioFinanceView } from './components/StudioFinanceView';
import { EncryptedVaultView } from './components/EncryptedVaultView';
import { QuickActionModal, QuickActionTab } from './components/QuickActionModal';
import { SupabaseModal } from './components/SupabaseModal';

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>('command-center');
  const [founderFilter, setFounderFilter] = useState<FounderFilter>('All Studio');
  const [dbState, setDbState] = useState<AethelDatabaseState>(SEED_DATA);
  const [syncMode, setSyncMode] = useState<'cloud' | 'local'>('local');
  const [selectedClientForDrawer, setSelectedClientForDrawer] = useState<ClientLead | null>(null);

  // Active session Master Passphrase for Module 08 (RAM-only, pre-loaded with demo key aethel2026)
  const [masterPassphrase, setMasterPassphrase] = useState<string>(DEMO_MASTER_PASSPHRASE);

  // Modals
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [quickActionTab, setQuickActionTab] = useState<QuickActionTab>('client');
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const notify = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  }, []);

  const refreshDatabase = useCallback(async () => {
    const res = await loadInitialDatabase();
    setDbState(res.state);
    setSyncMode(res.mode);
    if (res.syncNote) {
      notify(res.syncNote);
    }
  }, [notify]);

  useEffect(() => {
    refreshDatabase();
  }, [refreshDatabase]);

  // Global Ctrl+K / Cmd+K Command Bar Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsQuickActionOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const updateAndPersist = useCallback(
    (updater: (prev: AethelDatabaseState) => AethelDatabaseState) => {
      setDbState((prev) => {
        const next = updater(prev);
        persistDatabaseState(next);
        return next;
      });
    },
    []
  );

  // CRUD Handlers for Module 02: Clients
  const handleAddClient = (client: ClientLead) => {
    updateAndPersist((prev) => ({
      ...prev,
      clients: [client, ...prev.clients],
    }));
    notify(`Added client lead: ${client.businessName}`);
  };

  const handleUpdateClient = (updated: ClientLead) => {
    updateAndPersist((prev) => ({
      ...prev,
      clients: prev.clients.map((c) => (c.id === updated.id ? updated : c)),
    }));
    notify(`Updated ${updated.businessName}`);
  };

  const handleDeleteClient = (id: string) => {
    updateAndPersist((prev) => ({
      ...prev,
      clients: prev.clients.filter((c) => c.id !== id),
    }));
    deleteRecordFromSupabase('clients', id);
    notify('Removed client from pipeline.');
  };

  // CRUD Handlers for Module 03: Meta Ads
  const handleAddCampaign = (campaign: MetaCampaign) => {
    updateAndPersist((prev) => ({
      ...prev,
      metaCampaigns: [campaign, ...prev.metaCampaigns],
    }));
    notify(`Launched Meta Ads campaign for ${campaign.clientName}`);
  };

  const handleUpdateCampaign = (updated: MetaCampaign) => {
    updateAndPersist((prev) => ({
      ...prev,
      metaCampaigns: prev.metaCampaigns.map((c) =>
        c.id === updated.id ? updated : c
      ),
    }));
  };

  const handleDeleteCampaign = (id: string) => {
    updateAndPersist((prev) => ({
      ...prev,
      metaCampaigns: prev.metaCampaigns.filter((c) => c.id !== id),
    }));
    deleteRecordFromSupabase('meta_campaigns', id);
    notify('Deleted Meta Ads campaign.');
  };

  // CRUD Handlers for Module 04: Websites & Domains
  const handleAddWebsite = (website: TechAsset) => {
    updateAndPersist((prev) => ({
      ...prev,
      websites: [website, ...prev.websites],
    }));
    notify(`Registered domain asset: ${website.projectName}`);
  };

  const handleUpdateWebsite = (updated: TechAsset) => {
    updateAndPersist((prev) => ({
      ...prev,
      websites: prev.websites.map((w) => (w.id === updated.id ? updated : w)),
    }));
    notify(`Updated status for ${updated.projectName}`);
  };

  const handleDeleteWebsite = (id: string) => {
    updateAndPersist((prev) => ({
      ...prev,
      websites: prev.websites.filter((w) => w.id !== id),
    }));
    deleteRecordFromSupabase('websites', id);
    notify('Removed website asset.');
  };

  // CRUD Handlers for Module 05: Tickets
  const handleAddTicket = (ticket: DeliveryTicket) => {
    updateAndPersist((prev) => ({
      ...prev,
      tickets: [ticket, ...prev.tickets],
    }));
    notify(`Logged ticket: ${ticket.title}`);
  };

  const handleUpdateTicket = (updated: DeliveryTicket) => {
    updateAndPersist((prev) => ({
      ...prev,
      tickets: prev.tickets.map((t) => (t.id === updated.id ? updated : t)),
    }));
    notify(`Ticket moved to ${updated.state}`);
  };

  const handleDeleteTicket = (id: string) => {
    updateAndPersist((prev) => ({
      ...prev,
      tickets: prev.tickets.filter((t) => t.id !== id),
    }));
    deleteRecordFromSupabase('tickets', id);
    notify('Deleted ticket.');
  };

  // CRUD Handlers for Module 06: R&D Lab Prototypes
  const handleAddPrototype = (proto: PrototypeItem) => {
    updateAndPersist((prev) => ({
      ...prev,
      prototypes: [proto, ...prev.prototypes],
    }));
    notify(`Added R&D prototype: ${proto.projectName}`);
  };

  const handleUpdatePrototype = (updated: PrototypeItem) => {
    updateAndPersist((prev) => ({
      ...prev,
      prototypes: prev.prototypes.map((p) =>
        p.id === updated.id ? updated : p
      ),
    }));
  };

  const handleDeletePrototype = (id: string) => {
    updateAndPersist((prev) => ({
      ...prev,
      prototypes: prev.prototypes.filter((p) => p.id !== id),
    }));
    deleteRecordFromSupabase('prototypes', id);
    notify('Removed R&D prototype.');
  };

  // CRUD Handlers for Module 07: Studio Finance
  const handleAddExpense = (expense: ExpenseItem) => {
    updateAndPersist((prev) => ({
      ...prev,
      expenses: [expense, ...prev.expenses],
    }));
    notify(`Logged expense: ${expense.title} (Paid by ${expense.paidBy})`);
  };

  const handleUpdateExpense = (updated: ExpenseItem) => {
    updateAndPersist((prev) => ({
      ...prev,
      expenses: prev.expenses.map((e) => (e.id === updated.id ? updated : e)),
    }));
    notify(`Updated reimbursement status for ${updated.title}`);
  };

  const handleDeleteExpense = (id: string) => {
    updateAndPersist((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((e) => e.id !== id),
    }));
    deleteRecordFromSupabase('expenses', id);
    notify('Deleted expense entry.');
  };

  const handleAddPayment = (payment: ClientPayment) => {
    updateAndPersist((prev) => ({
      ...prev,
      payments: [payment, ...prev.payments],
    }));
    notify(`Recorded inflow from ${payment.clientName}`);
  };

  const handleDeletePayment = (id: string) => {
    updateAndPersist((prev) => ({
      ...prev,
      payments: prev.payments.filter((p) => p.id !== id),
    }));
    deleteRecordFromSupabase('client_payments', id);
    notify('Removed payment record.');
  };

  // CRUD Handlers for Module 08: Encrypted Vault
  const handleAddVaultCredential = (cred: VaultCredential) => {
    updateAndPersist((prev) => ({
      ...prev,
      vaultCredentials: [cred, ...prev.vaultCredentials],
    }));
    notify(`Encrypted & stored ${cred.servicePlatform} in Zero-Knowledge Vault`);
  };

  const handleDeleteVaultCredential = (id: string) => {
    updateAndPersist((prev) => ({
      ...prev,
      vaultCredentials: prev.vaultCredentials.filter((v) => v.id !== id),
    }));
    deleteRecordFromSupabase('vault_credentials', id);
    notify('Deleted encrypted credential.');
  };

  const openQuickActionWithTab = (tab: QuickActionTab) => {
    setQuickActionTab(tab);
    setIsQuickActionOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F8F9FA] text-[#0B0F19]">
      <div>
        <Navbar
          activeModule={activeModule}
          onSelectModule={setActiveModule}
          onOpenQuickAction={() => openQuickActionWithTab('client')}
          onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
          syncMode={syncMode}
          urgentCount={
            dbState.tickets.filter((t) => t.state !== 'Deployed & Resolved').length
          }
        />

        <main className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 pt-6 pb-16">
          {activeModule === 'command-center' && (
            <CommandCenterView
              db={dbState}
              founderFilter={founderFilter}
              onChangeFounderFilter={setFounderFilter}
              onNavigateModule={setActiveModule}
              onSelectClientForDrawer={(c) => {
                setSelectedClientForDrawer(c);
                setActiveModule('pipeline');
              }}
              onResolveTicketQuick={(ticketId) => {
                const found = dbState.tickets.find((t) => t.id === ticketId);
                if (found) {
                  handleUpdateTicket({ ...found, state: 'Deployed & Resolved' });
                }
              }}
              onOpenQuickActionWithTab={openQuickActionWithTab}
            />
          )}

          {activeModule === 'pipeline' && (
            <ClientPipelineView
              clients={dbState.clients}
              selectedClient={selectedClientForDrawer}
              onSelectClient={setSelectedClientForDrawer}
              onUpdateClient={handleUpdateClient}
              onDeleteClient={handleDeleteClient}
              onOpenAddClient={() => openQuickActionWithTab('client')}
            />
          )}

          {activeModule === 'meta-ads' && (
            <MetaAdsView
              campaigns={dbState.metaCampaigns}
              onUpdateCampaign={handleUpdateCampaign}
              onDeleteCampaign={handleDeleteCampaign}
              onOpenAddCampaign={() => openQuickActionWithTab('campaign')}
            />
          )}

          {activeModule === 'domains' && (
            <DomainsVaultView
              websites={dbState.websites}
              onUpdateWebsite={handleUpdateWebsite}
              onDeleteWebsite={handleDeleteWebsite}
              onOpenAddWebsite={() => openQuickActionWithTab('website')}
            />
          )}

          {activeModule === 'tickets' && (
            <TicketsView
              tickets={dbState.tickets}
              onUpdateTicket={handleUpdateTicket}
              onDeleteTicket={handleDeleteTicket}
              onOpenAddTicket={() => openQuickActionWithTab('ticket')}
            />
          )}

          {activeModule === 'rnd-lab' && (
            <RnDLabView
              prototypes={dbState.prototypes}
              onUpdatePrototype={handleUpdatePrototype}
              onDeletePrototype={handleDeletePrototype}
              onOpenAddPrototype={() => openQuickActionWithTab('prototype')}
              onNotify={notify}
            />
          )}

          {activeModule === 'finance' && (
            <StudioFinanceView
              expenses={dbState.expenses}
              payments={dbState.payments}
              clients={dbState.clients}
              onAddExpenseModal={() => openQuickActionWithTab('expense')}
              onUpdateExpense={handleUpdateExpense}
              onDeleteExpense={handleDeleteExpense}
              onAddPayment={handleAddPayment}
              onDeletePayment={handleDeletePayment}
            />
          )}

          {activeModule === 'vault' && (
            <EncryptedVaultView
              credentials={dbState.vaultCredentials}
              masterPassphrase={masterPassphrase}
              onChangeMasterPassphrase={setMasterPassphrase}
              onAddCredential={handleAddVaultCredential}
              onDeleteCredential={handleDeleteVaultCredential}
              onNotify={notify}
            />
          )}
        </main>
      </div>

      {/* Editorial Footer */}
      <footer className="border-t border-[#EAECEF] bg-white py-6 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1440px] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <strong className="text-[#0B0F19]">Aethel Studios</strong> — Internal Agency &amp; Growth Operating System · Founded by{' '}
            <strong className="text-[#0B0F19]">Vansh Khakole</strong> (<span className="font-mono">+91 97632 74410</span>) &amp;{' '}
            <strong className="text-[#0B0F19]">Krishna Khakole</strong> (<span className="font-mono">+91 93099 70761</span>)
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono">aethelstudios.in@gmail.com</span>
            <span aria-hidden="true">·</span>
            <span>Pune &amp; Maharashtra, India</span>
          </div>
        </div>
      </footer>

      {/* Universal Quick Action Modal (Ctrl+K) */}
      <QuickActionModal
        isOpen={isQuickActionOpen}
        initialTab={quickActionTab}
        onClose={() => setIsQuickActionOpen(false)}
        masterPassphrase={masterPassphrase}
        onAddClient={handleAddClient}
        onAddExpense={handleAddExpense}
        onAddTicket={handleAddTicket}
        onAddCampaign={handleAddCampaign}
        onAddPrototype={handleAddPrototype}
        onAddWebsite={handleAddWebsite}
        onAddVaultCredential={handleAddVaultCredential}
        onNotify={notify}
      />

      {/* Hybrid Supabase Setup & Backup Modal */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        dbState={dbState}
        syncMode={syncMode}
        onConnectSupabase={refreshDatabase}
        onImportBackupJson={(imported) => {
          setDbState(imported);
          persistDatabaseState(imported);
        }}
        onResetFactorySeed={async () => {
          const fresh = await resetToFactorySeed();
          setDbState(fresh);
          notify('Reset Aethel OS to factory studio seed data.');
        }}
        onNotify={notify}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 px-4 py-3 rounded-full bg-[#0B0F19] text-white text-xs font-semibold shadow-xl border border-white/10"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
