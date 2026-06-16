"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CustomScenario } from "@/types";
import { Clock, ArrowRight, Sparkles, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface CustomScenarioCardProps {
  scenario: CustomScenario;
  onDeleted: () => void;
}

export function CustomScenarioCard({ scenario, onDeleted }: CustomScenarioCardProps) {
  const diffColor =
    scenario.difficulty === "Beginner"
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      : scenario.difficulty === "Intermediate"
      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
      : scenario.difficulty === "Advanced"
      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
      : "bg-red-500/10 text-red-600 dark:text-red-400";

  const personaLabel = scenario.custom_persona
    ? `${scenario.custom_persona.jobTitle} · ${scenario.custom_persona.company}`
    : null;

  const handleDelete = async () => {
    const supabase = createClient();
    await supabase.from("custom_scenarios").delete().eq("id", scenario.id);
    onDeleted();
  };

  return (
    <Card className="rounded-2xl border bg-card shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 group relative">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Sparkles className="w-3 h-3 text-primary flex-shrink-0" />
              <span className="text-[10px] text-primary font-medium">Custom</span>
            </div>
            <h3 className="font-semibold text-sm leading-tight truncate">{scenario.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{scenario.seller_company}</p>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <Badge variant="secondary" className={cn("text-xs font-medium", diffColor)}>
              {scenario.difficulty}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">{scenario.seller_product}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {scenario.duration} min
          </span>
          {personaLabel && (
            <span className="truncate">{personaLabel}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-[10px] font-normal">{scenario.scenario_type}</Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="flex-1 rounded-lg gap-1 text-xs group-hover:gap-2 transition-all">
            Start Simulation
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
            onClick={handleDelete}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
