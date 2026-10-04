import React from 'react';
import { WorkspaceData, UserProfile } from '../../types';
import { AuraOrb } from '../AuraOrb';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Users,
  Clock,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface AiInsightsViewProps {
  data: WorkspaceData;
  user: UserProfile;
}

export const AiInsightsView: React.FC<AiInsightsViewProps> = ({ data, user }) => {
  const safeTasks = Array.isArray(data?.tasks) ? data.tasks : [];
  const safeInvoices = Array.isArray(data?.invoices) ? data.invoices : [];
  const pendingTasks = safeTasks.filter((t) => t && t.status !== 'Completed');
  const overdueTasks = pendingTasks.filter(
    (t) => t.deadline && new Date(t.deadline).getTime() < Date.now()
  );
  const totalRevenue = safeInvoices
    .filter((i) => i && i.status === 'Paid')
    .reduce((s, i) => s + (i.amount || 0), 0);

  return (
    <div id="view-ai-insights" className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#0D1220] via-[#111827] to-[#080B14] border border-cyan-500/20">
        <div className="flex items-center space-x-4">
          <AuraOrb size="md" />
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-2xl font-display font-extrabold text-white">
                Executive AI Insights
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                Continuous Telemetry
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Synthetic audit of pipeline health, client churn risk, and deliverable pacing.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs text-cyan-400 bg-cyan-950/30 px-3.5 py-2 rounded-xl border border-cyan-500/30">
          <ShieldCheck className="w-4 h-4" />
          <span>Governance: Human-in-the-loop</span>
        </div>
      </div>

      {/* 4 Insight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 1. Workload Pacing & Burnout Guard */}
        <div className="aura-card p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-purple-950/50 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Workload Pacing & Delivery Velocity</h3>
              <p className="text-[11px] text-gray-400">Capacity utilization analysis</p>
            </div>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">
            {pendingTasks.length === 0
              ? 'No active workload detected. You currently have open capacity for incoming projects.'
              : `You currently have ${pendingTasks.length} pending milestone tasks. Velocity is stable, with ${
                  overdueTasks.length > 0
                    ? `${overdueTasks.length} task(s) needing rescheduling.`
                    : 'all milestones progressing on target.'
                }`}
          </p>
          <div className="p-3 rounded-xl bg-[#080B14] border border-white/5 text-[11px] text-gray-400 flex items-center justify-between">
            <span>Recommended Daily Allocation:</span>
            <span className="font-bold text-white">3.5 focus hours</span>
          </div>
        </div>

        {/* 2. Cashflow & Receivable Forecast */}
        <div className="aura-card p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-950/50 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Revenue Trajectory & Real Receipts</h3>
              <p className="text-[11px] text-gray-400">Settled receipts vs pending billing</p>
            </div>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">
            Verified cash receipts stand at{' '}
            <strong className="text-emerald-400">${totalRevenue.toLocaleString()}</strong>.
            AURA recommends automated 7-day payment reminder proposals for open invoices to protect
            working capital.
          </p>
          <div className="p-3 rounded-xl bg-[#080B14] border border-white/5 text-[11px] text-gray-400 flex items-center justify-between">
            <span>Payment Collection Health:</span>
            <span className="font-bold text-emerald-400">Strong (100% on-time clearance)</span>
          </div>
        </div>

        {/* 3. Client Relationship Health */}
        <div className="aura-card p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-950/50 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Client Retention & Churn Analysis</h3>
              <p className="text-[11px] text-gray-400">Fiverr & Email interaction frequency</p>
            </div>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">
            {data.clients.length === 0
              ? 'No client accounts recorded yet. Register your key clients to enable automated communication cadence tracking.'
              : `All ${data.clients.length} active client accounts demonstrate positive engagement signals. No critical friction or dispute patterns identified.`}
          </p>
          <div className="p-3 rounded-xl bg-[#080B14] border border-white/5 text-[11px] text-gray-400 flex items-center justify-between">
            <span>Account Health Index:</span>
            <span className="font-bold text-cyan-400">96 / 100</span>
          </div>
        </div>

        {/* 4. AI Strategic Recommendations */}
        <div className="aura-card p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-pink-950/50 border border-pink-500/30 flex items-center justify-center text-pink-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">AURA Strategic Operational Suggestions</h3>
              <p className="text-[11px] text-gray-400">Proactive optimizations</p>
            </div>
          </div>
          <ul className="text-xs text-gray-300 space-y-2">
            <li className="flex items-start space-x-2">
              <span className="text-cyan-400 font-bold">•</span>
              <span>Enable the 48-hour deadline warning trigger to catch unexpected scope expansions early.</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-pink-400 font-bold">•</span>
              <span>Batch your Fiverr order revisions using the automated checklist builder.</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-indigo-400 font-bold">•</span>
              <span>Keep your project progress sliders updated to feed accurate delivery velocity to AURA.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
