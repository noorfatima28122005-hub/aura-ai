import React, { useState } from 'react';
import { Project, Client, Task, PriorityLevel, ProjectStatus } from '../../types';
import {
  Briefcase,
  Plus,
  Search,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  Sparkles,
  Edit2,
  Trash2,
  Filter,
  Loader2,
  X,
  AlertCircle,
} from 'lucide-react';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';

interface ProjectsViewProps {
  projects: Project[];
  clients: Client[];
  tasks?: Task[];
  onAddProject: (project: Omit<Project, 'id' | 'createdAt'>) => Promise<void> | void;
  onEditProject: (project: Project) => Promise<void> | void;
  onDeleteProject: (projectId: string) => Promise<void> | void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  clients,
  tasks = [],
  onAddProject,
  onEditProject,
  onDeleteProject,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Deletion state
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [clientId, setClientId] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('In Progress');
  const [priority, setPriority] = useState<PriorityLevel>('High');
  const [progress, setProgress] = useState(30);
  const [deadline, setDeadline] = useState('2026-09-30');
  const [budget, setBudget] = useState(5000);
  const [notes, setNotes] = useState('');

  const safeProjects = Array.isArray(projects) ? projects : [];
  const safeClients = Array.isArray(clients) ? clients : [];
  const safeTasks = Array.isArray(tasks) ? tasks : [];

  const filteredProjects = safeProjects.filter((p) => {
    if (!p) return false;
    const matchesSearch =
      (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.clientName || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenCreate = () => {
    setEditingProject(null);
    setFormError(null);
    setName('');
    setClientId(safeClients[0]?.id || '');
    setDescription('');
    setStatus('In Progress');
    setPriority('High');
    setProgress(0);
    setDeadline(new Date(Date.now() + 21 * 86400000).toISOString().split('T')[0]);
    setBudget(5000);
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Project) => {
    setEditingProject(p);
    setFormError(null);
    setName(p.name);
    setClientId(p.clientId);
    setDescription(p.description);
    setStatus(p.status);
    setPriority(p.priority);
    setProgress(p.progress);
    setDeadline(p.deadline);
    setBudget(p.budget);
    setNotes(p.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Project title is required.');
      return;
    }
    if (!deadline) {
      setFormError('Please select a target deadline.');
      return;
    }

    const client = clients.find((c) => c.id === clientId);
    const clientName = client ? client.name : editingProject?.clientName || 'Independent Client';

    setIsSaving(true);
    try {
      if (editingProject) {
        await onEditProject({
          ...editingProject,
          name: name.trim(),
          clientId,
          clientName,
          description: description.trim(),
          status,
          priority,
          progress: Math.min(100, Math.max(0, Number(progress))),
          deadline,
          budget: Number(budget) || 0,
          notes: notes.trim(),
        });
      } else {
        await onAddProject({
          name: name.trim(),
          clientId,
          clientName,
          description: description.trim(),
          status,
          priority,
          progress: Math.min(100, Math.max(0, Number(progress))),
          deadline,
          budget: Number(budget) || 0,
          tasksCount: 0,
          completedTasksCount: 0,
          filesCount: 1,
          notes: notes.trim(),
          aiRiskAssessment: {
            level: 'low',
            explanation: 'Initial milestones established. Monitoring delivery progress.',
          },
        });
      }
      setIsModalOpen(false);
      setEditingProject(null);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save project.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingProject) return;
    setIsDeleting(true);
    try {
      await onDeleteProject(deletingProject.id);
      setDeletingProject(null);
    } catch (err: any) {
      console.error('Delete project failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Calculate linked tasks for deletion warning
  const linkedTasksCount = deletingProject
    ? safeTasks.filter((t) => t && t.projectId === deletingProject.id).length
    : 0;

  return (
    <div id="view-projects" className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-extrabold text-white tracking-tight">
            Project Pipelines
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Track active deliverables, completion velocities, budgets, and AI risk assessments with persistent backend storage.
          </p>
        </div>

        <button
          id="btn-new-project"
          onClick={handleOpenCreate}
          className="aura-gradient-btn px-4 py-2 rounded-xl text-xs font-semibold text-white flex items-center space-x-1.5 shadow-sm shadow-indigo-600/30 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects or clients..."
            className="w-full bg-[#0D1220] border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">
          {['All', 'Planning', 'In Progress', 'Review', 'Completed', 'On Hold'].map(
            (st) => (
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
            )
          )}
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="aura-card py-16 text-center rounded-2xl border border-dashed border-white/10 p-6 space-y-3">
          <Briefcase className="w-10 h-10 text-gray-400 mx-auto" />
          <h3 className="text-base font-bold text-white">No projects found</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            {search || statusFilter !== 'All'
              ? 'No projects match your current filter parameters.'
              : 'Create your primary project to monitor milestones and receive AI delivery risk alerts.'}
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-2 px-4 py-2 rounded-xl aura-gradient-btn text-xs font-semibold text-white"
          >
            + Create Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredProjects.map((prj) => (
            <div
              key={prj.id}
              className="aura-card p-6 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all space-y-4 relative group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        prj.status === 'In Progress'
                          ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/30'
                          : prj.status === 'Review'
                          ? 'bg-purple-950/60 text-purple-300 border border-purple-500/30'
                          : prj.status === 'Completed'
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                          : prj.status === 'Planning'
                          ? 'bg-blue-950/60 text-blue-300 border border-blue-500/30'
                          : 'bg-gray-800 text-gray-300'
                      }`}
                    >
                      {prj.status}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        prj.priority === 'Urgent'
                          ? 'bg-rose-950/60 text-rose-300 border border-rose-500/30'
                          : prj.priority === 'High'
                          ? 'bg-amber-950/60 text-amber-300 border border-amber-500/30'
                          : 'bg-blue-950/40 text-blue-300'
                      }`}
                    >
                      {prj.priority}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1.5 group-hover:text-cyan-300 transition-colors">
                    {prj.name}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Client: <span className="text-gray-200">{prj.clientName}</span>
                  </p>
                </div>

                <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100">
                  <button
                    id={`btn-edit-project-${prj.id}`}
                    onClick={() => handleOpenEdit(prj)}
                    title="Edit Project"
                    className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    id={`btn-delete-project-${prj.id}`}
                    onClick={() => setDeletingProject(prj)}
                    title="Delete Project"
                    className="p-1.5 text-gray-400 hover:text-rose-400 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-gray-300 line-clamp-2">
                {prj.description || 'No detailed scope description entered.'}
              </p>

              {/* Progress & Deadlines */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Deliverable Progress</span>
                  <span className="font-bold text-white">{prj.progress}%</span>
                </div>
                <div className="w-full bg-[#080B14] h-2 rounded-full overflow-hidden border border-white/5">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-pink-500 rounded-full"
                    style={{ width: `${prj.progress}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-white/5">
                <div className="flex items-center space-x-2 text-gray-300">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Due {prj.deadline}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-300 justify-end">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-bold text-white">
                    ${prj.budget.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* AI Risk Assessment Card */}
              {prj.aiRiskAssessment && (
                <div className="p-3 rounded-xl bg-[#080B14] border border-white/5 text-[11px] space-y-1">
                  <div className="flex items-center space-x-1.5 font-semibold text-cyan-300">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span>AURA Delivery Analysis:</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded uppercase ${
                        prj.aiRiskAssessment.level === 'high'
                          ? 'bg-rose-950 text-rose-300'
                          : prj.aiRiskAssessment.level === 'moderate'
                          ? 'bg-amber-950 text-amber-300'
                          : 'bg-emerald-950 text-emerald-300'
                      }`}
                    >
                      {prj.aiRiskAssessment.level} risk
                    </span>
                  </div>
                  <p className="text-gray-400 leading-relaxed">
                    {prj.aiRiskAssessment.explanation}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="aura-card max-w-md w-full p-6 rounded-2xl border border-indigo-500/30 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingProject ? `Edit Project: ${editingProject.name}` : 'Create New Project'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingProject(null);
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
                  Project Title
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. AI Workflow Telemetry Dashboard"
                  className="w-full bg-[#080B14] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-300 mb-1">
                  Client Organization
                </label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full bg-[#080B14] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {safeClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.company})
                    </option>
                  ))}
                  {safeClients.length === 0 && (
                    <option value="">Independent Internal Project</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-300 mb-1">
                  Scope & Deliverable Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="High-level milestones, target deliverables..."
                  className="w-full bg-[#080B14] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                    className="w-full bg-[#080B14] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Planning">Planning</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Review">Review</option>
                    <option value="Completed">Completed</option>
                    <option value="On Hold">On Hold</option>
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

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-gray-300 mb-1">
                    Progress (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={progress}
                    onChange={(e) => setProgress(Number(e.target.value))}
                    className="w-full bg-[#080B14] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-300 mb-1">
                    Budget ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    className="w-full bg-[#080B14] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-300 mb-1">
                    Deadline
                  </label>
                  <input
                    type="date"
                    required
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full bg-[#080B14] border border-white/10 rounded-xl py-2 px-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-300 mb-1">
                  Private Notes & Client Nuances
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Special instructions or deliverable conditions..."
                  className="w-full bg-[#080B14] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-white/5">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingProject(null);
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
                    <span>{editingProject ? 'Save Changes' : 'Create Project'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingProject)}
        title="Delete Project"
        itemName={deletingProject?.name || 'Project'}
        itemType="Project"
        warningMessage="Are you sure you want to delete this project pipeline? This action cannot be undone."
        relatedNotice={
          linkedTasksCount > 0
            ? `⚠️ Notice: This project currently has ${linkedTasksCount} associated task(s). Deleting will remove this project and unlink those tasks.`
            : undefined
        }
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingProject(null)}
      />
    </div>
  );
};
