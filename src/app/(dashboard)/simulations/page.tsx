"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Clock, ArrowRight, BarChart3, Inbox, Loader2, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeaderLogo } from "@/components/layout/PageHeaderLogo";

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

function formatDateMobile(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const PAGE_SIZE = 10;

export default function SimulationsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();
    const organizationId = profile?.organization_id ?? null;

    let query = supabase
      .from("simulation_sessions")
      .select("id, scenario_name, call_mode, analysis, started_at, ended_at, duration_s, simulation_coaching(overall_score)")
      .eq("user_id", user.id)
      .or("status.eq.completed,ended_at.not.is.null,analysis.not.is.null")
      .order("started_at", { ascending: false });
    if (organizationId) {
      query = query.eq("organization_id", organizationId);
    }
    const { data, error } = await query;
    if (error) console.error("[SimulationsPage] load error:", error);

    const mapped: SessionSummary[] = (data ?? []).map((s) => {
      const coachingArr = s.simulation_coaching as Array<{ overall_score?: number }> | null;
      const coaching = coachingArr?.[0] ?? null;
      const mode = (s.call_mode ?? "voice") as string;
      const storedAnalysis = s.analysis as { overall_score?: number } | null;
      const label = mode === "text" ? "Text Simulation" : mode === "video" ? "Video Call" : "Voice Simulation";
      return {
        id: s.id,
        scenario_name: s.scenario_name ?? label,
        analysis: storedAnalysis ?? (mode === "voice" && coaching ? { overall_score: coaching.overall_score } : null),
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

  const totalPages = Math.ceil(sessions.length / PAGE_SIZE);
  const paginatedSessions = useMemo(() => {
    return sessions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }, [sessions, page]);

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto px-4 sm:px-0 animate-pulse">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-4 w-72 sm:w-96 bg-muted rounded" />
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl border bg-card p-4">
              <div className="w-12 h-12 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 bg-muted rounded" />
                <div className="h-3 w-1/2 bg-muted rounded" />
              </div>
              <div className="w-20 h-8 bg-muted rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
      <div>
        <PageHeaderLogo />
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Simulations</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Your practice session history — every run, its date, duration, and analysis status.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 sm:py-24 px-4 gap-4 text-center border border-dashed border-border rounded-2xl bg-muted/30">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-muted flex items-center justify-center">
            <Inbox className="w-7 h-7 sm:w-8 sm:h-8 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-sm sm:text-base">No simulations yet</p>
            <p className="text-xs text-muted-foreground mt-1">Start practicing with a scenario to see your history.</p>
          </div>
          <Button size="sm" className="rounded-xl mt-1" onClick={() => router.push("/scenarios")}>
            Browse Scenarios
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {paginatedSessions.map((s, i) => {
            const score = s.analysis?.overall_score;
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.04 }}
                onClick={() => router.push(`/analysis?session=${s.id}&source=${s.source}`)}
                className="group flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 rounded-2xl border bg-card px-4 py-4 sm:px-5 hover:shadow-sm hover:border-primary/30 cursor-pointer transition-all"
              >
                {/* Top row: score, name, status, arrow */}
                <div className="flex items-start gap-3 sm:gap-4">
                  {/* Score badge */}
                  <div className="flex-shrink-0 w-12 sm:w-14 text-center pt-0.5">
                    {score !== undefined ? (
                      <span className={`text-sm font-bold px-2 py-1.5 rounded-xl ${scoreColor(score)}`}>
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
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span className="sm:hidden">{formatDateMobile(s.started_at)}</span>
                        <span className="hidden sm:inline">{formatDate(s.started_at)}</span>
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatDuration(s.duration_s)}
                      </span>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    {score !== undefined ? (
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <BarChart3 className="w-3 h-3" /> <span className="hidden sm:inline">Analysed</span>
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">No analysis</Badge>
                    )}
                    <ArrowRight className="w-5 h-5 sm:w-4 sm:h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </div>

                {/* Source badge — full width on mobile */}
                <div className="sm:hidden flex items-center justify-between">
                  <span className={`text-[10px] px-2.5 py-1 rounded-full border inline-flex items-center ${
                    s.source === "video"
                      ? "bg-violet-500/10 text-violet-600 border-violet-500/20"
                      : s.source === "text"
                      ? "bg-sky-500/10 text-sky-600 border-sky-500/20"
                      : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  }`}>
                    {s.source === "video" ? "Video Call" : s.source === "text" ? "Text Chat" : "Voice Call"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateMobile(s.started_at)}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl h-10 w-10 sm:h-8 sm:w-8"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl h-10 w-10 sm:h-8 sm:w-8"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
