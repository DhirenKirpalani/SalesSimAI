"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
  const [isListening, setIsListening] = useState(false);
  const [avatarEnabled, setAvatarEnabled] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const heygen = useHeyGen({
    onConnected: () => console.log("HeyGen connected"),
    onDisconnected: () => console.log("HeyGen disconnected"),
    onError: (err) => {
      console.warn("HeyGen error:", err);
      setAvatarEnabled(false);
    },
  });

  useEffect(() => {
    async function boot() {
      try {
        const supabase = createClient();

        const { data: sc } = await supabase
          .from(scenarioTable)
          .select("*")
          .eq("id", scenarioId)
          .single();

        if (!sc) throw new Error("Scenario not found");
        setScenario(sc as CustomScenario);

        const startRes = await fetch("/api/simulation/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scenarioId, scenarioTable }),
        });
        if (!startRes.ok) throw new Error(await startRes.text());
        const { session: newSession } = await startRes.json();
        setSession(newSession);
        setState(newSession.state);

        if (avatarEnabled && AVATAR_ID) {
          await heygen.initialize(newSession.id, AVATAR_ID, VOICE_ID || undefined, scenarioId, scenarioTable);
        } else if (avatarEnabled && !AVATAR_ID) {
          console.warn("[Simulation] Avatar skipped: NEXT_PUBLIC_LIVEAVATAR_AVATAR_ID not set");
        }
      } catch (err) {
        setInitError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }

    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

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

      if (avatarEnabled && heygen.status === "connected") {
        await heygen.speak(buyer_response.message);
      }
    } catch (err) {
      console.error("[sendMessage]", err);
    } finally {
      setSending(false);
    }
  }, [session, sending, heygen, avatarEnabled]);

  const toggleMic = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;

    if (!SR) {
      alert("Speech recognition is not supported in this browser. Please use Chrome.");
      return;
    }

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript: string = event.results[0]?.[0]?.transcript ?? "";
      if (transcript) sendMessage(transcript);
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, sendMessage]);

  const endSession = useCallback(async () => {
    if (!session) return;
    await fetch("/api/simulation/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: session.id }),
    });
    await heygen.stop();
    router.push("/scenarios");
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

  const persona = scenario?.custom_persona;

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
          <div className="flex items-center gap-1.5 text-sm font-mono font-medium text-white/80 tabular-nums">
            <Timer className="w-4 h-4 text-white/40" />
            {formatTimer(elapsed)}
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
            variant="destructive"
            className="gap-1 text-xs rounded-lg"
            onClick={endSession}
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
                      <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider">Facts Discovered</p>
                      <div className="rounded-xl border border-white/10 bg-white/5 divide-y divide-white/5">
                        {Object.entries(state.facts_discovered).map(([k, v]) => (
                          <div key={k} className="flex items-center justify-between px-3 py-2 text-[11px]">
                            <span className="capitalize text-white/50">{k.replace("_", " ")}</span>
                            <span className={cn("font-semibold", v ? "text-emerald-400" : "text-white/20")}>
                              {v ? "✓" : "–"}
                            </span>
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
                <video
                  ref={heygen.attachVideo}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-neutral-900">
                  <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center">
                    <VideoOff className="w-7 h-7 text-neutral-600" />
                  </div>
                  <p className="text-neutral-500 text-sm">Video off</p>
                </div>
              )}

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

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
              <div className="absolute bottom-3 right-4">
                <Badge className={cn(
                  "text-[10px] border-0 font-medium",
                  heygen.status === "speaking"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : heygen.status === "connected"
                    ? "bg-white/10 text-white/60"
                    : heygen.status === "connecting"
                    ? "bg-amber-500/20 text-amber-300"
                    : "bg-white/10 text-white/40"
                )}>
                  {heygen.status === "speaking" ? "● Speaking" : heygen.status === "connected" ? "● Ready" : heygen.status === "connecting" ? "● Connecting…" : heygen.status}
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
                disabled={sending}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
              <Textarea
                className="flex-1 min-h-[40px] max-h-[100px] resize-none rounded-xl text-sm py-2.5 bg-neutral-800 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-violet-500/50"
                placeholder="Type your message or use the mic…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                disabled={sending}
                rows={1}
              />
              <Button
                size="icon"
                className="rounded-full shrink-0 h-10 w-10 bg-violet-600 hover:bg-violet-500"
                onClick={() => sendMessage(input)}
                disabled={sending || !input.trim()}
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendHorizontal className="w-4 h-4" />}
              </Button>
            </div>
            {isListening && (
              <p className="text-center text-xs text-red-400 mt-2 flex items-center justify-center gap-1">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse inline-block" />
                Listening… speak now
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
    </div>
  );
}
