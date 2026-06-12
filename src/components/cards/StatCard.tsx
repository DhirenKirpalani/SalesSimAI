"use client";

import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
}

export function StatCard({ label, value, change, icon: Icon, trend = "neutral" }: StatCardProps) {
  return (
    <Card className="rounded-2xl border bg-card shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-medium">{label}</p>
            <p className="text-2xl font-semibold tracking-tight">{value}</p>
            {typeof change === "number" && (
              <div className="flex items-center gap-1 text-xs font-medium">
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded-full",
                    trend === "up" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                    trend === "down" && "bg-red-500/10 text-red-600 dark:text-red-400",
                    trend === "neutral" && "bg-muted text-muted-foreground"
                  )}
                >
                  {change > 0 ? "+" : ""}
                  {change}%
                </span>
                <span className="text-muted-foreground">vs last month</span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
