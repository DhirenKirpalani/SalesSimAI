"use client";

import { useRef, useEffect } from "react";
import { Mic, MicOff, Pause, Play, Volume2, AlertCircle, PhoneOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { VoiceStatus } from "@/hooks/useVoiceCall";

interface VoiceCallPanelProps {
  status: VoiceStatus;
  currentBuyerText: string;
  error: string | null;
  volume: number;
  isSpeaking: boolean;
  avatarName?: string;
  avatarImageUrl?: string | null;
  audioEnergyRef?: React.MutableRefObject<number>;
  micEnergyRef?: React.MutableRefObject<number>;
  onToggleMic: () => void;
  onTogglePause: () => void;
  onSetVolume: (v: number) => void;
  onEndCall: () => void;
}

function AudioVisualizer({ isActive }: { isActive: boolean }) {
  return (
    <div className="flex items-end justify-center gap-[3px] h-8">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-[3px] rounded-full bg-emerald-400 transition-all duration-100",
            isActive ? "animate-wave" : "h-1 opacity-20"
          )}
          style={{
            height: isActive ? `${Math.max(4, Math.sin(i * 0.6) * 20 + 12)}px` : "4px",
            animationDelay: `${i * 60}ms`,
          }}
        />
      ))}
    </div>
  );
}

export function VoiceCallPanel({
  status,
  currentBuyerText,
  error,
  volume,
  isSpeaking,
  avatarName = "Buyer",
  avatarImageUrl,
  audioEnergyRef,
  micEnergyRef,
  onToggleMic,
  onTogglePause,
  onSetVolume,
  onEndCall,
}: VoiceCallPanelProps) {
  const isActive = status === "listening" || status === "speaking" || status === "processing";
  const isIdle = status === "idle" || status === "error";

  // Generate initials from avatar name
  const initials = avatarName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "B";

  // Refs for DOM elements we update directly via rAF (no React re-renders)
  const waveformBarsRef = useRef<HTMLDivElement[]>([]);
  const avatarRingRef = useRef<HTMLDivElement>(null);

  // Real-time audio-driven animation loop
  useEffect(() => {
    let raf: number;
    const tick = () => {
      const audioEnergy = audioEnergyRef?.current ?? 0;
      const micEnergy = micEnergyRef?.current ?? 0;
      const energy = isSpeaking ? audioEnergy : micEnergy;

      // Animate avatar ring thickness based on energy
      if (avatarRingRef.current) {
        const ringWidth = 2 + energy * 12; // 2px to 14px
        const opacity = 0.2 + energy * 0.6;
        avatarRingRef.current.style.boxShadow = `0 0 0 ${ringWidth}px rgba(16, 185, 129, ${opacity})`;
      }

      // Animate waveform bars based on audio energy
      const bars = waveformBarsRef.current;
      for (let i = 0; i < bars.length; i++) {
        const bar = bars[i];
        if (!bar) continue;
        // Create pseudo-random but smooth variation per bar
        const phase = (Date.now() / 200) + i * 0.8;
        const base = Math.max(0.15, energy);
        const variation = Math.sin(phase) * 0.4 + 0.6;
        const heightPct = base * variation * 100;
        bar.style.height = `${Math.max(4, Math.min(48, heightPct))}%`;
        bar.style.opacity = `${0.3 + energy * 0.7}`;
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isSpeaking, audioEnergyRef, micEnergyRef]);

  return (
    <div className="flex flex-col h-full bg-[#0B0E14] overflow-hidden relative">
      {/* Center content — Slack call style */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
        {/* Avatar */}
        <div className="relative">
          <div
            ref={avatarRingRef}
            className={cn(
              "w-28 h-28 sm:w-36 sm:h-36 rounded-full flex items-center justify-center text-3xl sm:text-4xl font-bold text-white overflow-hidden transition-all duration-100",
              isActive ? "ring-2 ring-white/10" : "ring-2 ring-white/5"
            )}
            style={{ boxShadow: "0 0 0 2px rgba(255,255,255,0.1)" }}
          >
            {avatarImageUrl ? (
              <img src={avatarImageUrl} alt={avatarName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                {initials}
              </div>
            )}
          </div>
          {/* Speaking indicator dot */}
          {isSpeaking && (
            <span className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-[#0B0E14] animate-pulse" />
          )}
        </div>

        {/* Name */}
        <div className="text-center space-y-1">
          <h2 className="text-xl sm:text-2xl font-semibold text-white">{avatarName}</h2>
        </div>

        {/* Audio visualizer — 12 bars animated by real audio energy */}
        <div className="flex items-end justify-center gap-[3px] h-10">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              ref={(el) => { if (el) waveformBarsRef.current[i] = el; }}
              className="w-[3px] rounded-full bg-emerald-400 transition-none"
              style={{ height: "4px", opacity: 0.3 }}
            />
          ))}
        </div>

      </div>

      {/* Error */}
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 text-sm text-red-300 bg-red-900/40 backdrop-blur-sm rounded-lg px-4 py-2 border border-red-700/30">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Bottom controls */}
      <div className="flex items-center justify-center gap-4 px-6 pb-8 pt-4">
        {isIdle ? (
          <button
            onClick={onToggleMic}
            className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 hover:scale-105 transition-all"
          >
            <Mic className="w-7 h-7" />
          </button>
        ) : (
          <>
            {/* Mic toggle */}
            <button
              onClick={onToggleMic}
              className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-105",
                status === "listening"
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                  : "bg-white/10 text-white hover:bg-white/20"
              )}
            >
              {status === "listening" ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
            </button>

            {/* Pause */}
            <button
              onClick={onTogglePause}
              className="w-14 h-14 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all hover:scale-105"
            >
              {status === "paused" ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
            </button>

            {/* Volume */}
            <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-2">
              <Volume2 className="w-4 h-4 text-gray-300" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => onSetVolume(Number(e.target.value))}
                className="w-24 accent-emerald-400"
              />
            </div>

            {/* End call */}
            <button
              onClick={onEndCall}
              className="w-14 h-14 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-400 transition-all hover:scale-105 shadow-lg shadow-red-500/20"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
