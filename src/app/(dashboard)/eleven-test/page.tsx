"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { Conversation } from "@elevenlabs/client";

type Status = "idle" | "connecting" | "connected" | "error";
type TranscriptItem = { role: string; text: string };

const AGENT_ID = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID!;
const VOICE_ID = "Y7xQSS5ZtS4xv4VJotWd";

export default function ElevenTestPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState("");
  const convoRef = useRef<Conversation | null>(null);

  useEffect(() => {
    const handler = (e: PromiseRejectionEvent) => {
      console.error("[eleven-test] unhandled rejection:", e.reason);
      setError(e.reason instanceof Error ? e.reason.message : "Connection error");
      setStatus("error");
      e.preventDefault();
    };
    window.addEventListener("unhandledrejection", handler);
    return () => window.removeEventListener("unhandledrejection", handler);
  }, []);

  const start = useCallback(async () => {
    setStatus("connecting");
    setError(null);
    setTranscript([]);
    try {
      console.log("[eleven-test] starting...", { agentId: AGENT_ID, voiceId: VOICE_ID, sessionId });

      const conversation = await Conversation.startSession({
        agentId: AGENT_ID,
        connectionType: "webrtc",
        ...(sessionId.trim() ? { dynamicVariables: { session_id: sessionId.trim() } } : {}),
        onConnect: () => {
          console.log("[eleven-test] connected");
          setStatus("connected");
        },
        onDisconnect: () => {
          console.log("[eleven-test] disconnected");
          convoRef.current = null;
          setStatus("idle");
        },
        onError: (err: unknown) => {
          console.error("[eleven-test] error:", err);
          setError(err instanceof Error ? err.message : "Unknown error");
          setStatus("error");
        },
        onMessage: (message: unknown) => {
          console.log("[eleven-test] message:", message);
          const msg = message as Record<string, unknown>;
          const role =
            typeof msg.role === "string" ? msg.role :
            typeof msg.source === "string" ? msg.source : "unknown";
          const text = String(msg.message ?? msg.text ?? "").trim();
          if (!text) return;
          setTranscript((prev) => [...prev, { role, text }]);
        },
      });

      convoRef.current = conversation;
      console.log("[eleven-test] session created");
    } catch (err: unknown) {
      console.error("[eleven-test] start failed:", err);
      setError(err instanceof Error ? err.message : "Failed to start");
      setStatus("error");
    }
  }, [sessionId]);

  const stop = useCallback(async () => {
    try {
      await convoRef.current?.endSession();
    } catch (err) {
      console.error("[eleven-test] stop error:", err);
    }
    convoRef.current = null;
    setStatus("idle");
  }, []);

  const busy = status === "connecting" || status === "connected";

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-2">ElevenLabs Voice Test</h1>
      <p className="mb-6 text-muted-foreground">
        Voice ID: <code className="text-sm bg-muted px-1.5 py-0.5 rounded">{VOICE_ID}</code>
      </p>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Simulation Session ID (optional)</label>
        <input
          type="text"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          placeholder="Leave empty for voice-only test"
          className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
          disabled={busy}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Leave empty to just test the voice. Enter a session ID to test with the buyer persona.
        </p>
      </div>

      <div className="flex gap-3 mb-6">
        {!busy ? (
          <button
            onClick={start}
            className="px-4 py-2 rounded bg-primary text-white flex gap-2 items-center"
          >
            <Mic size={18} />
            Start
          </button>
        ) : status === "connecting" ? (
          <button
            disabled
            className="px-4 py-2 rounded bg-primary text-white flex gap-2 items-center opacity-60"
          >
            <Loader2 className="animate-spin" size={18} />
            Connecting
          </button>
        ) : (
          <button
            onClick={stop}
            className="px-4 py-2 rounded bg-red-600 text-white flex gap-2 items-center"
          >
            <Square size={18} />
            Stop
          </button>
        )}
        {status === "connected" && (
          <span className="text-green-600 flex items-center">● Live</span>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-100 text-red-600 rounded mb-4 text-sm">{error}</div>
      )}

      <div className="space-y-3">
        {transcript.map((item, index) => (
          <div key={index} className="p-3 rounded bg-muted">
            <b className="text-xs uppercase text-muted-foreground">{item.role}</b>
            <p className="mt-1 text-sm">{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}