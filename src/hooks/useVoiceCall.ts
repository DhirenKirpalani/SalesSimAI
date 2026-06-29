"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Conversation } from "@elevenlabs/client";
import { createClient } from "@/lib/supabase/client";
import { buildVoiceConfig } from "@/lib/voice-config";

export type VoiceStatus = "idle" | "connecting" | "listening" | "processing" | "speaking" | "paused" | "error";

export interface TranscriptEntry {
  role: "user" | "buyer";
  text: string;
  time: string;
  emotion?: string;
  intent?: string;
}

import { VOICE_LANGUAGE_MAP, VoiceLanguage } from "@/lib/voice-language";
export { VOICE_LANGUAGE_MAP } from "@/lib/voice-language";
export type { VoiceLanguage } from "@/lib/voice-language";

type StartSessionOptions = Parameters<typeof Conversation.startSession>[0];
type MessagePayload = Parameters<NonNullable<StartSessionOptions["onMessage"]>>[0];

interface UseVoiceCallReturn {
  status: VoiceStatus;
  transcript: TranscriptEntry[];
  currentBuyerText: string;
  error: string | null;
  volume: number;
  isSpeaking: boolean;
  micMuted: boolean;
  audioEnergyRef: React.MutableRefObject<number>;
  micEnergyRef: React.MutableRefObject<number>;
  start: (sessionId: string, voiceId?: string, language?: VoiceLanguage) => void;
  stop: () => void;
  toggleMic: () => void;
  togglePause: () => void;
  setVolume: (v: number) => void;
}

export function useVoiceCall(): UseVoiceCallReturn {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [currentBuyerText, setCurrentBuyerText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolumeState] = useState(1.0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [micMuted, setMicMuted] = useState(false);

  const sessionIdRef = useRef<string | null>(null);
  const voiceIdRef = useRef<string | null>(null);
  const languageRef = useRef<VoiceLanguage>("en");
  const conversationRef = useRef<Conversation | null>(null);
  const abortRef = useRef(false);
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const turnAddedRef = useRef(false);
  const lastBuyerTextRef = useRef<string>("");
  const realtimeChannelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  // Audio energy refs for real-time visualization (0 = silent, 1 = max)
  const audioEnergyRef = useRef(0);
  const micEnergyRef = useRef(0);

  // Keep transcript ref in sync
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  const addTranscript = useCallback((role: "user" | "buyer", text: string, emotion?: string, intent?: string, timeOverride?: string) => {
    const entry: TranscriptEntry = { role, text, time: timeOverride ?? new Date().toLocaleTimeString(), emotion, intent };
    console.log("[useVoiceCall] addTranscript:", { role, text, emotion, intent, entryCount: transcriptRef.current.length + 1 });
    transcriptRef.current = [...transcriptRef.current, entry];
    setTranscript((prev) => [...prev, entry]);
  }, []);

  const patchLatestBuyerTranscript = useCallback((text: string, emotion?: string, intent?: string) => {
    console.log("[useVoiceCall] patchLatestBuyerTranscript:", { text, emotion, intent });
    setTranscript((prev) => {
      const next = [...prev];
      // Find the last buyer entry, or create one if missing
      let idx = next.length - 1;
      while (idx >= 0 && next[idx].role !== "buyer") idx--;
      if (idx >= 0) {
        next[idx] = { ...next[idx], text, emotion, intent };
      } else {
        next.push({ role: "buyer", text, time: new Date().toLocaleTimeString(), emotion, intent });
      }
      transcriptRef.current = next;
      return next;
    });
  }, []);

  const fetchLatestBuyerMessage = useCallback(async (expectedText?: string) => {
    const sessionId = sessionIdRef.current;
    console.log("[useVoiceCall] fetchLatestBuyerMessage:", { sessionId, expectedText });
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/simulation/messages/latest?sessionId=${encodeURIComponent(sessionId)}`);
      if (!res.ok) return;
      const data = (await res.json()) as {
        message: { role: string; content: string; emotion?: string; intent?: string; created_at: string } | null;
      };
      const msg = data.message;
      if (!msg || msg.role !== "buyer") return;
      // Only update if the text matches the expected response or if no expectation is provided
      if (!expectedText || msg.content === expectedText || msg.content.includes(expectedText.slice(0, 40))) {
        patchLatestBuyerTranscript(msg.content, msg.emotion, msg.intent);
      }
    } catch (e) {
      console.error("[useVoiceCall] fetch latest buyer message error:", e);
    }
  }, [patchLatestBuyerTranscript]);

  const subscribeToRealtime = useCallback((sessionId: string) => {
    console.log("[useVoiceCall] subscribeToRealtime:", { sessionId });
    try {
      const supabase = createClient();
      const channel = supabase
        .channel(`voice-messages-${sessionId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "simulation_messages",
            filter: `session_id=eq.${sessionId}`,
          },
          (payload: {
            new: {
              role: string;
              content: string;
              emotion?: string;
              intent?: string;
            };
          }) => {
            const msg = payload.new;
            console.log("[useVoiceCall] realtime message received:", { role: msg.role, content: msg.content, emotion: msg.emotion, intent: msg.intent });
            if (msg.role !== "buyer") return;
            patchLatestBuyerTranscript(msg.content, msg.emotion, msg.intent);
          }
        )
        .subscribe();
      realtimeChannelRef.current = channel;
    } catch (e) {
      console.error("[useVoiceCall] realtime subscription error:", e);
    }
  }, [patchLatestBuyerTranscript]);

  const unsubscribeFromRealtime = useCallback(() => {
    const channel = realtimeChannelRef.current;
    realtimeChannelRef.current = null;
    if (channel) {
      channel.unsubscribe().catch((e) => console.error("[useVoiceCall] unsubscribe error:", e));
    }
  }, []);

  const start = useCallback(async (sessionId: string, voiceId?: string, language?: VoiceLanguage) => {
    console.log("[useVoiceCall] start called:", { sessionId, voiceId, language });
    abortRef.current = false;
    setError(null);
    setTranscript([]);
    transcriptRef.current = [];
    setCurrentBuyerText("");
    setIsSpeaking(false);
    setMicMuted(false);
    lastBuyerTextRef.current = "";
    sessionIdRef.current = sessionId;
    voiceIdRef.current = voiceId ?? null;
    languageRef.current = language ?? "en";
    unsubscribeFromRealtime();
    subscribeToRealtime(sessionId);

    const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
    console.log("[useVoiceCall] agentId:", agentId);
    if (!agentId) {
      setError("ElevenLabs agent ID is not configured.");
      setStatus("error");
      return;
    }

    setStatus("connecting");

    try {
      const voiceConfig = buildVoiceConfig(sessionId, languageRef.current, voiceId ?? undefined);

      // ── VOICE SELECTION LOG ──────────────────────────────────────────────
      if (voiceConfig.voiceId) {
        console.log(`%c[useVoiceCall] 🎙️ VOICE OVERRIDE → ${voiceConfig.voiceId}`, "color:#f472b6;font-weight:bold;font-size:13px");
      } else {
        console.log(`%c[useVoiceCall] 🎙️ VOICE → Agent default (Kelvin)`, "color:#60a5fa;font-weight:bold;font-size:13px");
      }
      console.log("[useVoiceCall] voiceConfig:", voiceConfig);
      // ─────────────────────────────────────────────────────────────────────

      console.log("[useVoiceCall] calling Conversation.startSession...");
      const conversation = await Conversation.startSession({
        agentId,
        connectionType: "webrtc",
        dynamicVariables: voiceConfig.dynamicVariables,
        conversationConfigOverride: {
          ...(voiceConfig.language ? { agent: { language: voiceConfig.language } } : {}),
          ...(voiceConfig.voiceId || voiceConfig.speed ? {
            tts: {
              ...(voiceConfig.voiceId ? { voice_id: voiceConfig.voiceId } : {}),
              ...(voiceConfig.speed ? { speed: voiceConfig.speed } : {}),
            },
          } : {}),
        } as Record<string, unknown>,
        onConnect: () => {
          console.log("[useVoiceCall] onConnect");
          setStatus("listening");
          audioEnergyRef.current = 0;
          micEnergyRef.current = 0;
        },
        onDisconnect: () => {
          console.log("[useVoiceCall] onDisconnect", { abort: abortRef.current });
          if (!abortRef.current) {
            setStatus("idle");
          }
        },
        onError: (err: unknown) => {
          console.error("[useVoiceCall] onError:", err);
          setError(err instanceof Error ? err.message : "Voice call error");
          setStatus("error");
        },
        onMessage: (message: MessagePayload) => {
          const msg = (message as unknown) as Record<string, unknown>;
          console.log("[useVoiceCall] onMessage raw:", msg);

          // ElevenLabs SDK uses two shapes:
          // 1. Speaking state events: { type: "agent_started_speaking" | ... }
          // 2. Transcript/response events: { source: "user" | "ai", role: "user" | "agent", message: string }
          const eventType = typeof msg.type === "string" ? msg.type : undefined;
          const source = typeof msg.source === "string" ? msg.source : undefined;
          const role = typeof msg.role === "string" ? msg.role : undefined;
          const text = String(msg.message ?? msg.text ?? "").trim();

          // Track speaking state
          if (eventType === "agent_started_speaking") {
            console.log("[useVoiceCall] agent_started_speaking");
            setIsSpeaking(true);
            setStatus("speaking");
          } else if (eventType === "agent_stopped_speaking") {
            console.log("[useVoiceCall] agent_stopped_speaking");
            setIsSpeaking(false);
            setStatus("listening");
            setTimeout(() => setCurrentBuyerText(""), 3000);
          } else if (eventType === "user_started_speaking") {
            console.log("[useVoiceCall] user_started_speaking");
            setStatus("listening");
            turnAddedRef.current = false;
            setCurrentBuyerText("");
          } else if (eventType === "user_stopped_speaking") {
            console.log("[useVoiceCall] user_stopped_speaking");
            setStatus("listening");
          } else if (source === "user" || role === "user") {
            console.log("[useVoiceCall] user transcript:", { text });
            turnAddedRef.current = false; // reset so next agent response creates a new entry
            if (text) {
              addTranscript("user", text);
            }
          } else if (source === "ai" || role === "agent") {
            console.log("[useVoiceCall] agent response:", { text, turnAdded: turnAddedRef.current });
            if (text) {
              lastBuyerTextRef.current = text;
              setCurrentBuyerText(text);
              if (!turnAddedRef.current) {
                turnAddedRef.current = true;
                addTranscript("buyer", text);
              } else {
                patchLatestBuyerTranscript(text);
              }
            }
          } else if (eventType) {
            console.log("[useVoiceCall] unhandled onMessage type:", eventType);
          } else {
            console.warn("[useVoiceCall] onMessage missing type/source/role:", msg);
          }
        },
        onAgentResponseCorrection: (correction: Parameters<NonNullable<StartSessionOptions["onAgentResponseCorrection"]>>[0]) => {
          const data = (correction as unknown) as { corrected_agent_response?: string };
          console.log("[useVoiceCall] onAgentResponseCorrection:", data);
          const text = String(data.corrected_agent_response ?? "").trim();
          if (text) {
            lastBuyerTextRef.current = text;
            patchLatestBuyerTranscript(text);
            setCurrentBuyerText(text);
            void fetchLatestBuyerMessage(text);
          }
        },
      });

      conversationRef.current = conversation;
      console.log("[useVoiceCall] conversation started:", conversation);
    } catch (err) {
      console.error("[useVoiceCall] start error:", err);
      setError(err instanceof Error ? err.message : "Failed to start voice call");
      setStatus("error");
    }
  }, [addTranscript, patchLatestBuyerTranscript, fetchLatestBuyerMessage]);

  const stop = useCallback(async () => {
    console.log("[useVoiceCall] stop called");
    abortRef.current = true;
    setMicMuted(false);
    turnAddedRef.current = false;
    setStatus("idle");
    setIsSpeaking(false);
    setCurrentBuyerText("");
    audioEnergyRef.current = 0;
    micEnergyRef.current = 0;
    unsubscribeFromRealtime();

    const conversation = conversationRef.current;
    console.log("[useVoiceCall] ending conversation:", conversation);
    conversationRef.current = null;
    if (conversation) {
      try {
        await conversation.endSession();
      } catch (e) {
        console.error("[useVoiceCall] end session error:", e);
      }
    }
  }, [unsubscribeFromRealtime]);

  const toggleMic = useCallback(async () => {
    console.log("[useVoiceCall] toggleMic called");
    const conversation = conversationRef.current;
    if (!conversation) {
      console.warn("[useVoiceCall] toggleMic: no conversation");
      return;
    }

    try {
      const mic = conversation as unknown as { setMicEnabled?: (enabled: boolean) => Promise<void> };
      if (micMuted) {
        await mic.setMicEnabled?.(true);
        setMicMuted(false);
        setStatus("listening");
      } else {
        await mic.setMicEnabled?.(false);
        setMicMuted(true);
        setStatus("paused");
      }
    } catch (e) {
      console.error("[useVoiceCall] toggleMic error:", e);
    }
  }, [micMuted]);

  const togglePause = useCallback(async () => {
    console.log("[useVoiceCall] togglePause called", { status });
    if (status === "paused") {
      await toggleMic();
    } else {
      const conversation = conversationRef.current;
      if (conversation) {
        try {
          const mic = conversation as unknown as { setMicEnabled?: (enabled: boolean) => Promise<void> };
          await mic.setMicEnabled?.(false);
          setMicMuted(true);
          setStatus("paused");
        } catch (e) {
          console.error("[useVoiceCall] pause error:", e);
        }
      }
    }
  }, [status, toggleMic]);

  const setVolume = useCallback((v: number) => {
    console.log("[useVoiceCall] setVolume:", v);
    setVolumeState(v);
    // ElevenLabs manages output gain internally; keep value for UI sync.
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current = true;
      const conversation = conversationRef.current;
      conversationRef.current = null;
      unsubscribeFromRealtime();
      if (conversation) {
        conversation.endSession().catch(() => {});
      }
    };
  }, [unsubscribeFromRealtime]);

  return {
    status,
    transcript,
    currentBuyerText,
    error,
    volume,
    isSpeaking,
    micMuted,
    audioEnergyRef,
    micEnergyRef,
    start,
    stop,
    toggleMic,
    togglePause,
    setVolume,
  };
}
