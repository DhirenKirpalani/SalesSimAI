"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Scenario } from "@/types";
import { Clock, BarChart3, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScenarioCardProps {
  scenario: Scenario;
}

export function ScenarioCard({ scenario }: ScenarioCardProps) {
  const diffColor =
    scenario.difficulty === "Beginner"
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      : scenario.difficulty === "Intermediate"
      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
      : scenario.difficulty === "Advanced"
      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
      : "bg-red-500/10 text-red-600 dark:text-red-400";

  return (
    <Card className="rounded-2xl border bg-card shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 group">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-sm leading-tight">{scenario.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{scenario.industry}</p>
          </div>
          <Badge variant="secondary" className={cn("text-xs font-medium", diffColor)}>
            {scenario.difficulty}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">{scenario.description}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {scenario.duration} min
          </span>
          <span className="flex items-center gap-1">
            <BarChart3 className="w-3.5 h-3.5" />
            {scenario.persona.jobTitle}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {scenario.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-[10px] font-normal">
              {tag}
            </Badge>
          ))}
        </div>
        <Button size="sm" className="w-full rounded-lg gap-1 text-xs group-hover:gap-2 transition-all">
          Start Simulation
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}
