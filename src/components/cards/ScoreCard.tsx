"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ScoreCardProps {
  label: string;
  score: number;
  max?: number;
  size?: "sm" | "md" | "lg";
}

export function ScoreCard({ label, score, max = 100, size = "md" }: ScoreCardProps) {
  const pct = Math.min(100, Math.max(0, (score / max) * 100));
  const ringSize = size === "lg" ? 120 : size === "md" ? 96 : 64;
  const stroke = size === "lg" ? 10 : size === "md" ? 8 : 6;
  const radius = (ringSize - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  const colorClass =
    pct >= 80
      ? "text-emerald-500"
      : pct >= 60
      ? "text-amber-500"
      : "text-red-500";

  return (
    <Card className="rounded-2xl border bg-card shadow-sm">
      <CardContent className="flex flex-col items-center gap-3 p-5">
        <div className="relative" style={{ width: ringSize, height: ringSize }}>
          <svg width={ringSize} height={ringSize} className="-rotate-90">
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              stroke="currentColor"
              strokeWidth={stroke}
              fill="transparent"
              className="text-muted/30"
            />
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              stroke="currentColor"
              strokeWidth={stroke}
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className={cn("transition-all duration-700 ease-out", colorClass)}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn("font-semibold", size === "lg" ? "text-3xl" : size === "md" ? "text-xl" : "text-sm")}>
              {score}
            </span>
          </div>
        </div>
        <p className="text-sm font-medium text-muted-foreground text-center">{label}</p>
      </CardContent>
    </Card>
  );
}
