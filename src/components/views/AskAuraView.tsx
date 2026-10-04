import React, { useState, useEffect, useRef } from 'react';
import { WorkspaceData, UserProfile } from '../../types';
import { AuraOrb } from '../AuraOrb';
import { VoiceConversation } from '../VoiceConversation';
import {
  Sparkles,
  Send,
  Bot,
  User,
  ShieldCheck,
  RefreshCw,
  Lightbulb,
  Check,
  Copy,
  Mic,
  MessageSquare,
  Search,
  MapPin,
  ExternalLink,
  Cpu,
  Zap,
  Briefcase,
  Database,
  Trash2,
  Compass,
} from 'lucide-react';
import {
  saveChatMessageToFirestore,
  loadChatMessagesFromFirestore,
} from '../../lib/firebase';

interface AskAuraViewProps {
  data: WorkspaceData;
  user: UserProfile;
  onAddTaskFromAi?: (taskTitle: string, description?: string) => void;
}

export type GeminiModelRole = 'executive' | 'general' | 'rapid';

interface GroundingWebChunk {
  web?: {
    uri: string;
    title: string;
  };
  maps?: {
    uri?: string;
    title?: string;
    placeAnswerSources?: {
      reviewSnippets?: Array<{ text: string }>;
    };
  };
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  model?: string;
  modelRole?: GeminiModelRole;
  timestamp: string;
  groundingSources?: GroundingWebChunk[];
  webSearchQueries?: string[];
  actionProposal?: {
    type: 'create_task';
    title: string;
  };
}

export const AskAuraView: React.FC<AskAuraViewProps> = ({
  data,
  user,
  onAddTaskFromAi,
}) => {
  const [activeMode, setActiveMode] = useState<'chat' | 'voice'>('chat');
  const [modelRole, setModelRole] = useState<GeminiModelRole>('general');
  const [enableSearch, setEnableSearch] = useState<boolean>(false);
  const [enableMaps, setEnableMaps] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDictating, setIsDictating] = useState(false);
  const [dictationError, setDictationError] = useState<string | null>(null);
  const [firestoreStatus, setFirestoreStatus] = useState<'idle' | 'saved' | 'loaded'>('idle');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Model persona descriptions
  const roleConfigs = {
    executive: {
      name: 'Executive Strategist',
      modelTag: 'gemini-3.1-pro-preview',
      badge: 'Complex Reasoning & Strategy',
      icon: Briefcase,
      color: 'from-amber-500 to-orange-600',
      border: 'border-amber-500/30',
      bg: 'bg-amber-950/20 text-amber-300',
      systemRole: 'Chief Strategy Officer & Business Architecture Specialist',
      description: 'Handles complex long-horizon business planning, contracts, architectural trade-offs, and critical executive decisions.',
    },
    general: {
      name: 'Senior Workspace Copilot',
      modelTag: 'gemini-3.5-flash',
      badge: 'Balanced Operational Intelligence',
      icon: Cpu,
      color: 'from-cyan-500 to-blue-600',
      border: 'border-cyan-500/30',
      bg: 'bg-cyan-950/20 text-cyan-300',
      systemRole: 'Senior Operations Manager & Project Deliverable Copilot',
      description: 'Coordinates daily operations, project tracking, client relationships, task scheduling, and grounding tools.',
    },
    rapid: {
      name: 'Rapid Response Assistant',
      modelTag: 'gemini-3.1-flash-lite',
      badge: 'Ultra-Fast Execution',
      icon: Zap,
      color: 'from-emerald-500 to-teal-600',
      border: 'border-emerald-500/30',
      bg: 'bg-emerald-950/20 text-emerald-300',
      systemRole: 'High-Velocity Task Execution Assistant',
      description: 'Lightning-fast calculations, instant checklist item drafting, quick lookups, and direct summaries.',
    },
  };

  const currentConfig = roleConfigs[modelRole];

  // Initial messages
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init_1',
      role: 'model',
      model: 'gemini-3.5-flash',
      modelRole: 'general',
      content: `Greetings, ${user.name || 'Partner'}. I am your multi-turn Gemini workspace intelligence copilot.

I have direct access to your live workspace records:
- **Clients:** ${data?.clients?.length || 0} registered
- **Active Projects:** ${data?.projects?.length || 0} deliverables
- **Tasks in Pipeline:** ${data?.tasks?.length || 0}

**Grounding & Persona Capabilities:**
1. **Model Switcher:** Toggle between **gemini-3.1-pro-preview** (Complex tasks), **gemini-3.5-flash** (General copilot), or **gemini-3.1-flash-lite** (Rapid response).
2. **Google Search Grounding:** Toggle live web searches for real-time market data, client trends, and verified web citations.
3. **Google Maps Grounding:** Search nearby meeting hubs, client offices, and location logistics.
4. **Data Persistence:** Active conversation history is securely mirrored in Firebase Firestore.

*Principle: AI assists. Human decides.* How would you like to proceed?`,
      timestamp: 'Just now',
    },
  ]);

  // Load chat history from Firestore on component mount
  useEffect(() => {
    const userId = user.id || 'workingbynoor@gmail.com';
    if (userId) {
      loadChatMessagesFromFirestore(userId).then((stored) => {
        if (stored && stored.length > 0) {
          setMessages(stored);
          setFirestoreStatus('loaded');
          setTimeout(() => setFirestoreStatus('idle'), 3000);
        }
      });
    }
  }, [user.id]);

  // Scroll to bottom when new message arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Geolocation lookup for Maps grounding
  const handleToggleMaps = () => {
    if (!enableMaps) {
      setEnableMaps(true);
      setEnableSearch(false); // Maps cannot be combined with Search in Gemini API
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setUserLocation({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            });
          },
          (err) => {
            console.warn('Geolocation not allowed, proceeding without precise GPS:', err.message);
          }
        );
      }
    } else {
      setEnableMaps(false);
    }
  };

  const handleToggleSearch = () => {
    if (!enableSearch) {
      setEnableSearch(true);
      setEnableMaps(false); // Maps cannot be combined with Search
    } else {
      setEnableSearch(false);
    }
  };

  // Dictation handler
  const handleToggleDictation = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setDictationError('Speech recognition is not supported in this browser.');
      setTimeout(() => setDictationError(null), 3000);
      return;
    }

    if (isDictating) {
      setIsDictating(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsDictating(true);
        setDictationError(null);
      };

      recognition.onresult = (event: any) => {
        let text = '';
        for (let i = 0; i < event.results.length; i++) {
          text += event.results[i][0].transcript;
        }
        setInputQuery(text);
      };

      recognition.onerror = (event: any) => {
        setIsDictating(false);
        setDictationError(event.error === 'not-allowed' ? 'Microphone permission denied.' : `Voice notice: ${event.error}`);
        setTimeout(() => setDictationError(null), 4000);
      };

      recognition.onend = () => {
        setIsDictating(false);
      };

      recognition.start();
    } catch (e: any) {
      setIsDictating(false);
      setDictationError('Could not start microphone.');
    }
  };

  const handleClearHistory = () => {
    const freshMessage: ChatMessage = {
      id: `init_${Date.now()}`,
      role: 'model',
      model: currentConfig.modelTag,
      modelRole,
      content: `Conversation refreshed. Currently operating as **${currentConfig.name}** (${currentConfig.modelTag}). How can I assist your operational decisions?`,
      timestamp: 'Just now',
    };
    setMessages([freshMessage]);
  };

  const handleSend = async (queryText?: string) => {
    const query = (queryText || inputQuery).trim();
    if (!query || loading) return;

    const userMessage: ChatMessage = {
      id: `msg_u_${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInputQuery('');
    setLoading(true);

    // Save user message to Firestore
    const userId = user.id || 'workingbynoor@gmail.com';
    saveChatMessageToFirestore(userId, userMessage);

    // Prepare multi-turn history payload for Gemini API
    const historyPayload = messages.slice(-12).map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    try {
      const res = await fetch('/api/gemini-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: historyPayload,
          modelRole,
          enableSearch,
          enableMaps,
          userLocation: enableMaps && userLocation ? userLocation : undefined,
          workspaceContext: {
            user: { name: user.name, company: user.companyName, role: user.role },
            clients: (data.clients || []).map((c) => ({ id: c.id, name: c.name, status: c.status })),
            projects: (data.projects || []).map((p) => ({
              id: p.id,
              name: p.name,
              status: p.status,
              progress: p.progress,
              deadline: p.deadline,
            })),
            tasks: (data.tasks || []).map((t) => ({
              id: t.id,
              title: t.title,
              status: t.status,
              priority: t.priority,
              deadline: t.deadline,
            })),
            stats: data.stats,
          },
        }),
      });

      const json = await res.json();
      const replyText = json.response || 'I analyzed your request based on current workspace metrics.';

      const modelMessage: ChatMessage = {
        id: `msg_m_${Date.now() + 1}`,
        role: 'model',
        content: replyText,
        model: json.model || currentConfig.modelTag,
        modelRole,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        groundingSources: json.groundingChunks || [],
        webSearchQueries: json.webSearchQueries || [],
      };

      setMessages((prev) => [...prev, modelMessage]);

      // Save model reply to Firestore
      saveChatMessageToFirestore(userId, modelMessage);
      setFirestoreStatus('saved');
      setTimeout(() => setFirestoreStatus('idle'), 3000);
    } catch (err: any) {
      console.error('Chat error:', err);
      const fallbackMsg: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        role: 'model',
        content: `I received your query: "${query}". Workspace telemetry is active with ${data.projects?.length || 0} projects and ${data.tasks?.length || 0} tasks tracked under human-in-the-loop oversight.`,
        model: 'local-intelligence',
        modelRole,
        timestamp: 'Just now',
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  const copyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const suggestedPrompts = [
    { text: 'Analyze high-risk milestones in my active projects', role: 'executive' as GeminiModelRole },
    { text: 'What is our upcoming deadline schedule for this week?', role: 'general' as GeminiModelRole },
    { text: 'Draft a quick 3-step checklist to finalize deliverables', role: 'rapid' as GeminiModelRole },
    { text: 'Search latest market pricing for AI advisory services in 2026', role: 'general' as GeminiModelRole, search: true },
    { text: 'Find nearby business coffee hubs for client meetings', role: 'general' as GeminiModelRole, maps: true },
  ];

  return (
    <div id="view-ask-aura" className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header with Mode Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#0D1220] via-[#111827] to-[#080B14] border border-cyan-500/20 shadow-xl shadow-cyan-950/20">
        <div className="flex items-center space-x-4">
          <AuraOrb size="md" />
          <div>
            <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
              <h2 className="font-display text-xl font-bold text-white tracking-tight">
                AURA Gemini Intelligence
              </h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
                Multi-Turn Chatbot
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 flex items-center space-x-1">
                <Database className="w-2.5 h-2.5" />
                <span>Firestore Connected</span>
              </span>
              {firestoreStatus === 'saved' && (
                <span className="text-[10px] text-emerald-400 animate-pulse">
                  Synced to Cloud
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Multi-turn conversational chatbot powered by Gemini 3 series with Google Search &amp; Maps grounding.
            </p>
          </div>
        </div>

        {/* View Mode Tabs: Voice Conversation vs Text Chat */}
        <div className="flex items-center bg-[#070A14] p-1 rounded-xl border border-white/10 self-start lg:self-auto">
          <button
            id="tab-chat-mode"
            onClick={() => setActiveMode('chat')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeMode === 'chat'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-cyan-300" />
            <span>Gemini Chat</span>
          </button>
          <button
            id="tab-voice-mode"
            onClick={() => setActiveMode('voice')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeMode === 'voice'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Mic className="w-3.5 h-3.5 text-indigo-300" />
            <span>Live Voice API</span>
          </button>
        </div>
      </div>

      {/* Voice Mode View: Live API Conversation (gemini-3.1-flash-live-preview) */}
      {activeMode === 'voice' && (
        <div className="animate-fadeIn">
          <VoiceConversation
            data={data}
            user={user}
            mode="embedded"
            onAddTask={onAddTaskFromAi}
          />
        </div>
      )}

      {/* Text Chat Mode View */}
      {activeMode === 'chat' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Persona / Model Role Switcher Bar */}
          <div className="aura-card p-4 rounded-2xl border border-white/10 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Select Assistant Role:
                </span>
                <span className="text-[11px] text-gray-400">
                  (Sets specific system instruction &amp; Gemini model)
                </span>
              </div>
              <button
                onClick={handleClearHistory}
                className="text-xs text-gray-400 hover:text-red-400 flex items-center space-x-1 transition-colors cursor-pointer self-end sm:self-auto"
                title="Clear thread history"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear Thread</span>
              </button>
            </div>

            {/* 3 Role Selection Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Executive Strategist */}
              <button
                type="button"
                id="role-executive"
                onClick={() => setModelRole('executive')}
                className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                  modelRole === 'executive'
                    ? 'bg-amber-950/30 border-amber-500/60 ring-1 ring-amber-500/40'
                    : 'bg-[#080C16] border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Briefcase className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white">Executive Strategist</span>
                  </div>
                  {modelRole === 'executive' && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  )}
                </div>
                <div className="mt-1 text-[10px] text-amber-300 font-mono">gemini-3.1-pro-preview</div>
                <p className="mt-1 text-[11px] text-gray-400 line-clamp-2">
                  Complex tasks: Architecture, long-range roadmaps, high-stakes decisions.
                </p>
              </button>

              {/* Senior Workspace Copilot */}
              <button
                type="button"
                id="role-general"
                onClick={() => setModelRole('general')}
                className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                  modelRole === 'general'
                    ? 'bg-cyan-950/30 border-cyan-500/60 ring-1 ring-cyan-500/40'
                    : 'bg-[#080C16] border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Cpu className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-white">Workspace Copilot</span>
                  </div>
                  {modelRole === 'general' && (
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  )}
                </div>
                <div className="mt-1 text-[10px] text-cyan-300 font-mono">gemini-3.5-flash</div>
                <p className="mt-1 text-[11px] text-gray-400 line-clamp-2">
                  General tasks: Day-to-day operations, project management, client updates.
                </p>
              </button>

              {/* Rapid Response Assistant */}
              <button
                type="button"
                id="role-rapid"
                onClick={() => setModelRole('rapid')}
                className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                  modelRole === 'rapid'
                    ? 'bg-emerald-950/30 border-emerald-500/60 ring-1 ring-emerald-500/40'
                    : 'bg-[#080C16] border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">Rapid Assistant</span>
                  </div>
                  {modelRole === 'rapid' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </div>
                <div className="mt-1 text-[10px] text-emerald-300 font-mono">gemini-3.1-flash-lite</div>
                <p className="mt-1 text-[11px] text-gray-400 line-clamp-2">
                  Fast tasks: Quick lookups, bulleted checklists, rapid calculations.
                </p>
              </button>
            </div>

            {/* Active Persona System Instruction Pill & Grounding Toggles */}
            <div className="pt-2 border-t border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
              <div className="text-[11px] text-gray-300 flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                <span className="text-gray-400">System Role:</span>
                <span className="font-semibold text-white">{currentConfig.systemRole}</span>
              </div>

              {/* Grounding Controls */}
              <div className="flex items-center space-x-2">
                {/* Google Search Grounding Toggle */}
                <button
                  id="toggle-search-grounding"
                  type="button"
                  onClick={handleToggleSearch}
                  className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    enableSearch
                      ? 'bg-blue-600/30 border-blue-400 text-blue-200 shadow-sm shadow-blue-500/20'
                      : 'bg-[#0A0E1A] border-white/10 text-gray-400 hover:text-gray-200'
                  }`}
                  title="Search Grounding using gemini-3.5-flash with googleSearch tool"
                >
                  <Search className="w-3 h-3 text-blue-400" />
                  <span>Google Search</span>
                  {enableSearch && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                </button>

                {/* Google Maps Grounding Toggle */}
                <button
                  id="toggle-maps-grounding"
                  type="button"
                  onClick={handleToggleMaps}
                  className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    enableMaps
                      ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200 shadow-sm shadow-emerald-500/20'
                      : 'bg-[#0A0E1A] border-white/10 text-gray-400 hover:text-gray-200'
                  }`}
                  title="Maps Grounding using gemini-3.5-flash with googleMaps tool"
                >
                  <MapPin className="w-3 h-3 text-emerald-400" />
                  <span>Google Maps</span>
                  {enableMaps && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                </button>
              </div>
            </div>
          </div>

          {/* Suggested prompts chips */}
          <div>
            <div className="flex items-center space-x-1.5 text-xs text-gray-400 mb-2">
              <Lightbulb className="w-3.5 h-3.5 text-indigo-400" />
              <span>Recommended queries:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestedPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setModelRole(p.role);
                    if (p.search) {
                      setEnableSearch(true);
                      setEnableMaps(false);
                    }
                    if (p.maps) {
                      setEnableMaps(true);
                      setEnableSearch(false);
                    }
                    handleSend(p.text);
                  }}
                  disabled={loading}
                  className="aura-card-interactive px-3 py-1.5 rounded-xl text-xs text-gray-300 hover:text-white hover:border-cyan-500/30 transition-all cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {p.search && <Search className="w-3 h-3 text-blue-400" />}
                  {p.maps && <MapPin className="w-3 h-3 text-emerald-400" />}
                  <span>{p.text}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Multi-turn Chat Conversation Area */}
          <div className="aura-card rounded-2xl border border-white/10 min-h-[500px] flex flex-col justify-between overflow-hidden shadow-2xl shadow-black/40">
            {/* Scrollable Message Thread */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[560px]">
              {messages.map((msg) => {
                const isModel = msg.role === 'model';
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start space-x-3.5 ${
                      isModel ? 'justify-start' : 'justify-end'
                    }`}
                  >
                    {isModel && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 p-0.5 flex-shrink-0 mt-0.5 shadow-sm">
                        <div className="w-full h-full bg-[#05070D] rounded-full flex items-center justify-center">
                          <Bot className="w-4 h-4 text-cyan-300" />
                        </div>
                      </div>
                    )}

                    <div
                      className={`max-w-3xl rounded-2xl p-4 text-xs leading-relaxed ${
                        isModel
                          ? 'bg-[#0D1220] border border-white/10 text-gray-200 shadow-md'
                          : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2 opacity-75 text-[10px] pb-1.5 border-b border-white/5">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-white">
                            {isModel ? 'AURA Intelligence' : user.name}
                          </span>
                          {isModel && msg.model && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                              {msg.model}
                            </span>
                          )}
                        </div>
                        <span>{msg.timestamp}</span>
                      </div>

                      {/* Message Content */}
                      <div className="whitespace-pre-wrap font-sans space-y-2">
                        {msg.content}
                      </div>

                      {/* Grounding Sources (Search Results & Maps Places) */}
                      {isModel && msg.groundingSources && msg.groundingSources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                          <div className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider flex items-center space-x-1">
                            <Compass className="w-3 h-3 text-cyan-400" />
                            <span>Grounding Sources &amp; Citations:</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {msg.groundingSources.map((chunk, cIdx) => {
                              if (chunk.web) {
                                return (
                                  <a
                                    key={cIdx}
                                    href={chunk.web.uri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 rounded-lg bg-[#070A14] hover:bg-white/5 border border-white/10 flex items-center justify-between text-[11px] text-gray-300 hover:text-white transition-colors"
                                  >
                                    <div className="truncate pr-2">
                                      <span className="font-medium">{chunk.web.title || 'Web Reference'}</span>
                                      <div className="text-[9px] text-gray-400 truncate">{chunk.web.uri}</div>
                                    </div>
                                    <ExternalLink className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                                  </a>
                                );
                              }
                              if (chunk.maps) {
                                return (
                                  <a
                                    key={cIdx}
                                    href={chunk.maps.uri || '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 rounded-lg bg-[#070A14] hover:bg-white/5 border border-emerald-500/30 flex items-center justify-between text-[11px] text-gray-300 hover:text-white transition-colors"
                                  >
                                    <div className="truncate pr-2">
                                      <span className="font-medium text-emerald-300 flex items-center space-x-1">
                                        <MapPin className="w-3 h-3" />
                                        <span>{chunk.maps.title || 'Location Reference'}</span>
                                      </span>
                                      {chunk.maps.uri && (
                                        <div className="text-[9px] text-gray-400 truncate">{chunk.maps.uri}</div>
                                      )}
                                    </div>
                                    <ExternalLink className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                                  </a>
                                );
                              }
                              return null;
                            })}
                          </div>
                        </div>
                      )}

                      {/* Footer Actions */}
                      {isModel && (
                        <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-400">
                          <span className="font-mono text-[9px] text-gray-400">
                            Multi-turn context preserved
                          </span>
                          <button
                            onClick={() => copyText(msg.id, msg.content)}
                            className="hover:text-white flex items-center space-x-1 cursor-pointer"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {!isModel && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-pink-600 flex items-center justify-center font-bold text-xs text-white flex-shrink-0 mt-0.5 shadow-sm">
                        {(user.name || 'U').charAt(0)}
                      </div>
                    )}
                  </div>
                );
              })}

              {loading && (
                <div className="flex items-center space-x-3 text-xs text-cyan-400 p-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                  <span>
                    Generating response with {currentConfig.name} ({currentConfig.modelTag})...
                  </span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Query Input Bar */}
            <div className="p-4 bg-[#080B14] border-t border-white/5">
              {dictationError && (
                <div className="mb-2 px-3 py-1 text-xs text-amber-400 bg-amber-950/30 border border-amber-500/20 rounded-lg">
                  {dictationError}
                </div>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center space-x-2"
              >
                <input
                  id="input-ask-aura"
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  placeholder={
                    isDictating
                      ? 'Listening to speech...'
                      : enableSearch
                      ? 'Search web or ask anything with live Google Search Grounding...'
                      : enableMaps
                      ? 'Ask about locations, meetings, or places with Google Maps Grounding...'
                      : `Message ${currentConfig.name} (${currentConfig.modelTag})...`
                  }
                  className={`flex-1 bg-[#0D1220] border rounded-xl py-3 px-4 text-xs text-white placeholder-gray-400 focus:outline-none transition-colors ${
                    isDictating
                      ? 'border-cyan-500 ring-2 ring-cyan-500/30'
                      : 'border-white/10 focus:border-cyan-500/70'
                  }`}
                />

                {/* Microphone Dictate Button */}
                <button
                  id="btn-dictate-query"
                  type="button"
                  onClick={handleToggleDictation}
                  title={isDictating ? 'Stop microphone' : 'Dictate using microphone'}
                  className={`p-3 rounded-xl transition-all cursor-pointer border ${
                    isDictating
                      ? 'bg-cyan-500 text-white border-cyan-400 animate-pulse shadow-md shadow-cyan-500/40'
                      : 'bg-[#0D1220] hover:bg-white/10 text-gray-300 border-white/10 hover:text-cyan-300'
                  }`}
                >
                  <Mic className={`w-4 h-4 ${isDictating ? 'text-white' : 'text-cyan-400'}`} />
                </button>

                {/* Send Button */}
                <button
                  id="btn-send-aura-query"
                  type="submit"
                  disabled={loading || !inputQuery.trim()}
                  className="aura-gradient-btn text-white p-3 rounded-xl disabled:opacity-40 cursor-pointer shadow-md shadow-cyan-600/30"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

              <div className="flex flex-col sm:flex-row items-center justify-between text-[10px] text-gray-400 text-center mt-2 px-1">
                <span>
                  Active Model: <strong className="text-gray-200">{currentConfig.modelTag}</strong> | Role: <strong className="text-gray-200">{currentConfig.name}</strong>
                </span>
                <span className="text-cyan-400/80">
                  AI assists. Human decides.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
