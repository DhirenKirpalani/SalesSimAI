"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Plus,
  Clock,
  TrendingUp,
  Play,
  BarChart2,
  Loader2,
  Inbox,
  CheckCircle2,
  AlertCircle,
  Radio,
} from "lucide-react";

interface SimSession {
  id: string;
  scenario_id: string;
  scenario_table: string;
  status: "active" | "completed" | "abandoned";
  state: {
    trust_level: number;
    buyer_mood: number;
    stage: string;
    facts_discovered: Record<string, boolean>;
    engagement_level: number;
  };
  started_at: string;
  ended_at: string | null;
  scenario_name?: string;
  persona_name?: string;
}

function formatDuration(start: string, end: string | null): string {
  if (!end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "< 1 min";
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const stageLabelMap: Record<string, string> = {
  opening: "Opening",
  discovery: "Discovery",
  pitch: "Pitch",
  objection_handling: "Objection Handling",
  closing: "Closing",
  closed: "Closed",
};

export default function SimulationsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SimSession[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: raw } = await supabase
      .from("simulation_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false });

    if (!raw?.length) { setSessions([]); setLoading(false); return; }

    // Group by scenario_table to batch-fetch names
    const byTable: Record<string, string[]> = {};
    for (const s of raw) {
      (byTable[s.scenario_table] ??= []).push(s.scenario_id);
    }

    const nameMap: Record<string, { name: string; persona_name?: string }> = {};
    for (const [table, ids] of Object.entries(byTable)) {
      const { data: scenarios } = await supabase
        .from(table)
        .select("id, name, custom_persona")
        .in("id", ids);
      for (const sc of scenarios ?? []) {
        nameMap[sc.id] = {
          name: sc.name,
          persona_name: sc.custom_persona?.name,
        };
      }
    }

    setSessions(
      raw.map((s) => ({
        ...s,
        scenario_name: nameMap[s.scenario_id]?.name ?? "Unknown Scenario",
        persona_name: nameMap[s.scenario_id]?.persona_name,
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const statusConfig = {
    active: { label: "Live", icon: Radio, className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
    completed: { label: "Completed", icon: CheckCircle2, className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
    abandoned: { label: "Abandoned", icon: AlertCircle, className: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Content */}
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
            const cfg = statusConfig[s.status];
            const StatusIcon = cfg.icon;
            const factsFound = Object.values(s.state.facts_discovered ?? {}).filter(Boolean).length;
            const totalFacts = Object.values(s.state.facts_discovered ?? {}).length;

            return (
              <div
                key={s.id}
                className={cn(
                  "group flex items-center gap-4 rounded-2xl border bg-card px-5 py-4 hover:shadow-sm hover:border-primary/30 transition-all",
                  s.status === "completed" ? "cursor-pointer" : "opacity-60"
                )}
                onClick={() => {
                  if (s.status === "completed") router.push(`/analysis?session=${s.id}`);
                }}
              >
                {/* Trust indicator */}
                <div className="hidden sm:flex flex-col items-center gap-1 w-12 shrink-0">
                  <div className={cn(
                    "text-lg font-bold tabular-nums leading-none",
                    s.state.trust_level >= 70 ? "text-emerald-500" :
                    s.state.trust_level >= 40 ? "text-amber-500" : "text-red-400"
                  )}>
                    {s.state.trust_level}
                  </div>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Trust</p>
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm truncate">{s.scenario_name}</p>
                    <Badge variant="outline" className={cn("text-[10px] shrink-0 gap-1", cfg.className)}>
                      <StatusIcon className="w-2.5 h-2.5" />
                      {cfg.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground">
                    {s.persona_name && (
                      <span className="truncate">with {s.persona_name}</span>
                    )}
                    <span className="capitalize flex items-center gap-1">
                      <BarChart2 className="w-3 h-3" />
                      {stageLabelMap[s.state.stage] ?? s.state.stage}
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {factsFound}/{totalFacts} facts
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(s.started_at, s.ended_at)}
                    </span>
                    <span className="hidden md:inline">{formatDate(s.started_at)}</span>
                  </div>
                </div>

                {/* Trust bar */}
                <div className="hidden md:block w-20 shrink-0">
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        s.state.trust_level >= 70 ? "bg-emerald-500" :
                        s.state.trust_level >= 40 ? "bg-amber-500" : "bg-red-400"
                      )}
                      style={{ width: `${s.state.trust_level}%` }}
                    />
                  </div>
                </div>

                {/* CTA */}
                <Button
                  size="sm"
                  variant={s.status === "active" ? "default" : "outline"}
                  className="shrink-0 rounded-xl gap-1.5 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (s.status === "completed") router.push(`/analysis?session=${s.id}`);
                  }}
                >
                  <Play className="w-3 h-3" />
                  {s.status === "active" ? "Resume" : "View"}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
