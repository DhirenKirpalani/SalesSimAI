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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Mic,
  MicOff,
  Square,
  Timer,
  Loader2,
  SendHorizontal,
  Radio,
  TrendingUp,
  Brain,
  AlertCircle,
  Video,
  VideoOff,
  Pencil,
  User,
  ChevronRight,
  CheckCircle2,
  BarChart3,
  X,
  Pause,
  Play,
  Lock,
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
  const [hasSpoken, setHasSpoken] = useState(false);

  const [selfCamEnabled, setSelfCamEnabled] = useState(false);
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

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, []);

  // Keep a stable ref to sendMessage to avoid stale closures in recognition callbacks
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sendMessageRef = useRef<((text: string) => void) | null>(null);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !session || sending) return;
    setSending(true);
    setInput("");

    const userMsg: SimulationMessage = {
      id: crypto.randomUUID(),
      session_id: session.id,
      role: "user",
      content: text.trim(),
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("/api/simulation/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, message: text.trim() }),
      });

      if (!res.ok) throw new Error(await res.text());
      const { buyer_response, new_state, buyer_message } = await res.json();

      setState(new_state);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== userMsg.id),
        userMsg,
        buyer_message ?? {
          id: crypto.randomUUID(),
          session_id: session.id,
          role: "buyer",
          content: buyer_response.message,
          emotion: buyer_response.emotion,
          intent: buyer_response.intent,
          created_at: new Date().toISOString(),
        },
      ]);

      if (avatarEnabled && heygenStatus === "connected") {
        await heygen.speak(buyer_response.message);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[sendMessage]", err);
      setSendError(msg.slice(0, 200));
      setTimeout(() => setSendError(null), 5000);
    } finally {
      setSending(false);
      // Auto-restart mic after buyer responds if continuous mode is on
      if (autoMicRef.current) {
        setTimeout(() => { if (autoMicRef.current) startRecognition(); }, 400);
      }
    }
  }, [session, sending, heygen, avatarEnabled, startRecognition]);

  // Keep ref in sync so recognition callbacks always call the latest sendMessage
  useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

  const toggleMic = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition is not supported. Please use Chrome."); return; }

    if (autoMicRef.current) {
      // Turn off continuous mode
      autoMicRef.current = false;
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      // Turn on continuous mode
      autoMicRef.current = true;
      startRecognition();
    }
  }, [startRecognition]);

  const pauseSession = useCallback(() => {
    setIsPaused(true);
    setElapsedBeforePause(elapsed);
    autoMicRef.current = false;
    recognitionRef.current?.stop();
    setIsListening(false);
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

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] -m-4 lg:-m-6 overflow-hidden bg-neutral-950">

      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 lg:px-6 py-3 border-b border-white/10 bg-neutral-900/80 backdrop-blur shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className="gap-1 text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15">
            <Radio className="w-3 h-3 animate-pulse" />
            Live
          </Badge>
          {state && (
            <Badge variant="outline" className="text-[10px] capitalize border-white/10 text-white/60">{state.stage}</Badge>
          )}
          {scenario && (
            <span className="text-xs text-white/40 hidden sm:flex items-center gap-1 truncate max-w-[240px]">
              <ChevronRight className="w-3 h-3" />
              {scenario.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={cn(
              "flex items-center gap-1.5 text-sm font-mono font-medium tabular-nums",
              isPaused ? "text-amber-400" : "text-white/80"
            )}>
              <Timer className={cn("w-4 h-4", isPaused ? "text-amber-400" : "text-white/40")} />
              {formatTimer(elapsed)}
            </div>
            {isPaused && (
              <Badge className="text-[10px] bg-amber-500/15 text-amber-400 border-amber-500/20 border font-medium">
                <Pause className="w-2.5 h-2.5 mr-0.5" /> Paused
              </Badge>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="gap-1 text-xs rounded-lg text-white/60 hover:text-white hover:bg-white/10"
            onClick={() => setAvatarEnabled(!avatarEnabled)}
          >
            {avatarEnabled ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{avatarEnabled ? "Video on" : "Video off"}</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={cn(
              "gap-1 text-xs rounded-lg",
              selfCamEnabled
                ? "text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 hover:text-violet-300"
                : "text-white/60 hover:text-white hover:bg-white/10"
            )}
            onClick={toggleSelfCam}
          >
            <User className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{selfCamEnabled ? "Cam on" : "Cam off"}</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={cn(
              "gap-1 text-xs rounded-lg",
              isPaused
                ? "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 hover:text-amber-300"
                : "text-white/60 hover:text-white hover:bg-white/10"
            )}
            onClick={isPaused ? resumeSession : pauseSession}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            {isPaused ? "Resume" : "Pause"}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="gap-1 text-xs rounded-lg"
            onClick={() => setShowEndModal(true)}
          >
            <Square className="w-3.5 h-3.5" />
            End
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left Panel: Buyer Info */}
        <div className="hidden lg:flex flex-col w-64 xl:w-72 border-r border-white/10 bg-neutral-900/60 overflow-y-auto">
          <div className="p-4 space-y-5">
            {persona ? (
              <>
                {/* Avatar placeholder + name */}
                <div className="flex items-center gap-3 pt-1">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-white truncate">{persona.name}</p>
                    <p className="text-[11px] text-white/50 truncate">{persona.jobTitle}</p>
                    <p className="text-[11px] text-white/40 truncate">{persona.company} · {persona.industry}</p>
                  </div>
                </div>

                {state && (
                  <div className="space-y-4">
                    {/* Trust */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-white/50">
                        <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Trust</span>
                        <span className="font-medium text-white/70">{state.trust_level}/100</span>
                      </div>
                      <TrustBar value={state.trust_level} />
                    </div>

                    {/* Mood */}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-white/50 flex items-center gap-1">
                        <Brain className="w-3 h-3" /> Mood
                      </span>
                      <MoodDot mood={state.buyer_mood} />
                    </div>

                    {/* Facts */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider">Facts Discovered</p>
                        <p className="text-[9px] text-white/20">AI-tracked</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/5 divide-y divide-white/5">
                        {Object.entries(state.facts_discovered).map(([k, v]) => (
                          <div key={k} className="flex items-center justify-between px-3 py-2 text-[11px]">
                            <span className={cn("capitalize", v ? "text-white/70" : "text-white/30")}>{k.replace(/_/g, " ")}</span>
                            {v ? (
                              <span className="text-emerald-400 font-semibold text-[10px] flex items-center gap-0.5">
                                <CheckCircle2 className="w-3 h-3" />
                              </span>
                            ) : (
                              <Lock className="w-2.5 h-2.5 text-white/15" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Personality */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-1.5">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-white/30">Personality</p>
                  <p className="text-[11px] text-white/50 leading-relaxed">{persona.personality}</p>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-24 text-white/20 text-xs">No persona</div>
            )}
          </div>
        </div>

        {/* Center: Video + Chat */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Avatar Video — large, centered */}
          <div className="relative w-full bg-black shrink-0" style={{ maxHeight: "55%" }}>
            <div className="aspect-video w-full max-h-full mx-auto relative overflow-hidden">
              {avatarEnabled ? (
                <>
                  <video
                    ref={heygenAttachVideo}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  {(heygenStatus === "idle" || heygenStatus === "connecting") && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-neutral-950/80 backdrop-blur-sm">
                      <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
                      <p className="text-white/40 text-xs">Connecting avatar…</p>
                      <p className="text-white/20 text-[10px]">You can start typing while this loads</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-neutral-900">
                  <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center">
                    <VideoOff className="w-7 h-7 text-neutral-600" />
                  </div>
                  <p className="text-neutral-500 text-sm">Video off</p>
                  {heygenStatus === "error" && (
                    <p className="text-red-400/60 text-[10px] max-w-[200px] text-center leading-relaxed">
                      Avatar connection failed.<br />Check console for details.
                    </p>
                  )}
                </div>
              )}

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

              {/* Self-view PiP */}
              {selfCamEnabled && (
                <div className="absolute bottom-3 right-3 z-30 w-28 sm:w-36 aspect-video rounded-xl overflow-hidden border-2 border-white/20 shadow-xl bg-black">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  <div className="absolute bottom-1 left-1.5">
                    <p className="text-[9px] text-white/70 font-medium drop-shadow">You</p>
                  </div>
                </div>
              )}

              {/* Pause overlay */}
              {isPaused && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
                      <Pause className="w-8 h-8 text-white/80" />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-white text-sm font-semibold">Session Paused</p>
                      <p className="text-white/40 text-xs">Take your time. The timer is stopped.</p>
                      <p className="text-white/60 text-xs font-mono mt-1">{formatTimer(elapsed)}</p>
                    </div>
                    <Button
                      size="sm"
                      className="rounded-xl gap-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30"
                      onClick={resumeSession}
                    >
                      <Play className="w-4 h-4" />
                      Resume Session
                    </Button>
                  </div>
                </div>
              )}

              {/* Bottom-left: buyer name */}
              {persona && (
                <div className="absolute bottom-3 left-4 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shrink-0">
                    <User className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <p className="text-white text-xs font-semibold leading-none">{persona.name}</p>
                    <p className="text-white/60 text-[10px] leading-none mt-0.5">{persona.jobTitle}</p>
                  </div>
                </div>
              )}

              {/* Bottom-right: status */}
              <div className="absolute bottom-3 right-4 flex items-center gap-1.5">
                {hasSpoken && !isListening && !isPaused && (
                  <div className="flex items-center gap-1 rounded-full bg-red-500/80 px-2 py-0.5 backdrop-blur-sm">
                    <MicOff className="w-2.5 h-2.5 text-white" />
                    <span className="text-[9px] font-medium text-white">Muted</span>
                  </div>
                )}
                <Badge className={cn(
                  "text-[10px] border-0 font-medium",
                  heygenStatus === "speaking"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : heygenStatus === "connected"
                    ? "bg-white/10 text-white/60"
                    : heygenStatus === "connecting"
                    ? "bg-amber-500/20 text-amber-300"
                    : "bg-white/10 text-white/40"
                )}>
                  {heygenStatus === "speaking" ? "● Speaking" : heygenStatus === "connected" ? "● Ready" : heygenStatus === "connecting" ? "● Connecting…" : heygenStatus}
                </Badge>
              </div>
            </div>
          </div>

          {/* Transcript */}
          <ScrollArea className="flex-1 bg-neutral-950" ref={scrollRef}>
            <div className="space-y-3 max-w-2xl mx-auto px-4 py-4">
              {messages.length === 0 && (
                <div className="text-center py-10 space-y-1">
                  <p className="text-white/40 text-sm">The call has started. Say hello to begin.</p>
                  {persona && (
                    <p className="text-white/25 text-xs">You&apos;re speaking with {persona.name}, {persona.jobTitle} at {persona.company}.</p>
                  )}
                </div>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col gap-1",
                    msg.role === "user" ? "items-end" : "items-start"
                  )}
                >
                  <div className="flex items-center gap-1.5 text-[10px] text-white/30 px-1">
                    {msg.role === "buyer" && persona && <span className="font-medium">{persona.name}</span>}
                    {msg.role === "user" && <span className="font-medium">You</span>}
                    {msg.emotion && (
                      <Badge variant="outline" className="text-[10px] py-0 h-4 border-white/10 text-white/30">{msg.emotion}</Badge>
                    )}
                  </div>
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-2.5 text-sm max-w-[80%] leading-relaxed",
                      msg.role === "user"
                        ? "bg-violet-600 text-white rounded-br-sm"
                        : "bg-neutral-800 text-white/85 rounded-bl-sm"
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex items-start">
                  <div className="bg-neutral-800 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white/40" />
                    <span className="text-xs text-white/40">thinking…</span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="border-t border-white/10 p-3 bg-neutral-900/80 backdrop-blur shrink-0">
            <div className="flex items-end gap-2 max-w-2xl mx-auto">
              <Button
                size="icon"
                variant={isListening ? "destructive" : "ghost"}
                className={cn(
                  "rounded-full shrink-0 h-10 w-10",
                  !isListening && "text-white/50 hover:text-white hover:bg-white/10"
                )}
                onClick={toggleMic}
                disabled={sending || isPaused}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
              <Textarea
                className="flex-1 min-h-[40px] max-h-[100px] resize-none rounded-xl text-sm py-2.5 bg-neutral-800 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-violet-500/50"
                placeholder={isPaused ? "Session paused — click Resume to continue" : "Type your message or use the mic…"}
                value={input}
                onChange={(e) => { setInput(e.target.value); setSendError(null); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                disabled={sending || isPaused}
                rows={1}
              />
              <Button
                size="icon"
                className="rounded-full shrink-0 h-10 w-10 bg-violet-600 hover:bg-violet-500"
                onClick={() => sendMessage(input)}
                disabled={sending || !input.trim() || isPaused}
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendHorizontal className="w-4 h-4" />}
              </Button>
            </div>
            {isPaused && (
              <p className="text-center text-xs text-amber-400 mt-2 flex items-center justify-center gap-1">
                <Pause className="w-3 h-3" />
                Session paused — timer and microphone are off
              </p>
            )}
            {isListening && !isPaused && (
              <p className="text-center text-xs text-red-400 mt-2 flex items-center justify-center gap-1">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse inline-block" />
                Microphone active — speak to the avatar
              </p>
            )}
            {sendError && (
              <p className="text-center text-xs text-red-400 mt-2">
                {sendError}
              </p>
            )}
          </div>
        </div>

        {/* Right Panel: Notes + Brief */}
        <div className="hidden xl:flex flex-col w-64 xl:w-72 border-l border-white/10 bg-neutral-900/60 p-4 gap-4 overflow-y-auto">
          <div className="flex items-center gap-2 text-[10px] font-medium text-white/30 uppercase tracking-wider">
            <Pencil className="w-3.5 h-3.5" />
            Notes
          </div>
          <Textarea
            className="flex-1 min-h-[140px] resize-none rounded-xl text-sm bg-neutral-800 border-white/10 text-white/80 placeholder:text-white/25 focus-visible:ring-violet-500/50"
            placeholder="Jot down objections, pain points, key moments…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          {scenario?.context_note && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
              <p className="text-[10px] font-medium uppercase tracking-wider text-white/30">Call Brief</p>
              <p className="text-[11px] text-white/45 leading-relaxed line-clamp-12">
                {scenario.context_note}
              </p>
            </div>
          )}
        </div>

      </div>

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
