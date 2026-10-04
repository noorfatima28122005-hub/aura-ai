import React, { useState } from 'react';
import {
  History,
  Search,
  Volume2,
  Square,
  Copy,
  Check,
  Trash2,
  ArrowLeft,
  Clock,
  Sparkles,
  Mic,
  MessageSquare,
  Filter,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

export interface PastVoiceTranscript {
  id: string;
  timestamp: string;
  rawDate: string;
  language: string;
  languageCode?: string;
  userQuery: string;
  auraReply: string;
  category: 'Deliverables' | 'Clients' | 'Finance' | 'General';
  actionTaken?: string;
}

export interface VoiceConversationHistoryPanelProps {
  transcripts: PastVoiceTranscript[];
  onReplay: (text: string, langCode?: string, id?: string) => void;
  onStopAudio: () => void;
  currentlyPlayingId: string | null;
  onAskFollowUp: (transcript: PastVoiceTranscript) => void;
  onDeleteTranscript: (id: string) => void;
  onClearHistory: () => void;
  onResetDefaults: () => void;
  onBackToLive: () => void;
}

export const INITIAL_VOICE_HISTORY: PastVoiceTranscript[] = [
  {
    id: 'vt_seed_1',
    timestamp: 'Today, 10:15 AM',
    rawDate: new Date(Date.now() - 3600000 * 2).toISOString(),
    language: 'English (US)',
    languageCode: 'en-US',
    userQuery: 'What are my highest priority client deadlines this week?',
    auraReply:
      'You have 2 critical milestones due: Apex Global Mobile MVP tomorrow at 5:00 PM, and Nexus Brand Identity Guidelines on Friday. All assets for Apex are ready for your final review.',
    category: 'Deliverables',
    actionTaken: 'Milestones Verified',
  },
  {
    id: 'vt_seed_2',
    timestamp: 'Yesterday, 4:32 PM',
    rawDate: new Date(Date.now() - 3600000 * 22).toISOString(),
    language: 'English (US)',
    languageCode: 'en-US',
    userQuery: 'Draft a polite follow-up for the pending Horizon invoice.',
    auraReply:
      'I have prepared a courteous reminder for Horizon Media regarding Invoice #INV-2024-03 ($3,850), which is 4 days past due. The draft is waiting in your Approval Center for human authorization.',
    category: 'Finance',
    actionTaken: 'Draft Queued in Approvals',
  },
  {
    id: 'vt_seed_3',
    timestamp: 'Sep 10, 2:10 PM',
    rawDate: new Date(Date.now() - 3600000 * 48).toISOString(),
    language: 'English (US)',
    languageCode: 'en-US',
    userQuery: 'Summarize our active client pipeline and operational velocity.',
    auraReply:
      'Your workspace currently manages 4 client organizations across 6 active projects. Task completion velocity is 88% on-schedule, with zero blocked workstreams reported.',
    category: 'Clients',
    actionTaken: 'Operational Report Generated',
  },
  {
    id: 'vt_seed_4',
    timestamp: 'Sep 9, 11:20 AM',
    rawDate: new Date(Date.now() - 3600000 * 72).toISOString(),
    language: 'English (US)',
    languageCode: 'en-US',
    userQuery: 'Schedule a check-in with Liam from Sterling Co for design reviews.',
    auraReply:
      'I have configured a 30-minute calendar sync with Liam for Thursday at 11:00 AM EDT. The invitation draft is staged in your approval queue.',
    category: 'Deliverables',
    actionTaken: 'Calendar Draft Staged',
  },
  {
    id: 'vt_seed_5',
    timestamp: 'Sep 8, 3:45 PM',
    rawDate: new Date(Date.now() - 3600000 * 96).toISOString(),
    language: 'English (US)',
    languageCode: 'en-US',
    userQuery: 'Are there any blocked dependencies in the task matrix?',
    auraReply:
      'The API webhook integration task for CloudScale is waiting for third-party production credentials from their team. All other sprint items are moving smoothly.',
    category: 'General',
  },
];

const CATEGORY_COLORS: Record<PastVoiceTranscript['category'], { bg: string; text: string; border: string }> = {
  Deliverables: {
    bg: 'bg-indigo-950/60',
    text: 'text-indigo-300',
    border: 'border-indigo-500/30',
  },
  Clients: {
    bg: 'bg-cyan-950/60',
    text: 'text-cyan-300',
    border: 'border-cyan-500/30',
  },
  Finance: {
    bg: 'bg-emerald-950/60',
    text: 'text-emerald-300',
    border: 'border-emerald-500/30',
  },
  General: {
    bg: 'bg-purple-950/60',
    text: 'text-purple-300',
    border: 'border-purple-500/30',
  },
};

export const VoiceConversationHistoryPanel: React.FC<VoiceConversationHistoryPanelProps> = ({
  transcripts,
  onReplay,
  onStopAudio,
  currentlyPlayingId,
  onAskFollowUp,
  onDeleteTranscript,
  onClearHistory,
  onResetDefaults,
  onBackToLive,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter transcripts by search keyword and category
  const filteredTranscripts = transcripts.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesCategory;

    const matchesQuery =
      item.userQuery.toLowerCase().includes(query) ||
      item.auraReply.toLowerCase().includes(query) ||
      item.timestamp.toLowerCase().includes(query) ||
      (item.actionTaken && item.actionTaken.toLowerCase().includes(query));

    return matchesCategory && matchesQuery;
  });

  const handleCopyTranscript = (item: PastVoiceTranscript) => {
    const textToCopy = `[Voice Transcript - ${item.timestamp}]\nUser: "${item.userQuery}"\nAURA: "${item.auraReply}"${
      item.actionTaken ? `\nAction: ${item.actionTaken}` : ''
    }`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(item.id);
    setTimeout(() => {
      setCopiedId((prev) => (prev === item.id ? null : prev));
    }, 2000);
  };

  const categories = ['All', 'Deliverables', 'Finance', 'Clients', 'General'];

  return (
    <div
      id="panel-voice-conversation-history"
      className="flex flex-col h-full w-full bg-[#070A12] text-white"
    >
      {/* Panel Navigation & Context Header */}
      <div className="px-5 py-4 border-b border-white/10 bg-gradient-to-r from-[#0C1222] via-[#0A0E1A] to-[#070A12] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-cyan-950/70 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-sm shadow-cyan-900/40">
            <History className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="font-display text-sm font-bold text-white tracking-tight">
                Voice Conversation History
              </h4>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300">
                {transcripts.length} {transcripts.length === 1 ? 'Session' : 'Sessions'}
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              Scrollable list of recent transcripts from past AURA voice interactions for quick reference
            </p>
          </div>
        </div>

        {/* Back to Live Voice Mic Button */}
        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <button
            id="btn-back-to-live-voice"
            onClick={onBackToLive}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-sm shadow-cyan-900/30 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Live Mic</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 border-b border-white/5 bg-[#090D1A] flex flex-col sm:flex-row items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-voice-history"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transcripts by question, response, or keyword..."
            className="w-full bg-[#0E1528] border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500/60"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Filters */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          <Filter className="w-3 h-3 text-gray-400 hidden sm:block mr-0.5" />
          {categories.map((cat) => {
            const count =
              cat === 'All' ? transcripts.length : transcripts.filter((t) => t.category === cat).length;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-cyan-950 border-cyan-400 text-cyan-300'
                    : 'bg-[#0E1528] border-white/5 text-gray-400 hover:text-white'
                }`}
              >
                {cat} {count > 0 && <span className="opacity-70 text-[10px]">({count})</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable List of Past Transcripts */}
      <div className="flex-1 overflow-y-auto max-h-[460px] p-4 space-y-3.5 divide-y divide-white/5">
        {filteredTranscripts.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 mb-3">
              <History className="w-6 h-6 text-gray-500" />
            </div>
            <h5 className="text-sm font-semibold text-white mb-1">
              {searchQuery ? 'No transcripts match your search' : 'No voice interactions recorded yet'}
            </h5>
            <p className="text-xs text-gray-400 max-w-sm mb-4">
              {searchQuery
                ? `No transcripts found for "${searchQuery}". Try a different keyword or clear your filter.`
                : 'Start a voice conversation with AURA to automatically log your voice transcripts here for quick reference.'}
            </p>
            {searchQuery ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white transition-all cursor-pointer"
              >
                Reset Filters
              </button>
            ) : (
              <button
                onClick={onResetDefaults}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/60 text-xs font-semibold transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Load Reference Past Transcripts</span>
              </button>
            )}
          </div>
        ) : (
          filteredTranscripts.map((item) => {
            const isPlaying = currentlyPlayingId === item.id;
            const categoryStyle =
              CATEGORY_COLORS[item.category] || CATEGORY_COLORS.General;

            return (
              <div
                key={item.id}
                id={`transcript-card-${item.id}`}
                className="pt-3.5 first:pt-0 group transition-all"
              >
                <div className="bg-[#0B1020] border border-white/10 hover:border-cyan-500/30 rounded-2xl p-4 transition-all duration-200 shadow-sm hover:shadow-cyan-950/20">
                  {/* Card Metadata Top Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="flex items-center space-x-1 text-[11px] font-medium text-gray-400">
                        <Clock className="w-3 h-3 text-cyan-400/80" />
                        <span>{item.timestamp}</span>
                      </span>

                      {/* Category Badge */}
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${categoryStyle.bg} ${categoryStyle.text} ${categoryStyle.border}`}
                      >
                        {item.category}
                      </span>

                      {/* Language indicator */}
                      <span className="text-[10px] text-gray-400 px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
                        {item.language}
                      </span>
                    </div>

                    {/* Action pill if an action was taken */}
                    {item.actionTaken && (
                      <span className="flex items-center space-x-1 text-[10px] font-medium text-cyan-300 bg-cyan-950/70 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                        <span>{item.actionTaken}</span>
                      </span>
                    )}
                  </div>

                  {/* Transcript Content: User prompt & AURA response */}
                  <div className="space-y-2.5 text-xs">
                    {/* User Spoken Prompt */}
                    <div className="flex items-start space-x-2.5 bg-[#080C17] border border-white/5 rounded-xl p-2.5">
                      <div className="mt-0.5 w-5 h-5 rounded-lg bg-blue-950/70 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
                        <Mic className="w-3 h-3" />
                      </div>
                      <div className="flex-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-400 block mb-0.5">
                          You (Voice Prompt)
                        </span>
                        <p className="text-gray-200 font-medium leading-relaxed">
                          &ldquo;{item.userQuery}&rdquo;
                        </p>
                      </div>
                    </div>

                    {/* AURA Spoken Response */}
                    <div className="flex items-start space-x-2.5 bg-[#0E152B] border border-cyan-500/20 rounded-xl p-2.5">
                      <div className="mt-0.5 w-5 h-5 rounded-lg bg-cyan-950/80 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0">
                        <Sparkles className="w-3 h-3" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
                            AURA (Spoken Response)
                          </span>
                          {isPlaying && (
                            <span className="flex items-center space-x-1 text-[10px] text-cyan-300 animate-pulse font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                              <span>Playing audio...</span>
                            </span>
                          )}
                        </div>
                        <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                          {item.auraReply}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Transcript Actions Bar */}
                  <div className="mt-3 pt-2.5 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      {/* Play / Listen Voice */}
                      <button
                        id={`btn-replay-voice-${item.id}`}
                        onClick={() => {
                          if (isPlaying) {
                            onStopAudio();
                          } else {
                            onReplay(item.auraReply, item.languageCode, item.id);
                          }
                        }}
                        className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border ${
                          isPlaying
                            ? 'bg-purple-950 border-purple-400 text-purple-300 shadow-sm shadow-purple-900/50 animate-pulse'
                            : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/5 hover:text-cyan-300'
                        }`}
                        title={isPlaying ? 'Stop voice playback' : 'Listen to AURA voice response'}
                      >
                        {isPlaying ? (
                          <>
                            <Square className="w-3 h-3 fill-purple-300" />
                            <span>Stop Audio</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3 h-3 text-cyan-400" />
                            <span>Listen to AURA</span>
                          </>
                        )}
                      </button>

                      {/* Copy Transcript */}
                      <button
                        id={`btn-copy-transcript-${item.id}`}
                        onClick={() => handleCopyTranscript(item)}
                        className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5 hover:text-white transition-all cursor-pointer"
                        title="Copy conversation transcript"
                      >
                        {copiedId === item.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-300 font-semibold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-gray-400" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      {/* Ask Follow-up */}
                      <button
                        id={`btn-followup-transcript-${item.id}`}
                        onClick={() => onAskFollowUp(item)}
                        className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-300 border border-indigo-500/30 transition-all cursor-pointer"
                        title="Ask follow-up based on this topic"
                      >
                        <MessageSquare className="w-3 h-3 text-indigo-400" />
                        <span>Ask Follow-Up</span>
                      </button>
                    </div>

                    {/* Delete single item */}
                    <button
                      id={`btn-delete-transcript-${item.id}`}
                      onClick={() => onDeleteTranscript(item.id)}
                      className="p-1 rounded-md text-gray-500 hover:text-red-400 hover:bg-red-950/30 transition-all cursor-pointer"
                      title="Delete this transcript"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Bar with stats and clear action */}
      <div className="px-5 py-2.5 bg-[#050811] border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-[11px] text-gray-400 gap-2">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>Local storage persistence &middot; Transcripts stored on device</span>
        </div>

        <div className="flex items-center space-x-3">
          {transcripts.length > 0 && (
            <button
              id="btn-clear-voice-history"
              onClick={onClearHistory}
              className="text-[11px] text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
            >
              Clear History
            </button>
          )}

          <button
            id="btn-reset-voice-defaults"
            onClick={onResetDefaults}
            className="text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
          >
            Reset Sample Transcripts
          </button>
        </div>
      </div>
    </div>
  );
};
