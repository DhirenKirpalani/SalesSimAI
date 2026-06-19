"use client";

import { useRef, useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Room, RoomEvent, Track } from "livekit-client";

type Status = "idle" | "connecting" | "connected" | "error";

interface SessionInfo {
  session_id: string;
  livekit_url: string;
  livekit_client_token: string;
  llm_config_id: string | null;
  scenario_name: string;
}

function HeyGenTestInner() {
  const searchParams = useSearchParams();
  const scenarioId = searchParams.get("scenarioId") ?? undefined;
  const scenarioTable = searchParams.get("scenarioTable") ?? undefined;

  const videoRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<Room | null>(null);
  const sessionRef = useRef<SessionInfo | null>(null);
  const audioElemsRef = useRef<HTMLAudioElement[]>([]);

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const addLog = useCallback((msg: string, color?: string) => {
    const entry = color ? `${color}${msg}` : msg;
    console.log("[heygen-test]", msg);
    setLog((prev) => [`[${new Date().toLocaleTimeString()}] ${entry}`, ...prev.slice(0, 99)]);
  }, []);

  const start = useCallback(async () => {
    setStatus("connecting");
    setError(null);
    addLog("Starting LiveAvatar session…");

    try {
      const res = await fetch("/api/heygen-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId, scenarioTable }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Session start failed");

      const info: SessionInfo = json;
      sessionRef.current = info;
      addLog(`✅ Session: ${info.session_id}`);
      if (info.scenario_name && info.scenario_name !== "LiveAvatar Test") addLog(`📋 Scenario: ${info.scenario_name}`);
      addLog(info.llm_config_id ? `✅ LLM config: ${info.llm_config_id}` : "⚠️ No LLM config (localhost — avatar won't respond)");

      const room = new Room();
      roomRef.current = room;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      room.on(RoomEvent.TrackSubscribed, (track: any, _pub: any, participant: any) => {
        addLog(`🎬 Track: ${track.kind} from ${participant?.identity} (muted:${track.isMuted})`);
        if (track.kind === Track.Kind.Video && videoRef.current) {
          track.attach(videoRef.current);
          addLog("✅ Video attached");
        } else if (track.kind === Track.Kind.Audio) {
          const el = track.attach() as HTMLAudioElement;
          el.volume = 1.0;
          el.muted = false;
          document.body.appendChild(el);
          audioElemsRef.current.push(el);
          el.play().catch(() => {});
          addLog(`🔊 Audio element ready (${participant?.identity})`);
        }
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      room.on(RoomEvent.DataReceived, (data: Uint8Array, participant: any) => {
        try {
          const text = new TextDecoder().decode(data);
          let parsed: Record<string, unknown> = {};
          try { parsed = JSON.parse(text); } catch { /* binary */ return; }
          const evType = parsed.event_type as string ?? "";
          if (evType.startsWith("agent.")) {
            addLog(`🤖 AGENT: ${evType} — ${JSON.stringify(parsed).slice(0, 120)}`);
          } else if (evType === "user.transcription") {
            addLog(`🎙️ You said: "${parsed.text}"`);
          } else if (evType.startsWith("user.")) {
            addLog(`👤 ${evType}`);
          } else {
            addLog(`📦 ${participant?.identity}: ${text.slice(0, 100)}`);
          }
        } catch { /* ignore */ }
      });

      room.on(RoomEvent.ConnectionStateChanged, (state: string) => {
        addLog(`LiveKit state: ${state}`);
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      room.on(RoomEvent.LocalTrackPublished, (pub: any) => {
        addLog(`✅ Local track published: ${pub.kind} (sid: ${pub.trackSid}, muted: ${pub.isMuted})`);
        // Attach mic level monitor
        if (pub.kind === "audio" && pub.track?.mediaStream) {
          try {
            const Ctx = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new Ctx();
            const src = ctx.createMediaStreamSource(pub.track.mediaStream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            src.connect(analyser);
            const buf = new Uint8Array(analyser.frequencyBinCount);
            let lastLog = 0;
            const tick = () => {
              analyser.getByteTimeDomainData(buf);
              let sum = 0;
              for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
              const rms = Math.sqrt(sum / buf.length);
              if (rms > 0.02 && Date.now() - lastLog > 1500) {
                lastLog = Date.now();
                addLog(`🎤 Mic level: ${(rms * 100).toFixed(1)}% — LiveAvatar HEARS you`);
              }
              if (roomRef.current) requestAnimationFrame(tick);
              else ctx.close();
            };
            requestAnimationFrame(tick);
            addLog("🎤 Mic level monitor active — speak to confirm");
          } catch { /* no analyser */ }
        }
      });

      room.on(RoomEvent.Disconnected, () => {
        addLog("❌ Room disconnected");
        setStatus("idle");
        setMicOn(false);
      });

      await room.connect(info.livekit_url, info.livekit_client_token);
      addLog("✅ LiveKit connected");

      // Request mic permission explicitly first
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop()); // just checking permission
        addLog("✅ Mic permission granted");
      } catch (permErr) {
        addLog("❌ Mic permission DENIED: " + (permErr instanceof Error ? permErr.message : String(permErr)));
        throw new Error("Microphone permission denied — please allow mic access in browser");
      }

      await room.localParticipant.setMicrophoneEnabled(true);
      setMicOn(true);

      // Verify the track was actually published
      const pubs = [...room.localParticipant.trackPublications.values()];
      const micPub = pubs.find((p: any) => p.kind === "audio");
      addLog(micPub
        ? `✅ Mic published (track: ${micPub.trackSid ?? "pending"}, muted: ${micPub.isMuted})`
        : "⚠️ Mic publish not found — check browser permissions"
      );

      try {
        await room.startAudio();
        addLog("✅ Audio context started");
        for (const el of audioElemsRef.current) {
          if (el.paused) el.play().catch(() => {});
        }
      } catch {
        addLog("⚠️ Audio blocked — tap the mic button to unlock");
      }

      setStatus("connected");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setStatus("error");
      addLog("❌ " + msg);
    }
  }, [addLog]);

  const toggleMic = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    // Also unlock audio on gesture
    room.startAudio().catch(() => {});
    for (const el of audioElemsRef.current) {
      if (el.paused) el.play().catch(() => {});
    }
    const next = !micOn;
    await room.localParticipant.setMicrophoneEnabled(next);
    setMicOn(next);
    addLog(next ? "🎙️ Mic ON" : "🔇 Mic OFF");
  }, [micOn, addLog]);

  const stop = useCallback(async () => {
    const room = roomRef.current;
    if (room) {
      await room.disconnect();
      roomRef.current = null;
    }
    for (const el of audioElemsRef.current) {
      el.pause(); el.srcObject = null; el.remove();
    }
    audioElemsRef.current = [];
    const info = sessionRef.current;
    if (info) {
      fetch("/api/heygen-test", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: info.session_id, llm_config_id: info.llm_config_id }),
      }).catch(() => {});
      sessionRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("idle");
    setMicOn(false);
    addLog("Session stopped");
  }, [addLog]);

  // Cleanup on unmount
  useEffect(() => () => { stop(); }, [stop]);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
        <h1 className="text-2xl font-bold">LiveAvatar Test</h1>
        {scenarioId && <p className="text-sm text-gray-400 mt-0.5">Scenario: {sessionRef.current?.scenario_name ?? scenarioId}</p>}
      </div>
        <span className={`text-xs px-3 py-1 rounded-full font-medium ${
          status === "connected" ? "bg-green-700" :
          status === "connecting" ? "bg-yellow-700" :
          status === "error" ? "bg-red-700" : "bg-gray-700"
        }`}>{status}</span>
      </div>

      {/* Video */}
      <div className="relative w-full max-w-2xl aspect-video bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 mx-auto">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
        {status !== "connected" && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
            {status === "connecting" ? "Connecting to LiveAvatar…" :
             status === "error" ? "Connection failed" : "Press Start to begin"}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="max-w-2xl mx-auto w-full bg-red-900/40 border border-red-700 text-red-300 px-4 py-3 rounded-xl text-sm break-all">
          {error}
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-3 max-w-2xl mx-auto w-full">
        {status === "idle" || status === "error" ? (
          <button onClick={start} className="flex-1 bg-blue-600 hover:bg-blue-500 font-semibold py-3 rounded-xl transition-colors">
            🚀 Start Call
          </button>
        ) : status === "connecting" ? (
          <button disabled className="flex-1 bg-gray-700 text-gray-400 font-semibold py-3 rounded-xl cursor-not-allowed">
            Connecting…
          </button>
        ) : (
          <>
            <button
              onClick={toggleMic}
              className={`flex-1 font-semibold py-3 rounded-xl transition-colors ${micOn ? "bg-green-700 hover:bg-green-600" : "bg-gray-700 hover:bg-gray-600"}`}
            >
              {micOn ? "🎙️ Mic ON (tap to mute)" : "🔇 Mic OFF (tap to unmute)"}
            </button>
            <button onClick={stop} className="px-6 bg-red-800 hover:bg-red-700 font-semibold rounded-xl transition-colors">
              End
            </button>
          </>
        )}
      </div>

      {/* Instructions */}
      {status === "connected" && (
        <p className="text-center text-sm text-gray-400 max-w-2xl mx-auto">
          {sessionRef.current?.llm_config_id
            ? "Speak naturally — LiveAvatar will respond after you pause."
            : "⚠️ Running locally without LLM config. Avatar hears you but won't respond. Deploy to prod for full experience."}
        </p>
      )}

      {/* Log */}
      <div className="max-w-2xl mx-auto w-full">
        <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Live Log</p>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 h-64 overflow-y-auto font-mono text-xs text-gray-300 flex flex-col gap-0.5">
          {log.length === 0 && <span className="text-gray-600">Waiting…</span>}
          {log.map((l, i) => (
            <span key={i} className={l.includes("AGENT") ? "text-green-400 font-bold" : l.includes("❌") ? "text-red-400" : l.includes("✅") ? "text-green-300" : ""}>{l}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HeyGenTestPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950" />}>
      <HeyGenTestInner />
    </Suspense>
  );
}
