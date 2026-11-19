export type ModuleId =
  | 'command-center'
  | 'brain'
  | 'pipeline'
  | 'tickets'
  | 'tasks'
  | 'meta-ads'
  | 'domains'
  | 'finance'
  | 'analytics'
  | 'rnd-lab'
  | 'vault'
  | 'settings';

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

export type LeadSource =
  | 'Instagram'
  | 'Facebook Ads'
  | 'WhatsApp'
  | 'Direct Outreach'
  | 'Referral'
  | 'Website'
  | 'Existing Client';

export type ProjectMilestoneStage =
  | 'Requirements'
  | 'Design'
  | 'Development'
  | 'Testing'
  | 'Deployment'
  | 'Handover';

export type ProjectTemplateName =
  | 'Basic Website Package'
  | 'Standard Website Package'
  | 'Premium Website Package'
  | 'Custom Website + Meta Ads';

export interface MilestoneSubtask {
  id: string;
  title: string;
  completed: boolean;
  assignedTo: FounderName;
}

export interface ClientMilestone {
  stage: ProjectMilestoneStage;
  completed: boolean;
  completedDate?: string;
  owner: FounderName;
  notes?: string;
  subtasks?: MilestoneSubtask[];
}

export type ApprovalCheckpointStage =
  | 'Requirements'
  | 'Design'
  | 'Content'
  | 'Website Preview'
  | 'Final Delivery';

export interface ClientApprovalCheckpoint {
  id: string;
  stage: ApprovalCheckpointStage;
  approved: boolean;
  approvedBy?: string;
  approvedDate?: string;
}

export interface ClientCommunicationLog {
  id: string;
  date: string;
  type: 'Call' | 'WhatsApp' | 'Email' | 'Meeting' | 'Decision';
  summary: string;
  loggedBy: FounderName;
}

export interface ClientLead {
  id: string;
  businessName: string;
  contactPerson: string;
  phone: string;
  email?: string;
  city: string;
  niche: 'Banquet/Lawns' | 'Clinic/Hospital' | 'Cafe/Restaurant' | 'Retail/Electronics' | 'Real Estate/Interior' | 'Other';
  packageTier: string;
  quotedPrice: number;
  finalAgreedPrice: number;
  advancePaid: number;
  stage: LeadStage;
  leadSource?: LeadSource;
  assignedTo: FounderName;
  sampleLinkSent: string;
  followUpDate: string;
  notes: string;
  createdAt: string;
  milestones?: ClientMilestone[];
  proposalUrl?: string;
  contractUrl?: string;
  projectTemplate?: ProjectTemplateName;
  projectStartDate?: string;
  projectEndDate?: string;
  approvals?: ClientApprovalCheckpoint[];
  communicationLogs?: ClientCommunicationLog[];
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
  paidBy?: ExpensePaidBy;
  impressions?: number;
  reach?: number;
  clicks?: number;
  conversions?: number;
  roas?: number;
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
  paidBy?: ExpensePaidBy;
  hostingPlan?: string;
  backupStatus?: 'Verified Daily' | 'Weekly Snapshot' | 'Manual Only';
  lastBackupDate?: string;
  uptimePercent?: number;
  responseTimeMs?: number;
  lastCheckedAt?: string;
  clientPaymentStatus?: 'Client Paid' | 'Pending Client Payment' | 'Studio Covered';
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

export type TaskCategory =
  | 'Sales'
  | 'Client Communication'
  | 'Website Development'
  | 'Design'
  | 'Marketing'
  | 'Finance'
  | 'Administration'
  | 'Internal';

export type TaskRecurrence = 'None' | 'Daily' | 'Weekly' | 'Monthly';

export interface StudioTask {
  id: string;
  clientId?: string;
  clientName: string;
  title: string;
  type: 'Follow-up' | 'Call' | 'Proposal' | 'Delivery' | 'Payment Collection' | 'Internal';
  category?: TaskCategory;
  recurrence?: TaskRecurrence;
  priority: 'Urgent' | 'High' | 'Normal';
  status: 'Pending' | 'Completed';
  assignedTo: FounderName;
  dueDate: string;
  notes: string;
  createdAt: string;
  subtasks?: MilestoneSubtask[];
}

export interface ActivityLogEntry {
  id: string;
  actor: FounderName | 'Studio System';
  action: string;
  targetName: string;
  category: 'CRM' | 'Project' | 'Finance' | 'Growth' | 'Domain' | 'Vault' | 'Brain';
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

export type FinancePaymentMethod =
  | 'UPI'
  | 'Cash'
  | 'Bank Transfer'
  | 'Bank NEFT/IMPS'
  | 'Other';

export type ExpenseCategory =
  | 'Hosting'
  | 'Domains'
  | 'Software & Subscriptions'
  | 'Advertising'
  | 'Client Acquisition'
  | 'Equipment'
  | 'Travel'
  | 'Freelance'
  | 'Miscellaneous'
  | 'Domain & Hosting'
  | 'Software / SaaS'
  | 'Meta Ad Spend'
  | 'Marketing & Samples'
  | 'Operations / Travel';

export interface StudioExpense {
  id: string;
  expenseNumber?: string;
  title: string;
  description?: string;
  category: ExpenseCategory;
  amount: number;
  paymentMethod?: FinancePaymentMethod;
  vendor?: string;
  referenceNumber?: string;
  attachmentUrl?: string;
  paidBy: ExpensePaidBy;
  date: string;
  clientId?: string;
  clientRelated?: string;
  reimbursed: boolean;
  notes: string;
  createdAt?: string;
  linkedDomainId?: string;
  linkedCampaignId?: string;
}

export interface ClientPayment {
  id: string;
  receiptNumber?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  clientId?: string;
  clientName: string;
  projectTitle: string;
  totalProjectValue: number;
  amountReceived: number;
  paymentDate: string;
  paymentMode: FinancePaymentMethod;
  receivedInAccount: ExpensePaidBy;
  milestone:
    | 'Advance (50%)'
    | 'Final Delivery (50%)'
    | 'Full Upfront'
    | 'Meta Ads Retainer'
    | 'Domain Renewal'
    | 'Partial Payment'
    | 'Invoice Settlement';
  upiReference?: string;
  notes?: string;
  createdAt?: string;
}

export interface InvoiceLineItem {
  id: string;
  serviceName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export type InvoiceStatus =
  | 'Draft'
  | 'Issued'
  | 'Partially Paid'
  | 'Paid'
  | 'Overdue'
  | 'Cancelled'
  | 'Pending';

export interface ClientInvoice {
  id: string;
  invoiceNumber: string;
  clientId?: string;
  clientName: string;
  clientContactPerson?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  projectTitle: string;
  packageSubtitle?: string;
  invoiceTitle?: string;
  paymentTerms?: string;
  type:
    | 'Advance Invoice'
    | 'Milestone Invoice'
    | 'Final Invoice'
    | 'Payment Receipt'
    | 'Standard Invoice';
  lineItems?: InvoiceLineItem[];
  subtotal?: number;
  discount?: number;
  amount: number;
  amountPaid?: number;
  balanceDue?: number;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  notes: string;
  gstEnabled?: boolean;
  gstRatePercent?: number;
  gstDisclaimer?: string;
  templateId?: string;
  sourceQuotationId?: string;
  version?: number;
  createdAt?: string;
}

export type QuotationStatus = 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Expired';

export interface ClientQuotation {
  id: string;
  quoteNumber: string;
  clientId?: string;
  clientName: string;
  clientContactPerson?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  projectTitle: string;
  packageSubtitle?: string;
  paymentTerms?: string;
  date: string;
  validUntil: string;
  status: QuotationStatus;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  discount: number;
  total: number;
  notes: string;
  termsAndConditions: string;
  convertedInvoiceId?: string;
  convertedInvoiceNumber?: string;
  templateId?: string;
  createdAt: string;
}

export interface FinanceTransaction {
  id: string;
  transactionDate: string;
  type: 'Income' | 'Expense' | 'Refund';
  amount: number;
  paymentMethod: FinancePaymentMethod;
  clientId?: string;
  clientName?: string;
  projectTitle?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  paymentId?: string;
  expenseId?: string;
  referenceNumber?: string;
  description: string;
  notes?: string;
  account?: ExpensePaidBy;
  createdAt: string;
}

export type FinanceDocumentType =
  | 'Quotation'
  | 'Invoice'
  | 'Payment Receipt'
  | 'Statement of Account';

export interface GeneratedDocument {
  id: string;
  documentNumber: string;
  documentType: FinanceDocumentType;
  version: number;
  clientId?: string;
  clientName: string;
  projectTitle?: string;
  invoiceId?: string;
  quotationId?: string;
  paymentId?: string;
  createdDate: string;
  amount: number;
  status: string;
  templateId: string;
  snapshotPayload: Record<string, unknown>;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  documentType?: FinanceDocumentType | 'All';
  description: string;
  accentColor: string;
  headerStyle: 'editorial-dark' | 'minimal-clean' | 'bold-accent';
  fontFamily: 'Plus Jakarta Sans' | 'Inter' | 'JetBrains Mono' | 'Playfair Display';
  showLogo: boolean;
  footerText: string;
  isActive?: boolean;
  isDefault?: boolean;
  referenceImageUrl?: string;
}

export interface FinanceSettings {
  studioName: string;
  tagline?: string;
  contactPerson1: string;
  phone1: string;
  contactPerson2: string;
  phone2: string;
  email: string;
  website: string;
  address: string;
  upiId: string;
  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  preferredPaymentMethods: FinancePaymentMethod[];
  logoText: string;
  accentColor: string;
  headerStyle: 'editorial-dark' | 'minimal-clean' | 'bold-accent';
  footerText: string;
  defaultTemplateId: string;
  gstRegistrationStatus: 'Unregistered' | 'Registered';
  gstEnabled: boolean;
  gstin: string;
  gstRatePercent: number;
  gstDisclaimer: string;
  invoicePrefix: string;
  receiptPrefix: string;
  quotationPrefix: string;
  statementPrefix: string;
  expensePrefix: string;
  nextInvoiceNumber: number;
  nextReceiptNumber: number;
  nextQuotationNumber: number;
  nextStatementNumber: number;
  nextExpenseNumber: number;
}

export type VaultCategory =
  | 'Studio Social / Email'
  | 'Hosting & Cloud'
  | 'Meta Business Suite'
  | 'Client Credentials'
  | 'Payment / Banking'
  | 'Client Contract / Document'
  | 'Domain Credentials'
  | 'API Keys'
  | 'Proposals'
  | 'Internal Documents';

export interface EncryptedVaultItem {
  id: string;
  title: string;
  category: VaultCategory;
  accountIdentifier: string;
  loginUrl: string;
  clientAssociated: string;
  projectAssociated?: string;
  owner?: FounderName;
  notes?: string;
  cipherText: string;
  iv: string;
  salt: string;
  updatedAt: string;
}

export interface StudioNotification {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info' | 'success';
  category: 'Finance' | 'Project' | 'Domain' | 'Task' | 'CRM' | 'Growth' | 'Brain';
  targetModule: ModuleId;
  clientId?: string;
  timestamp: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  action: string;
  enabled: boolean;
  triggeredCount: number;
  category: 'Finance' | 'CRM' | 'Project' | 'Domain';
}

export interface BrainDailyLogEntry {
  id: string;
  author: 'Krishna' | 'Vansh';
  content: string;
  date: string;
  time: string;
  linkedClientId?: string;
  linkedClientName?: string;
  linkedTaskId?: string;
  mentions: ('Krishna' | 'Vansh')[];
  reactions: string[];
  pinned?: boolean;
}

export type BrainDumpCategory =
  | 'Ideas'
  | 'Things to do'
  | 'Thoughts'
  | 'Important information'
  | 'Issues / Things to fix'
  | 'Business opportunities'
  | 'Client-related'
  | 'Future plans';

export interface BrainDumpNote {
  id: string;
  title: string;
  description: string;
  author: 'Krishna' | 'Vansh';
  date: string;
  category: BrainDumpCategory;
  priority: 'Urgent' | 'High' | 'Normal' | 'Low';
  linkedClientId?: string;
  linkedClientName?: string;
  status: 'Unsorted' | 'In Progress' | 'Archived';
  pinned?: boolean;
  convertedTaskId?: string;
  tags: string[];
}

export interface BrainHandoverActionItem {
  id: string;
  text: string;
  completed?: boolean;
  convertedToTask?: boolean;
}

export interface BrainHandoverReply {
  id: string;
  author: 'Krishna' | 'Vansh';
  text: string;
  timestamp: string;
}

export interface BrainHandoverNote {
  id: string;
  from: 'Krishna' | 'Vansh';
  to: 'Krishna' | 'Vansh';
  date: string;
  time: string;
  title: string;
  content: string;
  actionItems: BrainHandoverActionItem[];
  linkedClientId?: string;
  linkedClientName?: string;
  status: 'Unread' | 'Read' | 'Acknowledged';
  replies: BrainHandoverReply[];
  reactions: string[];
}

export type BrainMemoryCategory =
  | 'Decisions'
  | 'Processes & SOPs'
  | 'Pricing & Packages'
  | 'Lessons Learned'
  | 'Tech Stack & Architecture'
  | 'Marketing Playbooks';

export interface BrainMemoryEntry {
  id: string;
  title: string;
  category: BrainMemoryCategory;
  content: string;
  reasoning?: string;
  author: FounderName;
  date: string;
  pinned?: boolean;
  tags: string[];
}

export interface BrainWeeklyRecap {
  id: string;
  weekRange: string;
  generatedAt: string;
  executiveSummary: string;
  accomplishments: string[];
  krishnaContributions: string[];
  vanshContributions: string[];
  pendingItems: string[];
  importantDiscussions: string[];
  nextWeekPriorities: string[];
  aiObservations: string[];
  metrics: {
    logsCount: number;
    tasksCompleted: number;
    tasksPending: number;
    handoversCount: number;
    newIdeasCount: number;
  };
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
  invoices?: ClientInvoice[];
  quotations?: ClientQuotation[];
  transactions?: FinanceTransaction[];
  generatedDocuments?: GeneratedDocument[];
  documentTemplates?: DocumentTemplate[];
  financeSettings?: FinanceSettings;
  automationRules?: AutomationRule[];
  activityLogs?: ActivityLogEntry[];
  brainDailyLogs?: BrainDailyLogEntry[];
  brainDumps?: BrainDumpNote[];
  brainHandovers?: BrainHandoverNote[];
  brainMemories?: BrainMemoryEntry[];
  brainWeeklyRecaps?: BrainWeeklyRecap[];
  lastUpdated: string;
}

