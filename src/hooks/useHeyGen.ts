"use client";

import { useRef, useState, useCallback, useMemo } from "react";
import { HeyGenConnectionStatus } from "@/types/simulation";

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
      const { session_id, session_token } = newJson;

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

      // Step 4: connect to ws_url for PUSH_TO_TALK speak commands
      if (ws_url) {
        console.log("[useHeyGen] Step 4: opening ws_url…", ws_url);
        const ws = new WebSocket(ws_url);
        wsRef.current = ws;
        ws.onopen = () => console.log("[useHeyGen] WebSocket open");
        ws.onclose = () => { wsRef.current = null; console.log("[useHeyGen] WebSocket closed"); };
        ws.onerror = (e) => console.warn("[useHeyGen] ws error:", e);
      } else {
        console.warn("[useHeyGen] No ws_url returned — avatar speech may not work");
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[useHeyGen] init error:", msg);
      setStatus("error");
      options.onError?.(msg);
    }
  }, [options]);

  const speak = useCallback(async (text: string) => {
    if (!heygenSessionIdRef.current) return;
    setStatus("speaking");
    console.log("[useHeyGen] speak():", text.slice(0, 60));

    // 1. Send via WebSocket (PUSH_TO_TALK ws_url)
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log("[useHeyGen] Sending via WebSocket");
      wsRef.current.send(JSON.stringify({ type: "speak", text }));
      setStatus("connected");
      return;
    }

    // 2. Fallback: server-side API route
    console.log("[useHeyGen] Falling back to REST speak route");
    try {
      await fetch("/api/simulation/heygen/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heygen_session_id: heygenSessionIdRef.current,
          text,
        }),
      });
    } catch (err) {
      console.warn("[useHeyGen] speak fallback error:", err);
    }
    setStatus("connected");
  }, []);

  const stop = useCallback(async () => {
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
    initialize,
    speak,
    stop,
    attachVideo,
  }), [status, sessionId, initialize, speak, stop, attachVideo]);
}
