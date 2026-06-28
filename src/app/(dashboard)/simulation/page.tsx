"use client";

import { useRef, useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Room, RoomEvent, Track } from "livekit-client";
import { createClient } from "@/lib/supabase/client";
import { useVoiceCall, VoiceStatus, VOICE_LANGUAGE_MAP, VoiceLanguage } from "@/hooks/useVoiceCall";
import { useCoaching } from "@/hooks/useCoaching";
import { VoiceCallPanel } from "@/components/VoiceCallPanel";
import { CoachingOverlay } from "@/components/CoachingOverlay";
import { Video, Mic, MessageSquare, Send, Globe } from "lucide-react";

type Status = "idle" | "connecting" | "connected" | "paused" | "error";

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
  role: "avatar" | "user";
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
  const searchParams = useSearchParams();
  const scenarioId = searchParams.get("scenarioId") ?? undefined;
  const scenarioTable = searchParams.get("scenarioTable") ?? undefined;
  const avatarId = searchParams.get("avatarId") ?? undefined;
  const voiceId = searchParams.get("voiceId") ?? undefined;
  const scenarioNameParam = searchParams.get("scenarioName") ?? undefined;
  const avatarNameParam = searchParams.get("avatarName") ?? undefined;

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
  const [resolvedPersonaName, setResolvedPersonaName] = useState<string | null>(null);
  const [resolvedPersonaRole, setResolvedPersonaRole] = useState<string | null>(null);
  const [sellerInitials, setSellerInitials] = useState("U");
  const [sellerAvatarUrl, setSellerAvatarUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [feedback, setFeedback] = useState<FeedbackResult | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [avatarImageUrl, setAvatarImageUrl] = useState<string | null>(null);

  // Call mode + coaching state
  const [callMode, setCallMode] = useState<"video" | "voice" | "text">("video");
  const [showAvatarVideo, setShowAvatarVideo] = useState(true); // toggle avatar video visibility
  const [voiceSessionId, setVoiceSessionId] = useState<string | null>(null);
  const [textSessionId, setTextSessionId] = useState<string | null>(null);
  const [textInput, setTextInput] = useState("");
  const [textLoading, setTextLoading] = useState(false);
  const [coachingOpen, setCoachingOpen] = useState(false);
  const [scoringCriteria, setScoringCriteria] = useState<string | null>(null);
  const [checkpointStatus, setCheckpointStatus] = useState<Record<string, CheckpointStatus>>({});
  const voiceCall = useVoiceCall();
  const coaching = useCoaching();

  // Voice selector (ElevenLabs voices)
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("21m00Tcm4TlvDq8ikWAM");
  const [selectedVoiceLanguage, setSelectedVoiceLanguage] = useState<VoiceLanguage>("auto");
  const voiceOptions = [
    { id: "21m00Tcm4TlvDq8ikWAM", label: "Rachel — Warm & Natural" },
    { id: "TxGEqnHWrfWFTfGW9XjX", label: "Josh — Deep & Authoritative" },
    { id: "ErXwobaYiN019PkySvjV", label: "Antoni — Calm & Thoughtful" },
    { id: "MF3mGyEYCl7XYWbV9V6O", label: "Elli — Young & Energetic" },
    { id: "EXAVITQu4vr4xnSDxMaL", label: "Sarah — Soft & Expressive" },
    { id: "pNInz6obpgDQGcFmaJgB", label: "Adam — Professional & Neutral" },
    { id: "XB0fDUnXU5powFXSHcV", label: "Bella — Professional & Calm" },
  ];
  const coachingAnalyzeRef = useRef(coaching.analyze);

  // Live nudge bubbles — ephemeral coaching feedback after each turn
  const [liveNudge, setLiveNudge] = useState<{ message: string; type: "success" | "info" | "warning" } | null>(null);
  const nudgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [nudgePos, setNudgePos] = useState<{ x: number; y: number }>({ x: 16, y: 16 });
  const [isDraggingNudge, setIsDraggingNudge] = useState(false);
  const nudgeDragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const nudgeContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!coaching.lastTurnResult || status !== "connected") return;
    const update = coaching.lastTurnResult;

    let nudge: { message: string; type: "success" | "info" | "warning" } | null = null;

    if (update.stepCompleted) {
      nudge = { message: "Good job! You advanced the conversation.", type: "success" };
    } else if (update.uncoveredFact) {
      nudge = { message: `Insight uncovered: ${update.uncoveredFact}`, type: "info" };
    } else if (update.newSuggestion) {
      nudge = { message: `Try: ${update.newSuggestion.slice(0, 100)}${update.newSuggestion.length > 100 ? "…" : ""}`, type: "warning" };
    }

    if (nudge) {
      setLiveNudge(nudge);
      setNudgePos({ x: 0, y: 16 });
      if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
      nudgeTimerRef.current = setTimeout(() => setLiveNudge(null), 6000);
    }

    return () => {
      if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
    };
  }, [coaching.lastTurnResult, status]);

  const moveNudge = useCallback((clientX: number, clientY: number) => {
    if (!nudgeContainerRef.current) return;
    const parent = nudgeContainerRef.current.offsetParent as HTMLElement | null;
    const parentRect = parent?.getBoundingClientRect() ?? { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    let x = clientX - parentRect.left - nudgeDragStartRef.current.x;
    let y = clientY - parentRect.top - nudgeDragStartRef.current.y;
    const nudgeRect = nudgeContainerRef.current.getBoundingClientRect();
    x = Math.max(0, Math.min(x, parentRect.width - nudgeRect.width));
    y = Math.max(0, Math.min(y, parentRect.height - nudgeRect.height));
    setNudgePos({ x, y });
  }, []);

  const onNudgeMouseDown = useCallback((e: React.MouseEvent) => {
    if (!nudgeContainerRef.current) return;
    setIsDraggingNudge(true);
    const rect = nudgeContainerRef.current.getBoundingClientRect();
    nudgeDragStartRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const onNudgeMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingNudge) return;
    moveNudge(e.clientX, e.clientY);
  }, [isDraggingNudge, moveNudge]);

  const onNudgeMouseUp = useCallback(() => {
    setIsDraggingNudge(false);
  }, []);

  const onNudgeTouchStart = useCallback((e: React.TouchEvent) => {
    if (!nudgeContainerRef.current) return;
    setIsDraggingNudge(true);
    const touch = e.touches[0];
    const rect = nudgeContainerRef.current.getBoundingClientRect();
    nudgeDragStartRef.current = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  }, []);

  const onNudgeTouchMove = useCallback((e: TouchEvent) => {
    if (!isDraggingNudge) return;
    const touch = e.touches[0];
    moveNudge(touch.clientX, touch.clientY);
  }, [isDraggingNudge, moveNudge]);

  const onNudgeTouchEnd = useCallback(() => {
    setIsDraggingNudge(false);
  }, []);

  useEffect(() => {
    if (!isDraggingNudge) return;
    document.addEventListener("mousemove", onNudgeMouseMove);
    document.addEventListener("mouseup", onNudgeMouseUp);
    document.addEventListener("touchmove", onNudgeTouchMove);
    document.addEventListener("touchend", onNudgeTouchEnd);
    return () => {
      document.removeEventListener("mousemove", onNudgeMouseMove);
      document.removeEventListener("mouseup", onNudgeMouseUp);
      document.removeEventListener("touchmove", onNudgeTouchMove);
      document.removeEventListener("touchend", onNudgeTouchEnd);
    };
  }, [isDraggingNudge, onNudgeMouseMove, onNudgeMouseUp, onNudgeTouchMove, onNudgeTouchEnd]);

  // Position the nudge on the left when it first appears
  useEffect(() => {
    if (!liveNudge || !nudgeContainerRef.current) return;
    setNudgePos({ x: 16, y: 16 });
  }, [liveNudge]);
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

  const addTranscript = useCallback((role: "avatar" | "user", text: string, emotion?: string, intent?: string) => {
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

  const start = useCallback(async () => {
    const isResume = resumeTimeLeftRef.current !== null;
    setStatus("connecting");
    setError(null);
    if (!isResume) {
      setTranscript([]);
      setFeedback(null);
      transcriptRef.current = [];
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
    addLog("Starting voice call session…");
    coaching.reset();
    setCheckpointStatus({});

    try {
      const res = await fetch("/api/simulation/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId, scenarioTable, callMode: "voice" }),
      });
      const data = await res.json();
      if (!res.ok || !data.session) throw new Error(data.error ?? "Failed to create session");

      const session = data.session;
      setVoiceSessionId(session.id);
      setResolvedScenarioName(session.scenario_name ?? resolvedScenarioName);
      addLog(`✅ Voice session: ${session.id}`);

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
      voiceCall.start(session.id, selectedVoiceId, selectedVoiceLanguage);
      addLog("🎙️ Voice call started");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setStatus("error");
      addLog("❌ " + msg);
    }
  }, [addLog, scenarioId, scenarioTable, resolvedScenarioName, voiceCall, coaching, selectedVoiceId, selectedVoiceLanguage]);

  // Text chat start — creates a simulation session for typed conversation
  const startText = useCallback(async () => {
    setStatus("connecting");
    setError(null);
    setTranscript([]);
    setFeedback(null);
    transcriptRef.current = [];
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
        fetch("/api/simulation/coach-turn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, sellerText: message, buyerText: buyerMsg }),
        }).then((r) => r.json()).then((result) => {
          if (result.fallback || result.error || !result.quality || !result.nudge) return;
          const nudgeType: "success" | "info" | "warning" =
            result.quality === "good" ? "success" : result.quality === "warning" ? "warning" : "info";
          const label = result.checkpoint_hit ? `${result.checkpoint_hit}: ` : "";
          setLiveNudge({ message: `${label}${result.nudge}`, type: nudgeType });
          if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
          nudgeTimerRef.current = setTimeout(() => setLiveNudge(null), 8000);
          if (result.checkpoint_hit) {
            setCheckpointStatus((prev) => ({ ...prev, [result.checkpoint_hit]: result.quality === "good" ? "hit" : "warning" }));
          }
          if (result.already_covered?.length) {
            setCheckpointStatus((prev) => {
              const updated = { ...prev };
              for (const cp of result.already_covered) {
                if (!updated[cp]) updated[cp] = "hit";
              }
              return updated;
            });
          }
        }).catch(() => {});
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      addLog("❌ Text turn failed: " + msg);
    } finally {
      setTextLoading(false);
    }
  }, [textInput, textSessionId, textLoading, addTranscript, addLog, coachingAnalyzeRef]);

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
    voiceCall.togglePause();
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
            console.error("[handleEnd] voice coach failed:", coachRes.status, coachErr);
            addLog("⚠️ Coaching analysis failed: " + (coachErr.error || coachRes.status));
          }

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
          .select("seller_company, seller_product, custom_persona, context_note, preset_persona_id, scenario_type, scoring_criteria")
          .eq("id", scenarioId)
          .single();
        if (scenario) {
          const persona = scenario.custom_persona as any;
          setResolvedPersonaName(persona?.name ?? null);
          setResolvedPersonaRole(persona?.jobTitle ?? null);

          coaching.setScenarioContext({
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
        }
      } catch { /* ignore */ }
    };
    load();
  }, [scenarioId, scenarioTable, coaching]);

  // Sync voice call transcripts into the page transcript (shows in Conversation modal)
  // AI/buyer messages are delayed until the avatar finishes speaking so it feels natural.
  useEffect(() => {
    if (callMode !== "voice" || voiceCall.transcript.length === 0) return;
    const last = voiceCall.transcript[voiceCall.transcript.length - 1];
    const pageRole = last.role === "buyer" ? "avatar" : "user";
    const alreadyHas = transcript.length > 0 && transcript[transcript.length - 1].text === last.text;
    if (alreadyHas) return;
    if (last.role === "buyer" && voiceCall.isSpeaking) return;
    addTranscript(pageRole, last.text, last.emotion, last.intent);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceCall.transcript, voiceCall.isSpeaking, callMode]);

  // Analyze turns for coaching (both video and voice modes)
  useEffect(() => {
    if (callMode === "voice") {
      if (voiceCall.transcript.length === 0) return;
      const lastTwo = voiceCall.transcript.slice(-2);
      const sellerEntry = lastTwo.find((t) => t.role === "user");
      const buyerEntry = lastTwo.find((t) => t.role === "buyer");
      if (sellerEntry && buyerEntry) {
        coachingAnalyzeRef.current(sellerEntry.text, buyerEntry.text);
        if (voiceSessionId) {
          fetch("/api/simulation/coach-turn", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: voiceSessionId, sellerText: sellerEntry.text, buyerText: buyerEntry.text }),
          }).then((r) => r.json()).then((result) => {
            if (result.fallback || result.error || !result.quality || !result.nudge) return;
            const nudgeType: "success" | "info" | "warning" =
              result.quality === "good" ? "success" : result.quality === "warning" ? "warning" : "info";
            const label = result.checkpoint_hit ? `${result.checkpoint_hit}: ` : "";
            setLiveNudge({ message: `${label}${result.nudge}`, type: nudgeType });
            if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
            nudgeTimerRef.current = setTimeout(() => setLiveNudge(null), 8000);
            if (result.checkpoint_hit) {
              setCheckpointStatus((prev) => ({ ...prev, [result.checkpoint_hit]: result.quality === "good" ? "hit" : "warning" }));
            }
            if (result.already_covered?.length) {
              setCheckpointStatus((prev) => {
                const updated = { ...prev };
                for (const cp of result.already_covered) {
                  if (!updated[cp]) updated[cp] = "hit";
                }
                return updated;
              });
            }
          }).catch(() => {});
        }
      }
    } else {
      // Video mode: use main transcript (role is "avatar" for buyer)
      if (transcript.length === 0) return;
      const lastTwo = transcript.slice(-2);
      const sellerEntry = lastTwo.find((t) => t.role === "user");
      const buyerEntry = lastTwo.find((t) => t.role === "avatar");
      if (sellerEntry && buyerEntry) {
        coachingAnalyzeRef.current(sellerEntry.text, buyerEntry.text);
        const videoSessionId = simSessionDbIdRef.current;
        if (videoSessionId) {
          fetch("/api/simulation/coach-turn", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: videoSessionId, sellerText: sellerEntry.text, buyerText: buyerEntry.text }),
          }).then((r) => r.json()).then((result) => {
            if (result.fallback || result.error || !result.quality || !result.nudge) return;
            const nudgeType: "success" | "info" | "warning" =
              result.quality === "good" ? "success" : result.quality === "warning" ? "warning" : "info";
            const label = result.checkpoint_hit ? `${result.checkpoint_hit}: ` : "";
            setLiveNudge({ message: `${label}${result.nudge}`, type: nudgeType });
            if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
            nudgeTimerRef.current = setTimeout(() => setLiveNudge(null), 8000);
            if (result.checkpoint_hit) {
              setCheckpointStatus((prev) => ({ ...prev, [result.checkpoint_hit]: result.quality === "good" ? "hit" : "warning" }));
            }
            if (result.already_covered?.length) {
              setCheckpointStatus((prev) => {
                const updated = { ...prev };
                for (const cp of result.already_covered) {
                  if (!updated[cp]) updated[cp] = "hit";
                }
                return updated;
              });
            }
          }).catch(() => {});
        }
      }
    }
  }, [voiceCall.transcript, transcript, callMode]);

  // Sync VoiceCallPanel pause/resume with page-level status and timer
  useEffect(() => {
    if (callMode !== "voice") return;
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

  // Cleanup on unmount
  useEffect(() => () => { stop(); }, [stop]);

  return (
    <div className="h-full bg-[#0B0E14] text-white flex flex-col overflow-hidden -m-4 lg:-m-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-[#0B0E14]/90 backdrop-blur-sm z-20 shrink-0">
        <div className="flex items-center gap-2.5">
          <p className="text-sm font-semibold leading-none">
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

        {/* Avatar image shown when video is hidden or not connected */}
        {(callMode === "video" && status === "connected" && !showAvatarVideo) || status !== "connected" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0B0E14]">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-full mx-auto ring-1 ring-white/10 overflow-hidden bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                {avatarImageUrl ? (
                  <img src={avatarImageUrl} alt={resolvedPersonaName ?? avatarNameParam ?? "Avatar"} className="w-full h-full object-cover object-top" />
                ) : (
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-gray-300 font-medium">
                  {status === "connecting" ? `Connecting to ${resolvedPersonaName ?? avatarNameParam ?? "avatar"}…` :
                   status === "error" ? "Connection failed" :
                   status === "paused" ? "Session paused" :
                   "Ready to practice"}
                </p>
                {resolvedScenarioName && (
                  <p className="text-xs text-gray-500 mt-1">{resolvedScenarioName}</p>
                )}
              </div>
              {/* Mode Toggle when idle */}
              {status === "idle" && (
                <div className="flex items-center justify-center gap-2 bg-white/5 rounded-full p-1 border border-white/10">
                  <button
                    onClick={() => setCallMode("video")}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-colors ${
                      callMode === "video" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    Video Call
                  </button>
                  <button
                    onClick={() => setCallMode("voice")}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-colors ${
                      callMode === "voice" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" />
                    Voice Call
                  </button>
                  <button
                    onClick={() => setCallMode("text")}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-colors ${
                      callMode === "text" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Text Chat
                  </button>
                </div>
              )}
              {/* Voice Selector — shown in voice mode when idle */}
              {status === "idle" && callMode === "voice" && (
                <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 border border-white/10">
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  <div className="relative">
                    <select
                      value={selectedVoiceId}
                      onChange={(e) => setSelectedVoiceId(e.target.value)}
                      className="appearance-none bg-transparent text-xs text-gray-300 focus:outline-none cursor-pointer pr-5 min-w-[180px]"
                      style={{ colorScheme: "dark" }}
                    >
                      {voiceOptions.map((v) => (
                        <option key={v.id} value={v.id} className="bg-[#111827] text-gray-200">
                          {v.label}
                        </option>
                      ))}
                    </select>
                    <svg className="w-3 h-3 text-gray-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              )}
              {/* Language Selector — shown in voice mode when idle */}
              {status === "idle" && callMode === "voice" && (
                <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 border border-white/10">
                  <Globe className="w-3.5 h-3.5 text-gray-400" />
                  <div className="relative">
                    <select
                      value={selectedVoiceLanguage}
                      onChange={(e) => setSelectedVoiceLanguage(e.target.value as VoiceLanguage)}
                      className="appearance-none bg-transparent text-xs text-gray-300 focus:outline-none cursor-pointer pr-5 min-w-[140px]"
                      style={{ colorScheme: "dark" }}
                    >
                      {Object.entries(VOICE_LANGUAGE_MAP).map(([key, { label }]) => (
                        <option key={key} value={key} className="bg-[#111827] text-gray-200">
                          {label}
                        </option>
                      ))}
                    </select>
                    <svg className="w-3 h-3 text-gray-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Voice Call Panel (when voice mode is active) */}
        {callMode === "voice" && status === "connected" && (
          <div className="absolute inset-0">
            <VoiceCallPanel
              status={voiceCall.status as VoiceStatus}
              transcript={transcript}
              error={voiceCall.error}
              volume={voiceCall.volume}
              isSpeaking={voiceCall.isSpeaking}
              micMuted={voiceCall.micMuted}
              avatarName={resolvedPersonaName ?? avatarNameParam ?? "Buyer"}
              avatarImageUrl={avatarImageUrl}
              sellerAvatarUrl={sellerAvatarUrl}
              sellerInitials={sellerInitials}
              audioEnergyRef={voiceCall.audioEnergyRef}
              micEnergyRef={voiceCall.micEnergyRef}
              onToggleMic={voiceCall.toggleMic}
              onTogglePause={voiceCall.togglePause}
              onSetVolume={voiceCall.setVolume}
              onEndCall={handleEnd}
            />
          </div>
        )}

        {/* Live Nudge — compact floating pill, draggable */}
        {liveNudge && status === "connected" && (
          <div
            ref={nudgeContainerRef}
            onMouseDown={onNudgeMouseDown}
            onTouchStart={onNudgeTouchStart}
            className={`absolute z-30 max-w-xs w-auto animate-in fade-in zoom-in-95 duration-200 ${
              isDraggingNudge ? "cursor-grabbing" : "cursor-grab"
            }`}
            style={{ left: nudgePos.x, top: nudgePos.y }}
          >
            <div
              className={`rounded-full pl-2 pr-1 py-1.5 shadow-lg border flex items-center gap-2 backdrop-blur-md ${
                liveNudge.type === "success"
                  ? "bg-emerald-950/80 border-emerald-500/30 text-emerald-100"
                  : liveNudge.type === "warning"
                  ? "bg-amber-950/80 border-amber-500/30 text-amber-100"
                  : "bg-[#0B1220]/90 border-blue-500/30 text-blue-100"
              }`}
            >
              <div className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center">
                {liveNudge.type === "success" ? (
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : liveNudge.type === "warning" ? (
                  <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.054 0 1.666-1.151 1.048-1.973l-6.928-10.003c-.624-.898-1.944-.898-2.568 0L4.014 17.027c-.618.822-.006 1.973 1.048 1.973z" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0 px-1">
                <p className="text-xs font-medium leading-snug">{liveNudge.message}</p>
              </div>
              <button
                onClick={() => setLiveNudge(null)}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
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
                <div key={i} className={`flex items-end gap-2 ${entry.role === "user" ? "justify-end" : "justify-start"} mb-3`}>
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

        {/* Coaching Overlay — bottom sheet on mobile, draggable on desktop */}
        {status === "connected" && (
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

      {/* Floating Control Bar — hidden in voice/text mode when connected (they have their own controls) */}
      {!(callMode === "voice" && status === "connected") && !(callMode === "text" && status === "connected") && (
        <div className="flex items-center justify-center gap-2 pb-3 pt-1.5 px-4 shrink-0">
          {status === "idle" || status === "error" ? (
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
            <div className="flex items-center gap-2 bg-gray-700/50 text-gray-400 px-8 py-3 rounded-full">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Connecting…
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
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-base">MEDDIC Analysis</h2>
              <div className="flex items-center gap-3">
                {feedback && (
                  <span className={`text-xl font-bold ${
                    feedback.overall_score >= 70 ? "text-green-400" : feedback.overall_score >= 40 ? "text-yellow-400" : "text-red-400"
                  }`}>{feedback.overall_score}<span className="text-sm text-gray-500">/100</span></span>
                )}
                <button
                  onClick={() => { setFeedback(null); setFeedbackLoading(false); }}
                  className="text-gray-500 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            {feedbackLoading && <p className="text-gray-400 text-sm animate-pulse">Analyzing your call with MEDDIC framework…</p>}
            {feedback && (
              <>
                {feedback.breakdown && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                        <div key={key} className="bg-gray-800/40 rounded-lg p-2 flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-400 font-medium">{label}</span>
                            <span className={`text-xs font-bold ${val >= 70 ? "text-green-400" : val >= 40 ? "text-yellow-400" : "text-red-400"}`}>{val}</span>
                          </div>
                          <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${val >= 70 ? "bg-green-500" : val >= 40 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${val}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {feedback.strengths?.length > 0 && (
                    <div>
                      <p className="text-[10px] text-green-400 font-semibold uppercase tracking-wide mb-1">Strengths</p>
                      {feedback.strengths.map((s, i) => <p key={i} className="text-xs text-gray-300 ml-1">• {s}</p>)}
                    </div>
                  )}
                  {feedback.weaknesses?.length > 0 && (
                    <div>
                      <p className="text-[10px] text-yellow-400 font-semibold uppercase tracking-wide mb-1">Weaknesses</p>
                      {feedback.weaknesses.map((w, i) => <p key={i} className="text-xs text-gray-300 ml-1">• {w}</p>)}
                    </div>
                  )}
                </div>
                {feedback.missed_opportunities?.length > 0 && (
                  <div>
                    <p className="text-[10px] text-orange-400 font-semibold uppercase tracking-wide mb-1">Missed Opportunities</p>
                    {feedback.missed_opportunities.map((m, i) => <p key={i} className="text-xs text-gray-300 ml-1">• {m}</p>)}
                  </div>
                )}
                {feedback.coaching_recommendations?.length > 0 && (
                  <div className="bg-blue-950/30 border border-blue-700/30 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-blue-400 font-semibold uppercase tracking-wide mb-1">Coaching</p>
                    {feedback.coaching_recommendations.map((r, i) => <p key={i} className="text-xs text-gray-200 ml-1">• {r}</p>)}
                  </div>
                )}
                {feedback.coaching_moments && feedback.coaching_moments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-violet-400 font-semibold uppercase tracking-wide">Key Moments</p>
                    {feedback.coaching_moments!.map((m, i) => (
                      <div key={i} className="bg-gray-800/30 border border-gray-700/30 rounded-lg p-2 space-y-1.5">
                        <div className="space-y-0.5">
                          <p className="text-[10px] text-gray-500">Buyer said:</p>
                          <p className="text-xs italic text-gray-300">&ldquo;{m.buyer_quote}&rdquo;</p>
                        </div>
                        <p className="text-[10px] text-amber-400">Signal: {m.signal}</p>
                        <div className="space-y-0.5">
                          <p className="text-[10px] text-emerald-400">You should have said:</p>
                          <p className="text-xs bg-emerald-900/20 border border-emerald-700/20 rounded-md px-2 py-1 text-gray-200">{m.what_they_should_have_said}</p>
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

      {/* Debug Log */}
      <div className="absolute bottom-14 left-3 z-10">
        <button
          onClick={() => setLogOpen((o) => !o)}
          className="text-[9px] text-gray-600 hover:text-gray-400 uppercase tracking-wide flex items-center gap-1 transition-colors"
        >
          {logOpen ? "▼" : "▶"} Debug
        </button>
        {logOpen && (
          <div className="bg-gray-900/90 border border-gray-800 rounded-lg p-2 h-24 w-64 overflow-y-auto font-mono text-[9px] text-gray-300 flex flex-col gap-0.5">
            {log.length === 0 && <span className="text-gray-600">Waiting…</span>}
            {log.map((l, i) => (
              <span key={i} className={l.includes("❌") ? "text-red-400" : l.includes("✅") ? "text-green-300" : ""}>{l}</span>
            ))}
          </div>
        )}
      </div>
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
