"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { mockUsers, mockOrganizations, mockScenarios, mockSimulations } from "@/lib/data/mockData";
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
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of users, organizations, and platform activity.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={mockUsers.length} icon={Users} />
        <StatCard label="Organizations" value={mockOrganizations.length} icon={Building2} />
        <StatCard label="Scenarios" value={mockScenarios.length} icon={BookOpen} />
        <StatCard label="Simulations" value={mockSimulations.length} icon={Activity} />
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
              <ResponsiveContainer width="100%" height="100%">
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
              <ResponsiveContainer width="100%" height="100%">
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

      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h3 className="font-semibold text-sm">Users</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Email</TableHead>
                <TableHead className="text-xs">Role</TableHead>
                <TableHead className="text-xs">Organization</TableHead>
                <TableHead className="text-xs">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockUsers.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="text-sm font-medium">{u.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px] font-normal">
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{u.organization}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.joinDate}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h3 className="font-semibold text-sm">Organizations</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Plan</TableHead>
                <TableHead className="text-xs">Users</TableHead>
                <TableHead className="text-xs">Simulations</TableHead>
                <TableHead className="text-xs">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockOrganizations.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="text-sm font-medium">{o.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] font-normal">
                      {o.plan}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{o.users}</TableCell>
                  <TableCell className="text-sm">{o.simulations}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{o.createdAt}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
