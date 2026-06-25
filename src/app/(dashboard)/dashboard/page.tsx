"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { StatCard } from "@/components/cards/StatCard";
import { PerformanceChart } from "@/components/charts/PerformanceChart";
import { ScoreDistributionChart } from "@/components/charts/ScoreDistributionChart";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Mic2, Trophy, TrendingUp, Clock, ArrowRight, Zap, Loader2 } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface UnifiedSession {
  id: string;
  scenario_name: string | null;
  analysis: { overall_score: number } | null;
  duration_s: number | null;
  started_at: string;
  ended_at: string | null;
  source: "heygen" | "voice";
}

function formatDurationMins(s: number | null): number {
  if (!s) return 0;
  return Math.max(0, Math.round(s / 60));
}

function formatTrainingTime(mins: number): string {
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function buildTrendData(sessions: UnifiedSession[]) {
  const byDay: Record<string, number[]> = {};
  for (const s of sessions) {
    if (!s.analysis?.overall_score) continue;
    const day = new Date(s.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    (byDay[day] ??= []).push(s.analysis.overall_score);
  }
  return Object.entries(byDay)
    .slice(-14)
    .map(([date, scores]) => ({
      date,
      score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    }));
}

function buildDistData(sessions: UnifiedSession[]) {
  const buckets: Record<string, number> = {
    "0–29": 0, "30–49": 0, "50–69": 0, "70–89": 0, "90–100": 0,
  };
  for (const s of sessions) {
    const score = s.analysis?.overall_score ?? 0;
    if (score <= 29) buckets["0–29"]++;
    else if (score <= 49) buckets["30–49"]++;
    else if (score <= 69) buckets["50–69"]++;
    else if (score <= 89) buckets["70–89"]++;
    else buckets["90–100"]++;
  }
  return Object.entries(buckets).map(([range, count]) => ({ range, count }));
}

export default function DashboardPage() {
  const [sessions, setSessions] = useState<UnifiedSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const [{ data: heygenData }, { data: voiceData }] = await Promise.all([
        supabase
          .from("heygen_sessions")
          .select("id, scenario_name, analysis, duration_s, started_at, ended_at")
          .eq("user_id", user.id)
          .order("started_at", { ascending: false }),
        supabase
          .from("simulation_sessions")
          .select("id, scenario_id, scenario_table, started_at, ended_at, duration_s, simulation_coaching(overall_score)")
          .eq("user_id", user.id)
          .eq("status", "completed")
          .order("started_at", { ascending: false }),
      ]);

      const heygenSessions: UnifiedSession[] = (heygenData ?? []).map((s) => ({
        ...s,
        source: "heygen" as const,
      }));

      const voiceSessions: UnifiedSession[] = (voiceData ?? []).map((s) => {
        const coaching = s.simulation_coaching as { overall_score?: number } | null;
        return {
          id: s.id,
          scenario_name: "Voice Simulation",
          analysis: coaching && typeof coaching.overall_score === "number"
            ? { overall_score: coaching.overall_score }
            : null,
          duration_s: s.duration_s ?? null,
          started_at: s.started_at ?? new Date().toISOString(),
          ended_at: s.ended_at,
          source: "voice" as const,
        };
      });

      const merged = [...heygenSessions, ...voiceSessions].sort(
        (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
      );

      if (!cancelled) {
        setSessions(merged);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const completedSessions = sessions.filter((s) => !!s.ended_at);
  const completed = completedSessions.length;
  const meddicScores = completedSessions.map((s) => s.analysis?.overall_score).filter((n): n is number => typeof n === "number");
  const avgMeddic = meddicScores.length ? Math.round(meddicScores.reduce((a, b) => a + b, 0) / meddicScores.length) : 0;
  const bestMeddic = meddicScores.length ? Math.max(...meddicScores) : 0;
  const totalMins = completedSessions.reduce((sum, s) => sum + formatDurationMins(s.duration_s), 0);
  const recent = sessions.slice(0, 6);
  const trendData = buildTrendData([...completedSessions].reverse());
  const distData = buildDistData(completedSessions);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your readiness and performance across sales simulations.
          </p>
        </div>
        <Link href="/scenarios">
          <Button className="rounded-xl gap-2">
            <Zap className="w-4 h-4" />
            Quick Start
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Simulations Completed", value: completed, icon: Mic2 },
          { label: "Avg MEDDIC Score", value: avgMeddic, icon: TrendingUp },
          { label: "Best MEDDIC Score", value: bestMeddic, icon: Trophy },
          { label: "Training Time", value: formatTrainingTime(totalMins), icon: Clock },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
          >
            <StatCard label={stat.label} value={stat.value} icon={stat.icon} trend="up" />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <PerformanceChart data={trendData} />
        </div>
        <div>
          <ScoreDistributionChart data={distData} />
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-2xl border bg-card shadow-sm px-5 py-12 text-center text-muted-foreground text-sm">
          No sessions yet — <Link href="/scenarios" className="underline underline-offset-2">start your first simulation</Link>.
        </div>
      ) : (
        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <h3 className="font-semibold text-sm">Recent Sessions</h3>
            <Link href="/simulation">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                View All
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs">Scenario</TableHead>
                  <TableHead className="text-xs">MEDDIC</TableHead>
                  <TableHead className="text-xs">Duration</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((s) => {
                  const completed = !!s.ended_at;
                  const score = s.analysis?.overall_score ?? 0;
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="text-sm font-medium">
                        {s.scenario_name ?? "Untitled"}
                        {s.source === "voice" && (
                          <Badge variant="outline" className="text-[9px] ml-2">Voice</Badge>
                        )}
                      </TableCell>
                      <TableCell className={cn(
                        "text-sm font-semibold",
                        score >= 70 ? "text-emerald-500" : score >= 40 ? "text-amber-500" : "text-red-400"
                      )}>
                        {score}
                      </TableCell>
                      <TableCell className="text-sm">{formatDurationMins(s.duration_s)} min</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(s.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] font-normal capitalize",
                            completed ? "bg-blue-500/10 text-blue-600" : "bg-emerald-500/10 text-emerald-600"
                          )}
                        >
                          {completed ? "completed" : "active"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
