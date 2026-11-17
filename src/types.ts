export type ModuleId =
  | 'command-center'
  | 'pipeline'
  | 'tickets'
  | 'tasks'
  | 'meta-ads'
  | 'domains'
  | 'finance'
  | 'analytics'
  | 'rnd-lab'
  | 'vault';

export type FounderName = 'Vansh' | 'Krishna' | 'Both';
export type ExpensePaidBy = 'Vansh' | 'Krishna' | 'Studio Account';

export type LeadStage =
  | 'Cold Lead'
  | 'Sample Sent / WhatsApp'
  | 'In Talks / Demo Shown'
  | 'In Building'
  | 'Live / Payment Pending'
  | 'Delivered / Live'
  | 'Rejected / Dropped';

export type ProjectMilestoneStage =
  | 'Requirements'
  | 'Design'
  | 'Development'
  | 'Testing'
  | 'Deployment'
  | 'Handover';

export interface ClientMilestone {
  stage: ProjectMilestoneStage;
  completed: boolean;
  completedDate?: string;
  owner: FounderName;
  notes?: string;
}

export interface ClientLead {
  id: string;
  businessName: string;
  contactPerson: string;
  phone: string;
  city: string;
  niche: 'Banquet/Lawns' | 'Clinic/Hospital' | 'Cafe/Restaurant' | 'Retail/Electronics' | 'Real Estate/Interior' | 'Other';
  packageTier: string;
  quotedPrice: number;
  finalAgreedPrice: number;
  advancePaid: number;
  stage: LeadStage;
  assignedTo: FounderName;
  sampleLinkSent: string;
  followUpDate: string;
  notes: string;
  createdAt: string;
  milestones?: ClientMilestone[];
  proposalUrl?: string;
  contractUrl?: string;
}

export interface MetaAdCampaign {
  id: string;
  clientId?: string;
  clientName: string;
  campaignName: string;
  objective: 'WhatsApp Messages' | 'Lead Generation Form' | 'Website Traffic' | 'Instagram Reach';
  status: 'Active' | 'Learning' | 'Paused' | 'Completed';
  totalBudget: number;
  amountSpent: number;
  agencyFee: number;
  leadsGenerated: number;
  startDate: string;
  endDate: string;
  notes: string;
}

export interface HostedWebsite {
  id: string;
  clientId?: string;
  clientName: string;
  domainName: string;
  liveUrl: string;
  registrar: 'Hostinger' | 'GoDaddy' | 'Namecheap' | 'Cloudflare' | 'Client Owned';
  hostingPlatform: 'Vercel' | 'Hostinger VPS' | 'Netlify' | 'Render' | 'Cloudflare Pages';
  purchaseDate: string;
  expiryDate: string;
  renewalCostINR: number;
  sslStatus: 'Active' | 'Expiring Soon' | 'Pending';
  siteStatus: 'Online' | 'Maintenance' | 'Development';
  githubRepo: string;
  notes: string;
}

export interface ClientTicket {
  id: string;
  clientId?: string;
  clientName: string;
  domainName: string;
  title: string;
  category: 'Bug Fix' | 'Copy/Image Update' | 'New Feature' | 'Meta Pixel/SEO' | 'Domain/SSL';
  priority: 'Urgent' | 'High' | 'Normal' | 'Low';
  status: 'Open' | 'In Progress' | 'QA Review' | 'Resolved';
  assignedTo: FounderName;
  dueDate: string;
  description: string;
  createdAt: string;
}

export interface StudioTask {
  id: string;
  clientId?: string;
  clientName: string;
  title: string;
  type: 'Follow-up' | 'Call' | 'Proposal' | 'Delivery' | 'Payment Collection' | 'Internal';
  priority: 'Urgent' | 'High' | 'Normal';
  status: 'Pending' | 'Completed';
  assignedTo: FounderName;
  dueDate: string;
  notes: string;
  createdAt: string;
}

export interface ActivityLogEntry {
  id: string;
  actor: FounderName | 'Studio System';
  action: string;
  targetName: string;
  category: 'CRM' | 'Project' | 'Finance' | 'Growth' | 'Domain' | 'Vault';
  timestamp: string;
}

export interface RnDProject {
  id: string;
  title: string;
  category: 'Sample Template' | '3D / WebGL Experience' | 'Internal Tool' | 'Ad Creative Concept' | 'Automation Script';
  targetNiche: string;
  status: 'Ideation' | 'Building' | 'Ready to Pitch' | 'Shipped';
  leadFounder: FounderName;
  previewUrl: string;
  techStack: string[];
  impactNotes: string;
  updatedAt: string;
  linkedClientIds?: string[];
}

export interface StudioExpense {
  id: string;
  title: string;
  category: 'Domain & Hosting' | 'Software / SaaS' | 'Meta Ad Spend' | 'Marketing & Samples' | 'Operations / Travel' | 'Equipment';
  amount: number;
  paidBy: ExpensePaidBy;
  date: string;
  clientRelated?: string;
  reimbursed: boolean;
  notes: string;
}

export interface ClientPayment {
  id: string;
  clientId?: string;
  clientName: string;
  projectTitle: string;
  totalProjectValue: number;
  amountReceived: number;
  paymentDate: string;
  paymentMode: 'UPI' | 'Bank NEFT/IMPS' | 'Cash';
  receivedInAccount: ExpensePaidBy;
  milestone: 'Advance (50%)' | 'Final Delivery (50%)' | 'Full Upfront' | 'Meta Ads Retainer' | 'Domain Renewal';
}

export interface EncryptedVaultItem {
  id: string;
  title: string;
  category: 'Studio Social / Email' | 'Hosting & Cloud' | 'Meta Business Suite' | 'Client Credentials' | 'Payment / Banking' | 'Client Contract / Document';
  accountIdentifier: string;
  loginUrl: string;
  clientAssociated: string;
  cipherText: string;
  iv: string;
  salt: string;
  updatedAt: string;
}

export interface AethelDatabaseState {
  clients: ClientLead[];
  metaCampaigns: MetaAdCampaign[];
  websites: HostedWebsite[];
  tickets: ClientTicket[];
  rndProjects: RnDProject[];
  expenses: StudioExpense[];
  payments: ClientPayment[];
  vaultItems: EncryptedVaultItem[];
  tasks?: StudioTask[];
  activityLogs?: ActivityLogEntry[];
  lastUpdated: string;
}
