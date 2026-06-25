"use client";

import { Lightbulb, ChevronRight, Users, TrendingUp, Smile } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCoachingSteps, CoachingState } from "@/lib/coaching";

interface CoachingOverlayProps {
  state: CoachingState;
  stepTip: string;
  moodEmoji: string;
  moodLabel: string;
  progressPercent: number;
  isOpen: boolean;
  onToggle: () => void;
}

function StepDot({
  index,
  isCompleted,
  isCurrent,
}: {
  index: number;
  isCompleted: boolean;
  isCurrent: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
      <div
        className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors",
          isCurrent && "bg-primary text-primary-foreground ring-2 ring-primary/30",
          isCompleted && !isCurrent && "bg-emerald-500 text-white",
          !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
        )}
      >
        {isCompleted && !isCurrent ? (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          index + 1
        )}
      </div>
    </div>
  );
}

export function CoachingOverlay({
  state,
  stepTip,
  moodEmoji,
  moodLabel,
  progressPercent,
  isOpen,
  onToggle,
}: CoachingOverlayProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Toggle button (mobile-friendly) */}
      <button
        onClick={onToggle}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors",
          isOpen ? "bg-primary text-primary-foreground" : "bg-card border shadow-sm text-foreground hover:bg-muted"
        )}
      >
        <Lightbulb className="w-4 h-4" />
        {isOpen ? "Hide Coaching" : "Live Coaching"}
        <ChevronRight className={cn("w-3.5 h-3.5 ml-auto transition-transform", isOpen && "rotate-90")} />
      </button>

      {isOpen && (
        <div className="bg-card rounded-xl border shadow-sm p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200 max-h-[60vh] sm:max-h-none overflow-y-auto">
          {/* Progress header */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Discovery Progress</span>
              <span className="font-medium">{progressPercent}%</span>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Step dots */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
            {(() => {
              const steps = getCoachingSteps(state.scenarioType);
              return steps.map((step, i) => (
                <div key={step.id} className="flex items-center gap-1 flex-shrink-0">
                  <StepDot
                    index={i}
                    isCompleted={state.stepsCompleted[i]}
                    isCurrent={i === state.currentStep}
                  />
                  {i < steps.length - 1 && (
                    <div
                      className={cn(
                        "w-3 h-0.5 rounded-full transition-colors",
                        state.stepsCompleted[i + 1] || (state.stepsCompleted[i] && i === state.currentStep)
                          ? "bg-emerald-500"
                          : "bg-muted"
                      )}
                    />
                  )}
                </div>
              ));
            })()}
          </div>

          {/* Current step name */}
          <div className="text-xs font-medium text-foreground">
            Step {state.currentStep + 1}: {getCoachingSteps(state.scenarioType)[state.currentStep]?.name}
          </div>

          {/* Suggested question */}
          <div className="bg-primary/5 rounded-lg p-3 border border-primary/10 space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-primary font-medium">
              <Lightbulb className="w-3 h-3" />
              Suggested Next Question
            </div>
            <p className="text-sm text-foreground leading-relaxed">{state.suggestedNextQuestion}</p>
          </div>

          {/* Coaching tip */}
          <div className="bg-muted/50 rounded-lg p-2.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Tip:</span> {stepTip}
          </div>

          {/* Buyer state */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-muted/50 rounded-lg p-2.5 space-y-1">
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                <TrendingUp className="w-3 h-3" />
                Trust Level
              </div>
              <div className="w-full h-1.5 bg-muted-foreground/10 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    state.trustLevel > 70 ? "bg-emerald-500" : state.trustLevel > 40 ? "bg-amber-500" : "bg-red-400"
                  )}
                  style={{ width: `${state.trustLevel}%` }}
                />
              </div>
              <p className="text-xs font-medium">{state.trustLevel}/100</p>
            </div>

            <div className="bg-muted/50 rounded-lg p-2.5 space-y-1">
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                <Smile className="w-3 h-3" />
                Buyer Mood
              </div>
              <p className="text-sm">
                {moodEmoji} {moodLabel}
              </p>
            </div>
          </div>

          {/* Uncovered facts */}
          {state.uncoveredFacts.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                <Users className="w-3 h-3" />
                Information Uncovered
              </div>
              <div className="space-y-1">
                {state.uncoveredFacts.slice(-3).map((fact, i) => (
                  <div key={i} className="text-xs bg-emerald-50 text-emerald-700 rounded-lg px-2 py-1.5 border border-emerald-100">
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
