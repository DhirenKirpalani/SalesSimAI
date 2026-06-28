"use client";

import { useRef, useState, useCallback, useEffect } from "react";

/* ── Web Speech API type declarations ───────────────────────────── */
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

/* ── End declarations ───────────────────────────────────────────── */

export type VoiceStatus = "idle" | "connecting" | "listening" | "processing" | "speaking" | "paused" | "error";

export interface TranscriptEntry {
  role: "user" | "buyer";
  text: string;
  time: string;
  emotion?: string;
  intent?: string;
}

interface VoiceCallState {
  status: VoiceStatus;
  transcript: TranscriptEntry[];
  currentBuyerText: string;
  error: string | null;
  volume: number;
  isSpeaking: boolean;
}

import { VOICE_LANGUAGE_MAP, VoiceLanguage } from "@/lib/voice-language";
export { VOICE_LANGUAGE_MAP } from "@/lib/voice-language";
export type { VoiceLanguage } from "@/lib/voice-language";

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
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<string[]>([]); // base64 mp3 data URLs
  const isPlayingRef = useRef(false);
  const abortRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const micMutedRef = useRef(false); // true = ignore all mic input (processing/API call)
  const turnAddedRef = useRef(false); // prevent duplicate transcript from multiple done events
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null); // for interruption

  // Audio energy refs for real-time visualization (0 = silent, 1 = max)
  const audioEnergyRef = useRef(0);
  const micEnergyRef = useRef(0);
  const playbackAnalyserRef = useRef<AnalyserNode | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Keep transcript ref in sync
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  const addTranscript = useCallback((role: "user" | "buyer", text: string, emotion?: string, intent?: string, timeOverride?: string) => {
    const entry: TranscriptEntry = { role, text, time: timeOverride ?? new Date().toLocaleTimeString(), emotion, intent };
    transcriptRef.current = [...transcriptRef.current, entry];
    setTranscript((prev) => [...prev, entry]);
  }, []);

  // Real-time audio energy analysis loop
  const startEnergyLoop = useCallback(() => {
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    const dataArray = new Uint8Array(64);
    const tick = () => {
      // Playback energy
      if (playbackAnalyserRef.current) {
        playbackAnalyserRef.current.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        audioEnergyRef.current = avg / 255;
      } else {
        audioEnergyRef.current = 0;
      }
      // Mic energy
      if (micAnalyserRef.current) {
        micAnalyserRef.current.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        micEnergyRef.current = avg / 255;
      } else {
        micEnergyRef.current = 0;
      }
      rafIdRef.current = requestAnimationFrame(tick);
    };
    rafIdRef.current = requestAnimationFrame(tick);
  }, []);

  const stopEnergyLoop = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    audioEnergyRef.current = 0;
    micEnergyRef.current = 0;
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || abortRef.current) return;
    try {
      recognitionRef.current.start();
    } catch {
      // Already started
    }
  }, []);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {
      // Already stopped
    }
  }, []);

  const playNextAudio = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    isPlayingRef.current = true;
    setIsSpeaking(true);
    setStatus("speaking");

    // Mute mic and stop recognition during TTS to prevent echo
    // (buyer audio from speakers would be picked up by mic and transcribed as user speech)
    micMutedRef.current = true;
    stopListening();
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

    const base64 = audioQueueRef.current.shift()!;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;

      // Decode MP3
      const binary = atob(base64);
      const array = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
      const audioBuffer = await ctx.decodeAudioData(array.buffer);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      currentAudioSourceRef.current = source;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      playbackAnalyserRef.current = analyser;

      const gain = ctx.createGain();
      gain.gain.value = volume;

      source.connect(analyser);
      analyser.connect(gain);
      gain.connect(ctx.destination);

      startEnergyLoop();

      await new Promise<void>((resolve) => {
        source.onended = () => resolve();
        source.start(0);
      });

      playbackAnalyserRef.current = null;
      currentAudioSourceRef.current = null;
    } catch (e) {
      console.error("[useVoiceCall] audio playback error:", e);
      currentAudioSourceRef.current = null;
    }

    isPlayingRef.current = false;
    setIsSpeaking(false);

    // Continue queue or go back to listening (only if not paused/stopped and no user interruption)
    if (!abortRef.current && audioQueueRef.current.length > 0) {
      playNextAudio();
    } else if (!abortRef.current) {
      // Small delay before restarting recognition to let room echo die out
      setTimeout(() => {
        if (abortRef.current) return;
        micMutedRef.current = false;
        setStatus("listening");
        startListening();
      }, 600);
    }
  }, [volume, startListening]);

  const sendTranscript = useCallback(async (text: string) => {
    const sessionId = sessionIdRef.current;
    if (!sessionId || abortRef.current) return;

    turnAddedRef.current = false;
    setStatus("processing");
    micMutedRef.current = true;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    stopListening();
    addTranscript("user", text);
    setCurrentBuyerText("");

    try {
      const res = await fetch("/api/simulation/voice-turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, transcript: text, voiceId: voiceIdRef.current, language: languageRef.current }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Voice turn failed: ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";
      let buyerStartTime = "";

      while (!abortRef.current) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;

          try {
            const chunk = JSON.parse(raw);

            if (chunk.type === "text" || chunk.type === "audio") {
              // Record when buyer actually starts responding (first chunk)
              if (!buyerStartTime) {
                buyerStartTime = new Date().toLocaleTimeString();
              }
              if (chunk.type === "text") {
                fullText += chunk.content + " ";
                setCurrentBuyerText(fullText.trim());
              } else {
                audioQueueRef.current.push(chunk.data);
                if (!isPlayingRef.current) {
                  playNextAudio();
                }
              }
            } else if (chunk.type === "done") {
              if (!turnAddedRef.current && fullText.trim()) {
                turnAddedRef.current = true;
                addTranscript("buyer", fullText.trim(), chunk.emotion, chunk.intent, buyerStartTime);
              }
              setCurrentBuyerText("");
            } else if (chunk.type === "error") {
              throw new Error(chunk.message);
            }
          } catch {
            // skip malformed
          }
        }
      }
    } catch (err) {
      console.error("[useVoiceCall] turn error:", err);
      setError(err instanceof Error ? err.message : "Voice call error");
      setStatus("error");
    }
  }, [addTranscript, playNextAudio, stopListening]);

  const start = useCallback((sessionId: string, voiceId?: string, language?: VoiceLanguage) => {
    abortRef.current = false;
    setError(null);
    setTranscript([]);
    transcriptRef.current = [];
    setCurrentBuyerText("");
    audioQueueRef.current = [];
    sessionIdRef.current = sessionId;
    voiceIdRef.current = voiceId ?? null;
    languageRef.current = language ?? "en";

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition not supported in this browser. Please use Chrome or Edge.");
      setStatus("error");
      return;
    }

    setStatus("connecting");

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = VOICE_LANGUAGE_MAP[languageRef.current].recognitionLang;
    recognition.maxAlternatives = 3;

    let finalTranscript = "";
    let interimTranscript = "";

    recognition.onstart = () => {
      setStatus("listening");
      finalTranscript = "";
      interimTranscript = "";
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Drop any results captured while GPT is processing
      if (micMutedRef.current) return;

      interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          // Pick the most confident alternative
          let bestTranscript = result[0].transcript;
          let bestConfidence = (result[0] as any).confidence ?? 0;
          for (let j = 1; j < result.length; j++) {
            const alt = result[j] as any;
            const altConfidence = alt.confidence ?? 0;
            if (altConfidence > bestConfidence) {
              bestTranscript = alt.transcript;
              bestConfidence = altConfidence;
            }
          }
          finalTranscript += bestTranscript + " ";
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      // Debounce: if we have final results and silence, send
      if (finalTranscript.trim().length > 0) {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          const text = finalTranscript.trim();
          finalTranscript = "";
          if (text) {
            sendTranscript(text);
          }
        }, 400);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "no-speech") {
        // Expected, just restart
        if (!abortRef.current && !micMutedRef.current) startListening();
        return;
      }
      if (event.error === "aborted") return;
      console.error("[useVoiceCall] speech recognition error:", event.error);
      setError(`Speech recognition error: ${event.error}`);
      setStatus("error");
    };

    recognition.onend = () => {
      // Auto-restart only if not muted (TTS/processing) and not fully stopped
      if (!abortRef.current && !micMutedRef.current) {
        startListening();
      }
    };

    recognitionRef.current = recognition;

    // Request mic permission first — with echo cancellation
    navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    })
      .then((stream) => {
        // Create mic analyser for real-time visualization
        const ctx = audioCtxRef.current ?? new AudioContext();
        if (!audioCtxRef.current) audioCtxRef.current = ctx;
        const micSource = ctx.createMediaStreamSource(stream);
        const micAnalyser = ctx.createAnalyser();
        micAnalyser.fftSize = 128;
        micSource.connect(micAnalyser);
        micAnalyserRef.current = micAnalyser;
        startEnergyLoop();
        recognition.start();
      })
      .catch((err) => {
        setError(`Microphone permission denied: ${err.message}`);
        setStatus("error");
      });
  }, [sendTranscript, startListening, status]);

  const stop = useCallback(() => {
    abortRef.current = true;
    micMutedRef.current = false;
    setMicMuted(false);
    turnAddedRef.current = false;
    stopListening();
    stopEnergyLoop();
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    playbackAnalyserRef.current = null;
    micAnalyserRef.current = null;
    if (currentAudioSourceRef.current) {
      try { currentAudioSourceRef.current.stop(); } catch { /* already stopped */ }
      currentAudioSourceRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => {});
    }
    audioCtxRef.current = null;
    setStatus("idle");
    setIsSpeaking(false);
  }, [stopListening, stopEnergyLoop]);

  const toggleMic = useCallback(() => {
    if (micMutedRef.current) {
      micMutedRef.current = false;
      setMicMuted(false);
      if (status !== "paused") {
        setStatus("listening");
        startListening();
      }
    } else {
      micMutedRef.current = true;
      setMicMuted(true);
      stopListening();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    }
  }, [status, startListening, stopListening]);

  const togglePause = useCallback(() => {
    if (status === "paused") {
      micMutedRef.current = false;
      setStatus("listening");
      startListening();
      // Resume any queued audio that was interrupted by pause
      if (audioQueueRef.current.length > 0 && !isPlayingRef.current) {
        playNextAudio();
      }
    } else {
      micMutedRef.current = true;
      stopListening();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      // Pause audio playback but PRESERVE queue and text for resume
      if (currentAudioSourceRef.current) {
        try { currentAudioSourceRef.current.stop(); } catch { /* already stopped */ }
        currentAudioSourceRef.current = null;
      }
      isPlayingRef.current = false;
      setIsSpeaking(false);
      // Do NOT clear audioQueueRef or currentBuyerText — conversation continues on resume
      setStatus("paused");
    }
  }, [status, startListening, stopListening, playNextAudio]);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current = true;
      stopListening();
      stopEnergyLoop();
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => {});
      }
      audioCtxRef.current = null;
    };
  }, [stopListening, stopEnergyLoop]);

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
