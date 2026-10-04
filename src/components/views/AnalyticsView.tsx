import React from 'react';
import { WorkspaceData } from '../../types';
import { BarChart3, TrendingUp, DollarSign, CheckSquare, Users } from 'lucide-react';

interface AnalyticsViewProps {
  data: WorkspaceData;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ data }) => {
  const safeInvoices = Array.isArray(data?.invoices) ? data.invoices : [];
  const safeTasks = Array.isArray(data?.tasks) ? data.tasks : [];
  const safeProjects = Array.isArray(data?.projects) ? data.projects : [];
  const safeClients = Array.isArray(data?.clients) ? data.clients : [];

  const totalInvoiced = safeInvoices.reduce((s, i) => s + (i.amount || 0), 0);
  const totalPaid = safeInvoices
    .filter((i) => i && i.status === 'Paid')
    .reduce((s, i) => s + (i.amount || 0), 0);

  const completedTasks = safeTasks.filter((t) => t && t.status === 'Completed').length;
  const taskCompletionRate = safeTasks.length > 0 ? Math.round((completedTasks / safeTasks.length) * 100) : 0;

  return (
    <div id="view-analytics" className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-extrabold text-white tracking-tight">
            Workspace Analytics
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Empirical velocity metrics and revenue capture data.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="aura-card p-5 rounded-2xl border border-white/5">
          <span className="text-xs text-gray-400 uppercase tracking-wider block">Task Throughput</span>
          <p className="text-3xl font-display font-extrabold text-white mt-1">{taskCompletionRate}%</p>
          <span className="text-[10px] text-gray-400">{completedTasks} of {data.tasks.length} tasks resolved</span>
        </div>

        <div className="aura-card p-5 rounded-2xl border border-white/5">
          <span className="text-xs text-gray-400 uppercase tracking-wider block">Collection Efficiency</span>
          <p className="text-3xl font-display font-extrabold text-emerald-400 mt-1">
            {totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0}%
          </p>
          <span className="text-[10px] text-gray-400">${totalPaid.toLocaleString()} collected of ${totalInvoiced.toLocaleString()}</span>
        </div>

        <div className="aura-card p-5 rounded-2xl border border-white/5">
          <span className="text-xs text-gray-400 uppercase tracking-wider block">Active Client Accounts</span>
          <p className="text-3xl font-display font-extrabold text-cyan-400 mt-1">{data.clients.length}</p>
          <span className="text-[10px] text-gray-400">All registered entities</span>
        </div>
      </div>

      <div className="aura-card p-6 rounded-2xl border border-white/5 space-y-4">
        <h3 className="text-sm font-bold text-white">Project Pipeline Progress</h3>
        {data.projects.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No project data to analyze.</p>
        ) : (
          <div className="space-y-3">
            {data.projects.map((p) => (
              <div key={p.id} className="space-y-1">
                <div className="flex justify-between text-xs text-gray-300">
                  <span>{p.name}</span>
                  <span className="font-mono text-cyan-400">{p.progress}%</span>
                </div>
                <div className="w-full bg-[#080B14] h-2 rounded-full overflow-hidden border border-white/5">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-indigo-600 rounded-full"
                    style={{ width: `${p.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
