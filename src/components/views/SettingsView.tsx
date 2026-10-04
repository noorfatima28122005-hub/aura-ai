import React, { useState } from 'react';
import { UserProfile, WorkspaceData } from '../../types';
import { Settings, ShieldCheck, User, Bell, Database, Trash2, Check } from 'lucide-react';

interface SettingsViewProps {
  user: UserProfile;
  onUpdateUser: (user: UserProfile) => void;
  onResetWorkspace: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  onUpdateUser,
  onResetWorkspace,
}) => {
  const [name, setName] = useState(user.name);
  const [company, setCompany] = useState(user.companyName);
  const [email, setEmail] = useState(user.email);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser({
      ...user,
      name,
      companyName: company,
      email,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div id="view-settings" className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h2 className="text-2xl font-display font-extrabold text-white tracking-tight">
          Workspace Settings & Governance
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          Manage your organization profile, human governance policies, and API connections.
        </p>
      </div>

      {/* Profile settings */}
      <div className="aura-card p-6 rounded-2xl border border-white/5 space-y-4">
        <div className="flex items-center space-x-2 text-sm font-bold text-white">
          <User className="w-4 h-4 text-indigo-400" />
          <span>Operator Profile</span>
        </div>

        <form onSubmit={handleSave} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-300 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#080B14] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-300 mb-1">Business / Brand Name</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full bg-[#080B14] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-300 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#080B14] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="aura-gradient-btn px-4 py-2 rounded-xl text-xs font-semibold text-white flex items-center space-x-1.5 shadow-sm"
            >
              {saved && <Check className="w-3.5 h-3.5" />}
              <span>{saved ? 'Saved Successfully' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Governance policy per Section 25 & 29 */}
      <div className="aura-card p-6 rounded-2xl border border-white/5 space-y-3">
        <div className="flex items-center space-x-2 text-sm font-bold text-white">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span>AURA Governance & Safeguard Policies</span>
        </div>
        <p className="text-xs text-gray-300 leading-relaxed">
          The fundamental constraint of AURA OS is{' '}
          <strong className="text-cyan-300">"AI assists. Human decides."</strong> All automated
          proposals originating from Fiverr hooks, Email message parsing, or invoice reminders require
          explicit human approval before triggering outbound API calls.
        </p>
        <div className="p-3 rounded-xl bg-[#080B14] border border-white/5 text-xs text-emerald-400 flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 flex-shrink-0" />
          <span>Strict Human-in-the-Loop Governance: Enforced</span>
        </div>
      </div>

      {/* Reset workspace */}
      <div className="aura-card p-6 rounded-2xl border border-rose-500/20 bg-rose-950/10 space-y-3">
        <div className="flex items-center space-x-2 text-sm font-bold text-rose-300">
          <Trash2 className="w-4 h-4" />
          <span>Data Storage Management</span>
        </div>
        <p className="text-xs text-gray-400">
          Reset all current workspace data back to a clean slate (0 clients, 0 projects, 0 tasks, $0 revenue).
        </p>
        <button
          onClick={() => {
            if (confirm('Are you sure you want to reset your workspace to zero data?')) {
              onResetWorkspace();
            }
          }}
          className="px-4 py-2 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 hover:bg-rose-900/40 text-xs font-semibold cursor-pointer"
        >
          Reset To Clean Slate (0 Data)
        </button>
      </div>
    </div>
  );
};
