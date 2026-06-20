"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Plus, Clock, TrendingUp, Play, Loader2, Inbox, CheckCircle2 } from "lucide-react";

interface HeygenSession {
  id: string;
  scenario_name: string | null;
  analysis: { overall_score: number } | null;
  duration_s: number | null;
  started_at: string;
  ended_at: string | null;
}

function formatDurationS(s: number | null): string {
  if (!s) return "—";
  const mins = Math.floor(s / 60);
  if (mins < 1) return "< 1 min";
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function SimulationsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<HeygenSession[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: raw } = await supabase
      .from("heygen_sessions")
      .select("id, scenario_name, analysis, duration_s, started_at, ended_at")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false });

    setSessions(raw ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Simulations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Your sales call practice sessions</p>
        </div>
        <Button onClick={() => router.push("/scenarios")} className="gap-2 rounded-xl">
          <Plus className="w-4 h-4" />
          New Simulation
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
            <Inbox className="w-7 h-7 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-sm">No simulations yet</p>
            <p className="text-xs text-muted-foreground mt-1">Start a simulation from the Scenarios page</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push("/scenarios")} className="gap-1.5 rounded-xl">
            <Plus className="w-3.5 h-3.5" />
            Browse Scenarios
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {sessions.map((s) => {
            const completed = !!s.ended_at;
            const score = s.analysis?.overall_score ?? null;
            return (
              <div
                key={s.id}
                className={cn(
                  "group flex items-center gap-4 rounded-2xl border bg-card px-5 py-4 hover:shadow-sm hover:border-primary/30 transition-all",
                  completed ? "cursor-pointer" : "opacity-60"
                )}
                onClick={() => { if (completed) router.push(`/analysis?session=${s.id}`); }}
              >
                {/* MEDDIC Score */}
                <div className="hidden sm:flex flex-col items-center gap-1 w-12 shrink-0">
                  {score !== null ? (
                    <>
                      <div className={cn(
                        "text-lg font-bold tabular-nums leading-none",
                        score >= 70 ? "text-emerald-500" : score >= 40 ? "text-amber-500" : "text-red-400"
                      )}>{score}</div>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Score</p>
                    </>
                  ) : (
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wide text-center">No score</div>
                  )}
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm truncate">{s.scenario_name ?? "Untitled Simulation"}</p>
                    <Badge variant="outline" className={cn("text-[10px] shrink-0 gap-1",
                      completed ? "bg-blue-500/10 text-blue-600 border-blue-500/20" : "bg-muted text-muted-foreground"
                    )}>
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      {completed ? "Completed" : "Incomplete"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDurationS(s.duration_s)}
                    </span>
                    {score !== null && (
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        MEDDIC {score}/100
                      </span>
                    )}
                    <span className="hidden md:inline">{formatDate(s.started_at)}</span>
                  </div>
                </div>

                {/* Score bar */}
                {score !== null && (
                  <div className="hidden md:block w-20 shrink-0">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all",
                          score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-amber-500" : "bg-red-400"
                        )}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 rounded-xl gap-1.5 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => { e.stopPropagation(); if (completed) router.push(`/analysis?session=${s.id}`); }}
                >
                  <Play className="w-3 h-3" />
                  View
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
