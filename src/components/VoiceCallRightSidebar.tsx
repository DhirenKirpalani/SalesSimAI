"use client";

import { CoachingOverlay } from "./CoachingOverlay";
import { AlertTriangle, Target, MessageSquare, Sparkles, CheckCircle2, Copy, Check, ChevronDown, ChevronUp, X, GripVertical, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import type { useCoaching } from "@/hooks/useCoaching";

interface Nudge {
  id: number;
  category: "correction" | "checkpoint" | "suggestion" | "insight" | "success";
  type: "success" | "info" | "warning";
  priority: number;
  message: string;
  checkpointId?: string;
  copyText?: string;
}

interface Checkpoint {
  id: string;
  name: string;
  status: "hit" | "warning" | "pending";
}

interface VoiceCallRightSidebarProps {
  coaching: ReturnType<typeof useCoaching>;
  coachingOpen: boolean;
  setCoachingOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  checkpoints?: Checkpoint[];
  liveNudges: Nudge[];
  setLiveNudges: React.Dispatch<React.SetStateAction<Nudge[]>>;
  nudgeCollapsed: boolean;
  setNudgeCollapsed: (v: boolean | ((prev: boolean) => boolean)) => void;
  nudgeHistoryOpen: boolean;
  setNudgeHistoryOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  copiedNudgeId: number | null;
  setCopiedNudgeId: (id: number | null) => void;
}

export function VoiceCallRightSidebar({
  coaching,
  coachingOpen,
  setCoachingOpen,
  checkpoints,
  liveNudges,
  setLiveNudges,
  nudgeCollapsed,
  setNudgeCollapsed,
  nudgeHistoryOpen,
  setNudgeHistoryOpen,
  copiedNudgeId,
  setCopiedNudgeId,
}: VoiceCallRightSidebarProps) {
  const sorted = [...liveNudges].sort((a, b) => a.priority - b.priority);
  const top = sorted[0];
  const rest = sorted.slice(1);

  const nudgeConfig = {
    correction: { icon: AlertTriangle, title: "Product Correction", colors: "bg-red-500/10 border-red-500/20 text-red-100", titleColor: "text-red-400" },
    checkpoint: { icon: Target, title: "Checkpoint", colors: "bg-amber-500/10 border-amber-500/20 text-amber-100", titleColor: "text-amber-400" },
    suggestion: { icon: MessageSquare, title: "Suggested Next", colors: "bg-blue-500/10 border-blue-500/20 text-blue-100", titleColor: "text-blue-400" },
    insight: { icon: Sparkles, title: "Insight", colors: "bg-blue-500/10 border-blue-500/20 text-blue-100", titleColor: "text-blue-400" },
    success: { icon: CheckCircle2, title: "Good Job", colors: "bg-emerald-500/10 border-emerald-500/20 text-emerald-100", titleColor: "text-emerald-400" },
  };

  return (
    <div className="h-full flex flex-col bg-[#0B0E14] border-l border-white/10 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Live Nudges */}
        {liveNudges.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-[#111827]/95 backdrop-blur-md shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-white/5 border-b border-white/10">
              <div className="flex items-center gap-2">
                <GripVertical className="w-3.5 h-3.5 text-white/40" />
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-medium text-white">Live Coach</span>
                {nudgeCollapsed && liveNudges.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-medium">
                    {liveNudges.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {liveNudges.length > 1 && !nudgeCollapsed && (
                  <button
                    onClick={() => setNudgeHistoryOpen((o) => !o)}
                    className="text-[10px] px-2 py-1 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    {nudgeHistoryOpen ? "Hide" : `${rest.length} more`}
                  </button>
                )}
                <button
                  onClick={() => setNudgeCollapsed((c) => !c)}
                  className="p-1 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                >
                  {nudgeCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => setLiveNudges([])}
                  className="p-1 rounded-md text-white/50 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Top nudge */}
            {!nudgeCollapsed && top && (
              <>
                <div className={`p-4 border-b border-white/10 ${nudgeConfig[top.category].colors}`}>
                  <div className="flex items-start gap-3">
                    <div className={`shrink-0 mt-0.5 ${nudgeConfig[top.category].titleColor}`}>
                      {(() => {
                        const Icon = nudgeConfig[top.category].icon;
                        return <Icon className="w-5 h-5" />;
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[11px] font-semibold uppercase tracking-wider mb-1 ${nudgeConfig[top.category].titleColor}`}>
                        {nudgeConfig[top.category].title}
                        {top.checkpointId && <span className="ml-1.5 opacity-80">{top.checkpointId}</span>}
                      </p>
                      <p className="text-sm leading-relaxed text-white">{top.message}</p>
                      {top.copyText && (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(top.copyText || "");
                            setCopiedNudgeId(top.id);
                            setTimeout(() => setCopiedNudgeId(null), 1500);
                          }}
                          className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-md px-2.5 py-1.5 transition-colors"
                        >
                          {copiedNudgeId === top.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copiedNudgeId === top.id ? "Copied" : "Copy to use"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* History */}
                {nudgeHistoryOpen && rest.length > 0 && (
                  <div className="bg-black/20 p-3 space-y-2 max-h-[40vh] overflow-y-auto">
                    {rest.slice(0, 4).map((nudge) => {
                      const cfg = {
                        correction: { icon: AlertTriangle, title: "Correction", titleColor: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
                        checkpoint: { icon: Target, title: "Checkpoint", titleColor: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
                        suggestion: { icon: MessageSquare, title: "Suggestion", titleColor: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
                        insight: { icon: Sparkles, title: "Insight", titleColor: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
                        success: { icon: CheckCircle2, title: "Success", titleColor: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
                      }[nudge.category];
                      const HIcon = cfg.icon;
                      return (
                        <div key={nudge.id} className={`rounded-lg px-3 py-2 border ${cfg.bg}`}>
                          <div className="flex items-center gap-1.5 mb-1">
                            <HIcon className={`w-3 h-3 ${cfg.titleColor}`} />
                            <p className={`text-[10px] font-semibold uppercase tracking-wider ${cfg.titleColor}`}>
                              {cfg.title}
                              {nudge.checkpointId && <span className="ml-1 opacity-80">{nudge.checkpointId}</span>}
                            </p>
                          </div>
                          <p className="text-xs text-white/80 leading-relaxed">{nudge.message}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Coaching Overlay */}
        <div className={cn("rounded-xl border border-white/10 bg-[#111827]/95 backdrop-blur-md shadow-2xl overflow-hidden", liveNudges.length > 0 && "mt-4")}>
          <div className="px-3 py-2 bg-white/5 border-b border-white/10">
            <p className="text-xs font-medium text-white">Conversation Roadmap</p>
          </div>
          <div className="p-3">
            <CoachingOverlay
              state={coaching.state}
              stepTip={coaching.stepTip}
              coveragePercent={coaching.coveragePercent}
              progressPercent={coaching.progressPercent}
              isOpen={true}
              onToggle={() => setCoachingOpen((o) => !o)}
              checkpoints={checkpoints}
              hideToggle
            />
          </div>
        </div>
      </div>
    </div>
  );
}
