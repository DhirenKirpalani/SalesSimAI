"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Clock, ArrowRight, BarChart3, Inbox, Loader2, Calendar } from "lucide-react";

interface SessionSummary {
  id: string;
  scenario_name: string | null;
  analysis?: { overall_score?: number } | null;
  duration_s: number | null;
  started_at: string;
  ended_at: string | null;
  source: "voice" | "text" | "video";
}

function scoreColor(score: number) {
  if (score >= 80) return "bg-emerald-500/10 text-emerald-500";
  if (score >= 60) return "bg-blue-500/10 text-blue-400";
  if (score >= 40) return "bg-amber-500/10 text-amber-500";
  return "bg-red-500/10 text-red-400";
}

function formatDuration(s: number | null): string {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function SimulationsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from("simulation_sessions")
      .select("id, scenario_name, call_mode, analysis, started_at, ended_at, duration_s, simulation_coaching(overall_score)")
      .eq("user_id", user.id)
      .or("status.eq.completed,ended_at.not.is.null,analysis.not.is.null")
      .order("started_at", { ascending: false });

    const mapped: SessionSummary[] = (data ?? []).map((s) => {
      const coachingArr = s.simulation_coaching as Array<{ overall_score?: number }> | null;
      const coaching = coachingArr?.[0] ?? null;
      const mode = (s.call_mode ?? "voice") as string;
      const storedAnalysis = s.analysis as { overall_score?: number } | null;
      const label = mode === "text" ? "Text Simulation" : mode === "video" ? "Video Call" : "Voice Simulation";
      return {
        id: s.id,
        scenario_name: s.scenario_name ?? label,
        analysis: mode === "voice"
          ? (coaching ? { overall_score: coaching.overall_score } : null)
          : (storedAnalysis ?? null),
        duration_s: s.duration_s ?? null,
        started_at: s.started_at ?? new Date().toISOString(),
        ended_at: s.ended_at,
        source: (mode === "text" ? "text" : mode === "video" ? "video" : "voice") as SessionSummary["source"],
      };
    });

    setSessions(mapped);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Simulations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          All your completed practice sessions. Click any session to review the analysis.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <Inbox className="w-10 h-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No simulations yet.</p>
          <Button size="sm" className="rounded-xl mt-1" onClick={() => router.push("/scenarios")}>
            Browse Scenarios
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((s, i) => {
            const score = s.analysis?.overall_score;
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.04 }}
                onClick={() => router.push(`/analysis?session=${s.id}&source=${s.source}`)}
                className="group flex items-center gap-4 rounded-2xl border bg-card px-5 py-4 hover:shadow-sm hover:border-primary/30 cursor-pointer transition-all"
              >
                {/* Score badge */}
                <div className="flex-shrink-0 w-14 text-center">
                  {score !== undefined ? (
                    <span className={`text-sm font-bold px-2 py-1 rounded-lg ${scoreColor(score)}`}>
                      {score}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>

                {/* Scenario name */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {s.scenario_name ?? "Unnamed simulation"}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {formatDate(s.started_at)}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {formatDuration(s.duration_s)}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                      s.source === "video"
                        ? "bg-violet-500/10 text-violet-600 border-violet-500/20"
                        : s.source === "text"
                        ? "bg-sky-500/10 text-sky-600 border-sky-500/20"
                        : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                    }`}>
                      {s.source === "video" ? "Video Call" : s.source === "text" ? "Text Chat" : "Voice Call"}
                    </span>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  {score !== undefined ? (
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <BarChart3 className="w-3 h-3" /> Analysed
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">No analysis</Badge>
                  )}
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
