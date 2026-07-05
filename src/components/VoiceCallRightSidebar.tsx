"use client";

import { CoachingOverlay } from "./CoachingOverlay";
import type { useCoaching } from "@/hooks/useCoaching";

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
  suggestedNextQuestionOverride?: string;
  coachingLoading?: boolean;
}

export function VoiceCallRightSidebar({
  coaching,
  coachingOpen,
  setCoachingOpen,
  checkpoints,
  suggestedNextQuestionOverride,
  coachingLoading,
}: VoiceCallRightSidebarProps) {
  return (
    <div className="h-full flex flex-col bg-[#0B0E14] border-l border-white/10 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Coaching Overlay / Conversation Roadmap */}
        <div className="rounded-xl border border-white/10 bg-[#111827]/95 backdrop-blur-md shadow-2xl overflow-hidden">
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
              suggestedNextQuestionOverride={suggestedNextQuestionOverride}
              coachingLoading={coachingLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
