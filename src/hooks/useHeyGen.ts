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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pendingVideoTrackRef = useRef<any>(null);
  const heygenSessionIdRef = useRef<string | null>(null);
  const llmConfigIdRef = useRef<string | null>(null);
  const initializingRef = useRef(false);
  const audioElementsRef = useRef<HTMLAudioElement[]>([]);

  const [status, setStatus] = useState<HeyGenConnectionStatus>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [audioBlocked, setAudioBlocked] = useState(false);
  let _eventId = 0;
  const nextEventId = () => `ev_${++_eventId}_${Date.now()}`;

  const initialize = useCallback(async (
    simulationSessionId: string,
    avatarId?: string,
    voiceId?: string,
    scenarioId?: string,
    scenarioTable?: string,
  ) => {
    if (initializingRef.current) {
      console.warn("[useHeyGen] initialize already in progress — skipping duplicate call");
      return;
    }
    initializingRef.current = true;
    try {
      setStatus("connecting");
      console.log("[useHeyGen] Step 1: requesting session token…", { simulationSessionId, avatarId, voiceId, scenarioId, scenarioTable });

      // Pre-load livekit-client in parallel with API calls
      const livekitPromise = import("livekit-client");

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
      const { session_id, session_token, llm_config_id } = newJson;

      heygenSessionIdRef.current = session_id;
      if (llm_config_id) llmConfigIdRef.current = llm_config_id;
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

      const { Room, RoomEvent, Track } = await livekitPromise;

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });
      roomRef.current = room;

      // ── Track events ───────────────────────────────────────────────────────
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      room.on(RoomEvent.TrackSubscribed, (track: any, pub: any, participant: any) => {
        console.log("%c[useHeyGen] 🎬 TrackSubscribed", "color:#0af", {
          kind: track.kind,
          sid: track.sid,
          participant: participant?.identity,
          muted: track.isMuted,
          enabled: pub?.isEnabled,
        });
        if (track.kind === Track.Kind.Video) {
          if (videoRef.current) {
            track.attach(videoRef.current);
            console.log("[useHeyGen] ✅ Video attached to ref");
          } else {
            pendingVideoTrackRef.current = track;
            console.log("[useHeyGen] ⏳ Video pending (ref not ready)");
          }
        } else if (track.kind === Track.Kind.Audio) {
          const audioEl = track.attach() as HTMLAudioElement;
          audioEl.volume = 1.0;
          audioEl.muted = false;
          audioEl.autoplay = true;
          document.body.appendChild(audioEl);
          audioElementsRef.current.push(audioEl);
          console.log("[useHeyGen] 🔊 Audio element created:", {
            paused: audioEl.paused,
            muted: audioEl.muted,
            volume: audioEl.volume,
            autoplay: audioEl.autoplay,
            readyState: audioEl.readyState,
            participant: participant?.identity,
          });
          // Monitor actual audio level on the avatar (heygen) track to prove sound is flowing
          try {
            const ms: MediaStream | undefined = track.mediaStream;
            if (ms) {
              const Ctx = window.AudioContext || (window as any).webkitAudioContext;
              const ctx = new Ctx();
              const src = ctx.createMediaStreamSource(ms);
              const analyser = ctx.createAnalyser();
              analyser.fftSize = 512;
              src.connect(analyser);
              const buf = new Uint8Array(analyser.frequencyBinCount);
              const who = participant?.identity ?? "?";
              let lastLog = 0;
              const tick = () => {
                analyser.getByteTimeDomainData(buf);
                let sum = 0;
                for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
                const rms = Math.sqrt(sum / buf.length);
                const now = Date.now();
                if (rms > 0.01 && now - lastLog > 1000) {
                  lastLog = now;
                  console.log(`%c[useHeyGen] 🔊 AUDIO LEVEL ${who}: ${(rms * 100).toFixed(1)}%`, "color:#0ff;font-weight:bold");
                }
                if (audioElementsRef.current.includes(audioEl)) requestAnimationFrame(tick);
              };
              requestAnimationFrame(tick);
            }
          } catch (e) {
            console.warn("[useHeyGen] audio level monitor failed:", e);
          }
          const ensurePlaying = () => {
            if (audioEl.paused) {
              audioEl.play()
                .then(() => console.log("%c[useHeyGen] ✅ audio (re)play succeeded", "color:lime"))
                .catch((e) => console.warn("[useHeyGen] audio play failed:", e.name));
            }
          };
          audioEl.addEventListener("pause", ensurePlaying);
          audioEl.addEventListener("suspend", ensurePlaying);
          audioEl.addEventListener("canplay", ensurePlaying);
          audioEl.play()
            .then(() => console.log("%c[useHeyGen] ✅ audio.play() succeeded", "color:lime"))
            .catch((err) => {
              console.error("%c[useHeyGen] ❌ audio.play() BLOCKED:", "color:red", err.name, err.message);
              const retry = () => {
                audioEl.play()
                  .then(() => console.log("%c[useHeyGen] ✅ audio.play() retry succeeded", "color:lime"))
                  .catch((e2) => console.error("[useHeyGen] retry failed:", e2));
                document.removeEventListener("click", retry);
                document.removeEventListener("mousedown", retry);
              };
              document.addEventListener("click", retry, { once: true });
              document.addEventListener("mousedown", retry, { once: true });
            });
        }
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      room.on(RoomEvent.TrackUnsubscribed, (track: any, _pub: any, participant: any) => {
        console.log("[useHeyGen] TrackUnsubscribed:", track.kind, participant?.identity);
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      room.on(RoomEvent.TrackMuted, (pub: any, participant: any) => {
        console.log("[useHeyGen] TrackMuted:", pub?.kind, participant?.identity);
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      room.on(RoomEvent.TrackUnmuted, (pub: any, participant: any) => {
        console.log("[useHeyGen] TrackUnmuted:", pub?.kind, participant?.identity);
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      room.on(RoomEvent.ParticipantConnected, (p: any) => {
        console.log("[useHeyGen] 👤 ParticipantConnected:", p.identity, "tracks:", p.trackPublications?.size);
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      room.on(RoomEvent.DataReceived, (data: Uint8Array, participant: any) => {
        try {
          const text = new TextDecoder().decode(data);
          let eventType = "";
          try { eventType = JSON.parse(text).event_type ?? ""; } catch { /* not json */ }
          if (eventType.startsWith("agent.")) {
            // Avatar response events — highlight prominently
            console.log("%c[useHeyGen] 🤖 AGENT EVENT: " + eventType, "color:#0f0;font-weight:bold;font-size:14px", text.slice(0, 300));
          } else {
            console.log("%c[useHeyGen] 📦 DataReceived from", "color:#fa0", participant?.identity, text.slice(0, 200));
          }
        } catch { /* binary */ }
      });

      room.on(RoomEvent.Connected, () => {
        console.log("%c[useHeyGen] ✅ LiveKit room connected", "color:lime");
        room.remoteParticipants.forEach((p: any) => {
          console.log("[useHeyGen] existing participant:", p.identity, "tracks:", [...p.trackPublications.values()].map((t: any) => t.kind));
        });
        // Check autoplay status immediately
        if (!room.canPlaybackAudio) {
          console.warn("%c[useHeyGen] ⚠️ Audio playback BLOCKED by browser", "color:orange");
          setAudioBlocked(true);
        }
      });

      room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
        const blocked = !room.canPlaybackAudio;
        console.log("%c[useHeyGen] AudioPlaybackStatusChanged — blocked:", blocked ? "color:red" : "color:lime", blocked);
        setAudioBlocked(blocked);
      });

      room.on(RoomEvent.Disconnected, () => {
        console.warn("[useHeyGen] LiveKit disconnected");
        setStatus("stopped");
        options.onDisconnected?.();
      });

      room.on(RoomEvent.ConnectionStateChanged, (state: string) => {
        console.log("[useHeyGen] LiveKit state:", state);
      });

      await room.connect(livekit_url, livekit_client_token);
      console.log("%c[useHeyGen] LiveKit connect() resolved", "color:lime", {
        participants: room.remoteParticipants.size,
        localId: room.localParticipant?.identity,
      });
      setStatus("connected");
      options.onConnected?.();

      // CONVERSATIONAL mode: enable mic so LiveAvatar hears the user via VAD
      try {
        await room.localParticipant.setMicrophoneEnabled(true);
        console.log("%c[useHeyGen] ✅ mic enabled on connect", "color:lime");
      } catch (e) {
        console.warn("[useHeyGen] mic enable on connect failed:", e);
      }
      // Attempt to start audio immediately (succeeds if user triggered initialization)
      try {
        await room.startAudio();
        console.log("%c[useHeyGen] ✅ room.startAudio() succeeded", "color:lime");
        setAudioBlocked(false);
        // Replay all audio elements now that AudioContext is confirmed running
        for (const el of audioElementsRef.current) {
          if (el.paused) {
            el.play().catch(() => {});
          }
        }
      } catch {
        console.warn("%c[useHeyGen] ⚠️ room.startAudio() blocked — waiting for user gesture", "color:orange");
        setAudioBlocked(true);
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[useHeyGen] init error:", msg);
      setStatus("error");
      initializingRef.current = false;
      options.onError?.(msg);
    }
  }, [options]);


  const sendListening = useCallback((_listening: boolean) => {}, []);

  const startAudio = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    try {
      await room.startAudio();
      setAudioBlocked(false);
      console.log("%c[useHeyGen] ✅ audio unlocked via startAudio()", "color:lime");
    } catch (e) {
      console.error("[useHeyGen] startAudio failed:", e);
    }
  }, []);

  // In CONVERSATIONAL mode: pttStart = unmute mic, pttStop = mute mic
  const pttStart = useCallback(async () => {
    const room = roomRef.current;
    if (room) room.startAudio().then(() => setAudioBlocked(false)).catch(() => {});
    console.log("%c[useHeyGen] 🎙️ mic ON", "color:lime;font-weight:bold");
    try {
      await room?.localParticipant?.setMicrophoneEnabled(true);
      console.log("[useHeyGen] mic unmuted");
    } catch (e) {
      console.warn("[useHeyGen] mic unmute failed:", e);
    }
  }, []);

  const pttStop = useCallback(async () => {
    const room = roomRef.current;
    console.log("%c[useHeyGen] � mic OFF", "color:orange;font-weight:bold");
    try {
      await room?.localParticipant?.setMicrophoneEnabled(false);
      console.log("[useHeyGen] mic muted");
    } catch (e) {
      console.warn("[useHeyGen] mic mute failed:", e);
    }
  }, []);

  const speak = useCallback((_text: string) => {
    // FULL mode: LiveAvatar handles speech via PTT pipeline. speak() is a no-op.
    console.log("[useHeyGen:speak] FULL mode — avatar speaks via LiveAvatar natively");
  }, []);

  const stop = useCallback(async () => {
    initializingRef.current = false;
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    if (llmConfigIdRef.current) {
      fetch("/api/simulation/heygen/new", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ llm_config_id: llmConfigIdRef.current }),
      }).catch(() => {});
      llmConfigIdRef.current = null;
    }

    for (const el of audioElementsRef.current) {
      el.pause();
      el.srcObject = null;
      el.remove();
    }
    audioElementsRef.current = [];

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
    audioBlocked,
    startAudio,
    initialize,
    speak,
    stop,
    attachVideo,
    sendListening,
    pttStart,
    pttStop,
  }), [status, sessionId, audioBlocked, startAudio, initialize, speak, stop, attachVideo, sendListening, pttStart, pttStop]);
}
