export type ModuleId =
  | 'command-center'
  | 'pipeline'
  | 'meta-ads'
  | 'domains'
  | 'tickets'
  | 'rnd-lab'
  | 'finance'
  | 'vault';

export type FounderFilter = 'All Studio' | 'Krishna' | 'Vansh';

export type ClientNiche =
  | 'Hospital/Clinic'
  | 'Banquet/Lawns'
  | 'Stay Hotel'
  | 'Retail/Electronics'
  | 'Restaurant/Cafe'
  | 'Coaching/Institute';

export type ClientLocation =
  | 'Pune'
  | 'Risod'
  | 'Washim'
  | 'Maharashtra / Remote';

export type PipelineStage =
  | 'Query / Lead'
  | 'In Talks / Demo Shown'
  | 'Follow-up Scheduled'
  | 'In Building'
  | 'Live / Payment Pending'
  | 'Finalized / In Progress'
  | 'Delivered / Live'
  | 'Rejected / Dropped';

export type RejectionReason =
  | 'Budget Issue'
  | 'Ghosted'
  | 'Delayed'
  | 'Competitor'
  | '';

export type PlanTier = string;

export type AssignedPerson = 'Krishna' | 'Vansh' | 'Both';

export interface ClientNote {
  id: string;
  timestamp: string;
  author: 'Krishna' | 'Vansh';
  text: string;
}

export interface ClientLead {
  id: string;
  businessName: string;
  contactPerson: string;
  phone: string;
  location: ClientLocation;
  niche: ClientNiche;
  stage: PipelineStage;
  rejectionReason?: RejectionReason;
  planSelected: PlanTier;
  quotedPrice: number;
  finalAgreedPrice: number;
  advancePaid: number;
  assignedLead: AssignedPerson;
  nextFollowUpDate: string; // YYYY-MM-DD
  notesLog: ClientNote[];
  createdAt: string;
}

export type CampaignObjective =
  | 'WhatsApp Inquiries'
  | 'Lead Generation Form'
  | 'Local Store Visits / Reach'
  | 'Instagram Profile Visits';

export type PackageDuration =
  | '7 Days'
  | '15 Days'
  | '30 Days'
  | 'Monthly Retainer';

export type CampaignStatus =
  | 'Active & Scaling'
  | 'Learning Phase'
  | 'Creative Testing'
  | 'Paused'
  | 'Completed';

export interface MetaCampaign {
  id: string;
  clientId?: string;
  clientName: string;
  niche: ClientNiche;
  objective: CampaignObjective;
  packageDuration: PackageDuration;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: CampaignStatus;
  totalAdBudget: number;
  adSpendUsed: number;
  agencyFee: number;
  leadsGenerated: number;
  metaPixelInstalled: boolean;
  whatsappFlowConnected: boolean;
  gbpSynced: boolean;
  audienceNotes: string;
  assignedLead: AssignedPerson;
}

export type HostingPlatform =
  | 'Cloudflare Pages/Workers'
  | 'Vercel'
  | 'Netlify'
  | 'Firebase'
  | 'Hostinger'
  | 'Supabase';

export type DomainRegistrar =
  | 'GoDaddy'
  | 'Hostinger'
  | 'Cloudflare'
  | 'Namecheap';

export type DomainOwner = 'Aethel Managed' | 'Client Owned';

export type HealthStatus = 'Live & Healthy' | 'Maintenance' | 'Issue Reported';

export interface TechAsset {
  id: string;
  projectName: string;
  clientName: string;
  liveDomainUrl: string;
  stagingUrl: string;
  hostingPlatform: HostingPlatform;
  deployingEmail: string;
  domainRegistrar: DomainRegistrar;
  domainOwner: DomainOwner;
  renewalDate: string; // YYYY-MM-DD
  annualRenewalCost: number;
  githubRepoUrl: string;
  techStack: string;
  healthStatus: HealthStatus;
  assignedLead: AssignedPerson;
}

export type TicketCategory =
  | 'Website Bugs / Issues'
  | 'Client Change Requests'
  | 'Core Delivery Milestones';

export type TicketWorkflowState =
  | 'Reported / To-Do'
  | 'Working On'
  | 'Testing'
  | 'Deployed & Resolved';

export type TicketPriority =
  | 'Critical - Site Down'
  | 'High'
  | 'Medium'
  | 'Low';

export type ScopeBillingTag =
  | 'Included in Plan'
  | 'Free Goodwill'
  | 'Billable Extra ₹';

export interface DeliveryTicket {
  id: string;
  title: string;
  clientName: string;
  websiteUrl: string;
  category: TicketCategory;
  state: TicketWorkflowState;
  priority: TicketPriority;
  billingTag: ScopeBillingTag;
  extraAmount?: number;
  assignedTo: 'Krishna' | 'Vansh';
  notes: string;
  createdAt: string;
}

export type PrototypeStage =
  | 'Raw Idea'
  | 'Working On / In Development'
  | 'Interactive Prototype'
  | 'Finished Product / Reusable System';

export interface PrototypeItem {
  id: string;
  projectName: string;
  stage: PrototypeStage;
  targetIndustry: string;
  coreUxHook: string;
  devStack: string[];
  livePrototypeUrl: string;
  masterPromptNotes: string;
  leadBuilder: AssignedPerson;
  updatedAt: string;
}

export type ExpenseCategory =
  | 'Studio Expense'
  | 'Tech Expense'
  | 'Food & Chai Expense'
  | 'Client-Billable Expense';

export type PaymentAccount = 'Krishna' | 'Vansh' | 'Studio Account';

export interface ExpenseItem {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  date: string; // YYYY-MM-DD
  paidBy: PaymentAccount;
  linkedClient?: string;
  notes: string;
  reimbursed: boolean;
}

export type PaymentMode = 'UPI' | 'Bank Transfer' | 'Cash';

export interface ClientPayment {
  id: string;
  date: string; // YYYY-MM-DD
  clientName: string;
  amountReceived: number;
  paymentMode: PaymentMode;
  receivedBy: PaymentAccount;
  notes: string;
}

export interface VaultCredential {
  id: string;
  servicePlatform: string;
  ownerClientTag: string;
  usernameEmail: string;
  ciphertext: string;
  iv: string;
  salt: string;
  url: string;
  notes: string;
  createdAt: string;
}

export interface AethelDatabaseState {
  clients: ClientLead[];
  metaCampaigns: MetaCampaign[];
  websites: TechAsset[];
  tickets: DeliveryTicket[];
  prototypes: PrototypeItem[];
  expenses: ExpenseItem[];
  payments: ClientPayment[];
  vaultCredentials: VaultCredential[];
}
