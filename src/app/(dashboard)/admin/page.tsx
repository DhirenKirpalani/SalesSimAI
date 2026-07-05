"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRole } from "@/hooks/useRole";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { Users, Building2, BookOpen, Activity, Database, Mic2, Trophy, Clock, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/cards/StatCard";
import { PageHeaderLogo } from "@/components/layout/PageHeaderLogo";

const activityData = [
  { day: "Mon", sessions: 12 },
  { day: "Tue", sessions: 18 },
  { day: "Wed", sessions: 15 },
  { day: "Thu", sessions: 22 },
  { day: "Fri", sessions: 28 },
  { day: "Sat", sessions: 8 },
  { day: "Sun", sessions: 5 },
];

const orgData = [
  { plan: "Enterprise", count: 2 },
  { plan: "Growth", count: 2 },
  { plan: "Starter", count: 1 },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

interface MemberPerf {
  id: string;
  name: string;
  email: string;
  simulations: number;
  avgScore: number;
  bestScore: number;
  trainingMins: number;
  lastActive: string | null;
}

export default function AdminPage() {
  const router = useRouter();
  const { isAdmin, loading } = useRole();
  const [stats, setStats] = useState({ scenarios: 0, simulations: 0 });
  const [firstName, setFirstName] = useState("");
  const [members, setMembers] = useState<MemberPerf[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push("/dashboard");
    }
  }, [loading, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin) return;
    const supabase = createClient();

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setMembersLoading(false); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, organization_id")
        .eq("id", user.id)
        .single();
      if (profile?.full_name) {
        setFirstName(profile.full_name.split(" ")[0]);
      }
      const organizationId = profile?.organization_id ?? null;

      // Workspace stats
      const orgFilter = organizationId ? { organization_id: organizationId } : {};
      const [custom, platform, sessions] = await Promise.all([
        supabase.from("custom_scenarios").select("id", { count: "exact", head: true }).match(orgFilter),
        supabase.from("platform_scenarios").select("id", { count: "exact", head: true }).match(orgFilter),
        supabase
          .from("heygen_sessions")
          .select("id", { count: "exact", head: true })
          .not("ended_at", "is", null)
          .match(orgFilter),
      ]);
      setStats({
        scenarios: (custom.count ?? 0) + (platform.count ?? 0),
        simulations: sessions.count ?? 0,
      });

      // Org members performance
      if (!organizationId) {
        setMembersLoading(false);
        return;
      }

      const { data: memberships } = await supabase
        .from("organization_members")
        .select("role, user_id, profiles(id, full_name, email)")
        .eq("organization_id", organizationId);

      type MembershipRow = {
        user_id: string;
        profiles?: { id?: string; full_name?: string | null; email?: string | null } | { id?: string; full_name?: string | null; email?: string | null }[];
      };

      const memberProfiles = (memberships ?? []).map((m: MembershipRow) => {
        const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
        return { id: p?.id ?? m.user_id, full_name: p?.full_name ?? null, email: p?.email ?? null };
      }).filter((m) => m.id);

      if (!memberProfiles.length) {
        setMembersLoading(false);
        return;
      }

      const memberPerf: MemberPerf[] = [];
      for (const m of memberProfiles) {
        const [heygenRes, simRes] = await Promise.all([
          supabase
            .from("heygen_sessions")
            .select("analysis, duration_s, ended_at")
            .eq("user_id", m.id)
            .eq("organization_id", organizationId)
            .not("ended_at", "is", null),
          supabase
            .from("simulation_sessions")
            .select("duration_s, ended_at, simulation_coaching(overall_score)")
            .eq("user_id", m.id)
            .eq("organization_id", organizationId)
            .eq("status", "completed"),
        ]);

        const heygen = heygenRes.data ?? [];
        const sims = simRes.data ?? [];

        const allScores: number[] = [];
        for (const h of heygen) {
          const score = (h.analysis as { overall_score?: number } | null)?.overall_score;
          if (typeof score === "number") allScores.push(score);
        }
        for (const s of sims) {
          const coaching = s.simulation_coaching as { overall_score?: number } | null;
          const score = coaching?.overall_score;
          if (typeof score === "number") allScores.push(score);
        }

        const totalMins = [...heygen, ...sims].reduce(
          (sum, s) => sum + Math.max(0, Math.round((s.duration_s ?? 0) / 60)),
          0
        );

        const lastDates = [...heygen, ...sims]
          .map((s) => s.ended_at)
          .filter(Boolean) as string[];
        lastDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

        memberPerf.push({
          id: m.id,
          name: m.full_name || m.email?.split("@")[0] || "",
          email: m.email || "",
          simulations: heygen.length + sims.length,
          avgScore: allScores.length ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0,
          bestScore: allScores.length ? Math.max(...allScores) : 0,
          trainingMins: totalMins,
          lastActive: lastDates[0] ?? null,
        });
      }

      setMembers(memberPerf);
      setMembersLoading(false);
    }

    load();
  }, [isAdmin]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) return null;
  return (
    <div className="space-y-6">
      <div>
        <PageHeaderLogo />
        <h1 className="text-2xl font-bold tracking-tight">
          {firstName ? `${getGreeting()}, ${firstName}` : getGreeting()}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of users, organizations, and platform activity.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Scenarios" value={stats.scenarios} icon={BookOpen} />
        <StatCard label="Simulations" value={stats.simulations} icon={Activity} />
        <button
          onClick={() => router.push("/admin/vector-demo")}
          className="text-left rounded-2xl border bg-card p-5 shadow-sm hover:bg-accent/30 transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <Database className="w-5 h-5 text-primary" />
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">RAG</span>
          </div>
          <div className="text-2xl font-bold">Vector Demo</div>
          <p className="text-xs text-muted-foreground mt-1">Semantic search across call transcripts</p>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Weekly Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                <AreaChart data={activityData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="adminGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-card)",
                      fontSize: 12,
                    }}
                    formatter={(value) => [`${value} sessions`, "Count"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="sessions"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    fill="url(#adminGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Plans Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                <BarChart data={orgData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis
                    dataKey="plan"
                    tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-card)",
                      fontSize: 12,
                    }}
                    formatter={(value) => [`${value} orgs`, "Count"]}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="var(--color-primary)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Member Performance */}
      <Card className="rounded-2xl border bg-card shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Users className="w-4 h-4" />
            Team Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {membersLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No team members found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left font-medium py-2 px-3">Member</th>
                    <th className="text-center font-medium py-2 px-3">
                      <Mic2 className="w-3.5 h-3.5 inline mr-1" />
                      Calls
                    </th>
                    <th className="text-center font-medium py-2 px-3">
                      <TrendingUp className="w-3.5 h-3.5 inline mr-1" />
                      Avg Score
                    </th>
                    <th className="text-center font-medium py-2 px-3">
                      <Trophy className="w-3.5 h-3.5 inline mr-1" />
                      Best
                    </th>
                    <th className="text-center font-medium py-2 px-3">
                      <Clock className="w-3.5 h-3.5 inline mr-1" />
                      Training
                    </th>
                    <th className="text-right font-medium py-2 px-3">Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-3">
                        <div>
                          <p className="font-medium">{m.name}</p>
                          <p className="text-xs text-muted-foreground">{m.email}</p>
                        </div>
                      </td>
                      <td className="text-center py-3 px-3 font-semibold">{m.simulations}</td>
                      <td className="text-center py-3 px-3">
                        <span className={m.avgScore >= 70 ? "text-green-600 font-semibold" : "text-amber-600 font-semibold"}>
                          {m.avgScore || "—"}
                        </span>
                      </td>
                      <td className="text-center py-3 px-3 font-semibold">{m.bestScore || "—"}</td>
                      <td className="text-center py-3 px-3 text-muted-foreground">
                        {m.trainingMins < 60 ? `${m.trainingMins}m` : `${Math.floor(m.trainingMins / 60)}h ${m.trainingMins % 60}m`}
                      </td>
                      <td className="text-right py-3 px-3 text-muted-foreground text-xs">
                        {m.lastActive
                          ? new Date(m.lastActive).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
