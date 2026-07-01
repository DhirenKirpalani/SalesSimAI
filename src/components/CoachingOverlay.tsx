"use client";

import { useState } from "react";
import { Lightbulb, ChevronDown, ChevronUp, Target, CheckCircle2, MessageSquare, Sparkles, Map } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCoachingSteps, CoachingState } from "@/lib/coaching";

interface Checkpoint {
  id: string;
  name: string;
  status: "hit" | "warning" | "pending";
}

interface CoachingOverlayProps {
  state: CoachingState;
  stepTip: string;
  coveragePercent: number;
  progressPercent: number;
  isOpen: boolean;
  onToggle: () => void;
  checkpoints?: Checkpoint[];
  hideToggle?: boolean;
}

export function CoachingOverlay({
  state,
  stepTip,
  coveragePercent,
  progressPercent,
  isOpen,
  onToggle,
  checkpoints,
  hideToggle,
}: CoachingOverlayProps) {
  const [showCheckpoints, setShowCheckpoints] = useState(false);
  const steps = getCoachingSteps(state.scenarioType);
  const currentStepName = steps[state.currentStep]?.name ?? "Discovery";
  const completedCount = state.stepsCompleted.filter(Boolean).length;
  const pendingCheckpointCount = checkpoints?.filter((c) => c.status === "pending").length ?? 0;
  const warningCount = checkpoints?.filter((c) => c.status === "warning").length ?? 0;
  const hitCount = checkpoints?.filter((c) => c.status === "hit").length ?? 0;
  const currentStageIndex = checkpoints
    ? checkpoints.findIndex((c) => c.status === "pending")
    : -1;
  const currentStageName = checkpoints
    ? currentStageIndex >= 0
      ? checkpoints[currentStageIndex]?.name
      : checkpoints[checkpoints.length - 1]?.name
    : undefined;

  return (
    <div className={cn("flex flex-col gap-2", hideToggle ? "w-full" : "w-60")}>
      {/* Collapsed pill — always visible, minimal */}
      {!hideToggle && (
        <button
          data-coach-toggle
          onClick={onToggle}
          className={cn(
            "group flex items-center gap-2 w-full rounded-full px-3 py-2 text-xs font-medium transition-all shadow-lg cursor-move",
            isOpen
              ? "bg-[#111827] border border-white/10 text-white hover:bg-[#1a2234]"
              : "bg-[#111827]/90 border border-white/10 text-white/90 hover:bg-[#1a2234] hover:text-white"
          )}
        >
          <span className="relative flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400">
            <Lightbulb className="w-3 h-3" />
            {warningCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500" />
            )}
          </span>
          <span className="truncate flex-1 text-left">
            {isOpen ? "Live Coaching" : (currentStageName ?? currentStepName)}
          </span>
          {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-white/60" /> : <ChevronUp className="w-3.5 h-3.5 text-white/60" />}
        </button>
      )}

      {isOpen && (
        <div className="bg-[#111827]/95 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl p-3 space-y-3 animate-in fade-in zoom-in-95 duration-200 max-h-[70vh] overflow-y-auto">

          {/* Rubric Stage Roadmap — shows conversation progression */}
          {checkpoints && checkpoints.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-blue-400 font-medium">
                <Map className="w-3 h-3" />
                Conversation Roadmap
              </div>
              <div className="relative pl-2 space-y-1">
                {checkpoints.slice(0, 6).map((cp, i) => {
                  const isCurrent = i === currentStageIndex || (currentStageIndex === -1 && i === checkpoints.length - 1);
                  const isCompleted = cp.status === "hit";
                  const isWarning = cp.status === "warning";
                  return (
                    <div key={cp.id} className="flex items-start gap-2">
                      <div className="relative flex flex-col items-center pt-0.5">
                        <div
                          className={cn(
                            "w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold border flex-shrink-0 z-10",
                            isCompleted
                              ? "bg-emerald-500 border-emerald-500 text-white"
                              : isWarning
                              ? "bg-amber-500 border-amber-500 text-white"
                              : isCurrent
                              ? "bg-blue-500 border-blue-500 text-white"
                              : "bg-[#111827] border-white/20 text-white/40"
                          )}
                        >
                          {isCompleted ? <CheckCircle2 className="w-2.5 h-2.5" /> : cp.id.replace(/\D/g, "")}
                        </div>
                        {i < checkpoints.slice(0, 6).length - 1 && (
                          <div className={cn("w-px flex-1 min-h-[12px] mt-0.5", isCompleted ? "bg-emerald-500/40" : "bg-white/10")} />
                        )}
                      </div>
                      <div className={cn("text-[11px] leading-snug py-0.5", isCurrent ? "text-white font-medium" : isCompleted ? "text-emerald-200" : "text-white/40")}>
                        {cp.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Current focus — hero */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-emerald-400 font-medium">
              <Target className="w-3 h-3" />
              Current Focus
            </div>
            <p className="text-sm font-medium text-white leading-snug">
              {currentStepName}
            </p>
          </div>

          {/* Suggested question — highlighted */}
          {state.suggestedNextQuestion && (
            <div className="bg-emerald-500/10 rounded-xl p-2.5 border border-emerald-500/20 space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-emerald-400 font-medium">
                <MessageSquare className="w-3 h-3" />
                Try This
              </div>
              <p className="text-xs text-emerald-100 leading-relaxed">
                {state.suggestedNextQuestion}
              </p>
            </div>
          )}

          {/* Compact tip */}
          {stepTip && (
            <div className="text-[11px] text-white/60 leading-relaxed border-l-2 border-white/10 pl-2.5">
              {stepTip}
            </div>
          )}

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-white/50">
              <span>Progress</span>
              <span className="text-white/80">{completedCount}/{steps.length}</span>
            </div>
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Checkpoints — compact summary, expandable */}
          {checkpoints && checkpoints.length > 0 && (
            <div className="space-y-1">
              <button
                onClick={() => setShowCheckpoints((s) => !s)}
                className="flex items-center justify-between w-full text-[10px] uppercase tracking-wider text-white/50 font-medium hover:text-white/80 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" />
                  Checkpoints
                </span>
                <span className="flex items-center gap-1.5">
                  {hitCount > 0 && <span className="text-emerald-400">{hitCount} ✓</span>}
                  {warningCount > 0 && <span className="text-amber-400">{warningCount} !</span>}
                  {pendingCheckpointCount > 0 && <span className="text-white/40">{pendingCheckpointCount} left</span>}
                  {showCheckpoints ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                </span>
              </button>
              {showCheckpoints && (
                <div className="space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
                  {checkpoints.map((cp) => (
                    <div
                      key={cp.id}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] transition-colors",
                        cp.status === "hit"
                          ? "bg-emerald-500/10 text-emerald-300"
                          : cp.status === "warning"
                          ? "bg-amber-500/10 text-amber-300"
                          : "bg-white/5 text-white/50"
                      )}
                    >
                      <div
                        className={cn(
                          "w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0",
                          cp.status === "hit" && "bg-emerald-500 text-white",
                          cp.status === "warning" && "bg-amber-500 text-white",
                          cp.status === "pending" && "bg-white/10 text-white/50"
                        )}
                      >
                        {cp.status === "hit" ? <CheckCircle2 className="w-3 h-3" /> : cp.status === "warning" ? "!" : cp.id.replace(/\D/g, "")}
                      </div>
                      <span className="font-medium flex-shrink-0">{cp.id}</span>
                      <span className="truncate">{cp.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Uncovered facts */}
          {state.uncoveredFacts.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-white/50 font-medium">Uncovered</div>
              <div className="space-y-1">
                {state.uncoveredFacts.slice(-2).map((fact, i) => (
                  <div key={i} className="text-[11px] text-emerald-300 bg-emerald-500/10 rounded-lg px-2 py-1">
                    ✓ {fact}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
