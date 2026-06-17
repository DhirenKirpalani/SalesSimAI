"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { CustomScenario } from "@/types";
import { Clock, BarChart3, ArrowRight, Trash2, Building2, Users, MessageSquare, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { mockPersonas } from "@/lib/data/mockData";
import { useRole } from "@/hooks/useRole";

interface CustomScenarioCardProps {
  scenario: CustomScenario;
  onDeleted: () => void;
  table?: string;
}

export function CustomScenarioCard({ scenario, onDeleted, table = "custom_scenarios" }: CustomScenarioCardProps) {
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const router = useRouter();
  const { isAdmin } = useRole();
  const isPlatform = table === "platform_scenarios";
  const showDelete = !isPlatform || isAdmin;

  const diffColor =
    scenario.difficulty === "Beginner"
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      : scenario.difficulty === "Intermediate"
      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
      : scenario.difficulty === "Advanced"
      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
      : "bg-red-500/10 text-red-600 dark:text-red-400";

  // Resolve persona display
  const presetPersona = scenario.preset_persona_id
    ? mockPersonas.find((p) => p.id === scenario.preset_persona_id)
    : null;

  const personaName = scenario.custom_persona
    ? scenario.custom_persona.jobTitle
    : presetPersona?.jobTitle ?? "AI Buyer";

  const personaFull = scenario.custom_persona
    ? `${scenario.custom_persona.name} — ${scenario.custom_persona.jobTitle} at ${scenario.custom_persona.company}`
    : presetPersona
    ? `${presetPersona.name} — ${presetPersona.jobTitle} at ${presetPersona.company}`
    : "AI Buyer";

  const personaDetails = scenario.custom_persona
    ? [
        { label: "Company", value: scenario.custom_persona.company },
        { label: "Industry", value: scenario.custom_persona.industry },
        { label: "Personality", value: scenario.custom_persona.personality },
      ]
    : presetPersona
    ? [
        { label: "Company", value: presetPersona.company },
        { label: "Industry", value: presetPersona.industry },
        { label: "Personality", value: presetPersona.personality },
      ]
    : [];

  const description = scenario.context_note
    ? scenario.context_note
    : `${scenario.scenario_type} with ${personaName} at ${scenario.seller_company}.`;

  const tags = [scenario.scenario_type, scenario.seller_company].filter(Boolean);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    const supabase = createClient();
    await supabase.from(table).delete().eq("id", scenario.id);
    setDeleteOpen(false);
    onDeleted();
  };

  const handleStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/simulation/${scenario.id}?table=${table}`);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        {/* Card body is clickable */}
        <div onClick={() => setOpen(true)} className="cursor-pointer">
          <Card className="rounded-2xl border bg-card shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 group relative">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm leading-tight line-clamp-2">{scenario.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{scenario.seller_company}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Badge variant="secondary" className={cn("text-xs font-medium", diffColor)}>
                    {scenario.difficulty}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {scenario.duration} min
                </span>
                <span className="flex items-center gap-1">
                  <BarChart3 className="w-3.5 h-3.5" />
                  {personaName}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[10px] font-normal">
                    {tag}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Button size="sm" className="flex-1 rounded-lg gap-1 text-xs group-hover:gap-2 transition-all" onClick={handleStart}>
                  Start Simulation
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
                {showDelete && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-lg h-8 w-8 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                    onClick={handleDelete}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detail Dialog */}
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[10px] bg-primary/5 border-primary/20 text-primary gap-1">
                <Play className="w-2.5 h-2.5" />
                Custom Scenario
              </Badge>
              <Badge variant="secondary" className={cn("text-xs font-medium", diffColor)}>
                {scenario.difficulty}
              </Badge>
            </div>
            <DialogTitle className="text-lg">{scenario.name}</DialogTitle>
            <DialogDescription>
              {scenario.scenario_type} · {scenario.duration} minutes
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 text-sm">
            {/* Seller Brief */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <Building2 className="w-3.5 h-3.5" />
                What you&apos;re selling
              </div>
              <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
                <p className="font-medium">{scenario.seller_product}</p>
                <p className="text-muted-foreground text-xs whitespace-pre-wrap">{scenario.seller_description}</p>
              </div>
            </div>

            <Separator />

            {/* Buyer Persona */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <Users className="w-3.5 h-3.5" />
                Buyer persona
              </div>
              <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
                <p className="font-medium">{personaFull}</p>
                {personaDetails.map(({ label, value }) => (
                  <p key={label} className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{label}:</span> {value}
                  </p>
                ))}
                {scenario.custom_persona?.painPoints && scenario.custom_persona.painPoints.length > 0 && (
                  <div className="pt-1">
                    <p className="text-xs font-medium text-foreground mb-1">Pain points:</p>
                    <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                      {scenario.custom_persona.painPoints.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Scenario Context */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <MessageSquare className="w-3.5 h-3.5" />
                Call context
              </div>
              <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-[10px]">{scenario.scenario_type}</Badge>
                  <Badge variant="outline" className="text-[10px]">{scenario.duration} min</Badge>
                  <Badge variant="outline" className="text-[10px]">{scenario.difficulty}</Badge>
                </div>
                {scenario.context_note && (
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">{scenario.context_note}</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button className="rounded-xl gap-1" onClick={handleStart}>
              Start Simulation
              <ArrowRight className="w-4 h-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog — sibling, not nested */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Delete scenario?</DialogTitle>
            <DialogDescription>
              This will permanently remove <span className="font-medium text-foreground">{scenario.name}</span>. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" className="rounded-xl gap-1" onClick={confirmDelete}>
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
