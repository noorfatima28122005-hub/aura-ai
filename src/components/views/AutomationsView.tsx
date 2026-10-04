import React, { useState } from 'react';
import { AutomationRule } from '../../types';
import {
  Zap,
  Plus,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Sliders,
  CheckCircle,
} from 'lucide-react';

interface AutomationsViewProps {
  rules: AutomationRule[];
  onToggleRule: (ruleId: string) => void;
  onAddRule: (rule: Omit<AutomationRule, 'id' | 'triggerCount'>) => void;
}

export const AutomationsView: React.FC<AutomationsViewProps> = ({
  rules,
  onToggleRule,
  onAddRule,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [trigger, setTrigger] = useState('New client message received');
  const [action, setAction] = useState('Draft proposal and notify for approval');
  const [requiresApproval, setRequiresApproval] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddRule({
      title,
      description,
      trigger,
      action,
      enabled: true,
      requiresHumanApproval: requiresApproval,
    });
    setIsModalOpen(false);
    setTitle('');
    setDescription('');
  };

  return (
    <div id="view-automations" className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#0D1220] via-[#111827] to-[#080B14] border border-indigo-500/20">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
            <Zap className="w-4 h-4" />
            <span>OPERATIONAL AUTOMATION ENGINE</span>
          </div>
          <h2 className="text-2xl font-display font-extrabold text-white">
            Automations & Triggers
          </h2>
          <p className="text-xs text-gray-400 mt-1 max-w-xl">
            Streamline repetitive operational tasks across Fiverr and Inboxes.
            Every sensitive external action queues into the AI Approval Center
            for human verification.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="aura-gradient-btn px-4 py-2 rounded-xl text-xs font-semibold text-white flex items-center space-x-1.5 shadow-sm shadow-indigo-600/30 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Automation</span>
        </button>
      </div>

      {/* Philosophy banner per Section 27 */}
      <div className="aura-card p-4 rounded-xl border border-white/5 flex items-start space-x-3 text-xs text-gray-400">
        <ShieldCheck className="w-4 h-4 text-pink-400 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="text-white">Human Approval Safeguard:</strong> By
          default, automated workflows operate under the{' '}
          <em className="text-cyan-300">"AI assists. Human decides."</em> policy.
          Outbound messages, payments, or client notifications are queued as
          proposals rather than sent autonomously.
        </div>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="aura-card p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-all space-y-3"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-2.5">
                  <h3 className="text-sm font-bold text-white">{rule.title}</h3>
                  {rule.requiresHumanApproval && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-950/60 text-pink-300 border border-pink-500/30">
                      Requires Human Approval
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400">{rule.description}</p>
              </div>

              {/* Toggle switch */}
              <button
                onClick={() => onToggleRule(rule.id)}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                  rule.enabled
                    ? 'bg-indigo-950/80 text-cyan-300 border border-indigo-500/40'
                    : 'bg-[#080B14] text-gray-500 border border-white/5'
                }`}
              >
                <span>{rule.enabled ? 'Active' : 'Paused'}</span>
                {rule.enabled ? (
                  <ToggleRight className="w-5 h-5 text-cyan-400" />
                ) : (
                  <ToggleLeft className="w-5 h-5 text-gray-500" />
                )}
              </button>
            </div>

            {/* Trigger -> Action Flow */}
            <div className="p-3 rounded-xl bg-[#080B14] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2 text-gray-300">
                <span className="text-[10px] font-bold uppercase text-gray-500">
                  Trigger:
                </span>
                <span className="font-mono text-cyan-300">{rule.trigger}</span>
              </div>

              <ArrowRight className="w-3.5 h-3.5 text-gray-600 hidden sm:block" />

              <div className="flex items-center space-x-2 text-gray-300">
                <span className="text-[10px] font-bold uppercase text-gray-500">
                  Action:
                </span>
                <span className="font-mono text-indigo-300">{rule.action}</span>
              </div>

              <span className="text-[10px] text-gray-500 text-right">
                Triggered {rule.triggerCount} time(s)
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* New Automation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="aura-card max-w-md w-full p-6 rounded-2xl border border-indigo-500/30 space-y-4">
            <h3 className="text-lg font-bold text-white">
              Create Automation Workflow
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-300 mb-1">
                  Workflow Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Inbound Lead Qualification"
                  className="w-full bg-[#080B14] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summarize what this automation accomplishes..."
                  className="w-full bg-[#080B14] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-300 mb-1">
                  Trigger Event (When X happens)
                </label>
                <input
                  type="text"
                  required
                  value={trigger}
                  onChange={(e) => setTrigger(e.target.value)}
                  className="w-full bg-[#080B14] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-300 mb-1">
                  Automated Action (Then do Z)
                </label>
                <input
                  type="text"
                  required
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  className="w-full bg-[#080B14] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="chk-approval"
                  checked={requiresApproval}
                  onChange={(e) => setRequiresApproval(e.target.checked)}
                  className="rounded border-gray-600"
                />
                <label
                  htmlFor="chk-approval"
                  className="text-xs text-gray-300 cursor-pointer"
                >
                  Require human approval in AI Approval Center before executing
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="aura-gradient-btn px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-sm"
                >
                  Save Automation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
