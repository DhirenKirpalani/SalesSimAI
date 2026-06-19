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

interface RawSession {
  id: string;
  scenario_id: string;
  scenario_table: string;
  status: "active" | "completed" | "abandoned";
  state: { trust_level: number; stage: string; facts_discovered: Record<string, boolean> };
  started_at: string;
  ended_at: string | null;
  scenario_name?: string;
}

function sessionDurationMins(s: RawSession): number {
  if (!s.ended_at) return 0;
  return Math.max(0, Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000));
}

function formatTrainingTime(mins: number): string {
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function buildTrendData(sessions: RawSession[]) {
  const byDay: Record<string, number[]> = {};
  for (const s of sessions) {
    const day = new Date(s.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    (byDay[day] ??= []).push(s.state.trust_level);
  }
  return Object.entries(byDay)
    .slice(-14)
    .map(([date, scores]) => ({
      date,
      score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    }));
}

function buildDistData(sessions: RawSession[]) {
  const buckets: Record<string, number> = {
    "0–29": 0, "30–49": 0, "50–69": 0, "70–89": 0, "90–100": 0,
  };
  for (const s of sessions) {
    const t = s.state.trust_level;
    if (t <= 29) buckets["0–29"]++;
    else if (t <= 49) buckets["30–49"]++;
    else if (t <= 69) buckets["50–69"]++;
    else if (t <= 89) buckets["70–89"]++;
    else buckets["90–100"]++;
  }
  return Object.entries(buckets).map(([range, count]) => ({ range, count }));
}

export default function DashboardPage() {
  const [sessions, setSessions] = useState<RawSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: raw } = await supabase
        .from("simulation_sessions")
        .select("id, scenario_id, scenario_table, status, state, started_at, ended_at")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false });

      if (!raw?.length) { if (!cancelled) { setSessions([]); setLoading(false); } return; }

      const byTable: Record<string, string[]> = {};
      for (const s of raw) (byTable[s.scenario_table] ??= []).push(s.scenario_id);

      const nameMap: Record<string, string> = {};
      for (const [table, ids] of Object.entries(byTable)) {
        const { data: sc } = await supabase.from(table).select("id, name").in("id", ids);
        for (const row of sc ?? []) nameMap[row.id] = row.name;
      }

      if (!cancelled) {
        setSessions(raw.map((s) => ({ ...s, scenario_name: nameMap[s.scenario_id] ?? "Unknown" })));
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const completedSessions = sessions.filter((s) => s.status === "completed");
  const completed = completedSessions.length;
  const completedTrust = completedSessions.map((s) => s.state.trust_level);
  const avgTrust = completedTrust.length ? Math.round(completedTrust.reduce((a, b) => a + b, 0) / completedTrust.length) : 0;
  const bestTrust = completedTrust.length ? Math.max(...completedTrust) : 0;
  const totalMins = completedSessions.reduce((sum, s) => sum + sessionDurationMins(s), 0);
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
          { label: "Avg Trust Score", value: avgTrust, icon: TrendingUp },
          { label: "Best Trust Score", value: bestTrust, icon: Trophy },
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
                  <TableHead className="text-xs">Trust</TableHead>
                  <TableHead className="text-xs">Duration</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-sm font-medium">{s.scenario_name}</TableCell>
                    <TableCell className={cn(
                      "text-sm font-semibold",
                      s.state.trust_level >= 70 ? "text-emerald-500" :
                      s.state.trust_level >= 40 ? "text-amber-500" : "text-red-400"
                    )}>
                      {s.state.trust_level}
                    </TableCell>
                    <TableCell className="text-sm">{sessionDurationMins(s)} min</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(s.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px] font-normal capitalize",
                          s.status === "completed" && "bg-blue-500/10 text-blue-600",
                          s.status === "active" && "bg-emerald-500/10 text-emerald-600",
                          s.status === "abandoned" && "bg-orange-500/10 text-orange-600",
                        )}
                      >
                        {s.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
