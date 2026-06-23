"use client";

import { useRef, useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Room, RoomEvent, Track } from "livekit-client";
import { createClient } from "@/lib/supabase/client";

type Status = "idle" | "connecting" | "connected" | "paused" | "error";

interface SessionInfo {
  session_id: string;
  livekit_url: string;
  livekit_client_token: string;
  llm_config_id: string | null;
  scenario_name: string;
  heygen_session_db_id?: string | null;
  duration_min?: number;
}

interface TranscriptEntry {
  role: "avatar" | "user";
  text: string;
  time: string;
}

interface CoachingMoment {
  buyer_quote: string;
  signal: string;
  what_they_should_have_said: string;
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
  coaching_moments?: CoachingMoment[];
}

function HeyGenTestInner() {
  const searchParams = useSearchParams();
  const scenarioId = searchParams.get("scenarioId") ?? undefined;
  const scenarioTable = searchParams.get("scenarioTable") ?? undefined;
  const avatarId = searchParams.get("avatarId") ?? undefined;
  const voiceId = searchParams.get("voiceId") ?? undefined;
  const scenarioNameParam = searchParams.get("scenarioName") ?? undefined;
  const avatarNameParam = searchParams.get("avatarName") ?? undefined;

  const videoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const roomRef = useRef<Room | null>(null);
  const sessionRef = useRef<SessionInfo | null>(null);
  const audioElemsRef = useRef<HTMLAudioElement[]>([]);
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeLeftRef = useRef<number | null>(null);
  const resumeTimeLeftRef = useRef<number | null>(null);
  const heygenSessionDbIdRef = useRef<string | null>(null);
  const startedAtRef = useRef<string | null>(null);
  const defaultDurationRef = useRef<number>(300); // seconds, default 5 min

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [logOpen, setLogOpen] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [resolvedScenarioName, setResolvedScenarioName] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [feedback, setFeedback] = useState<FeedbackResult | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [avatarImageUrl, setAvatarImageUrl] = useState<string | null>(null);

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

  useEffect(() => {
    const resolveAvatarId = avatarId ?? scenarioId;
    if (!resolveAvatarId) return;
    fetch(`/api/heygen-test/avatars?page=1&page_size=100`)
      .then((r) => r.json())
      .then((data) => {
        const match = (data.avatars ?? []).find((a: { id: string; preview_image_url: string | null }) => a.id === avatarId);
        if (match?.preview_image_url) setAvatarImageUrl(match.preview_image_url);
      })
      .catch(() => { /* ignore */ });
  }, [avatarId, scenarioId]);

  const start = useCallback(async () => {
    const isResume = resumeTimeLeftRef.current !== null;
    setStatus("connecting");
    setError(null);
    if (!isResume) {
      setTranscript([]);
      setFeedback(null);
      transcriptRef.current = [];
    }
    addLog(isResume ? "Resuming LiveAvatar session…" : "Starting LiveAvatar session…");

    try {
      // Fetch seller identity from user profile
      let sellerName = "the seller";
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        sellerName = user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "the seller";
      } catch { /* ignore auth errors, fallback to generic */ }

      const previousTranscript = isResume && transcriptRef.current.length > 0
        ? transcriptRef.current.map((t) => `${t.role === "user" ? sellerName : t.role}: ${t.text}`).join("\n")
        : undefined;

      const res = await fetch("/api/heygen-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId, scenarioTable, sellerName, previousTranscript, avatarId, voiceId }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Session start failed");

      const info: SessionInfo = json;
      sessionRef.current = info;
      heygenSessionDbIdRef.current = info.heygen_session_db_id ?? null;
      startedAtRef.current = new Date().toISOString();
      if (info.duration_min) {
        defaultDurationRef.current = info.duration_min * 60;
        addLog(`⏱️ Call duration: ${info.duration_min} min`);
      }
      // Persist to localStorage so end-of-call cleanup survives refreshes
      if (heygenSessionDbIdRef.current) {
        localStorage.setItem("heygen-active-session", JSON.stringify({
          heygenSessionDbId: heygenSessionDbIdRef.current,
          startedAt: startedAtRef.current,
        }));
      }
      if (info.scenario_name && info.scenario_name !== "LiveAvatar Test" && info.scenario_name !== "Simulation") {
        setResolvedScenarioName(info.scenario_name);
        addLog(`📋 Scenario: ${info.scenario_name}`);
      }
      addLog(`✅ Session: ${info.session_id}`);
      addLog(info.llm_config_id ? `✅ LLM config: ${info.llm_config_id}` : "⚠️ No LLM config (localhost — avatar won't respond)");

      const room = new Room();
      roomRef.current = room;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // Start recording local camera + mic when connected
      const startRecording = () => {
        const stream = localStreamRef.current;
        if (!stream) return;
        const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
          ? "video/webm;codecs=vp9,opus"
          : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
            ? "video/webm;codecs=vp8,opus"
            : "video/webm";
        recordedChunksRef.current = [];
        try {
          const recorder = new MediaRecorder(stream, { mimeType });
          recorderRef.current = recorder;
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) recordedChunksRef.current.push(e.data);
          };
          recorder.start(1000); // collect chunks every 1s
          addLog("⏺️ Recording started");
        } catch (err) {
          addLog("⚠️ Recording failed: " + String(err));
        }
      };

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
      const startTime = resumeTimeLeftRef.current ?? defaultDurationRef.current;
      resumeTimeLeftRef.current = null;
      setTimeLeft(startTime);
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t === null || t <= 1) return 0;
          return t - 1;
        });
      }, 1000);

      // Auto-turn on camera and start recording for coaching review
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        setCameraOn(true);
        addLog("Camera ON (for recording)");
        startRecording();
      } catch {
        addLog("Camera not available — recording skipped");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setStatus("error");
      addLog("❌ " + msg);
    }
  }, [addLog, addTranscript, scenarioId, scenarioTable, avatarId]);

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
        body: JSON.stringify({ session_id: info.session_id, heygen_session_db_id: heygenSessionDbIdRef.current }),
      }).catch(() => {});
      sessionRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setTimeLeft(null);
    setStatus("idle");
    setMicOn(false);
    localStorage.removeItem("heygen-active-session");
    addLog("Session stopped");
    // Stop recording
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
      addLog("⏹️ Recording stopped");
    }
    recorderRef.current = null;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setCameraOn(false);
    setTranscriptOpen(false);
  }, [addLog]);

  const pause = useCallback(async () => {
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
        body: JSON.stringify({ session_id: info.session_id, heygen_session_db_id: heygenSessionDbIdRef.current }),
      }).catch(() => {});
      sessionRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    resumeTimeLeftRef.current = timeLeftRef.current; // preserve remaining time for resume
    setStatus("paused");
    setMicOn(false);
    addLog("⏸️ Session paused");
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
      addLog("⏹️ Recording paused");
    }
    recorderRef.current = null;
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setCameraOn(false);
  }, [addLog]);

  const toggleCamera = useCallback(async () => {
    if (cameraOn) {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      setCameraOn(false);
      addLog("Camera OFF");
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        setCameraOn(true);
        addLog("Camera ON");
      } catch (e) {
        addLog("Camera access denied");
      }
    }
  }, [cameraOn, addLog]);

  const handleEnd = useCallback(async () => {
    const currentTranscript = [...transcriptRef.current];
    const recordedChunks = [...recordedChunksRef.current];
    await stop();

    // Upload recording if available
    if (recordedChunks.length > 0 && heygenSessionDbIdRef.current) {
      try {
        const blob = new Blob(recordedChunks, { type: "video/webm" });
        const fileName = `${heygenSessionDbIdRef.current}.webm`;
        const supabase = createClient();
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from("session-recordings")
          .upload(fileName, blob, { contentType: "video/webm", upsert: true });
        if (!uploadErr && uploadData) {
          const { data: { publicUrl } } = supabase.storage.from("session-recordings").getPublicUrl(fileName);
          await supabase.from("heygen_sessions").update({ video_url: publicUrl }).eq("id", heygenSessionDbIdRef.current);
          addLog(`📹 Recording uploaded`);
        } else {
          addLog("⚠️ Upload failed: " + (uploadErr?.message ?? "unknown"));
        }
      } catch (e) {
        addLog("⚠️ Recording upload error: " + String(e));
      }
    }

    if (currentTranscript.length >= 2) {
      setFeedbackLoading(true);
      try {
        const res = await fetch("/api/heygen-test/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
          transcript: currentTranscript,
          scenarioName: resolvedScenarioName ?? "Simulation",
          heygenSessionId: heygenSessionDbIdRef.current,
          startedAt: startedAtRef.current,
        }),
        });
        setFeedback(await res.json());
      } catch { /* ignore */ }
      finally { setFeedbackLoading(false); }
    }
  }, [stop, resolvedScenarioName, addLog]);

  // Restore active session refs from localStorage after refresh
  useEffect(() => {
    try {
      const stored = localStorage.getItem("heygen-active-session");
      if (stored) {
        const parsed = JSON.parse(stored) as { heygenSessionDbId: string; startedAt: string };
        heygenSessionDbIdRef.current = parsed.heygenSessionDbId;
        startedAtRef.current = parsed.startedAt;
      }
    } catch { /* ignore */ }
  }, []);

  // Auto-end when timer hits 0
  useEffect(() => {
    if (timeLeft === 0) handleEnd();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  // Keep timeLeftRef in sync so pause can read current value
  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  // Cleanup on unmount
  useEffect(() => () => { stop(); }, [stop]);

  return (
    <div className="h-full bg-[#0B0E14] text-white flex flex-col overflow-hidden -m-4 lg:-m-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-[#0B0E14]/90 backdrop-blur-sm z-20 shrink-0">
        <div className="flex items-center gap-2.5">
          <p className="text-sm font-semibold leading-none">
            {resolvedScenarioName ?? scenarioNameParam ?? "Simulation"}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {(status === "connected" || status === "connecting") && timeLeft !== null && (
            <div className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
              timeLeft <= 30 ? "bg-red-500/10 text-red-400" :
              timeLeft <= 60 ? "bg-yellow-500/10 text-yellow-400" :
              "bg-green-500/10 text-green-400"
            }`}>
              {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:{String(timeLeft % 60).padStart(2, "0")}
            </div>
          )}
          {status === "connected" && (
            <div className="flex items-center gap-1 text-[10px] text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live
            </div>
          )}
        </div>
      </div>

      {/* Main Call Area — video fills the entire space */}
      <div className="flex-1 relative overflow-hidden">
        <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-contain" />

        {/* Idle / Connecting Overlay */}
        {status !== "connected" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0B0E14]">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-full mx-auto ring-1 ring-white/10 overflow-hidden bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                {avatarImageUrl ? (
                  <img src={avatarImageUrl} alt={avatarNameParam ?? "Avatar"} className="w-full h-full object-cover object-top" />
                ) : (
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-gray-300 font-medium">
                  {status === "connecting" ? `Connecting to ${avatarNameParam ?? "avatar"}…` :
                   status === "error" ? "Connection failed" :
                   status === "paused" ? "Session paused" :
                   "Ready to practice"}
                </p>
                {resolvedScenarioName && (
                  <p className="text-xs text-gray-500 mt-1">{resolvedScenarioName}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Local Camera PiP */}
        <div className={`absolute bottom-20 right-4 rounded-lg overflow-hidden border border-white/10 shadow-lg transition-all z-10 ${
          cameraOn ? "w-36 h-24 opacity-100" : "w-0 h-0 opacity-0 border-0"
        }`}>
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover bg-black" />
        </div>

        {/* Floating Transcript Panel */}
        <div className={`absolute top-3 right-3 bottom-20 w-72 rounded-xl border border-white/10 bg-black/70 backdrop-blur-md flex flex-col transition-all z-10 ${
          transcriptOpen ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 pointer-events-none"
        }`}>
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 shrink-0">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Conversation</p>
            <button onClick={() => setTranscriptOpen(false)} className="text-gray-500 hover:text-white">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 min-h-0">
            {transcript.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-gray-500 text-xs text-center">
                  {status === "connected" ? "Speak to start…" : "Conversation will appear here."}
                </p>
              </div>
            ) : (
              transcript.map((entry, i) => (
                <div key={i} className={`flex flex-col ${entry.role === "user" ? "items-end" : "items-start"}`}>
                  <span className="text-[9px] text-gray-500 mb-0.5 px-1">
                    {entry.role === "user" ? "You" : "Buyer"} · {entry.time}
                  </span>
                  <div className={`max-w-[92%] rounded-xl px-2.5 py-1.5 text-xs leading-relaxed ${
                    entry.role === "user"
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-[#1E293B] text-gray-100 rounded-bl-sm"
                  }`}>
                    {entry.text}
                  </div>
                </div>
              ))
            )}
            <div ref={transcriptEndRef} />
          </div>
        </div>

        {/* Transcript Toggle */}
        <button
          onClick={() => setTranscriptOpen((o) => !o)}
          className={`absolute top-3 right-3 flex items-center gap-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/15 rounded-full px-3 py-1.5 text-xs font-medium text-white transition-all z-10 ${
            transcriptOpen ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
          title="View transcript"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z" />
          </svg>
          Transcript
        </button>
      </div>

      {/* Floating Control Bar */}
      <div className="flex items-center justify-center gap-2 pb-3 pt-1.5 px-4 shrink-0">
        {status === "idle" || status === "error" ? (
          <button onClick={start} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-3 rounded-full shadow-lg shadow-blue-900/30 transition-all hover:scale-105 active:scale-95">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Start Call
          </button>
        ) : status === "connecting" ? (
          <div className="flex items-center gap-2 bg-gray-700/50 text-gray-400 px-8 py-3 rounded-full">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Connecting…
          </div>
        ) : status === "paused" ? (
          <div className="flex items-center gap-2">
            <button onClick={start} className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold px-6 py-2.5 rounded-full shadow-lg shadow-green-900/30 transition-all hover:scale-105 active:scale-95">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Resume
            </button>
            <button onClick={handleEnd} className="w-10 h-10 rounded-full bg-red-500/90 text-white flex items-center justify-center hover:bg-red-600 transition-all hover:scale-105 active:scale-95" title="End call">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" /></svg>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={toggleMic} className={`w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
              micOn ? "bg-gray-700/80 text-white" : "bg-red-500/90 text-white"
            }`} title={micOn ? "Mute" : "Unmute"}>
              {micOn ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
              )}
            </button>
            <button onClick={toggleCamera} className={`w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
              cameraOn ? "bg-gray-700/80 text-white" : "bg-gray-700/40 text-gray-400"
            }`} title={cameraOn ? "Turn off camera" : "Turn on camera"}>
              {cameraOn ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" /></svg>
              )}
            </button>
            <button onClick={pause} className="w-11 h-11 rounded-full bg-yellow-500/90 text-white flex items-center justify-center hover:bg-yellow-600 transition-all hover:scale-105 active:scale-95" title="Pause session">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </button>
            <button onClick={handleEnd} className="w-11 h-11 rounded-full bg-red-500/90 text-white flex items-center justify-center hover:bg-red-600 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-red-900/20" title="End call">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" /></svg>
            </button>
          </div>
        )}
      </div>

      {/* Error Toast */}
      {error && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 bg-red-900/90 border border-red-700/50 text-red-200 px-5 py-3 rounded-xl text-sm shadow-xl z-50 backdrop-blur-sm">
          {error}
        </div>
      )}

      {/* Post-call Feedback Modal */}
      {(feedbackLoading || feedback) && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => { setFeedback(null); setFeedbackLoading(false); }}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] bg-[#111827] border border-white/5 rounded-2xl p-5 flex flex-col gap-4 shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-base">MEDDIC Analysis</h2>
              <div className="flex items-center gap-3">
                {feedback && (
                  <span className={`text-xl font-bold ${
                    feedback.overall_score >= 70 ? "text-green-400" : feedback.overall_score >= 40 ? "text-yellow-400" : "text-red-400"
                  }`}>{feedback.overall_score}<span className="text-sm text-gray-500">/100</span></span>
                )}
                <button
                  onClick={() => { setFeedback(null); setFeedbackLoading(false); }}
                  className="text-gray-500 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            {feedbackLoading && <p className="text-gray-400 text-sm animate-pulse">Analyzing your call with MEDDIC framework…</p>}
            {feedback && (
              <>
                {feedback.breakdown && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {([
                      { key: "metrics", label: "Metrics" },
                      { key: "economic_buyer", label: "Econ Buyer" },
                      { key: "decision_criteria", label: "Criteria" },
                      { key: "decision_process", label: "Process" },
                      { key: "identify_pain", label: "Pain" },
                      { key: "champion", label: "Champion" },
                    ] as { key: keyof FeedbackResult["breakdown"]; label: string }[]).map(({ key, label }) => {
                      const val = feedback.breakdown[key];
                      return (
                        <div key={key} className="bg-gray-800/40 rounded-lg p-2 flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-400 font-medium">{label}</span>
                            <span className={`text-xs font-bold ${val >= 70 ? "text-green-400" : val >= 40 ? "text-yellow-400" : "text-red-400"}`}>{val}</span>
                          </div>
                          <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${val >= 70 ? "bg-green-500" : val >= 40 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${val}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {feedback.strengths?.length > 0 && (
                    <div>
                      <p className="text-[10px] text-green-400 font-semibold uppercase tracking-wide mb-1">Strengths</p>
                      {feedback.strengths.map((s, i) => <p key={i} className="text-xs text-gray-300 ml-1">• {s}</p>)}
                    </div>
                  )}
                  {feedback.weaknesses?.length > 0 && (
                    <div>
                      <p className="text-[10px] text-yellow-400 font-semibold uppercase tracking-wide mb-1">Weaknesses</p>
                      {feedback.weaknesses.map((w, i) => <p key={i} className="text-xs text-gray-300 ml-1">• {w}</p>)}
                    </div>
                  )}
                </div>
                {feedback.missed_opportunities?.length > 0 && (
                  <div>
                    <p className="text-[10px] text-orange-400 font-semibold uppercase tracking-wide mb-1">Missed Opportunities</p>
                    {feedback.missed_opportunities.map((m, i) => <p key={i} className="text-xs text-gray-300 ml-1">• {m}</p>)}
                  </div>
                )}
                {feedback.coaching_recommendations?.length > 0 && (
                  <div className="bg-blue-950/30 border border-blue-700/30 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-blue-400 font-semibold uppercase tracking-wide mb-1">Coaching</p>
                    {feedback.coaching_recommendations.map((r, i) => <p key={i} className="text-xs text-gray-200 ml-1">• {r}</p>)}
                  </div>
                )}
                {feedback.coaching_moments && feedback.coaching_moments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-violet-400 font-semibold uppercase tracking-wide">Key Moments</p>
                    {feedback.coaching_moments!.map((m, i) => (
                      <div key={i} className="bg-gray-800/30 border border-gray-700/30 rounded-lg p-2 space-y-1.5">
                        <div className="space-y-0.5">
                          <p className="text-[10px] text-gray-500">Buyer said:</p>
                          <p className="text-xs italic text-gray-300">&ldquo;{m.buyer_quote}&rdquo;</p>
                        </div>
                        <p className="text-[10px] text-amber-400">Signal: {m.signal}</p>
                        <div className="space-y-0.5">
                          <p className="text-[10px] text-emerald-400">You should have said:</p>
                          <p className="text-xs bg-emerald-900/20 border border-emerald-700/20 rounded-md px-2 py-1 text-gray-200">{m.what_they_should_have_said}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Debug Log */}
      <div className="absolute bottom-14 left-3 z-10">
        <button
          onClick={() => setLogOpen((o) => !o)}
          className="text-[9px] text-gray-600 hover:text-gray-400 uppercase tracking-wide flex items-center gap-1 transition-colors"
        >
          {logOpen ? "▼" : "▶"} Debug
        </button>
        {logOpen && (
          <div className="bg-gray-900/90 border border-gray-800 rounded-lg p-2 h-24 w-64 overflow-y-auto font-mono text-[9px] text-gray-300 flex flex-col gap-0.5">
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
    <Suspense fallback={<div className="min-h-screen bg-[#0B0E14]" />}>
      <HeyGenTestInner />
    </Suspense>
  );
}
