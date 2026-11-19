import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Wallet,
  Wrench,
  Megaphone,
  Globe,
  CheckCircle2,
  Search,
  CheckSquare,
  ArrowRight,
  Sparkles,
  MessageSquare,
  Command,
  CreditCard,
  Brain,
} from 'lucide-react';
import {
  AethelDatabaseState,
  BrainDailyLogEntry,
  BrainDumpCategory,
  BrainDumpNote,
  ClientLead,
  StudioExpense,
  ClientPayment,
  ClientTicket,
  MetaAdCampaign,
  HostedWebsite,
  FounderName,
  ExpensePaidBy,
  StudioTask,
} from '../types';
import { autoSuggestBrainCategoryAndTags } from '../utils/calculations';

interface QuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  dbState: AethelDatabaseState;
  activeClientContext?: ClientLead | null;
  onAddLead: (lead: ClientLead) => void;
  onAddExpense: (expense: StudioExpense) => void;
  onAddPayment: (payment: ClientPayment) => void;
  onAddTicket: (ticket: ClientTicket) => void;
  onAddCampaign: (campaign: MetaAdCampaign) => void;
  onAddWebsite: (website: HostedWebsite) => void;
  onAddTask?: (task: StudioTask) => void;
  onAddBrainDump?: (note: BrainDumpNote) => void;
  onAddDailyLog?: (entry: BrainDailyLogEntry) => void;
  onOpenClient360?: (clientId: string) => void;
}

type ActionTab =
  | 'palette'
  | 'brain'
  | 'lead'
  | 'payment'
  | 'expense'
  | 'ticket'
  | 'task'
  | 'campaign'
  | 'domain';

export const QuickActionModal: React.FC<QuickActionModalProps> = ({
  isOpen,
  onClose,
  dbState,
  activeClientContext,
  onAddLead,
  onAddExpense,
  onAddPayment,
  onAddTicket,
  onAddCampaign,
  onAddWebsite,
  onAddTask,
  onAddBrainDump,
  onAddDailyLog,
  onOpenClient360,
}) => {
  const [activeTab, setActiveTab] = useState<ActionTab>('palette');
  const [commandQuery, setCommandQuery] = useState('');

  // Pre-fill client name if a Client 360 profile is currently open
  const defaultClientName = activeClientContext?.businessName || '';

  // Lead Form State
  const [businessName, setBusinessName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('+91 ');
  const [city, setCity] = useState('Pune');
  const [niche, setNiche] = useState<ClientLead['niche']>('Banquet/Lawns');
  const [packageTier, setPackageTier] = useState('Custom Website + Lead Funnel');
  const [quotedPrice, setQuotedPrice] = useState(25000);
  const [finalAgreedPrice, setFinalAgreedPrice] = useState(22000);
  const [assignedTo, setAssignedTo] = useState<FounderName>('Vansh');
  const [sampleLinkSent, setSampleLinkSent] = useState('');
  const [leadNotes, setLeadNotes] = useState('');

  // Payment Form State
  const [payClientName, setPayClientName] = useState(defaultClientName);
  const [payProjectTitle, setPayProjectTitle] = useState('');
  const [payTotalValue, setPayTotalValue] = useState(22000);
  const [payAmountReceived, setPayAmountReceived] = useState(11000);
  const [payMode, setPayMode] = useState<ClientPayment['paymentMode']>('UPI');
  const [payAccount, setPayAccount] = useState<ExpensePaidBy>('Studio Account');
  const [payMilestone, setPayMilestone] = useState<ClientPayment['milestone']>('Advance (50%)');

  // Expense Form State
  const [expTitle, setExpTitle] = useState('');
  const [expCategory, setExpCategory] = useState<StudioExpense['category']>('Domain & Hosting');
  const [expAmount, setExpAmount] = useState(1499);
  const [expPaidBy, setExpPaidBy] = useState<ExpensePaidBy>('Vansh');
  const [expClient, setExpClient] = useState(defaultClientName);
  const [expNotes, setExpNotes] = useState('');

  // Ticket Form State
  const [tktClientName, setTktClientName] = useState(defaultClientName);
  const [tktDomain, setTktDomain] = useState('');
  const [tktTitle, setTktTitle] = useState('');
  const [tktCategory, setTktCategory] = useState<ClientTicket['category']>('Copy/Image Update');
  const [tktPriority, setTktPriority] = useState<ClientTicket['priority']>('High');
  const [tktAssigned, setTktAssigned] = useState<FounderName>('Vansh');
  const [tktDesc, setTktDesc] = useState('');

  // Task / Follow-up Form State
  const [taskClientName, setTaskClientName] = useState(defaultClientName);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskType, setTaskType] = useState<StudioTask['type']>('Follow-up');
  const [taskPriority, setTaskPriority] = useState<StudioTask['priority']>('High');
  const [taskAssigned, setTaskAssigned] = useState<FounderName>('Krishna');
  const [taskDueDate, setTaskDueDate] = useState(
    new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  );
  const [taskNotes, setTaskNotes] = useState('');

  // Meta Campaign State
  const [metaClient, setMetaClient] = useState(defaultClientName);
  const [metaName, setMetaName] = useState('');
  const [metaObjective, setMetaObjective] = useState<MetaAdCampaign['objective']>('WhatsApp Messages');
  const [metaBudget, setMetaBudget] = useState(10000);
  const [metaFee, setMetaFee] = useState(4000);

  // Domain State
  const [domClient, setDomClient] = useState(defaultClientName);
  const [domName, setDomName] = useState('');
  const [domRegistrar, setDomRegistrar] = useState<HostedWebsite['registrar']>('Hostinger');
  const [domPlatform, setDomPlatform] = useState<HostedWebsite['hostingPlatform']>('Vercel');
  const [domCost, setDomCost] = useState(1499);

  // Quick Brain Note / Daily Log State
  const [brainMode, setBrainMode] = useState<'daily-log' | 'brain-dump'>('daily-log');
  const [brainAuthor, setBrainAuthor] = useState<'Krishna' | 'Vansh'>('Krishna');
  const [brainTitle, setBrainTitle] = useState('');
  const [brainContent, setBrainContent] = useState('');
  const [brainCategory, setBrainCategory] = useState<BrainDumpCategory>('Ideas');
  const [brainClient, setBrainClient] = useState(defaultClientName);

  useEffect(() => {
    if (isOpen) {
      setActiveTab('palette');
      setCommandQuery('');
      if (activeClientContext) {
        setPayClientName(activeClientContext.businessName);
        setPayProjectTitle(activeClientContext.packageTier);
        setPayTotalValue(activeClientContext.finalAgreedPrice);
        setPayAmountReceived(
          Math.max(0, activeClientContext.finalAgreedPrice - activeClientContext.advancePaid) || 5000
        );
        setTktClientName(activeClientContext.businessName);
        setTaskClientName(activeClientContext.businessName);
        setMetaClient(activeClientContext.businessName);
        setDomClient(activeClientContext.businessName);
        setExpClient(activeClientContext.businessName);
      }
    }
  }, [isOpen, activeClientContext]);

  if (!isOpen) return null;

  const today = new Date().toISOString().slice(0, 10);

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) return;
    onAddLead({
      id: `cli-${Date.now()}`,
      businessName: businessName.trim(),
      contactPerson: contactPerson.trim() || 'Owner',
      phone: phone.trim(),
      city: city.trim(),
      niche,
      packageTier,
      quotedPrice: Number(quotedPrice),
      finalAgreedPrice: Number(finalAgreedPrice),
      advancePaid: 0,
      stage: 'Cold Lead',
      assignedTo,
      sampleLinkSent: sampleLinkSent.trim(),
      followUpDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
      notes: leadNotes.trim(),
      createdAt: today,
    });
    onClose();
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payClientName.trim()) return;
    onAddPayment({
      id: `pay-${Date.now()}`,
      clientId: activeClientContext?.id,
      clientName: payClientName.trim(),
      projectTitle: payProjectTitle.trim() || 'Website & Growth Package',
      totalProjectValue: Number(payTotalValue),
      amountReceived: Number(payAmountReceived),
      paymentDate: today,
      paymentMode: payMode,
      receivedInAccount: payAccount,
      milestone: payMilestone,
    });
    onClose();
  };

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expTitle.trim()) return;
    onAddExpense({
      id: `exp-${Date.now()}`,
      title: expTitle.trim(),
      category: expCategory,
      amount: Number(expAmount),
      paidBy: expPaidBy,
      date: today,
      clientRelated: expClient.trim() || 'Studio Core',
      reimbursed: expPaidBy === 'Studio Account',
      notes: expNotes.trim(),
    });
    onClose();
  };

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tktTitle.trim()) return;
    onAddTicket({
      id: `tkt-${Date.now()}`,
      clientId: activeClientContext?.id,
      clientName: tktClientName.trim() || 'Studio Client',
      domainName: tktDomain.trim() || 'client-site.in',
      title: tktTitle.trim(),
      category: tktCategory,
      priority: tktPriority,
      status: 'Open',
      assignedTo: tktAssigned,
      dueDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
      description: tktDesc.trim(),
      createdAt: today,
    });
    onClose();
  };

  const handleTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !onAddTask) return;
    onAddTask({
      id: `tsk-${Date.now()}`,
      clientId: activeClientContext?.id,
      clientName: taskClientName.trim() || 'Aethel Studio',
      title: taskTitle.trim(),
      type: taskType,
      priority: taskPriority,
      status: 'Pending',
      assignedTo: taskAssigned,
      dueDate: taskDueDate,
      notes: taskNotes.trim(),
      createdAt: today,
    });
    onClose();
  };

  const handleCampaignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!metaClient.trim() || !metaName.trim()) return;
    onAddCampaign({
      id: `meta-${Date.now()}`,
      clientId: activeClientContext?.id,
      clientName: metaClient.trim(),
      campaignName: metaName.trim(),
      objective: metaObjective,
      status: 'Active',
      totalBudget: Number(metaBudget),
      amountSpent: 0,
      agencyFee: Number(metaFee),
      leadsGenerated: 0,
      startDate: today,
      endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      notes: 'Campaign initialized via Aethel OS Command Palette.',
    });
    onClose();
  };

  const handleDomainSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!domName.trim()) return;
    const cleanDom = domName.trim().replace(/^https?:\/\//, '');
    onAddWebsite({
      id: `web-${Date.now()}`,
      clientId: activeClientContext?.id,
      clientName: domClient.trim() || 'Studio Client',
      domainName: cleanDom,
      liveUrl: `https://${cleanDom}`,
      registrar: domRegistrar,
      hostingPlatform: domPlatform,
      purchaseDate: today,
      expiryDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
      renewalCostINR: Number(domCost),
      sslStatus: 'Active',
      siteStatus: 'Online',
      githubRepo: `aethel-studios/${cleanDom.split('.')[0]}`,
      notes: 'Added via Command Palette.',
    });
    onClose();
  };

  const handleBrainSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brainContent.trim() && !brainTitle.trim()) return;
    const matchedClient = dbState.clients.find(
      (c) => c.businessName.toLowerCase() === brainClient.trim().toLowerCase()
    );

    if (brainMode === 'daily-log' && onAddDailyLog) {
      const text = brainContent.trim() || brainTitle.trim();
      const mentions: ('Krishna' | 'Vansh')[] = [];
      if (text.toLowerCase().includes('@krishna')) mentions.push('Krishna');
      if (text.toLowerCase().includes('@vansh')) mentions.push('Vansh');
      onAddDailyLog({
        id: `blog-${Date.now()}`,
        author: brainAuthor,
        content: text,
        date: today,
        time: new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
        linkedClientId: matchedClient?.id,
        linkedClientName: matchedClient?.businessName || (brainClient.trim() || undefined),
        mentions,
        reactions: [],
      });
    } else if (onAddBrainDump) {
      const suggestion = autoSuggestBrainCategoryAndTags(`${brainTitle} ${brainContent}`);
      onAddBrainDump({
        id: `bdump-${Date.now()}`,
        title: brainTitle.trim() || brainContent.trim().slice(0, 60),
        description: brainContent.trim() || brainTitle.trim(),
        author: brainAuthor,
        date: today,
        category: brainCategory || suggestion.category,
        priority: suggestion.priority,
        linkedClientId: matchedClient?.id,
        linkedClientName: matchedClient?.businessName || (brainClient.trim() || undefined),
        status: 'Unsorted',
        tags: suggestion.tags,
      });
    }
    onClose();
  };

  const commandItems = [
    {
      id: 'cmd-brain',
      title: 'Quick Capture to Aethel Brain (Daily Log or Brain Dump)',
      subtitle: 'Record what you did today, dump an idea, or leave a note for Krishna / Vansh',
      category: 'AETHEL BRAIN',
      icon: Brain,
      action: () => setActiveTab('brain'),
    },
    {
      id: 'cmd-lead',
      title: 'Create a new Client / Sales Lead',
      subtitle: 'Add a prospect to CRM & Pipeline with custom scope & pricing',
      category: 'CLIENT OPERATIONS',
      icon: Users,
      action: () => setActiveTab('lead'),
    },
    {
      id: 'cmd-payment',
      title: activeClientContext
        ? `Record Payment for ${activeClientContext.businessName}`
        : 'Record Client Payment Inflow',
      subtitle: 'Logs verified payment in Finance Ledger & syncs CRM Paid balance automatically',
      category: 'FINANCE & LEDGER',
      icon: CreditCard,
      action: () => setActiveTab('payment'),
    },
    {
      id: 'cmd-task',
      title: activeClientContext
        ? `Schedule Task / Follow-up for ${activeClientContext.businessName}`
        : 'Schedule a Task or Client Follow-up',
      subtitle: 'Assign a high-priority call, demo, or payment follow-up to Krishna or Vansh',
      category: 'CLIENT OPERATIONS',
      icon: CheckSquare,
      action: () => setActiveTab('task'),
    },
    {
      id: 'cmd-ticket',
      title: activeClientContext
        ? `Create Revision / Bug Ticket for ${activeClientContext.businessName}`
        : 'Create Delivery Revision or Bug Ticket',
      subtitle: 'Track client website updates, Meta Pixel installation, or SSL fixes',
      category: 'PROJECTS & DELIVERIES',
      icon: Wrench,
      action: () => setActiveTab('ticket'),
    },
    {
      id: 'cmd-expense',
      title: 'Record Studio Operational Expense',
      subtitle: 'Log hosting, SaaS, or travel spend & track 50/50 founder reimbursement',
      category: 'FINANCE & LEDGER',
      icon: Wallet,
      action: () => setActiveTab('expense'),
    },
    {
      id: 'cmd-campaign',
      title: activeClientContext
        ? `Launch Meta Ad Campaign for ${activeClientContext.businessName}`
        : 'Launch Meta Ad Campaign',
      subtitle: 'Track client ad budget, CPL, leads generated, and agency retainer fee',
      category: 'GROWTH',
      icon: Megaphone,
      action: () => setActiveTab('campaign'),
    },
    {
      id: 'cmd-domain',
      title: activeClientContext
        ? `Register Domain / Website for ${activeClientContext.businessName}`
        : 'Register Client Domain & Hosting',
      subtitle: 'Monitor domain expiry countdown, SSL status, and Vercel/Hostinger deployment',
      category: 'INFRASTRUCTURE',
      icon: Globe,
      action: () => setActiveTab('domain'),
    },
  ];

  const filteredCommands = commandItems.filter(
    (c) =>
      c.title.toLowerCase().includes(commandQuery.toLowerCase()) ||
      c.subtitle.toLowerCase().includes(commandQuery.toLowerCase()) ||
      c.category.toLowerCase().includes(commandQuery.toLowerCase())
  );

  const matchingClients =
    commandQuery.trim().length > 0
      ? dbState.clients
          .filter(
            (c) =>
              c.businessName.toLowerCase().includes(commandQuery.toLowerCase()) ||
              c.contactPerson.toLowerCase().includes(commandQuery.toLowerCase())
          )
          .slice(0, 4)
      : [];

  return (
    <div className="fixed inset-0 z-50 bg-[#0B0F19]/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-[#EAECEF] shadow-2xl max-w-2xl w-full overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Top Command Header */}
        <div className="bg-[#0B0F19] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#2563EB] flex items-center justify-center shrink-0">
              <Command className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#60A5FA] font-semibold">
                  AETHEL COMMAND PALETTE (CTRL+K)
                </span>
                {activeClientContext && (
                  <span className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-bold text-emerald-300 truncate">
                    Context: {activeClientContext.businessName}
                  </span>
                )}
              </div>
              <h2 className="text-base font-bold tracking-tight truncate">
                {activeTab === 'palette'
                  ? 'What would you like to do?'
                  : activeTab === 'lead'
                  ? 'Create New Client / Sales Lead'
                  : activeTab === 'payment'
                  ? 'Record Verified Client Payment'
                  : activeTab === 'task'
                  ? 'Schedule Task or Follow-up'
                  : activeTab === 'ticket'
                  ? 'Create Revision / Delivery Ticket'
                  : activeTab === 'expense'
                  ? 'Record Studio Operational Expense'
                  : activeTab === 'campaign'
                  ? 'Launch Client Meta Ad Campaign'
                  : 'Register Client Domain & Hosting'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Command Palette"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Pills to switch between Command Search & Direct Forms */}
        <div className="px-4 py-2.5 bg-[#F8F9FA] border-b border-[#EAECEF] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'palette', label: '⌘ Search Commands', icon: Search },
            { id: 'brain', label: '+ Brain Note', icon: Brain },
            { id: 'lead', label: '+ Client Lead', icon: Users },
            { id: 'payment', label: '+ Payment', icon: CreditCard },
            { id: 'task', label: '+ Task', icon: CheckSquare },
            { id: 'ticket', label: '+ Revision', icon: Wrench },
            { id: 'expense', label: '+ Expense', icon: Wallet },
            { id: 'campaign', label: '+ Meta Ad', icon: Megaphone },
            { id: 'domain', label: '+ Domain', icon: Globe },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ActionTab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                  active
                    ? 'bg-[#2563EB] text-white shadow-xs'
                    : 'bg-white text-[#475569] hover:text-[#0B0F19] border border-[#EAECEF]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* BODY: Either Raycast/Linear Command Search OR Selected Action Form */}
        {activeTab === 'palette' ? (
          <div className="p-4 sm:p-5 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={commandQuery}
                onChange={(e) => setCommandQuery(e.target.value)}
                placeholder="Type a command or client name (e.g. 'Record payment', 'Create client', 'Lawns')..."
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF] focus:bg-white focus:border-[#2563EB] text-sm text-[#0B0F19] placeholder-[#94A3B8] focus:outline-none transition-all"
              />
            </div>

            {/* Context-Aware Quick Strip when a Client 360° Profile is active */}
            {activeClientContext && (
              <div className="p-3.5 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB] flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Active Client Context: {activeClientContext.businessName}
                  </span>
                  <span className="text-[11px] font-mono text-[#1E40AF]">
                    Stage: {activeClientContext.stage}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setActiveTab('payment')}
                    className="px-3 py-1.5 rounded-xl bg-[#2563EB] text-white text-xs font-bold hover:bg-[#1D4ED8] transition-colors cursor-pointer"
                  >
                    + Record Payment for {activeClientContext.businessName}
                  </button>
                  <button
                    onClick={() => setActiveTab('task')}
                    className="px-3 py-1.5 rounded-xl bg-white text-[#0B0F19] border border-[#BFDBFE] text-xs font-semibold hover:bg-[#F8F9FA] transition-colors cursor-pointer"
                  >
                    + Add Follow-up Task
                  </button>
                  <button
                    onClick={() => setActiveTab('ticket')}
                    className="px-3 py-1.5 rounded-xl bg-white text-[#0B0F19] border border-[#BFDBFE] text-xs font-semibold hover:bg-[#F8F9FA] transition-colors cursor-pointer"
                  >
                    + Log Revision Request
                  </button>
                  <a
                    href={`https://wa.me/${activeClientContext.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-[#059669] text-white text-xs font-bold flex items-center gap-1 hover:bg-[#047857] transition-colors"
                  >
                    <MessageSquare className="w-3 h-3" /> WhatsApp Client
                  </a>
                </div>
              </div>
            )}

            {/* Matching Client 360 Jump Results */}
            {matchingClients.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] px-1">
                  Open Client 360° Dossier
                </div>
                {matchingClients.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      if (onOpenClient360) onOpenClient360(c.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-2xl border border-[#EAECEF] hover:border-[#2563EB] hover:bg-[#F8F9FA] transition-all text-left cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-bold text-[#0B0F19]">{c.businessName}</div>
                      <div className="text-[11px] text-[#64748B]">
                        {c.contactPerson} · {c.city} · {c.stage}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#2563EB] flex items-center gap-1">
                      Open 360° <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Command List */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] px-1">
                Studio Operations & Quick Actions
              </div>
              {filteredCommands.map((cmd) => {
                const Icon = cmd.icon;
                return (
                  <button
                    key={cmd.id}
                    onClick={cmd.action}
                    className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-[#F8F9FA] border border-transparent hover:border-[#EAECEF] transition-all text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#F1F5F9] group-hover:bg-[#EFF6FF] text-[#475569] group-hover:text-[#2563EB] flex items-center justify-center shrink-0 transition-colors">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#0B0F19] group-hover:text-[#2563EB] truncate">
                          {cmd.title}
                        </div>
                        <div className="text-[11px] text-[#64748B] truncate">{cmd.subtitle}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#94A3B8] group-hover:text-[#2563EB] shrink-0 ml-2 flex items-center gap-1">
                      {cmd.category} <ArrowRight className="w-3 h-3" />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-5 sm:p-6">
            {activeTab === 'lead' && (
              <form onSubmit={handleLeadSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                      Business / Client Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g., Samruddhi Royal Lawns"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                      Decision Maker Name
                    </label>
                    <input
                      type="text"
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      placeholder="e.g., Suresh Patil"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                      WhatsApp Phone
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98230 00000"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm font-mono focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                      City / Area (Maharashtra)
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Pune (Wakad / Baner)"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                      Industry Niche
                    </label>
                    <select
                      value={niche}
                      onChange={(e) => setNiche(e.target.value as ClientLead['niche'])}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm bg-white focus:outline-none focus:border-[#2563EB]"
                    >
                      <option value="Banquet/Lawns">Banquet/Lawns</option>
                      <option value="Clinic/Hospital">Clinic/Hospital</option>
                      <option value="Cafe/Restaurant">Cafe/Restaurant</option>
                      <option value="Retail/Electronics">Retail/Electronics</option>
                      <option value="Real Estate/Interior">Real Estate/Interior</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                      Custom Scope / Deliverables
                    </label>
                    <input
                      type="text"
                      value={packageTier}
                      onChange={(e) => setPackageTier(e.target.value)}
                      placeholder="e.g., Custom Website + Booking Flow + Meta Ads"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm bg-white focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                      Initial Quoted Price (₹)
                    </label>
                    <input
                      type="number"
                      value={quotedPrice}
                      onChange={(e) => setQuotedPrice(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm font-mono focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                      Final Agreed Price (₹)
                    </label>
                    <input
                      type="number"
                      value={finalAgreedPrice}
                      onChange={(e) => setFinalAgreedPrice(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm font-mono focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                      Sample Prototype URL
                    </label>
                    <input
                      type="text"
                      value={sampleLinkSent}
                      onChange={(e) => setSampleLinkSent(e.target.value)}
                      placeholder="https://demo-site.vercel.app"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                      Lead Owner
                    </label>
                    <select
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value as FounderName)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm bg-white focus:outline-none focus:border-[#2563EB]"
                    >
                      <option value="Vansh">Vansh Khakole</option>
                      <option value="Krishna">Krishna Khakole</option>
                      <option value="Both">Both Founders</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                    Pitch Notes
                  </label>
                  <input
                    type="text"
                    value={leadNotes}
                    onChange={(e) => setLeadNotes(e.target.value)}
                    placeholder="Specific client requirement or demo feedback..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('palette')}
                    className="px-4 py-2.5 rounded-full text-xs font-semibold text-[#64748B] hover:bg-[#F1F5F9]"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-6 py-2.5 rounded-full text-xs font-bold bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Save Lead to Pipeline
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'payment' && (
              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                      Client Name *
                    </label>
                    <input
                      type="text"
                      required
                      list="quick-action-client-list"
                      value={payClientName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPayClientName(val);
                        const match = dbState.clients.find(
                          (c) => c.businessName.toLowerCase() === val.trim().toLowerCase()
                        );
                        if (match) {
                          setPayTotalValue(match.finalAgreedPrice);
                          if (!payProjectTitle) setPayProjectTitle(match.packageTier);
                        }
                      }}
                      placeholder="Select or type client name..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm focus:outline-none focus:border-[#2563EB]"
                    />
                    <datalist id="quick-action-client-list">
                      {dbState.clients.map((c) => (
                        <option key={c.id} value={c.businessName} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                      Project / Retainer Description
                    </label>
                    <input
                      type="text"
                      value={payProjectTitle}
                      onChange={(e) => setPayProjectTitle(e.target.value)}
                      placeholder="e.g., 50% Advance — Custom Web Build"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                      Amount Received Now (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      value={payAmountReceived}
                      onChange={(e) => setPayAmountReceived(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm font-mono font-bold text-[#059669] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                      Total Project Value (₹)
                    </label>
                    <input
                      type="number"
                      value={payTotalValue}
                      onChange={(e) => setPayTotalValue(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm font-mono focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                      Received In Account
                    </label>
                    <select
                      value={payAccount}
                      onChange={(e) => setPayAccount(e.target.value as ExpensePaidBy)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm bg-white focus:outline-none focus:border-[#2563EB]"
                    >
                      <option value="Studio Account">Studio Primary Account</option>
                      <option value="Vansh">Vansh Personal UPI/Bank</option>
                      <option value="Krishna">Krishna Personal UPI/Bank</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                      Payment Milestone
                    </label>
                    <select
                      value={payMilestone}
                      onChange={(e) => setPayMilestone(e.target.value as ClientPayment['milestone'])}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm bg-white focus:outline-none focus:border-[#2563EB]"
                    >
                      <option value="Advance (50%)">Advance (50%)</option>
                      <option value="Final Delivery (50%)">Final Delivery (50%)</option>
                      <option value="Full Upfront">Full Upfront</option>
                      <option value="Meta Ads Retainer">Meta Ads Retainer</option>
                      <option value="Domain Renewal">Domain Renewal</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('palette')}
                    className="px-4 py-2.5 rounded-full text-xs font-semibold text-[#64748B] hover:bg-[#F1F5F9]"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-6 py-2.5 rounded-full text-xs font-bold bg-[#059669] hover:bg-[#047857] text-white shadow-sm cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Record Inflow & Sync CRM
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'task' && (
              <form onSubmit={handleTaskSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                      Task / Action Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      placeholder="e.g., Call client to finalize domain & collect 50% advance"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                      Client Name
                    </label>
                    <input
                      type="text"
                      list="quick-action-client-list"
                      value={taskClientName}
                      onChange={(e) => setTaskClientName(e.target.value)}
                      placeholder="Associated client..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                      Task Type
                    </label>
                    <select
                      value={taskType}
                      onChange={(e) => setTaskType(e.target.value as StudioTask['type'])}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm bg-white focus:outline-none focus:border-[#2563EB]"
                    >
                      <option value="Follow-up">Follow-up</option>
                      <option value="Call">Client Call / Demo</option>
                      <option value="Payment Collection">Payment Collection</option>
                      <option value="Delivery">Project Milestone Delivery</option>
                      <option value="Proposal">Send Proposal / Invoice</option>
                      <option value="Internal">Internal Ops</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                      Priority
                    </label>
                    <select
                      value={taskPriority}
                      onChange={(e) => setTaskPriority(e.target.value as StudioTask['priority'])}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm bg-white focus:outline-none focus:border-[#2563EB]"
                    >
                      <option value="Urgent">Urgent (Today)</option>
                      <option value="High">High</option>
                      <option value="Normal">Normal</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                      Assigned Founder
                    </label>
                    <select
                      value={taskAssigned}
                      onChange={(e) => setTaskAssigned(e.target.value as FounderName)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm bg-white focus:outline-none focus:border-[#2563EB]"
                    >
                      <option value="Krishna">Krishna Khakole</option>
                      <option value="Vansh">Vansh Khakole</option>
                      <option value="Both">Both Founders</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                      Deadline Date
                    </label>
                    <input
                      type="date"
                      value={taskDueDate}
                      onChange={(e) => setTaskDueDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm font-mono focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                      Context Notes
                    </label>
                    <input
                      type="text"
                      value={taskNotes}
                      onChange={(e) => setTaskNotes(e.target.value)}
                      placeholder="Key talking points..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('palette')}
                    className="px-4 py-2.5 rounded-full text-xs font-semibold text-[#64748B] hover:bg-[#F1F5F9]"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-6 py-2.5 rounded-full text-xs font-bold bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Schedule Task
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'expense' && (
              <form onSubmit={handleExpenseSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                      Expense Description *
                    </label>
                    <input
                      type="text"
                      required
                      value={expTitle}
                      onChange={(e) => setExpTitle(e.target.value)}
                      placeholder="e.g., Hostinger .in Domain Registration for Client"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                      Category
                    </label>
                    <select
                      value={expCategory}
                      onChange={(e) => setExpCategory(e.target.value as StudioExpense['category'])}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm bg-white focus:outline-none focus:border-[#2563EB]"
                    >
                      <option value="Domain & Hosting">Domain & Hosting</option>
                      <option value="Software / SaaS">Software / SaaS</option>
                      <option value="Marketing & Samples">Marketing & Samples</option>
                      <option value="Operations / Travel">Operations / Travel</option>
                      <option value="Equipment">Equipment</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                      Amount (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      value={expAmount}
                      onChange={(e) => setExpAmount(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm font-mono font-bold focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                      Paid By (Tracks 50/50 Split Reimbursement)
                    </label>
                    <select
                      value={expPaidBy}
                      onChange={(e) => setExpPaidBy(e.target.value as ExpensePaidBy)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm bg-white focus:outline-none focus:border-[#2563EB]"
                    >
                      <option value="Vansh">Vansh (Out-of-Pocket)</option>
                      <option value="Krishna">Krishna (Out-of-Pocket)</option>
                      <option value="Studio Account">Studio Shared Account</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                      Related Client (Optional)
                    </label>
                    <input
                      type="text"
                      value={expClient}
                      onChange={(e) => setExpClient(e.target.value)}
                      placeholder="Studio Core or Client Name"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                    Notes
                  </label>
                  <input
                    type="text"
                    value={expNotes}
                    onChange={(e) => setExpNotes(e.target.value)}
                    placeholder="UPI ref or bill details..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('palette')}
                    className="px-4 py-2.5 rounded-full text-xs font-semibold text-[#64748B] hover:bg-[#F1F5F9]"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-6 py-2.5 rounded-full text-xs font-bold bg-[#0B0F19] hover:bg-[#1E293B] text-white shadow-sm cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Log Expense
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'ticket' && (
              <form onSubmit={handleTicketSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                      Ticket / Revision Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={tktTitle}
                      onChange={(e) => setTktTitle(e.target.value)}
                      placeholder="e.g., Update WhatsApp CTA phone number & hero gallery"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                      Client Name
                    </label>
                    <input
                      type="text"
                      list="quick-action-client-list"
                      value={tktClientName}
                      onChange={(e) => setTktClientName(e.target.value)}
                      placeholder="e.g., Aura Skin Clinic"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                      Domain Name
                    </label>
                    <input
                      type="text"
                      value={tktDomain}
                      onChange={(e) => setTktDomain(e.target.value)}
                      placeholder="auraskinclinicpune.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm font-mono focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                      Category
                    </label>
                    <select
                      value={tktCategory}
                      onChange={(e) => setTktCategory(e.target.value as ClientTicket['category'])}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm bg-white focus:outline-none focus:border-[#2563EB]"
                    >
                      <option value="Copy/Image Update">Copy/Image Update</option>
                      <option value="Bug Fix">Bug Fix</option>
                      <option value="New Feature">New Feature</option>
                      <option value="Meta Pixel/SEO">Meta Pixel/SEO</option>
                      <option value="Domain/SSL">Domain/SSL</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                      Priority & Owner
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={tktPriority}
                        onChange={(e) => setTktPriority(e.target.value as ClientTicket['priority'])}
                        className="px-3 py-2.5 rounded-xl border border-[#EAECEF] text-sm bg-white"
                      >
                        <option value="Urgent">Urgent</option>
                        <option value="High">High</option>
                        <option value="Normal">Normal</option>
                      </select>
                      <select
                        value={tktAssigned}
                        onChange={(e) => setTktAssigned(e.target.value as FounderName)}
                        className="px-3 py-2.5 rounded-xl border border-[#EAECEF] text-sm bg-white"
                      >
                        <option value="Vansh">Vansh</option>
                        <option value="Krishna">Krishna</option>
                        <option value="Both">Both</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                    Technical Details
                  </label>
                  <input
                    type="text"
                    value={tktDesc}
                    onChange={(e) => setTktDesc(e.target.value)}
                    placeholder="Exact steps or client WhatsApp voice note summary..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('palette')}
                    className="px-4 py-2.5 rounded-full text-xs font-semibold text-[#64748B] hover:bg-[#F1F5F9]"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-6 py-2.5 rounded-full text-xs font-bold bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Create Delivery Ticket
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'campaign' && (
              <form onSubmit={handleCampaignSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                      Client Name *
                    </label>
                    <input
                      type="text"
                      required
                      list="quick-action-client-list"
                      value={metaClient}
                      onChange={(e) => setMetaClient(e.target.value)}
                      placeholder="e.g., The Imperial Pavilion"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                      Campaign Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={metaName}
                      onChange={(e) => setMetaName(e.target.value)}
                      placeholder="Monsoon Wedding Bookings — Pune 15km"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                      Campaign Objective
                    </label>
                    <select
                      value={metaObjective}
                      onChange={(e) => setMetaObjective(e.target.value as MetaAdCampaign['objective'])}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm bg-white focus:outline-none focus:border-[#2563EB]"
                    >
                      <option value="WhatsApp Messages">WhatsApp Messages</option>
                      <option value="Lead Generation Form">Lead Generation Form</option>
                      <option value="Website Traffic">Website Traffic</option>
                      <option value="Instagram Reach">Instagram Reach</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                        Client Ad Budget (₹)
                      </label>
                      <input
                        type="number"
                        value={metaBudget}
                        onChange={(e) => setMetaBudget(Number(e.target.value))}
                        className="w-full px-3 py-2.5 rounded-xl border border-[#EAECEF] text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                        Aethel Retainer (₹)
                      </label>
                      <input
                        type="number"
                        value={metaFee}
                        onChange={(e) => setMetaFee(Number(e.target.value))}
                        className="w-full px-3 py-2.5 rounded-xl border border-[#EAECEF] text-sm font-mono"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('palette')}
                    className="px-4 py-2.5 rounded-full text-xs font-semibold text-[#64748B] hover:bg-[#F1F5F9]"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-6 py-2.5 rounded-full text-xs font-bold bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Launch Campaign Tracker
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'domain' && (
              <form onSubmit={handleDomainSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                      Domain Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={domName}
                      onChange={(e) => setDomName(e.target.value)}
                      placeholder="royalorchidlawns.in"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm font-mono focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                      Client Name
                    </label>
                    <input
                      type="text"
                      list="quick-action-client-list"
                      value={domClient}
                      onChange={(e) => setDomClient(e.target.value)}
                      placeholder="Royal Orchid Wedding Lawns"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                      Registrar
                    </label>
                    <select
                      value={domRegistrar}
                      onChange={(e) => setDomRegistrar(e.target.value as HostedWebsite['registrar'])}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm bg-white"
                    >
                      <option value="Hostinger">Hostinger</option>
                      <option value="GoDaddy">GoDaddy</option>
                      <option value="Namecheap">Namecheap</option>
                      <option value="Cloudflare">Cloudflare</option>
                      <option value="Client Owned">Client Owned</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                        Hosting
                      </label>
                      <select
                        value={domPlatform}
                        onChange={(e) => setDomPlatform(e.target.value as HostedWebsite['hostingPlatform'])}
                        className="w-full px-3 py-2.5 rounded-xl border border-[#EAECEF] text-sm bg-white"
                      >
                        <option value="Vercel">Vercel</option>
                        <option value="Hostinger VPS">Hostinger VPS</option>
                        <option value="Netlify">Netlify</option>
                        <option value="Cloudflare Pages">Cloudflare</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                        Renewal (₹/yr)
                      </label>
                      <input
                        type="number"
                        value={domCost}
                        onChange={(e) => setDomCost(Number(e.target.value))}
                        className="w-full px-3 py-2.5 rounded-xl border border-[#EAECEF] text-sm font-mono"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('palette')}
                    className="px-4 py-2.5 rounded-full text-xs font-semibold text-[#64748B] hover:bg-[#F1F5F9]"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-6 py-2.5 rounded-full text-xs font-bold bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Add Domain to Vault
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'brain' && (
              <form onSubmit={handleBrainSubmit} className="space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 bg-[#F8F9FA] p-1 rounded-xl border border-[#EAECEF]">
                    <button
                      type="button"
                      onClick={() => setBrainMode('daily-log')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                        brainMode === 'daily-log'
                          ? 'bg-[#0B0F19] text-white'
                          : 'text-[#64748B]'
                      }`}
                    >
                      1. Daily Log ("What happened today?")
                    </button>
                    <button
                      type="button"
                      onClick={() => setBrainMode('brain-dump')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                        brainMode === 'brain-dump'
                          ? 'bg-[#2563EB] text-white'
                          : 'text-[#64748B]'
                      }`}
                    >
                      2. Brain Dump Note / Idea
                    </button>
                  </div>

                  <div className="flex items-center gap-1 bg-[#F8F9FA] p-1 rounded-xl border border-[#EAECEF]">
                    {(['Krishna', 'Vansh'] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setBrainAuthor(f)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                          brainAuthor === f ? 'bg-[#0B0F19] text-white' : 'text-[#64748B]'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {brainMode === 'brain-dump' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                        Idea / Note Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={brainTitle}
                        onChange={(e) => setBrainTitle(e.target.value)}
                        placeholder="e.g., Target hospitals with ABDM demo"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                        Category
                      </label>
                      <select
                        value={brainCategory}
                        onChange={(e) =>
                          setBrainCategory(e.target.value as BrainDumpCategory)
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm bg-white"
                      >
                        <option value="Ideas">💡 Ideas</option>
                        <option value="Things to do">⚡ Things to do</option>
                        <option value="Thoughts">🧠 Thoughts</option>
                        <option value="Important information">📌 Important information</option>
                        <option value="Issues / Things to fix">🐛 Issues / Things to fix</option>
                        <option value="Business opportunities">💰 Business opportunities</option>
                        <option value="Client-related">🤝 Client-related</option>
                        <option value="Future plans">🔮 Future plans</option>
                      </select>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                    {brainMode === 'daily-log'
                      ? "What's on your mind? (Daily Log Update) *"
                      : 'Detailed Note / Brain Dump *'}
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={brainContent}
                    onChange={(e) => setBrainContent(e.target.value)}
                    placeholder={
                      brainMode === 'daily-log'
                        ? 'e.g., Worked on Aethel Studios website redesign / Contacted 3 potential clients...'
                        : 'Write your idea, bug to fix, or observation...'
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                    Optional Linked Client
                  </label>
                  <input
                    type="text"
                    list="quick-action-client-list"
                    value={brainClient}
                    onChange={(e) => setBrainClient(e.target.value)}
                    placeholder="Select client..."
                    className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-sm"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('palette')}
                    className="px-4 py-2.5 rounded-full text-xs font-semibold text-[#64748B] hover:bg-[#F1F5F9]"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-6 py-2.5 rounded-full text-xs font-bold bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Save to Aethel Brain
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
