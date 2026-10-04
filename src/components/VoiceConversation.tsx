import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  Volume1,
  VolumeX,
  Sparkles,
  RefreshCw,
  X,
  Play,
  Square,
  Languages,
  Sliders,
  Check,
  CornerDownLeft,
  ChevronDown,
  ShieldCheck,
  PlusCircle,
  HelpCircle,
  History,
  RotateCcw,
  Gauge,
  Minus,
  Plus,
  FastForward,
  Settings2,
} from 'lucide-react';
import { WorkspaceData, UserProfile } from '../types';
import {
  VoiceConversationHistoryPanel,
  PastVoiceTranscript,
  INITIAL_VOICE_HISTORY,
} from './VoiceConversationHistoryPanel';
import {
  saveVoicePreferencesToFirestore,
  loadVoicePreferencesFromFirestore,
} from '../lib/firebase';

export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface VoiceConversationProps {
  data: WorkspaceData;
  user: UserProfile;
  mode?: 'embedded' | 'modal' | 'floating';
  isOpen?: boolean;
  onClose?: () => void;
  onAddTask?: (title: string, description?: string) => void;
}

export interface VoiceMessage {
  id: string;
  sender: 'user' | 'aura';
  text: string;
  timestamp: string;
  source?: string;
  actionProposal?: {
    type: 'create_task';
    title: string;
    description?: string;
  };
}

const SUPPORTED_LANGUAGES = [
  { code: 'en-US', label: 'English (US)', name: 'English' },
  { code: 'en-GB', label: 'English (UK)', name: 'English (UK)' },
  { code: 'ur-PK', label: 'اردو (Urdu)', name: 'Urdu' },
  { code: 'es-ES', label: 'Español (Spanish)', name: 'Spanish' },
  { code: 'ar-SA', label: 'العربية (Arabic)', name: 'Arabic' },
  { code: 'fr-FR', label: 'Français (French)', name: 'French' },
  { code: 'de-DE', label: 'Deutsch (German)', name: 'German' },
  { code: 'hi-IN', label: 'हिन्दी (Hindi)', name: 'Hindi' },
  { code: 'pt-BR', label: 'Português (Portuguese)', name: 'Portuguese' },
  { code: 'it-IT', label: 'Italiano (Italian)', name: 'Italian' },
  { code: 'zh-CN', label: '中文 (Chinese)', name: 'Chinese' },
  { code: 'ja-JP', label: '日本語 (Japanese)', name: 'Japanese' },
];

export const VoiceConversation: React.FC<VoiceConversationProps> = ({
  data,
  user,
  mode = 'embedded',
  isOpen = true,
  onClose,
  onAddTask,
}) => {
  // Voice engine state
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Settings & Audio Control
  const [selectedLang, setSelectedLang] = useState('en-US');
  const [voiceSpeed, setVoiceSpeed] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('aura_voice_speed');
        if (saved) {
          const parsed = parseFloat(saved);
          if (!isNaN(parsed) && parsed >= 0.5 && parsed <= 2.0) return parsed;
        }
      } catch (e) {
        // ignore
      }
    }
    return 0.96; // Slightly relaxed conversational pacing
  });
  const [voiceVolume, setVoiceVolume] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('aura_voice_volume');
        if (saved) {
          const parsed = parseFloat(saved);
          if (!isNaN(parsed) && parsed >= 0 && parsed <= 1.0) return parsed;
        }
      } catch (e) {
        // ignore
      }
    }
    return 1.0; // Full volume by default
  });
  const [voicePitch, setVoicePitch] = useState<number>(1.06); // Warm, sweet, slightly elevated natural pitch
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('aura_voice_muted');
        if (saved) return saved === 'true';
      } catch (e) {
        // ignore
      }
    }
    return false;
  });
  const [showSettings, setShowSettings] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');

  // Debounced Firestore synchronization for voice preferences
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);

  const scheduleFirestoreSync = (speedVal: number, volVal: number, muteVal: boolean) => {
    if (!user?.id) return;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      saveVoicePreferencesToFirestore(user.id, {
        speed: speedVal,
        volume: volVal,
        isMuted: muteVal,
        language: selectedLang,
      }).catch((e) => console.warn('Syncing voice preferences failed', e));
    }, 1200);
  };

  // Load voice preferences from Firestore if authenticated
  useEffect(() => {
    if (!user?.id) return;
    let isCancelled = false;
    loadVoicePreferencesFromFirestore(user.id).then((prefs) => {
      if (isCancelled || !prefs) return;
      if (typeof prefs.speed === 'number' && prefs.speed >= 0.5 && prefs.speed <= 2.0) {
        setVoiceSpeed(prefs.speed);
        localStorage.setItem('aura_voice_speed', prefs.speed.toString());
      }
      if (typeof prefs.volume === 'number' && prefs.volume >= 0 && prefs.volume <= 1.0) {
        setVoiceVolume(prefs.volume);
        localStorage.setItem('aura_voice_volume', prefs.volume.toString());
      }
      if (typeof prefs.isMuted === 'boolean') {
        setIsMuted(prefs.isMuted);
        localStorage.setItem('aura_voice_muted', prefs.isMuted.toString());
      }
      if (prefs.language && typeof prefs.language === 'string') {
        setSelectedLang(prefs.language);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [user?.id]);

  // Persisting audio speed updates
  const updateVoiceSpeed = (newSpeed: number) => {
    const clamped = Math.max(0.5, Math.min(2.0, parseFloat(newSpeed.toFixed(2))));
    setVoiceSpeed(clamped);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('aura_voice_speed', clamped.toString());
      } catch (e) {
        // ignore
      }
    }
    scheduleFirestoreSync(clamped, voiceVolume, isMuted);
  };

  // Step voice speed up or down by delta (e.g. +0.05 or -0.05)
  const stepVoiceSpeed = (delta: number) => {
    updateVoiceSpeed(voiceSpeed + delta);
  };

  // Persisting audio volume updates
  const updateVoiceVolume = (newVol: number) => {
    const clamped = Math.max(0, Math.min(1.0, parseFloat(newVol.toFixed(2))));
    setVoiceVolume(clamped);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('aura_voice_volume', clamped.toString());
      } catch (e) {
        // ignore
      }
    }
    // If user increases volume above 0 while muted, automatically unmute
    let nextMute = isMuted;
    if (clamped > 0 && isMuted) {
      nextMute = false;
      setIsMuted(false);
      try {
        localStorage.setItem('aura_voice_muted', 'false');
      } catch (e) {
        // ignore
      }
    }
    scheduleFirestoreSync(voiceSpeed, clamped, nextMute);
  };

  // Step voice volume up or down by delta (e.g. +0.05 or -0.05)
  const stepVoiceVolume = (delta: number) => {
    updateVoiceVolume(voiceVolume + delta);
  };

  // Toggle mute with state and speech cancellation
  const toggleMute = () => {
    const nextMute = !isMuted;
    if (!isMuted && voiceState === 'speaking') {
      interruptSpeech();
    }
    setIsMuted(nextMute);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('aura_voice_muted', nextMute.toString());
      } catch (e) {
        // ignore
      }
    }
    scheduleFirestoreSync(voiceSpeed, voiceVolume, nextMute);
  };

  // Reset audio settings to optimal AURA defaults
  const resetAudioDefaults = () => {
    updateVoiceSpeed(0.96);
    updateVoiceVolume(1.0);
    setVoicePitch(1.06);
    if (isMuted) {
      setIsMuted(false);
      try {
        localStorage.setItem('aura_voice_muted', 'false');
      } catch (e) {
        // ignore
      }
    }
    scheduleFirestoreSync(0.96, 1.0, false);
  };

  // Human-friendly speaking speed label
  const getSpeedLabel = (speed: number): string => {
    if (speed <= 0.7) return 'Slow & Deliberate';
    if (speed <= 0.85) return 'Gentle Pacing';
    if (speed >= 0.94 && speed <= 0.98) return 'AURA Relaxed (Default)';
    if (speed <= 1.1) return 'Standard Conversation';
    if (speed <= 1.35) return 'Brisk & Efficient';
    return 'Fast Synthesis';
  };

  // Active view: Live Voice or Voice Conversation History panel
  const [activeView, setActiveView] = useState<'live' | 'history'>('live');
  const [historyList, setHistoryList] = useState<PastVoiceTranscript[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('aura_voice_conversation_history');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (e) {
        console.warn('Could not load voice history from localStorage', e);
      }
    }
    return INITIAL_VOICE_HISTORY;
  });
  const [currentlyPlayingHistoryId, setCurrentlyPlayingHistoryId] = useState<string | null>(null);

  const saveHistoryList = (newList: PastVoiceTranscript[]) => {
    setHistoryList(newList);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('aura_voice_conversation_history', JSON.stringify(newList));
      } catch (e) {
        // ignore
      }
    }
  };

  // Conversation history in voice mode
  const [messages, setMessages] = useState<VoiceMessage[]>([
    {
      id: 'v_init',
      sender: 'aura',
      text: `Hello ${user.name}. I am AURA. I’m right here to talk through your schedule, deliverables, or client updates whenever you’re ready.`,
      timestamp: 'Just now',
      source: 'aura-voice',
    },
  ]);

  // Audio level simulator for visual waveform animation
  const [waveHeights, setWaveHeights] = useState<number[]>([14, 28, 44, 20, 36, 50, 24, 16]);

  // Refs for Web Speech APIs
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  // Initialize Speech Synthesis and populate natural female/sweet voice candidates
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;

      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          setAvailableVoices(voices);

          // Find the sweetest, most natural voice:
          // Look for Natural / Neural / Online / Female / Samantha / Victoria / Karen / Jenny / Aria / Google
          const bestVoice =
            voices.find((v) =>
              (v.name.includes('Natural') || v.name.includes('Online')) &&
              (v.name.includes('Female') || v.name.includes('Jenny') || v.name.includes('Aria'))
            ) ||
            voices.find(
              (v) =>
                v.lang.startsWith('en') &&
                (v.name.includes('Samantha') ||
                  v.name.includes('Victoria') ||
                  v.name.includes('Google UK English Female') ||
                  v.name.includes('Karen') ||
                  v.name.includes('Zira') ||
                  v.name.includes('Serena'))
            ) ||
            voices.find((v) => v.lang.startsWith('en') && !v.name.includes('Male')) ||
            voices[0];

          if (bestVoice) {
            setSelectedVoiceURI(bestVoice.voiceURI);
          }
        }
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Update voice waveform oscillation when speaking or listening
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (voiceState === 'speaking' || voiceState === 'listening') {
      interval = setInterval(() => {
        setWaveHeights([
          Math.floor(10 + Math.random() * (voiceState === 'speaking' ? 45 : 30)),
          Math.floor(14 + Math.random() * (voiceState === 'speaking' ? 55 : 35)),
          Math.floor(18 + Math.random() * (voiceState === 'speaking' ? 60 : 40)),
          Math.floor(12 + Math.random() * (voiceState === 'speaking' ? 50 : 32)),
          Math.floor(16 + Math.random() * (voiceState === 'speaking' ? 58 : 38)),
          Math.floor(14 + Math.random() * (voiceState === 'speaking' ? 52 : 34)),
          Math.floor(10 + Math.random() * (voiceState === 'speaking' ? 40 : 28)),
          Math.floor(8 + Math.random() * (voiceState === 'speaking' ? 30 : 20)),
        ]);
      }, 100);
    } else {
      setWaveHeights([12, 16, 20, 14, 18, 16, 12, 10]);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [voiceState]);

  // Scroll transcript to bottom when messages update
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, interimTranscript, voiceState]);

  // Clean text for speech synthesis (strips markdown formatting, symbols, bullet asterisks, URLs)
  const cleanTextForSpeech = (rawText: string): string => {
    return rawText
      .replace(/###/g, '')
      .replace(/##/g, '')
      .replace(/#/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/[-*•]\s+/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/💡|🚀|⚠️|✅|🛡️|📈|👥|🤖|🌐|📋|✉️/g, '')
      .trim();
  };

  // Speak response aloud using SpeechSynthesis
  const speakAuraResponse = (text: string, langCode: string = selectedLang) => {
    if (isMuted || voiceVolume <= 0 || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setVoiceState('idle');
      return;
    }

    // Cancel any previous speech immediately
    window.speechSynthesis.cancel();

    const spokenText = cleanTextForSpeech(text);
    if (!spokenText) {
      setVoiceState('idle');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(spokenText);
    currentUtteranceRef.current = utterance;

    // Pick appropriate voice for the language
    const voices = window.speechSynthesis.getVoices();
    let voiceToUse = voices.find((v) => v.voiceURI === selectedVoiceURI);

    // If selected voice doesn't match language, pick voice matching language prefix
    if (!voiceToUse || !voiceToUse.lang.toLowerCase().startsWith(langCode.slice(0, 2).toLowerCase())) {
      voiceToUse =
        voices.find(
          (v) =>
            v.lang.toLowerCase().startsWith(langCode.slice(0, 2).toLowerCase()) &&
            (v.name.includes('Natural') || v.name.includes('Female') || v.name.includes('Google'))
        ) ||
        voices.find((v) => v.lang.toLowerCase().startsWith(langCode.slice(0, 2).toLowerCase())) ||
        voiceToUse;
    }

    if (voiceToUse) {
      utterance.voice = voiceToUse;
      utterance.lang = voiceToUse.lang;
    } else {
      utterance.lang = langCode;
    }

    // Personality acoustic configuration:
    // Volume: user adjusted output level (0.0 to 1.0)
    utterance.volume = isMuted ? 0 : Math.max(0, Math.min(1, voiceVolume));
    // Rate: user selected speaking speed (0.5 to 2.0)
    utterance.rate = voiceSpeed;
    // Pitch: gently elevated, soft, warm
    utterance.pitch = voicePitch;

    utterance.onstart = () => {
      setVoiceState('speaking');
      setErrorMessage(null);
    };

    utterance.onend = () => {
      setVoiceState('idle');
      currentUtteranceRef.current = null;
      setCurrentlyPlayingHistoryId(null);
    };

    utterance.onerror = (e) => {
      // 'interrupted' or 'canceled' are standard when user interrupts
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        console.warn('Speech synthesis notice:', e.error);
        setErrorMessage("I couldn't generate voice playback right now, but I have displayed my response in the transcript.");
      }
      setVoiceState('idle');
      currentUtteranceRef.current = null;
      setCurrentlyPlayingHistoryId(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  // Stop / Interrupt AURA's speech immediately
  const interruptSpeech = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      currentUtteranceRef.current = null;
    }
    if (voiceState === 'speaking') {
      setVoiceState('idle');
    }
    setCurrentlyPlayingHistoryId(null);
  };

  // History Panel Handlers
  const handleReplayHistory = (text: string, langCode?: string, id?: string) => {
    setCurrentlyPlayingHistoryId(id || null);
    speakAuraResponse(text, langCode || selectedLang);
  };

  const handleAskFollowUp = (transcriptItem: PastVoiceTranscript) => {
    setActiveView('live');
    setTranscript(`Regarding "${transcriptItem.userQuery}": `);
  };

  const handleDeleteTranscript = (id: string) => {
    const updated = historyList.filter((t) => t.id !== id);
    saveHistoryList(updated);
    if (currentlyPlayingHistoryId === id) {
      interruptSpeech();
    }
  };

  const handleClearHistory = () => {
    saveHistoryList([]);
    interruptSpeech();
  };

  const handleResetDefaults = () => {
    saveHistoryList(INITIAL_VOICE_HISTORY);
  };

  // Submit voice prompt to AURA AI backend
  const processQuery = async (queryText: string) => {
    if (!queryText.trim()) return;

    interruptSpeech();
    setVoiceState('thinking');
    setErrorMessage(null);

    const userMessage: VoiceMessage = {
      id: `v_msg_${Date.now()}`,
      sender: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setTranscript('');
    setInterimTranscript('');

    const safeClients = Array.isArray(data?.clients) ? data.clients : [];
    const safeProjects = Array.isArray(data?.projects) ? data.projects : [];
    const safeTasks = Array.isArray(data?.tasks) ? data.tasks : [];
    const safeInvoices = Array.isArray(data?.invoices) ? data.invoices : [];
    const safeApprovals = Array.isArray(data?.approvals) ? data.approvals : [];

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      }));

      let response = await fetch('/api/gemini-live-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: queryText,
          history: historyPayload,
          language: selectedLang,
          workspaceContext: {
            user: { name: user.name, company: user.companyName },
            clientsCount: safeClients.length,
            clients: safeClients.map((c) => ({ id: c.id, name: c.name, status: c.status })),
            projects: safeProjects.map((p) => ({
              id: p.id,
              name: p.name,
              status: p.status,
              progress: p.progress,
              deadline: p.deadline,
              clientName: p.clientName,
            })),
            tasks: safeTasks.map((t) => ({
              id: t.id,
              title: t.title,
              status: t.status,
              priority: t.priority,
              deadline: t.deadline,
            })),
            approvals: safeApprovals,
            stats: {
              revenue: safeInvoices
                .filter((i) => i && i.status === 'Paid')
                .reduce((s, i) => s + (i.amount || 0), 0),
            },
          },
        }),
      });

      if (!response.ok) {
        // Fallback to ask-aura
        response = await fetch('/api/ask-aura', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: queryText,
            voiceMode: true,
            language: selectedLang,
          }),
        });
      }

      let replyText = '';
      let replySource = 'aura-voice';
      let actionProposal = undefined;

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const result = await response.json();
        replyText = result?.response || '';
        replySource = result?.source || replySource;
        actionProposal = result?.actionProposal;
      }

      if (!replyText) {
        replyText = `I checked your workspace. You currently have ${safeTasks.filter((t) => t && t.status !== 'Completed').length} pending tasks and ${safeProjects.length} active projects. All systems are operational.`;
      }

      const auraMessage: VoiceMessage = {
        id: `v_aura_${Date.now() + 1}`,
        sender: 'aura',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: replySource,
        actionProposal,
      };

      setMessages((prev) => [...prev, auraMessage]);

      // Automatically append to Voice Conversation History
      const langObj = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLang);
      const langLabel = langObj ? langObj.label : 'English (US)';
      const lowerQuery = queryText.toLowerCase();
      const detectedCategory: 'Deliverables' | 'Clients' | 'Finance' | 'General' =
        lowerQuery.includes('invoice') || lowerQuery.includes('revenue') || lowerQuery.includes('bill') || lowerQuery.includes('finance')
          ? 'Finance'
          : lowerQuery.includes('client') || lowerQuery.includes('contact') || lowerQuery.includes('account')
          ? 'Clients'
          : lowerQuery.includes('task') || lowerQuery.includes('deadline') || lowerQuery.includes('milestone') || lowerQuery.includes('project')
          ? 'Deliverables'
          : 'General';

      const newHistoryItem: PastVoiceTranscript = {
        id: `vt_${Date.now()}`,
        timestamp: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        rawDate: new Date().toISOString(),
        language: langLabel,
        languageCode: selectedLang,
        userQuery: queryText,
        auraReply: replyText,
        category: detectedCategory,
        actionTaken: actionProposal ? `Proposed: ${actionProposal.title}` : undefined,
      };
      saveHistoryList([newHistoryItem, ...historyList]);

      // Speak response
      speakAuraResponse(replyText, selectedLang);
    } catch (err: any) {
      console.error('Voice query error:', err);
      const fallbackReply = `I checked your workspace. You have ${safeTasks.filter((t) => t && t.status !== 'Completed').length} tasks in your queue. Would you like me to open your task matrix?`;

      setMessages((prev) => [
        ...prev,
        {
          id: `v_err_${Date.now()}`,
          sender: 'aura',
          text: fallbackReply,
          timestamp: 'Just now',
          source: 'local-voice-engine',
        },
      ]);

      const errHistoryItem: PastVoiceTranscript = {
        id: `vt_${Date.now()}`,
        timestamp: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        rawDate: new Date().toISOString(),
        language: 'English (US)',
        languageCode: selectedLang,
        userQuery: queryText,
        auraReply: fallbackReply,
        category: 'Deliverables',
      };
      saveHistoryList([errHistoryItem, ...historyList]);

      speakAuraResponse(fallbackReply, selectedLang);
    }
  };

  // Start speech recognition
  const startListening = () => {
    // If AURA is currently speaking, user interrupting takes precedence!
    interruptSpeech();

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage(
        'Speech recognition is not supported in this browser. You can type queries into the input below.'
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = selectedLang;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setVoiceState('listening');
        setErrorMessage(null);
        setTranscript('');
        setInterimTranscript('');
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            currentInterim += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          setTranscript(finalTranscript);
          setInterimTranscript('');
          processQuery(finalTranscript);
        } else {
          setInterimTranscript(currentInterim);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition event:', event.error);
        if (event.error === 'not-allowed') {
          setErrorMessage("I can't access your microphone. Please allow microphone access in your browser to talk with AURA.");
        } else if (event.error === 'no-speech') {
          setErrorMessage("I didn't quite catch that. Could you say it again?");
        } else {
          setErrorMessage(`Speech recognition notice: ${event.error}. You can try again or type below.`);
        }
        setVoiceState('idle');
      };

      recognition.onend = () => {
        if (voiceState === 'listening') {
          setVoiceState('idle');
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e: any) {
      console.error('Failed to start speech recognition:', e);
      setErrorMessage('Could not initialize microphone. Please check browser permissions.');
      setVoiceState('idle');
    }
  };

  // Stop listening manually
  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
    setVoiceState('idle');
  };

  // Toggle mic button
  const handleMicToggle = () => {
    if (voiceState === 'listening') {
      stopListening();
    } else if (voiceState === 'speaking') {
      // Natural interruption: user speaks -> AURA immediately stops and listens
      interruptSpeech();
      startListening();
    } else {
      startListening();
    }
  };

  // Quick Action Execution with Human Confirmation
  const handleConfirmAction = (proposal?: { type: 'create_task'; title: string; description?: string }) => {
    if (!proposal) return;
    if (proposal.type === 'create_task' && onAddTask) {
      onAddTask(proposal.title, proposal.description);
      const confirmNotice = `Done. I added "${proposal.title}" to your task matrix.`;
      setMessages((prev) => [
        ...prev,
        {
          id: `v_act_${Date.now()}`,
          sender: 'aura',
          text: confirmNotice,
          timestamp: 'Just now',
          source: 'aura-action-engine',
        },
      ]);

      // Update history list item with confirmed task action
      const updatedHistory = historyList.map((item, idx) => {
        if (idx === 0) {
          return { ...item, actionTaken: `Task added: "${proposal.title}"` };
        }
        return item;
      });
      saveHistoryList(updatedHistory);

      speakAuraResponse(confirmNotice);
    }
  };

  if (!isOpen && mode !== 'embedded') return null;

  return (
    <div
      id="aura-voice-conversation-module"
      onClick={(e) => {
        if (mode === 'modal' && e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
      className={`rounded-2xl transition-all duration-300 ${
        mode === 'modal'
          ? 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md'
          : 'w-full'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full bg-[#070A12] border border-cyan-500/25 rounded-2xl shadow-2xl shadow-cyan-950/40 flex flex-col overflow-hidden relative ${
          mode === 'modal'
            ? activeView === 'history'
              ? 'max-w-3xl max-h-[92vh]'
              : 'max-w-2xl max-h-[90vh]'
            : 'aura-card'
        }`}
      >
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between px-5 py-3.5 border-b border-white/5 bg-gradient-to-r from-[#0C1120] via-[#090D18] to-[#070A12] gap-3">
          <div className="flex items-center space-x-3">
            {/* Visual State Indicator Orb */}
            <div className="relative w-8 h-8 flex items-center justify-center">
              <div
                className={`absolute inset-0 rounded-full blur-md transition-all duration-500 ${
                  voiceState === 'listening'
                    ? 'bg-cyan-400 opacity-90 animate-ping'
                    : voiceState === 'thinking'
                    ? 'bg-purple-500 opacity-80 animate-pulse'
                    : voiceState === 'speaking'
                    ? 'bg-indigo-400 opacity-80 animate-pulse'
                    : 'bg-cyan-500/40 opacity-40'
                }`}
              />
              <div
                className={`relative w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${
                  voiceState === 'listening'
                    ? 'bg-cyan-950 border-cyan-400 text-cyan-300'
                    : voiceState === 'thinking'
                    ? 'bg-purple-950 border-purple-400 text-purple-300'
                    : voiceState === 'speaking'
                    ? 'bg-indigo-950 border-indigo-400 text-indigo-300'
                    : 'bg-[#0E1528] border-cyan-500/40 text-cyan-400'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
              </div>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-display text-sm font-bold text-white tracking-tight">
                  AURA Voice Companion
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300">
                  Natural Speech
                </span>
              </div>
              <p className="text-[11px] text-gray-400">
                Sweet, calm, intelligent conversational companion &middot; AI assists. Human decides.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* View Mode Navigation Tabs: Live Voice vs Voice Conversation History */}
            <div className="flex items-center space-x-1 bg-white/5 p-1 rounded-xl border border-white/5">
              <button
                id="btn-voice-tab-live"
                onClick={() => setActiveView('live')}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeView === 'live'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-sm shadow-cyan-900/40'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Live Voice</span>
              </button>

              <button
                id="btn-voice-tab-history"
                onClick={() => setActiveView('history')}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeView === 'history'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-sm shadow-cyan-900/40'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Open Voice Conversation History"
              >
                <History className="w-3.5 h-3.5 text-cyan-400" />
                <span>History</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full border ${
                    activeView === 'history'
                      ? 'bg-cyan-950 border-cyan-400 text-cyan-200'
                      : 'bg-[#0E1528] border-white/10 text-cyan-400'
                  }`}
                >
                  {historyList.length}
                </span>
              </button>
            </div>

            {/* Audio Voice Volume & Mute Toggle */}
            <button
              id="btn-voice-mute-toggle"
              onClick={toggleMute}
              title={
                isMuted || voiceVolume === 0
                  ? 'Unmute voice responses'
                  : `Mute voice responses (Currently ${Math.round(voiceVolume * 100)}%)`
              }
              className={`p-2 rounded-xl text-xs transition-all cursor-pointer flex items-center space-x-1 ${
                isMuted || voiceVolume === 0
                  ? 'bg-red-950/40 border border-red-500/30 text-red-400'
                  : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5'
              }`}
            >
              {isMuted || voiceVolume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : voiceVolume < 0.5 ? (
                <Volume1 className="w-4 h-4 text-cyan-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-cyan-400" />
              )}
            </button>

            {/* Voice Settings dropdown toggle with speed & volume badge */}
            <button
              id="btn-voice-settings-toggle"
              onClick={() => setShowSettings(!showSettings)}
              title="Voice Speed, Volume & Language Settings"
              className={`px-2.5 py-1.5 rounded-xl text-xs transition-all cursor-pointer flex items-center space-x-1.5 ${
                showSettings
                  ? 'bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 shadow-sm shadow-cyan-950/50'
                  : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline font-mono text-[11px] text-gray-300">
                {voiceSpeed.toFixed(2)}x · {isMuted ? 'Muted' : `${Math.round(voiceVolume * 100)}%`}
              </span>
            </button>

            {mode === 'modal' && onClose && (
              <div className="flex items-center space-x-1.5 pl-1 border-l border-white/10">
                <kbd
                  title="Global shortcut to toggle: Cmd/Ctrl + Shift + K"
                  className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono text-cyan-300/80 bg-cyan-950/40 border border-cyan-500/30 rounded"
                >
                  ⌘⇧K
                </kbd>
                <button
                  id="btn-close-voice-modal"
                  onClick={onClose}
                  title="Close voice modal (Esc)"
                  className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 cursor-pointer flex items-center space-x-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Settings Drawer (Expandable Audio & Speed Controls) */}
        {showSettings && (
          <div className="px-5 py-4 bg-[#0A0F1E] border-b border-white/10 space-y-4 text-xs animate-fadeIn">
            {/* Drawer Top Navigation & Actions */}
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span className="font-semibold text-white tracking-wide text-xs">
                  Voice Synthesis & Audio Preferences
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  id="btn-reset-audio-defaults"
                  type="button"
                  onClick={resetAudioDefaults}
                  title="Reset Speed to 0.96x and Volume to 100%"
                  className="flex items-center space-x-1 px-2.5 py-1 text-[11px] rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 hover:text-white transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3 text-cyan-400" />
                  <span>Reset Defaults</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 cursor-pointer"
                  title="Close settings"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Main Controls: Speaking Speed and Voice Volume */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Speaking Speed Section */}
              <div className="p-3.5 rounded-xl bg-[#0F162B] border border-white/5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-gray-300 flex items-center space-x-1.5">
                    <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Speaking Speed</span>
                    <span className="font-mono text-cyan-400 font-bold ml-1">
                      {voiceSpeed.toFixed(2)}x
                    </span>
                  </label>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/30 text-cyan-300 font-medium">
                    {getSpeedLabel(voiceSpeed)}
                  </span>
                </div>

                {/* Speed Slider with Stepper buttons */}
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      id="btn-speed-decrement"
                      onClick={() => stepVoiceSpeed(-0.05)}
                      disabled={voiceSpeed <= 0.5}
                      title="Slow down (-0.05x)"
                      className="p-1.5 rounded-lg bg-[#0A0E1C] border border-white/10 text-gray-300 hover:text-white hover:border-cyan-500/40 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      id="input-voice-speed-slider"
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.05"
                      value={voiceSpeed}
                      onChange={(e) => updateVoiceSpeed(parseFloat(e.target.value))}
                      className="flex-1 h-2 bg-[#090D18] rounded-lg appearance-none cursor-pointer accent-cyan-400 border border-white/10"
                    />
                    <button
                      type="button"
                      id="btn-speed-increment"
                      onClick={() => stepVoiceSpeed(0.05)}
                      disabled={voiceSpeed >= 2.0}
                      title="Speed up (+0.05x)"
                      className="p-1.5 rounded-lg bg-[#0A0E1C] border border-white/10 text-gray-300 hover:text-white hover:border-cyan-500/40 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400 font-mono px-0.5">
                    <span>0.50x (Slow)</span>
                    <span className="text-gray-300">1.00x (Normal)</span>
                    <span>2.00x (Fast)</span>
                  </div>
                </div>

                {/* Quick Speed Preset Buttons */}
                <div className="flex items-center space-x-1 pt-1">
                  {[
                    { val: 0.75, label: '0.75x' },
                    { val: 0.90, label: '0.90x' },
                    { val: 0.96, label: '0.96x (Calm)' },
                    { val: 1.0, label: '1.0x' },
                    { val: 1.25, label: '1.25x' },
                    { val: 1.5, label: '1.5x' },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      id={`btn-speed-preset-${preset.val.toString().replace('.', '-')}`}
                      onClick={() => updateVoiceSpeed(preset.val)}
                      className={`flex-1 py-1 rounded-lg text-[10px] font-medium border transition-all cursor-pointer ${
                        Math.abs(voiceSpeed - preset.val) < 0.02
                          ? 'bg-cyan-950 border-cyan-400 text-cyan-300 shadow-sm shadow-cyan-950'
                          : 'bg-[#0A0E1C] border-white/5 text-gray-400 hover:text-white hover:border-white/10'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Voice Volume Section */}
              <div className="p-3.5 rounded-xl bg-[#0F162B] border border-white/5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-gray-300 flex items-center space-x-1.5">
                    {isMuted || voiceVolume === 0 ? (
                      <VolumeX className="w-3.5 h-3.5 text-red-400" />
                    ) : voiceVolume < 0.5 ? (
                      <Volume1 className="w-3.5 h-3.5 text-cyan-400" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                    )}
                    <span>Voice Volume</span>
                    <span className="font-mono text-cyan-400 font-bold ml-1">
                      {isMuted ? 'Muted (0%)' : `${Math.round(voiceVolume * 100)}%`}
                    </span>
                  </label>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                      isMuted || voiceVolume === 0
                        ? 'bg-red-950/80 border-red-500/40 text-red-300'
                        : voiceVolume === 1
                        ? 'bg-cyan-950 border-cyan-500/30 text-cyan-300'
                        : 'bg-[#0A0E1C] border-white/10 text-gray-300'
                    }`}
                  >
                    {isMuted || voiceVolume === 0
                      ? 'Muted'
                      : voiceVolume === 1
                      ? '100% (Full)'
                      : voiceVolume >= 0.6
                      ? 'Balanced'
                      : 'Quiet'}
                  </span>
                </div>

                {/* Volume Slider with Stepper buttons */}
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      id="btn-volume-decrement"
                      onClick={() => stepVoiceVolume(-0.05)}
                      disabled={voiceVolume <= 0 || isMuted}
                      title="Volume down (-5%)"
                      className="p-1.5 rounded-lg bg-[#0A0E1C] border border-white/10 text-gray-300 hover:text-white hover:border-cyan-500/40 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      id="input-voice-volume-slider"
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={isMuted ? 0 : voiceVolume}
                      onChange={(e) => updateVoiceVolume(parseFloat(e.target.value))}
                      className="flex-1 h-2 bg-[#090D18] rounded-lg appearance-none cursor-pointer accent-cyan-400 border border-white/10"
                    />
                    <button
                      type="button"
                      id="btn-volume-increment"
                      onClick={() => stepVoiceVolume(0.05)}
                      disabled={voiceVolume >= 1.0 && !isMuted}
                      title="Volume up (+5%)"
                      className="p-1.5 rounded-lg bg-[#0A0E1C] border border-white/10 text-gray-300 hover:text-white hover:border-cyan-500/40 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400 font-mono px-0.5">
                    <span>0% (Muted)</span>
                    <span className="text-gray-300">50%</span>
                    <span>100% (Full)</span>
                  </div>
                </div>

                {/* Quick Volume Preset Buttons */}
                <div className="flex items-center space-x-1 pt-1">
                  <button
                    type="button"
                    id="btn-vol-preset-mute"
                    onClick={() => {
                      if (!isMuted) toggleMute();
                    }}
                    className={`flex-1 py-1 rounded-lg text-[10px] font-medium border transition-all cursor-pointer ${
                      isMuted || voiceVolume === 0
                        ? 'bg-red-950/60 border-red-500/50 text-red-300 shadow-sm'
                        : 'bg-[#0A0E1C] border-white/5 text-gray-400 hover:text-white hover:border-white/10'
                    }`}
                  >
                    Mute (0%)
                  </button>
                  {[
                    { val: 0.25, label: '25%' },
                    { val: 0.5, label: '50%' },
                    { val: 0.75, label: '75%' },
                    { val: 1.0, label: '100%' },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      id={`btn-vol-preset-${preset.val.toString().replace('.', '-')}`}
                      onClick={() => updateVoiceVolume(preset.val)}
                      className={`flex-1 py-1 rounded-lg text-[10px] font-medium border transition-all cursor-pointer ${
                        !isMuted && Math.abs(voiceVolume - preset.val) < 0.05
                          ? 'bg-cyan-950 border-cyan-400 text-cyan-300 shadow-sm shadow-cyan-950'
                          : 'bg-[#0A0E1C] border-white/5 text-gray-400 hover:text-white hover:border-white/10'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Secondary Controls: Language, Browser Synthesizer Voice, & Acoustic Preview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* Language Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-300 mb-1 flex items-center space-x-1">
                  <Languages className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Conversation Language</span>
                </label>
                <select
                  id="select-voice-language"
                  value={selectedLang}
                  onChange={(e) => setSelectedLang(e.target.value)}
                  className="w-full bg-[#0F162B] border border-white/10 rounded-xl px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Natural Synthesizer Voice Selection */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-300 mb-1 flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Voice Synthesis Engine</span>
                </label>
                <select
                  id="select-voice-uri"
                  value={selectedVoiceURI}
                  onChange={(e) => setSelectedVoiceURI(e.target.value)}
                  className="w-full bg-[#0F162B] border border-white/10 rounded-xl px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-cyan-500 cursor-pointer truncate"
                >
                  <option value="">AURA Natural Default (Auto)</option>
                  {availableVoices
                    .filter((v) =>
                      v.lang.toLowerCase().startsWith(selectedLang.slice(0, 2).toLowerCase())
                    )
                    .map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                </select>
              </div>

              {/* Acoustic Tone & Speed Preview Test */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                  Acoustic Tone Test
                </label>
                {voiceState === 'speaking' ? (
                  <button
                    id="btn-stop-sample-voice"
                    type="button"
                    onClick={interruptSpeech}
                    className="w-full py-1.5 px-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 hover:bg-red-900/70 flex items-center justify-center space-x-1.5 transition-all text-xs cursor-pointer shadow-sm shadow-red-950/40"
                  >
                    <Square className="w-3 h-3 text-red-400" />
                    <span>Stop Playback</span>
                  </button>
                ) : (
                  <button
                    id="btn-test-sample-voice"
                    type="button"
                    onClick={() => {
                      if (isMuted || voiceVolume <= 0) {
                        updateVoiceVolume(0.8);
                        setIsMuted(false);
                      }
                      speakAuraResponse(
                        `Hello! This is AURA speaking at ${voiceSpeed.toFixed(2)}x speed with voice volume set to ${Math.round((isMuted || voiceVolume <= 0 ? 0.8 : voiceVolume) * 100)} percent.`
                      );
                    }}
                    className="w-full py-1.5 px-3 rounded-xl bg-gradient-to-r from-indigo-950/60 via-cyan-950/60 to-blue-950/60 border border-cyan-500/30 text-cyan-200 hover:border-cyan-500/60 hover:text-white flex items-center justify-center space-x-1.5 transition-all text-xs cursor-pointer shadow-sm shadow-cyan-950/30"
                  >
                    <Play className="w-3 h-3 text-cyan-400" />
                    <span>Hear AURA ({voiceSpeed.toFixed(2)}x)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Preferences Sync Status */}
            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-400">
              <span className="flex items-center space-x-1 text-cyan-400/80">
                <Check className="w-3 h-3 text-cyan-400" />
                <span>Speaking speed & volume preferences are saved and synced to your cloud account</span>
              </span>
              <span className="font-mono text-gray-400 hidden sm:inline">
                AURA Speech Engine v3.1
              </span>
            </div>
          </div>
        )}

        {/* View Mode Switching: History Panel vs Live Voice Waveform & Interactive Mic */}
        {activeView === 'history' ? (
          <VoiceConversationHistoryPanel
            transcripts={historyList}
            onReplay={handleReplayHistory}
            onStopAudio={interruptSpeech}
            currentlyPlayingId={currentlyPlayingHistoryId}
            onAskFollowUp={handleAskFollowUp}
            onDeleteTranscript={handleDeleteTranscript}
            onClearHistory={handleClearHistory}
            onResetDefaults={handleResetDefaults}
            onBackToLive={() => setActiveView('live')}
          />
        ) : (
          <>
            {/* Central Visual AI Voice Waveform & State Banner */}
        <div className="px-6 pt-6 pb-4 flex flex-col items-center justify-center bg-gradient-to-b from-[#090E1C] to-[#070A12] border-b border-white/5">
          {/* Waveform visualizer bars */}
          <div className="h-16 flex items-center justify-center space-x-1.5 sm:space-x-2 my-2">
            {waveHeights.map((h, idx) => (
              <div
                key={idx}
                style={{ height: `${h}px` }}
                className={`w-1.5 sm:w-2 rounded-full transition-all duration-150 ${
                  voiceState === 'listening'
                    ? 'bg-gradient-to-t from-cyan-500 to-blue-300 shadow-sm shadow-cyan-400'
                    : voiceState === 'thinking'
                    ? 'bg-gradient-to-t from-purple-500 to-pink-300 shadow-sm shadow-purple-400'
                    : voiceState === 'speaking'
                    ? 'bg-gradient-to-t from-indigo-500 via-cyan-400 to-pink-400 shadow-md shadow-indigo-500/40'
                    : 'bg-white/10'
                }`}
              />
            ))}
          </div>

          {/* Current State Text */}
          <div className="mt-2 text-center">
            {voiceState === 'idle' && (
              <p className="text-xs font-medium text-gray-300">
                Ready &middot; Tap the microphone to talk with AURA
              </p>
            )}
            {voiceState === 'listening' && (
              <div className="flex items-center justify-center space-x-2 text-xs font-semibold text-cyan-300 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                <span>Listening... Speak naturally</span>
              </div>
            )}
            {voiceState === 'thinking' && (
              <div className="flex items-center justify-center space-x-2 text-xs font-semibold text-purple-300">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
                <span>AURA is thinking & checking workspace context...</span>
              </div>
            )}
            {voiceState === 'speaking' && (
              <div className="flex items-center justify-center space-x-2">
                <span className="text-xs font-semibold text-indigo-300">
                  AURA is speaking...
                </span>
                <button
                  id="btn-interrupt-speech"
                  onClick={interruptSpeech}
                  className="ml-2 px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-[10px] text-gray-300 flex items-center space-x-1 cursor-pointer"
                >
                  <Square className="w-2.5 h-2.5 text-pink-400 fill-pink-400" />
                  <span>Pause Voice</span>
                </button>
              </div>
            )}
          </div>

          {/* Real-time speech-to-text preview */}
          {(interimTranscript || transcript) && (
            <div className="mt-3 px-4 py-2 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-xs text-cyan-200 max-w-lg text-center animate-fadeIn">
              <span className="opacity-75">"{interimTranscript || transcript}"</span>
            </div>
          )}

          {/* Error Message banner if microphone or speech fails */}
          {errorMessage && (
            <div className="mt-3 px-4 py-2 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200 max-w-lg text-center">
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Live Conversation Transcript Feed */}
        <div className="flex-1 p-5 overflow-y-auto max-h-[360px] space-y-4">
          <div className="text-center">
            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold bg-white/5 px-2.5 py-1 rounded-full">
              Voice Transcript Feed
            </span>
          </div>

          {messages.map((m) => {
            const isAura = m.sender === 'aura';
            return (
              <div
                key={m.id}
                className={`flex flex-col ${isAura ? 'items-start' : 'items-end'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-md rounded-2xl p-3.5 text-xs leading-relaxed ${
                    isAura
                      ? 'bg-[#0E1528] border border-cyan-500/20 text-gray-200 shadow-sm'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1 opacity-60 text-[10px]">
                    <span className="font-semibold">{isAura ? 'AURA Voice' : user.name}</span>
                    <span>{m.timestamp}</span>
                  </div>

                  <p className="whitespace-pre-wrap">{m.text}</p>

                  {/* Proposed action card if user commanded action by voice */}
                  {m.actionProposal && (
                    <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-col space-y-2">
                      <div className="flex items-center space-x-1.5 text-[11px] text-cyan-300 font-semibold">
                        <PlusCircle className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Proposed Action: {m.actionProposal.title}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleConfirmAction(m.actionProposal)}
                          className="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-semibold flex items-center space-x-1 shadow cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                          <span>Confirm & Add Task</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Re-play voice speech button */}
                  {isAura && (
                    <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-400">
                      <span>Source: {m.source}</span>
                      <button
                        onClick={() => speakAuraResponse(m.text)}
                        className="hover:text-cyan-300 flex items-center space-x-1 cursor-pointer"
                        title="Replay Voice"
                      >
                        <Volume2 className="w-3 h-3 text-cyan-400" />
                        <span>Replay</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={transcriptEndRef} />
        </div>

        {/* Quick Audio & Speaking Speed Bar */}
        <div className="px-4 py-2.5 bg-[#080D1A] border-t border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Speaking Speed Quick Controls */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1.5 text-gray-400">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-semibold text-[11px] text-gray-300">Speed:</span>
              <span className="font-mono text-cyan-400 font-bold text-[11px]">
                {voiceSpeed.toFixed(2)}x
              </span>
            </div>

            <div className="flex items-center space-x-1">
              {[
                { val: 0.75, label: '0.75x' },
                { val: 0.96, label: '0.96x (Calm)' },
                { val: 1.0, label: '1.0x' },
                { val: 1.25, label: '1.25x' },
                { val: 1.5, label: '1.5x' },
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  id={`btn-quick-speed-${p.val.toString().replace('.', '-')}`}
                  onClick={() => updateVoiceSpeed(p.val)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono border transition-all cursor-pointer ${
                    Math.abs(voiceSpeed - p.val) < 0.02
                      ? 'bg-cyan-950 border-cyan-400 text-cyan-300 font-bold shadow-sm'
                      : 'bg-[#0E1528] border-white/5 text-gray-400 hover:text-white hover:border-white/10'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Voice Volume Quick Controls & Instant Test */}
          <div className="flex items-center space-x-3">
            {/* Quick Volume Slider & Mute Toggle */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                id="btn-quick-volume-toggle"
                onClick={toggleMute}
                title={isMuted || voiceVolume === 0 ? 'Unmute' : 'Mute'}
                className="p-1 rounded-md text-gray-400 hover:text-white cursor-pointer"
              >
                {isMuted || voiceVolume === 0 ? (
                  <VolumeX className="w-3.5 h-3.5 text-red-400" />
                ) : voiceVolume < 0.5 ? (
                  <Volume1 className="w-3.5 h-3.5 text-cyan-400" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                )}
              </button>
              <input
                id="input-quick-volume-slider"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : voiceVolume}
                onChange={(e) => updateVoiceVolume(parseFloat(e.target.value))}
                className="w-16 sm:w-20 h-1.5 bg-[#090D18] rounded-lg appearance-none cursor-pointer accent-cyan-400 border border-white/10"
              />
              <span className="font-mono text-[10px] text-gray-300 w-8 text-right">
                {isMuted ? 'Mute' : `${Math.round(voiceVolume * 100)}%`}
              </span>
            </div>

            {/* Quick Test Voice Playback */}
            <button
              type="button"
              id="btn-quick-test-voice"
              onClick={() => {
                if (isMuted || voiceVolume <= 0) {
                  updateVoiceVolume(0.8);
                  setIsMuted(false);
                }
                speakAuraResponse(
                  `Hello! This is AURA speaking at ${voiceSpeed.toFixed(2)}x speed with voice volume set to ${Math.round(
                    (isMuted || voiceVolume <= 0 ? 0.8 : voiceVolume) * 100
                  )} percent.`
                );
              }}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 hover:text-white hover:bg-cyan-900/60 text-[10px] font-medium transition-all cursor-pointer"
              title="Test speaking speed and voice volume"
            >
              <Play className="w-2.5 h-2.5 text-cyan-400" />
              <span>Test Audio</span>
            </button>

            {/* Expand Full Settings Drawer */}
            <button
              type="button"
              id="btn-quick-expand-settings"
              onClick={() => setShowSettings(!showSettings)}
              className={`p-1.5 rounded-lg border text-[11px] transition-all cursor-pointer ${
                showSettings
                  ? 'bg-cyan-950 border-cyan-400 text-cyan-300'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
              }`}
              title="Toggle Full Audio & Voice Settings Drawer"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Bottom Interaction Console: Primary Microphone & Text Fallback */}
        <div className="p-4 bg-[#070A12] border-t border-white/5 flex flex-col sm:flex-row items-center gap-3">
          {/* The Big Natural Voice Microphone Button */}
          <div className="w-full sm:w-auto flex items-center justify-center">
            <button
              id="btn-voice-mic-main"
              onClick={handleMicToggle}
              title={
                voiceState === 'listening'
                  ? 'Stop listening'
                  : voiceState === 'speaking'
                  ? 'Interrupt AURA & Speak'
                  : 'Click to speak to AURA'
              }
              className={`relative flex items-center justify-center px-6 py-3 rounded-2xl font-semibold text-xs transition-all duration-300 cursor-pointer shadow-lg ${
                voiceState === 'listening'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-cyan-500/50 ring-4 ring-cyan-500/30 animate-pulse'
                  : voiceState === 'speaking'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-indigo-500/40 ring-2 ring-purple-500/30'
                  : 'bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-cyan-600/30'
              }`}
            >
              {voiceState === 'listening' ? (
                <>
                  <Mic className="w-4 h-4 mr-2 animate-bounce text-white" />
                  <span>Listening... (Tap to Send)</span>
                </>
              ) : voiceState === 'speaking' ? (
                <>
                  <Square className="w-4 h-4 mr-2 fill-white text-white" />
                  <span>Interrupt & Speak</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 mr-2 text-cyan-200" />
                  <span>Talk to AURA</span>
                </>
              )}
            </button>
          </div>

          {/* Quick text input fallback for seamless accessibility */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (transcript.trim()) {
                processQuery(transcript);
              }
            }}
            className="flex-1 w-full flex items-center space-x-2"
          >
            <input
              id="input-voice-text-fallback"
              type="text"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Or type here to speak with AURA..."
              className="flex-1 bg-[#0E1528] border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500/60"
            />
            <button
              id="btn-voice-send-text"
              type="submit"
              disabled={!transcript.trim() || voiceState === 'thinking'}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 disabled:opacity-40 cursor-pointer border border-white/5"
              title="Send query"
            >
              <CornerDownLeft className="w-4 h-4 text-cyan-400" />
            </button>
          </form>
        </div>

            {/* Footer reassurance banner */}
            <div className="px-4 py-2 bg-[#05070D] border-t border-white/5 flex items-center justify-between text-[10px] text-gray-400">
              <div className="flex items-center space-x-1 text-cyan-400/90">
                <ShieldCheck className="w-3 h-3 text-cyan-400" />
                <span>Human Approval: Actions require your confirmation.</span>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  id="btn-switch-to-voice-history-footer"
                  onClick={() => setActiveView('history')}
                  className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 transition-colors cursor-pointer"
                >
                  <History className="w-3 h-3" />
                  <span>Voice History ({historyList.length})</span>
                </button>
                <span className="hidden sm:inline">Privacy-first audio processing</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
