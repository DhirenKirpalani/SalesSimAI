"use client";

import { useState, useCallback } from "react";
import {
  CoachingState,
  CoachingUpdate,
  createInitialCoachingState,
  analyzeTurn,
  updateCoachingState,
  getStepTip,
  getMoodEmoji,
  getMoodLabel,
  getStepCount,
  ScenarioContext,
} from "@/lib/coaching";

interface UseCoachingReturn {
  state: CoachingState;
  analyze: (sellerText: string, buyerText: string, trustDelta: number, moodDelta: number) => void;
  reset: (initialTrust?: number, initialMood?: number, ctx?: ScenarioContext) => void;
  setScenarioContext: (ctx: ScenarioContext) => void;
  stepTip: string;
  moodEmoji: string;
  moodLabel: string;
  progressPercent: number;
}

export function useCoaching(): UseCoachingReturn {
  const [state, setState] = useState<CoachingState>(() => createInitialCoachingState());
  const [scenarioCtx, setScenarioCtx] = useState<ScenarioContext>({});

  const analyze = useCallback((sellerText: string, buyerText: string, trustDelta: number, moodDelta: number) => {
    setState((prev) => {
      const update = analyzeTurn(sellerText, buyerText, prev, scenarioCtx);
      const next = updateCoachingState(prev, update);
      return {
        ...next,
        trustLevel: Math.min(100, Math.max(0, next.trustLevel + trustDelta)),
        buyerMood: Math.min(10, Math.max(-10, next.buyerMood + moodDelta)),
      };
    });
  }, [scenarioCtx]);

  const reset = useCallback((initialTrust = 20, initialMood = 0, ctx?: ScenarioContext) => {
    const effectiveCtx = ctx ?? scenarioCtx;
    if (ctx) setScenarioCtx(ctx);
    setState(createInitialCoachingState(initialTrust, initialMood, effectiveCtx));
  }, [scenarioCtx]);

  const setScenarioContext = useCallback((ctx: ScenarioContext) => {
    setScenarioCtx(ctx);
  }, []);

  const completedCount = state.stepsCompleted.filter(Boolean).length;
  const progressPercent = Math.round((completedCount / getStepCount(state.scenarioType)) * 100);

  return {
    state,
    analyze,
    reset,
    setScenarioContext,
    stepTip: getStepTip(state.currentStep, scenarioCtx),
    moodEmoji: getMoodEmoji(state.buyerMood),
    moodLabel: getMoodLabel(state.buyerMood),
    progressPercent,
  };
}
