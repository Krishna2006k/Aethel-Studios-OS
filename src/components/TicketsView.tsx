import React, { useState, useEffect } from 'react';
import {
  Plus,
  ArrowUpRight,
  Trash2,
  Pencil,
  X,
  Check,
  LayoutGrid,
  List,
  Calendar,
  Award,
  Repeat,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  ApprovalCheckpointStage,
  ClientLead,
  ClientTicket,
  FounderName,
  HostedWebsite,
  ProjectMilestoneStage,
  ProjectTemplateName,
  StudioTask,
  TaskCategory,
  TaskRecurrence,
} from '../types';
import {
  calculateClientProjectProgress,
  calculatePendingBalance,
  formatINR,
  STANDARD_MILESTONE_STAGES,
} from '../utils/calculations';

interface TicketsViewProps {
  tickets: ClientTicket[];
  clients: ClientLead[];
  websites: HostedWebsite[];
  tasks: StudioTask[];
  initialSubView?: 'projects' | 'tasks';
  onUpdateClient?: (updated: ClientLead) => void;
  onUpdateTicket: (updated: ClientTicket) => void;
  onAddTicket: (newTicket: ClientTicket) => void;
  onDeleteTicket?: (ticketId: string) => void;
  onToggleMilestone: (clientId: string, stage: ProjectMilestoneStage) => void;
  onAddTask: (task: StudioTask) => void;
  onUpdateTask?: (updated: StudioTask) => void;
  onToggleTaskStatus: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenClient360: (clientId: string) => void;
  onApplyProjectTemplate?: (clientId: string, templateName: ProjectTemplateName) => void;
  onToggleApprovalCheckpoint?: (clientId: string, stage: ApprovalCheckpointStage) => void;
  onToggleMilestoneSubtask?: (
    clientId: string,
    milestoneStage: ProjectMilestoneStage,
    subtaskId: string
  ) => void;
}

const STATUSES: ClientTicket['status'][] = ['Open', 'In Progress', 'QA Review', 'Resolved'];

const PROJECT_TEMPLATES: ProjectTemplateName[] = [
  'Basic Website Package',
  'Standard Website Package',
  'Premium Website Package',
  'Custom Website + Meta Ads',
];

const TASK_CATEGORIES: TaskCategory[] = [
  'Sales',
  'Client Communication',
  'Website Development',
  'Design',
  'Marketing',
  'Finance',
  'Administration',
  'Internal',
];

export const TicketsView: React.FC<TicketsViewProps> = ({
  tickets,
  clients,
  websites,
  tasks,
  initialSubView = 'projects',
  onUpdateClient,
  onUpdateTicket,
  onAddTicket,
  onDeleteTicket,
  onToggleMilestone,
  onAddTask,
  onUpdateTask,
  onToggleTaskStatus,
  onDeleteTask,
  onOpenClient360,
  onApplyProjectTemplate,
  onToggleApprovalCheckpoint,
  onToggleMilestoneSubtask,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'projects' | 'revisions' | 'tasks'>(
    initialSubView === 'tasks' ? 'tasks' : 'projects'
  );
  const [projectViewMode, setProjectViewMode] = useState<'cards' | 'kanban' | 'timeline'>('cards');
  const [expandedSubtasksClientId, setExpandedSubtasksClientId] = useState<string | null>(null);

  // Task Workspace Filter (Part 5: Personal Task Dashboards)
  const [taskWorkspaceFilter, setTaskWorkspaceFilter] = useState<'All' | FounderName>('All');
  const [taskCategoryFilter, setTaskCategoryFilter] = useState<string>('All');

  useEffect(() => {
    setActiveSubTab(initialSubView === 'tasks' ? 'tasks' : 'projects');
  }, [initialSubView]);

  // Inline Edit State for Project Milestone Cards (Tab 1)
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectDraft, setProjectDraft] = useState<ClientLead | null>(null);

  const handleStartEditProject = (client: ClientLead) => {
    setEditingProjectId(client.id);
    setProjectDraft({ ...client });
  };

  const handleSaveProjectEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectDraft || !onUpdateClient) return;
    onUpdateClient({
      ...projectDraft,
      businessName: projectDraft.businessName.trim() || 'Studio Client',
      packageTier: projectDraft.packageTier.trim() || 'Custom Website',
      finalAgreedPrice: Math.max(0, Number(projectDraft.finalAgreedPrice) || 0),
      advancePaid: Math.max(0, Number(projectDraft.advancePaid) || 0),
    });
    setEditingProjectId(null);
    setProjectDraft(null);
  };

  // Revision Ticket Create & Inline Edit State (Tab 2)
  const [showAddTicketForm, setShowAddTicketForm] = useState(false);
  const [clientName, setClientName] = useState('');
  const [domainName, setDomainName] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ClientTicket['category']>('Copy/Image Update');
  const [priority, setPriority] = useState<ClientTicket['priority']>('High');
  const [assignedTo, setAssignedTo] = useState<FounderName>('Vansh');
  const [description, setDescription] = useState('');

  const [editingTicketId, setEditingTicketId] = useState<string | null>(null);
  const [ticketDraft, setTicketDraft] = useState<ClientTicket | null>(null);

  const handleStartEditTicket = (tkt: ClientTicket) => {
    setEditingTicketId(tkt.id);
    setTicketDraft({ ...tkt });
  };

  const handleSaveTicketEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketDraft || !ticketDraft.title.trim()) return;
    const matched = clients.find(
      (c) => c.businessName.toLowerCase() === ticketDraft.clientName.trim().toLowerCase()
    );
    onUpdateTicket({
      ...ticketDraft,
      clientId: matched ? matched.id : ticketDraft.clientId,
      clientName: matched ? matched.businessName : ticketDraft.clientName.trim(),
      title: ticketDraft.title.trim(),
      domainName: ticketDraft.domainName.trim() || 'client-site.in',
      description: ticketDraft.description.trim(),
    });
    setEditingTicketId(null);
    setTicketDraft(null);
  };

  // Quick Task Create & Inline Edit State (Tab 3)
  const [taskTitle, setTaskTitle] = useState('');
  const [taskClient, setTaskClient] = useState('');
  const [taskType, setTaskType] = useState<StudioTask['type']>('Follow-up');
  const [taskCat, setTaskCat] = useState<TaskCategory>('Client Communication');
  const [taskRecurrence, setTaskRecurrence] = useState<TaskRecurrence>('None');
  const [taskPriority, setTaskPriority] = useState<StudioTask['priority']>('High');
  const [taskOwner, setTaskOwner] = useState<FounderName>('Krishna');
  const [taskDue, setTaskDue] = useState(
    new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  );

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskDraft, setTaskDraft] = useState<StudioTask | null>(null);

  const handleStartEditTask = (tsk: StudioTask) => {
    setEditingTaskId(tsk.id);
    setTaskDraft({ ...tsk });
  };

  const handleSaveTaskEdit = () => {
    if (!taskDraft || !taskDraft.title.trim() || !onUpdateTask) return;
    const matched = clients.find(
      (c) => c.businessName.toLowerCase() === taskDraft.clientName.trim().toLowerCase()
    );
    onUpdateTask({
      ...taskDraft,
      clientId: matched ? matched.id : taskDraft.clientId,
      clientName: matched ? matched.businessName : taskDraft.clientName.trim(),
      title: taskDraft.title.trim(),
    });
    setEditingTaskId(null);
    setTaskDraft(null);
  };

  const projectClients = clients.filter(
    (c) =>
      c.stage === 'In Building' ||
      c.stage === 'Live / Payment Pending' ||
      c.stage === 'Delivered / Live'
  );

  const filteredTasks = tasks.filter((t) => {
    const matchesOwner =
      taskWorkspaceFilter === 'All' ||
      t.assignedTo === taskWorkspaceFilter ||
      t.assignedTo === 'Both';
    const matchesCat =
      taskCategoryFilter === 'All' || (t.category || 'Internal') === taskCategoryFilter;
    return matchesOwner && matchesCat;
  });

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const matched = clients.find(
      (c) => c.businessName.toLowerCase() === clientName.trim().toLowerCase()
    );
    onAddTicket({
      id: `tkt-${Date.now()}`,
      clientId: matched?.id,
      clientName: matched ? matched.businessName : clientName.trim() || 'Studio Client',
      domainName: domainName.trim() || 'client-site.in',
      title: title.trim(),
      category,
      priority,
      status: 'Open',
      assignedTo,
      dueDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
      description: description.trim(),
      createdAt: new Date().toISOString().slice(0, 10),
    });
    setTitle('');
    setDescription('');
    setShowAddTicketForm(false);
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    const matched = clients.find(
      (c) => c.businessName.toLowerCase() === taskClient.trim().toLowerCase()
    );
    onAddTask({
      id: `tsk-${Date.now()}`,
      clientId: matched?.id,
      clientName: matched ? matched.businessName : taskClient.trim() || 'Aethel Studio',
      title: taskTitle.trim(),
      type: taskType,
      category: taskCat,
      recurrence: taskRecurrence,
      priority: taskPriority,
      status: 'Pending',
      assignedTo: taskOwner,
      dueDate: taskDue,
      notes: '',
      createdAt: new Date().toISOString().slice(0, 10),
    });
    setTaskTitle('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EAECEF] shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-[#2563EB] mb-1">
            CLIENT OPERATIONS · PROJECT MILESTONES, APPROVALS &amp; TASKS
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B0F19]">
            {activeSubTab === 'tasks'
              ? 'Studio Tasks, Recurring Workflows & Follow-ups'
              : activeSubTab === 'revisions'
              ? 'Client Revision & Bug Board'
              : 'Project Delivery, Templates & Approval Gates'}
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
            Manage standardized project templates, 6-stage milestones, granular subtasks, 5 client approval checkpoints, and founder task queues.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-[#F8F9FA] p-1 rounded-xl border border-[#EAECEF]">
            <button
              onClick={() => setActiveSubTab('projects')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'projects'
                  ? 'bg-[#0B0F19] text-white'
                  : 'text-[#64748B] hover:text-[#0B0F19]'
              }`}
            >
              1. Project Milestones ({projectClients.length})
            </button>
            <button
              onClick={() => setActiveSubTab('revisions')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'revisions'
                  ? 'bg-[#0B0F19] text-white'
                  : 'text-[#64748B] hover:text-[#0B0F19]'
              }`}
            >
              2. Revision Tickets ({tickets.filter((t) => t.status !== 'Resolved').length})
            </button>
            <button
              onClick={() => setActiveSubTab('tasks')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'tasks'
                  ? 'bg-[#0B0F19] text-white'
                  : 'text-[#64748B] hover:text-[#0B0F19]'
              }`}
            >
              3. Tasks &amp; Follow-ups ({tasks.filter((t) => t.status !== 'Completed').length})
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: 6-STAGE PROJECT MILESTONE TRACKER (CARDS / KANBAN / TIMELINE) */}
      {activeSubTab === 'projects' && (
        <div className="space-y-4">
          {/* Project View Switcher Bar */}
          <div className="bg-white rounded-2xl p-3.5 border border-[#EAECEF] flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-[#64748B]">
              Showing <strong className="text-[#0B0F19]">{projectClients.length}</strong> active &amp; delivered client projects with templates, deadlines, and client sign-off checkpoints.
            </div>
            <div className="flex items-center bg-[#F8F9FA] p-1 rounded-xl border border-[#EAECEF]">
              <button
                onClick={() => setProjectViewMode('cards')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  projectViewMode === 'cards'
                    ? 'bg-[#0B0F19] text-white'
                    : 'text-[#64748B] hover:text-[#0B0F19]'
                }`}
              >
                <List className="w-3.5 h-3.5" /> Cards &amp; Checklists
              </button>
              <button
                onClick={() => setProjectViewMode('kanban')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  projectViewMode === 'kanban'
                    ? 'bg-[#0B0F19] text-white'
                    : 'text-[#64748B] hover:text-[#0B0F19]'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Milestone Kanban
              </button>
              <button
                onClick={() => setProjectViewMode('timeline')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  projectViewMode === 'timeline'
                    ? 'bg-[#0B0F19] text-white'
                    : 'text-[#64748B] hover:text-[#0B0F19]'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" /> Deadlines Timeline
              </button>
            </div>
          </div>

          {/* MODE A: CARDS & CHECKLISTS VIEW */}
          {projectViewMode === 'cards' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {projectClients.map((client) => {
                const prog = calculateClientProjectProgress(client, tickets, websites);
                const pending = calculatePendingBalance(
                  client.finalAgreedPrice,
                  client.advancePaid
                );
                const isEditing = editingProjectId === client.id && projectDraft !== null;
                const isSubtasksExpanded = expandedSubtasksClientId === client.id;

                return (
                  <div
                    key={client.id}
                    className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EAECEF] shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)] flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB]">
                              {client.stage} · {client.niche}
                            </span>
                            {prog.daysRemaining !== null && (
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                  prog.daysRemaining < 0
                                    ? 'bg-[#FFE4E6] text-[#E11D48]'
                                    : 'bg-[#EFF6FF] text-[#2563EB]'
                                }`}
                              >
                                {prog.daysRemaining < 0
                                  ? `${Math.abs(prog.daysRemaining)}d overdue`
                                  : `${prog.daysRemaining}d remaining`}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => onOpenClient360(client.id)}
                            className="text-lg font-extrabold text-[#0B0F19] hover:text-[#2563EB] flex items-center gap-1 text-left cursor-pointer mt-0.5"
                          >
                            {client.businessName}
                            <ArrowUpRight className="w-4 h-4 text-[#2563EB]" />
                          </button>
                          <div className="text-xs text-[#64748B]">
                            {client.packageTier}
                            {client.projectStartDate && (
                              <span className="font-mono text-[11px] ml-2">
                                ({client.projectStartDate} → {client.projectEndDate || 'TBD'})
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {onUpdateClient && (
                            <button
                              type="button"
                              onClick={() =>
                                isEditing
                                  ? setEditingProjectId(null)
                                  : handleStartEditProject(client)
                              }
                              aria-label={`Edit project ${client.businessName}`}
                              className="px-2.5 py-1 rounded-lg bg-[#F8F9FA] hover:bg-[#EFF6FF] text-[#475569] hover:text-[#2563EB] border border-[#EAECEF] text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Pencil className="w-3 h-3" /> Edit
                            </button>
                          )}
                          <span className="font-mono text-base font-extrabold text-[#2563EB]">
                            {prog.percent}%
                          </span>
                        </div>
                      </div>

                      {/* 1-Click Project Template Selector Strip */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] font-bold uppercase text-[#64748B] mr-1">
                          Template:
                        </span>
                        {PROJECT_TEMPLATES.map((tpl) => (
                          <button
                            key={tpl}
                            onClick={() =>
                              onApplyProjectTemplate && onApplyProjectTemplate(client.id, tpl)
                            }
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                              client.projectTemplate === tpl
                                ? 'bg-[#0B0F19] text-white border-[#0B0F19]'
                                : 'bg-[#F8F9FA] text-[#475569] border-[#EAECEF] hover:border-[#2563EB]'
                            }`}
                          >
                            {tpl.replace(' Package', '')}
                          </button>
                        ))}
                      </div>

                      {/* Inline Project Edit Form */}
                      {isEditing && projectDraft && (
                        <form
                          onSubmit={handleSaveProjectEdit}
                          className="p-4 rounded-2xl bg-[#F8F9FA] border-2 border-[#2563EB] space-y-3"
                        >
                          <div className="flex items-center justify-between border-b border-[#EAECEF] pb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB]">
                              Edit Project Scope, Deadlines &amp; Financials
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingProjectId(null);
                                setProjectDraft(null);
                              }}
                              className="text-[#64748B] hover:text-[#0B0F19] cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-0.5">
                                Client Business Name
                              </label>
                              <input
                                type="text"
                                required
                                value={projectDraft.businessName}
                                onChange={(e) =>
                                  setProjectDraft({
                                    ...projectDraft,
                                    businessName: e.target.value,
                                  })
                                }
                                className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#EAECEF] text-xs font-bold"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-0.5">
                                Project Scope / Deliverables
                              </label>
                              <input
                                type="text"
                                value={projectDraft.packageTier}
                                onChange={(e) =>
                                  setProjectDraft({
                                    ...projectDraft,
                                    packageTier: e.target.value,
                                  })
                                }
                                className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#EAECEF] text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-0.5">
                                Start Date
                              </label>
                              <input
                                type="date"
                                value={projectDraft.projectStartDate || projectDraft.createdAt}
                                onChange={(e) =>
                                  setProjectDraft({
                                    ...projectDraft,
                                    projectStartDate: e.target.value,
                                  })
                                }
                                className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#EAECEF] text-xs font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-0.5">
                                Target Completion Date
                              </label>
                              <input
                                type="date"
                                value={projectDraft.projectEndDate || projectDraft.followUpDate}
                                onChange={(e) =>
                                  setProjectDraft({
                                    ...projectDraft,
                                    projectEndDate: e.target.value,
                                  })
                                }
                                className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#EAECEF] text-xs font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-0.5">
                                Agreed Project Value (₹)
                              </label>
                              <input
                                type="number"
                                value={projectDraft.finalAgreedPrice}
                                onChange={(e) =>
                                  setProjectDraft({
                                    ...projectDraft,
                                    finalAgreedPrice: Number(e.target.value),
                                  })
                                }
                                className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#EAECEF] text-xs font-mono font-bold"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-[#64748B] mb-0.5">
                                Paid / Collected (₹)
                              </label>
                              <input
                                type="number"
                                value={projectDraft.advancePaid}
                                onChange={(e) =>
                                  setProjectDraft({
                                    ...projectDraft,
                                    advancePaid: Number(e.target.value),
                                  })
                                }
                                className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#EAECEF] text-xs font-mono font-bold text-[#059669]"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingProjectId(null);
                                setProjectDraft(null);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-white border border-[#EAECEF] text-[#64748B] text-xs font-bold cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="px-4 py-1.5 rounded-xl bg-[#2563EB] text-white text-xs font-bold cursor-pointer"
                            >
                              Save Changes
                            </button>
                          </div>
                        </form>
                      )}

                      {/* Progress Bar */}
                      <div className="w-full h-2.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#2563EB] rounded-full transition-all duration-300"
                          style={{ width: `${prog.percent}%` }}
                        />
                      </div>

                      {/* 6-Stage Interactive Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                        {(client.milestones || []).map((m, idx) => (
                          <button
                            key={m.stage}
                            onClick={() => onToggleMilestone(client.id, m.stage)}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              m.completed
                                ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#059669]'
                                : 'bg-[#F8F9FA] border-[#EAECEF] text-[#475569] hover:border-[#2563EB]'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] font-mono">
                              <span>0{idx + 1}</span>
                              <span>{m.completed ? '✓' : '○'}</span>
                            </div>
                            <div className="text-xs font-bold text-[#0B0F19] mt-0.5">{m.stage}</div>
                          </button>
                        ))}
                      </div>

                      {/* 5 Client Approval Checkpoints Strip (Part 4) */}
                      <div className="pt-2 border-t border-[#F1F5F9]">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase text-[#64748B] mb-1.5">
                          <span className="flex items-center gap-1">
                            <Award className="w-3 h-3 text-[#2563EB]" /> Client Sign-off Checkpoints ({prog.approvedCheckpointsCount}/5)
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedSubtasksClientId(
                                isSubtasksExpanded ? null : client.id
                              )
                            }
                            className="text-[#2563EB] hover:underline flex items-center gap-0.5 cursor-pointer"
                          >
                            {isSubtasksExpanded ? 'Hide Subtasks' : 'View Subtasks'}
                            {isSubtasksExpanded ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(client.approvals || []).map((app) => (
                            <button
                              key={app.stage}
                              onClick={() =>
                                onToggleApprovalCheckpoint &&
                                onToggleApprovalCheckpoint(client.id, app.stage)
                              }
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                                app.approved
                                  ? 'bg-[#D1FAE5] border-[#A7F3D0] text-[#059669]'
                                  : 'bg-white border-[#EAECEF] text-[#64748B] hover:border-[#2563EB]'
                              }`}
                            >
                              {app.approved ? '✓ ' : '○ '}
                              {app.stage}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Collapsible Granular Milestone Subtasks */}
                      {isSubtasksExpanded && (
                        <div className="p-3.5 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF] space-y-2.5 text-xs">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB]">
                            Granular Milestone Subtasks ({client.projectTemplate || 'Standard Build'})
                          </div>
                          {(client.milestones || []).map((m) => (
                            <div key={m.stage} className="space-y-1">
                              <div className="text-[11px] font-extrabold text-[#0B0F19]">
                                {m.stage}
                              </div>
                              <div className="pl-2 space-y-1">
                                {(m.subtasks || []).map((st) => (
                                  <label
                                    key={st.id}
                                    className="flex items-center gap-2 text-[11px] cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={st.completed}
                                      onChange={() =>
                                        onToggleMilestoneSubtask &&
                                        onToggleMilestoneSubtask(client.id, m.stage, st.id)
                                      }
                                      className="w-3.5 h-3.5 accent-[#2563EB]"
                                    />
                                    <span
                                      className={
                                        st.completed
                                          ? 'line-through text-[#94A3B8]'
                                          : 'text-[#334155]'
                                      }
                                    >
                                      {st.title}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-xs">
                      <div className="text-[#64748B]">
                        Lead: <strong className="text-[#0B0F19]">{client.assignedTo}</strong> · Next:{' '}
                        <strong className="text-[#2563EB]">{prog.nextMilestoneLabel}</strong>
                      </div>
                      <div className="flex items-center gap-2">
                        {pending > 0 && (
                          <span className="font-mono font-bold text-amber-700">
                            Due: {formatINR(pending)}
                          </span>
                        )}
                        <button
                          onClick={() => onOpenClient360(client.id)}
                          className="px-3 py-1.5 rounded-xl bg-[#0B0F19] text-white font-bold text-[11px] cursor-pointer"
                        >
                          Client 360°
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* MODE B: MILESTONE KANBAN BOARD VIEW */}
          {projectViewMode === 'kanban' && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {STANDARD_MILESTONE_STAGES.map((mStage) => {
                const clientsInStage = projectClients.filter((c) => {
                  const prog = calculateClientProjectProgress(c, tickets, websites);
                  return (
                    prog.nextMilestoneLabel === mStage ||
                    (mStage === 'Handover' && prog.percent === 100)
                  );
                });

                return (
                  <div
                    key={mStage}
                    className="bg-white rounded-2xl p-3.5 border border-[#EAECEF] space-y-2.5"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
                      <span className="text-xs font-extrabold text-[#0B0F19]">{mStage}</span>
                      <span className="text-xs font-mono font-bold text-[#2563EB]">
                        {clientsInStage.length}
                      </span>
                    </div>
                    {clientsInStage.length === 0 ? (
                      <div className="py-6 text-center text-[11px] text-[#94A3B8]">
                        No projects
                      </div>
                    ) : (
                      clientsInStage.map((c) => {
                        const prog = calculateClientProjectProgress(c, tickets, websites);
                        return (
                          <div
                            key={c.id}
                            onClick={() => onOpenClient360(c.id)}
                            className="p-3 rounded-xl bg-[#F8F9FA] hover:bg-white border border-[#EAECEF] hover:border-[#2563EB] transition-all cursor-pointer space-y-1.5"
                          >
                            <div className="text-xs font-extrabold text-[#0B0F19]">
                              {c.businessName}
                            </div>
                            <div className="text-[11px] text-[#64748B] truncate">
                              {c.packageTier}
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-[#EAECEF]">
                              <span className="text-[#2563EB] font-bold">{prog.percent}%</span>
                              <span className="text-[#475569]">{c.assignedTo}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* MODE C: DEADLINES TIMELINE VIEW */}
          {projectViewMode === 'timeline' && (
            <div className="bg-white rounded-3xl border border-[#EAECEF] overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8F9FA] border-b border-[#EAECEF] text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                    <th className="py-3 px-4">Project &amp; Client</th>
                    <th className="py-3 px-3">Start Date</th>
                    <th className="py-3 px-3">Target Completion</th>
                    <th className="py-3 px-3">Schedule Status</th>
                    <th className="py-3 px-3">Progress</th>
                    <th className="py-3 px-3">Approvals</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] text-xs">
                  {projectClients.map((c) => {
                    const prog = calculateClientProjectProgress(c, tickets, websites);
                    return (
                      <tr key={c.id} className="hover:bg-[#F8F9FA]">
                        <td className="py-3 px-4">
                          <div className="font-extrabold text-[#0B0F19]">{c.businessName}</div>
                          <div className="text-[11px] text-[#64748B]">{c.packageTier}</div>
                        </td>
                        <td className="py-3 px-3 font-mono text-[#475569]">
                          {c.projectStartDate || c.createdAt}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-[#0B0F19]">
                          {c.projectEndDate || c.followUpDate}
                        </td>
                        <td className="py-3 px-3">
                          {prog.percent === 100 ? (
                            <span className="px-2 py-0.5 rounded bg-[#D1FAE5] text-[#059669] text-[10px] font-bold">
                              Delivered
                            </span>
                          ) : prog.daysRemaining !== null && prog.daysRemaining < 0 ? (
                            <span className="px-2 py-0.5 rounded bg-[#FFE4E6] text-[#E11D48] text-[10px] font-mono font-bold">
                              {Math.abs(prog.daysRemaining)}d Overdue
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-[#EFF6FF] text-[#2563EB] text-[10px] font-mono font-bold">
                              {prog.daysRemaining ?? 7}d Remaining
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-[#2563EB]">
                          {prog.percent}% ({prog.completedMilestones}/6)
                        </td>
                        <td className="py-3 px-3 font-mono text-[#059669] font-bold">
                          {prog.approvedCheckpointsCount}/5 Signed
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => onOpenClient360(c.id)}
                            className="px-3 py-1 rounded-lg bg-[#0B0F19] text-white text-[11px] font-bold cursor-pointer"
                          >
                            Open 360°
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: REVISION & BUG TICKETS BOARD */}
      {activeSubTab === 'revisions' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddTicketForm(!showAddTicketForm)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-bold cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Log Revision / Bug Ticket
            </button>
          </div>

          {showAddTicketForm && (
            <form
              onSubmit={handleCreateTicket}
              className="bg-white rounded-3xl p-5 border-2 border-[#2563EB]/20 grid grid-cols-1 sm:grid-cols-3 gap-3"
            >
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Revision or Bug Title *"
                className="sm:col-span-2 px-3.5 py-2 rounded-xl border border-[#EAECEF] text-xs"
              />
              <input
                type="text"
                list="ticket-client-list"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Client Name"
                className="px-3.5 py-2 rounded-xl border border-[#EAECEF] text-xs"
              />
              <datalist id="ticket-client-list">
                {clients.map((c) => (
                  <option key={c.id} value={c.businessName} />
                ))}
              </datalist>
              <input
                type="text"
                value={domainName}
                onChange={(e) => setDomainName(e.target.value)}
                placeholder="Domain (e.g. site.in)"
                className="px-3.5 py-2 rounded-xl border border-[#EAECEF] text-xs font-mono"
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ClientTicket['category'])}
                className="px-3.5 py-2 rounded-xl border border-[#EAECEF] text-xs bg-white"
              >
                <option value="Copy/Image Update">Copy/Image Update</option>
                <option value="Bug Fix">Bug Fix</option>
                <option value="New Feature">New Feature</option>
                <option value="Meta Pixel/SEO">Meta Pixel/SEO</option>
                <option value="Domain/SSL">Domain/SSL</option>
              </select>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as ClientTicket['priority'])}
                className="px-3.5 py-2 rounded-xl border border-[#EAECEF] text-xs bg-white"
              >
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Normal">Normal</option>
              </select>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value as FounderName)}
                className="px-3.5 py-2 rounded-xl border border-[#EAECEF] text-xs bg-white"
              >
                <option value="Vansh">Vansh</option>
                <option value="Krishna">Krishna</option>
                <option value="Both">Both</option>
              </select>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Notes or details..."
                className="px-3.5 py-2 rounded-xl border border-[#EAECEF] text-xs"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#0B0F19] text-white text-xs font-bold cursor-pointer"
              >
                Save Ticket
              </button>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {STATUSES.map((status) => {
              const colTickets = tickets.filter((t) => t.status === status);
              return (
                <div
                  key={status}
                  className="bg-white rounded-3xl p-4 border border-[#EAECEF] space-y-3"
                >
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#F1F5F9]">
                    <span className="text-xs font-extrabold text-[#0B0F19]">{status}</span>
                    <span className="text-xs font-mono font-bold text-[#2563EB]">
                      {colTickets.length}
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {colTickets.map((tkt) => {
                      const isEditingTkt =
                        editingTicketId === tkt.id && ticketDraft !== null;

                      if (isEditingTkt && ticketDraft) {
                        return (
                          <form
                            key={tkt.id}
                            onSubmit={handleSaveTicketEdit}
                            className="p-3.5 rounded-2xl bg-white border-2 border-[#2563EB] space-y-2 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase text-[#2563EB]">
                                Edit Ticket
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTicketId(null);
                                  setTicketDraft(null);
                                }}
                                className="text-[#64748B] hover:text-[#0B0F19] cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <input
                              type="text"
                              required
                              value={ticketDraft.title}
                              onChange={(e) =>
                                setTicketDraft({ ...ticketDraft, title: e.target.value })
                              }
                              placeholder="Ticket Title"
                              className="w-full px-2.5 py-1.5 rounded-lg border border-[#EAECEF] text-xs font-bold"
                            />
                            <input
                              type="text"
                              list="ticket-client-list"
                              value={ticketDraft.clientName}
                              onChange={(e) =>
                                setTicketDraft({
                                  ...ticketDraft,
                                  clientName: e.target.value,
                                })
                              }
                              placeholder="Client Name"
                              className="w-full px-2.5 py-1.5 rounded-lg border border-[#EAECEF] text-xs"
                            />
                            <div className="grid grid-cols-2 gap-1.5">
                              <select
                                value={ticketDraft.priority}
                                onChange={(e) =>
                                  setTicketDraft({
                                    ...ticketDraft,
                                    priority: e.target.value as ClientTicket['priority'],
                                  })
                                }
                                className="px-2 py-1 rounded-lg border border-[#EAECEF] text-[11px] bg-white"
                              >
                                <option value="Urgent">Urgent</option>
                                <option value="High">High</option>
                                <option value="Normal">Normal</option>
                              </select>
                              <select
                                value={ticketDraft.assignedTo}
                                onChange={(e) =>
                                  setTicketDraft({
                                    ...ticketDraft,
                                    assignedTo: e.target.value as FounderName,
                                  })
                                }
                                className="px-2 py-1 rounded-lg border border-[#EAECEF] text-[11px] bg-white"
                              >
                                <option value="Vansh">Vansh</option>
                                <option value="Krishna">Krishna</option>
                                <option value="Both">Both</option>
                              </select>
                            </div>
                            <div className="flex justify-end gap-1.5 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTicketId(null);
                                  setTicketDraft(null);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-[#F8F9FA] text-[#64748B] text-[11px] font-bold cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="px-3 py-1 rounded-lg bg-[#2563EB] text-white text-[11px] font-bold cursor-pointer"
                              >
                                Save
                              </button>
                            </div>
                          </form>
                        );
                      }

                      return (
                        <div
                          key={tkt.id}
                          className="p-3.5 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF] space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span
                              className={
                                tkt.priority === 'Urgent' ? 'text-rose-600' : 'text-[#2563EB]'
                              }
                            >
                              {tkt.priority} · {tkt.category}
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-[#64748B]">{tkt.assignedTo}</span>
                              <button
                                type="button"
                                onClick={() => handleStartEditTicket(tkt)}
                                aria-label={`Edit ticket ${tkt.title}`}
                                className="p-1 rounded text-[#64748B] hover:text-[#2563EB] cursor-pointer"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              {onDeleteTicket && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteTicket(tkt.id)}
                                  aria-label={`Delete ticket ${tkt.title}`}
                                  className="p-1 rounded text-[#94A3B8] hover:text-rose-600 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="font-bold text-[#0B0F19]">{tkt.title}</div>
                          <div className="text-[11px] text-[#64748B]">{tkt.clientName}</div>
                          <select
                            value={tkt.status}
                            onChange={(e) =>
                              onUpdateTicket({
                                ...tkt,
                                status: e.target.value as ClientTicket['status'],
                              })
                            }
                            aria-label={`Status for ${tkt.title}`}
                            className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-[#EAECEF] bg-white text-[11px] font-bold"
                          >
                            {STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: STUDIO TASKS, PERSONAL DASHBOARDS & RECURRING FOLLOW-UPS (PART 5) */}
      {activeSubTab === 'tasks' && (
        <div className="space-y-4">
          {/* Personal Task Dashboards & Category Filter Bar */}
          <div className="bg-white rounded-2xl p-3.5 border border-[#EAECEF] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center bg-[#F8F9FA] p-1 rounded-xl border border-[#EAECEF]">
              {(['All', 'Krishna', 'Vansh'] as const).map((w) => (
                <button
                  key={w}
                  onClick={() => setTaskWorkspaceFilter(w)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    taskWorkspaceFilter === w
                      ? 'bg-[#0B0F19] text-white'
                      : 'text-[#64748B] hover:text-[#0B0F19]'
                  }`}
                >
                  {w === 'All' ? 'All Studio Tasks' : `${w}'s Workspace`}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[#64748B]">Category:</span>
              <select
                value={taskCategoryFilter}
                onChange={(e) => setTaskCategoryFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[#F8F9FA] border border-[#EAECEF] text-xs font-semibold text-[#475569]"
              >
                <option value="All">All Categories</option>
                {TASK_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Add Task Form with Category & Recurrence */}
          <form
            onSubmit={handleCreateTask}
            className="bg-white rounded-3xl p-5 border border-[#EAECEF] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 items-end"
          >
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                Task / Follow-up Action *
              </label>
              <input
                type="text"
                required
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="e.g., Weekly Meta Ads performance review"
                className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-xs bg-[#F8F9FA]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                Client Name
              </label>
              <input
                type="text"
                list="tasks-client-list"
                value={taskClient}
                onChange={(e) => setTaskClient(e.target.value)}
                placeholder="Select client..."
                className="w-full px-3 py-2 rounded-xl border border-[#EAECEF] text-xs bg-[#F8F9FA]"
              />
              <datalist id="tasks-client-list">
                {clients.map((c) => (
                  <option key={c.id} value={c.businessName} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                Category
              </label>
              <select
                value={taskCat}
                onChange={(e) => setTaskCat(e.target.value as TaskCategory)}
                className="w-full px-3 py-2 rounded-xl border border-[#EAECEF] text-xs bg-[#F8F9FA]"
              >
                {TASK_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                Recurrence
              </label>
              <select
                value={taskRecurrence}
                onChange={(e) => setTaskRecurrence(e.target.value as TaskRecurrence)}
                className="w-full px-3 py-2 rounded-xl border border-[#EAECEF] text-xs bg-[#F8F9FA]"
              >
                <option value="None">One-Time</option>
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                Owner &amp; Due Date
              </label>
              <div className="flex gap-1">
                <select
                  value={taskOwner}
                  onChange={(e) => setTaskOwner(e.target.value as FounderName)}
                  className="w-1/2 px-2 py-2 rounded-xl border border-[#EAECEF] text-xs bg-[#F8F9FA]"
                >
                  <option value="Krishna">Krishna</option>
                  <option value="Vansh">Vansh</option>
                  <option value="Both">Both</option>
                </select>
                <input
                  type="date"
                  value={taskDue}
                  onChange={(e) => setTaskDue(e.target.value)}
                  className="w-1/2 px-2 py-2 rounded-xl border border-[#EAECEF] text-[11px] font-mono bg-[#F8F9FA]"
                />
              </div>
            </div>
            <button
              type="submit"
              className="py-2.5 px-4 rounded-xl bg-[#2563EB] text-white text-xs font-bold hover:bg-[#1D4ED8] cursor-pointer"
            >
              + Add Task
            </button>
          </form>

          <div className="bg-white rounded-3xl border border-[#EAECEF] overflow-hidden shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8F9FA] border-b border-[#EAECEF] text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                    <th className="py-3.5 px-5">Done</th>
                    <th className="py-3.5 px-4">Priority</th>
                    <th className="py-3.5 px-4">Task &amp; Category</th>
                    <th className="py-3.5 px-4">Client</th>
                    <th className="py-3.5 px-4">Owner</th>
                    <th className="py-3.5 px-4">Deadline</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAECEF] text-xs">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[#64748B]">
                        No tasks in this workspace view. Use the form above to schedule a task or recurring workflow.
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((tsk) => {
                      const isEditingTask = editingTaskId === tsk.id && taskDraft !== null;

                      if (isEditingTask && taskDraft) {
                        return (
                          <tr key={tsk.id} className="bg-[#EFF6FF]/40">
                            <td className="py-3 px-5">
                              <input
                                type="checkbox"
                                checked={taskDraft.status === 'Completed'}
                                onChange={() =>
                                  setTaskDraft({
                                    ...taskDraft,
                                    status:
                                      taskDraft.status === 'Completed' ? 'Pending' : 'Completed',
                                  })
                                }
                                className="w-4 h-4 accent-[#2563EB]"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <select
                                value={taskDraft.priority}
                                onChange={(e) =>
                                  setTaskDraft({
                                    ...taskDraft,
                                    priority: e.target.value as StudioTask['priority'],
                                  })
                                }
                                className="px-2 py-1 rounded-lg bg-white border border-[#EAECEF] text-xs font-bold"
                              >
                                <option value="Urgent">Urgent</option>
                                <option value="High">High</option>
                                <option value="Normal">Normal</option>
                              </select>
                            </td>
                            <td className="py-3 px-4">
                              <input
                                type="text"
                                value={taskDraft.title}
                                onChange={(e) =>
                                  setTaskDraft({ ...taskDraft, title: e.target.value })
                                }
                                className="w-full px-2.5 py-1 rounded-lg bg-white border border-[#EAECEF] text-xs font-bold"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <input
                                type="text"
                                list="tasks-client-list"
                                value={taskDraft.clientName}
                                onChange={(e) =>
                                  setTaskDraft({ ...taskDraft, clientName: e.target.value })
                                }
                                className="w-full px-2.5 py-1 rounded-lg bg-white border border-[#EAECEF] text-xs"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <select
                                value={taskDraft.assignedTo}
                                onChange={(e) =>
                                  setTaskDraft({
                                    ...taskDraft,
                                    assignedTo: e.target.value as FounderName,
                                  })
                                }
                                className="px-2 py-1 rounded-lg bg-white border border-[#EAECEF] text-xs"
                              >
                                <option value="Krishna">Krishna</option>
                                <option value="Vansh">Vansh</option>
                                <option value="Both">Both</option>
                              </select>
                            </td>
                            <td className="py-3 px-4">
                              <input
                                type="date"
                                value={taskDraft.dueDate}
                                onChange={(e) =>
                                  setTaskDraft({ ...taskDraft, dueDate: e.target.value })
                                }
                                className="px-2 py-1 rounded-lg bg-white border border-[#EAECEF] text-xs font-mono"
                              />
                            </td>
                            <td className="py-3 px-5 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={handleSaveTaskEdit}
                                  className="p-1.5 rounded-lg bg-[#2563EB] text-white cursor-pointer"
                                  title="Save task changes"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingTaskId(null);
                                    setTaskDraft(null);
                                  }}
                                  className="p-1.5 rounded-lg bg-white border border-[#EAECEF] text-[#64748B] cursor-pointer"
                                  title="Cancel"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={tsk.id} className="hover:bg-[#F8F9FA]">
                          <td className="py-3.5 px-5">
                            <input
                              type="checkbox"
                              checked={tsk.status === 'Completed'}
                              onChange={() => onToggleTaskStatus(tsk.id)}
                              className="w-4 h-4 accent-[#2563EB] cursor-pointer"
                            />
                          </td>
                          <td className="py-3.5 px-4 font-bold">
                            <span
                              className={
                                tsk.priority === 'Urgent'
                                  ? 'text-rose-600'
                                  : tsk.priority === 'High'
                                  ? 'text-amber-600'
                                  : 'text-[#2563EB]'
                              }
                            >
                              {tsk.priority}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div
                              className={`font-bold ${
                                tsk.status === 'Completed'
                                  ? 'line-through text-[#94A3B8]'
                                  : 'text-[#0B0F19]'
                              }`}
                            >
                              {tsk.title}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-[#F1F5F9] text-[#475569]">
                                {tsk.category || tsk.type}
                              </span>
                              {tsk.recurrence && tsk.recurrence !== 'None' && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#EFF6FF] text-[#2563EB] inline-flex items-center gap-0.5">
                                  <Repeat className="w-2.5 h-2.5" /> {tsk.recurrence}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-[#2563EB]">
                            {tsk.clientName}
                          </td>
                          <td className="py-3.5 px-4">{tsk.assignedTo}</td>
                          <td className="py-3.5 px-4 font-mono">{tsk.dueDate}</td>
                          <td className="py-3.5 px-5 text-right">
                            <div className="inline-flex items-center gap-1">
                              {onUpdateTask && (
                                <button
                                  type="button"
                                  onClick={() => handleStartEditTask(tsk)}
                                  aria-label={`Edit task ${tsk.title}`}
                                  className="p-1.5 rounded-lg text-[#64748B] hover:text-[#2563EB] hover:bg-[#EFF6FF] cursor-pointer"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => onDeleteTask(tsk.id)}
                                aria-label={`Delete task ${tsk.title}`}
                                className="p-1.5 rounded-lg text-[#94A3B8] hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
