"use client";

import { useRef, useState, useCallback } from "react";
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

      // Step 1: server creates LiveAvatar session token (X-API-KEY auth)
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

      if (!newRes.ok) throw new Error(await newRes.text());
      const { session_id, session_token } = await newRes.json();

      heygenSessionIdRef.current = session_id;
      setSessionId(session_id);

      // Step 2: start session (Bearer session_token auth) → get LiveKit credentials
      const connectRes = await fetch("/api/simulation/heygen/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_token }),
      });

      if (!connectRes.ok) throw new Error(await connectRes.text());

      const { livekit_url, livekit_client_token, ws_url } = await connectRes.json();

      // Step 3: connect to LiveKit room using @livekit/client
      if (!livekit_url || !livekit_client_token) {
        throw new Error("Missing LiveKit credentials from LiveAvatar");
      }

      const { Room, RoomEvent, Track } = await import("livekit-client");

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });
      roomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, (track: { kind: string; attach: (el?: HTMLElement) => HTMLVideoElement | HTMLAudioElement }) => {
        if (track.kind === Track.Kind.Video) {
          if (videoRef.current) {
            track.attach(videoRef.current);
          } else {
            pendingVideoTrackRef.current = track;
          }
        } else if (track.kind === Track.Kind.Audio) {
          const audioEl = track.attach() as HTMLAudioElement;
          audioEl.play().catch(() => {});
          document.body.appendChild(audioEl);
        }
      });

      room.on(RoomEvent.Disconnected, () => {
        setStatus("stopped");
        options.onDisconnected?.();
      });

      await room.connect(livekit_url, livekit_client_token);
      setStatus("connected");
      options.onConnected?.();

      // Step 4: connect to ws_url for PUSH_TO_TALK speak commands (if provided)
      if (ws_url) {
        const ws = new WebSocket(ws_url);
        wsRef.current = ws;
        ws.onclose = () => { wsRef.current = null; };
        ws.onerror = (e) => console.warn("[useHeyGen] ws error:", e);
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

    // Send via WebSocket (PUSH_TO_TALK ws_url) if connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "speak", text }));
      setStatus("connected");
      return;
    }

    // Fallback: send via server-side API route
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
    // Close WebSocket
    wsRef.current?.close();
    wsRef.current = null;

    // Disconnect LiveKit room
    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
    }

    // Tell backend to stop the LiveAvatar session
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

  return {
    status,
    sessionId,
    initialize,
    speak,
    stop,
    attachVideo,
  };
}
