"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { mockPersonas } from "@/lib/data/mockData";
import { useHeyGen } from "@/hooks/useHeyGen";
import { CustomScenario } from "@/types";
import { SimulationSession, SimulationMessage, SimulationState } from "@/types/simulation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Mic,
  MicOff,
  Square,
  Timer,
  Loader2,
  Radio,
  TrendingUp,
  Brain,
  AlertCircle,
  VideoOff,
  Pencil,
  User,
  CheckCircle2,
  BarChart3,
  X,
  Pause,
  Play,
  Lock,
  MoreHorizontal,
  BarChart2,
  Keyboard,
  SendHorizontal,
} from "lucide-react";

const AVATAR_ID = process.env.NEXT_PUBLIC_LIVEAVATAR_AVATAR_ID ?? "";
const VOICE_ID = process.env.NEXT_PUBLIC_LIVEAVATAR_VOICE_ID ?? "";

function formatTimer(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function TrustBar({ value }: { value: number }) {
  const color = value >= 70 ? "bg-emerald-500" : value >= 40 ? "bg-blue-500" : "bg-red-500";
  return (
    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
      <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${value}%` }} />
    </div>
  );
}

function MoodDot({ mood }: { mood: number }) {
  const label = mood > 3 ? "Engaged" : mood < -3 ? "Frustrated" : "Neutral";
  const color = mood > 3 ? "bg-emerald-500" : mood < -3 ? "bg-red-500" : "bg-amber-500";
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={cn("w-2 h-2 rounded-full", color)} />
      {label}
    </span>
  );
}

export default function SimulationCallPage() {
  const { id: scenarioId } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const scenarioTable = searchParams.get("table") ?? "custom_scenarios";
  const router = useRouter();

  const [scenario, setScenario] = useState<CustomScenario | null>(null);
  const [session, setSession] = useState<SimulationSession | null>(null);
  const [messages, setMessages] = useState<SimulationMessage[]>([]);
  const [state, setState] = useState<SimulationState | null>(null);
  const [input, setInput] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [avatarEnabled, setAvatarEnabled] = useState(true);
  const [showEndModal, setShowEndModal] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedBeforePause, setElapsedBeforePause] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasSpoken, setHasSpoken] = useState(false);

  const [selfCamEnabled, setSelfCamEnabled] = useState(false);
  const [showPersonaPanel, setShowPersonaPanel] = useState(false);
  const [showNotesPanel, setShowNotesPanel] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [responseMode, setResponseMode] = useState<"voice" | "text">("voice");
  const scrollRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const autoMicRef = useRef(false); // tracks whether continuous mic mode is active
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const heygen = useHeyGen({
    onConnected: () => console.log("HeyGen connected"),
    onDisconnected: () => console.log("HeyGen disconnected"),
    onError: (err) => {
      console.warn("HeyGen error:", err);
      setAvatarEnabled(false);
    },
  });
  const heygenStatus = heygen.status;
  const heygenAttachVideo = heygen.attachVideo;

  const toggleSelfCam = useCallback(async () => {
    if (selfCamEnabled) {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setSelfCamEnabled(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        localStreamRef.current = stream;
        setSelfCamEnabled(true); // video element mounts on next render
      } catch {
        alert("Camera access denied. Please allow camera access in your browser.");
      }
    }
  }, [selfCamEnabled]);

  // Attach stream to video element after it mounts
  useEffect(() => {
    if (selfCamEnabled && localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
    if (!selfCamEnabled && localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  }, [selfCamEnabled]);

  useEffect(() => {
    async function boot() {
      try {
        const supabase = createClient();

        // Fetch scenario + create session in parallel
        const [scResult, startRes] = await Promise.all([
          supabase.from(scenarioTable).select("*").eq("id", scenarioId).single(),
          fetch("/api/simulation/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scenarioId, scenarioTable }),
          }),
        ]);

        if (!scResult.data) throw new Error("Scenario not found");
        if (!startRes.ok) throw new Error(await startRes.text());

        const { session: newSession } = await startRes.json();
        setScenario(scResult.data as CustomScenario);
        setSession(newSession);
        setState(newSession.state);

        // Release UI immediately — avatar connects in background
        setLoading(false);

        if (avatarEnabled && AVATAR_ID) {
          heygen.initialize(newSession.id, AVATAR_ID, VOICE_ID || undefined, scenarioId, scenarioTable)
            .catch((err) => console.warn("[Simulation] Avatar init failed:", err));
        } else if (avatarEnabled && !AVATAR_ID) {
          console.warn("[Simulation] Avatar skipped: NEXT_PUBLIC_LIVEAVATAR_AVATAR_ID not set");
        }
      } catch (err) {
        setInitError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      }
    }

    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => { localStreamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, []);

  useEffect(() => {
    if (isPaused) return;
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPaused]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  const startRecognition = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript: string = event.results[0]?.[0]?.transcript ?? "";
      if (transcript) {
        setHasSpoken(true);
        sendMessageRef.current?.(transcript);
      }
    };

    recognition.onend = () => { setIsListening(false); heygen.sendListening(false); };
    recognition.onerror = () => { setIsListening(false); heygen.sendListening(false); };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    heygen.sendListening(true);
  }, [heygen]);

  // Keep a stable ref to sendMessage to avoid stale closures in recognition callbacks
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sendMessageRef = useRef<((text: string) => void) | null>(null);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !session || sending) return;
    setSending(true);
    setInput("");
    // Stop mic immediately — prevent avatar speech from being picked up as user input
    recognitionRef.current?.stop();
    setIsListening(false);

    const userMsg: SimulationMessage = {
      id: crypto.randomUUID(),
      session_id: session.id,
      role: "user",
      content: text.trim(),
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("/api/simulation/turn/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, message: text.trim() }),
      });
      if (!res.ok || !res.body) throw new Error(await res.text());

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let buyerMsgContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "sentence") {
              // Enqueue immediately — TTS starts on first sentence while rest is generating
              if (avatarEnabled && heygen.status === "connected") {
                heygen.speakQueued(event.text);
              }
            } else if (event.type === "done") {
              buyerMsgContent = event.buyerMessage ?? "";
              setState(event.state);
              setMessages((prev) => [
                ...prev.filter((m) => m.id !== userMsg.id),
                userMsg,
                {
                  id: crypto.randomUUID(),
                  session_id: session.id,
                  role: "buyer",
                  content: buyerMsgContent,
                  emotion: event.emotion,
                  intent: event.intent,
                  created_at: new Date().toISOString(),
                },
              ]);
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[sendMessage]", err);
      setSendError(msg.slice(0, 200));
      setTimeout(() => setSendError(null), 5000);
    } finally {
      setSending(false);
      heygen.sendListening(false);
      // Auto-restart mic only after avatar finishes speaking (heygen.status returns to "connected")
      if (autoMicRef.current) {
        const waitForIdle = () => {
          if (heygen.status !== "speaking") {
            setTimeout(() => { if (autoMicRef.current) startRecognition(); }, 300);
          } else {
            setTimeout(waitForIdle, 200);
          }
        };
        waitForIdle();
      }
    }
  }, [session, sending, heygen, avatarEnabled, startRecognition]);

  // Keep ref in sync so recognition callbacks always call the latest sendMessage
  useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

  // Auto-start continuous mic in voice mode once the session is ready
  useEffect(() => {
    if (!session || responseMode !== "voice") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) return;
    if (!autoMicRef.current) {
      autoMicRef.current = true;
      setTimeout(() => startRecognition(), 800);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Pre-warm browser TTS voices on mount so getVoices() is populated when needed
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const load = () => window.speechSynthesis.getVoices();
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  const switchResponseMode = useCallback((mode: "voice" | "text") => {
    setResponseMode(mode);
    if (mode === "text") {
      autoMicRef.current = false;
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      autoMicRef.current = true;
      setTimeout(() => startRecognition(), 200);
    }
  }, [startRecognition]);

  const toggleMic = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition is not supported. Please use Chrome."); return; }

    if (autoMicRef.current) {
      autoMicRef.current = false;
      recognitionRef.current?.stop();
      setIsListening(false);
      setIsMuted(true);
    } else {
      autoMicRef.current = true;
      setIsMuted(false);
      startRecognition();
    }
  }, [startRecognition]);

  const pauseSession = useCallback(() => {
    setIsPaused(true);
    setElapsedBeforePause(elapsed);
    autoMicRef.current = false;
    recognitionRef.current?.stop();
    setIsListening(false);
    window.speechSynthesis?.cancel();
    if (timerRef.current) clearInterval(timerRef.current);
  }, [elapsed]);

  const resumeSession = useCallback(() => {
    setIsPaused(false);
  }, []);

  const endSession = useCallback(async () => {
    if (!session) return;
    setIsEnding(true);
    await fetch("/api/simulation/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: session.id }),
    });
    await heygen.stop();
    router.push(`/analysis?session=${session.id}`);
  }, [session, heygen, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm">Initialising simulation…</p>
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <AlertCircle className="w-10 h-10 text-red-500" />
          <p className="text-sm font-medium">Failed to start simulation</p>
          <p className="text-xs text-muted-foreground">{initError}</p>
          <Button variant="outline" size="sm" onClick={() => router.back()}>Go back</Button>
        </div>
      </div>
    );
  }

  const persona = (() => {
    if (!scenario) return null;
    if (scenario.custom_persona) return scenario.custom_persona;
    if (scenario.preset_persona_id) {
      const preset = mockPersonas.find((p) => p.id === scenario.preset_persona_id);
      if (preset) return { name: preset.name, jobTitle: preset.jobTitle, company: preset.company, industry: preset.industry, personality: preset.personality, painPoints: preset.painPoints };
    }
    return null;
  })();

  const lastMessage = messages[messages.length - 1] ?? null;

  return (
    <div className="relative h-[calc(100vh-4rem)] -m-4 lg:-m-6 overflow-hidden bg-black">

      {/* ── Full-screen video ── */}
      <div className="absolute inset-0">
        {avatarEnabled ? (
          <>
            <video ref={heygenAttachVideo} autoPlay playsInline className="w-full h-full object-cover" />
            {(heygenStatus === "idle" || heygenStatus === "connecting") && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70">
                <Loader2 className="w-7 h-7 text-white/50 animate-spin" />
                <p className="text-white/50 text-sm">Connecting avatar…</p>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-neutral-900">
            <VideoOff className="w-10 h-10 text-neutral-600" />
            <p className="text-neutral-500 text-sm">Video off</p>
          </div>
        )}
      </div>

      {/* ── Bottom gradient scrim ── */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent pointer-events-none" />

      {/* ── Top-left: Timer ── */}
      <div className="absolute top-4 left-5 z-30">
        <div className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-mono font-semibold backdrop-blur-sm border",
          isPaused ? "bg-amber-500/20 text-amber-300 border-amber-500/30" : "bg-white/10 text-white border-white/10"
        )}>
          <Timer className="w-3.5 h-3.5" />
          {formatTimer(elapsed)}
        </div>
      </div>

      {/* ── Top-right: Live badge ── */}
      <div className="absolute top-4 right-5 z-30 flex items-center gap-2">
        <Badge className="gap-1 text-[10px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30 backdrop-blur-sm">
          <Radio className="w-2.5 h-2.5 animate-pulse" />
          Live
        </Badge>
        {state && (
          <Badge variant="outline" className="text-[10px] capitalize border-white/15 text-white/50 bg-black/30 backdrop-blur-sm">{state.stage}</Badge>
        )}
      </div>

      {/* ── Self-view PiP ── */}
      {selfCamEnabled && (
        <div className="absolute top-14 right-5 z-30 w-28 sm:w-32 aspect-video rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-black">
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
          <p className="absolute bottom-1 left-2 text-[9px] text-white/60 font-medium drop-shadow">You</p>
        </div>
      )}

      {/* ── Caption ── */}
      <div className="absolute bottom-28 left-0 right-0 z-30 px-8 text-center pointer-events-none">
        {sending ? (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/50 backdrop-blur-sm text-white/50 text-sm">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Thinking…
          </div>
        ) : lastMessage ? (
          <div className="space-y-0.5">
            <p className="text-white/40 text-xs font-medium">
              {lastMessage.role === "buyer" && persona ? persona.name : "You"}
            </p>
            <p className="text-white/90 text-base leading-snug drop-shadow-lg max-w-2xl mx-auto line-clamp-2">
              {lastMessage.content}
            </p>
          </div>
        ) : (
          <p className="text-white/30 text-sm">{isPaused ? "Session paused" : "Say hello to begin"}</p>
        )}
      </div>

      {/* ── Bottom controls ── */}
      <div className="absolute bottom-7 left-0 right-0 z-30 flex items-center justify-center">
        {/* Notes */}
        <button
          onClick={() => { setShowNotesPanel((v) => !v); setShowPersonaPanel(false); }}
          className={cn(
            "absolute left-8 w-12 h-12 rounded-full backdrop-blur-sm border flex items-center justify-center transition-all",
            showNotesPanel ? "bg-violet-600 border-violet-500 text-white" : "bg-white/10 border-white/15 text-white/70 hover:bg-white/20 hover:text-white"
          )}
        >
          <Pencil className="w-5 h-5" />
        </button>

        {/* Centre pill */}
        <div className="flex flex-col items-center gap-3">
          {/* Voice / Text mode toggle */}
          <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm border border-white/10 rounded-full p-1">
            <button
              onClick={() => switchResponseMode("voice")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                responseMode === "voice" ? "bg-white text-black shadow" : "text-white/50 hover:text-white"
              )}
            >
              <Mic className="w-3.5 h-3.5" /> Voice
            </button>
            <button
              onClick={() => switchResponseMode("text")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                responseMode === "text" ? "bg-white text-black shadow" : "text-white/50 hover:text-white"
              )}
            >
              <Keyboard className="w-3.5 h-3.5" /> Text
            </button>
          </div>

          {/* Main controls */}
          <div className="flex items-center gap-3 bg-black/50 backdrop-blur-md border border-white/10 rounded-full px-5 py-3 shadow-2xl">
            <button
              onClick={() => setShowMoreMenu((v) => !v)}
              className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            {responseMode === "voice" ? (
              heygen.avatarMode === "FULL" ? (
                // FULL mode: hold-to-speak PTT (LiveAvatar handles STT + TTS)
                <button
                  onMouseDown={() => { heygen.pttStart(); setIsListening(true); setIsMuted(false); }}
                  onMouseUp={() => { heygen.pttStop(); setIsListening(false); }}
                  onTouchStart={() => { heygen.pttStart(); setIsListening(true); setIsMuted(false); }}
                  onTouchEnd={() => { heygen.pttStop(); setIsListening(false); }}
                  disabled={isPaused}
                  className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 select-none",
                    isListening ? "bg-white scale-110 ring-2 ring-white/60 ring-offset-2 ring-offset-transparent shadow-white/40" : "bg-white hover:bg-white/90 shadow-white/20",
                    isPaused && "opacity-40 cursor-not-allowed"
                  )}
                >
                  <Mic className="w-6 h-6 text-black" />
                </button>
              ) : (
                // LITE mode: toggle continuous mic
                <button
                  onClick={toggleMic}
                  disabled={sending || isPaused}
                  className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-200",
                    isMuted ? "bg-white/20 hover:bg-white/30" : "bg-white hover:bg-white/90 shadow-white/20",
                    isListening && !isMuted && "ring-2 ring-white/60 ring-offset-2 ring-offset-transparent scale-105",
                    (sending || isPaused) && "opacity-40 cursor-not-allowed"
                  )}
                >
                  {isMuted
                    ? <MicOff className="w-6 h-6 text-white/60" />
                    : <Mic className="w-6 h-6 text-black" />}
                </button>
              )
            ) : (
              <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-2 w-56">
                <input
                  type="text"
                  className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30"
                  placeholder="Type your reply…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                  disabled={sending || isPaused}
                  autoFocus
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={sending || !input.trim() || isPaused}
                  className="w-8 h-8 rounded-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 flex items-center justify-center shrink-0 transition-all"
                >
                  {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : <SendHorizontal className="w-3.5 h-3.5 text-white" />}
                </button>
              </div>
            )}
            <button
              onClick={() => setShowEndModal(true)}
              className="w-11 h-11 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center text-white shadow-xl shadow-red-500/30 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <button
          onClick={() => { setShowPersonaPanel((v) => !v); setShowNotesPanel(false); }}
          className={cn(
            "absolute right-8 w-12 h-12 rounded-full backdrop-blur-sm border flex items-center justify-center transition-all",
            showPersonaPanel ? "bg-violet-600 border-violet-500 text-white" : "bg-white/10 border-white/15 text-white/70 hover:bg-white/20 hover:text-white"
          )}
        >
          <BarChart2 className="w-5 h-5" />
        </button>
      </div>

      {/* ── Listening hint ── */}
      {isListening && (
        <div className="absolute bottom-[7.5rem] left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/20 backdrop-blur-sm pointer-events-none">
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
          <span className="text-red-400 text-[11px]">Listening — click mic to stop</span>
        </div>
      )}

      {/* ── More menu ── */}
      {showMoreMenu && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-40 bg-neutral-900/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-2 min-w-[190px] animate-in fade-in zoom-in-95 duration-150">
          <button onClick={() => { isPaused ? resumeSession() : pauseSession(); setShowMoreMenu(false); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors">
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            {isPaused ? "Resume session" : "Pause session"}
          </button>
          <button onClick={() => { toggleSelfCam(); setShowMoreMenu(false); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors">
            <User className="w-4 h-4" />
            {selfCamEnabled ? "Turn camera off" : "Turn camera on"}
          </button>
        </div>
      )}

      {/* ── Pause overlay ── */}
      {isPaused && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center mx-auto">
              <Pause className="w-8 h-8 text-white/80" />
            </div>
            <p className="text-white text-sm font-semibold">Session Paused</p>
            <p className="text-white/40 text-xs">Timer is stopped</p>
          </div>
        </div>
      )}

      {/* ── Error toast ── */}
      {sendError && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-xs backdrop-blur-sm">
          {sendError}
        </div>
      )}

      {/* ── Persona slide-out (right) ── */}
      {showPersonaPanel && (
        <div className="absolute inset-y-0 right-0 z-40 w-80 bg-neutral-950/95 backdrop-blur-md border-l border-white/10 flex flex-col animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <p className="text-sm font-semibold text-white">Buyer Intel</p>
            <button onClick={() => setShowPersonaPanel(false)} className="text-white/40 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {persona ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-white">{persona.name}</p>
                    <p className="text-[11px] text-white/50">{persona.jobTitle}</p>
                    <p className="text-[11px] text-white/30">{persona.company}</p>
                  </div>
                </div>
                {state && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-white/50">
                        <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Trust</span>
                        <span className="font-medium text-white/70">{state.trust_level}/100</span>
                      </div>
                      <TrustBar value={state.trust_level} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-white/50 flex items-center gap-1"><Brain className="w-3 h-3" /> Mood</span>
                      <MoodDot mood={state.buyer_mood} />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider">Facts Discovered</p>
                      <div className="rounded-xl border border-white/10 bg-white/5 divide-y divide-white/5">
                        {Object.entries(state.facts_discovered).map(([k, v]) => (
                          <div key={k} className="flex items-center justify-between px-3 py-2 text-[11px]">
                            <span className={cn("capitalize", v ? "text-white/70" : "text-white/30")}>{k.replace(/_/g, " ")}</span>
                            {v ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Lock className="w-2.5 h-2.5 text-white/15" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-1">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-white/30">Personality</p>
                  <p className="text-[11px] text-white/50 leading-relaxed">{persona.personality}</p>
                </div>
              </>
            ) : <p className="text-white/20 text-xs">No persona data</p>}
          </div>
        </div>
      )}

      {/* ── Notes slide-out (left) ── */}
      {showNotesPanel && (
        <div className="absolute inset-y-0 left-0 z-40 w-80 bg-neutral-950/95 backdrop-blur-md border-r border-white/10 flex flex-col animate-in slide-in-from-left duration-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Pencil className="w-4 h-4 text-white/40" />
              <p className="text-sm font-semibold text-white">Notes</p>
            </div>
            <button onClick={() => setShowNotesPanel(false)} className="text-white/40 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 flex flex-col p-5 gap-4 overflow-y-auto">
            <Textarea
              className="flex-1 min-h-[200px] resize-none rounded-xl text-xs bg-white/5 border-white/10 text-white/70 placeholder:text-white/20 focus-visible:ring-violet-500/50"
              placeholder="Jot down objections, pain points, key moments..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            {scenario?.context_note && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
                <p className="text-[10px] font-medium uppercase tracking-wider text-white/30">Call Brief</p>
                <p className="text-[11px] text-white/45 leading-relaxed">{scenario.context_note}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* End Session Modal */}
      {showEndModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm mx-4 rounded-3xl border border-white/[0.08] bg-neutral-950/98 shadow-2xl shadow-black/60 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="relative px-6 pt-7 pb-5 text-center">
              <button
                onClick={() => setShowEndModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full text-white/25 hover:text-white/60 hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-violet-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-500/25">
                <Square className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white">End Session</h3>
              <p className="text-xs text-white/35 mt-1">Your progress will be saved and analysed</p>
            </div>

            {/* Live Stats */}
            <div className="px-6 pb-5">
              <div className="grid grid-cols-3 gap-2.5">
                <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/[0.04] border border-white/[0.07] p-3">
                  <Timer className="w-3.5 h-3.5 text-violet-400/60" />
                  <span className="text-sm font-bold text-white tabular-nums">{formatTimer(elapsed)}</span>
                  <span className="text-[9px] text-white/25 uppercase tracking-widest">Duration</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/[0.04] border border-white/[0.07] p-3">
                  <TrendingUp className="w-3.5 h-3.5 text-violet-400/60" />
                  <span className={cn("text-sm font-bold tabular-nums", state && state.trust_level >= 70 ? "text-emerald-400" : state && state.trust_level >= 40 ? "text-amber-400" : "text-red-400")}>
                    {state?.trust_level ?? "–"}
                  </span>
                  <span className="text-[9px] text-white/25 uppercase tracking-widest">Trust</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/[0.04] border border-white/[0.07] p-3">
                  <BarChart3 className="w-3.5 h-3.5 text-violet-400/60" />
                  <span className="text-sm font-bold text-white tabular-nums">{messages.length}</span>
                  <span className="text-[9px] text-white/25 uppercase tracking-widest">Messages</span>
                </div>
              </div>
            </div>

            {/* Actions — Resume is primary CTA, End is destructive secondary */}
            <div className="px-6 pb-6 space-y-2">
              <Button
                className="w-full gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold shadow-lg shadow-violet-500/20 transition-all"
                onClick={() => setShowEndModal(false)}
                disabled={isEnding}
              >
                <Play className="w-4 h-4" />
                Resume Call
              </Button>
              <Button
                variant="ghost"
                className="w-full gap-2 rounded-xl text-red-400/80 hover:text-red-400 hover:bg-red-500/10 border border-white/[0.06] bg-transparent transition-all"
                onClick={endSession}
                disabled={isEnding}
              >
                {isEnding ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Finishing…
                  </>
                ) : (
                  <>
                    <Square className="w-3.5 h-3.5" />
                    End &amp; Get Analysis
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Ending Overlay */}
      {isEnding && (
        <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-black/90 animate-in fade-in duration-500">
          <Loader2 className="w-8 h-8 animate-spin text-white/60 mb-4" />
          <p className="text-sm text-white/60 font-medium">Wrapping up your session…</p>
          <p className="text-xs text-white/30 mt-1">Generating analysis</p>
        </div>
      )}
    </div>
  );
}
