import React, { useState, useEffect } from 'react';
import { X, Zap } from 'lucide-react';
import type {
  ClientLead,
  ClientLocation,
  ClientNiche,
  PipelineStage,
  PlanTier,
  AssignedPerson,
  ExpenseItem,
  ExpenseCategory,
  PaymentAccount,
  DeliveryTicket,
  TicketCategory,
  TicketPriority,
  ScopeBillingTag,
  MetaCampaign,
  CampaignObjective,
  PackageDuration,
  PrototypeItem,
  PrototypeStage,
  TechAsset,
  HostingPlatform,
  DomainRegistrar,
  VaultCredential,
} from '../types';
import { encryptSecret } from '../utils/cryptoService';

export type QuickActionTab =
  | 'client'
  | 'expense'
  | 'ticket'
  | 'campaign'
  | 'prototype'
  | 'website'
  | 'vault';

interface QuickActionModalProps {
  isOpen: boolean;
  initialTab: QuickActionTab;
  onClose: () => void;
  masterPassphrase: string;
  onAddClient: (c: ClientLead) => void;
  onAddExpense: (e: ExpenseItem) => void;
  onAddTicket: (t: DeliveryTicket) => void;
  onAddCampaign: (m: MetaCampaign) => void;
  onAddPrototype: (p: PrototypeItem) => void;
  onAddWebsite: (w: TechAsset) => void;
  onAddVaultCredential: (v: VaultCredential) => void;
  onNotify: (msg: string) => void;
}

export const QuickActionModal: React.FC<QuickActionModalProps> = ({
  isOpen,
  initialTab,
  onClose,
  masterPassphrase,
  onAddClient,
  onAddExpense,
  onAddTicket,
  onAddCampaign,
  onAddPrototype,
  onAddWebsite,
  onAddVaultCredential,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<QuickActionTab>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // 1. Client Lead State
  const [businessName, setBusinessName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('+91 ');
  const [location, setLocation] = useState<ClientLocation>('Pune');
  const [niche, setNiche] = useState<ClientNiche>('Hospital/Clinic');
  const [planSelected, setPlanSelected] = useState<PlanTier>('Custom Website & Brand Experience');
  const [stage, setStage] = useState<PipelineStage>('Query / Lead');
  const [quotedPrice, setQuotedPrice] = useState('25000');
  const [finalAgreedPrice, setFinalAgreedPrice] = useState('25000');
  const [advancePaid, setAdvancePaid] = useState('0');
  const [assignedLead, setAssignedLead] = useState<AssignedPerson>('Krishna');
  const [nextFollowUpDate, setNextFollowUpDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [initialNote, setInitialNote] = useState('');

  // 2. Expense State
  const [expTitle, setExpTitle] = useState('');
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('Studio Expense');
  const [expAmount, setExpAmount] = useState('');
  const [expPaidBy, setExpPaidBy] = useState<PaymentAccount>('Vansh');
  const [expLinkedClient, setExpLinkedClient] = useState('');
  const [expNotes, setExpNotes] = useState('');

  // 3. Ticket State
  const [tktTitle, setTktTitle] = useState('');
  const [tktClient, setTktClient] = useState('The Imperial Pavilion & Lawns');
  const [tktUrl, setTktUrl] = useState('https://imperialpavilionlawns.in');
  const [tktCategory, setTktCategory] = useState<TicketCategory>('Website Bugs / Issues');
  const [tktPriority, setTktPriority] = useState<TicketPriority>('High');
  const [tktBilling, setTktBilling] = useState<ScopeBillingTag>('Included in Plan');
  const [tktAssigned, setTktAssigned] = useState<'Krishna' | 'Vansh'>('Vansh');
  const [tktNotes, setTktNotes] = useState('');

  // 4. Meta Campaign State
  const [camClient, setCamClient] = useState('');
  const [camNiche, setCamNiche] = useState<ClientNiche>('Banquet/Lawns');
  const [camObjective, setCamObjective] = useState<CampaignObjective>('WhatsApp Inquiries');
  const [camPackage, setCamPackage] = useState<PackageDuration>('15 Days');
  const [camBudget, setCamBudget] = useState('12000');
  const [camFee, setCamFee] = useState('4999');
  const [camNotes, setCamNotes] = useState('');

  // 5. R&D Prototype State
  const [protoName, setProtoName] = useState('');
  const [protoStage, setProtoStage] = useState<PrototypeStage>('Working On / In Development');
  const [protoIndustry, setProtoIndustry] = useState('Hospital/Clinic & Diagnostics');
  const [protoHook, setProtoHook] = useState('');
  const [protoUrl, setProtoUrl] = useState('https://demo.aethelstudios.workers.dev');
  const [protoPrompt, setProtoPrompt] = useState('');

  // 6. Website / Domain State
  const [webProject, setWebProject] = useState('');
  const [webClient, setWebClient] = useState('');
  const [webLiveUrl, setWebLiveUrl] = useState('https://');
  const [webStagingUrl, setWebStagingUrl] = useState('https://preview.aethelstudios.workers.dev');
  const [webPlatform, setWebPlatform] = useState<HostingPlatform>('Cloudflare Pages/Workers');
  const [webRegistrar, setWebRegistrar] = useState<DomainRegistrar>('Hostinger');
  const [webRenewalDate, setWebRenewalDate] = useState('2026-12-10');
  const [webRenewalCost, setWebRenewalCost] = useState('1499');
  const [webStack, setWebStack] = useState('React 19 + Tailwind CSS + Supabase');

  // 7. Vault Secret State
  const [vltService, setVltService] = useState('');
  const [vltOwner, setVltOwner] = useState('Aethel Studios Core');
  const [vltUsername, setVltUsername] = useState('aethelstudios.in@gmail.com');
  const [vltSecret, setVltSecret] = useState('');
  const [vltUrl, setVltUrl] = useState('https://');
  const [vltNotes, setVltNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === 'client') {
      if (!businessName.trim() || !contactPerson.trim()) {
        onNotify('Please enter Business Name and Contact Person.');
        return;
      }
      const newClient: ClientLead = {
        id: `cli-${Date.now()}`,
        businessName: businessName.trim(),
        contactPerson: contactPerson.trim(),
        phone: phone.trim() || '+91 98000 00000',
        location,
        niche,
        stage,
        planSelected: planSelected.trim() || 'Custom Website & Brand Experience',
        quotedPrice: Number(quotedPrice) || 20000,
        finalAgreedPrice: Number(finalAgreedPrice) || 20000,
        advancePaid: Number(advancePaid) || 0,
        assignedLead,
        nextFollowUpDate,
        notesLog: [
          {
            id: `n-${Date.now()}`,
            timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
            author: assignedLead === 'Vansh' ? 'Vansh' : 'Krishna',
            text: initialNote.trim() || `Created lead for ${planSelected}.`,
          },
        ],
        createdAt: new Date().toISOString().slice(0, 10),
      };
      onAddClient(newClient);
      setBusinessName('');
      setContactPerson('');
      onClose();
      return;
    }

    if (activeTab === 'expense') {
      const amt = Number(expAmount);
      if (!expTitle.trim() || !amt || amt <= 0) {
        onNotify('Please enter an Expense Title and valid INR Amount.');
        return;
      }
      onAddExpense({
        id: `exp-${Date.now()}`,
        title: expTitle.trim(),
        category: expCategory,
        amount: amt,
        date: new Date().toISOString().slice(0, 10),
        paidBy: expPaidBy,
        linkedClient: expLinkedClient.trim() || undefined,
        notes: expNotes.trim() || 'Logged via Quick Action.',
        reimbursed: expPaidBy === 'Studio Account',
      });
      setExpTitle('');
      setExpAmount('');
      onClose();
      return;
    }

    if (activeTab === 'ticket') {
      if (!tktTitle.trim()) {
        onNotify('Please enter a Ticket Title.');
        return;
      }
      onAddTicket({
        id: `tkt-${Date.now()}`,
        title: tktTitle.trim(),
        clientName: tktClient.trim() || 'Aethel Client',
        websiteUrl: tktUrl.trim(),
        category: tktCategory,
        state: 'Reported / To-Do',
        priority: tktPriority,
        billingTag: tktBilling,
        assignedTo: tktAssigned,
        notes: tktNotes.trim() || 'Reported via Quick Action.',
        createdAt: new Date().toISOString().slice(0, 10),
      });
      setTktTitle('');
      onClose();
      return;
    }

    if (activeTab === 'campaign') {
      if (!camClient.trim()) {
        onNotify('Please enter the Client Name for this Meta Ad campaign.');
        return;
      }
      const start = new Date();
      const daysToAdd =
        camPackage === '7 Days' ? 7 : camPackage === '15 Days' ? 15 : 30;
      const end = new Date(start.getTime() + daysToAdd * 86400000);
      onAddCampaign({
        id: `cam-${Date.now()}`,
        clientName: camClient.trim(),
        niche: camNiche,
        objective: camObjective,
        packageDuration: camPackage,
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
        status: 'Active & Scaling',
        totalAdBudget: Number(camBudget) || 10000,
        adSpendUsed: 1500,
        agencyFee: Number(camFee) || 4999,
        leadsGenerated: 18,
        metaPixelInstalled: true,
        whatsappFlowConnected: true,
        gbpSynced: false,
        audienceNotes:
          camNotes.trim() ||
          'Local 30km radius • Direct WhatsApp click-to-chat ad funnel.',
        assignedLead: 'Krishna',
      });
      setCamClient('');
      onClose();
      return;
    }

    if (activeTab === 'prototype') {
      if (!protoName.trim()) {
        onNotify('Please enter a Prototype / R&D Project Name.');
        return;
      }
      onAddPrototype({
        id: `rnd-${Date.now()}`,
        projectName: protoName.trim(),
        stage: protoStage,
        targetIndustry: protoIndustry.trim() || 'Local Business',
        coreUxHook: protoHook.trim() || 'High-converting interactive pitch experience.',
        devStack: ['Google AI Studio', 'React + Tailwind', 'Supabase'],
        livePrototypeUrl: protoUrl.trim() || 'https://aethelstudios.in',
        masterPromptNotes:
          protoPrompt.trim() || 'Editorial bright-mode UI with instant WhatsApp flow.',
        leadBuilder: 'Vansh',
        updatedAt: new Date().toISOString().slice(0, 10),
      });
      setProtoName('');
      onClose();
      return;
    }

    if (activeTab === 'website') {
      if (!webProject.trim() || !webClient.trim()) {
        onNotify('Please enter Project Name and Client Name.');
        return;
      }
      onAddWebsite({
        id: `web-${Date.now()}`,
        projectName: webProject.trim(),
        clientName: webClient.trim(),
        liveDomainUrl: webLiveUrl.trim() || 'https://aethelstudios.in',
        stagingUrl: webStagingUrl.trim(),
        hostingPlatform: webPlatform,
        deployingEmail: 'aethelstudios.in@gmail.com',
        domainRegistrar: webRegistrar,
        domainOwner: 'Aethel Managed',
        renewalDate: webRenewalDate,
        annualRenewalCost: Number(webRenewalCost) || 1499,
        githubRepoUrl: 'https://github.com/aethelstudios',
        techStack: webStack.trim(),
        healthStatus: 'Live & Healthy',
        assignedLead: 'Vansh',
      });
      setWebProject('');
      onClose();
      return;
    }

    if (activeTab === 'vault') {
      if (!vltService.trim() || !vltSecret.trim()) {
        onNotify('Service Platform and Secret are required.');
        return;
      }
      const keyToUse = masterPassphrase || 'aethel2026';
      const encrypted = await encryptSecret(vltSecret.trim(), keyToUse);
      onAddVaultCredential({
        id: `vlt-${Date.now()}`,
        servicePlatform: vltService.trim(),
        ownerClientTag: vltOwner.trim(),
        usernameEmail: vltUsername.trim(),
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        salt: encrypted.salt,
        url: vltUrl.trim(),
        notes: vltNotes.trim(),
        createdAt: new Date().toISOString().slice(0, 10),
      });
      setVltService('');
      setVltSecret('');
      onClose();
    }
  };

  const TABS: { id: QuickActionTab; label: string }[] = [
    { id: 'client', label: '+ Client Lead' },
    { id: 'expense', label: '+ Expense' },
    { id: 'ticket', label: '+ Bug / Ticket' },
    { id: 'campaign', label: '+ Meta Campaign' },
    { id: 'prototype', label: '+ R&D Prototype' },
    { id: 'website', label: '+ Domain Asset' },
    { id: 'vault', label: '+ Vault Secret' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Universal Quick Action Command Modal"
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white border border-[#EAECEF] rounded-3xl w-full max-w-2xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 border-b border-[#EAECEF] pb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB] flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              <span>UNIVERSAL COMMAND BAR (CTRL+K)</span>
            </span>
            <h2 className="text-xl font-bold text-[#0B0F19] mt-0.5">
              Rapid Studio Action &amp; Record Creator
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Quick Action Modal"
            className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Switcher Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === t.id
                  ? 'bg-[#0B0F19] text-white'
                  : 'bg-[#F8F9FA] text-slate-600 hover:text-[#0B0F19]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Dynamic Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {activeTab === 'client' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g., Royal Heritage Lawns"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Contact Person *
                </label>
                <input
                  type="text"
                  required
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="e.g., Siddharth Patil"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Phone (+91)
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Location
                </label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value as ClientLocation)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA]"
                >
                  <option value="Pune">Pune</option>
                  <option value="Risod">Risod</option>
                  <option value="Washim">Washim</option>
                  <option value="Maharashtra / Remote">Maharashtra / Remote</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Business Niche
                </label>
                <select
                  value={niche}
                  onChange={(e) => setNiche(e.target.value as ClientNiche)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA]"
                >
                  <option value="Hospital/Clinic">Hospital/Clinic</option>
                  <option value="Banquet/Lawns">Banquet/Lawns</option>
                  <option value="Stay Hotel">Stay Hotel</option>
                  <option value="Retail/Electronics">Retail/Electronics</option>
                  <option value="Restaurant/Cafe">Restaurant/Cafe</option>
                  <option value="Coaching/Institute">Coaching/Institute</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Custom Requirement / Project Scope
                </label>
                <input
                  type="text"
                  value={planSelected}
                  onChange={(e) => setPlanSelected(e.target.value)}
                  placeholder="e.g., 3D Venue Website + Booking Flow"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Final Agreed Price (₹)
                </label>
                <input
                  type="number"
                  value={finalAgreedPrice}
                  onChange={(e) => {
                    setFinalAgreedPrice(e.target.value);
                    setQuotedPrice(e.target.value);
                  }}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Advance Paid (₹)
                </label>
                <input
                  type="number"
                  value={advancePaid}
                  onChange={(e) => setAdvancePaid(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Pipeline Stage
                </label>
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value as PipelineStage)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA]"
                >
                  <option value="Query / Lead">Query / Lead</option>
                  <option value="In Talks / Demo Shown">In Talks / Demo Shown</option>
                  <option value="Follow-up Scheduled">Follow-up Scheduled</option>
                  <option value="In Building">In Building</option>
                  <option value="Live / Payment Pending">Live / Payment Pending</option>
                  <option value="Delivered / Live">Delivered / Live</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Assigned Co-Founder
                </label>
                <select
                  value={assignedLead}
                  onChange={(e) => setAssignedLead(e.target.value as AssignedPerson)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA]"
                >
                  <option value="Krishna">Krishna</option>
                  <option value="Vansh">Vansh</option>
                  <option value="Both">Both</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-600 mb-1">
                  Initial Call / Pitch Note
                </label>
                <input
                  type="text"
                  value={initialNote}
                  onChange={(e) => setInitialNote(e.target.value)}
                  placeholder="Summary of requirements or next follow-up context..."
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA]"
                />
              </div>
            </div>
          )}

          {activeTab === 'expense' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-600 mb-1">
                  Expense Title / Description *
                </label>
                <input
                  type="text"
                  required
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  placeholder="e.g., Irani Chai & Snacks during Sprint / Cloudflare Renewal"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Expense Category
                </label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value as ExpenseCategory)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA]"
                >
                  <option value="Studio Expense">Studio Expense</option>
                  <option value="Tech Expense">Tech Expense</option>
                  <option value="Food & Chai Expense">Food &amp; Chai Expense</option>
                  <option value="Client-Billable Expense">Client-Billable Expense</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Amount (₹ INR) *
                </label>
                <input
                  type="number"
                  required
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  placeholder="e.g., 650"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Paid By (For Co-Founder Split)
                </label>
                <select
                  value={expPaidBy}
                  onChange={(e) => setExpPaidBy(e.target.value as PaymentAccount)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA]"
                >
                  <option value="Krishna">Krishna (Personal Out-of-Pocket)</option>
                  <option value="Vansh">Vansh (Personal Out-of-Pocket)</option>
                  <option value="Studio Account">Studio Account</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Linked Client (Optional)
                </label>
                <input
                  type="text"
                  value={expLinkedClient}
                  onChange={(e) => setExpLinkedClient(e.target.value)}
                  placeholder="If Client-Billable"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA]"
                />
              </div>
            </div>
          )}

          {activeTab === 'ticket' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-600 mb-1">
                  Bug / Change Request Title *
                </label>
                <input
                  type="text"
                  required
                  value={tktTitle}
                  onChange={(e) => setTktTitle(e.target.value)}
                  placeholder="e.g., Add WhatsApp floating CTA on mobile gallery page"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Client / Project Name
                </label>
                <input
                  type="text"
                  value={tktClient}
                  onChange={(e) => setTktClient(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Ticket Category
                </label>
                <select
                  value={tktCategory}
                  onChange={(e) => setTktCategory(e.target.value as TicketCategory)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA]"
                >
                  <option value="Website Bugs / Issues">Website Bugs / Issues</option>
                  <option value="Client Change Requests">Client Change Requests</option>
                  <option value="Core Delivery Milestones">Core Delivery Milestones</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Priority
                </label>
                <select
                  value={tktPriority}
                  onChange={(e) => setTktPriority(e.target.value as TicketPriority)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA]"
                >
                  <option value="Critical - Site Down">Critical - Site Down</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Scope Billing Tag
                </label>
                <select
                  value={tktBilling}
                  onChange={(e) => setTktBilling(e.target.value as ScopeBillingTag)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA]"
                >
                  <option value="Included in Plan">Included in Plan</option>
                  <option value="Free Goodwill">Free Goodwill</option>
                  <option value="Billable Extra ₹">Billable Extra ₹</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Assigned To
                </label>
                <select
                  value={tktAssigned}
                  onChange={(e) => setTktAssigned(e.target.value as 'Krishna' | 'Vansh')}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA]"
                >
                  <option value="Vansh">Vansh</option>
                  <option value="Krishna">Krishna</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Detailed Notes
                </label>
                <input
                  type="text"
                  value={tktNotes}
                  onChange={(e) => setTktNotes(e.target.value)}
                  placeholder="Steps to reproduce or WhatsApp voice note summary..."
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA]"
                />
              </div>
            </div>
          )}

          {activeTab === 'campaign' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Linked Client Name *
                </label>
                <input
                  type="text"
                  required
                  value={camClient}
                  onChange={(e) => setCamClient(e.target.value)}
                  placeholder="e.g., Sanjeevani Multispeciality Hospital"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Campaign Objective
                </label>
                <select
                  value={camObjective}
                  onChange={(e) => setCamObjective(e.target.value as CampaignObjective)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA]"
                >
                  <option value="WhatsApp Inquiries">WhatsApp Inquiries</option>
                  <option value="Lead Generation Form">Lead Generation Form</option>
                  <option value="Local Store Visits / Reach">Local Store Visits / Reach</option>
                  <option value="Instagram Profile Visits">Instagram Profile Visits</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Package Duration
                </label>
                <select
                  value={camPackage}
                  onChange={(e) => setCamPackage(e.target.value as PackageDuration)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA]"
                >
                  <option value="7 Days">7 Days</option>
                  <option value="15 Days">15 Days</option>
                  <option value="30 Days">30 Days</option>
                  <option value="Monthly Retainer">Monthly Retainer</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Total Ad Budget (₹)
                </label>
                <input
                  type="number"
                  value={camBudget}
                  onChange={(e) => setCamBudget(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Agency Management Fee (₹)
                </label>
                <input
                  type="number"
                  value={camFee}
                  onChange={(e) => setCamFee(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Audience &amp; Hook Notes
                </label>
                <input
                  type="text"
                  value={camNotes}
                  onChange={(e) => setCamNotes(e.target.value)}
                  placeholder="City radius, age group, reel hook..."
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA]"
                />
              </div>
            </div>
          )}

          {activeTab === 'prototype' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Prototype / Project Name *
                </label>
                <input
                  type="text"
                  required
                  value={protoName}
                  onChange={(e) => setProtoName(e.target.value)}
                  placeholder="e.g., Smart Coaching Institute Fee & Rank Portal"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  R&amp;D Stage
                </label>
                <select
                  value={protoStage}
                  onChange={(e) => setProtoStage(e.target.value as PrototypeStage)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA]"
                >
                  <option value="Raw Idea">Raw Idea</option>
                  <option value="Working On / In Development">Working On / In Development</option>
                  <option value="Interactive Prototype">Interactive Prototype</option>
                  <option value="Finished Product / Reusable System">
                    Finished Product / Reusable System
                  </option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Target Industry
                </label>
                <input
                  type="text"
                  value={protoIndustry}
                  onChange={(e) => setProtoIndustry(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Live Prototype URL
                </label>
                <input
                  type="text"
                  value={protoUrl}
                  onChange={(e) => setProtoUrl(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-600 mb-1">
                  Core UX Hook
                </label>
                <input
                  type="text"
                  value={protoHook}
                  onChange={(e) => setProtoHook(e.target.value)}
                  placeholder="What makes business owners say yes in 30 seconds?"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-600 mb-1">
                  Saved Master Prompt / Architecture Notes
                </label>
                <textarea
                  rows={2}
                  value={protoPrompt}
                  onChange={(e) => setProtoPrompt(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] font-mono"
                />
              </div>
            </div>
          )}

          {activeTab === 'website' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  value={webProject}
                  onChange={(e) => setWebProject(e.target.value)}
                  placeholder="e.g., Sanjeevani Hospital Portal"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Client Name *
                </label>
                <input
                  type="text"
                  required
                  value={webClient}
                  onChange={(e) => setWebClient(e.target.value)}
                  placeholder="e.g., Sanjeevani Multispeciality Hospital"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Live Domain URL
                </label>
                <input
                  type="text"
                  value={webLiveUrl}
                  onChange={(e) => setWebLiveUrl(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Staging / Worker URL
                </label>
                <input
                  type="text"
                  value={webStagingUrl}
                  onChange={(e) => setWebStagingUrl(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Hosting Platform
                </label>
                <select
                  value={webPlatform}
                  onChange={(e) => setWebPlatform(e.target.value as HostingPlatform)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA]"
                >
                  <option value="Cloudflare Pages/Workers">Cloudflare Pages/Workers</option>
                  <option value="Vercel">Vercel</option>
                  <option value="Netlify">Netlify</option>
                  <option value="Firebase">Firebase</option>
                  <option value="Hostinger">Hostinger</option>
                  <option value="Supabase">Supabase</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Domain Renewal Date
                </label>
                <input
                  type="date"
                  value={webRenewalDate}
                  onChange={(e) => setWebRenewalDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] font-mono"
                />
              </div>
            </div>
          )}

          {activeTab === 'vault' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Service / Platform *
                </label>
                <input
                  type="text"
                  required
                  value={vltService}
                  onChange={(e) => setVltService(e.target.value)}
                  placeholder="e.g., Cloudflare DNS API Token"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Client / Owner Tag
                </label>
                <input
                  type="text"
                  value={vltOwner}
                  onChange={(e) => setVltOwner(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Username / Email
                </label>
                <input
                  type="text"
                  value={vltUsername}
                  onChange={(e) => setVltUsername(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] bg-[#F8F9FA] font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#2563EB] mb-1">
                  Plain Password / API Key *
                </label>
                <input
                  type="text"
                  required
                  value={vltSecret}
                  onChange={(e) => setVltSecret(e.target.value)}
                  placeholder="Encrypted via AES-GCM 256-bit"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#2563EB] bg-[#F8F9FA] font-mono"
                />
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-[#EAECEF] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-[#EAECEF] text-xs font-semibold text-slate-600 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-full bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Save &amp; Sync Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
