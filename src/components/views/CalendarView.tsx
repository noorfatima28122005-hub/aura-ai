import React from 'react';
import { WorkspaceData } from '../../types';
import { Calendar as CalendarIcon, Clock, CheckSquare, AlertCircle } from 'lucide-react';

interface CalendarViewProps {
  data: WorkspaceData;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ data }) => {
  const safeTasks = Array.isArray(data?.tasks) ? data.tasks : [];
  const safeProjects = Array.isArray(data?.projects) ? data.projects : [];
  const tasksWithDeadlines = safeTasks
    .filter((t) => t && t.deadline)
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime());

  const projectsWithDeadlines = safeProjects
    .filter((p) => p && p.deadline)
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

  return (
    <div id="view-calendar" className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-extrabold text-white tracking-tight">
            Deliverable Timelines & Deadlines
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Chronological milestone schedule across all registered projects and tasks.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Project Delivery Milestones */}
        <div className="aura-card p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center space-x-2 text-sm font-bold text-white">
            <CalendarIcon className="w-4 h-4 text-cyan-400" />
            <span>Project Target Deadlines</span>
          </div>

          {projectsWithDeadlines.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No project deadlines established.</p>
          ) : (
            <div className="space-y-3">
              {projectsWithDeadlines.map((p) => (
                <div key={p.id} className="p-3.5 rounded-xl bg-[#080B14] border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{p.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 font-mono">
                      {p.deadline}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-400">
                    <span>Client: {p.clientName}</span>
                    <span>{p.progress}% done</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Task Deadlines */}
        <div className="aura-card p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center space-x-2 text-sm font-bold text-white">
            <CheckSquare className="w-4 h-4 text-indigo-400" />
            <span>Task Deliverable Deadlines</span>
          </div>

          {tasksWithDeadlines.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No scheduled tasks found.</p>
          ) : (
            <div className="space-y-2.5">
              {tasksWithDeadlines.map((t) => {
                const isOverdue = new Date(t.deadline!).getTime() < Date.now() && t.status !== 'Completed';
                return (
                  <div key={t.id} className="p-3 rounded-xl bg-[#080B14] border border-white/5 flex items-center justify-between text-xs">
                    <div>
                      <p className={`font-medium ${t.status === 'Completed' ? 'line-through text-gray-400' : 'text-white'}`}>
                        {t.title}
                      </p>
                      <span className="text-[10px] text-gray-400">
                        {t.projectName || 'General Deliverable'}
                      </span>
                    </div>
                    <span className={`font-mono text-[10px] px-2 py-0.5 rounded ${
                      isOverdue ? 'bg-rose-950 text-rose-300 font-bold' : 'bg-[#0D1220] text-gray-300'
                    }`}>
                      {t.deadline} {isOverdue && '⚠️'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
