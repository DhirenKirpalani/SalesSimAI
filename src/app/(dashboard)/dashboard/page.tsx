"use client";

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
import { Mic2, Trophy, TrendingUp, Clock, ArrowRight, Zap } from "lucide-react";
import Link from "next/link";
import { mockSimulations } from "@/lib/data/mockData";
import { motion } from "framer-motion";

export default function DashboardPage() {
  const recent = [...mockSimulations]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  const completed = mockSimulations.filter((s) => s.status === "completed").length;
  const avgScore = Math.round(
    mockSimulations.reduce((sum, s) => sum + s.score, 0) / mockSimulations.length
  );
  const bestScore = Math.max(...mockSimulations.map((s) => s.score));
  const totalMinutes = mockSimulations.reduce((sum, s) => sum + s.duration, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back. Here is how your training is progressing.
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
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <StatCard
            label="Simulations Completed"
            value={completed}
            change={12}
            icon={Mic2}
            trend="up"
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          <StatCard
            label="Average Score"
            value={avgScore}
            change={5.3}
            icon={TrendingUp}
            trend="up"
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <StatCard label="Best Score" value={bestScore} change={2} icon={Trophy} trend="up" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <StatCard
            label="Training Time"
            value={`${Math.round(totalMinutes / 60)}h ${totalMinutes % 60}m`}
            change={8}
            icon={Clock}
            trend="up"
          />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <PerformanceChart />
        </div>
        <div>
          <ScoreDistributionChart />
        </div>
      </div>

      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-sm">Recent Sessions</h3>
          <Link href="/analysis">
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
                <TableHead className="text-xs">Score</TableHead>
                <TableHead className="text-xs">Duration</TableHead>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map((sim) => (
                <TableRow key={sim.id}>
                  <TableCell className="text-sm font-medium">{sim.scenarioName}</TableCell>
                  <TableCell className="text-sm">{sim.score}</TableCell>
                  <TableCell className="text-sm">{sim.duration} min</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{sim.date}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px] font-normal">
                      {sim.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
