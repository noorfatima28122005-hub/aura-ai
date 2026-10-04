import React from 'react';
import { NavigationTab } from '../types';
import {
  Menu,
  Sparkles,
  Plus,
  ShieldCheck,
  RotateCcw,
  Database,
  Search,
  Mic,
} from 'lucide-react';

interface TopBarProps {
  currentTab: NavigationTab;
  onOpenMobile: () => void;
  onQuickAction: (action: 'client' | 'project' | 'task' | 'invoice') => void;
  onToggleSampleData: () => void;
  isSampleData: boolean;
  onAskAuraQuick: () => void;
  onOpenVoiceModal?: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentTab,
  onOpenMobile,
  onQuickAction,
  onToggleSampleData,
  isSampleData,
  onAskAuraQuick,
  onOpenVoiceModal,
  searchQuery,
  setSearchQuery,
}) => {
  const getTabTitle = (tab: NavigationTab) => {
    switch (tab) {
      case 'overview':
        return 'AURA Command Center';
      case 'clients':
        return 'Client Relationships';
      case 'projects':
        return 'Active Project Pipelines';
      case 'tasks':
        return 'Task Matrix';
      case 'calendar':
        return 'Deliverable Timelines & Calendar';
      case 'finance':
        return 'Finance & Cashflow';
      case 'analytics':
        return 'Workspace Analytics';
      case 'ask-aura':
        return 'Ask AURA Intelligence';
      case 'ai-insights':
        return 'Executive AI Insights';
      case 'approvals':
        return 'AI Approval Center';
      case 'automations':
        return 'Automation Engine';
      case 'connected-accounts':
        return 'Connected Accounts & Integrations';
      case 'settings':
        return 'Workspace Settings & Policies';
      default:
        return 'AURA Workspace';
    }
  };

  return (
    <header
      id="aura-topbar"
      className="sticky top-0 z-30 h-16 bg-[#05070D]/85 backdrop-blur-md border-b border-white/5 px-4 lg:px-8 flex items-center justify-between"
    >
      {/* Left title & mobile trigger */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onOpenMobile}
          className="lg:hidden p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#111827]"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base lg:text-lg font-display font-bold text-white tracking-tight flex items-center space-x-2">
            <span>{getTabTitle(currentTab)}</span>
          </h1>
        </div>
      </div>

      {/* Middle search bar */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search clients, projects, tasks, or ask AURA..."
            className="w-full bg-[#0D1220] border border-white/10 rounded-xl py-1.5 pl-9 pr-4 text-xs text-gray-200 placeholder-gray-400 focus:outline-none focus:border-indigo-500/60 transition-colors"
          />
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center space-x-2.5">
        {/* State Switcher (Clean 0-Data state vs Live Business state) */}
        <button
          id="btn-toggle-dataset"
          onClick={onToggleSampleData}
          title={
            isSampleData
              ? 'Click to switch to Pure Clean Slate (0 Clients, 0 Projects, $0)'
              : 'Click to populate Active Business Pipeline data for testing'
          }
          className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
            isSampleData
              ? 'bg-indigo-950/40 border-indigo-500/40 text-cyan-300 hover:bg-indigo-900/50'
              : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/40'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">
            {isSampleData ? 'Active Business Mode' : 'Clean Slate (0 Data)'}
          </span>
          <RotateCcw className="w-3 h-3 ml-0.5 opacity-70" />
        </button>

        {/* Voice Companion trigger button with Global Shortcut */}
        {onOpenVoiceModal && (
          <button
            id="btn-voice-companion-topbar"
            onClick={onOpenVoiceModal}
            title="Open AURA Voice Companion (Cmd/Ctrl + Shift + K)"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-cyan-500/40 bg-gradient-to-r from-cyan-950/50 to-indigo-950/40 text-cyan-300 hover:from-cyan-900/50 hover:to-indigo-900/50 text-xs font-semibold shadow-sm shadow-cyan-900/20 transition-all cursor-pointer group"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <Mic className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Voice</span>
            <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono font-medium text-cyan-300/90 bg-[#070B14] border border-cyan-500/30 rounded shadow-inner ml-0.5">
              ⌘⇧K
            </kbd>
          </button>
        )}

        {/* Quick Ask AURA trigger */}
        <button
          id="btn-ask-aura-quick"
          onClick={onAskAuraQuick}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-cyan-500/30 bg-cyan-950/20 text-cyan-300 hover:bg-cyan-900/30 text-xs font-semibold transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Ask AURA</span>
        </button>

        {/* Create action dropdown/button */}
        <div className="relative group">
          <button
            id="btn-quick-create"
            onClick={() => onQuickAction('task')}
            className="aura-gradient-btn text-white px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1 shadow-sm shadow-indigo-600/30 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        </div>
      </div>
    </header>
  );
};
