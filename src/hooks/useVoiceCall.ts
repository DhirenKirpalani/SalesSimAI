"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Conversation } from "@elevenlabs/client";
import { createClient } from "@/lib/supabase/client";
import { buildVoiceConfig, getAgentId } from "@/lib/voice-config";
import type { PersonaContext } from "@/lib/voice-config";

export type VoiceStatus = "idle" | "connecting" | "listening" | "processing" | "speaking" | "paused" | "error";

export interface TranscriptEntry {
  role: "user" | "buyer" | "avatar" | "coach";
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
  start: (sessionId: string, voiceId?: string, language?: VoiceLanguage, persona?: PersonaContext) => void;
  stop: () => void;
  toggleMic: () => void;
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

  // Catch ElevenLabs SDK unhandled rejections and thrown errors (e.g. DataChannel errors)
  useEffect(() => {
    const rejectionHandler = (e: PromiseRejectionEvent) => {
      const reason = e.reason;
      const msg = typeof reason === "string" ? reason : reason instanceof Error ? reason.message : String(reason);
      if (!/elevenlabs|datachannel|lossy|webrtc/i.test(msg)) return;
      console.error("[useVoiceCall] unhandled rejection:", reason);
      setError(msg || "Voice connection error");
      setStatus("error");
      e.preventDefault();
    };
    const errorHandler = (e: ErrorEvent) => {
      const msg = e.message || String(e.error);
      if (!/datachannel|lossy|webrtc|elevenlabs/i.test(msg)) return;
      console.error("[useVoiceCall] caught window error:", e.error);
      setError(msg || "Voice connection error");
      setStatus("error");
      e.preventDefault();
    };
    window.addEventListener("unhandledrejection", rejectionHandler);
    window.addEventListener("error", errorHandler);
    return () => {
      window.removeEventListener("unhandledrejection", rejectionHandler);
      window.removeEventListener("error", errorHandler);
    };
  }, []);

  const sessionIdRef = useRef<string | null>(null);
  const voiceIdRef = useRef<string | null>(null);
  const languageRef = useRef<VoiceLanguage>("en");
  const conversationRef = useRef<Conversation | null>(null);
  const abortRef = useRef(false);
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const turnAddedRef = useRef(false);
  const userTurnAddedRef = useRef(false);
  const agentSpeakingRef = useRef(false);
  const lastBuyerTextRef = useRef<string>("");
  const lastUserTextRef = useRef<string>("");
  const realtimeChannelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  // Audio energy refs for real-time visualization (0 = silent, 1 = max)
  const audioEnergyRef = useRef(0);
  const micEnergyRef = useRef(0);

  // Keep transcript ref in sync
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  const stripXmlTags = (text: string): string => text.replace(/<\/?[^>]+>/g, "").trim();

  const addTranscript = useCallback((role: "user" | "buyer", text: string, emotion?: string, intent?: string, timeOverride?: string) => {
    const normalized = role === "buyer" ? stripXmlTags(text) : text;
    const entry: TranscriptEntry = { role, text: normalized, time: timeOverride ?? new Date().toLocaleTimeString(), emotion, intent };
    console.log("[useVoiceCall] addTranscript:", { role, text: normalized, emotion, intent, entryCount: transcriptRef.current.length + 1 });
    transcriptRef.current = [...transcriptRef.current, entry];
    setTranscript((prev) => [...prev, entry]);
  }, []);

  const patchLatestBuyerTranscript = useCallback((text: string, emotion?: string, intent?: string) => {
    const normalized = stripXmlTags(text);
    console.log("[useVoiceCall] patchLatestBuyerTranscript:", { text: normalized, emotion, intent });
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

  const start = useCallback(async (sessionId: string, voiceId?: string, language?: VoiceLanguage, persona?: PersonaContext) => {
    console.log("[useVoiceCall] start called:", { sessionId, voiceId, language, persona });
    abortRef.current = false;
    setError(null);
    setTranscript([]);
    transcriptRef.current = [];
    setCurrentBuyerText("");
    setIsSpeaking(false);
    setMicMuted(false);
    lastBuyerTextRef.current = "";
    lastUserTextRef.current = "";
    turnAddedRef.current = false;
    userTurnAddedRef.current = false;
    agentSpeakingRef.current = false;
    sessionIdRef.current = sessionId;
    voiceIdRef.current = voiceId ?? null;
    languageRef.current = language ?? "en";
    unsubscribeFromRealtime();
    subscribeToRealtime(sessionId);

    const agentId = getAgentId(persona?.scenarioType);
    console.log("[useVoiceCall] agentId:", agentId, "scenarioType:", persona?.scenarioType ?? "N/A");
    if (!agentId) {
      setError("ElevenLabs agent ID is not configured.");
      setStatus("error");
      return;
    }

    setStatus("connecting");

    try {
      const voiceConfig = buildVoiceConfig(sessionId, languageRef.current, voiceId ?? undefined, persona);

      // ── PROMPT PATCH ───────────────────────────────────────────────────────
      // Prompt + voice PATCH is handled by the simulation page before calling start().
      // No need to patch here — the page sends both voiceId and systemPrompt in one request.
      // ─────────────────────────────────────────────────────────────────────
      // ─────────────────────────────────────────────────────────────────────

      // ── VOICE SELECTION LOG ──────────────────────────────────────────────
      // Voice and prompt are controlled by the scenario configuration via the update-agent-voice API.
      // We also attempt a runtime tts override so the first response uses the correct voice immediately.
      // If the SDK rejects the override, we fall back to starting without it.
      console.log(`%c[useVoiceCall] 🎙️ SELECTED VOICE: ${voiceConfig.voiceId ?? "dashboard default"} (scenario controlled)`, "color:#f472b6;font-weight:bold;font-size:13px");
      console.log("[useVoiceCall] voiceConfig:", voiceConfig);
      // ─────────────────────────────────────────────────────────────────────

      const baseOverrides = {
        ...(voiceConfig.language ? { agent: { language: voiceConfig.language } } : {}),
      };
      const overridesWithVoice = voiceConfig.voiceId
        ? { ...baseOverrides, tts: { voice_id: voiceConfig.voiceId } }
        : baseOverrides;
      console.log("%c[useVoiceCall] 📤 overrides being sent to ElevenLabs:", "color:#fb923c;font-weight:bold;font-size:13px", JSON.stringify(overridesWithVoice, null, 2));

      const startSessionCallbacks = {
        onConnect: () => {
          console.log("[useVoiceCall] onConnect");
          setStatus("listening");
          audioEnergyRef.current = 0;
          micEnergyRef.current = 0;
        },
        onDisconnect: () => {
          console.log("[useVoiceCall] onDisconnect", { abort: abortRef.current });
          // Treat any disconnect as a clean end-of-call (same as clicking hang up).
          setStatus("idle");
          setIsSpeaking(false);
          setCurrentBuyerText("");
          audioEnergyRef.current = 0;
          micEnergyRef.current = 0;
          unsubscribeFromRealtime();
          conversationRef.current = null;
        },
        onError: (err: unknown) => {
          console.error("[useVoiceCall] onError:", err);
          setError(err instanceof Error ? err.message : "Voice call error");
          setStatus("error");
        },
        onMessage: (message: MessagePayload) => {
          const msg = (message as unknown) as Record<string, unknown>;
          console.log("[useVoiceCall] onMessage raw:", msg);

          const eventType = typeof msg.type === "string" ? msg.type : undefined;
          const source = typeof msg.source === "string" ? msg.source : undefined;
          const role = typeof msg.role === "string" ? msg.role : undefined;
          const text = String(
            msg.message ??
            msg.text ??
            msg.corrected_agent_response ??
            msg.response ??
            msg.content ??
            (msg.agent_response as Record<string, unknown>)?.message ??
            ""
          ).trim();
          const isUserTranscript = source === "user" || role === "user" || eventType === "user_transcript";
          const isAgentResponse = source === "ai" || role === "agent" || eventType === "agent_response" || eventType === "agent_response_correction";

          if (eventType === "agent_started_speaking") {
            agentSpeakingRef.current = true;
            setIsSpeaking(true);
            setStatus("speaking");
          } else if (eventType === "agent_stopped_speaking") {
            agentSpeakingRef.current = false;
            setIsSpeaking(false);
            setStatus("listening");
            setTimeout(() => setCurrentBuyerText(""), 3000);
          } else if (eventType === "user_started_speaking") {
            setStatus("listening");
            if (!agentSpeakingRef.current) turnAddedRef.current = false;
            userTurnAddedRef.current = false;
            lastUserTextRef.current = "";
            setCurrentBuyerText("");
          } else if (eventType === "user_stopped_speaking") {
            setStatus("listening");
          } else if (isUserTranscript) {
            console.log("[useVoiceCall] user transcript:", { text, alreadyAdded: userTurnAddedRef.current, lastUserText: lastUserTextRef.current });
            if (text && (!userTurnAddedRef.current || text !== lastUserTextRef.current)) {
              userTurnAddedRef.current = true;
              lastUserTextRef.current = text;
              addTranscript("user", text);
              turnAddedRef.current = false;
            }
          } else if (isAgentResponse) {
            const normalized = stripXmlTags(text);
            console.log("[useVoiceCall] agent response:", { text: normalized, turnAdded: turnAddedRef.current });
            if (normalized) {
              lastBuyerTextRef.current = normalized;
              setCurrentBuyerText(normalized);
              if (!turnAddedRef.current) {
                turnAddedRef.current = true;
                addTranscript("buyer", normalized);
              } else {
                patchLatestBuyerTranscript(normalized);
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
          const text = stripXmlTags(String(data.corrected_agent_response ?? "").trim());
          if (text) {
            lastBuyerTextRef.current = text;
            patchLatestBuyerTranscript(text);
            setCurrentBuyerText(text);
            void fetchLatestBuyerMessage(text);
          }
        },
      };

      let conversation: Conversation;
      try {
        console.log("[useVoiceCall] calling Conversation.startSession with voice override...");
        conversation = await Conversation.startSession({
          agentId,
          connectionType: "webrtc",
          dynamicVariables: voiceConfig.dynamicVariables,
          overrides: overridesWithVoice as Parameters<typeof Conversation.startSession>[0]["overrides"],
          ...startSessionCallbacks,
        });
      } catch (voiceOverrideErr) {
        console.warn("[useVoiceCall] voice override rejected, retrying without override:", voiceOverrideErr);
        console.log("[useVoiceCall] calling Conversation.startSession without voice override...");
        conversation = await Conversation.startSession({
          agentId,
          connectionType: "webrtc",
          dynamicVariables: voiceConfig.dynamicVariables,
          overrides: baseOverrides as Parameters<typeof Conversation.startSession>[0]["overrides"],
          ...startSessionCallbacks,
        });
      }

      conversationRef.current = conversation;
      // ── VOICE VERIFICATION LOG ──────────────────────────────────────────
      const convAny = conversation as unknown as Record<string, unknown>;
      const resolvedVoiceId =
        (convAny?.options as Record<string, unknown>)?.voice_id ??
        (convAny?.options as Record<string, unknown>)?.tts ??
        ((convAny?.options as Record<string, unknown>)?.conversationConfigOverride as Record<string, unknown>)?.tts ??
        "(not exposed by SDK)";
      console.log("%c[useVoiceCall] ✅ Session started. SDK-reported voice info:", "color:#34d399;font-weight:bold;font-size:13px", resolvedVoiceId);
      console.log("[useVoiceCall] full conversation object:", conversation);
      // ────────────────────────────────────────────────────────────────────
    } catch (err) {
      console.error("[useVoiceCall] start error:", err);
      setError(err instanceof Error ? err.message : "Failed to start voice call");
      setStatus("error");
    }
  }, [addTranscript, patchLatestBuyerTranscript, fetchLatestBuyerMessage, unsubscribeFromRealtime]);

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

  const toggleMic = useCallback(() => {
    console.log("[useVoiceCall] toggleMic called, micMuted:", micMuted);
    const conversation = conversationRef.current;
    if (!conversation) {
      console.warn("[useVoiceCall] toggleMic: no conversation");
      return;
    }
    const conv = conversation as unknown as { setMicMuted?: (isMuted: boolean) => void };
    if (!conv.setMicMuted) {
      console.error("[useVoiceCall] setMicMuted not found on conversation object");
      return;
    }
    if (micMuted) {
      conv.setMicMuted(false);
      setMicMuted(false);
      console.log("[useVoiceCall] mic unmuted");
    } else {
      conv.setMicMuted(true);
      setMicMuted(true);
      console.log("[useVoiceCall] mic muted");
    }
  }, [micMuted]);

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
    setVolume,
  };
}
