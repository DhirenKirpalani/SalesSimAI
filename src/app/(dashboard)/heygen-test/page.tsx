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

interface TranscriptEntry {
  role: "avatar" | "user";
  text: string;
  time: string;
}

interface FeedbackResult {
  overall_score: number;
  breakdown: {
    metrics: number;
    economic_buyer: number;
    decision_criteria: number;
    decision_process: number;
    identify_pain: number;
    champion: number;
  };
  strengths: string[];
  weaknesses: string[];
  missed_opportunities: string[];
  coaching_recommendations: string[];
}

function HeyGenTestInner() {
  const searchParams = useSearchParams();
  const scenarioId = searchParams.get("scenarioId") ?? undefined;
  const scenarioTable = searchParams.get("scenarioTable") ?? undefined;

  const videoRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<Room | null>(null);
  const sessionRef = useRef<SessionInfo | null>(null);
  const audioElemsRef = useRef<HTMLAudioElement[]>([]);
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [logOpen, setLogOpen] = useState(false);
  const [resolvedScenarioName, setResolvedScenarioName] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [feedback, setFeedback] = useState<FeedbackResult | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const addLog = useCallback((msg: string) => {
    console.log("[heygen-test]", msg);
    setLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 99)]);
  }, []);

  const addTranscript = useCallback((role: "avatar" | "user", text: string) => {
    const entry: TranscriptEntry = { role, text, time: new Date().toLocaleTimeString() };
    transcriptRef.current = [...transcriptRef.current, entry];
    setTranscript((prev) => [...prev, entry]);
  }, []);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  const start = useCallback(async () => {
    setStatus("connecting");
    setError(null);
    setTranscript([]);
    setFeedback(null);
    transcriptRef.current = [];
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
      if (info.scenario_name && info.scenario_name !== "LiveAvatar Test") {
        setResolvedScenarioName(info.scenario_name);
        addLog(`📋 Scenario: ${info.scenario_name}`);
      }
      addLog(`✅ Session: ${info.session_id}`);
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
          const evType = (parsed.event_type as string) ?? "";

          if (evType === "avatar.speak_started") {
            addLog(`🤖 AVATAR speaking…`);
          } else if (evType === "avatar.speak_ended") {
            addLog(`🤖 AVATAR done speaking`);
          } else if (evType === "avatar.transcription") {
            const avatarText = String(parsed.text ?? parsed.message ?? "").trim();
            if (avatarText) { addTranscript("avatar", avatarText); addLog(`🤖 Avatar said: "${avatarText.slice(0, 60)}"`); }
          } else if (evType === "avatar.transcription.chunk") {
            // suppress — full transcription event has the complete text
          } else if (evType.startsWith("agent.")) {
            addLog(`🤖 ${evType}`);
          } else if (evType === "user.transcription") {
            const userText = String(parsed.text ?? "").trim();
            if (userText) { addTranscript("user", userText); addLog(`🎙️ You said: "${userText}"`); }
          } else if (evType.startsWith("user.")) {
            addLog(`👤 ${evType}`);
          } else if (evType) {
            addLog(`📦 ${evType}: ${JSON.stringify(parsed).slice(0, 80)}`);
          } else {
            addLog(`📦 ${participant?.identity}: ${text.slice(0, 80)}`);
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
      setTimeLeft(300);
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t === null || t <= 1) return 0;
          return t - 1;
        });
      }, 1000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setStatus("error");
      addLog("❌ " + msg);
    }
  }, [addLog, addTranscript, scenarioId, scenarioTable]);

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
        body: JSON.stringify({ session_id: info.session_id }),
      }).catch(() => {});
      sessionRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setTimeLeft(null);
    setStatus("idle");
    setMicOn(false);
    addLog("Session stopped");
  }, [addLog]);

  const handleEnd = useCallback(async () => {
    const currentTranscript = [...transcriptRef.current];
    await stop();
    if (currentTranscript.length >= 2) {
      setFeedbackLoading(true);
      try {
        const res = await fetch("/api/heygen-test/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: currentTranscript, scenarioName: resolvedScenarioName ?? "LiveAvatar Test" }),
        });
        setFeedback(await res.json());
      } catch { /* ignore */ }
      finally { setFeedbackLoading(false); }
    }
  }, [stop, resolvedScenarioName]);

  // Auto-end when timer hits 0
  useEffect(() => {
    if (timeLeft === 0) handleEnd();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  // Cleanup on unmount
  useEffect(() => () => { stop(); }, [stop]);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between max-w-4xl mx-auto w-full">
        <div>
          <h1 className="text-2xl font-bold">Simulation</h1>
          {scenarioId && <p className="text-sm text-gray-400 mt-0.5">Scenario: {resolvedScenarioName ?? scenarioId}</p>}
        </div>
        <div className="flex items-center gap-3">
          {timeLeft !== null && (
            <span className={`text-sm font-mono font-bold ${
              timeLeft <= 30 ? "text-red-400" : timeLeft <= 60 ? "text-yellow-400" : "text-green-400"
            }`}>
              {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:{String(timeLeft % 60).padStart(2, "0")}
            </span>
          )}
          <span className={`text-xs px-3 py-1 rounded-full font-medium ${
            status === "connected" ? "bg-green-700" :
            status === "connecting" ? "bg-yellow-700" :
            status === "error" ? "bg-red-700" : "bg-gray-700"
          }`}>{status}</span>
        </div>
      </div>

      {/* Video + Transcript */}
      <div className="flex flex-col lg:flex-row gap-4 max-w-4xl mx-auto w-full">
        {/* Video */}
        <div className="relative w-full lg:w-1/2 aspect-video bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 shrink-0">
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          {status !== "connected" && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
              {status === "connecting" ? "Connecting to LiveAvatar…" :
               status === "error" ? "Connection failed" : "Press Start to begin"}
            </div>
          )}
        </div>

        {/* Transcript */}
        <div className="w-full lg:w-1/2 flex flex-col gap-2">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Conversation</p>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex-1 min-h-[200px] max-h-[320px] overflow-y-auto flex flex-col gap-3">
            {transcript.length === 0 ? (
              <p className="text-gray-600 text-sm text-center mt-6">
                {status === "connected" ? "Speak to start the conversation…" : "Transcript will appear here after you start."}
              </p>
            ) : (
              transcript.map((entry, i) => (
                <div key={i} className={`flex flex-col ${entry.role === "user" ? "items-end" : "items-start"}`}>
                  <span className="text-[10px] text-gray-500 mb-0.5 px-1">
                    {entry.role === "user" ? "You" : (resolvedScenarioName ? "Buyer" : "Avatar")} · {entry.time}
                  </span>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                    entry.role === "user"
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-gray-700 text-gray-100 rounded-bl-sm"
                  }`}>
                    {entry.text}
                  </div>
                </div>
              ))
            )}
            <div ref={transcriptEndRef} />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="max-w-4xl mx-auto w-full bg-red-900/40 border border-red-700 text-red-300 px-4 py-3 rounded-xl text-sm break-all">
          {error}
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-3 max-w-4xl mx-auto w-full">
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
            <button onClick={handleEnd} className="px-6 bg-red-800 hover:bg-red-700 font-semibold rounded-xl transition-colors">
              End
            </button>
          </>
        )}
      </div>

      {/* Instructions */}
      {status === "connected" && (
        <p className="text-center text-sm text-gray-400 max-w-4xl mx-auto">
          {sessionRef.current?.llm_config_id
            ? "Speak naturally — LiveAvatar will respond after you pause."
            : "⚠️ Running locally without LLM config. Avatar hears you but won't respond. Deploy to prod for full experience."}
        </p>
      )}

      {/* Post-call Feedback */}
      {(feedbackLoading || feedback) && (
        <div className="max-w-4xl mx-auto w-full bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">MEDDIC Analysis</h2>
            {feedback && (
              <span className={`text-2xl font-bold ${
                feedback.overall_score >= 70 ? "text-green-400" : feedback.overall_score >= 40 ? "text-yellow-400" : "text-red-400"
              }`}>{feedback.overall_score}<span className="text-base text-gray-500">/100</span></span>
            )}
          </div>
          {feedbackLoading && <p className="text-gray-400 text-sm animate-pulse">Analyzing your call with MEDDIC framework…</p>}
          {feedback && (
            <>
              {/* MEDDIC Breakdown Grid */}
              {feedback.breakdown && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {([
                    { key: "metrics", label: "Metrics" },
                    { key: "economic_buyer", label: "Economic Buyer" },
                    { key: "decision_criteria", label: "Decision Criteria" },
                    { key: "decision_process", label: "Decision Process" },
                    { key: "identify_pain", label: "Identify Pain" },
                    { key: "champion", label: "Champion" },
                  ] as { key: keyof FeedbackResult["breakdown"]; label: string }[]).map(({ key, label }) => {
                    const val = feedback.breakdown[key];
                    return (
                      <div key={key} className="bg-gray-800/60 rounded-xl p-3 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-gray-400 font-medium">{label}</span>
                          <span className={`text-sm font-bold ${
                            val >= 70 ? "text-green-400" : val >= 40 ? "text-yellow-400" : "text-red-400"
                          }`}>{val}</span>
                        </div>
                        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              val >= 70 ? "bg-green-500" : val >= 40 ? "bg-yellow-500" : "bg-red-500"
                            }`}
                            style={{ width: `${val}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {feedback.strengths?.length > 0 && (
                <div>
                  <p className="text-xs text-green-400 font-semibold uppercase tracking-wide mb-1.5">✅ Strengths</p>
                  {feedback.strengths.map((s, i) => <p key={i} className="text-sm text-gray-300 ml-1">• {s}</p>)}
                </div>
              )}
              {feedback.weaknesses?.length > 0 && (
                <div>
                  <p className="text-xs text-yellow-400 font-semibold uppercase tracking-wide mb-1.5">⚠️ Weaknesses</p>
                  {feedback.weaknesses.map((w, i) => <p key={i} className="text-sm text-gray-300 ml-1">• {w}</p>)}
                </div>
              )}
              {feedback.missed_opportunities?.length > 0 && (
                <div>
                  <p className="text-xs text-orange-400 font-semibold uppercase tracking-wide mb-1.5">🔍 Missed Opportunities</p>
                  {feedback.missed_opportunities.map((m, i) => <p key={i} className="text-sm text-gray-300 ml-1">• {m}</p>)}
                </div>
              )}
              {feedback.coaching_recommendations?.length > 0 && (
                <div className="bg-blue-950/50 border border-blue-700/40 rounded-xl px-4 py-3">
                  <p className="text-xs text-blue-400 font-semibold uppercase tracking-wide mb-2">💡 Coaching Recommendations</p>
                  {feedback.coaching_recommendations.map((r, i) => <p key={i} className="text-sm text-gray-200 ml-1">• {r}</p>)}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Debug Log (collapsible) */}
      <div className="max-w-4xl mx-auto w-full">
        <button
          onClick={() => setLogOpen((o) => !o)}
          className="text-xs text-gray-600 hover:text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1 transition-colors"
        >
          {logOpen ? "▼" : "▶"} Debug Log
        </button>
        {logOpen && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 h-48 overflow-y-auto font-mono text-xs text-gray-300 flex flex-col gap-0.5">
            {log.length === 0 && <span className="text-gray-600">Waiting…</span>}
            {log.map((l, i) => (
              <span key={i} className={l.includes("❌") ? "text-red-400" : l.includes("✅") ? "text-green-300" : ""}>{l}</span>
            ))}
          </div>
        )}
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
