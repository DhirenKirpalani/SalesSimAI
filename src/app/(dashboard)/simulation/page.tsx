"use client";

import { useRef, useState, useCallback, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Room, RoomEvent, Track } from "livekit-client";
import { createClient } from "@/lib/supabase/client";
import { useVoiceCall, VoiceStatus, VoiceLanguage } from "@/hooks/useVoiceCall";
import type { PersonaContext } from "@/lib/voice-config";
import { useCoaching } from "@/hooks/useCoaching";
import { VoiceCallPanel } from "@/components/VoiceCallPanel";
import { CoachingOverlay } from "@/components/CoachingOverlay";
import { VoiceCallSidebar } from "@/components/VoiceCallSidebar";
import { VoiceCallRightSidebar } from "@/components/VoiceCallRightSidebar";
import { Video, Mic, MessageSquare, Send, User, Building2, Briefcase, List, Smile, MessageCircle, ArrowLeft, Target, CheckCircle2 } from "lucide-react";

type Status = "idle" | "connecting" | "connected" | "paused" | "error";

interface StyleSections {
  communicationStyle: string;
  motivations: string;
  concerns: string;
  howToEngage: string;
}

function generateProductKnowledgeFirstMessage(candidateName: string, interviewerName: string, company: string): string {
  const templates = [
    `Hi ${candidateName}, I'm ${interviewerName} from ${company}. Thanks for joining the call. How are you?`,
    `Hello ${candidateName}, this is ${interviewerName} with ${company}. Appreciate you making time today. How are things?`,
    `Hey ${candidateName}, ${interviewerName} here from ${company}. Thanks for hopping on. How's your day going?`,
    `Good to meet you, ${candidateName}. I'm ${interviewerName} from ${company}. Thanks for joining. How are you doing?`,
    `Hi ${candidateName}, thanks for joining. I'm ${interviewerName} from ${company}. How are you today?`,
    `Hi ${candidateName}, I'm ${interviewerName}, calling from ${company}. Thanks for taking the time. How have you been?`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

function parseStyleSections(text: string | null): StyleSections {
  const empty: StyleSections = { communicationStyle: "", motivations: "", concerns: "", howToEngage: "" };
  if (!text) return empty;

  const headers = ["Communication Style", "Motivations", "Concerns", "How to Engage"];
  const positions = headers
    .map((h) => ({ header: h, index: text.toLowerCase().indexOf(h.toLowerCase()) }))
    .filter((p) => p.index !== -1)
    .sort((a, b) => a.index - b.index);

  if (positions.length === 0) return empty;

  const result: Partial<StyleSections> = {};
  for (let i = 0; i < positions.length; i++) {
    const { header } = positions[i];
    const start = positions[i].index + header.length;
    const end = i < positions.length - 1 ? positions[i + 1].index : text.length;
    const section = text.slice(start, end).replace(/^[\s:–—]+/, "").trim();
    const key = header.toLowerCase().replace(/\s+/g, "") as keyof StyleSections;
    result[key] = section;
  }

  return { ...empty, ...result };
}

interface SessionInfo {
  session_id: string;
  livekit_url: string;
  livekit_client_token: string;
  llm_config_id: string | null;
  scenario_name: string;
  heygen_session_db_id?: string | null;
  duration_min?: number;
}

interface TranscriptEntry {
  role: "avatar" | "user" | "coach";
  text: string;
  time: string;
  emotion?: string;
  intent?: string;
}

interface CoachingMoment {
  buyer_quote: string;
  signal: string;
  what_they_should_have_said: string;
}

interface ProductCorrection {
  claim: string;
  correction: string;
  severity: "error" | "warning";
  topic: string;
}

interface CoachTurnResult {
  fallback?: boolean;
  error?: string;
  quality?: "good" | "warning" | "missed";
  nudge?: string;
  checkpoint_hit?: string | null;
  checkpoint_name?: string | null;
  suggested_next?: string;
  already_covered?: string[];
  product_corrections?: ProductCorrection[];
}


interface FeedbackResult {
  overall_score: number;
  breakdown: {
    metrics: number;
    economic_buyer: number;
    decision_criteria: number;
    decision_process: number;
    identify_pain: number;
    champion: number;
  };
  strengths: string[];
  weaknesses: string[];
  missed_opportunities: string[];
  coaching_recommendations: string[];
  coaching_moments?: CoachingMoment[];
}

function parseCheckpointIds(criteria: string): { id: string; name: string }[] {
  const matches = [...criteria.matchAll(/^([A-Z]\d+)\s*[\u2014\u2013-]\s*([^\n]+)/gm)];
  return matches.map((m) => ({ id: m[1].trim(), name: m[2].trim() }));
}

type CheckpointStatus = "hit" | "warning" | "pending";

type NudgeCategory = "correction" | "checkpoint" | "suggestion" | "insight" | "success";

interface Nudge {
  id: number;
  message: string;
  type: "success" | "info" | "warning";
  category: NudgeCategory;
  priority: number;
  checkpointId?: string;
  copyText?: string;
}

/** Classify a nudge message by urgency and extract copyable/actionable text. */
function classifyNudge(
  message: string,
  type: "success" | "info" | "warning",
  opts?: { checkpointId?: string; copyText?: string }
): { category: NudgeCategory; priority: number; checkpointId?: string; copyText?: string } {
  if (message.includes("Fact check")) {
    return { category: "correction", priority: 1, copyText: opts?.copyText };
  }
  const cpMatch = message.match(/^([A-Z]\d+):\s*/);
  if (cpMatch || opts?.checkpointId) {
    return { category: "checkpoint", priority: 2, checkpointId: cpMatch?.[1] || opts?.checkpointId, copyText: opts?.copyText };
  }
  if (message.startsWith("Try:")) {
    return { category: "suggestion", priority: 3, copyText: message.replace(/^Try:\s*/, "") };
  }
  if (message.startsWith("Insight uncovered:")) {
    return { category: "insight", priority: 4, copyText: opts?.copyText };
  }
  if (type === "success") {
    return { category: "success", priority: 5, copyText: opts?.copyText };
  }
  return { category: "insight", priority: 4, copyText: opts?.copyText };
}

// Draggable coaching overlay wrapper
function DraggableCoaching({
  coaching,
  coachingOpen,
  setCoachingOpen,
  checkpoints,
}: {
  coaching: ReturnType<typeof useCoaching>;
  coachingOpen: boolean;
  setCoachingOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  checkpoints?: { id: string; name: string; status: CheckpointStatus }[];
}) {
  const [pos, setPos] = useState({ x: 16, y: 60 }); // right offset, top offset
  const draggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, startX: 0, startY: 0 });

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // Only drag from the toggle button area, not the expanded content
    const target = e.target as HTMLElement;
    if (target.closest("[data-coach-toggle]")) {
      draggingRef.current = true;
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        startX: pos.x,
        startY: pos.y,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  }, [pos]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPos({
      x: Math.max(8, dragStartRef.current.startX - dx), // right anchor: drag right → smaller right offset
      y: Math.max(8, dragStartRef.current.startY + dy),
    });
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    draggingRef.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  return (
    <div
      className="fixed z-50 w-64"
      style={{ right: pos.x, top: pos.y }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <CoachingOverlay
        state={coaching.state}
        stepTip={coaching.stepTip}
        coveragePercent={coaching.coveragePercent}
        progressPercent={coaching.progressPercent}
        isOpen={coachingOpen}
        onToggle={() => setCoachingOpen((o) => !o)}
        checkpoints={checkpoints}
      />
    </div>
  );
}

function HeyGenTestInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scenarioId = searchParams.get("scenarioId") ?? undefined;
  const scenarioTable = searchParams.get("scenarioTable") ?? undefined;
  const avatarId = searchParams.get("avatarId") ?? undefined;
  const voiceId = searchParams.get("voiceId") ?? undefined;
  const scenarioNameParam = searchParams.get("scenarioName") ?? undefined;
  const avatarNameParam = searchParams.get("avatarName") ?? undefined;
  const voiceAvatarImageUrlParam = searchParams.get("voiceAvatarImageUrl") ?? undefined;
  const elevenlabsVoiceIdParam = searchParams.get("elevenlabsVoiceId") ?? undefined;

  const videoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const roomRef = useRef<Room | null>(null);
  const sessionRef = useRef<SessionInfo | null>(null);
  const audioElemsRef = useRef<HTMLAudioElement[]>([]);
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const textMessagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeLeftRef = useRef<number | null>(null);
  const resumeTimeLeftRef = useRef<number | null>(null);
  const heygenSessionDbIdRef = useRef<string | null>(null);
  const simSessionDbIdRef = useRef<string | null>(null);
  const startedAtRef = useRef<string | null>(null);
  const defaultDurationRef = useRef<number>(300); // seconds, default 5 min

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [logOpen, setLogOpen] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [resolvedScenarioName, setResolvedScenarioName] = useState<string | null>(null);
  const [scenarioContextNote, setScenarioContextNote] = useState<string | null>(null);
  const [sellerCompany, setSellerCompany] = useState<string | null>(null);
  const [sellerProduct, setSellerProduct] = useState<string | null>(null);
  const [sellerDescription, setSellerDescription] = useState<string | null>(null);
  const [orgLogoUrl, setOrgLogoUrl] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [resolvedPersonaName, setResolvedPersonaName] = useState<string | null>(null);
  const [resolvedPersonaRole, setResolvedPersonaRole] = useState<string | null>(null);
  const [scenarioType, setScenarioType] = useState<string | null>(null);
  const [personaDetails, setPersonaDetails] = useState<{
    name: string | null;
    jobTitle: string | null;
    company: string | null;
    industry: string | null;
    age: string | null;
    gender: string | null;
    income: string | null;
    education: string | null;
    location: string | null;
    avatar: string | null;
    companySize: string | null;
    reportsTo: string | null;
    decisionRole: string | null;
    owns: string | null;
    motivations: string | null;
    concerns: string | null;
    howToEngage: string | null;
    communicationStyle: string | null;
    communicationLanguage: string | null;
    personality: string | null;
    painPoints: string[];
    goals: string[];
    hiddenConcern: string | null;
    companyGoal: string | null;
    openingLine: string | null;
    meetingSource: string | null;
  }>({
    name: null,
    jobTitle: null,
    company: null,
    industry: null,
    age: null,
    gender: null,
    income: null,
    education: null,
    location: null,
    avatar: null,
    companySize: null,
    reportsTo: null,
    decisionRole: null,
    owns: null,
    motivations: null,
    concerns: null,
    howToEngage: null,
    communicationStyle: null,
    communicationLanguage: null,
    personality: null,
    painPoints: [],
    goals: [],
    hiddenConcern: null,
    companyGoal: null,
    openingLine: null,
    meetingSource: null,
  });
  const [activeTab, setActiveTab] = useState<"profile" | "background" | "style">("profile");

  // First Discovery Call has no style tab
  useEffect(() => {
    if (scenarioType === "First Discovery Call" && activeTab === "style") {
      setActiveTab("background");
    }
  }, [scenarioType, activeTab]);
  const [sellerInitials, setSellerInitials] = useState("U");
  const [sellerAvatarUrl, setSellerAvatarUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [feedback, setFeedback] = useState<FeedbackResult | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [avatarImageUrl, setAvatarImageUrl] = useState<string | null>(null);
  const [voiceAvatarImageUrl, setVoiceAvatarImageUrl] = useState<string | null>(null);
  const [elevenlabsVoiceId, setElevenlabsVoiceId] = useState<string | null>(null);
  const personaContextRef = useRef<PersonaContext | null>(null);
  const syncedVoiceTranscriptRef = useRef<{ role: "user" | "buyer" | "avatar" | "coach"; text: string; emotion?: string; intent?: string }[]>([]);
  const lastAnalyzedPairRef = useRef<string | null>(null);
  const coachDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Call mode + coaching state
  const [callMode, setCallMode] = useState<"video" | "voice" | "text">("video");
  const [showAvatarVideo, setShowAvatarVideo] = useState(true); // toggle avatar video visibility
  const [voiceSessionId, setVoiceSessionId] = useState<string | null>(null);
  const prewarmedSessionRef = useRef<Promise<{ session: Record<string, unknown> } | null> | null>(null);
  const [textSessionId, setTextSessionId] = useState<string | null>(null);
  const [textInput, setTextInput] = useState("");
  const [textLoading, setTextLoading] = useState(false);
  const [coachingOpen, setCoachingOpen] = useState(false);
  const [scoringCriteria, setScoringCriteria] = useState<string | null>(null);
  const [checkpointStatus, setCheckpointStatus] = useState<Record<string, CheckpointStatus>>({});
  const voiceCall = useVoiceCall();
  const coaching = useCoaching();
  const { setScenarioContext } = coaching;

  // Voice/language controlled by the ElevenLabs agent dashboard (no runtime buyer voice selector).
  const selectedVoiceLanguage: VoiceLanguage = "auto";
  const coachingAnalyzeRef = useRef(coaching.analyze);

  // Live nudge bubbles — persistent coaching feedback log that accumulates after each turn
  const [liveNudges, setLiveNudges] = useState<Nudge[]>([]);
  const nudgeIdRef = useRef(0);
  const lastNudgeSignatureRef = useRef<string | null>(null);

  // 7-step discovery call structure for sidebar reference
  const CALL_STEPS = [
    { id: 1, label: "Current setup", hint: "Ask how they currently handle this" },
    { id: 2, label: "Breakdown point", hint: "Ask where it breaks down most" },
    { id: 3, label: "Cost to team", hint: "Ask what it's costing the team" },
    { id: 4, label: "Past fixes", hint: "Ask what they've tried to fix it" },
    { id: 5, label: "Ideal outcome", hint: "Ask what a perfect fix would do" },
    { id: 6, label: "Others affected", hint: "Ask who else feels this problem" },
    { id: 7, label: "Blockers", hint: "Ask what would stop them moving forward" },
  ];
  const [currentStep, setCurrentStep] = useState(0);
  const lastStepAdvanceRef = useRef<number>(-1);

  const stepKeywords = [
    ["current setup", "current process", "how do you currently", "setup", "process today", "today"],
    ["break down", "breaks down", "breaking down", "biggest challenge", "most painful", "struggle", "struggling", "where it hurts", "hardest part", "worst part"],
    ["costing", "cost", "costs", "impact", "losing", "wasting", "how much", "time spent", "hours", "money"],
    ["tried", "attempted", "workaround", "solution", "fix", "so far", "before", "previously", "dealt with"],
    ["perfectly solved", "ideal outcome", "what would it mean", "if this works", "dream scenario", "best case", "future state"],
    ["who else", "stakeholders", "team", "other people", "department", "affected", "who else feels", "anyone else", "colleagues"],
    ["stop you", "concerns", "risks", "blockers", "moving forward", "next steps", "what would stop", "hesitation", "worried about"],
  ];

  const detectStepFromText = useCallback((text: string): number => {
    const lower = text.toLowerCase();
    for (let i = 0; i < stepKeywords.length; i++) {
      if (stepKeywords[i].some((kw) => lower.includes(kw))) return i;
    }
    return -1;
  }, []);

  /** Fuzzy nudge deduplication — returns true if newMsg is semantically too similar to any existing nudge */
  const isSimilarNudge = useCallback((existing: Nudge[], newMsg: string): boolean => {
    const keywords = (s: string) =>
      s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(w => w.length > 3);
    const newKw = keywords(newMsg);
    return existing.some(n => {
      const existingKw = keywords(n.message);
      if (existingKw.length === 0 || newKw.length === 0) return n.message === newMsg;
      const overlap = newKw.filter(w => existingKw.includes(w)).length;
      return overlap / Math.min(newKw.length, existingKw.length) >= 0.55;
    });
  }, []);

  const nudgesInTranscriptRef = useRef<Set<string>>(new Set());
  const currentCoachTextRef = useRef<string | null>(null);
  function addCoachNudge(text: string, type: "success" | "info" | "warning" = "info") {
    const prefix = type === "success" ? "✅ " : type === "warning" ? "⚠️ " : "💡 ";
    const fullText = `${prefix}${text}`;
    if (nudgesInTranscriptRef.current.has(fullText)) return;
    // Remove the previous coach nudge so only the latest one is visible
    const previous = currentCoachTextRef.current;
    if (previous) {
      nudgesInTranscriptRef.current.delete(previous);
    }
    nudgesInTranscriptRef.current.add(fullText);
    currentCoachTextRef.current = fullText;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    setTranscript((prev) => {
      const withoutCoach = prev.filter((entry) => entry.role !== "coach");
      return [...withoutCoach, { role: "coach", text: fullText, time }];
    });
    transcriptRef.current = transcriptRef.current.filter((entry) => entry.role !== "coach");
    transcriptRef.current.push({ role: "coach", text: fullText, time });
  }

  /** Append a coach-turn result (sales nudge + product fact corrections) to the live nudge log and transcript */
  const appendCoachTurnNudges = useCallback((result: CoachTurnResult) => {
    if (result.fallback || result.error || !result.quality || !result.nudge) return;
    const nudgeType: "success" | "info" | "warning" =
      result.quality === "good" ? "success" : result.quality === "warning" ? "warning" : "info";
    const label = result.checkpoint_hit ? `${result.checkpoint_hit}: ` : "";
    const nudgeMessage = `${label}${result.nudge}`;
    const classified = classifyNudge(nudgeMessage, nudgeType, {
      checkpointId: result.checkpoint_hit || undefined,
      copyText: result.suggested_next || undefined,
    });
    setLiveNudges((prev) => {
      if (isSimilarNudge(prev, nudgeMessage)) {
        console.log("[simulation] skipping similar coach-turn nudge:", nudgeMessage);
        return prev;
      }
      const next = [...prev, { id: ++nudgeIdRef.current, message: nudgeMessage, type: nudgeType, ...classified }];
      return next.length > 6 ? next.slice(next.length - 6) : next;
    });
    addCoachNudge(nudgeMessage, nudgeType);
    if (result.checkpoint_hit && typeof result.checkpoint_hit === "string") {
      const checkpointHit = result.checkpoint_hit;
      const quality = result.quality;
      setCheckpointStatus((prev) => ({ ...prev, [checkpointHit]: quality === "good" ? "hit" : "warning" }));
    }
    if (result.already_covered?.length) {
      setCheckpointStatus((prev) => {
        const updated = { ...prev };
        for (const cp of result.already_covered!) {
          if (!updated[cp]) updated[cp] = "hit";
        }
        return updated;
      });
    }
    const corrections = result.product_corrections?.filter(
      (c): c is ProductCorrection =>
        !!c && c.claim.trim().length > 0 && c.correction.trim().length > 0
    );
    if (corrections?.length) {
      setLiveNudges((prev) => {
        const newNudges = corrections
          .filter((c) => !isSimilarNudge(prev, `${c.claim} ${c.correction}`))
          .map((c) => {
            const message = `Fact check (${c.topic || "product"}): "${c.claim}" → ${c.correction}`;
            return { id: ++nudgeIdRef.current, message, type: "warning" as const, ...classifyNudge(message, "warning") };
          });
        if (newNudges.length === 0) return prev;
        const next = [...prev, ...newNudges];
        return next.length > 6 ? next.slice(next.length - 6) : next;
      });
    }
  }, [isSimilarNudge]);

  useEffect(() => {
    if (!coaching.lastTurnResult || status !== "connected") return;
    const update = coaching.lastTurnResult;

    // Build a signature from the result so we don't add the same nudge repeatedly
    const signature = JSON.stringify({
      stepCompleted: update.stepCompleted,
      uncoveredFact: update.uncoveredFact,
      newSuggestion: update.newSuggestion?.slice(0, 120),
    });
    if (signature === lastNudgeSignatureRef.current) return;
    lastNudgeSignatureRef.current = signature;

    let nudge: { message: string; type: "success" | "info" | "warning"; category: NudgeCategory; priority: number; copyText?: string } | null = null;

    if (update.stepCompleted) {
      const message = "Good job! You advanced the conversation.";
      nudge = { message, type: "success", ...classifyNudge(message, "success") };
    } else if (update.uncoveredFact) {
      const message = `Insight uncovered: ${update.uncoveredFact}`;
      nudge = { message, type: "info", ...classifyNudge(message, "info") };
    } else if (update.newSuggestion) {
      const message = `Try: ${update.newSuggestion.slice(0, 100)}${update.newSuggestion.length > 100 ? "…" : ""}`;
      nudge = { message, type: "warning", ...classifyNudge(message, "warning") };
    }

    if (nudge) {
      setLiveNudges((prev) => {
        // Skip if the exact same message is already in the log
        if (prev.some((n) => n.message === nudge!.message)) {
          console.log("[simulation] skipping duplicate nudge:", nudge.message);
          return prev;
        }
        return [...prev, { ...nudge!, id: ++nudgeIdRef.current }];
      });
      addCoachNudge(nudge.message, nudge.type);
    }
  }, [coaching.lastTurnResult, status]);

  coachingAnalyzeRef.current = coaching.analyze;

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const name = user.user_metadata?.full_name ?? user.email ?? "U";
      const initials = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
      setSellerInitials(initials);
      if (user.user_metadata?.avatar_url) setSellerAvatarUrl(user.user_metadata.avatar_url);
    });
  }, []);

  const addLog = useCallback((msg: string) => {
    console.log("[heygen-test]", msg);
    setLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 99)]);
  }, []);

  const addTranscript = useCallback((role: "avatar" | "user" | "coach", text: string, emotion?: string, intent?: string) => {
    const entry: TranscriptEntry = { role, text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }), emotion, intent };
    transcriptRef.current = [...transcriptRef.current, entry];
    setTranscript((prev) => [...prev, entry]);
  }, []);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  useEffect(() => {
    const resolveAvatarId = avatarId ?? scenarioId;
    if (!resolveAvatarId) return;
    fetch(`/api/heygen-test/avatars?page=1&page_size=100`)
      .then((r) => r.json())
      .then((data) => {
        const match = (data.avatars ?? []).find((a: { id: string; preview_image_url: string | null }) => a.id === avatarId);
        if (match?.preview_image_url) setAvatarImageUrl(match.preview_image_url);
      })
      .catch(() => { /* ignore */ });
  }, [avatarId, scenarioId]);

  useEffect(() => {
    setVoiceAvatarImageUrl(voiceAvatarImageUrlParam ?? null);
  }, [voiceAvatarImageUrlParam]);

  const start = useCallback(async () => {
    const isResume = resumeTimeLeftRef.current !== null;
    setStatus("connecting");
    setError(null);
    if (!isResume) {
      setTranscript([]);
      setFeedback(null);
      transcriptRef.current = [];
      nudgesInTranscriptRef.current.clear();
      currentCoachTextRef.current = null;
      lastAnalyzedPairRef.current = null;
      setCurrentStep(0);
      lastStepAdvanceRef.current = -1;
    }
    addLog(isResume ? "Resuming LiveAvatar session…" : "Starting LiveAvatar session…");

    try {
      // Fetch seller identity from user profile
      let sellerName = "the seller";
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        sellerName = user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "the seller";
      } catch { /* ignore auth errors, fallback to generic */ }

      const previousTranscript = isResume && transcriptRef.current.length > 0
        ? transcriptRef.current.map((t) => `${t.role === "user" ? sellerName : t.role}: ${t.text}`).join("\n")
        : undefined;

      const res = await fetch("/api/heygen-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId, scenarioTable, sellerName, previousTranscript, avatarId, voiceId }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Session start failed");

      const info: SessionInfo = json;
      sessionRef.current = info;
      heygenSessionDbIdRef.current = info.heygen_session_db_id ?? null;
      simSessionDbIdRef.current = (info as any).sim_session_db_id ?? null;
      startedAtRef.current = new Date().toISOString();
      if (info.duration_min) {
        defaultDurationRef.current = info.duration_min * 60;
        addLog(`⏱️ Call duration: ${info.duration_min} min`);
      }
      // Persist to localStorage so end-of-call cleanup survives refreshes
      if (heygenSessionDbIdRef.current) {
        localStorage.setItem("heygen-active-session", JSON.stringify({
          heygenSessionDbId: heygenSessionDbIdRef.current,
          simSessionDbId: simSessionDbIdRef.current,
          startedAt: startedAtRef.current,
        }));
      }
      if (info.scenario_name && info.scenario_name !== "LiveAvatar Test" && info.scenario_name !== "Simulation") {
        setResolvedScenarioName(info.scenario_name);
        addLog(`📋 Scenario: ${info.scenario_name}`);
      }
      addLog(`✅ Session: ${info.session_id}`);
      addLog(info.llm_config_id ? `✅ LLM config: ${info.llm_config_id}` : "⚠️ No LLM config (localhost — avatar won't respond)");

      const room = new Room();
      roomRef.current = room;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // Start recording local camera + mic when connected
      const startRecording = () => {
        const stream = localStreamRef.current;
        if (!stream) return;
        const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
          ? "video/webm;codecs=vp9,opus"
          : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
            ? "video/webm;codecs=vp8,opus"
            : "video/webm";
        recordedChunksRef.current = [];
        try {
          const recorder = new MediaRecorder(stream, { mimeType });
          recorderRef.current = recorder;
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) recordedChunksRef.current.push(e.data);
          };
          recorder.start(1000); // collect chunks every 1s
          addLog("⏺️ Recording started");
        } catch (err) {
          addLog("⚠️ Recording failed: " + String(err));
        }
      };

      room.on(RoomEvent.TrackSubscribed, (track: any, _pub: any, participant: any) => {
        addLog(`🎬 Track: ${track.kind} from ${participant?.identity} (muted:${track.isMuted})`);
        if (track.kind === Track.Kind.Video && videoRef.current) {
          track.attach(videoRef.current);
          addLog("✅ Video attached");
        } else if (track.kind === Track.Kind.Audio) {
          const el = track.attach() as HTMLAudioElement;
          el.volume = 1.0;
          el.muted = false;
          document.body.appendChild(el);
          audioElemsRef.current.push(el);
          el.play().catch(() => {});
          addLog(`🔊 Audio element ready (${participant?.identity})`);
        }
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      room.on(RoomEvent.DataReceived, (data: Uint8Array, participant: any) => {
        try {
          const text = new TextDecoder().decode(data);
          let parsed: Record<string, unknown> = {};
          try { parsed = JSON.parse(text); } catch { /* binary */ return; }
          const evType = (parsed.event_type as string) ?? "";

          if (evType === "avatar.speak_started") {
            addLog(`🤖 AVATAR speaking…`);
          } else if (evType === "avatar.speak_ended") {
            addLog(`🤖 AVATAR done speaking`);
          } else if (evType === "avatar.transcription") {
            const avatarText = String(parsed.text ?? parsed.message ?? "").trim();
            if (avatarText) { addTranscript("avatar", avatarText); addLog(`🤖 Avatar said: "${avatarText.slice(0, 60)}"`); }
          } else if (evType === "avatar.transcription.chunk") {
            // suppress — full transcription event has the complete text
          } else if (evType.startsWith("agent.")) {
            addLog(`🤖 ${evType}`);
          } else if (evType === "user.transcription") {
            const userText = String(parsed.text ?? "").trim();
            if (userText) { addTranscript("user", userText); addLog(`🎙️ You said: "${userText}"`); }
          } else if (evType.startsWith("user.")) {
            addLog(`👤 ${evType}`);
          } else if (evType) {
            addLog(`📦 ${evType}: ${JSON.stringify(parsed).slice(0, 80)}`);
          } else {
            addLog(`📦 ${participant?.identity}: ${text.slice(0, 80)}`);
          }
        } catch { /* ignore */ }
      });

      room.on(RoomEvent.ConnectionStateChanged, (state: string) => {
        addLog(`LiveKit state: ${state}`);
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      room.on(RoomEvent.LocalTrackPublished, (pub: any) => {
        addLog(`✅ Local track published: ${pub.kind} (sid: ${pub.trackSid}, muted: ${pub.isMuted})`);
        // Attach mic level monitor
        if (pub.kind === "audio" && pub.track?.mediaStream) {
          try {
            const Ctx = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new Ctx();
            const src = ctx.createMediaStreamSource(pub.track.mediaStream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            src.connect(analyser);
            const buf = new Uint8Array(analyser.frequencyBinCount);
            let lastLog = 0;
            const tick = () => {
              analyser.getByteTimeDomainData(buf);
              let sum = 0;
              for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
              const rms = Math.sqrt(sum / buf.length);
              if (rms > 0.02 && Date.now() - lastLog > 1500) {
                lastLog = Date.now();
                addLog(`🎤 Mic level: ${(rms * 100).toFixed(1)}% — LiveAvatar HEARS you`);
              }
              if (roomRef.current) requestAnimationFrame(tick);
              else ctx.close();
            };
            requestAnimationFrame(tick);
            addLog("🎤 Mic level monitor active — speak to confirm");
          } catch { /* no analyser */ }
        }
      });

      room.on(RoomEvent.Disconnected, () => {
        addLog("❌ Room disconnected");
        setStatus("idle");
        setMicOn(false);
      });

      await room.connect(info.livekit_url, info.livekit_client_token);
      addLog("✅ LiveKit connected");

      // Request mic permission explicitly first
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop()); // just checking permission
        addLog("✅ Mic permission granted");
      } catch (permErr) {
        addLog("❌ Mic permission DENIED: " + (permErr instanceof Error ? permErr.message : String(permErr)));
        throw new Error("Microphone permission denied — please allow mic access in browser");
      }

      await room.localParticipant.setMicrophoneEnabled(true);
      setMicOn(true);

      // Verify the track was actually published
      const pubs = [...room.localParticipant.trackPublications.values()];
      const micPub = pubs.find((p: any) => p.kind === "audio");
      addLog(micPub
        ? `✅ Mic published (track: ${micPub.trackSid ?? "pending"}, muted: ${micPub.isMuted})`
        : "⚠️ Mic publish not found — check browser permissions"
      );

      try {
        await room.startAudio();
        addLog("✅ Audio context started");
        for (const el of audioElemsRef.current) {
          if (el.paused) el.play().catch(() => {});
        }
      } catch {
        addLog("⚠️ Audio blocked — tap the mic button to unlock");
      }

      setStatus("connected");
      const startTime = resumeTimeLeftRef.current ?? defaultDurationRef.current;
      resumeTimeLeftRef.current = null;
      setTimeLeft(startTime);
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t === null || t <= 1) return 0;
          return t - 1;
        });
      }, 1000);

      // Auto-turn on camera and start recording for coaching review
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        setCameraOn(true);
        addLog("Camera ON (for recording)");
        startRecording();
      } catch {
        addLog("Camera not available — recording skipped");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setStatus("error");
      addLog("❌ " + msg);
    }
  }, [addLog, addTranscript, scenarioId, scenarioTable, avatarId]);

  // Voice call start — creates a simulation session and begins voice loop
  const startVoice = useCallback(async () => {
    setStatus("connecting");
    setError(null);
    setTranscript([]);
    setFeedback(null);
    transcriptRef.current = [];
    syncedVoiceTranscriptRef.current = [];
    nudgesInTranscriptRef.current.clear();
    currentCoachTextRef.current = null;
    lastAnalyzedPairRef.current = null;
    setCurrentStep(0);
    lastStepAdvanceRef.current = -1;
    addLog("Starting voice call session…");
    coaching.reset();
    setCheckpointStatus({});

    try {
      // Use pre-warmed session if available (created when user selected Voice Call mode)
      let prewarmed = prewarmedSessionRef.current ? await prewarmedSessionRef.current : null;
      prewarmedSessionRef.current = null; // consume it
      if (!prewarmed) {
        const res = await fetch("/api/simulation/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scenarioId, scenarioTable, callMode: "voice" }),
        });
        const data = await res.json();
        if (!res.ok || !data.session) throw new Error(data.error ?? "Failed to create session");
        prewarmed = data;
      }
      const session = (prewarmed as { session: Record<string, unknown> }).session;
      const sessionId = session.id as string;
      const sessionName = (session.scenario_name as string | undefined) ?? resolvedScenarioName;
      const sessionDurationSec = (session.duration_s as number | undefined) ?? 300;
      setVoiceSessionId(sessionId);
      setResolvedScenarioName(sessionName);
      addLog(`✅ Voice session: ${sessionId}`);

      // Set duration but don't start timer yet — wait for voice connection
      defaultDurationRef.current = sessionDurationSec;
      setTimeLeft(sessionDurationSec);

      console.log(`%c[simulation] �️ Voice call starting — scenario controlled voice`, "color:#a78bfa;font-weight:bold;font-size:13px");
      const effectiveVoiceId = elevenlabsVoiceId ?? undefined;
      addLog(`🎙️ Voice: ${effectiveVoiceId ?? "dashboard default"}`);
      const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
      if (effectiveVoiceId && agentId) {
        addLog(`🎙️ Updating ElevenLabs agent voice to ${effectiveVoiceId}…`);
        const updateRes = await fetch("/api/elevenlabs/update-agent-voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId, voiceId: effectiveVoiceId }),
        });
        if (!updateRes.ok) {
          const updateData = await updateRes.json().catch(() => ({}));
          addLog(`⚠️ Failed to update agent voice: ${updateData.error ?? updateRes.status}`);
        } else {
          const updateData = await updateRes.json().catch(() => ({}));
          addLog(`🎙️ Agent voice update → requested: ${effectiveVoiceId}, confirmed: ${updateData.voiceId ?? "unknown"}, verified: ${updateData.verified ? "yes" : "no"}`);
        }
      }

      // Brief pause to let ElevenLabs propagate the agent voice update
      await new Promise((resolve) => setTimeout(resolve, 1500));

      voiceCall.start(sessionId, effectiveVoiceId, selectedVoiceLanguage, personaContextRef.current ?? undefined);
      addLog("🎙️ Voice call started");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setStatus("error");
      addLog("❌ " + msg);
    }
  }, [addLog, scenarioId, scenarioTable, resolvedScenarioName, voiceCall, coaching, selectedVoiceLanguage, elevenlabsVoiceId]);

  // Text chat start — creates a simulation session for typed conversation
  const startText = useCallback(async () => {
    setStatus("connecting");
    setError(null);
    setTranscript([]);
    setFeedback(null);
    transcriptRef.current = [];
    nudgesInTranscriptRef.current.clear();
    currentCoachTextRef.current = null;
    lastAnalyzedPairRef.current = null;
    setCurrentStep(0);
    lastStepAdvanceRef.current = -1;
    addLog("Starting text chat session…");
    coaching.reset();
    setCheckpointStatus({});

    try {
      const res = await fetch("/api/simulation/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId, scenarioTable, callMode: "text" }),
      });
      const data = await res.json();
      if (!res.ok || !data.session) throw new Error(data.error ?? "Failed to create session");

      const session = data.session;
      setTextSessionId(session.id);
      setResolvedScenarioName(session.scenario_name ?? resolvedScenarioName);
      addLog(`✅ Text session: ${session.id}`);

      // Start timer
      const durationSec = (session.duration_min ?? 5) * 60;
      defaultDurationRef.current = durationSec;
      setTimeLeft(durationSec);
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t === null || t <= 1) return 0;
          return t - 1;
        });
      }, 1000);

      setStatus("connected");
      addLog("📝 Text chat started");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setStatus("error");
      addLog("❌ " + msg);
    }
  }, [addLog, scenarioId, scenarioTable, resolvedScenarioName, coaching]);

  // Send a typed message in text mode
  const sendTextMessage = useCallback(async () => {
    const message = textInput.trim();
    const sessionId = textSessionId;
    if (!message || !sessionId || textLoading) return;

    setTextInput("");
    setTextLoading(true);
    addTranscript("user", message);

    try {
      const res = await fetch("/api/simulation/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message }),
      });
      const data = await res.json();
      console.log("[text] turn response:", data);
      if (!res.ok) throw new Error(data.error ?? "Turn failed");

      const buyerMsg = data.buyer_response?.message ?? data.response?.message ?? "";
      const buyerEmotion = data.buyer_response?.emotion ?? data.response?.emotion;
      const buyerIntent = data.buyer_response?.intent ?? data.response?.intent;
      if (buyerMsg) {
        addTranscript("avatar", buyerMsg, buyerEmotion, buyerIntent);
      } else {
        console.warn("[text] no message in response:", data);
      }
      coachingAnalyzeRef.current(message, buyerMsg);
      if (sessionId && buyerMsg) {
        lastAnalyzedPairRef.current = `${message}|${buyerMsg}`;
        fetch("/api/simulation/coach-turn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, sellerText: message, buyerText: buyerMsg }),
        }).then((r) => r.json()).then(appendCoachTurnNudges).catch(() => {});
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      addLog("❌ Text turn failed: " + msg);
    } finally {
      setTextLoading(false);
    }
  }, [textInput, textSessionId, textLoading, addTranscript, addLog, coachingAnalyzeRef, appendCoachTurnNudges]);

  const toggleMic = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    // Also unlock audio on gesture
    room.startAudio().catch(() => {});
    for (const el of audioElemsRef.current) {
      if (el.paused) el.play().catch(() => {});
    }
    const next = !micOn;
    await room.localParticipant.setMicrophoneEnabled(next);
    setMicOn(next);
    addLog(next ? "🎙️ Mic ON" : "🔇 Mic OFF");
  }, [micOn, addLog]);

  const stop = useCallback(async () => {
    const room = roomRef.current;
    if (room) {
      await room.disconnect();
      roomRef.current = null;
    }
    for (const el of audioElemsRef.current) {
      el.pause(); el.srcObject = null; el.remove();
    }
    audioElemsRef.current = [];
    const info = sessionRef.current;
    if (info) {
      fetch("/api/heygen-test", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: info.session_id, heygen_session_db_id: heygenSessionDbIdRef.current }),
      }).catch(() => {});
      sessionRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (coachDebounceRef.current) { clearTimeout(coachDebounceRef.current); coachDebounceRef.current = null; }
    setTimeLeft(null);
    setStatus("idle");
    setMicOn(false);
    localStorage.removeItem("heygen-active-session");
    // Voice cleanup
    voiceCall.stop();
    setVoiceSessionId(null);
    // Text cleanup
    setTextSessionId(null);
    setTextInput("");
    setTextLoading(false);
    addLog("Session stopped");
    // Stop recording
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
      addLog("⏹️ Recording stopped");
    }
    recorderRef.current = null;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setCameraOn(false);
    setTranscriptOpen(false);
  }, [addLog]);

  const pause = useCallback(async () => {
    const room = roomRef.current;
    if (room) {
      await room.disconnect();
      roomRef.current = null;
    }
    for (const el of audioElemsRef.current) {
      el.pause(); el.srcObject = null; el.remove();
    }
    audioElemsRef.current = [];
    const info = sessionRef.current;
    if (info) {
      fetch("/api/heygen-test", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: info.session_id, heygen_session_db_id: heygenSessionDbIdRef.current }),
      }).catch(() => {});
      sessionRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    resumeTimeLeftRef.current = timeLeftRef.current; // preserve remaining time for resume
    setStatus("paused");
    setMicOn(false);
    // Voice pause
    voiceCall.stop();
    addLog("⏸️ Session paused");
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
      addLog("⏹️ Recording paused");
    }
    recorderRef.current = null;
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setCameraOn(false);
  }, [addLog]);

  const toggleCamera = useCallback(async () => {
    if (cameraOn) {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      setCameraOn(false);
      addLog("Camera OFF");
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        setCameraOn(true);
        addLog("Camera ON");
      } catch (e) {
        addLog("Camera access denied");
      }
    }
  }, [cameraOn, addLog]);

  const handleEnd = useCallback(async () => {
    const currentTranscript = [...transcriptRef.current];
    const recordedChunks = [...recordedChunksRef.current];
    const currentCallMode = callMode;
    const currentVoiceSessionId = voiceSessionId;
    const currentTextSessionId = textSessionId;
    await stop();

    // Upload recording if available
    if (recordedChunks.length > 0 && heygenSessionDbIdRef.current) {
      try {
        const blob = new Blob(recordedChunks, { type: "video/webm" });
        const fileName = `${heygenSessionDbIdRef.current}.webm`;
        const supabase = createClient();
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from("session-recordings")
          .upload(fileName, blob, { contentType: "video/webm", upsert: true });
        if (!uploadErr && uploadData) {
          const { data: { publicUrl } } = supabase.storage.from("session-recordings").getPublicUrl(fileName);
          await supabase.from("heygen_sessions").update({ video_url: publicUrl }).eq("id", heygenSessionDbIdRef.current);
          addLog(`📹 Recording uploaded`);
        } else {
          addLog("⚠️ Upload failed: " + (uploadErr?.message ?? "unknown"));
        }
      } catch (e) {
        addLog("⚠️ Recording upload error: " + String(e));
      }
    }

    if (currentTranscript.length >= 2) {
      setFeedbackLoading(true);
      try {
        if (currentCallMode === "voice" && currentVoiceSessionId) {
          // Persist voice transcript to simulation_messages (built-in LLM doesn't save these)
          const supabase = createClient();
          const existingMsgs = await supabase
            .from("simulation_messages")
            .select("id")
            .eq("session_id", currentVoiceSessionId)
            .limit(1);
          if (existingMsgs.data && existingMsgs.data.length === 0) {
            const inserts = currentTranscript.map((entry) => ({
              session_id: currentVoiceSessionId,
              role: entry.role === "user" ? "user" : "buyer",
              content: entry.text,
            }));
            await supabase.from("simulation_messages").insert(inserts);
            addLog(`📝 Persisted ${inserts.length} transcript messages`);
          }

          // Voice calls — run coaching evaluator
          const [coachRes, endRes] = await Promise.all([
            fetch("/api/simulation/coach", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionId: currentVoiceSessionId }),
            }),
            fetch("/api/simulation/end", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionId: currentVoiceSessionId }),
            }),
          ]);
          fetch("/api/simulation/vector/ingest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: currentVoiceSessionId }),
          }).catch(() => {});

          if (!endRes.ok) {
            const endErr = await endRes.json().catch(() => ({}));
            console.error("[handleEnd] voice end failed:", endRes.status, endErr);
            addLog("⚠️ Failed to end session: " + (endErr.error || endRes.status));
          }

          if (!coachRes.ok) {
            const coachErr = await coachRes.json().catch(() => ({}));
            if (coachErr.error?.includes("minimum 2 turns")) {
              addLog("ℹ️ Not enough conversation turns for coaching analysis");
            } else {
              console.error("[handleEnd] voice coach failed:", coachRes.status, coachErr);
              addLog("⚠️ Coaching analysis failed: " + (coachErr.error || coachRes.status));
            }
            setFeedback({
              overall_score: 0,
              breakdown: { metrics: 0, economic_buyer: 0, decision_criteria: 0, decision_process: 0, identify_pain: 0, champion: 0 },
              strengths: [],
              weaknesses: [],
              missed_opportunities: [],
              coaching_recommendations: [],
              coaching_moments: [],
            } as FeedbackResult & { error?: string });
          } else {
            const coachData = await coachRes.json().catch(() => ({}));
            if (coachData.evaluation) {
              setFeedback({
                overall_score: coachData.evaluation.overall_score,
                breakdown: {
                  metrics: coachData.evaluation.discovery_score,
                  economic_buyer: coachData.evaluation.empathy_score,
                  decision_criteria: 0,
                  decision_process: 0,
                  identify_pain: coachData.evaluation.objection_score,
                  champion: 0,
                },
                strengths: coachData.evaluation.recommendations.slice(0, 3),
                weaknesses: coachData.evaluation.missed_opportunities,
                missed_opportunities: coachData.evaluation.missed_opportunities,
                coaching_recommendations: coachData.evaluation.recommendations,
                coaching_moments: [],
              });
            }
          }
        } else if (currentCallMode === "text" && currentTextSessionId) {
          // Text chat — run MEDDIC analysis
          const [analyzeRes, endRes] = await Promise.all([
            fetch("/api/simulation/analyze", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionId: currentTextSessionId }),
            }),
            fetch("/api/simulation/end", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionId: currentTextSessionId }),
            }),
          ]);
          fetch("/api/simulation/vector/ingest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: currentTextSessionId }),
          }).catch(() => {});

          if (!endRes.ok) {
            const endErr = await endRes.json().catch(() => ({}));
            console.error("[handleEnd] text end failed:", endRes.status, endErr);
            addLog("⚠️ Failed to end session: " + (endErr.error || endRes.status));
          }

          const analyzeData = await analyzeRes.json();
          if (analyzeData.analysis) {
            setFeedback(analyzeData.analysis);
          }
        } else {
          // Existing HeyGen video feedback
          const promises: Promise<unknown>[] = [
            fetch("/api/heygen-test/feedback", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                transcript: currentTranscript,
                scenarioName: resolvedScenarioName ?? "Simulation",
                heygenSessionId: heygenSessionDbIdRef.current,
                simSessionId: simSessionDbIdRef.current,
                startedAt: startedAtRef.current,
              }),
            }),
          ];
          if (simSessionDbIdRef.current) {
            promises.push(
              fetch("/api/simulation/end", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId: simSessionDbIdRef.current }),
              })
            );
          }
          const [feedbackRes, endRes] = await Promise.all(promises) as [Response, Response | undefined];
          if (endRes && !endRes.ok) {
            const endErr = await endRes.json().catch(() => ({}));
            console.error("[handleEnd] video end failed:", endRes.status, endErr);
            addLog("⚠️ Failed to end session: " + (endErr.error || endRes.status));
          }
          setFeedback(await feedbackRes.json());

          const heygenSessionId = sessionRef.current?.session_id;
          if (heygenSessionId) {
            fetch("/api/simulation/vector/ingest", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionId: heygenSessionId }),
            }).catch(() => {});
          }
        }
      } catch { /* ignore */ }
      finally { setFeedbackLoading(false); }
    }
  }, [stop, resolvedScenarioName, addLog, callMode, voiceSessionId, textSessionId]);

  // Restore active session refs from localStorage after refresh
  useEffect(() => {
    try {
      const stored = localStorage.getItem("heygen-active-session");
      if (stored) {
        const parsed = JSON.parse(stored) as { heygenSessionDbId: string; simSessionDbId?: string; startedAt: string };
        heygenSessionDbIdRef.current = parsed.heygenSessionDbId;
        simSessionDbIdRef.current = parsed.simSessionDbId ?? null;
        startedAtRef.current = parsed.startedAt;
      }
    } catch { /* ignore */ }
  }, []);

  // Auto-end when timer hits 0
  useEffect(() => {
    if (timeLeft === 0) handleEnd();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  // End call and trigger analysis when the voice session ends naturally (e.g., after goodbyes)
  useEffect(() => {
    if (callMode !== "voice") return;
    if ((status === "connected" || status === "paused") && voiceCall.status === "idle") {
      handleEnd();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceCall.status, callMode, status]);

  // Keep timeLeftRef in sync so pause can read current value
  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  // Load scenario details and set coaching context
  useEffect(() => {
    if (!scenarioId || !scenarioTable) return;
    const load = async () => {
      try {
        const supabase = createClient();
        const { data: scenario } = await supabase
          .from(scenarioTable)
          .select("seller_company, seller_product, seller_description, custom_persona, context_note, preset_persona_id, scenario_type, scoring_criteria, elevenlabs_voice_id, voice_avatar_image_url")
          .eq("id", scenarioId)
          .single();
        if (scenario) {
          const persona = scenario.custom_persona as any;

          let candidateName: string | undefined;
          try {
            const { data: { user } } = await supabase.auth.getUser();
            candidateName = user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? undefined;
          } catch { /* ignore */ }

          setResolvedPersonaName(persona?.name ?? null);
          setResolvedPersonaRole(persona?.jobTitle ?? null);
          setScenarioContextNote(scenario.context_note ?? null);
          setSellerCompany(scenario.seller_company ?? null);
          setSellerProduct(scenario.seller_product ?? null);
          setSellerDescription(scenario.seller_description ?? null);
          setScenarioType(scenario.scenario_type ?? null);
          setPersonaDetails({
            name: persona?.name ?? null,
            jobTitle: persona?.jobTitle ?? null,
            company: persona?.company ?? null,
            industry: persona?.industry ?? null,
            age: persona?.age ? String(persona.age) : null,
            gender: persona?.gender ?? null,
            income: persona?.income ?? null,
            education: persona?.education ?? null,
            location: persona?.location ?? null,
            avatar: (scenario as any).voice_avatar_image_url ?? persona?.avatar ?? null,
            companySize: persona?.companySize ?? null,
            reportsTo: persona?.reportsTo ?? null,
            decisionRole: persona?.decisionRole ?? null,
            owns: persona?.owns ?? null,
            motivations: persona?.motivations ?? null,
            concerns: persona?.concerns ?? null,
            howToEngage: persona?.howToEngage ?? null,
            communicationStyle: persona?.communicationStyle ?? null,
            communicationLanguage: persona?.communicationLanguage ?? null,
            personality: persona?.personality ?? null,
            painPoints: Array.isArray(persona?.painPoints) ? persona.painPoints : [],
            goals: Array.isArray(persona?.goals) ? persona.goals : [],
            hiddenConcern: persona?.hiddenConcern ?? null,
            companyGoal: persona?.companyGoal ?? null,
            openingLine: persona?.openingLine ?? null,
            meetingSource: persona?.meetingSource ?? null,
          });

          personaContextRef.current = {
            buyerName: persona?.name ?? undefined,
            buyerTitle: persona?.jobTitle ?? undefined,
            buyerCompany: persona?.company ?? undefined,
            buyerIndustry: persona?.industry ?? undefined,
            buyerPersonality: persona?.personality ?? undefined,
            buyerPainPoints: persona?.painPoints ?? undefined,
            buyerGoals: persona?.goals ?? undefined,
            buyerCompanyGoal: persona?.companyGoal ?? undefined,
            buyerOpeningLine: persona?.openingLine ?? undefined,
            buyerHiddenConcern: persona?.hiddenConcern ?? undefined,
            buyerMeetingSource: persona?.meetingSource ?? undefined,
            buyerBudgetStatus: persona?.budgetStatus ?? undefined,
            buyerCommunicationStyle: persona?.communicationStyle ?? undefined,
            buyerCommunicationLanguage: persona?.communicationLanguage ?? undefined,
            sellerCompany: scenario.seller_company ?? undefined,
            sellerProduct: scenario.seller_product ?? undefined,
            contextNote: scenario.context_note ?? undefined,
            scenarioType: scenario.scenario_type ?? undefined,
            candidateName,
            firstMessage:
              scenario.scenario_type === "Product Knowledge Interview"
                ? generateProductKnowledgeFirstMessage(candidateName ?? "there", persona?.name ?? "Priya", scenario.seller_company ?? "Aspire")
                : "",
          };

          setScenarioContext({
            sellerCompany: scenario.seller_company ?? undefined,
            sellerProduct: scenario.seller_product ?? undefined,
            buyerName: persona?.name ?? undefined,
            buyerTitle: persona?.jobTitle ?? undefined,
            buyerCompany: persona?.company ?? undefined,
            buyerIndustry: persona?.industry ?? undefined,
            buyerPainPoints: persona?.painPoints ?? undefined,
            contextNote: scenario.context_note ?? undefined,
            scenarioType: scenario.scenario_type ?? undefined,
          });
          setScoringCriteria((scenario as any).scoring_criteria ?? null);
          setElevenlabsVoiceId(elevenlabsVoiceIdParam ?? (scenario as any).elevenlabs_voice_id ?? null);
          setVoiceAvatarImageUrl((prev) => prev ?? (scenario as any).voice_avatar_image_url ?? null);
        }
      } catch { /* ignore */ }
    };
    load();
  }, [scenarioId, scenarioTable, setScenarioContext]);

  // Fetch organization logo/name for the feedback modal
  useEffect(() => {
    const loadOrg = async () => {
      try {
        const res = await fetch("/api/company/org");
        const data = await res.json();
        if (data.organization) {
          setOrgLogoUrl(data.organization.logo_url ?? null);
          setOrgName(data.organization.name ?? null);
        }
      } catch { /* ignore */ }
    };
    loadOrg();
  }, []);

  // Sync voice call transcripts into the page transcript (shows in Conversation modal)
  useEffect(() => {
    console.log("[simulation] voice transcript sync effect:", { callMode, voiceTranscriptLength: voiceCall.transcript.length, voiceTranscript: voiceCall.transcript });
    if (callMode !== "voice" || voiceCall.transcript.length === 0) return;

    const voiceTranscript = voiceCall.transcript;
    const synced = syncedVoiceTranscriptRef.current;
    let pageChanged = false;

    for (let i = 0; i < voiceTranscript.length; i++) {
      const voiceEntry = voiceTranscript[i];
      const syncedEntry = synced[i];
      const pageRole = voiceEntry.role === "buyer" ? "avatar" : "user";

      if (!syncedEntry) {
        // New voice entry — add a new page transcript entry
        addTranscript(pageRole, voiceEntry.text, voiceEntry.emotion, voiceEntry.intent);
        console.log("[simulation] added transcript entry:", { pageRole, text: voiceEntry.text, idx: i });
        pageChanged = true;
      } else if (syncedEntry.text !== voiceEntry.text || syncedEntry.emotion !== voiceEntry.emotion || syncedEntry.intent !== voiceEntry.intent) {
        // Existing voice entry was patched — update the corresponding page entry by role
        const roleCount = voiceTranscript.slice(0, i + 1).filter((e) => e.role === voiceEntry.role).length;
        setTranscript((prev) => {
          let matched = 0;
          let pageIdx = prev.length - 1;
          while (pageIdx >= 0) {
            if (prev[pageIdx].role === pageRole) {
              matched++;
              if (matched === roleCount) break;
            }
            pageIdx--;
          }
          if (pageIdx < 0) return prev;
          const next = [...prev];
          next[pageIdx] = { ...prev[pageIdx], text: voiceEntry.text, emotion: voiceEntry.emotion, intent: voiceEntry.intent };
          console.log("[simulation] patched transcript entry:", { pageRole, text: voiceEntry.text, pageIdx, voiceIdx: i, roleCount });
          return next;
        });
        pageChanged = true;
      }
    }

    if (pageChanged) {
      syncedVoiceTranscriptRef.current = voiceTranscript.map((e) => ({ role: e.role, text: e.text, emotion: e.emotion, intent: e.intent }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceCall.transcript, callMode]);

  // Analyze turns for coaching (both video and voice modes)
  useEffect(() => {
    console.log("[simulation] coaching analysis effect:", { callMode, voiceTranscriptLength: voiceCall.transcript.length, pageTranscriptLength: transcript.length });
    let sellerText: string | null = null;
    let buyerText: string | null = null;
    let sessionId: string | null = null;

    if (callMode === "voice") {
      if (voiceCall.transcript.length === 0) return;
      const lastTwo = voiceCall.transcript.slice(-2);
      const sellerEntry = lastTwo.find((t) => t.role === "user");
      const buyerEntry = lastTwo.find((t) => t.role === "buyer");
      if (sellerEntry && buyerEntry) {
        sellerText = sellerEntry.text;
        buyerText = buyerEntry.text;
        sessionId = voiceSessionId;
      }
    } else {
      // Video mode: use main transcript (role is "avatar" for buyer)
      if (transcript.length === 0) return;
      const lastTwo = transcript.slice(-2).filter((t) => t.role === "user" || t.role === "avatar");
      const sellerEntry = lastTwo.find((t) => t.role === "user");
      const buyerEntry = lastTwo.find((t) => t.role === "avatar");
      if (sellerEntry && buyerEntry) {
        sellerText = sellerEntry.text;
        buyerText = buyerEntry.text;
        sessionId = simSessionDbIdRef.current;
      }
    }

    if (!sellerText || !buyerText || !sessionId) return;

    const pairKey = `${sellerText}|${buyerText}`;
    if (lastAnalyzedPairRef.current === pairKey) return;
    lastAnalyzedPairRef.current = pairKey;

    // Debounce: wait for the buyer text to stabilize before calling the coach API
    if (coachDebounceRef.current) clearTimeout(coachDebounceRef.current);
    coachDebounceRef.current = setTimeout(() => {
      coachDebounceRef.current = null;
      coachingAnalyzeRef.current(sellerText!, buyerText!);
      fetch("/api/simulation/coach-turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, sellerText, buyerText }),
      }).then((r) => r.json()).then(appendCoachTurnNudges).catch(() => {});
    }, 1500);
  }, [voiceCall.transcript, transcript, callMode, appendCoachTurnNudges, voiceSessionId]);

  // Auto-advance the 7-step discovery call progress based on seller's transcript
  useEffect(() => {
    if (status !== "connected") return;
    const sourceTranscript = callMode === "voice" ? voiceCall.transcript : transcript;
    const sellerEntries = sourceTranscript.filter((t) => t.role === "user");
    if (sellerEntries.length === 0) return;
    const latestSeller = sellerEntries[sellerEntries.length - 1];
    const detectedStep = detectStepFromText(latestSeller.text);
    if (detectedStep >= 0 && detectedStep >= currentStep && detectedStep < CALL_STEPS.length && detectedStep !== lastStepAdvanceRef.current) {
      console.log("[simulation] advancing call step:", { from: currentStep, to: detectedStep + 1, text: latestSeller.text });
      setCurrentStep(detectedStep + 1);
      lastStepAdvanceRef.current = detectedStep;
    }
  }, [voiceCall.transcript, transcript, callMode, currentStep, detectStepFromText, status]);

  // Sync page-level status with voiceCall.status (connecting → connected, pause/resume, error)
  useEffect(() => {
    if (callMode !== "voice") return;
    // Transition from connecting → connected when the voice session is actually live
    if (status === "connecting" && (voiceCall.status === "listening" || voiceCall.status === "speaking")) {
      setStatus("connected");
      // Start timer now that the voice connection is live
      const startTime = timeLeftRef.current ?? defaultDurationRef.current;
      setTimeLeft(startTime);
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t === null || t <= 1) return 0;
          return t - 1;
        });
      }, 1000);
      return;
    }
    // Propagate voice call errors during connecting
    if (status === "connecting" && voiceCall.status === "error") {
      setStatus("error");
      return;
    }
    if (voiceCall.status === "paused" && status === "connected") {
      // Voice was paused via VoiceCallPanel — pause page timer
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      resumeTimeLeftRef.current = timeLeftRef.current;
      setStatus("paused");
    } else if ((voiceCall.status === "listening" || voiceCall.status === "idle") && status === "paused") {
      // Voice was resumed via VoiceCallPanel — resume page timer
      const startTime = resumeTimeLeftRef.current ?? defaultDurationRef.current;
      resumeTimeLeftRef.current = null;
      setTimeLeft(startTime);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev === null || prev <= 0) return 0;
          return prev - 1;
        });
      }, 1000);
      setStatus("connected");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceCall.status, callMode, status]);

  // Auto-scroll text chat to bottom on new messages
  useEffect(() => {
    if (callMode === "text" && textMessagesEndRef.current) {
      textMessagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcript, textLoading, callMode]);

  // Pre-warm microphone permission when voice mode is selected so there's no delay at connect time
  useEffect(() => {
    if (callMode !== "voice" || status !== "idle") return;
    navigator.mediaDevices?.getUserMedia({ audio: true })
      .then((stream) => stream.getTracks().forEach((t) => t.stop()))
      .catch(() => {}); // silently ignore — user can deny at connect time
  }, [callMode, status]);

  // Pre-create voice session as soon as user selects voice mode so DB round-trip is hidden
  useEffect(() => {
    if (callMode !== "voice" || status !== "idle" || !scenarioId || !scenarioTable) return;
    prewarmedSessionRef.current = fetch("/api/simulation/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenarioId, scenarioTable, callMode: "voice" }),
    })
      .then((r) => r.json())
      .then((d) => (d.session ? d : null))
      .catch(() => null);
  }, [callMode, status, scenarioId, scenarioTable]);

  // Cleanup on unmount
  useEffect(() => () => { stop(); }, [stop]);

  return (
    <div className="h-full bg-[#0B0E14] text-white flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 lg:px-6 py-2 border-b border-white/10 bg-[#0B0E14]/95 backdrop-blur-sm z-20 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/10 text-white hover:bg-white/15 transition-colors"
            title="Back to scenario"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            Back
          </button>
          <p className="text-sm font-semibold leading-none text-white">
            {resolvedScenarioName ?? scenarioNameParam ?? "Simulation"}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {(status === "connected" || status === "connecting") && timeLeft !== null && (
            <div className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
              timeLeft <= 30 ? "bg-red-500/10 text-red-400" :
              timeLeft <= 60 ? "bg-yellow-500/10 text-yellow-400" :
              "bg-green-500/10 text-green-400"
            }`}>
              {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:{String(timeLeft % 60).padStart(2, "0")}
            </div>
          )}
          {status === "connected" && (
            <div className="flex items-center gap-1 text-[10px] text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live
            </div>
          )}
        </div>
      </div>

      {/* Main Call Area — video fills the entire space */}
      <div className="flex-1 relative overflow-hidden">
        {/* Hidden video element for LiveKit track attachment (audio still plays) */}
        {callMode === "video" ? (
          <video ref={videoRef} autoPlay playsInline hidden={!showAvatarVideo} className={`absolute inset-0 w-full h-full object-contain ${showAvatarVideo ? "" : "hidden"}`} />
        ) : null}

        {/* Pre-call / idle screen — profile card + practice start */}
        {status === "idle" ? (
          <div className="absolute inset-0 flex flex-col bg-background text-foreground overflow-hidden">
            {/* Scrollable tab content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="w-full max-w-2xl mx-auto py-6 sm:py-10">
                {resolvedScenarioName && (
                  <p className="text-center text-xs font-semibold uppercase tracking-wider text-orange-500 mb-3">
                    {resolvedScenarioName}
                  </p>
                )}

                {/* Avatar + tabbed content — avatar stays on the left across all tabs */}
                <div className="flex flex-col sm:flex-row items-start gap-6 sm:gap-10">
                  {/* Avatar */}
                  <div className="shrink-0 mx-auto sm:mx-0">
                    <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden border-4 border-border shadow-lg bg-muted flex items-center justify-center">
                      {(personaDetails.avatar ?? voiceAvatarImageUrl ?? avatarImageUrl) ? (
                        <img
                          src={(personaDetails.avatar ?? voiceAvatarImageUrl ?? avatarImageUrl) ?? undefined}
                          alt={personaDetails.name ?? resolvedPersonaName ?? "Buyer"}
                          className="w-full h-full object-cover object-top"
                        />
                      ) : (
                        <User className="w-14 h-14 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Right side: tabs + content */}
                  <div className="flex-1 w-full text-center sm:text-left">
                    {/* Tabs */}
                    <div className="flex items-center justify-center sm:justify-start gap-2 mb-6">
                      {(
                        scenarioType === "First Discovery Call"
                          ? (["profile", "background"] as const)
                          : (["profile", "background", "style"] as const)
                      ).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`px-4 sm:px-6 py-2 text-sm font-medium capitalize transition-colors border-b-2 ${
                            activeTab === tab
                              ? "text-orange-600 border-orange-500"
                              : "text-muted-foreground border-transparent hover:text-foreground"
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>

                    {/* Profile Tab */}
                    {activeTab === "profile" && (
                      <div className="w-full">
                        {/* Details */}
                        <div className="w-full text-center sm:text-left">
                      <p className="text-xs font-semibold uppercase tracking-wider text-orange-500 mb-4">Client Profile</p>

                      <div className="space-y-4 text-left">
                        {personaDetails.name && (
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                              <User className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Name</p>
                              <p className="text-sm font-medium text-foreground">{personaDetails.name}</p>
                            </div>
                          </div>
                        )}
                        {personaDetails.jobTitle && (
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                              <Briefcase className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Title</p>
                              <p className="text-sm font-medium text-foreground">{personaDetails.jobTitle}</p>
                            </div>
                          </div>
                        )}
                        {personaDetails.company && (
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                              <Building2 className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Company</p>
                              <p className="text-sm font-medium text-foreground">{personaDetails.company}</p>
                            </div>
                          </div>
                        )}
                        {personaDetails.industry && (
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                              <Target className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Industry</p>
                              <p className="text-sm font-medium text-foreground">{personaDetails.industry}</p>
                            </div>
                          </div>
                        )}
                        {personaDetails.decisionRole && (
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Decision Role</p>
                              <p className="text-sm font-medium text-foreground">{personaDetails.decisionRole}</p>
                            </div>
                          </div>
                        )}
                        {personaDetails.owns && (
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                              <List className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Owns</p>
                              <p className="text-sm font-medium text-foreground whitespace-pre-line">{personaDetails.owns}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Background Tab */}
                {activeTab === "background" && (
                  <div className="text-center">
                    {/* First Discovery Call: only meeting source */}
                    {scenarioType === "First Discovery Call" ? (
                      personaDetails.meetingSource && (
                        <div className="max-w-lg mx-auto text-left space-y-5">
                          <p className="text-xs font-semibold uppercase tracking-wider text-orange-500">Client Background</p>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Meeting Source</p>
                            <p className="text-sm text-foreground">{personaDetails.meetingSource}</p>
                          </div>
                        </div>
                      )
                    ) : (
                      /* Other calls: full client background */
                      (personaDetails.painPoints.length > 0 || personaDetails.goals.length > 0 || personaDetails.hiddenConcern || personaDetails.companyGoal || personaDetails.openingLine || personaDetails.meetingSource) && (
                        <div className="max-w-lg mx-auto text-left space-y-5">
                          <p className="text-xs font-semibold uppercase tracking-wider text-orange-500">Client Background</p>
                          {personaDetails.meetingSource && (
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Meeting Source</p>
                              <p className="text-sm text-foreground">{personaDetails.meetingSource}</p>
                            </div>
                          )}
                          {personaDetails.openingLine && (
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Likely Opening</p>
                              <p className="text-sm text-foreground italic">&ldquo;{personaDetails.openingLine}&rdquo;</p>
                            </div>
                          )}
                          {personaDetails.painPoints.length > 0 && (
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Pain Points</p>
                              <ul className="mt-1 space-y-1">
                                {personaDetails.painPoints.slice(0, 3).map((p, i) => (
                                  <li key={i} className="text-sm text-foreground flex items-start gap-2">
                                    <span className="text-orange-500 mt-1">•</span>
                                    {p}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {personaDetails.goals.length > 0 && (
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Goals</p>
                              <ul className="mt-1 space-y-1">
                                {personaDetails.goals.slice(0, 3).map((g, i) => (
                                  <li key={i} className="text-sm text-foreground flex items-start gap-2">
                                    <span className="text-emerald-500 mt-1">•</span>
                                    {g}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {personaDetails.hiddenConcern && (
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Hidden Concern</p>
                              <p className="text-sm text-foreground">{personaDetails.hiddenConcern}</p>
                            </div>
                          )}
                          {personaDetails.companyGoal && (
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Company Goal</p>
                              <p className="text-sm text-foreground">{personaDetails.companyGoal}</p>
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>
                )}

                {/* Style Tab — parsed from the scenario context note */}
                {activeTab === "style" && (() => {
                  const style = parseStyleSections(scenarioContextNote);
                  const hasStyle = style.communicationStyle || style.motivations || style.concerns || style.howToEngage;
                  const hasPersonaStyle = personaDetails.personality || personaDetails.communicationLanguage;
                  return (
                    <div className="max-w-lg mx-auto text-left space-y-5">
                      {personaDetails.personality && (
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <Smile className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Personality / Behaviour</p>
                            <ul className="mt-1 space-y-1">
                              {(personaDetails.personality.includes("\n")
                                ? personaDetails.personality.split(/\n+/).filter(Boolean)
                                : personaDetails.personality.split(/\.\s+/).filter(Boolean)
                              ).map((item, i) => (
                                <li key={i} className="text-sm text-foreground flex items-start gap-2">
                                  <span className="text-muted-foreground mt-1">•</span>
                                  {item.replace(/^[-•]\s*/, "").replace(/\.$/, "").trim()}
                                  {!item.endsWith(".") ? "" : ""}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                      {personaDetails.communicationLanguage && (
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <MessageCircle className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Communication Language</p>
                            <ul className="mt-1 space-y-1">
                              {(personaDetails.communicationLanguage.includes("\n")
                                ? personaDetails.communicationLanguage.split(/\n+/).filter(Boolean)
                                : personaDetails.communicationLanguage.split(/\.\s+/).filter(Boolean)
                              ).map((item, i) => (
                                <li key={i} className="text-sm text-foreground flex items-start gap-2">
                                  <span className="text-muted-foreground mt-1">•</span>
                                  {item.replace(/^[-•]\s*/, "").replace(/\.$/, "").trim()}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                      {style.communicationStyle && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-orange-500 mb-2">Communication Style</p>
                          <ul className="space-y-1">
                            {style.communicationStyle.split(/\n+/).filter(Boolean).map((item, i) => (
                              <li key={i} className="text-sm text-foreground flex items-start gap-2">
                                <span className="text-muted-foreground mt-1">•</span>
                                {item.replace(/^[-•]\s*/, "")}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {style.motivations && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-orange-500 mb-2">Motivations</p>
                          <ul className="space-y-1">
                            {style.motivations.split(/\n+/).filter(Boolean).map((item, i) => (
                              <li key={i} className="text-sm text-foreground flex items-start gap-2">
                                <span className="text-emerald-500 mt-1">•</span>
                                {item.replace(/^[-•]\s*/, "")}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {style.concerns && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-orange-500 mb-2">Concerns</p>
                          <ul className="space-y-1">
                            {style.concerns.split(/\n+/).filter(Boolean).map((item, i) => (
                              <li key={i} className="text-sm text-foreground flex items-start gap-2">
                                <span className="text-orange-500 mt-1">•</span>
                                {item.replace(/^[-•]\s*/, "")}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {style.howToEngage && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-orange-500 mb-2">How to Engage</p>
                          <ul className="space-y-1">
                            {style.howToEngage.split(/\n+/).filter(Boolean).map((item, i) => (
                              <li key={i} className="text-sm text-foreground flex items-start gap-2">
                                <span className="text-blue-500 mt-1">•</span>
                                {item.replace(/^[-•]\s*/, "")}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })()}
                  </div>
                </div>

              </div>
            </div>

            {/* Sticky bottom call bar — Ready to Practice + mode selector + start button in one section */}
            <div className="shrink-0 border-t border-border bg-card/90 backdrop-blur-sm p-4 sm:p-5 z-10">
              <div className="max-w-2xl mx-auto flex flex-col items-center justify-center gap-4">
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-foreground">Ready to Practice</h3>
                  <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto leading-relaxed">
                    {personaDetails.openingLine
                      ? `You’ll be speaking with ${personaDetails.name ?? resolvedPersonaName ?? "the buyer"}${personaDetails.jobTitle ? `, ${personaDetails.jobTitle}` : ""}${personaDetails.company ? ` at ${personaDetails.company}` : ""}. They may open with: “${personaDetails.openingLine}”`
                      : `You’ll be speaking with ${personaDetails.name ?? resolvedPersonaName ?? "the buyer"}${personaDetails.jobTitle ? `, ${personaDetails.jobTitle}` : ""}${personaDetails.company ? ` at ${personaDetails.company}` : ""}. Review their profile and start the call when you’re ready.`}
                  </p>
                </div>
                {/* Mode Toggle */}
                <div className="flex items-center gap-1 bg-muted rounded-full p-1 border border-border w-fit">
                  <button
                    onClick={() => setCallMode("video")}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-colors ${
                      callMode === "video" ? "bg-card text-orange-600 shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    Video Call
                  </button>
                  <button
                    onClick={() => setCallMode("voice")}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-colors ${
                      callMode === "voice" ? "bg-card text-orange-600 shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" />
                    Voice Call
                  </button>
                  <button
                    onClick={() => setCallMode("text")}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-colors ${
                      callMode === "text" ? "bg-card text-orange-600 shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Text Chat
                  </button>
                </div>

                {/* Start button */}
                <button
                  onClick={callMode === "voice" ? startVoice : callMode === "text" ? startText : start}
                  className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-3 rounded-full shadow-lg shadow-orange-500/25 transition-all hover:scale-105 active:scale-95"
                >
                  {callMode === "voice" ? (
                    <>
                      <Mic className="w-5 h-5" />
                      Start Voice Call
                    </>
                  ) : callMode === "text" ? (
                    <>
                      <MessageSquare className="w-5 h-5" />
                      Start Text Chat
                    </>
                  ) : (
                    <>
                      <Video className="w-5 h-5" />
                      Start Video Call
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (callMode === "video" && status === "connected" && !showAvatarVideo) || status !== "connected" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0B0E14]">
            <div className="text-center space-y-6 max-w-sm px-6">
              {/* Pulsing avatar */}
              <div className="relative mx-auto w-24 h-24">
                <span className="absolute inset-0 rounded-full bg-orange-500/30 animate-ping" />
                <span className="absolute inset-1 rounded-full bg-orange-500/20 animate-pulse" />
                <div className="relative w-24 h-24 rounded-full ring-2 ring-orange-500/40 overflow-hidden bg-gradient-to-br from-orange-500/20 to-orange-600/10 flex items-center justify-center">
                  {status === "connecting" && callMode === "voice" ? (
                    <svg className="w-10 h-10 text-orange-500 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : ((callMode === "voice" ? voiceAvatarImageUrl : avatarImageUrl) ?? undefined) ? (
                    <img
                      src={(callMode === "voice" ? voiceAvatarImageUrl : avatarImageUrl) ?? undefined}
                      alt={resolvedPersonaName ?? avatarNameParam ?? "Avatar"}
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <svg className="w-12 h-12 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" stroke-linejoin="round" strokeWidth={1} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-lg font-semibold text-white">
                  {status === "connecting" && callMode === "voice" ? `Connecting to ${resolvedPersonaName ?? avatarNameParam ?? "voice agent"}` :
                   status === "connecting" ? `Connecting to ${resolvedPersonaName ?? avatarNameParam ?? "avatar"}` :
                   status === "error" ? "Connection failed" :
                   status === "paused" ? "Session paused" :
                   "Ready to practice"}
                </p>
                {resolvedScenarioName && (
                  <p className="text-sm text-muted-foreground">{resolvedScenarioName}</p>
                )}
              </div>

              {/* Animated dots */}
              {status === "connecting" && (
                <div className="flex items-center justify-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Voice Call Panel (when voice mode is active) — 3-column layout */}
        {callMode === "voice" && status === "connected" && (
          <div className="absolute inset-0 flex">
            {/* Left sidebar — seller cheat sheet */}
            <div className="w-72 hidden lg:block shrink-0">
              <VoiceCallSidebar
                sellerCompany={sellerCompany}
                sellerProduct={sellerProduct}
                sellerDescription={sellerDescription}
                contextNote={scenarioContextNote}
                buyerName={resolvedPersonaName}
                buyerRole={resolvedPersonaRole}
                buyerPainPoints={personaDetails.painPoints}
                callSteps={CALL_STEPS}
                currentStep={currentStep}
              />
            </div>

            {/* Center — call panel */}
            <div className="flex-1 min-w-0 relative">
              <VoiceCallPanel
                status={voiceCall.status as VoiceStatus}
                transcript={transcript}
                error={voiceCall.error}
                volume={voiceCall.volume}
                isSpeaking={voiceCall.isSpeaking}
                micMuted={voiceCall.micMuted}
                avatarName={resolvedPersonaName ?? avatarNameParam ?? "Buyer"}
                buyerRole={resolvedPersonaRole ?? undefined}
                buyerCompany={personaDetails.company ?? undefined}
                avatarImageUrl={voiceAvatarImageUrl ?? avatarImageUrl}
                sellerAvatarUrl={sellerAvatarUrl}
                sellerInitials={sellerInitials}
                audioEnergyRef={voiceCall.audioEnergyRef}
                micEnergyRef={voiceCall.micEnergyRef}
                onToggleMic={voiceCall.toggleMic}
                onSetVolume={voiceCall.setVolume}
                onEndCall={handleEnd}
              />
            </div>

            {/* Right sidebar — coaching + nudges */}
            <div className="w-80 hidden lg:block shrink-0">
              <VoiceCallRightSidebar
                coaching={coaching}
                coachingOpen={coachingOpen}
                setCoachingOpen={setCoachingOpen}
                checkpoints={
                  scoringCriteria
                    ? parseCheckpointIds(scoringCriteria).map(({ id, name }) => ({
                        id,
                        name,
                        status: (checkpointStatus[id] ?? "pending") as CheckpointStatus,
                      }))
                    : undefined
                }
              />
            </div>
          </div>
        )}

        {/* Text Chat Panel (when text mode is active) */}
        {callMode === "text" && status === "connected" && (
          <div className="absolute inset-0 flex flex-col bg-[#0B0E14]">
            {/* WhatsApp-style Header */}
            <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-[#111827]">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {avatarImageUrl ? (
                    <img src={avatarImageUrl} alt="" className="w-10 h-10 rounded-full object-cover bg-gray-700" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#111827]" />
                </div>
                <div className="leading-tight">
                  <p className="text-sm font-medium text-white">{resolvedPersonaName ?? "Buyer"}</p>
                  <p className="text-xs text-gray-400">{resolvedPersonaRole ?? "AI Buyer"}</p>
                </div>
              </div>
              <button
                onClick={handleEnd}
                className="flex items-center gap-1 text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
                </svg>
                End
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {transcript.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center space-y-4">
                  {/* Date divider — WhatsApp style */}
                  <div className="bg-[#1E293B]/60 px-4 py-1.5 rounded-lg">
                    <p className="text-[11px] text-gray-400 font-medium">
                      {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-gray-500 text-sm">Start the conversation</p>
                    <p className="text-gray-600 text-xs">Say hi to {resolvedPersonaName ?? "the buyer"}</p>
                  </div>
                </div>
              )}
              {/* Date separator when messages exist */}
              {transcript.length > 0 && (
                <div className="flex justify-center mb-4">
                  <div className="bg-[#1E293B]/60 px-4 py-1 rounded-lg">
                    <p className="text-[11px] text-gray-400 font-medium">Today</p>
                  </div>
                </div>
              )}
              {transcript.map((entry, i) => (
                <div key={i} className={`flex items-end gap-2 ${entry.role === "user" ? "justify-end" : entry.role === "coach" ? "justify-center" : "justify-start"} mb-3`}>
                  {/* Buyer avatar — left side */}
                  {entry.role === "avatar" && (
                    <div className="shrink-0 w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center border border-white/10">
                      {avatarImageUrl ? (
                        <img src={avatarImageUrl} alt={resolvedPersonaName ?? "Buyer"} className="w-full h-full object-cover object-top" />
                      ) : (
                        <span className="text-[10px] text-gray-300 font-semibold">{(resolvedPersonaName ?? "B").slice(0, 1).toUpperCase()}</span>
                      )}
                    </div>
                  )}
                  {entry.role === "coach" ? (
                    <div className="max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed bg-amber-500/10 border border-amber-500/20 text-amber-100 shadow-sm">
                      <p>{entry.text}</p>
                      <p className="text-[10px] text-amber-200/60 mt-1">{entry.time}</p>
                    </div>
                  ) : (
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm leading-relaxed shadow-sm ${
                      entry.role === "user"
                        ? "bg-blue-600 text-white rounded-br-md"
                        : "bg-[#1E293B] text-gray-100 rounded-bl-md"
                    }`}>
                      <p>{entry.text}</p>
                      <div className={`flex items-center gap-1 mt-1 ${entry.role === "user" ? "justify-end" : "justify-start"}`}>
                        <p className={`text-[10px] ${entry.role === "user" ? "text-blue-200" : "text-gray-500"}`}>
                          {entry.time}
                        </p>
                        {entry.role === "user" && (
                          <span className="text-blue-200 text-[10px]">✓✓</span>
                        )}
                      </div>
                    </div>
                  )}
                  {/* Seller avatar — right side */}
                  {entry.role === "user" && (
                    <div className="shrink-0 w-7 h-7 rounded-full overflow-hidden bg-blue-700 flex items-center justify-center border border-white/10">
                      {sellerAvatarUrl ? (
                        <img src={sellerAvatarUrl} alt="You" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] text-white font-semibold">{sellerInitials}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {/* Typing indicator — WhatsApp style */}
              {textLoading && (
                <div className="flex items-end gap-2 justify-start mb-3">
                  <div className="shrink-0 w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center border border-white/10">
                    {avatarImageUrl ? (
                      <img src={avatarImageUrl} alt={resolvedPersonaName ?? "Buyer"} className="w-full h-full object-cover object-top" />
                    ) : (
                      <span className="text-[10px] text-gray-300 font-semibold">{(resolvedPersonaName ?? "B").slice(0, 1).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="bg-[#1E293B] rounded-2xl rounded-bl-md px-5 py-4 shadow-sm min-w-[72px]">
                    <div className="flex gap-1.5 items-center h-5">
                      <div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms", animationDuration: "900ms" }} />
                      <div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "200ms", animationDuration: "900ms" }} />
                      <div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "400ms", animationDuration: "900ms" }} />
                    </div>
                  </div>
                </div>
              )}
              {/* Auto-scroll anchor */}
              <div ref={textMessagesEndRef} />
            </div>

            {/* Input */}
            <div className="shrink-0 p-3 border-t border-white/10 bg-[#111827]">
              <div className="flex items-center gap-2 max-w-2xl mx-auto">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendTextMessage(); } }}
                  placeholder="Type a message…"
                  disabled={textLoading}
                  className="flex-1 bg-white/5 border border-white/10 rounded-full px-5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 disabled:opacity-50"
                />
                <button
                  onClick={sendTextMessage}
                  disabled={textLoading || !textInput.trim()}
                  className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-blue-900/20"
                >
                  {textLoading ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Local Camera PiP */}
        <div className={`absolute bottom-20 right-4 rounded-lg overflow-hidden border border-white/10 shadow-lg transition-all z-10 ${
          cameraOn ? "w-36 h-24 opacity-100" : "w-0 h-0 opacity-0 border-0"
        }`}>
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover bg-black" />
        </div>

        {/* Floating Transcript Panel — video mode only */}
        {callMode === "video" && (
        <div className={`absolute top-3 right-3 bottom-20 w-72 rounded-xl border border-white/10 bg-black/70 backdrop-blur-md flex flex-col transition-all z-10 ${
          transcriptOpen ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 pointer-events-none"
        }`}>
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 shrink-0">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Conversation</p>
            <button onClick={() => setTranscriptOpen(false)} className="text-gray-500 hover:text-white">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 min-h-0">
            {transcript.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-gray-500 text-xs text-center">
                  {status === "connected" ? "Speak to start…" : "Conversation will appear here."}
                </p>
              </div>
            ) : (
              transcript.map((entry, i) => (
                <div key={i} className={`flex flex-col ${entry.role === "user" ? "items-end" : "items-start"}`}>
                  <span className="text-[9px] text-gray-500 mb-0.5 px-1">
                    {entry.role === "user" ? "You" : "Buyer"} · {entry.time}
                  </span>
                  <div className={`max-w-[92%] rounded-xl px-2.5 py-1.5 text-xs leading-relaxed ${
                    entry.role === "user"
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-[#1E293B] text-gray-100 rounded-bl-sm"
                  }`}>
                    {entry.text}
                  </div>
                </div>
              ))
            )}
            <div ref={transcriptEndRef} />
          </div>
        </div>
        )}

        {/* Transcript Toggle — video mode only (voice mode shows transcript in the center panel) */}
        {callMode === "video" && (
          <button
            onClick={() => setTranscriptOpen((o) => !o)}
            className={`absolute top-3 right-3 flex items-center gap-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/15 rounded-full px-3 py-1.5 text-xs font-medium text-white transition-all z-10 ${
              transcriptOpen ? "opacity-0 pointer-events-none" : "opacity-100"
            }`}
            title="View transcript"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z" />
            </svg>
            Transcript
          </button>
        )}

        {/* Coaching Overlay — bottom sheet on mobile, draggable on desktop (hidden in voice mode sidebar) */}
        {status === "connected" && callMode !== "voice" && (
          <DraggableCoaching
            coaching={coaching}
            coachingOpen={coachingOpen}
            setCoachingOpen={setCoachingOpen}
            checkpoints={
              scoringCriteria
                ? parseCheckpointIds(scoringCriteria).map(({ id, name }) => ({
                    id,
                    name,
                    status: (checkpointStatus[id] ?? "pending") as CheckpointStatus,
                  }))
                : undefined
            }
          />
        )}
      </div>

      {/* Floating Control Bar — hidden in voice/text mode when connected (they have their own controls) and hidden in idle (start button is in the profile card) */}
      {status !== "idle" && !(callMode === "voice" && status === "connected") && !(callMode === "text" && status === "connected") && (
        <div className="flex items-center justify-center gap-2 pb-3 pt-1.5 px-4 shrink-0">
          {status === "error" ? (
            <button
              onClick={callMode === "voice" ? startVoice : callMode === "text" ? startText : start}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-3 rounded-full shadow-lg shadow-blue-900/30 transition-all hover:scale-105 active:scale-95"
            >
              {callMode === "voice" ? (
                <>
                  <Mic className="w-5 h-5" />
                  Start Voice Call
                </>
              ) : callMode === "text" ? (
                <>
                  <MessageSquare className="w-5 h-5" />
                  Start Text Chat
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Start Video Call
                </>
              )}
            </button>
          ) : status === "connecting" ? (
            <div className="flex items-center gap-2 bg-orange-500/15 text-orange-400 border border-orange-500/30 px-8 py-3 rounded-full shadow-lg shadow-orange-500/10">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm font-medium">Connecting</span>
            </div>
          ) : status === "paused" ? (
            <div className="flex items-center gap-2">
              <button onClick={start} className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold px-6 py-2.5 rounded-full shadow-lg shadow-green-900/30 transition-all hover:scale-105 active:scale-95">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Resume
              </button>
              <button onClick={handleEnd} className="w-10 h-10 rounded-full bg-red-500/90 text-white flex items-center justify-center hover:bg-red-600 transition-all hover:scale-105 active:scale-95" title="End call">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" /></svg>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={toggleMic} className={`w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
                micOn ? "bg-gray-700/80 text-white" : "bg-red-500/90 text-white"
              }`} title={micOn ? "Mute" : "Unmute"}>
                {micOn ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                )}
              </button>
              <button onClick={toggleCamera} className={`w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
                cameraOn ? "bg-gray-700/80 text-white" : "bg-gray-700/40 text-gray-400"
              }`} title={cameraOn ? "Turn off camera" : "Turn on camera"}>
                {cameraOn ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" /></svg>
                )}
              </button>
              <button onClick={pause} className="w-11 h-11 rounded-full bg-yellow-500/90 text-white flex items-center justify-center hover:bg-yellow-600 transition-all hover:scale-105 active:scale-95" title="Pause session">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </button>
              {callMode === "video" && (
                <button onClick={() => setShowAvatarVideo(v => !v)} className={`w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${showAvatarVideo ? "bg-gray-700/80 text-white" : "bg-gray-700/40 text-gray-400"}`} title={showAvatarVideo ? "Hide avatar video" : "Show avatar video"}>
                  {showAvatarVideo ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.858a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  )}
                </button>
              )}
              <button onClick={handleEnd} className="w-11 h-11 rounded-full bg-red-500/90 text-white flex items-center justify-center hover:bg-red-600 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-red-900/20" title="End call">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" /></svg>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 bg-red-900/90 border border-red-700/50 text-red-200 px-5 py-3 rounded-xl text-sm shadow-xl z-50 backdrop-blur-sm">
          {error}
        </div>
      )}

      {/* Post-call Feedback Modal */}
      {(feedbackLoading || feedback) && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => { setFeedback(null); setFeedbackLoading(false); }}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] bg-[#111827] border border-white/5 rounded-2xl p-5 flex flex-col gap-4 shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with company logo, buyer info, and score */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                {/* Company logo */}
                <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                  {orgLogoUrl ? (
                    <img src={orgLogoUrl} alt={orgName ?? "Company"} className="w-full h-full object-contain p-1" />
                  ) : (
                    <Building2 className="w-6 h-6 text-orange-500" />
                  )}
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-orange-400 font-semibold">MEDDIC Analysis</p>
                  <h2 className="font-semibold text-base text-white">{resolvedScenarioName ?? "Call Review"}</h2>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {feedback && (
                  <span className="text-xl font-bold text-orange-500">
                    {feedback.overall_score}<span className="text-sm text-muted-foreground">/100</span>
                  </span>
                )}
                <button
                  onClick={() => { setFeedback(null); setFeedbackLoading(false); }}
                  className="text-muted-foreground hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            {/* Buyer info card */}
            <div className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/5">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-orange-500/20 to-orange-600/10 ring-1 ring-orange-500/30 shrink-0">
                {(voiceAvatarImageUrl ?? avatarImageUrl) ? (
                  <img src={(voiceAvatarImageUrl ?? avatarImageUrl) ?? undefined} alt={resolvedPersonaName ?? "Buyer"} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-orange-400 text-sm font-semibold">
                    {(resolvedPersonaName ?? "B").slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{resolvedPersonaName ?? "Buyer"}</p>
                <p className="text-xs text-muted-foreground">
                  {resolvedPersonaRole}
                  {resolvedPersonaRole && personaDetails.company && " at "}
                  {personaDetails.company}
                </p>
              </div>
            </div>

            {feedbackLoading && <p className="text-muted-foreground text-sm animate-pulse">Analyzing your call with MEDDIC framework…</p>}
            {feedback && (
              <>
                {feedback.overall_score === 0 && !feedback.strengths?.length && !feedback.weaknesses?.length ? (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground text-sm">Analysis could not be completed.</p>
                    <p className="text-muted-foreground text-xs mt-1">Make sure the conversation has at least 2 turns before ending the call.</p>
                  </div>
                ) : null}
                {feedback.breakdown && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {([
                      { key: "metrics", label: "Metrics" },
                      { key: "economic_buyer", label: "Econ Buyer" },
                      { key: "decision_criteria", label: "Criteria" },
                      { key: "decision_process", label: "Process" },
                      { key: "identify_pain", label: "Pain" },
                      { key: "champion", label: "Champion" },
                    ] as { key: keyof FeedbackResult["breakdown"]; label: string }[]).map(({ key, label }) => {
                      const val = feedback.breakdown[key];
                      return (
                        <div key={key} className="bg-white/5 rounded-lg p-2.5 flex flex-col gap-1.5 border border-white/5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
                            <span className="text-xs font-bold text-orange-500">{val}</span>
                          </div>
                          <div className="h-1 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-orange-500" style={{ width: `${val}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {feedback.strengths?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] text-orange-400 font-semibold uppercase tracking-wide">Strengths</p>
                      {feedback.strengths.map((s, i) => (
                        <p key={i} className="text-xs text-muted-foreground ml-1 flex items-start gap-1.5">
                          <span className="text-orange-500 mt-0.5">•</span>
                          <span>{s}</span>
                        </p>
                      ))}
                    </div>
                  )}
                  {feedback.weaknesses?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] text-orange-300 font-semibold uppercase tracking-wide">Weaknesses</p>
                      {feedback.weaknesses.map((w, i) => (
                        <p key={i} className="text-xs text-muted-foreground ml-1 flex items-start gap-1.5">
                          <span className="text-orange-300 mt-0.5">•</span>
                          <span>{w}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                {feedback.missed_opportunities?.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-orange-500 font-semibold uppercase tracking-wide">Missed Opportunities</p>
                    {feedback.missed_opportunities.map((m, i) => (
                      <p key={i} className="text-xs text-muted-foreground ml-1 flex items-start gap-1.5">
                        <span className="text-orange-500 mt-0.5">•</span>
                        <span>{m}</span>
                      </p>
                    ))}
                  </div>
                )}
                {feedback.coaching_recommendations?.length > 0 && (
                  <div className="bg-orange-950/20 border border-orange-500/20 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-orange-400 font-semibold uppercase tracking-wide mb-1">Coaching</p>
                    {feedback.coaching_recommendations.map((r, i) => (
                      <p key={i} className="text-xs text-foreground ml-1 flex items-start gap-1.5">
                        <span className="text-orange-400 mt-0.5">•</span>
                        <span>{r}</span>
                      </p>
                    ))}
                  </div>
                )}
                {feedback.coaching_moments && feedback.coaching_moments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-orange-400 font-semibold uppercase tracking-wide">Key Moments</p>
                    {feedback.coaching_moments!.map((m, i) => (
                      <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-2.5 space-y-1.5">
                        <div className="space-y-0.5">
                          <p className="text-[10px] text-muted-foreground">Buyer said:</p>
                          <p className="text-xs italic text-muted-foreground">&ldquo;{m.buyer_quote}&rdquo;</p>
                        </div>
                        <p className="text-[10px] text-orange-400">Signal: {m.signal}</p>
                        <div className="space-y-0.5">
                          <p className="text-[10px] text-orange-400">You should have said:</p>
                          <p className="text-xs bg-orange-500/10 border border-orange-500/20 rounded-md px-2 py-1 text-foreground">{m.what_they_should_have_said}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default function HeyGenTestPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0B0E14]" />}>
      <HeyGenTestInner />
    </Suspense>
  );
}
