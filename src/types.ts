export type NavigationTab =
  | 'overview'
  | 'clients'
  | 'projects'
  | 'tasks'
  | 'calendar'
  | 'finance'
  | 'analytics'
  | 'ask-aura'
  | 'ai-insights'
  | 'approvals'
  | 'automations'
  | 'connected-accounts'
  | 'settings';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  companyName: string;
  businessDomain?: string;
  teamSize?: string;
  primaryServices?: string[];
  averageProjectValue?: string;
  aiAssistanceLevel?: 'conservative' | 'balanced' | 'autonomous_with_approval' | string;
  currency?: string;
  isAuthenticated?: boolean;
  avatarUrl?: string;
  industry?: string;
  primaryGoal?: string;
}

export type ProjectStatus = 'Planning' | 'In Progress' | 'Review' | 'Completed' | 'On Hold';
export type PriorityLevel = 'Low' | 'Medium' | 'High' | 'Urgent';
export type TaskStatus = 'To Do' | 'In Progress' | 'Review' | 'Completed';
export type InvoiceStatus = 'Draft' | 'Sent' | 'Paid' | 'Overdue';

export interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  phone?: string;
  status: 'Active' | 'Lead' | 'Archived';
  source?: 'Direct' | 'Fiverr' | 'Referral' | 'Email Inquiry';
  totalBilled: number;
  openProjectsCount: number;
  rating?: number;
  notes?: string;
  tags?: string[];
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  clientId: string;
  clientName: string;
  description: string;
  status: ProjectStatus;
  progress: number; // 0 to 100
  deadline: string;
  budget: number;
  priority: PriorityLevel;
  tasksCount: number;
  completedTasksCount: number;
  filesCount: number;
  notes?: string;
  aiRiskAssessment?: {
    level: 'low' | 'moderate' | 'high';
    explanation: string;
  };
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  clientId?: string;
  clientName?: string;
  projectId?: string;
  projectName?: string;
  status: TaskStatus;
  priority: PriorityLevel;
  deadline?: string;
  completedAt?: string;
  createdAt: string;
  notes?: string;
  tags?: string[];
  aiSuggested?: boolean;
  source?: 'manual' | 'fiverr' | 'email' | 'ai';
}

export interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  rate?: number;
  unitPrice?: number;
  amount?: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  items: InvoiceItem[];
  notes?: string;
  createdAt?: string;
}

export type ConnectionHealth =
  | 'Healthy'
  | 'Needs Attention'
  | 'Disconnected'
  | 'Authorization Expired'
  | 'Sync Error';

export type SyncState = 'Idle' | 'Syncing' | 'Completed' | 'Failed' | 'Never Synced';

export interface SyncHistoryEntry {
  id: string;
  timestamp: string;
  durationMs: number;
  status: 'Completed' | 'Failed';
  recordsProcessed: number;
  recordsAdded: number;
  recordsUpdated: number;
  recordsSkipped: number;
  message: string;
  error?: string;
}

export interface ConnectedAccount {
  id: string;
  provider: 'fiverr' | 'gmail' | 'outlook' | string;
  name: string;
  category?: 'commerce' | 'email' | 'calendar' | 'general';
  accountIdentifier: string;
  connectedAt: string;
  lastSync: string;
  status: 'connected' | 'disconnected' | 'syncing' | 'error';
  connectionHealth: ConnectionHealth;
  syncStatus: SyncState;
  syncMessage?: string;
  lastSyncDuration?: string;
  errorDetails?: string;
  permissions: string[];
  allAvailablePermissions?: string[];
  dataCategories: string[];
  icon: string;
  dataStats?: {
    activeOrders?: number;
    unreadMessages?: number;
    analyzedEmails?: number;
    totalSyncedRecords?: number;
  };
  syncHistory?: SyncHistoryEntry[];
}

export interface AiApprovalItem {
  id: string;
  title: string;
  source: 'fiverr' | 'email' | 'invoice' | 'task_overdue';
  whatHappened: string;
  whyDetected: string;
  whatAuraWantsToDo: string;
  dataUsed: string;
  suggestedAction: 'create_task' | 'send_email_draft' | 'flag_overdue' | 'reprioritize_workload';
  payload?: any;
  proposedActionData?: {
    taskTitle?: string;
    projectId?: string;
    deadline?: string;
    description?: string;
    clientEmail?: string;
  };
  status: 'Pending' | 'Approved' | 'Rejected';
  timestamp: string;
}

export interface AutomationRule {
  id: string;
  title?: string;
  name?: string;
  description?: string;
  trigger: string;
  action: string;
  requiresHumanApproval?: boolean;
  requiresApproval?: boolean;
  enabled?: boolean;
  status?: 'Active' | 'Paused';
  lastExecution?: string;
  triggerCount?: number;
  executionsCount?: number;
}

export interface ActivityLog {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  category: 'client' | 'project' | 'task' | 'ai' | 'finance' | 'integration';
  icon?: string;
}

export interface WorkspaceData {
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  invoices: Invoice[];
  connectedAccounts: ConnectedAccount[];
  approvals: AiApprovalItem[];
  automations: AutomationRule[];
  activityLogs: ActivityLog[];
  stats?: any;
}
