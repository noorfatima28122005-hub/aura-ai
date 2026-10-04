import React, { useState } from 'react';
import { Task, Project, PriorityLevel, TaskStatus } from '../../types';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Calendar,
  Sparkles,
  Edit2,
  Trash2,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2,
  X,
  AlertCircle,
} from 'lucide-react';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';

interface TasksViewProps {
  tasks: Task[];
  projects: Project[];
  onAddTask: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<void> | void;
  onEditTask: (task: Task) => Promise<void> | void;
  onDeleteTask: (taskId: string) => Promise<void> | void;
  onToggleComplete: (taskId: string) => Promise<void> | void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  projects,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onToggleComplete,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Deletion state
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState('');
  const [status, setStatus] = useState<TaskStatus>('To Do');
  const [priority, setPriority] = useState<PriorityLevel>('High');
  const [deadline, setDeadline] = useState('2026-09-25');
  const [notes, setNotes] = useState('');

  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const safeProjects = Array.isArray(projects) ? projects : [];

  const filteredTasks = safeTasks.filter((t) => {
    if (!t) return false;
    const matchesSearch =
      (t.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.projectName &&
        t.projectName.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus =
      statusFilter === 'All'
        ? true
        : statusFilter === 'Pending'
        ? t.status !== 'Completed'
        : t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenCreate = () => {
    setEditingTask(null);
    setFormError(null);
    setTitle('');
    setProjectId(safeProjects[0]?.id || '');
    setStatus('To Do');
    setPriority('High');
    setDeadline(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: Task) => {
    setEditingTask(t);
    setFormError(null);
    setTitle(t.title);
    setProjectId(t.projectId || '');
    setStatus(t.status);
    setPriority(t.priority);
    setDeadline(t.deadline || new Date().toISOString().split('T')[0]);
    setNotes(t.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError('Task title is required.');
      return;
    }

    const prj = projects.find((p) => p.id === projectId);

    setIsSaving(true);
    try {
      if (editingTask) {
        await onEditTask({
          ...editingTask,
          title: title.trim(),
          projectId: projectId || undefined,
          projectName: prj ? prj.name : undefined,
          status,
          priority,
          deadline,
          notes: notes.trim(),
        });
      } else {
        await onAddTask({
          title: title.trim(),
          projectId: projectId || undefined,
          projectName: prj ? prj.name : undefined,
          status,
          priority,
          deadline,
          notes: notes.trim(),
        });
      }
      setIsModalOpen(false);
      setEditingTask(null);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save task.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingTask) return;
    setIsDeleting(true);
    try {
      await onDeleteTask(deletingTask.id);
      setDeletingTask(null);
    } catch (err: any) {
      console.error('Delete task failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const completedCount = safeTasks.filter((t) => t && t.status === 'Completed').length;
  const pendingCount = safeTasks.length - completedCount;

  return (
    <div id="view-tasks" className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-extrabold text-white tracking-tight">
            Deliverables & Task Management
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Track, prioritize, and complete sprint deliverables with persistent backend sync.
          </p>
        </div>

        <button
          id="btn-new-task"
          onClick={handleOpenCreate}
          className="aura-gradient-btn px-4 py-2 rounded-xl text-xs font-semibold text-white flex items-center space-x-1.5 shadow-sm shadow-indigo-600/30 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="aura-card p-4 rounded-xl border border-white/5">
          <span className="text-[11px] text-gray-400 block font-medium">
            Total Tasks
          </span>
          <span className="text-xl font-display font-bold text-white">
            {tasks.length}
          </span>
        </div>
        <div className="aura-card p-4 rounded-xl border border-white/5">
          <span className="text-[11px] text-gray-400 block font-medium">
            Pending / In Progress
          </span>
          <span className="text-xl font-display font-bold text-amber-400">
            {pendingCount}
          </span>
        </div>
        <div className="aura-card p-4 rounded-xl border border-white/5">
          <span className="text-[11px] text-gray-400 block font-medium">
            Completed
          </span>
          <span className="text-xl font-display font-bold text-emerald-400">
            {completedCount}
          </span>
        </div>
        <div className="aura-card p-4 rounded-xl border border-white/5">
          <span className="text-[11px] text-gray-400 block font-medium">
            Completion Rate
          </span>
          <span className="text-xl font-display font-bold text-indigo-400">
            {tasks.length > 0
              ? `${Math.round((completedCount / tasks.length) * 100)}%`
              : '0%'}
          </span>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search deliverables, projects, or tags..."
            className="w-full bg-[#0D1220] border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">
          {['All', 'Pending', 'To Do', 'In Progress', 'Completed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === st
                  ? 'bg-indigo-950/70 border border-indigo-500/50 text-cyan-300 font-semibold'
                  : 'bg-[#0D1220] border border-white/5 text-gray-400 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="aura-card py-16 text-center rounded-2xl border border-dashed border-white/10 p-6 space-y-3">
          <CheckSquare className="w-10 h-10 text-gray-400 mx-auto" />
          <h3 className="text-base font-bold text-white">No tasks found</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            {search || statusFilter !== 'All'
              ? 'No deliverables match your search and filter criteria.'
              : 'Add your first task to plan work sprints and automate status tracking.'}
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-2 px-4 py-2 rounded-xl aura-gradient-btn text-xs font-semibold text-white"
          >
            + Add First Task
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((t) => {
            const isCompleted = t.status === 'Completed';
            const isOverdue =
              t.deadline &&
              !isCompleted &&
              new Date(t.deadline).getTime() < Date.now();

            return (
              <div
                key={t.id}
                className={`aura-card p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 group ${
                  isCompleted
                    ? 'border-white/5 opacity-70 bg-[#080B14]/40'
                    : isOverdue
                    ? 'border-rose-500/30 hover:border-rose-500/50'
                    : 'border-white/5 hover:border-indigo-500/30'
                }`}
              >
                <div className="flex items-start space-x-3 flex-1 min-w-0">
                  <button
                    onClick={() => onToggleComplete(t.id)}
                    className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer flex-shrink-0 ${
                      isCompleted
                        ? 'bg-emerald-500 border-emerald-400 text-white'
                        : 'border-white/20 hover:border-cyan-400'
                    }`}
                  >
                    {isCompleted && <CheckCircle className="w-3.5 h-3.5" />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span
                        className={`text-xs font-semibold ${
                          isCompleted
                            ? 'line-through text-gray-500'
                            : 'text-white group-hover:text-cyan-300'
                        }`}
                      >
                        {t.title}
                      </span>
                      {t.projectName && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950/40 text-indigo-300 border border-indigo-500/20 truncate max-w-[150px]">
                          {t.projectName}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-3 text-[10px] text-gray-400 mt-1">
                      {t.deadline && (
                        <span
                          className={`flex items-center space-x-1 ${
                            isOverdue ? 'text-rose-400 font-bold' : ''
                          }`}
                        >
                          <Calendar className="w-3 h-3" />
                          <span>Due {t.deadline}</span>
                          {isOverdue && <span>(Overdue)</span>}
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          t.priority === 'Urgent'
                            ? 'bg-rose-950 text-rose-300'
                            : t.priority === 'High'
                            ? 'bg-amber-950 text-amber-300'
                            : 'bg-blue-950 text-blue-300'
                        }`}
                      >
                        {t.priority}
                      </span>
                      <span className="text-gray-500">
                        Status: {t.status}
                      </span>
                    </div>

                    {t.notes && (
                      <p className="text-[11px] text-gray-400 mt-1 italic line-clamp-1">
                        {t.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-1 flex-shrink-0">
                  <button
                    id={`btn-edit-task-${t.id}`}
                    onClick={() => handleOpenEdit(t)}
                    title="Edit Task"
                    className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    id={`btn-delete-task-${t.id}`}
                    onClick={() => setDeletingTask(t)}
                    title="Delete Task"
                    className="p-1.5 text-gray-400 hover:text-rose-400 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="aura-card max-w-md w-full p-6 rounded-2xl border border-indigo-500/30 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingTask ? `Edit Task: ${editingTask.title}` : 'Create Deliverable Task'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingTask(null);
                }}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-300 mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Conduct user review on staging branch"
                  className="w-full bg-[#080B14] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-300 mb-1">
                  Associated Project
                </label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full bg-[#080B14] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">(No specific project)</option>
                  {safeProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.clientName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
                    className="w-full bg-[#080B14] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="To Do">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Review">Review</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                    className="w-full bg-[#080B14] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-300 mb-1">
                  Target Deadline
                </label>
                <input
                  type="date"
                  required
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full bg-[#080B14] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-300 mb-1">
                  Internal Notes & Deliverable Checklist
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Checklist items, PR links, or verification notes..."
                  className="w-full bg-[#080B14] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-white/5">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingTask(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="aura-gradient-btn px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-sm flex items-center space-x-1.5 disabled:opacity-60 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <span>{editingTask ? 'Save Changes' : 'Create Task'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingTask)}
        title="Delete Task"
        itemName={deletingTask?.title || 'Task'}
        itemType="Task"
        warningMessage="Are you sure you want to delete this deliverable task? It will be permanently removed from your sprint backlog."
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingTask(null)}
      />
    </div>
  );
};
