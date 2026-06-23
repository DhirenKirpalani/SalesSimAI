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
import { Users, Building2, BookOpen, Activity } from "lucide-react";
import { StatCard } from "@/components/cards/StatCard";

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

export default function AdminPage() {
  const router = useRouter();
  const { isAdmin, loading } = useRole();
  const [stats, setStats] = useState({ scenarios: 0, simulations: 0 });

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push("/dashboard");
    }
  }, [loading, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin) return;
    const supabase = createClient();
    Promise.all([
      supabase.from("custom_scenarios").select("id", { count: "exact", head: true }),
      supabase.from("platform_scenarios").select("id", { count: "exact", head: true }),
      supabase.from("heygen_sessions").select("id", { count: "exact", head: true }).not("ended_at", "is", null),
    ]).then(([custom, platform, sessions]) => {
      setStats({
        scenarios: (custom.count ?? 0) + (platform.count ?? 0),
        simulations: sessions.count ?? 0,
      });
    });
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
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of users, organizations, and platform activity.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Scenarios" value={stats.scenarios} icon={BookOpen} />
        <StatCard label="Simulations" value={stats.simulations} icon={Activity} />
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

    </div>
  );
}
