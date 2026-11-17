import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  CheckSquare,
  ArrowUpRight,
  Trash2,
} from 'lucide-react';
import {
  ClientLead,
  ClientTicket,
  FounderName,
  HostedWebsite,
  ProjectMilestoneStage,
  StudioTask,
} from '../types';
import {
  calculateClientProjectProgress,
  calculatePendingBalance,
  formatINR,
} from '../utils/calculations';

interface TicketsViewProps {
  tickets: ClientTicket[];
  clients: ClientLead[];
  websites: HostedWebsite[];
  tasks: StudioTask[];
  initialSubView?: 'projects' | 'tasks';
  onUpdateTicket: (updated: ClientTicket) => void;
  onAddTicket: (newTicket: ClientTicket) => void;
  onToggleMilestone: (clientId: string, stage: ProjectMilestoneStage) => void;
  onAddTask: (task: StudioTask) => void;
  onToggleTaskStatus: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenClient360: (clientId: string) => void;
}

const STATUSES: ClientTicket['status'][] = ['Open', 'In Progress', 'QA Review', 'Resolved'];

export const TicketsView: React.FC<TicketsViewProps> = ({
  tickets,
  clients,
  websites,
  tasks,
  initialSubView = 'projects',
  onUpdateTicket,
  onAddTicket,
  onToggleMilestone,
  onAddTask,
  onToggleTaskStatus,
  onDeleteTask,
  onOpenClient360,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'projects' | 'revisions' | 'tasks'>(
    initialSubView === 'tasks' ? 'tasks' : 'projects'
  );

  useEffect(() => {
    if (initialSubView === 'tasks') {
      setActiveSubTab('tasks');
    } else if (activeSubTab === 'tasks') {
      setActiveSubTab('projects');
    }
  }, [initialSubView]);

  const [showAddTicketForm, setShowAddTicketForm] = useState(false);
  const [clientName, setClientName] = useState('');
  const [domainName, setDomainName] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ClientTicket['category']>('Copy/Image Update');
  const [priority, setPriority] = useState<ClientTicket['priority']>('High');
  const [assignedTo, setAssignedTo] = useState<FounderName>('Vansh');
  const [description, setDescription] = useState('');

  // Quick Task Form
  const [taskTitle, setTaskTitle] = useState('');
  const [taskClient, setTaskClient] = useState('');
  const [taskType, setTaskType] = useState<StudioTask['type']>('Follow-up');
  const [taskPriority, setTaskPriority] = useState<StudioTask['priority']>('High');
  const [taskOwner, setTaskOwner] = useState<FounderName>('Krishna');
  const [taskDue, setTaskDue] = useState(
    new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  );

  const projectClients = clients.filter(
    (c) =>
      c.stage === 'In Building' ||
      c.stage === 'Live / Payment Pending' ||
      c.stage === 'Delivered / Live'
  );

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
            CLIENT OPERATIONS · PROJECT MILESTONES, DELIVERIES & TASKS
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B0F19]">
            {activeSubTab === 'tasks'
              ? 'Studio Tasks & Client Follow-ups'
              : activeSubTab === 'revisions'
              ? 'Client Revision & Bug Board'
              : 'Project Delivery & 6-Stage Milestones'}
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
            Track every client project from <strong>Requirements → Design → Development → Testing → Deployment → Handover</strong>.
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
              3. Tasks & Follow-ups ({tasks.filter((t) => t.status !== 'Completed').length})
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: 6-STAGE PROJECT MILESTONE TRACKER (PART 5) */}
      {activeSubTab === 'projects' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {projectClients.map((client) => {
            const prog = calculateClientProjectProgress(client, tickets, websites);
            const pending = calculatePendingBalance(client.finalAgreedPrice, client.advancePaid);

            return (
              <div
                key={client.id}
                className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EAECEF] shadow-[0_10px_30px_-10px_rgba(11,15,25,0.04)] flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB]">
                        {client.stage} · {client.niche}
                      </div>
                      <button
                        onClick={() => onOpenClient360(client.id)}
                        className="text-lg font-extrabold text-[#0B0F19] hover:text-[#2563EB] flex items-center gap-1 text-left cursor-pointer"
                      >
                        {client.businessName}
                        <ArrowUpRight className="w-4 h-4 text-[#2563EB]" />
                      </button>
                      <div className="text-xs text-[#64748B]">{client.packageTier}</div>
                    </div>

                    <span className="font-mono text-base font-extrabold text-[#2563EB]">
                      {prog.percent}%
                    </span>
                  </div>

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
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Client Name"
                className="px-3.5 py-2 rounded-xl border border-[#EAECEF] text-xs"
              />
              <input
                type="text"
                value={domainName}
                onChange={(e) => setDomainName(e.target.value)}
                placeholder="Domain (e.g. site.in)"
                className="px-3.5 py-2 rounded-xl border border-[#EAECEF] text-xs font-mono"
              />
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as ClientTicket['priority'])}
                className="px-3.5 py-2 rounded-xl border border-[#EAECEF] text-xs bg-white"
              >
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Normal">Normal</option>
              </select>
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
                    {colTickets.map((tkt) => (
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
                          <span className="font-mono text-[#64748B]">{tkt.assignedTo}</span>
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
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: STUDIO TASKS & CLIENT FOLLOW-UPS */}
      {activeSubTab === 'tasks' && (
        <div className="space-y-4">
          <form
            onSubmit={handleCreateTask}
            className="bg-white rounded-3xl p-5 border border-[#EAECEF] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end"
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
                placeholder="e.g., Follow up on proposal & collect 50% advance"
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
                Owner
              </label>
              <select
                value={taskOwner}
                onChange={(e) => setTaskOwner(e.target.value as FounderName)}
                className="w-full px-3 py-2 rounded-xl border border-[#EAECEF] text-xs bg-[#F8F9FA]"
              >
                <option value="Krishna">Krishna</option>
                <option value="Vansh">Vansh</option>
                <option value="Both">Both</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={taskDue}
                onChange={(e) => setTaskDue(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#EAECEF] text-xs font-mono bg-[#F8F9FA]"
              />
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
                    <th className="py-3.5 px-4">Task / Follow-up</th>
                    <th className="py-3.5 px-4">Client</th>
                    <th className="py-3.5 px-4">Owner</th>
                    <th className="py-3.5 px-4">Deadline</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAECEF] text-xs">
                  {tasks.map((tsk) => (
                    <tr key={tsk.id} className="hover:bg-[#F8F9FA]/60">
                      <td className="py-3.5 px-5">
                        <input
                          type="checkbox"
                          checked={tsk.status === 'Completed'}
                          onChange={() => onToggleTaskStatus(tsk.id)}
                          aria-label={`Mark ${tsk.title} complete`}
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
                        <div className="text-[11px] text-[#64748B]">{tsk.type}</div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[#2563EB]">
                        {tsk.clientId ? (
                          <button
                            onClick={() => onOpenClient360(tsk.clientId!)}
                            className="hover:underline cursor-pointer"
                          >
                            {tsk.clientName}
                          </button>
                        ) : (
                          tsk.clientName
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[#475569]">
                        {tsk.assignedTo}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[#64748B]">{tsk.dueDate}</td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={() => onDeleteTask(tsk.id)}
                          aria-label={`Delete task ${tsk.title}`}
                          className="p-1.5 rounded-lg text-[#94A3B8] hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
