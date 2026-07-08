"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { StatCard } from "@/components/cards/StatCard";
import { PerformanceChart } from "@/components/charts/PerformanceChart";
import { ScoreDistributionChart } from "@/components/charts/ScoreDistributionChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Mic2, Trophy, TrendingUp, Clock, ArrowRight, Zap, Loader2, LucideIcon, ShieldAlert, Lightbulb, Briefcase, Building2, Wallet, Users, CreditCard, ChevronDown, ChevronUp } from "lucide-react";
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

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

interface TopListCardProps {
  title: string;
  items: string[];
  icon: LucideIcon;
  emptyText: string;
}

function TopListCard({ title, items, icon: Icon, emptyText }: TopListCardProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Card className="rounded-2xl border bg-card shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary">
              <Icon className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm">{title}</h3>
          </div>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition-colors"
            aria-label={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
        {!collapsed && (
          <div className="pt-2 max-h-[200px] overflow-y-auto pr-1">
            {items.length === 0 ? (
              <p className="text-xs text-muted-foreground">{emptyText}</p>
            ) : (
              <ol className="space-y-2.5">
                {items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-foreground/90 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [sessions, setSessions] = useState<UnifiedSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [organization, setOrganization] = useState<string | null>(null);
  const [orgLogoUrl, setOrgLogoUrl] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [intelligence, setIntelligence] = useState<{
    objections: string[];
    insights: string[];
    useCases: string[];
    industries: string[];
  }>({ objections: [], insights: [], useCases: [], industries: [] });
  const [selectedProductType, setSelectedProductType] = useState("payment");
  const [intelligenceLoading, setIntelligenceLoading] = useState(false);

  const PRODUCT_TYPE_LABELS: Record<string, string> = {
    payment: "Payment",
    eor: "EoR",
    cards: "Cards",
  };

  async function fetchIntelligence(productType: string) {
    setIntelligenceLoading(true);
    try {
      const res = await fetch(`/api/dashboard/intelligence?productType=${encodeURIComponent(productType)}`);
      if (!res.ok) throw new Error("Failed to load intelligence");
      const data = await res.json();
      setIntelligence({
        objections: data.objections ?? [],
        insights: data.insights ?? [],
        useCases: data.useCases ?? [],
        industries: data.industries ?? [],
      });
    } catch (err) {
      console.error("[dashboard] intelligence fetch failed:", err);
    } finally {
      setIntelligenceLoading(false);
    }
  }

  useEffect(() => {
    fetchIntelligence(selectedProductType);
  }, [selectedProductType]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, organization_id, role")
        .eq("id", user.id)
        .single();
      const organizationId = profile?.organization_id ?? null;

      const orgFilter = organizationId ? { organization_id: organizationId } : {};
      const [{ data: heygenData }, { data: voiceData }] = await Promise.all([
        supabase
          .from("heygen_sessions")
          .select("id, scenario_name, analysis, duration_s, started_at, ended_at")
          .eq("user_id", user.id)
          .match(orgFilter)
          .order("started_at", { ascending: false }),
        supabase
          .from("simulation_sessions")
          .select("id, scenario_id, scenario_table, started_at, ended_at, duration_s, simulation_coaching(overall_score)")
          .eq("user_id", user.id)
          .eq("status", "completed")
          .match(orgFilter)
          .order("started_at", { ascending: false }),
      ]);

      if (profile?.full_name) {
        setFirstName(profile.full_name.split(" ")[0]);
      }
      if (profile?.role) {
        setRole(profile.role);
      }
      if (profile?.organization_id) {
        const { data: org } = await supabase
          .from("organizations")
          .select("name, logo_url")
          .eq("id", profile.organization_id)
          .single();
        if (org?.name) setOrganization(org.name);
        if (org?.logo_url) setOrgLogoUrl(org.logo_url);
      }

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
      <div className="space-y-6 animate-pulse">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-4 w-96 bg-muted rounded" />
          </div>
          <div className="h-10 w-32 bg-muted rounded-xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-80 bg-muted rounded-2xl" />
          <div className="h-80 bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {orgLogoUrl && (
            <img
              src={orgLogoUrl}
              alt={organization ?? "Company"}
              className="h-8 max-w-[160px] object-contain mb-3"
              loading="eager"
              decoding="async"
              fetchPriority="high"
              width="160"
              height="32"
            />
          )}
          <h1 className="text-2xl font-bold tracking-tight">
            {firstName ? `${getGreeting()}, ${firstName}` : getGreeting()}
          </h1>
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

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="font-semibold text-sm">Sales Intelligence</h2>
        <div className="flex flex-wrap gap-1 p-1 bg-muted/50 rounded-full w-fit">
          {([
            { type: "payment", icon: Wallet },
            { type: "eor", icon: Users },
            { type: "cards", icon: CreditCard },
          ] as const).map(({ type, icon: Icon }) => {
            const active = selectedProductType === type;
            return (
              <button
                key={type}
                onClick={() => setSelectedProductType(type)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-background"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {PRODUCT_TYPE_LABELS[type]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0 }}
        >
          <TopListCard
            title="Top 5 Objections"
            items={intelligence.objections}
            icon={ShieldAlert}
            emptyText={intelligenceLoading ? "Analyzing transcripts..." : "No objections found yet — import or upload transcripts for this product."}
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          <TopListCard
            title="Top 5 Insights"
            items={intelligence.insights}
            icon={Lightbulb}
            emptyText={intelligenceLoading ? "Analyzing transcripts..." : "No insights found yet — import or upload transcripts for this product."}
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <TopListCard
            title="Top 5 Use Cases"
            items={intelligence.useCases}
            icon={Briefcase}
            emptyText={intelligenceLoading ? "Analyzing transcripts..." : "No use cases found yet — import or upload transcripts for this product."}
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <TopListCard
            title="Top 5 Industries"
            items={intelligence.industries}
            icon={Building2}
            emptyText={intelligenceLoading ? "Analyzing transcripts..." : "No industries found yet — import or upload transcripts for this product."}
          />
        </motion.div>
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
            <Link href="/simulations">
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
