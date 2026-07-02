"use client";

import { useRef, useEffect } from "react";
import { Mic, MicOff, Volume2, AlertCircle, PhoneOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { VoiceStatus } from "@/hooks/useVoiceCall";

interface TranscriptEntry {
  role: "avatar" | "user";
  text: string;
  time: string;
  emotion?: string;
  intent?: string;
}

interface VoiceCallPanelProps {
  status: VoiceStatus;
  transcript: TranscriptEntry[];
  error: string | null;
  volume: number;
  isSpeaking: boolean;
  micMuted: boolean;
  avatarName?: string;
  buyerRole?: string | null;
  buyerCompany?: string | null;
  avatarImageUrl?: string | null;
  sellerAvatarUrl?: string | null;
  sellerInitials?: string;
  audioEnergyRef?: React.MutableRefObject<number>;
  micEnergyRef?: React.MutableRefObject<number>;
  onToggleMic: () => void;
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
  transcript,
  error,
  volume,
  isSpeaking,
  micMuted,
  avatarName = "Buyer",
  buyerRole,
  buyerCompany,
  avatarImageUrl,
  sellerAvatarUrl,
  sellerInitials = "U",
  audioEnergyRef,
  micEnergyRef,
  onToggleMic,
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
  const transcriptScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the latest transcript message
  useEffect(() => {
    transcriptScrollRef.current?.scrollTo({ top: transcriptScrollRef.current.scrollHeight, behavior: "smooth" });
  }, [transcript]);

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
      {/* Center content — transcript + avatar header */}
      <div className="flex-1 flex flex-col items-center min-h-0 px-6 pt-6">
        {/* Avatar header */}
        <div className="flex items-center gap-3 mb-2 shrink-0">
          <div className="relative">
            <div
              ref={avatarRingRef}
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white overflow-hidden transition-all duration-100",
                isActive ? "ring-2 ring-orange-500/40" : "ring-2 ring-white/10"
              )}
              style={{ boxShadow: isActive ? "0 0 0 3px rgba(249, 115, 22, 0.2)" : "0 0 0 2px rgba(255,255,255,0.1)" }}
            >
              {avatarImageUrl ? (
                <img src={avatarImageUrl} alt={avatarName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center">
                  {initials}
                </div>
              )}
            </div>
            {isSpeaking && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0B0E14] animate-pulse" />
            )}
          </div>
          <div className="text-left">
            <h2 className="text-sm font-semibold text-white">{avatarName}</h2>
            {(buyerRole || buyerCompany) && (
              <p className="text-[10px] text-slate-400">
                {buyerRole}
                {buyerRole && buyerCompany && " at "}
                {buyerCompany}
              </p>
            )}
            <div className="flex items-center justify-start gap-[3px] h-3 mt-0.5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  ref={(el) => { if (el) waveformBarsRef.current[i] = el; }}
                  className="w-[2px] rounded-full bg-emerald-400 transition-none"
                  style={{ height: "3px", opacity: 0.3 }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Transcript — centered scrollable area */}
        <div ref={transcriptScrollRef} className="flex-1 w-full max-w-2xl overflow-y-auto space-y-3 pb-4">
          {transcript.length === 0 && (
            <div className="h-full flex items-center justify-center text-gray-500 text-sm">
              Start speaking to see the conversation
            </div>
          )}
          {transcript.map((entry, i) => (
            <div key={i} className={`flex items-end gap-2 ${entry.role === "user" ? "justify-end" : "justify-start"}`}>
              {entry.role === "avatar" && (
                <div className="shrink-0 w-6 h-6 rounded-full overflow-hidden bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center border border-white/10">
                  {avatarImageUrl ? (
                    <img src={avatarImageUrl} alt={avatarName} className="w-full h-full object-cover object-top" />
                  ) : (
                    <span className="text-[9px] text-gray-300 font-semibold">{avatarName.slice(0, 1).toUpperCase()}</span>
                  )}
                </div>
              )}
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm leading-relaxed shadow-sm ${
                entry.role === "user"
                  ? "bg-blue-600 text-white rounded-br-md"
                  : "bg-[#334155] text-white rounded-bl-md border border-white/10"
              }`}>
                <p>{entry.text}</p>
                <div className={`flex items-center gap-1 mt-1 ${entry.role === "user" ? "justify-end" : "justify-start"}`}>
                  <p className={`text-[11px] ${entry.role === "user" ? "text-blue-200" : "text-gray-400"}`}>
                    {entry.time}
                  </p>
                  {entry.role === "user" && (
                    <span className="text-blue-200 text-[10px]">✓✓</span>
                  )}
                </div>
              </div>
              {entry.role === "user" && (
                <div className="shrink-0 w-6 h-6 rounded-full overflow-hidden bg-blue-700 flex items-center justify-center border border-white/10">
                  {sellerAvatarUrl ? (
                    <img src={sellerAvatarUrl} alt="You" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[9px] text-white font-semibold">{sellerInitials}</span>
                  )}
                </div>
              )}
            </div>
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
                !micMuted
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                  : "bg-red-500 text-white shadow-lg shadow-red-500/20"
              )}
            >
              {!micMuted ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
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
