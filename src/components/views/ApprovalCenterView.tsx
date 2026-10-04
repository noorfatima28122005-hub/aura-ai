import React, { useState } from 'react';
import { AiApprovalItem, WorkspaceData } from '../../types';
import {
  ShieldAlert,
  Check,
  X,
  Edit3,
  HelpCircle,
  FileSearch,
  Zap,
  CheckCircle2,
  Mail,
  ShoppingCart,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface ApprovalCenterViewProps {
  approvals: AiApprovalItem[];
  onApprove: (item: AiApprovalItem) => void;
  onReject: (itemId: string) => void;
  onEditAndApprove: (item: AiApprovalItem, updatedProposal: string) => void;
}

export const ApprovalCenterView: React.FC<ApprovalCenterViewProps> = ({
  approvals,
  onApprove,
  onReject,
  onEditAndApprove,
}) => {
  const [editingItem, setEditingItem] = useState<AiApprovalItem | null>(null);
  const [editText, setEditText] = useState('');

  const safeApprovals = Array.isArray(approvals) ? approvals : [];
  const pendingList = safeApprovals.filter((a) => a && a.status === 'Pending');
  const processedList = safeApprovals.filter((a) => a && a.status !== 'Pending');

  const handleStartEdit = (item: AiApprovalItem) => {
    setEditingItem(item);
    setEditText(item.whatAuraWantsToDo);
  };

  const handleSaveEdit = () => {
    if (editingItem) {
      onEditAndApprove(editingItem, editText);
      setEditingItem(null);
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'fiverr':
        return <ShoppingCart className="w-4 h-4 text-emerald-400" />;
      case 'email':
        return <Mail className="w-4 h-4 text-blue-400" />;
      case 'invoice':
        return <Zap className="w-4 h-4 text-pink-400" />;
      default:
        return <Clock className="w-4 h-4 text-purple-400" />;
    }
  };

  return (
    <div id="view-approval-center" className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header with Core Philosophy Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0D1220] via-[#111827] to-[#080B14] border border-pink-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-pink-400 uppercase tracking-wider mb-1">
            <ShieldAlert className="w-4 h-4" />
            <span>HUMAN GOVERNANCE PROTOCOL</span>
          </div>
          <h2 className="text-2xl font-display font-extrabold text-white">
            AI Approval Center
          </h2>
          <p className="text-xs text-gray-400 mt-1 max-w-xl">
            AURA continuously monitors connected accounts and project telemetry.
            Actions will <strong className="text-white">never</strong> execute
            silently without your explicit review and sign-off.
          </p>
        </div>

        <div className="flex items-center space-x-3 bg-pink-950/20 border border-pink-500/30 px-4 py-2.5 rounded-xl text-xs text-pink-300">
          <span className="font-bold text-lg text-white">
            {pendingList.length}
          </span>
          <span className="leading-tight">
            Pending Human
            <br />
            Decisions
          </span>
        </div>
      </div>

      {/* Visual Workflow Explainer per Section 24 */}
      <div className="aura-card p-4 rounded-xl border border-white/5 text-xs text-gray-400">
        <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider block mb-2">
          Verified Decision Pipeline (Connection → AI Flow)
        </span>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="px-2 py-1 rounded bg-[#0D1220] border border-white/10 text-gray-300">
            Fiverr / Email Sync
          </span>
          <ArrowRight className="w-3 h-3 text-gray-500" />
          <span className="px-2 py-1 rounded bg-[#0D1220] border border-white/10 text-gray-300">
            Context Understanding
          </span>
          <ArrowRight className="w-3 h-3 text-gray-500" />
          <span className="px-2 py-1 rounded bg-[#0D1220] border border-white/10 text-gray-300">
            Identifies Client & Deadline
          </span>
          <ArrowRight className="w-3 h-3 text-gray-500" />
          <span className="px-2 py-1 rounded bg-indigo-950/60 border border-indigo-500/40 text-cyan-300 font-semibold">
            Suggests Action
          </span>
          <ArrowRight className="w-3 h-3 text-gray-500" />
          <span className="px-2 py-1 rounded bg-pink-950/60 border border-pink-500/40 text-pink-300 font-bold">
            Human Reviews & Decides
          </span>
        </div>
      </div>

      {/* Pending Approvals List */}
      <div className="space-y-6">
        <h3 className="text-base font-display font-bold text-white flex items-center space-x-2">
          <span>Awaiting Review ({pendingList.length})</span>
        </h3>

        {pendingList.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-white/10 rounded-2xl bg-[#080B14]/40 p-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <h4 className="text-base font-semibold text-white">
              All clear. No pending approvals.
            </h4>
            <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
              AURA will queue recommendations here whenever external changes,
              Fiverr revisions, or milestone risks are detected.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingList.map((item) => (
              <div
                key={item.id}
                id={`approval-item-${item.id}`}
                className="aura-card p-6 rounded-2xl border border-indigo-500/30 space-y-4 shadow-sm"
              >
                {/* Card Title & Meta */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-[#0D1220] border border-white/10 flex items-center justify-center">
                      {getSourceIcon(item.source)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        {item.title}
                      </h4>
                      <span className="text-[10px] text-gray-400">
                        Detected {item.timestamp} · Source:{' '}
                        <span className="capitalize text-gray-300">
                          {item.source}
                        </span>
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-bold px-2.5 py-1 rounded-full bg-amber-950/40 text-amber-300 border border-amber-500/30 self-start sm:self-auto">
                    Action Required
                  </span>
                </div>

                {/* 4 Standard Explanations per Section 28 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* What Happened? */}
                  <div className="p-3 rounded-xl bg-[#080B14] border border-white/5">
                    <span className="font-bold text-gray-400 uppercase text-[10px] tracking-wider block mb-1">
                      1. What happened?
                    </span>
                    <p className="text-gray-200 leading-relaxed">
                      {item.whatHappened}
                    </p>
                  </div>

                  {/* Why did AURA detect it? */}
                  <div className="p-3 rounded-xl bg-[#080B14] border border-white/5">
                    <span className="font-bold text-gray-400 uppercase text-[10px] tracking-wider block mb-1">
                      2. Why did AURA detect it?
                    </span>
                    <p className="text-gray-200 leading-relaxed">
                      {item.whyDetected}
                    </p>
                  </div>

                  {/* What does AURA want to do? */}
                  <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/20">
                    <span className="font-bold text-cyan-400 uppercase text-[10px] tracking-wider block mb-1">
                      3. What does AURA want to do?
                    </span>
                    <p className="text-white font-medium leading-relaxed">
                      {item.whatAuraWantsToDo}
                    </p>
                  </div>

                  {/* What data was used? */}
                  <div className="p-3 rounded-xl bg-[#080B14] border border-white/5">
                    <span className="font-bold text-gray-400 uppercase text-[10px] tracking-wider block mb-1">
                      4. What data was used?
                    </span>
                    <p className="text-gray-400 font-mono text-[11px] leading-relaxed">
                      {item.dataUsed}
                    </p>
                  </div>
                </div>

                {/* Action Buttons per Section 25: Approve, Edit, Reject */}
                <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-white/5">
                  <button
                    onClick={() => handleStartEdit(item)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white bg-[#0D1220] border border-white/10 hover:bg-[#151B2B] flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Edit Proposal</span>
                  </button>

                  <button
                    onClick={() => onReject(item.id)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:text-rose-200 bg-rose-950/30 border border-rose-500/30 hover:bg-rose-900/40 flex items-center space-x-1.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>

                  <button
                    onClick={() => onApprove(item)}
                    className="aura-gradient-btn px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md shadow-indigo-600/30 flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve & Execute</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History of Decisions */}
      {processedList.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-white/5">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
            Decision Audit Trail ({processedList.length})
          </h3>
          <div className="space-y-2">
            {processedList.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl bg-[#080B14] border border-white/5 flex items-center justify-between text-xs"
              >
                <div className="flex items-center space-x-3">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      item.status === 'Approved'
                        ? 'bg-emerald-400 shadow-sm shadow-emerald-400'
                        : 'bg-rose-400'
                    }`}
                  />
                  <div>
                    <p className="font-semibold text-white">{item.title}</p>
                    <p className="text-[10px] text-gray-400">
                      {item.whatAuraWantsToDo}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    item.status === 'Approved'
                      ? 'text-emerald-300 bg-emerald-950/50'
                      : 'text-rose-300 bg-rose-950/50'
                  }`}
                >
                  {item.status} by Human
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="aura-card max-w-lg w-full p-6 rounded-2xl border border-indigo-500/40 space-y-4">
            <h3 className="text-lg font-bold text-white">
              Edit AURA Recommendation
            </h3>
            <p className="text-xs text-gray-400">
              Customize the proposed action before signing off with human
              approval.
            </p>
            <textarea
              rows={4}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full bg-[#080B14] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="aura-gradient-btn px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm"
              >
                Save & Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
