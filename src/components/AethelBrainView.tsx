import React, { useState } from 'react';
import {
  Brain,
  Sparkles,
  MessageSquare,
  Lightbulb,
  ArrowRightLeft,
  FileText,
  BookOpen,
  Plus,
  CheckCircle2,
  Clock,
  Pin,
  Archive,
  Trash2,
  Mic,
  MicOff,
  Search,
  ArrowUpRight,
  CheckSquare,
  AlertCircle,
  Send,
  Printer,
  Edit3,
  X,
  Tag,
  UserCheck,
  RefreshCw,
} from 'lucide-react';
import {
  AethelDatabaseState,
  BrainDailyLogEntry,
  BrainDumpCategory,
  BrainDumpNote,
  BrainHandoverNote,
  BrainMemoryCategory,
  BrainMemoryEntry,
  BrainWeeklyRecap,
  FounderName,
  ModuleId,
} from '../types';
import {
  autoSuggestBrainCategoryAndTags,
  BrainQueryResult,
  generateGroundedWeeklyRecap,
  queryAethelBrainMemory,
} from '../utils/calculations';

export type BrainSubTab =
  | 'overview'
  | 'daily-log'
  | 'brain-dump'
  | 'handovers'
  | 'weekly-recap'
  | 'memory';

interface AethelBrainViewProps {
  dbState: AethelDatabaseState;
  activeFounderFilter: 'All' | FounderName;
  onAddDailyLog: (entry: BrainDailyLogEntry) => void;
  onUpdateDailyLog: (entry: BrainDailyLogEntry) => void;
  onDeleteDailyLog: (id: string) => void;
  onAddBrainDump: (note: BrainDumpNote) => void;
  onUpdateBrainDump: (note: BrainDumpNote) => void;
  onDeleteBrainDump: (id: string) => void;
  onConvertBrainDumpToTask: (noteId: string, assignedTo?: FounderName) => void;
  onAddHandover: (handover: BrainHandoverNote) => void;
  onUpdateHandover: (handover: BrainHandoverNote) => void;
  onDeleteHandover: (id: string) => void;
  onConvertHandoverItemToTask: (handoverId: string, actionItemId: string) => void;
  onAddMemory: (entry: BrainMemoryEntry) => void;
  onUpdateMemory: (entry: BrainMemoryEntry) => void;
  onDeleteMemory: (id: string) => void;
  onSaveWeeklyRecap: (recap: BrainWeeklyRecap) => void;
  onOpenClient360: (clientId: string) => void;
  onNavigateModule: (module: ModuleId) => void;
}

const BRAIN_DUMP_CATEGORIES: { label: BrainDumpCategory; emoji: string }[] = [
  { label: 'Ideas', emoji: '💡' },
  { label: 'Things to do', emoji: '⚡' },
  { label: 'Thoughts', emoji: '🧠' },
  { label: 'Important information', emoji: '📌' },
  { label: 'Issues / Things to fix', emoji: '🐛' },
  { label: 'Business opportunities', emoji: '💰' },
  { label: 'Client-related', emoji: '🤝' },
  { label: 'Future plans', emoji: '🔮' },
];

const MEMORY_CATEGORIES: BrainMemoryCategory[] = [
  'Decisions',
  'Processes & SOPs',
  'Pricing & Packages',
  'Lessons Learned',
  'Tech Stack & Architecture',
  'Marketing Playbooks',
];

const QUICK_REACTIONS = ['👍', '🔥', '✅', '👀'];

export const AethelBrainView: React.FC<AethelBrainViewProps> = ({
  dbState,
  activeFounderFilter,
  onAddDailyLog,
  onUpdateDailyLog,
  onDeleteDailyLog,
  onAddBrainDump,
  onUpdateBrainDump,
  onDeleteBrainDump,
  onConvertBrainDumpToTask,
  onAddHandover,
  onUpdateHandover,
  onDeleteHandover,
  onConvertHandoverItemToTask,
  onAddMemory,
  onUpdateMemory,
  onDeleteMemory,
  onSaveWeeklyRecap,
  onOpenClient360,
  onNavigateModule,
}) => {
  const [activeTab, setActiveTab] = useState<BrainSubTab>('overview');

  const defaultAuthor: 'Krishna' | 'Vansh' =
    activeFounderFilter === 'Vansh' ? 'Vansh' : 'Krishna';

  // AI / Institutional Memory Search Bar State
  const [aiQuery, setAiQuery] = useState('');
  const [aiResult, setAiResult] = useState<BrainQueryResult | null>(null);
  const [isAskingAi, setIsAskingAi] = useState(false);

  // Daily Log Quick Input State
  const [logAuthor, setLogAuthor] = useState<'Krishna' | 'Vansh'>(defaultAuthor);
  const [logContent, setLogContent] = useState('');
  const [logClientName, setLogClientName] = useState('');
  const [logFilter, setLogFilter] = useState<'All' | 'Krishna' | 'Vansh' | 'Pinned'>('All');
  const [isListeningVoice, setIsListeningVoice] = useState(false);

  // Brain Dump Form & Filters State
  const [showDumpModal, setShowDumpModal] = useState(false);
  const [editingDump, setEditingDump] = useState<BrainDumpNote | null>(null);
  const [dumpTitle, setDumpTitle] = useState('');
  const [dumpDesc, setDumpDesc] = useState('');
  const [dumpAuthor, setDumpAuthor] = useState<'Krishna' | 'Vansh'>(defaultAuthor);
  const [dumpCategory, setDumpCategory] = useState<BrainDumpCategory>('Ideas');
  const [dumpPriority, setDumpPriority] = useState<BrainDumpNote['priority']>('High');
  const [dumpClientName, setDumpClientName] = useState('');
  const [dumpTagsInput, setDumpTagsInput] = useState('');
  const [dumpPinned, setDumpPinned] = useState(false);
  const [dumpCategoryFilter, setDumpCategoryFilter] = useState<'All' | BrainDumpCategory>('All');
  const [dumpStatusFilter, setDumpStatusFilter] = useState<
    'All' | 'Unsorted' | 'In Progress' | 'Archived'
  >('All');

  // Handover Form & Filters State
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [handoverFrom, setHandoverFrom] = useState<'Krishna' | 'Vansh'>(defaultAuthor);
  const [handoverTo, setHandoverTo] = useState<'Krishna' | 'Vansh'>(
    defaultAuthor === 'Krishna' ? 'Vansh' : 'Krishna'
  );
  const [handoverTitle, setHandoverTitle] = useState('');
  const [handoverContent, setHandoverContent] = useState('');
  const [handoverClientName, setHandoverClientName] = useState('');
  const [handoverChecklistText, setHandoverChecklistText] = useState('');
  const [handoverFilter, setHandoverFilter] = useState<
    'All' | 'Unread' | 'For Krishna' | 'For Vansh' | 'Acknowledged'
  >('All');
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});

  // Memory Form & Filters State
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [editingMemory, setEditingMemory] = useState<BrainMemoryEntry | null>(null);
  const [memTitle, setMemTitle] = useState('');
  const [memCategory, setMemCategory] = useState<BrainMemoryCategory>('Decisions');
  const [memContent, setMemContent] = useState('');
  const [memReasoning, setMemReasoning] = useState('');
  const [memAuthor, setMemAuthor] = useState<FounderName>('Both');
  const [memTags, setMemTags] = useState('');
  const [memPinned, setMemPinned] = useState(true);
  const [memCategoryFilter, setMemCategoryFilter] = useState<'All' | BrainMemoryCategory>('All');

  // Weekly Recap Generation State
  const [isGeneratingRecap, setIsGeneratingRecap] = useState(false);
  const [selectedRecapId, setSelectedRecapId] = useState<string | null>(null);

  const dailyLogs = dbState.brainDailyLogs || [];
  const brainDumps = dbState.brainDumps || [];
  const handovers = dbState.brainHandovers || [];
  const memories = dbState.brainMemories || [];
  const weeklyRecaps =
    dbState.brainWeeklyRecaps && dbState.brainWeeklyRecaps.length > 0
      ? dbState.brainWeeklyRecaps
      : [generateGroundedWeeklyRecap(dbState)];

  const activeRecap =
    weeklyRecaps.find((r) => r.id === selectedRecapId) || weeklyRecaps[0];

  const unreadHandovers = handovers.filter((h) => h.status === 'Unread');
  const activeBrainDumps = brainDumps.filter((d) => d.status !== 'Archived');
  const pinnedBrainDumps = brainDumps.filter((d) => d.pinned && d.status !== 'Archived');
  const pinnedMemories = memories.filter((m) => m.pinned);
  const focusPreview = queryAethelBrainMemory(
    dbState,
    'What should I focus on today?',
    activeFounderFilter
  );

  const todayStr = new Date().toISOString().slice(0, 10);
  const currentTimeStr = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  // Voice Note Dictation using Web Speech API (with safe fallback)
  const handleToggleVoiceDictation = () => {
    const win = window as unknown as {
      SpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        onresult: (e: { results: { [key: number]: { [key: number]: { transcript: string } } } }) => void;
        onerror: () => void;
        onend: () => void;
        start: () => void;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        onresult: (e: { results: { [key: number]: { [key: number]: { transcript: string } } } }) => void;
        onerror: () => void;
        onend: () => void;
        start: () => void;
      };
    };

    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRec) {
      setLogContent((prev) =>
        prev
          ? `${prev} [Voice Note]`
          : 'Followed up with client on WhatsApp regarding website preview and pending advance.'
      );
      return;
    }

    if (isListeningVoice) {
      setIsListeningVoice(false);
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.lang = 'en-IN';
      recognition.interimResults = false;
      setIsListeningVoice(true);

      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        if (transcript) {
          setLogContent((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
        setIsListeningVoice(false);
      };
      recognition.onerror = () => setIsListeningVoice(false);
      recognition.onend = () => setIsListeningVoice(false);
      recognition.start();
    } catch {
      setIsListeningVoice(false);
    }
  };

  // Ask Aethel Brain Intelligence
  const handleRunBrainQuery = async (customPrompt?: string) => {
    const q = (customPrompt !== undefined ? customPrompt : aiQuery).trim();
    if (customPrompt !== undefined) setAiQuery(customPrompt);

    const localAns = queryAethelBrainMemory(
      dbState,
      q || 'What should I focus on today?',
      activeFounderFilter
    );
    setAiResult(localAns);
    setIsAskingAi(true);

    try {
      const res = await fetch('/api/brain/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Aethel-Request': 'same-origin' },
        body: JSON.stringify({
          query: q || 'What should I focus on today?',
          activeFounder: activeFounderFilter,
          state: dbState,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as BrainQueryResult;
        setAiResult(data);
      }
    } catch {
      // Grounded local result is already set
    } finally {
      setIsAskingAi(false);
    }
  };

  // Add Daily Log Entry
  const handleDailyLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logContent.trim()) return;

    const mentions: ('Krishna' | 'Vansh')[] = [];
    if (logContent.toLowerCase().includes('@krishna')) mentions.push('Krishna');
    if (logContent.toLowerCase().includes('@vansh')) mentions.push('Vansh');

    const matchedClient = dbState.clients.find(
      (c) => c.businessName.toLowerCase() === logClientName.trim().toLowerCase()
    );

    const newEntry: BrainDailyLogEntry = {
      id: `blog-${Date.now()}`,
      author: logAuthor,
      content: logContent.trim(),
      date: todayStr,
      time: currentTimeStr,
      linkedClientId: matchedClient?.id,
      linkedClientName: matchedClient?.businessName || (logClientName.trim() || undefined),
      mentions,
      reactions: [],
      pinned: false,
    };

    onAddDailyLog(newEntry);
    setLogContent('');
    setLogClientName('');
  };

  // Toggle reaction on Daily Log
  const handleToggleLogReaction = (entry: BrainDailyLogEntry, emoji: string) => {
    const exists = entry.reactions.includes(emoji);
    const nextReactions = exists
      ? entry.reactions.filter((r) => r !== emoji)
      : [...entry.reactions, emoji];
    onUpdateDailyLog({ ...entry, reactions: nextReactions });
  };

  // Open Brain Dump Modal
  const openNewBrainDumpModal = (presetCategory?: BrainDumpCategory) => {
    setEditingDump(null);
    setDumpTitle('');
    setDumpDesc('');
    setDumpAuthor(defaultAuthor);
    setDumpCategory(presetCategory || 'Ideas');
    setDumpPriority('High');
    setDumpClientName('');
    setDumpTagsInput('');
    setDumpPinned(false);
    setShowDumpModal(true);
  };

  const openEditBrainDumpModal = (note: BrainDumpNote) => {
    setEditingDump(note);
    setDumpTitle(note.title);
    setDumpDesc(note.description);
    setDumpAuthor(note.author);
    setDumpCategory(note.category);
    setDumpPriority(note.priority);
    setDumpClientName(note.linkedClientName || '');
    setDumpTagsInput((note.tags || []).join(', '));
    setDumpPinned(Boolean(note.pinned));
    setShowDumpModal(true);
  };

  const handleAutoCategorizeDump = () => {
    const suggestion = autoSuggestBrainCategoryAndTags(`${dumpTitle} ${dumpDesc}`);
    setDumpCategory(suggestion.category);
    setDumpPriority(suggestion.priority);
    setDumpTagsInput(suggestion.tags.join(', '));
  };

  const handleBrainDumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dumpTitle.trim()) return;

    const matchedClient = dbState.clients.find(
      (c) => c.businessName.toLowerCase() === dumpClientName.trim().toLowerCase()
    );
    const suggestion = autoSuggestBrainCategoryAndTags(`${dumpTitle} ${dumpDesc}`);
    const parsedTags = dumpTagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (editingDump) {
      onUpdateBrainDump({
        ...editingDump,
        title: dumpTitle.trim(),
        description: dumpDesc.trim() || dumpTitle.trim(),
        author: dumpAuthor,
        category: dumpCategory,
        priority: dumpPriority,
        linkedClientId: matchedClient?.id,
        linkedClientName: matchedClient?.businessName || (dumpClientName.trim() || undefined),
        pinned: dumpPinned,
        tags: parsedTags.length > 0 ? parsedTags : suggestion.tags,
      });
    } else {
      onAddBrainDump({
        id: `bdump-${Date.now()}`,
        title: dumpTitle.trim(),
        description: dumpDesc.trim() || dumpTitle.trim(),
        author: dumpAuthor,
        date: todayStr,
        category: dumpCategory,
        priority: dumpPriority,
        linkedClientId: matchedClient?.id,
        linkedClientName: matchedClient?.businessName || (dumpClientName.trim() || undefined),
        status: 'Unsorted',
        pinned: dumpPinned,
        tags: parsedTags.length > 0 ? parsedTags : suggestion.tags,
      });
    }
    setShowDumpModal(false);
  };

  // Handover Submit
  const handleHandoverSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!handoverTitle.trim() || !handoverContent.trim()) return;

    const matchedClient = dbState.clients.find(
      (c) => c.businessName.toLowerCase() === handoverClientName.trim().toLowerCase()
    );

    const actionLines = handoverChecklistText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const newHandover: BrainHandoverNote = {
      id: `bhand-${Date.now()}`,
      from: handoverFrom,
      to: handoverTo,
      date: todayStr,
      time: currentTimeStr,
      title: handoverTitle.trim(),
      content: handoverContent.trim(),
      actionItems: actionLines.map((text, idx) => ({
        id: `hact-${Date.now()}-${idx}`,
        text,
        completed: false,
      })),
      linkedClientId: matchedClient?.id,
      linkedClientName:
        matchedClient?.businessName || (handoverClientName.trim() || undefined),
      status: 'Unread',
      replies: [],
      reactions: [],
    };

    onAddHandover(newHandover);
    setHandoverTitle('');
    setHandoverContent('');
    setHandoverClientName('');
    setHandoverChecklistText('');
    setShowHandoverModal(false);
  };

  const handleAddHandoverReply = (handover: BrainHandoverNote) => {
    const text = (replyTexts[handover.id] || '').trim();
    if (!text) return;
    const replyAuthor: 'Krishna' | 'Vansh' =
      activeFounderFilter === 'Vansh'
        ? 'Vansh'
        : activeFounderFilter === 'Krishna'
        ? 'Krishna'
        : handover.to;

    onUpdateHandover({
      ...handover,
      status: handover.status === 'Unread' ? 'Read' : handover.status,
      replies: [
        ...handover.replies,
        {
          id: `hrep-${Date.now()}`,
          author: replyAuthor,
          text,
          timestamp: `${todayStr} ${currentTimeStr}`,
        },
      ],
    });
    setReplyTexts((prev) => ({ ...prev, [handover.id]: '' }));
  };

  // Memory Submit
  const openNewMemoryModal = (presetCategory?: BrainMemoryCategory) => {
    setEditingMemory(null);
    setMemTitle('');
    setMemCategory(presetCategory || 'Decisions');
    setMemContent('');
    setMemReasoning('');
    setMemAuthor('Both');
    setMemTags('');
    setMemPinned(true);
    setShowMemoryModal(true);
  };

  const openEditMemoryModal = (entry: BrainMemoryEntry) => {
    setEditingMemory(entry);
    setMemTitle(entry.title);
    setMemCategory(entry.category);
    setMemContent(entry.content);
    setMemReasoning(entry.reasoning || '');
    setMemAuthor(entry.author);
    setMemTags(entry.tags.join(', '));
    setMemPinned(Boolean(entry.pinned));
    setShowMemoryModal(true);
  };

  const handleMemorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memTitle.trim() || !memContent.trim()) return;

    const tags = memTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (editingMemory) {
      onUpdateMemory({
        ...editingMemory,
        title: memTitle.trim(),
        category: memCategory,
        content: memContent.trim(),
        reasoning: memReasoning.trim() || undefined,
        author: memAuthor,
        pinned: memPinned,
        tags: tags.length > 0 ? tags : [memCategory],
      });
    } else {
      onAddMemory({
        id: `mem-${Date.now()}`,
        title: memTitle.trim(),
        category: memCategory,
        content: memContent.trim(),
        reasoning: memReasoning.trim() || undefined,
        author: memAuthor,
        date: todayStr,
        pinned: memPinned,
        tags: tags.length > 0 ? tags : [memCategory],
      });
    }
    setShowMemoryModal(false);
  };

  // Generate Weekly Recap On-Demand
  const handleGenerateWeeklyRecap = async () => {
    setIsGeneratingRecap(true);
    try {
      const res = await fetch('/api/brain/weekly-recap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Aethel-Request': 'same-origin' },
        body: JSON.stringify({ state: dbState }),
      });
      if (res.ok) {
        const data = (await res.json()) as { recap: BrainWeeklyRecap };
        if (data.recap) {
          onSaveWeeklyRecap(data.recap);
          setSelectedRecapId(data.recap.id);
          setIsGeneratingRecap(false);
          return;
        }
      }
    } catch {
      // Fall back to deterministic grounded generator
    }
    const localRecap = generateGroundedWeeklyRecap(dbState);
    onSaveWeeklyRecap(localRecap);
    setSelectedRecapId(localRecap.id);
    setIsGeneratingRecap(false);
  };

  // Filtered Daily Logs grouped by date
  const filteredLogs = dailyLogs.filter((l) => {
    if (logFilter === 'Krishna') return l.author === 'Krishna';
    if (logFilter === 'Vansh') return l.author === 'Vansh';
    if (logFilter === 'Pinned') return Boolean(l.pinned);
    return true;
  });

  const logsByDate = filteredLogs.reduce<Record<string, BrainDailyLogEntry[]>>((acc, entry) => {
    const key = entry.date || todayStr;
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {});

  const formatDateHeading = (dateStr: string) => {
    const parsed = new Date(`${dateStr}T00:00:00`);
    if (isNaN(parsed.getTime())) return dateStr.toUpperCase();
    return parsed
      .toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
      .toUpperCase();
  };

  // Filtered Brain Dumps
  const filteredDumps = brainDumps.filter((d) => {
    if (dumpCategoryFilter !== 'All' && d.category !== dumpCategoryFilter) return false;
    if (dumpStatusFilter !== 'All' && d.status !== dumpStatusFilter) return false;
    return true;
  });

  // Filtered Handovers
  const filteredHandovers = handovers.filter((h) => {
    if (handoverFilter === 'Unread') return h.status === 'Unread';
    if (handoverFilter === 'For Krishna') return h.to === 'Krishna';
    if (handoverFilter === 'For Vansh') return h.to === 'Vansh';
    if (handoverFilter === 'Acknowledged') return h.status === 'Acknowledged';
    return true;
  });

  // Filtered Memories
  const filteredMemories = memories.filter((m) =>
    memCategoryFilter === 'All' ? true : m.category === memCategoryFilter
  );

  return (
    <div className="space-y-6">
      {/* UNREAD HANDOVER TOP ALERT BANNER */}
      {unreadHandovers.length > 0 && (
        <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl p-3.5 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#F59E0B] text-white flex items-center justify-center shrink-0">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-extrabold text-[#92400E]">
                You have {unreadHandovers.length} unread handover update
                {unreadHandovers.length === 1 ? '' : 's'} from{' '}
                {Array.from(new Set(unreadHandovers.map((h) => h.from))).join(' & ')}
              </div>
              <div className="text-[11px] text-[#B45309] line-clamp-1">
                Latest: "{unreadHandovers[0].title}" ({unreadHandovers[0].from} → @
                {unreadHandovers[0].to})
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveTab('handovers')}
              className="px-3 py-1.5 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Open Handover Notes
            </button>
            <button
              onClick={() =>
                onUpdateHandover({ ...unreadHandovers[0], status: 'Acknowledged' })
              }
              className="px-3 py-1.5 rounded-xl bg-white border border-[#FCD34D] text-[#92400E] hover:bg-[#FEF3C7] text-xs font-bold transition-colors cursor-pointer"
            >
              Acknowledge Latest
            </button>
          </div>
        </div>
      )}

      {/* AETHEL BRAIN HERO HEADER + "WHAT SHOULD I FOCUS ON TODAY?" BAR */}
      <div className="bg-white rounded-3xl border border-[#EAECEF] p-5 sm:p-7 shadow-2xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#EFF6FF] text-[#2563EB] text-[10px] font-mono font-bold uppercase tracking-wider">
                <Brain className="w-3.5 h-3.5" /> AETHEL BRAIN · SHARED MEMORY & INTELLIGENCE
              </span>
              <span className="text-[11px] font-mono text-[#64748B]">
                Co-Founders: Krishna Khakole &amp; Vansh Khakole
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0B0F19]">
              Good day, Krishna &amp; Vansh. Here's what's happening at Aethel.
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B]">
              One shared studio brain for daily activity logs, unsorted ideas, asynchronous founder handovers, weekly AI briefs, and institutional decisions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => openNewBrainDumpModal()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F8F9FA] hover:bg-[#F1F5F9] text-[#0B0F19] border border-[#EAECEF] text-xs font-bold transition-colors cursor-pointer"
            >
              <Lightbulb className="w-3.5 h-3.5 text-[#D97706]" /> + Brain Dump
            </button>
            <button
              onClick={() => setShowHandoverModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F8F9FA] hover:bg-[#F1F5F9] text-[#0B0F19] border border-[#EAECEF] text-xs font-bold transition-colors cursor-pointer"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-[#2563EB]" /> + Handover Note
            </button>
            <button
              onClick={() => {
                setActiveTab('weekly-recap');
                handleGenerateWeeklyRecap();
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B0F19] hover:bg-[#1E293B] text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#60A5FA]" /> Generate Weekly Brief
            </button>
          </div>
        </div>

        {/* AI INSTITUTIONAL MEMORY & DAILY FOCUS BAR */}
        <div className="bg-[#F8F9FA] rounded-2xl p-3.5 sm:p-4 border border-[#EAECEF] space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleRunBrainQuery();
            }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#2563EB] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                placeholder="Ask Aethel Brain: 'What should I focus on today?', 'Why did we decide on our pricing?', 'What did Vansh say?'..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#E2E8F0] focus:border-[#2563EB] text-xs sm:text-sm text-[#0B0F19] placeholder-[#94A3B8] focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isAskingAi}
                className="px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isAskingAi ? 'Analyzing Brain...' : 'Ask Aethel Brain'}
              </button>
              {aiResult && (
                <button
                  type="button"
                  onClick={() => {
                    setAiResult(null);
                    setAiQuery('');
                  }}
                  className="px-2.5 py-2.5 rounded-xl bg-white border border-[#EAECEF] text-xs font-semibold text-[#64748B] hover:text-[#0B0F19] cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </form>

          {/* Preset 1-Click Prompts */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] mr-1">
              Instant Prompts:
            </span>
            {[
              'What should I focus on today?',
              'Why did we decide on our pricing?',
              'What ideas have we not implemented yet?',
              'What did Vansh log recently?',
              'What did Krishna log recently?',
            ].map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => handleRunBrainQuery(prompt)}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#EFF6FF] text-[#475569] hover:text-[#2563EB] border border-[#E2E8F0] text-[11px] font-semibold transition-colors cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Grounded Answer & Matching Records Drawer */}
          {aiResult && (
            <div className="bg-white rounded-2xl border border-[#BFDBFE] p-4 space-y-3 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#2563EB] flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> AETHEL BRAIN SYNTHESIS (GROUNDED IN STUDIO RECORDS)
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-[#0B0F19] leading-relaxed">
                    {aiResult.directAnswer}
                  </p>
                </div>
              </div>

              {aiResult.focusPriorities.length > 0 && (
                <div className="pt-2 border-t border-[#F1F5F9]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1.5">
                    Recommended Action Priorities:
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                    {aiResult.focusPriorities.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 text-xs text-[#334155] bg-[#F8F9FA] px-3 py-1.5 rounded-lg"
                      >
                        <span className="font-mono font-bold text-[#2563EB]">0{idx + 1}</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {aiResult.matches.length > 0 && (
                <div className="pt-2 border-t border-[#F1F5F9]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1.5">
                    Matching Institutional Records ({aiResult.matches.length}):
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto">
                    {aiResult.matches.slice(0, 6).map((m) => (
                      <div
                        key={`${m.sourceType}-${m.id}`}
                        onClick={() => {
                          if (m.clientId) onOpenClient360(m.clientId);
                        }}
                        className={`p-2.5 rounded-xl border border-[#EAECEF] bg-[#FAFBFC] text-left ${
                          m.clientId ? 'hover:border-[#2563EB] cursor-pointer' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-[#64748B]">
                          <span className="font-bold text-[#2563EB]">{m.sourceType}</span>
                          <span>{m.badge}</span>
                        </div>
                        <div className="text-xs font-bold text-[#0B0F19] mt-0.5 truncate">
                          {m.title}
                        </div>
                        <div className="text-[11px] text-[#475569] line-clamp-2 mt-0.5">
                          {m.snippet}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SUB-NAVIGATION TABS FOR THE 6 AETHEL BRAIN COMPONENTS */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 border-t border-[#F1F3F5]">
          {[
            { id: 'overview', label: 'Overview', icon: Brain, count: undefined },
            {
              id: 'daily-log',
              label: '1. The Daily Log',
              icon: MessageSquare,
              count: dailyLogs.length,
            },
            {
              id: 'brain-dump',
              label: '2. Brain Dump',
              icon: Lightbulb,
              count: activeBrainDumps.length,
            },
            {
              id: 'handovers',
              label: '3. Handover Notes',
              icon: ArrowRightLeft,
              count: unreadHandovers.length > 0 ? unreadHandovers.length : handovers.length,
              alert: unreadHandovers.length > 0,
            },
            {
              id: 'weekly-recap',
              label: '4. Weekly Recaps (AI Brief)',
              icon: FileText,
              count: weeklyRecaps.length,
            },
            {
              id: 'memory',
              label: '5. Aethel Memory (Wiki)',
              icon: BookOpen,
              count: memories.length,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as BrainSubTab)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-[#0B0F19] text-white shadow-xs'
                    : 'bg-[#F8F9FA] text-[#475569] hover:text-[#0B0F19] hover:bg-[#F1F5F9]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                      tab.alert
                        ? 'bg-[#E11D48] text-white'
                        : isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-white text-[#475569]'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          SUB-VIEW 0: AETHEL BRAIN OVERVIEW (DEFAULT LANDING PAGE)
         ===================================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 4 SNAPSHOT CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => setActiveTab('daily-log')}
              className="bg-white p-5 rounded-2xl border border-[#EAECEF] hover:border-[#2563EB] text-left transition-all shadow-2xs cursor-pointer group"
            >
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                <span>1. Updates This Week</span>
                <MessageSquare className="w-4 h-4 text-[#2563EB]" />
              </div>
              <div className="text-2xl font-extrabold font-mono text-[#0B0F19] mt-2">
                {dailyLogs.length}
              </div>
              <div className="text-xs text-[#64748B] mt-1 flex items-center justify-between">
                <span>
                  Krishna: {dailyLogs.filter((l) => l.author === 'Krishna').length} · Vansh:{' '}
                  {dailyLogs.filter((l) => l.author === 'Vansh').length}
                </span>
                <span className="text-[#2563EB] font-bold group-hover:translate-x-0.5 transition-transform">
                  Open Log →
                </span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('handovers')}
              className="bg-white p-5 rounded-2xl border border-[#EAECEF] hover:border-[#2563EB] text-left transition-all shadow-2xs cursor-pointer group"
            >
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                <span>2. Unread Handovers</span>
                <ArrowRightLeft
                  className={`w-4 h-4 ${
                    unreadHandovers.length > 0 ? 'text-[#D97706]' : 'text-[#059669]'
                  }`}
                />
              </div>
              <div className="text-2xl font-extrabold font-mono text-[#0B0F19] mt-2">
                {unreadHandovers.length}
              </div>
              <div className="text-xs text-[#64748B] mt-1 flex items-center justify-between">
                <span>{handovers.length} total founder handovers</span>
                <span className="text-[#2563EB] font-bold group-hover:translate-x-0.5 transition-transform">
                  Review →
                </span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('brain-dump')}
              className="bg-white p-5 rounded-2xl border border-[#EAECEF] hover:border-[#2563EB] text-left transition-all shadow-2xs cursor-pointer group"
            >
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                <span>3. Active Ideas &amp; Dumps</span>
                <Lightbulb className="w-4 h-4 text-[#D97706]" />
              </div>
              <div className="text-2xl font-extrabold font-mono text-[#0B0F19] mt-2">
                {activeBrainDumps.length}
              </div>
              <div className="text-xs text-[#64748B] mt-1 flex items-center justify-between">
                <span>
                  {brainDumps.filter((d) => d.status === 'Unsorted').length} unsorted ·{' '}
                  {brainDumps.filter((d) => d.convertedTaskId).length} converted
                </span>
                <span className="text-[#2563EB] font-bold group-hover:translate-x-0.5 transition-transform">
                  Explore →
                </span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('weekly-recap')}
              className="bg-[#0B0F19] text-white p-5 rounded-2xl border border-[#0B0F19] text-left transition-all shadow-2xs cursor-pointer group"
            >
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#60A5FA]">
                <span>4. Weekly Recap Available</span>
                <Sparkles className="w-4 h-4 text-[#60A5FA]" />
              </div>
              <div className="text-lg font-extrabold text-white mt-2 truncate">
                AETHEL WEEKLY BRIEF
              </div>
              <div className="text-xs text-slate-300 mt-1.5 flex items-center justify-between">
                <span className="truncate">{activeRecap.weekRange}</span>
                <span className="text-[#60A5FA] font-bold shrink-0 ml-2 group-hover:translate-x-0.5 transition-transform">
                  Read Brief →
                </span>
              </div>
            </button>
          </div>

          {/* MAIN SECTION — 2-COLUMN ASYMMETRICAL LAYOUT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT COLUMN (7 Cols): Quick Daily Log Input + Today's Activity Timeline + Recent Notes */}
            <div className="lg:col-span-7 space-y-6">
              {/* Quick "What's on your mind?" Capture Card */}
              <div className="bg-white rounded-3xl border border-[#EAECEF] p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-[#0B0F19] flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#2563EB]" />
                    Quick Daily Log — What happened today?
                  </div>
                  <div className="flex items-center gap-1 bg-[#F8F9FA] p-0.5 rounded-xl border border-[#EAECEF]">
                    {(['Krishna', 'Vansh'] as const).map((founder) => (
                      <button
                        key={founder}
                        type="button"
                        onClick={() => setLogAuthor(founder)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                          logAuthor === founder
                            ? 'bg-[#0B0F19] text-white'
                            : 'text-[#64748B] hover:text-[#0B0F19]'
                        }`}
                      >
                        {founder}
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleDailyLogSubmit} className="space-y-2.5">
                  <div className="relative">
                    <input
                      type="text"
                      value={logContent}
                      onChange={(e) => setLogContent(e.target.value)}
                      placeholder={`What's on your mind, ${logAuthor}? (e.g., "Contacted 3 potential clients", "Updated pricing packages", "@Vansh check domain")`}
                      className="w-full pl-3.5 pr-11 py-3 rounded-2xl bg-[#F8F9FA] focus:bg-white border border-[#EAECEF] focus:border-[#2563EB] text-xs sm:text-sm text-[#0B0F19] placeholder-[#94A3B8] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleToggleVoiceDictation}
                      title="Voice Note Dictation (Speak and convert to text)"
                      className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                        isListeningVoice
                          ? 'bg-[#E11D48] text-white animate-pulse'
                          : 'bg-white text-[#64748B] hover:text-[#0B0F19] border border-[#EAECEF]'
                      }`}
                    >
                      {isListeningVoice ? (
                        <MicOff className="w-3.5 h-3.5" />
                      ) : (
                        <Mic className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="text"
                        list="brain-clients-datalist"
                        value={logClientName}
                        onChange={(e) => setLogClientName(e.target.value)}
                        placeholder="Optional: Link client..."
                        className="px-3 py-1.5 rounded-xl bg-[#F8F9FA] border border-[#EAECEF] text-xs text-[#0B0F19] focus:outline-none focus:border-[#2563EB]"
                      />
                      <datalist id="brain-clients-datalist">
                        {dbState.clients.map((c) => (
                          <option key={c.id} value={c.businessName} />
                        ))}
                      </datalist>
                      <button
                        type="button"
                        onClick={() =>
                          setLogContent((prev) =>
                            `${prev} @${logAuthor === 'Krishna' ? 'Vansh' : 'Krishna'} `.trimStart()
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-[#EFF6FF] text-[#2563EB] text-[11px] font-bold hover:bg-[#DBEAFE] cursor-pointer"
                      >
                        @{logAuthor === 'Krishna' ? 'Vansh' : 'Krishna'}
                      </button>
                    </div>

                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" /> Post to Daily Log
                    </button>
                  </div>
                </form>
              </div>

              {/* Today's Activity Timeline */}
              <div className="bg-white rounded-3xl border border-[#EAECEF] p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#2563EB]">
                      CHRONOLOGICAL JOURNAL
                    </span>
                    <h2 className="text-base font-extrabold text-[#0B0F19]">
                      Today's Activity &amp; Recent Timeline
                    </h2>
                  </div>
                  <button
                    onClick={() => setActiveTab('daily-log')}
                    className="text-xs font-bold text-[#2563EB] hover:underline cursor-pointer"
                  >
                    Full Daily Log ({dailyLogs.length}) →
                  </button>
                </div>

                <div className="divide-y divide-[#F1F3F5]">
                  {dailyLogs.slice(0, 6).map((entry) => (
                    <div
                      key={entry.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="text-[11px] font-mono text-[#64748B] w-16 shrink-0 pt-0.5">
                          {entry.time}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                            entry.author === 'Krishna'
                              ? 'bg-[#EFF6FF] text-[#2563EB]'
                              : 'bg-[#ECFDF5] text-[#059669]'
                          }`}
                        >
                          {entry.author}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm text-[#0B0F19] font-medium">
                            {entry.content}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {entry.linkedClientName && (
                              <button
                                onClick={() =>
                                  entry.linkedClientId && onOpenClient360(entry.linkedClientId)
                                }
                                className="text-[10px] font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-md hover:underline cursor-pointer"
                              >
                                Client: {entry.linkedClientName}
                              </button>
                            )}
                            {entry.mentions.map((m) => (
                              <span
                                key={m}
                                className="text-[10px] font-bold text-[#D97706] bg-[#FEF3C7] px-1.5 py-0.5 rounded"
                              >
                                @{m}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 self-end sm:self-center shrink-0">
                        {QUICK_REACTIONS.map((emoji) => {
                          const active = entry.reactions.includes(emoji);
                          return (
                            <button
                              key={emoji}
                              onClick={() => handleToggleLogReaction(entry, emoji)}
                              className={`px-1.5 py-0.5 rounded-lg text-xs border transition-colors cursor-pointer ${
                                active
                                  ? 'bg-[#EFF6FF] border-[#BFDBFE]'
                                  : 'bg-[#F8F9FA] border-transparent opacity-60 hover:opacity-100'
                              }`}
                            >
                              {emoji}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Brain Dump Notes with 1-Click Convert to Task */}
              <div className="bg-white rounded-3xl border border-[#EAECEF] p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#D97706]">
                      BRAIN DUMP · IDEAS &amp; ISSUES
                    </span>
                    <h2 className="text-base font-extrabold text-[#0B0F19]">
                      Recent Brain Dump Notes
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openNewBrainDumpModal()}
                      className="px-2.5 py-1 rounded-lg bg-[#F8F9FA] hover:bg-[#F1F5F9] border border-[#EAECEF] text-xs font-bold text-[#0B0F19] cursor-pointer"
                    >
                      + Add Note
                    </button>
                    <button
                      onClick={() => setActiveTab('brain-dump')}
                      className="text-xs font-bold text-[#2563EB] hover:underline cursor-pointer"
                    >
                      View All →
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {activeBrainDumps.slice(0, 4).map((note) => (
                    <div
                      key={note.id}
                      className="p-3.5 rounded-2xl border border-[#EAECEF] bg-[#FAFBFC] hover:bg-white transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-white border border-[#EAECEF] text-[10px] font-bold text-[#0B0F19]">
                            {note.category}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              note.author === 'Krishna'
                                ? 'bg-[#EFF6FF] text-[#2563EB]'
                                : 'bg-[#ECFDF5] text-[#059669]'
                            }`}
                          >
                            {note.author}
                          </span>
                          <span className="text-[10px] font-mono text-[#64748B]">{note.date}</span>
                        </div>
                        <div className="text-xs sm:text-sm font-bold text-[#0B0F19]">
                          {note.title}
                        </div>
                        <p className="text-xs text-[#64748B] line-clamp-2">{note.description}</p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {note.convertedTaskId ? (
                          <button
                            onClick={() => onNavigateModule('tasks')}
                            className="px-2.5 py-1.5 rounded-xl bg-[#D1FAE5] text-[#059669] text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Task Created
                          </button>
                        ) : (
                          <button
                            onClick={() => onConvertBrainDumpToTask(note.id, note.author)}
                            className="px-3 py-1.5 rounded-xl bg-[#0B0F19] hover:bg-[#2563EB] text-white text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <CheckSquare className="w-3 h-3" /> Convert to Task
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN (5 Cols): Unread Handovers + Weekly AI Summary Preview + Upcoming Priorities */}
            <div className="lg:col-span-5 space-y-6">
              {/* Co-Founder Handover Notes Panel */}
              <div className="bg-white rounded-3xl border border-[#EAECEF] p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#2563EB]">
                      ASYNC CO-FOUNDER SYNC
                    </span>
                    <h2 className="text-base font-extrabold text-[#0B0F19]">
                      Handover Notes (Krishna ↔ Vansh)
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowHandoverModal(true)}
                    className="px-2.5 py-1 rounded-lg bg-[#EFF6FF] text-[#2563EB] text-xs font-bold hover:bg-[#DBEAFE] cursor-pointer"
                  >
                    + Leave Note
                  </button>
                </div>

                <div className="space-y-3">
                  {handovers.slice(0, 3).map((h) => (
                    <div
                      key={h.id}
                      className={`p-4 rounded-2xl border space-y-2.5 ${
                        h.status === 'Unread'
                          ? 'bg-[#FFFBEB] border-[#FDE68A]'
                          : 'bg-[#F8F9FA] border-[#EAECEF]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B0F19]">
                          <span className="px-2 py-0.5 rounded bg-white border border-[#EAECEF]">
                            From: {h.from}
                          </span>
                          <span>→</span>
                          <span className="px-2 py-0.5 rounded bg-[#0B0F19] text-white">
                            To: @{h.to}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            h.status === 'Unread'
                              ? 'bg-[#FEF3C7] text-[#D97706]'
                              : h.status === 'Acknowledged'
                              ? 'bg-[#D1FAE5] text-[#059669]'
                              : 'bg-[#EFF6FF] text-[#2563EB]'
                          }`}
                        >
                          {h.status}
                        </span>
                      </div>

                      <div>
                        <div className="text-xs sm:text-sm font-extrabold text-[#0B0F19]">
                          {h.title}
                        </div>
                        <p className="text-xs text-[#475569] mt-0.5 leading-relaxed">
                          {h.content}
                        </p>
                      </div>

                      {h.actionItems.length > 0 && (
                        <div className="space-y-1 pt-1">
                          {h.actionItems.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between gap-2 text-xs bg-white/80 px-2.5 py-1.5 rounded-lg border border-[#EAECEF]"
                            >
                              <span className="truncate font-medium text-[#0B0F19]">
                                • {item.text}
                              </span>
                              {item.convertedToTask ? (
                                <span className="text-[10px] font-bold text-[#059669] shrink-0">
                                  ✓ Task
                                </span>
                              ) : (
                                <button
                                  onClick={() => onConvertHandoverItemToTask(h.id, item.id)}
                                  className="text-[10px] font-bold text-[#2563EB] hover:underline shrink-0 cursor-pointer"
                                >
                                  + To Task
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] font-mono text-[#64748B]">
                          {h.date} · {h.time}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {h.status !== 'Acknowledged' && (
                            <button
                              onClick={() =>
                                onUpdateHandover({ ...h, status: 'Acknowledged' })
                              }
                              className="px-2.5 py-1 rounded-lg bg-[#059669] text-white text-[10px] font-bold hover:bg-[#047857] cursor-pointer"
                            >
                              ✓ Acknowledge
                            </button>
                          )}
                          <button
                            onClick={() => setActiveTab('handovers')}
                            className="text-[11px] font-bold text-[#2563EB] hover:underline cursor-pointer"
                          >
                            Reply →
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* This Week's AI Summary Preview */}
              <div className="bg-[#0B0F19] text-white rounded-3xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#60A5FA] flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> AUTOMATED WEEKLY BRIEF
                    </span>
                    <h2 className="text-base font-extrabold text-white mt-0.5">
                      This Week's AI Summary Preview
                    </h2>
                  </div>
                  <span className="text-[10px] font-mono bg-white/10 px-2 py-0.5 rounded text-slate-300">
                    {activeRecap.weekRange}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {activeRecap.executiveSummary}
                </p>

                {activeRecap.aiObservations.length > 0 && (
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                    <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300">
                      07 — Key AI Observations
                    </div>
                    {activeRecap.aiObservations.slice(0, 2).map((obs, i) => (
                      <div key={i} className="text-xs text-slate-200 leading-snug">
                        • {obs}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={handleGenerateWeeklyRecap}
                    disabled={isGeneratingRecap}
                    className="text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${isGeneratingRecap ? 'animate-spin' : ''}`}
                    />
                    {isGeneratingRecap ? 'Refreshing...' : 'Refresh Recap'}
                  </button>
                  <button
                    onClick={() => setActiveTab('weekly-recap')}
                    className="px-3.5 py-1.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Open Full 7-Section Brief →
                  </button>
                </div>
              </div>

              {/* Upcoming Priorities */}
              <div className="bg-white rounded-3xl border border-[#EAECEF] p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#059669]">
                      FOCUS ENGINE
                    </span>
                    <h2 className="text-base font-extrabold text-[#0B0F19]">
                      Today's Grounded Priorities
                    </h2>
                  </div>
                  <button
                    onClick={() => onNavigateModule('tasks')}
                    className="text-xs font-bold text-[#2563EB] hover:underline cursor-pointer"
                  >
                    All Tasks →
                  </button>
                </div>
                <div className="space-y-2">
                  {focusPreview.focusPriorities.slice(0, 4).map((p, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF] flex items-start gap-2.5 text-xs text-[#0B0F19] font-medium"
                    >
                      <span className="px-1.5 py-0.5 rounded bg-[#EFF6FF] text-[#2563EB] font-mono font-bold text-[10px]">
                        0{idx + 1}
                      </span>
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM SECTION — RECENT DECISIONS, PINNED NOTES & PREVIOUS WEEKLY RECAPS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Recent Decisions */}
            <div className="bg-white rounded-3xl border border-[#EAECEF] p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-extrabold uppercase tracking-wider text-[#0B0F19] flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-[#2563EB]" /> Recent Decisions
                </div>
                <button
                  onClick={() => setActiveTab('memory')}
                  className="text-xs font-bold text-[#2563EB] hover:underline cursor-pointer"
                >
                  Aethel Memory →
                </button>
              </div>
              <div className="space-y-2.5">
                {memories.slice(0, 3).map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF] space-y-1"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#64748B]">
                      <span className="font-bold text-[#2563EB]">{m.category}</span>
                      <span>{m.date}</span>
                    </div>
                    <div className="text-xs font-bold text-[#0B0F19]">{m.title}</div>
                    <p className="text-[11px] text-[#475569] line-clamp-2">{m.content}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Pinned Notes */}
            <div className="bg-white rounded-3xl border border-[#EAECEF] p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-extrabold uppercase tracking-wider text-[#0B0F19] flex items-center gap-1.5">
                  <Pin className="w-4 h-4 text-[#D97706]" /> Pinned Studio Notes
                </div>
                <button
                  onClick={() => setActiveTab('brain-dump')}
                  className="text-xs font-bold text-[#2563EB] hover:underline cursor-pointer"
                >
                  Manage →
                </button>
              </div>
              <div className="space-y-2.5">
                {[...pinnedBrainDumps, ...pinnedMemories].slice(0, 3).map((item) => {
                  const isDump = 'description' in item;
                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl bg-[#FFFBEB]/60 border border-[#FDE68A] space-y-1"
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono text-[#B45309]">
                        <span className="font-bold">{item.category}</span>
                        <span>By {item.author}</span>
                      </div>
                      <div className="text-xs font-bold text-[#0B0F19]">{item.title}</div>
                      <p className="text-[11px] text-[#475569] line-clamp-2">
                        {isDump ? item.description : item.content}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Previous Weekly Recaps */}
            <div className="bg-white rounded-3xl border border-[#EAECEF] p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-extrabold uppercase tracking-wider text-[#0B0F19] flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#059669]" /> Weekly Recap Archive
                </div>
                <button
                  onClick={() => setActiveTab('weekly-recap')}
                  className="text-xs font-bold text-[#2563EB] hover:underline cursor-pointer"
                >
                  Open Briefs →
                </button>
              </div>
              <div className="space-y-2.5">
                {weeklyRecaps.map((recap) => (
                  <button
                    key={recap.id}
                    onClick={() => {
                      setSelectedRecapId(recap.id);
                      setActiveTab('weekly-recap');
                    }}
                    className="w-full p-3 rounded-2xl bg-[#F8F9FA] hover:bg-[#EFF6FF] border border-[#EAECEF] text-left transition-colors cursor-pointer space-y-1"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#64748B]">
                      <span className="font-bold text-[#0B0F19]">AETHEL WEEKLY BRIEF</span>
                      <span>{recap.weekRange}</span>
                    </div>
                    <p className="text-[11px] text-[#475569] line-clamp-2">
                      {recap.executiveSummary}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-VIEW 1: THE DAILY LOG — "WHAT HAPPENED TODAY?"
         ===================================================================== */}
      {activeTab === 'daily-log' && (
        <div className="space-y-6">
          {/* WhatsApp-Style Effortless Input Card */}
          <div className="bg-white rounded-3xl border border-[#EAECEF] p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#2563EB]">
                  COMPONENT 01 · CHRONOLOGICAL FOUNDER JOURNAL
                </span>
                <h2 className="text-lg font-extrabold text-[#0B0F19]">
                  The Daily Log — What happened today?
                </h2>
                <p className="text-xs text-[#64748B]">
                  Record what you completed, client calls, observations, or @mention your co-founder in seconds.
                </p>
              </div>

              <div className="flex items-center gap-1.5 bg-[#F8F9FA] p-1 rounded-xl border border-[#EAECEF] self-start">
                {(['Krishna', 'Vansh'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setLogAuthor(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      logAuthor === f
                        ? 'bg-[#0B0F19] text-white'
                        : 'text-[#64748B] hover:text-[#0B0F19]'
                    }`}
                  >
                    Logging as {f}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleDailyLogSubmit} className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={logContent}
                  onChange={(e) => setLogContent(e.target.value)}
                  placeholder="What's on your mind? (e.g. 'Worked on Aethel Studios website redesign', 'Contacted 3 potential clients', 'Updated pricing packages')"
                  className="w-full pl-4 pr-12 py-3.5 rounded-2xl bg-[#F8F9FA] focus:bg-white border border-[#EAECEF] focus:border-[#2563EB] text-sm text-[#0B0F19] placeholder-[#94A3B8] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleToggleVoiceDictation}
                  title="Dictate Voice Note"
                  className={`absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer ${
                    isListeningVoice
                      ? 'bg-[#E11D48] text-white animate-pulse'
                      : 'bg-white text-[#64748B] hover:text-[#0B0F19] border border-[#EAECEF]'
                  }`}
                >
                  {isListeningVoice ? (
                    <MicOff className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="text"
                    list="brain-clients-datalist"
                    value={logClientName}
                    onChange={(e) => setLogClientName(e.target.value)}
                    placeholder="Attach Client / Project (optional)..."
                    className="px-3.5 py-2 rounded-xl bg-[#F8F9FA] border border-[#EAECEF] text-xs text-[#0B0F19] focus:outline-none focus:border-[#2563EB]"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setLogContent((prev) => `${prev} @Krishna `.trimStart())
                    }
                    className="px-2.5 py-1.5 rounded-xl bg-[#EFF6FF] text-[#2563EB] text-xs font-bold hover:bg-[#DBEAFE] cursor-pointer"
                  >
                    + @Krishna
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setLogContent((prev) => `${prev} @Vansh `.trimStart())
                    }
                    className="px-2.5 py-1.5 rounded-xl bg-[#ECFDF5] text-[#059669] text-xs font-bold hover:bg-[#D1FAE5] cursor-pointer"
                  >
                    + @Vansh
                  </button>
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#0B0F19] hover:bg-[#2563EB] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Daily Log Entry
                </button>
              </div>
            </form>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-[#EAECEF]">
              {(['All', 'Krishna', 'Vansh', 'Pinned'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setLogFilter(f)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    logFilter === f
                      ? 'bg-[#0B0F19] text-white'
                      : 'text-[#64748B] hover:text-[#0B0F19]'
                  }`}
                >
                  {f === 'All'
                    ? `All Entries (${dailyLogs.length})`
                    : f === 'Pinned'
                    ? 'Pinned'
                    : `${f}'s Entries`}
                </button>
              ))}
            </div>
          </div>

          {/* Grouped Chronological Timeline */}
          <div className="space-y-6">
            {Object.entries(logsByDate).map(([dateKey, entries]) => (
              <div
                key={dateKey}
                className="bg-white rounded-3xl border border-[#EAECEF] overflow-hidden shadow-2xs"
              >
                <div className="px-5 py-3.5 bg-[#F8F9FA] border-b border-[#EAECEF] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#2563EB]" />
                    <span className="text-xs font-extrabold tracking-wider text-[#0B0F19]">
                      {formatDateHeading(dateKey)}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-[#64748B]">
                    {entries.length} update{entries.length === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#F1F3F5] text-[10px] font-mono uppercase tracking-wider text-[#94A3B8]">
                        <th className="py-2.5 px-4 w-28">Time</th>
                        <th className="py-2.5 px-4 w-28">Person</th>
                        <th className="py-2.5 px-4">Update</th>
                        <th className="py-2.5 px-4 text-right w-48">Reactions &amp; Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F3F5] text-xs sm:text-sm">
                      {entries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-[#FAFBFC]">
                          <td className="py-3.5 px-4 font-mono text-xs text-[#64748B] whitespace-nowrap">
                            {entry.time}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                entry.author === 'Krishna'
                                  ? 'bg-[#EFF6FF] text-[#2563EB]'
                                  : 'bg-[#ECFDF5] text-[#059669]'
                              }`}
                            >
                              {entry.author}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-[#0B0F19] font-medium">
                            <div>{entry.content}</div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {entry.linkedClientName && (
                                <button
                                  onClick={() =>
                                    entry.linkedClientId && onOpenClient360(entry.linkedClientId)
                                  }
                                  className="text-[10px] font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded hover:underline cursor-pointer"
                                >
                                  Client: {entry.linkedClientName} ↗
                                </button>
                              )}
                              {entry.mentions.map((m) => (
                                <span
                                  key={m}
                                  className="text-[10px] font-bold text-[#D97706] bg-[#FEF3C7] px-1.5 py-0.5 rounded"
                                >
                                  @{m}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              {QUICK_REACTIONS.map((emoji) => {
                                const active = entry.reactions.includes(emoji);
                                return (
                                  <button
                                    key={emoji}
                                    onClick={() => handleToggleLogReaction(entry, emoji)}
                                    className={`px-1.5 py-0.5 rounded-lg text-xs border cursor-pointer ${
                                      active
                                        ? 'bg-[#EFF6FF] border-[#BFDBFE]'
                                        : 'bg-[#F8F9FA] border-transparent opacity-60 hover:opacity-100'
                                    }`}
                                  >
                                    {emoji}
                                  </button>
                                );
                              })}
                              <button
                                onClick={() =>
                                  onUpdateDailyLog({ ...entry, pinned: !entry.pinned })
                                }
                                title="Pin entry"
                                className={`p-1.5 rounded-lg cursor-pointer ${
                                  entry.pinned
                                    ? 'text-[#D97706] bg-[#FEF3C7]'
                                    : 'text-[#94A3B8] hover:text-[#0B0F19]'
                                }`}
                              >
                                <Pin className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onDeleteDailyLog(entry.id)}
                                title="Delete entry"
                                className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#E11D48] cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-VIEW 2: BRAIN DUMP — "THE PLACE FOR EVERYTHING"
         ===================================================================== */}
      {activeTab === 'brain-dump' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-[#EAECEF] p-5 sm:p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#D97706]">
                COMPONENT 02 · STRUCTURED &amp; UNSTRUCTURED IDEA CAPTURE
              </span>
              <h2 className="text-lg font-extrabold text-[#0B0F19]">
                Brain Dump — The Place for Everything
              </h2>
              <p className="text-xs text-[#64748B]">
                Dump sudden ideas, issues to fix, client notes, or business opportunities. Convert any note into a Studio Task in 1 click.
              </p>
            </div>
            <button
              onClick={() => openNewBrainDumpModal()}
              className="px-4 py-2.5 rounded-xl bg-[#0B0F19] hover:bg-[#2563EB] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 self-start sm:self-center"
            >
              <Plus className="w-4 h-4" /> + New Brain Dump Note
            </button>
          </div>

          {/* 8 Category Filter Pills + Status Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              <button
                onClick={() => setDumpCategoryFilter('All')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 cursor-pointer ${
                  dumpCategoryFilter === 'All'
                    ? 'bg-[#0B0F19] text-white'
                    : 'bg-white text-[#475569] border border-[#EAECEF]'
                }`}
              >
                All Categories ({brainDumps.length})
              </button>
              {BRAIN_DUMP_CATEGORIES.map((cat) => (
                <button
                  key={cat.label}
                  onClick={() => setDumpCategoryFilter(cat.label)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 cursor-pointer flex items-center gap-1 ${
                    dumpCategoryFilter === cat.label
                      ? 'bg-[#2563EB] text-white'
                      : 'bg-white text-[#475569] border border-[#EAECEF] hover:border-[#CBD5E1]'
                  }`}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#EAECEF] shrink-0 self-start">
              {(['All', 'Unsorted', 'In Progress', 'Archived'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setDumpStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                    dumpStatusFilter === st
                      ? 'bg-[#0B0F19] text-white'
                      : 'text-[#64748B] hover:text-[#0B0F19]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Brain Dump Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDumps.map((note) => {
              const catMeta =
                BRAIN_DUMP_CATEGORIES.find((c) => c.label === note.category) ||
                BRAIN_DUMP_CATEGORIES[0];
              return (
                <div
                  key={note.id}
                  className={`bg-white rounded-3xl border p-5 shadow-2xs flex flex-col justify-between gap-4 transition-all ${
                    note.pinned ? 'border-[#F59E0B] ring-1 ring-[#FEF3C7]' : 'border-[#EAECEF]'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F8F9FA] border border-[#EAECEF] text-[11px] font-bold text-[#0B0F19]">
                        <span>{catMeta.emoji}</span> {note.category}
                      </span>
                      <div className="flex items-center gap-1">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            note.status === 'Unsorted'
                              ? 'bg-[#FEF3C7] text-[#D97706]'
                              : note.status === 'In Progress'
                              ? 'bg-[#EFF6FF] text-[#2563EB]'
                              : 'bg-[#F1F5F9] text-[#64748B]'
                          }`}
                        >
                          {note.status}
                        </span>
                        <button
                          onClick={() =>
                            onUpdateBrainDump({ ...note, pinned: !note.pinned })
                          }
                          title="Pin note"
                          className={`p-1 rounded-lg cursor-pointer ${
                            note.pinned ? 'text-[#D97706]' : 'text-[#94A3B8] hover:text-[#0B0F19]'
                          }`}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-sm font-extrabold text-[#0B0F19] leading-snug">
                      {note.title}
                    </h3>
                    <p className="text-xs text-[#475569] leading-relaxed">{note.description}</p>

                    {note.linkedClientName && (
                      <button
                        onClick={() =>
                          note.linkedClientId && onOpenClient360(note.linkedClientId)
                        }
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2563EB] bg-[#EFF6FF] px-2.5 py-1 rounded-lg hover:underline cursor-pointer"
                      >
                        Linked Client: {note.linkedClientName} <ArrowUpRight className="w-3 h-3" />
                      </button>
                    )}

                    {note.tags && note.tags.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap pt-1">
                        {note.tags.map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 rounded-md bg-[#F8F9FA] text-[#64748B] text-[10px] font-mono"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[#F1F3F5] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-[#64748B]">
                      <span
                        className={`font-bold ${
                          note.author === 'Krishna' ? 'text-[#2563EB]' : 'text-[#059669]'
                        }`}
                      >
                        {note.author}
                      </span>
                      <span>·</span>
                      <span className="font-mono">{note.date}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {note.convertedTaskId ? (
                        <button
                          onClick={() => onNavigateModule('tasks')}
                          className="px-2.5 py-1 rounded-xl bg-[#D1FAE5] text-[#059669] text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3 h-3" /> In Tasks
                        </button>
                      ) : (
                        <button
                          onClick={() => onConvertBrainDumpToTask(note.id, note.author)}
                          className="px-2.5 py-1 rounded-xl bg-[#0B0F19] hover:bg-[#2563EB] text-white text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <CheckSquare className="w-3 h-3" /> Convert to Task
                        </button>
                      )}
                      <button
                        onClick={() => openEditBrainDumpModal(note)}
                        title="Edit note"
                        className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0B0F19] hover:bg-[#F8F9FA] cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() =>
                          onUpdateBrainDump({
                            ...note,
                            status: note.status === 'Archived' ? 'Unsorted' : 'Archived',
                          })
                        }
                        title="Archive / Unarchive"
                        className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0B0F19] hover:bg-[#F8F9FA] cursor-pointer"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteBrainDump(note.id)}
                        title="Delete note"
                        className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#E11D48] hover:bg-[#FFF1F2] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-VIEW 3: HANDOVER NOTES — "LEAVE MESSAGES FOR EACH OTHER"
         ===================================================================== */}
      {activeTab === 'handovers' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-[#EAECEF] p-5 sm:p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#2563EB]">
                COMPONENT 03 · ASYNCHRONOUS CO-FOUNDER HANDOVERS
              </span>
              <h2 className="text-lg font-extrabold text-[#0B0F19]">
                Handover Notes — Leave Messages for Each Other
              </h2>
              <p className="text-xs text-[#64748B]">
                Eliminate lost WhatsApp messages. Leave structured handovers with action checklists, client links, and acknowledgement tracking.
              </p>
            </div>
            <button
              onClick={() => setShowHandoverModal(true)}
              className="px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 self-start sm:self-center"
            >
              <Plus className="w-4 h-4" /> + Leave Handover Note
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['All', 'Unread', 'For Vansh', 'For Krishna', 'Acknowledged'] as const).map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => setHandoverFilter(tab)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                    handoverFilter === tab
                      ? 'bg-[#0B0F19] text-white'
                      : 'bg-white text-[#475569] border border-[#EAECEF]'
                  }`}
                >
                  {tab}
                </button>
              )
            )}
          </div>

          {/* Handover Cards */}
          <div className="space-y-4">
            {filteredHandovers.map((h) => (
              <div
                key={h.id}
                className={`bg-white rounded-3xl border p-5 sm:p-6 shadow-2xs space-y-4 ${
                  h.status === 'Unread' ? 'border-[#F59E0B] bg-[#FFFBEB]/40' : 'border-[#EAECEF]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-lg bg-[#F8F9FA] border border-[#EAECEF] text-xs font-bold text-[#0B0F19]">
                      From: {h.from}
                    </span>
                    <ArrowRightLeft className="w-3.5 h-3.5 text-[#64748B]" />
                    <span className="px-2.5 py-1 rounded-lg bg-[#0B0F19] text-white text-xs font-bold">
                      To: @{h.to}
                    </span>
                    <span className="text-xs font-mono text-[#64748B]">
                      {h.date} · {h.time}
                    </span>
                    {h.linkedClientName && (
                      <button
                        onClick={() => h.linkedClientId && onOpenClient360(h.linkedClientId)}
                        className="px-2.5 py-1 rounded-lg bg-[#EFF6FF] text-[#2563EB] text-xs font-bold hover:underline cursor-pointer"
                      >
                        Client: {h.linkedClientName} ↗
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        h.status === 'Unread'
                          ? 'bg-[#FEF3C7] text-[#D97706]'
                          : h.status === 'Acknowledged'
                          ? 'bg-[#D1FAE5] text-[#059669]'
                          : 'bg-[#EFF6FF] text-[#2563EB]'
                      }`}
                    >
                      Status: {h.status}
                    </span>
                    {h.status === 'Unread' && (
                      <button
                        onClick={() => onUpdateHandover({ ...h, status: 'Read' })}
                        className="px-2.5 py-1 rounded-lg bg-white border border-[#EAECEF] text-xs font-bold text-[#475569] hover:text-[#0B0F19] cursor-pointer"
                      >
                        Mark Read
                      </button>
                    )}
                    {h.status !== 'Acknowledged' && (
                      <button
                        onClick={() => onUpdateHandover({ ...h, status: 'Acknowledged' })}
                        className="px-3 py-1 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5" /> Acknowledge
                      </button>
                    )}
                    <button
                      onClick={() => onDeleteHandover(h.id)}
                      className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#E11D48] cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-extrabold text-[#0B0F19]">{h.title}</h3>
                  <p className="text-xs sm:text-sm text-[#334155] mt-1 leading-relaxed">
                    {h.content}
                  </p>
                </div>

                {/* Action Items Checklist with 1-Click Convert to Task */}
                {h.actionItems.length > 0 && (
                  <div className="bg-[#F8F9FA] rounded-2xl p-3.5 border border-[#EAECEF] space-y-2">
                    <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#64748B]">
                      Action Items for @{h.to}:
                    </div>
                    {h.actionItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-[#EAECEF]"
                      >
                        <label className="flex items-center gap-2.5 text-xs font-semibold text-[#0B0F19] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(item.completed)}
                            onChange={() =>
                              onUpdateHandover({
                                ...h,
                                actionItems: h.actionItems.map((a) =>
                                  a.id === item.id ? { ...a, completed: !a.completed } : a
                                ),
                              })
                            }
                            className="rounded border-[#CBD5E1] text-[#2563EB]"
                          />
                          <span className={item.completed ? 'line-through text-[#94A3B8]' : ''}>
                            {item.text}
                          </span>
                        </label>

                        {item.convertedToTask ? (
                          <button
                            onClick={() => onNavigateModule('tasks')}
                            className="px-2.5 py-1 rounded-lg bg-[#D1FAE5] text-[#059669] text-[11px] font-bold shrink-0 cursor-pointer"
                          >
                            ✓ Converted to Task
                          </button>
                        ) : (
                          <button
                            onClick={() => onConvertHandoverItemToTask(h.id, item.id)}
                            className="px-2.5 py-1 rounded-lg bg-[#0B0F19] hover:bg-[#2563EB] text-white text-[11px] font-bold shrink-0 cursor-pointer"
                          >
                            + Convert to Task
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Replies Thread */}
                {h.replies.length > 0 && (
                  <div className="space-y-2 pl-3 border-l-2 border-[#E2E8F0]">
                    {h.replies.map((rep) => (
                      <div key={rep.id} className="text-xs bg-[#F8F9FA] p-2.5 rounded-xl">
                        <div className="flex items-center justify-between text-[10px] font-mono text-[#64748B]">
                          <span className="font-bold text-[#0B0F19]">{rep.author}</span>
                          <span>{rep.timestamp}</span>
                        </div>
                        <p className="text-[#334155] mt-0.5">{rep.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Input */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={replyTexts[h.id] || ''}
                    onChange={(e) =>
                      setReplyTexts((prev) => ({ ...prev, [h.id]: e.target.value }))
                    }
                    placeholder={`Reply to ${h.from}...`}
                    className="flex-1 px-3.5 py-2 rounded-xl bg-[#F8F9FA] border border-[#EAECEF] text-xs focus:outline-none focus:border-[#2563EB]"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddHandoverReply(h)}
                    className="px-3.5 py-2 rounded-xl bg-[#0B0F19] hover:bg-[#2563EB] text-white text-xs font-bold cursor-pointer"
                  >
                    Reply
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-VIEW 4: WEEKLY RECAPS — "AETHEL WEEKLY BRIEF" (2-LAYER AI ENGINE)
         ===================================================================== */}
      {activeTab === 'weekly-recap' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-[#EAECEF] p-5 sm:p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#2563EB]">
                COMPONENT 04 · 2-LAYER GROUNDED AI INTELLIGENCE
              </span>
              <h2 className="text-lg font-extrabold text-[#0B0F19]">
                AETHEL WEEKLY BRIEF ({activeRecap.weekRange})
              </h2>
              <p className="text-xs text-[#64748B]">
                Layer 1 collects actual studio logs, tasks, handovers, and client deliveries. Layer 2 synthesizes your 7-section executive brief.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                onClick={handleGenerateWeeklyRecap}
                disabled={isGeneratingRecap}
                className="px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isGeneratingRecap ? 'Synthesizing Brief...' : 'Generate Weekly Recap Now'}
              </button>
              <button
                onClick={() => window.print()}
                className="px-3.5 py-2.5 rounded-xl bg-[#F8F9FA] hover:bg-[#F1F5F9] border border-[#EAECEF] text-[#0B0F19] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Print / PDF
              </button>
            </div>
          </div>

          {/* Weekly Metrics Comparison Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Daily Logs Recorded', value: activeRecap.metrics.logsCount },
              { label: 'Tasks Completed', value: activeRecap.metrics.tasksCompleted },
              { label: 'Tasks Pending', value: activeRecap.metrics.tasksPending },
              { label: 'Founder Handovers', value: activeRecap.metrics.handoversCount },
              { label: 'New Ideas Captured', value: activeRecap.metrics.newIdeasCount },
            ].map((m) => (
              <div
                key={m.label}
                className="bg-white p-4 rounded-2xl border border-[#EAECEF] shadow-2xs"
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                  {m.label}
                </div>
                <div className="text-xl font-extrabold font-mono text-[#0B0F19] mt-1">
                  {m.value}
                </div>
              </div>
            ))}
          </div>

          {/* 7-SECTION AETHEL WEEKLY BRIEF DOCUMENT */}
          <div className="bg-white rounded-3xl border border-[#EAECEF] p-6 sm:p-8 shadow-2xs space-y-6">
            <div className="pb-4 border-b border-[#EAECEF] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-xs font-mono font-bold uppercase tracking-widest text-[#2563EB]">
                  AETHEL STUDIOS · INTERNAL EXECUTIVE INTELLIGENCE
                </div>
                <h3 className="text-xl font-extrabold text-[#0B0F19] mt-0.5">
                  AETHEL WEEKLY BRIEF — {activeRecap.weekRange}
                </h3>
              </div>
              <span className="text-[11px] font-mono text-[#64748B]">
                Generated: {new Date(activeRecap.generatedAt).toLocaleString('en-IN')}
              </span>
            </div>

            {/* 01 — Executive Summary */}
            <div className="space-y-2">
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#2563EB]">
                01 — Executive Summary
              </div>
              <p className="text-sm text-[#0B0F19] leading-relaxed bg-[#F8F9FA] p-4 rounded-2xl border border-[#EAECEF]">
                {activeRecap.executiveSummary}
              </p>
            </div>

            {/* 02 — What We Accomplished */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#059669]">
                  02 — What We Accomplished
                </span>
                <span className="px-2 py-0.5 rounded bg-[#D1FAE5] text-[#059669] text-[10px] font-bold">
                  100% Grounded in Recorded Logs &amp; Completions
                </span>
              </div>
              <div className="space-y-1.5">
                {activeRecap.accomplishments.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-[#ECFDF5]/50 border border-[#A7F3D0] text-xs sm:text-sm text-[#0B0F19]"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 03 — Individual Contributions */}
            <div className="space-y-2">
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#0B0F19]">
                03 — Individual Co-Founder Contributions
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-[#EFF6FF]/60 border border-[#BFDBFE] space-y-2">
                  <div className="text-xs font-extrabold text-[#1E40AF] uppercase tracking-wider">
                    Krishna Khakole
                  </div>
                  <ul className="space-y-1.5 text-xs text-[#1E3A8A]">
                    {activeRecap.krishnaContributions.map((c, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span>•</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-[#ECFDF5]/60 border border-[#A7F3D0] space-y-2">
                  <div className="text-xs font-extrabold text-[#065F46] uppercase tracking-wider">
                    Vansh Khakole
                  </div>
                  <ul className="space-y-1.5 text-xs text-[#064E3B]">
                    {activeRecap.vanshContributions.map((c, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span>•</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* 04 — Pending Items & 05 — Important Discussions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#D97706]">
                  04 — Pending Items
                </div>
                <div className="space-y-1.5">
                  {activeRecap.pendingItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#92400E]"
                    >
                      • {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#2563EB]">
                  05 — Important Discussions &amp; Decisions
                </div>
                <div className="space-y-1.5">
                  {activeRecap.importantDiscussions.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[#F8F9FA] border border-[#EAECEF] text-xs text-[#334155]"
                    >
                      • {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 06 — Next Week's Priorities */}
            <div className="space-y-2">
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#0B0F19]">
                06 — Next Week's Priorities
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {activeRecap.nextWeekPriorities.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[#F8F9FA] border border-[#EAECEF] text-xs font-semibold text-[#0B0F19] flex items-start gap-2"
                  >
                    <span className="font-mono text-[#2563EB]">0{idx + 1}</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 07 — AI Observations */}
            <div className="p-5 rounded-2xl bg-[#0B0F19] text-white space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#60A5FA] flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-[#60A5FA]" /> 07 — AI Observations (Pattern Analysis)
                </span>
                <span className="text-[10px] font-mono bg-white/10 px-2 py-0.5 rounded text-amber-300">
                  Inferred Observations · Distinct from Recorded Completions
                </span>
              </div>
              <div className="space-y-1.5">
                {activeRecap.aiObservations.map((obs, idx) => (
                  <div key={idx} className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                    • {obs}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-VIEW 5: AETHEL MEMORY — "SEARCHABLE INSTITUTIONAL KNOWLEDGE"
         ===================================================================== */}
      {activeTab === 'memory' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-[#EAECEF] p-5 sm:p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#2563EB]">
                COMPONENT 05 · COMPANY WIKIPEDIA &amp; DECISION TRACKER
              </span>
              <h2 className="text-lg font-extrabold text-[#0B0F19]">
                Aethel Memory — Searchable Institutional Knowledge
              </h2>
              <p className="text-xs text-[#64748B]">
                Document key studio decisions (with reasoning), SOPs, pricing packages, and lessons learned so institutional knowledge is never lost.
              </p>
            </div>
            <button
              onClick={() => openNewMemoryModal()}
              className="px-4 py-2.5 rounded-xl bg-[#0B0F19] hover:bg-[#2563EB] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 self-start sm:self-center"
            >
              <Plus className="w-4 h-4" /> + Document Decision / SOP
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setMemCategoryFilter('All')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 cursor-pointer ${
                memCategoryFilter === 'All'
                  ? 'bg-[#0B0F19] text-white'
                  : 'bg-white text-[#475569] border border-[#EAECEF]'
              }`}
            >
              All Memory ({memories.length})
            </button>
            {MEMORY_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setMemCategoryFilter(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 cursor-pointer ${
                  memCategoryFilter === cat
                    ? 'bg-[#2563EB] text-white'
                    : 'bg-white text-[#475569] border border-[#EAECEF]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Memory Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMemories.map((mem) => (
              <div
                key={mem.id}
                className="bg-white rounded-3xl border border-[#EAECEF] p-5 shadow-2xs flex flex-col justify-between gap-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-[#EFF6FF] text-[#2563EB] text-[11px] font-bold">
                      {mem.category}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-mono text-[#64748B]">
                        {mem.date} · By {mem.author}
                      </span>
                      <button
                        onClick={() => onUpdateMemory({ ...mem, pinned: !mem.pinned })}
                        className={`p-1 rounded-lg cursor-pointer ${
                          mem.pinned ? 'text-[#D97706]' : 'text-[#94A3B8]'
                        }`}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base font-extrabold text-[#0B0F19]">{mem.title}</h3>
                  <p className="text-xs sm:text-sm text-[#334155] leading-relaxed">
                    {mem.content}
                  </p>

                  {mem.reasoning && (
                    <div className="p-3 rounded-2xl bg-[#F8F9FA] border border-[#EAECEF] text-xs text-[#475569]">
                      <strong className="text-[#0B0F19]">Decision Reasoning:</strong>{' '}
                      {mem.reasoning}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-[#F1F3F5] flex items-center justify-between">
                  <div className="flex items-center gap-1 flex-wrap">
                    {mem.tags.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded bg-[#F8F9FA] text-[#64748B] text-[10px] font-mono"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditMemoryModal(mem)}
                      className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0B0F19] cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteMemory(mem.id)}
                      className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#E11D48] cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 1: CREATE / EDIT BRAIN DUMP NOTE
         ===================================================================== */}
      {showDumpModal && (
        <div className="fixed inset-0 z-50 bg-[#0B0F19]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#EAECEF] shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="bg-[#0B0F19] text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-[#F59E0B]" />
                <h3 className="text-sm font-bold">
                  {editingDump ? 'Edit Brain Dump Note' : 'Capture Brain Dump Note'}
                </h3>
              </div>
              <button
                onClick={() => setShowDumpModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBrainDumpSubmit} className="p-5 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#475569]">
                    Note Title / Idea *
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoCategorizeDump}
                    className="text-[11px] font-bold text-[#2563EB] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" /> AI Auto-Categorize &amp; Tag
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={dumpTitle}
                  onChange={(e) => setDumpTitle(e.target.value)}
                  placeholder="e.g., Target multi-specialty hospitals with ABDM demo"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                  Description / Details
                </label>
                <textarea
                  rows={3}
                  value={dumpDesc}
                  onChange={(e) => setDumpDesc(e.target.value)}
                  placeholder="Write all details, links, or thoughts..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                    Category
                  </label>
                  <select
                    value={dumpCategory}
                    onChange={(e) => setDumpCategory(e.target.value as BrainDumpCategory)}
                    className="w-full px-3 py-2 rounded-xl border border-[#EAECEF] text-xs bg-white"
                  >
                    {BRAIN_DUMP_CATEGORIES.map((c) => (
                      <option key={c.label} value={c.label}>
                        {c.emoji} {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                    Author
                  </label>
                  <select
                    value={dumpAuthor}
                    onChange={(e) => setDumpAuthor(e.target.value as 'Krishna' | 'Vansh')}
                    className="w-full px-3 py-2 rounded-xl border border-[#EAECEF] text-xs bg-white"
                  >
                    <option value="Krishna">Krishna</option>
                    <option value="Vansh">Vansh</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                    Priority
                  </label>
                  <select
                    value={dumpPriority}
                    onChange={(e) =>
                      setDumpPriority(e.target.value as BrainDumpNote['priority'])
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#EAECEF] text-xs bg-white"
                  >
                    <option value="Urgent">Urgent</option>
                    <option value="High">High</option>
                    <option value="Normal">Normal</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                    Optional Linked Client
                  </label>
                  <input
                    type="text"
                    list="brain-clients-datalist"
                    value={dumpClientName}
                    onChange={(e) => setDumpClientName(e.target.value)}
                    placeholder="Select client..."
                    className="w-full px-3 py-2 rounded-xl border border-[#EAECEF] text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                    Tags (comma-separated)
                  </label>
                  <div className="relative">
                    <Tag className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={dumpTagsInput}
                      onChange={(e) => setDumpTagsInput(e.target.value)}
                      placeholder="Growth, Meta Ads, Pricing"
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-[#EAECEF] text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-[#0B0F19] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dumpPinned}
                    onChange={(e) => setDumpPinned(e.target.checked)}
                  />
                  Pin to Brain Overview
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDumpModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-[#64748B]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold cursor-pointer"
                  >
                    Save to Brain Dump
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: LEAVE CO-FOUNDER HANDOVER NOTE
         ===================================================================== */}
      {showHandoverModal && (
        <div className="fixed inset-0 z-50 bg-[#0B0F19]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#EAECEF] shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="bg-[#0B0F19] text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-[#60A5FA]" />
                <h3 className="text-sm font-bold">Leave Co-Founder Handover Note</h3>
              </div>
              <button
                onClick={() => setShowHandoverModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleHandoverSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                    From Founder
                  </label>
                  <select
                    value={handoverFrom}
                    onChange={(e) => {
                      const val = e.target.value as 'Krishna' | 'Vansh';
                      setHandoverFrom(val);
                      setHandoverTo(val === 'Krishna' ? 'Vansh' : 'Krishna');
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-[#EAECEF] text-xs font-bold bg-white"
                  >
                    <option value="Krishna">Krishna Khakole</option>
                    <option value="Vansh">Vansh Khakole</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                    To Founder
                  </label>
                  <select
                    value={handoverTo}
                    onChange={(e) => setHandoverTo(e.target.value as 'Krishna' | 'Vansh')}
                    className="w-full px-3 py-2 rounded-xl border border-[#EAECEF] text-xs font-bold bg-white"
                  >
                    <option value="Vansh">@Vansh Khakole</option>
                    <option value="Krishna">@Krishna Khakole</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                  Handover Subject *
                </label>
                <input
                  type="text"
                  required
                  value={handoverTitle}
                  onChange={(e) => setHandoverTitle(e.target.value)}
                  placeholder="e.g., Website Deployment & Final Payment Collection"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                  Message / Handover Context *
                </label>
                <textarea
                  rows={3}
                  required
                  value={handoverContent}
                  onChange={(e) => setHandoverContent(e.target.value)}
                  placeholder={`@${handoverTo} I've finished the homepage layout. When you talk to the client tomorrow, please confirm the domain and collect the advance.`}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                  Action Items Checklist (One per line — each can be converted to a Task)
                </label>
                <textarea
                  rows={3}
                  value={handoverChecklistText}
                  onChange={(e) => setHandoverChecklistText(e.target.value)}
                  placeholder={`Ask client for final gallery photos\nConfirm domain preference\nCollect 50% advance via UPI`}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                  Optional Linked Client
                </label>
                <input
                  type="text"
                  list="brain-clients-datalist"
                  value={handoverClientName}
                  onChange={(e) => setHandoverClientName(e.target.value)}
                  placeholder="Select client..."
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowHandoverModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#64748B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold cursor-pointer"
                >
                  Send Handover to @{handoverTo}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: DOCUMENT AETHEL MEMORY / DECISION
         ===================================================================== */}
      {showMemoryModal && (
        <div className="fixed inset-0 z-50 bg-[#0B0F19]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#EAECEF] shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="bg-[#0B0F19] text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#60A5FA]" />
                <h3 className="text-sm font-bold">
                  {editingMemory
                    ? 'Edit Institutional Memory'
                    : 'Document Decision / SOP in Aethel Memory'}
                </h3>
              </div>
              <button
                onClick={() => setShowMemoryModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleMemorySubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                  Title / Decision Summary *
                </label>
                <input
                  type="text"
                  required
                  value={memTitle}
                  onChange={(e) => setMemTitle(e.target.value)}
                  placeholder="e.g., Basic Website Package set to ₹7,999 with 50% advance"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                    Memory Category
                  </label>
                  <select
                    value={memCategory}
                    onChange={(e) => setMemCategory(e.target.value as BrainMemoryCategory)}
                    className="w-full px-3 py-2 rounded-xl border border-[#EAECEF] text-xs bg-white"
                  >
                    {MEMORY_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                    Recorded By
                  </label>
                  <select
                    value={memAuthor}
                    onChange={(e) => setMemAuthor(e.target.value as FounderName)}
                    className="w-full px-3 py-2 rounded-xl border border-[#EAECEF] text-xs bg-white"
                  >
                    <option value="Both">Both Founders</option>
                    <option value="Krishna">Krishna Khakole</option>
                    <option value="Vansh">Vansh Khakole</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                  Policy / SOP / Decision Content *
                </label>
                <textarea
                  rows={3}
                  required
                  value={memContent}
                  onChange={(e) => setMemContent(e.target.value)}
                  placeholder="Document the exact decision, process, or playbook..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAECEF] text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                  Why did we decide this? (Reasoning)
                </label>
                <input
                  type="text"
                  value={memReasoning}
                  onChange={(e) => setMemReasoning(e.target.value)}
                  placeholder="e.g., Easier entry point for local businesses in Maharashtra"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                  Search Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={memTags}
                  onChange={(e) => setMemTags(e.target.value)}
                  placeholder="Pricing, SOP, Decisions"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#EAECEF] text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMemoryModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#64748B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0B0F19] hover:bg-[#2563EB] text-white text-xs font-bold cursor-pointer"
                >
                  Save to Aethel Memory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
