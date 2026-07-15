"use client";

import { useState, useCallback } from "react";
import {
  CoachingState,
  CoachingUpdate,
  createInitialCoachingState,
  analyzeTurn,
  updateCoachingState,
  getStepTip,
  getCoveragePercent,
  getStepCount,
  getStepIdByName,
  ScenarioContext,
} from "@/lib/coaching";

interface UseCoachingReturn {
  state: CoachingState;
  analyze: (sellerText: string, buyerText: string) => void;
  reset: (ctx?: ScenarioContext) => void;
  setScenarioContext: (ctx: ScenarioContext) => void;
  markStepsByName: (names: string[]) => void;
  stepTip: string;
  coveragePercent: number;
  progressPercent: number;
  lastTurnResult: CoachingUpdate | null;
}

export function useCoaching(): UseCoachingReturn {
  const [state, setState] = useState<CoachingState>(() => createInitialCoachingState());
  const [scenarioCtx, setScenarioCtx] = useState<ScenarioContext>({});
  const [lastTurnResult, setLastTurnResult] = useState<CoachingUpdate | null>(null);

  const analyze = useCallback((sellerText: string, buyerText: string) => {
    setState((prev) => {
      const update = analyzeTurn(sellerText, buyerText, prev, scenarioCtx);
      setLastTurnResult(update);
      return updateCoachingState(prev, update);
    });
  }, [scenarioCtx]);

  const markStepsByName = useCallback((names: string[]) => {
    setState((prev) => {
      const newCompleted = [...prev.stepsCompleted];
      names.forEach((name) => {
        const id = getStepIdByName(prev.scenarioType, name);
        if (id !== null && id < newCompleted.length) newCompleted[id] = true;
      });
      let currentStep = 0;
      let allCompleted = true;
      for (let i = 0; i < newCompleted.length; i++) {
        if (!newCompleted[i]) { currentStep = i; allCompleted = false; break; }
      }
      if (allCompleted) currentStep = newCompleted.length - 1;
      return { ...prev, stepsCompleted: newCompleted, currentStep };
    });
  }, []);

  const reset = useCallback((ctx?: ScenarioContext) => {
    const effectiveCtx = ctx ?? scenarioCtx;
    if (ctx) setScenarioCtx(ctx);
    setState(createInitialCoachingState(effectiveCtx));
  }, [scenarioCtx]);

  const setScenarioContext = useCallback((ctx: ScenarioContext) => {
    setScenarioCtx(ctx);
  }, []);

  const completedCount = state.stepsCompleted.filter(Boolean).length;
  const progressPercent = Math.round((completedCount / getStepCount(state.scenarioType)) * 100);
  const coveragePercent = getCoveragePercent(state);

  return {
    state,
    analyze,
    reset,
    setScenarioContext,
    markStepsByName,
    stepTip: getStepTip(state.currentStep, scenarioCtx),
    coveragePercent,
    progressPercent,
    lastTurnResult,
  };
}
