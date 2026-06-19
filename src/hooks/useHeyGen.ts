"use client";

import { useRef, useState, useCallback, useMemo } from "react";
import { HeyGenConnectionStatus } from "@/types/simulation";

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}


interface UseHeyGenOptions {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (err: string) => void;
}

export function useHeyGen(options: UseHeyGenOptions = {}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roomRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pendingVideoTrackRef = useRef<any>(null);
  const heygenSessionIdRef = useRef<string | null>(null);

  const [status, setStatus] = useState<HeyGenConnectionStatus>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [avatarMode, setAvatarMode] = useState<"LITE" | "FULL">("LITE");
  const wsReadyRef = useRef(false);  // true once ws sends session.state_updated=connected
  let _eventId = 0;
  const nextEventId = () => `ev_${++_eventId}_${Date.now()}`;

  const initialize = useCallback(async (
    simulationSessionId: string,
    avatarId?: string,
    voiceId?: string,
    scenarioId?: string,
    scenarioTable?: string,
  ) => {
    try {
      setStatus("connecting");
      console.log("[useHeyGen] Step 1: requesting session token…", { simulationSessionId, avatarId, voiceId, scenarioId, scenarioTable });

      const newRes = await fetch("/api/simulation/heygen/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: simulationSessionId,
          avatarId,
          voiceId,
          quality: "low",
          scenarioId,
          scenarioTable,
        }),
      });

      if (!newRes.ok) {
        const errText = await newRes.text();
        console.error("[useHeyGen] Step 1 failed:", newRes.status, errText);
        throw new Error(`heygen/new failed (${newRes.status}): ${errText}`);
      }
      const newJson = await newRes.json();
      console.log("[useHeyGen] Step 1 OK:", newJson);
      const { session_id, session_token, mode } = newJson;
      if (mode) setAvatarMode(mode as "LITE" | "FULL");

      heygenSessionIdRef.current = session_id;
      setSessionId(session_id);

      console.log("[useHeyGen] Step 2: starting session…");
      const connectRes = await fetch("/api/simulation/heygen/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_token }),
      });

      if (!connectRes.ok) {
        const errText = await connectRes.text();
        console.error("[useHeyGen] Step 2 failed:", connectRes.status, errText);
        throw new Error(`heygen/connect failed (${connectRes.status}): ${errText}`);
      }

      const connectJson = await connectRes.json();
      console.log("[useHeyGen] Step 2 OK:", connectJson);
      const { livekit_url, livekit_client_token, ws_url } = connectJson;

      if (!livekit_url || !livekit_client_token) {
        console.error("[useHeyGen] Missing LiveKit credentials:", { livekit_url, livekit_client_token });
        throw new Error("Missing LiveKit credentials from LiveAvatar");
      }
      console.log("[useHeyGen] Step 3: connecting LiveKit…", { livekit_url, hasToken: !!livekit_client_token, ws_url });

      const { Room, RoomEvent, Track } = await import("livekit-client");

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });
      roomRef.current = room;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      room.on(RoomEvent.TrackSubscribed, (track: any) => {
        console.log("[useHeyGen] TrackSubscribed:", track.kind);
        if (track.kind === Track.Kind.Video) {
          if (videoRef.current) {
            track.attach(videoRef.current);
            console.log("[useHeyGen] Video attached to ref");
          } else {
            pendingVideoTrackRef.current = track;
            console.log("[useHeyGen] Video pending (ref not ready)");
          }
        } else if (track.kind === Track.Kind.Audio) {
          const audioEl = track.attach() as HTMLAudioElement;
          audioEl.play().catch(() => {});
          document.body.appendChild(audioEl);
          console.log("[useHeyGen] Audio attached");
        }
      });

      room.on(RoomEvent.Connected, () => {
        console.log("[useHeyGen] LiveKit room connected");
      });

      room.on(RoomEvent.Disconnected, () => {
        console.warn("[useHeyGen] LiveKit disconnected");
        setStatus("stopped");
        options.onDisconnected?.();
      });

      room.on(RoomEvent.ConnectionStateChanged, (state) => {
        console.log("[useHeyGen] LiveKit state:", state);
      });

      await room.connect(livekit_url, livekit_client_token);
      console.log("[useHeyGen] LiveKit connect() resolved");
      setStatus("connected");
      options.onConnected?.();

      // Step 4: connect to ws_url — LiveAvatar expects agent.speak {audio: base64}
      if (ws_url) {
        console.log("[useHeyGen] Step 4: opening ws_url…", ws_url);
        const ws = new WebSocket(ws_url);
        wsRef.current = ws;
        wsReadyRef.current = false;
        ws.onopen = () => console.log("[useHeyGen] WebSocket open (waiting for session.state_updated)");
        ws.onmessage = (evt) => {
          console.log("[useHeyGen] WS message:", String(evt.data).slice(0, 200));
          try {
            const msg = JSON.parse(String(evt.data));
            if (msg.type === "session.state_updated" && msg.state === "connected") {
              wsReadyRef.current = true;
              console.log("[useHeyGen] ✅ WS session connected — agent.speak ready");
            }
          } catch { /* non-JSON frame */ }
        };
        ws.onclose = () => { wsRef.current = null; wsReadyRef.current = false; console.log("[useHeyGen] WebSocket closed"); };
        ws.onerror = (e) => console.warn("[useHeyGen] ws error:", e);
      } else {
        console.warn("[useHeyGen] No ws_url returned — avatar lip-sync unavailable");
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[useHeyGen] init error:", msg);
      setStatus("error");
      options.onError?.(msg);
    }
  }, [options]);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const speakOpenAI = useCallback(async (text: string): Promise<void> => {
    console.log("[useHeyGen:TTS] fetching PCM for:", text.slice(0, 60));
    try {
      const res = await fetch("/api/simulation/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: "onyx" }),
      });
      if (!res.ok) throw new Error(`TTS ${res.status}: ${await res.text()}`);

      const pcmBuffer = await res.arrayBuffer();
      console.log("[useHeyGen:TTS] PCM bytes:", pcmBuffer.byteLength);

      // ── Send PCM chunks via agent.speak → LiveAvatar lip-sync ─────────────
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        const CHUNK = 48000; // 1 s at 24 kHz 16-bit mono
        const bytes = new Uint8Array(pcmBuffer);
        let chunkCount = 0;
        for (let offset = 0; offset < bytes.length; offset += CHUNK) {
          const slice = bytes.slice(offset, offset + CHUNK);
          const b64 = arrayBufferToBase64(slice.buffer);
          ws.send(JSON.stringify({ type: "agent.speak", audio: b64 }));
          chunkCount++;
        }
        const eid = nextEventId();
        ws.send(JSON.stringify({ type: "agent.speak_end", event_id: eid }));
        console.log(`[useHeyGen:TTS] ✅ ${chunkCount} chunk(s) + agent.speak_end (${eid})`);
      } else {
        console.warn("[useHeyGen:TTS] WS not open — readyState:", ws?.readyState ?? "none");
      }

      // Local playback intentionally removed — LiveAvatar echoes the audio back
      // through the LiveKit room audio track. Playing locally would cause double audio.
    } catch (err) {
      console.error("[useHeyGen:TTS] failed, browser TTS fallback:", err);
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.resume();
        const utt = new SpeechSynthesisUtterance(text);
        utt.rate = 0.95;
        const preferred = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith("en") && v.name.includes("Google"));
        if (preferred) utt.voice = preferred;
        window.speechSynthesis.speak(utt);
      }
    }
  }, []);

  const sendListening = useCallback((listening: boolean) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      const type = listening ? "agent.start_listening" : "agent.stop_listening";
      ws.send(JSON.stringify({ type, event_id: nextEventId() }));
      console.log("[useHeyGen] sent:", type);
    }
  }, []);

  const pttStart = useCallback(() => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "user.start_push_to_talk", event_id: nextEventId() }));
      console.log("[useHeyGen] PTT start");
    }
  }, []);

  const pttStop = useCallback(() => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "user.stop_push_to_talk", event_id: nextEventId() }));
      console.log("[useHeyGen] PTT stop");
    }
  }, []);

  const speak = useCallback(async (text: string) => {
    console.log("[useHeyGen:speak] ▶", text.slice(0, 80));
    setStatus("speaking");
    // speakOpenAI sends PCM via agent.speak to ws_url (lip-sync) and plays WAV locally
    await speakOpenAI(text);
    setStatus("connected");
  }, [speakOpenAI]);

  const stop = useCallback(async () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    wsRef.current?.close();
    wsRef.current = null;

    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
    }

    if (heygenSessionIdRef.current) {
      try {
        await fetch("/api/simulation/heygen/stop", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ heygen_session_id: heygenSessionIdRef.current }),
        });
      } catch (e) {
        console.warn("[useHeyGen] stop error:", e);
      }
    }

    heygenSessionIdRef.current = null;
    setSessionId(null);
    setStatus("stopped");
  }, []);

  const attachVideo = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && pendingVideoTrackRef.current) {
      pendingVideoTrackRef.current.attach(el);
      pendingVideoTrackRef.current = null;
    }
  }, []);

  return useMemo(() => ({
    status,
    sessionId,
    avatarMode,
    initialize,
    speak,
    stop,
    attachVideo,
    sendListening,
    pttStart,
    pttStop,
  }), [status, sessionId, avatarMode, initialize, speak, stop, attachVideo, sendListening, pttStart, pttStop]);
}
