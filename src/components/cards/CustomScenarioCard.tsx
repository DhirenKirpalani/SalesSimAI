"use client";

import { useState, useEffect } from "react";
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
import { Clock, BarChart3, ArrowRight, Trash2, Building2, Users, MessageSquare, Play, Pencil, Video, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { mockPersonas } from "@/lib/data/mockData";
import { useRole } from "@/hooks/useRole";

const CATEGORY_LABELS: Record<string, string> = {
  interviews: "Interviews",
  sales: "Sales",
  leadership: "Leadership",
  corporate_communication: "Corporate Communication",
  negotiation: "Negotiation",
  customer_success: "Customer Success",
  product_management: "Product Management",
  presentations: "Presentations",
  professional_english: "Professional English",
  custom: "Custom",
  payment: "General",
  eor: "General",
  cards: "General",
};

const CATEGORY_COLORS: Record<string, string> = {
  interviews: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  sales: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  leadership: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  corporate_communication: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  negotiation: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  customer_success: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  product_management: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  presentations: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  professional_english: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  custom: "bg-muted text-muted-foreground",
  payment: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  eor: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  cards: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

interface HeyGenAvatar {
  id: string;
  name: string;
  preview_image_url: string | null;
  gender: string | null;
  voice_id: string | null;
}

const ELEVENLABS_VOICES = [
  { id: "8qPG2eSETnKl5ezq52Js", name: "Female Voice 1", gender: "female", imageUrl: "https://haqghlhwfpyrvfluyrkv.supabase.co/storage/v1/object/public/voice-avatars/3b36069a-1e17-45ac-9ccd-11af34c39617/1782747409955.jpg" },
  { id: "Y7xQSS5ZtS4xv4VJotWd", name: "Female Voice 2", gender: "female", imageUrl: "https://haqghlhwfpyrvfluyrkv.supabase.co/storage/v1/object/public/voice-avatars/3b36069a-1e17-45ac-9ccd-11af34c39617/1782748798191.jpg" },
  { id: "FXMPPfJPpDj0GSwJ6ASO", name: "Male Voice 1", gender: "male", imageUrl: "https://haqghlhwfpyrvfluyrkv.supabase.co/storage/v1/object/public/voice-avatars/3b36069a-1e17-45ac-9ccd-11af34c39617/1782747998663.jpg" },
];

interface CustomScenarioCardProps {
  scenario: CustomScenario;
  onDeleted: () => void;
  table?: string;
  compact?: boolean;
  compactIcon?: React.ReactNode;
  compactColor?: string;
}

export function CustomScenarioCard({ scenario, onDeleted, table = "custom_scenarios", compact = false, compactIcon, compactColor }: CustomScenarioCardProps) {
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [startLoading, setStartLoading] = useState(false);
  const [overrideAvatarId, setOverrideAvatarId] = useState(scenario.avatar_id ?? "");
  const [overrideVoiceId, setOverrideVoiceId] = useState(scenario.voice_id ?? "");
  const [simMode, setSimMode] = useState<"video" | "voice">("video");
  const [avatars, setAvatars] = useState<HeyGenAvatar[]>([]);
  const [selectedAvatarId, setSelectedAvatarId] = useState(scenario.avatar_id ?? "");
  const [selectedVoiceId, setSelectedVoiceId] = useState(scenario.elevenlabs_voice_id ?? "");
  const [avatarsLoading, setAvatarsLoading] = useState(false);
  const router = useRouter();
  const { isAdmin } = useRole();
  const isPlatform = table === "platform_scenarios";
  const showDelete = !isPlatform || isAdmin;

  useEffect(() => {
    if (open && simMode === "video" && avatars.length === 0 && !avatarsLoading) {
      setAvatarsLoading(true);
      fetch("/api/heygen-test/avatars?page=1&page_size=50")
        .then((r) => r.json())
        .then((data) => setAvatars(data.avatars ?? []))
        .catch(() => setAvatars([]))
        .finally(() => setAvatarsLoading(false));
    }
  }, [open, simMode, avatars.length, avatarsLoading]);

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
    : presetPersona?.jobTitle ?? "AI Persona";

  const personaFull = scenario.custom_persona
    ? `${scenario.custom_persona.name} — ${scenario.custom_persona.jobTitle} at ${scenario.custom_persona.company}`
    : presetPersona
    ? `${presetPersona.name} — ${presetPersona.jobTitle} at ${presetPersona.company}`
    : "AI Persona";

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

  const handleStart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (startLoading) return;
    setStartLoading(true);
    try {
      const res = await fetch("/api/simulation/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: scenario.id,
          scenarioTable: table,
          avatarId: simMode === "video" ? (selectedAvatarId || overrideAvatarId || undefined) : undefined,
          avatarImageUrl: simMode === "video" ? (avatars.find((a) => a.id === (selectedAvatarId || overrideAvatarId))?.preview_image_url ?? undefined) : undefined,
          voiceId: simMode === "voice" ? (overrideVoiceId || undefined) : undefined,
          scenarioName: scenario.name || undefined,
          avatarName: scenario.avatar_name ? scenario.avatar_name.split(" ")[0] : undefined,
          voiceAvatarImageUrl: simMode === "voice"
            ? (ELEVENLABS_VOICES.find((v) => v.id === selectedVoiceId)?.imageUrl ?? scenario.voice_avatar_image_url ?? undefined)
            : (scenario.voice_avatar_image_url ?? undefined),
          elevenlabsVoiceId: simMode === "voice" ? (selectedVoiceId || scenario.elevenlabs_voice_id || undefined) : undefined,
          callMode: simMode,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.sessionId) {
        throw new Error(data.error || "Failed to prepare simulation");
      }
      router.push(`/simulation?sessionId=${data.sessionId}`);
    } catch (err) {
      console.error("[handleStart]", err);
      alert(err instanceof Error ? err.message : "Failed to start simulation");
      setStartLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        {compact ? (
          <div onClick={() => setOpen(true)} className="cursor-pointer">
            <button
              className="group/tpl w-full rounded-2xl border border-border bg-card p-4 sm:p-5 text-left hover:shadow-md hover:border-primary/20 transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight">{scenario.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{personaFull}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className={cn("text-[10px] font-medium", diffColor)}>
                      {scenario.difficulty}
                    </Badge>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {scenario.duration} min
                    </span>
                  </div>
                </div>
                <div className={`p-2 rounded-lg ${compactColor ?? "text-orange-600 bg-orange-500/10"} shrink-0 transition-transform group-hover/tpl:scale-110`}>
                  {compactIcon ?? <Play className="w-4 h-4" />}
                </div>
              </div>
            </button>
          </div>
        ) : (
        <div onClick={() => setOpen(true)} className="cursor-pointer">
          <Card className="rounded-2xl border bg-card shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 group relative">
            <CardHeader className="pb-2 pt-4 px-4 sm:px-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base leading-tight line-clamp-2">{scenario.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{scenario.seller_company}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {scenario.product_type && !["payment", "eor", "cards"].includes(scenario.product_type) && scenario.scenario_type !== "First Round Interview" && scenario.scenario_type !== "Product Knowledge Interview" && (
                    <Badge variant="secondary" className={cn("text-[10px] sm:text-xs font-medium", CATEGORY_COLORS[scenario.product_type] ?? "bg-muted text-muted-foreground")}>
                      {CATEGORY_LABELS[scenario.product_type] ?? scenario.product_type}
                    </Badge>
                  )}
                  <Badge variant="secondary" className={cn("text-[10px] sm:text-xs font-medium", diffColor)}>
                    {scenario.difficulty}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 px-4 sm:px-5 pb-5">
              {/* What you're selling */}
              <div className="flex items-start gap-2.5 sm:gap-2">
                <div className="p-2 sm:p-1.5 rounded-lg sm:rounded-md bg-orange-500/10 text-orange-500 shrink-0 mt-0.5">
                  <Building2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Your Topic</p>
                  <p className="text-sm font-medium text-foreground line-clamp-1">{scenario.seller_product}</p>
                </div>
              </div>

              {/* Who you're talking to */}
              <div className="flex items-start gap-2.5 sm:gap-2">
                <div className="p-2 sm:p-1.5 rounded-lg sm:rounded-md bg-orange-500/10 text-orange-500 shrink-0 mt-0.5">
                  <Users className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Persona</p>
                  <p className="text-sm font-medium text-foreground line-clamp-1">{personaFull}</p>
                </div>
              </div>

              {/* The challenge / scenario type */}
              <div className="flex items-start gap-2.5 sm:gap-2">
                <div className="p-2 sm:p-1.5 rounded-lg sm:rounded-md bg-orange-500/10 text-orange-500 shrink-0 mt-0.5">
                  <MessageSquare className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Scenario</p>
                  <p className="text-sm text-foreground line-clamp-2">
                    {scenario.scenario_type}
                    {(() => {
                      const pain = scenario.custom_persona?.painPoints?.[0] ?? presetPersona?.painPoints?.[0];
                      return pain ? ` — ${pain}` : "";
                    })()}
                  </p>
                </div>
              </div>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-muted-foreground pt-1">
                <span className="flex items-center gap-1 whitespace-nowrap shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                  {scenario.duration} min
                </span>
                <span className="flex items-center gap-1 whitespace-nowrap shrink-0">
                  <BarChart3 className="w-3.5 h-3.5" />
                  {scenario.difficulty}
                </span>
              </div>

              <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                <Button size="sm" className="flex-1 rounded-lg gap-1.5 text-sm sm:text-xs h-11 sm:h-9 group-hover:gap-2 transition-all bg-orange-500 hover:bg-orange-600 text-white" onClick={handleStart} disabled={startLoading}>
                  {startLoading ? "Preparing…" : "Start Simulation"}
                  {!startLoading && <ArrowRight className="w-4 h-4 sm:w-3.5 sm:h-3.5" />}
                </Button>
                {showDelete && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-lg h-11 w-11 sm:h-9 sm:w-9 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                    onClick={handleDelete}
                    aria-label="Delete scenario"
                  >
                    <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        )}

        {/* Detail Dialog */}
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[10px] bg-primary/5 border-primary/20 text-primary gap-1">
                <Play className="w-2.5 h-2.5" />
                {isPlatform ? "Platform Scenario" : "Custom Scenario"}
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
                {(() => {
                  const pts = scenario.custom_persona?.painPoints ?? presetPersona?.painPoints;
                  return pts && pts.length > 0 ? (
                    <div className="pt-1">
                      <p className="text-xs font-medium text-foreground mb-1">Pain points:</p>
                      <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                        {pts.map((p, i) => <li key={i}>{p}</li>)}
                      </ul>
                    </div>
                  ) : null;
                })()}
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
                  {scenario.product_type && !["payment", "eor", "cards"].includes(scenario.product_type) && scenario.scenario_type !== "First Round Interview" && scenario.scenario_type !== "Product Knowledge Interview" && (
                    <Badge variant="outline" className="text-[10px]">
                      {CATEGORY_LABELS[scenario.product_type] ?? scenario.product_type}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-[10px]">{scenario.duration} min</Badge>
                  <Badge variant="outline" className="text-[10px]">{scenario.difficulty}</Badge>
                </div>
                {scenario.context_note && (
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">{scenario.context_note}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Generated by */}
          {(scenario.member_name || scenario.member_role) && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <Users className="w-3.5 h-3.5" />
                Generated by
              </div>
              <div className="rounded-xl border bg-muted/30 p-3">
                <p className="text-sm text-foreground">
                  {scenario.member_name || "Unknown member"}
                  {scenario.member_role && ` · ${scenario.member_role}`}
                </p>
              </div>
            </div>
          )}

          <Separator />

          {/* Practice mode with persona previews */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <Video className="w-3.5 h-3.5" />
              Practice Mode
            </div>
            <div className="grid grid-cols-2 gap-3">
              {/* Video Call card */}
              <button
                className={cn(
                  "rounded-xl border p-3 text-left transition-all",
                  simMode === "video" ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:border-primary/30"
                )}
                onClick={() => setSimMode("video")}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <div className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center",
                    simMode === "video" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    <Video className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-semibold">Video Call</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/5 flex items-center justify-center shrink-0 ring-1 ring-border">
                    <Users className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{scenario.avatar_name || personaFull.split(" — ")[0]}</p>
                    <p className="text-[10px] text-muted-foreground truncate">AI Avatar</p>
                  </div>
                </div>
              </button>

              {/* Voice Call card */}
              <button
                className={cn(
                  "rounded-xl border p-3 text-left transition-all",
                  simMode === "voice" ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:border-primary/30"
                )}
                onClick={() => setSimMode("voice")}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <div className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center",
                    simMode === "voice" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    <Phone className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-semibold">Voice Call</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center shrink-0 ring-1 ring-border">
                    <Phone className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{scenario.avatar_name || personaFull.split(" — ")[0]}</p>
                    <p className="text-[10px] text-muted-foreground truncate">Voice Only</p>
                  </div>
                </div>
              </button>
            </div>

            {/* Avatar selection for video mode */}
            {simMode === "video" && (
              <div className="space-y-2 pt-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Select Avatar</p>
                {avatarsLoading ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                    <div className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    Loading avatars...
                  </div>
                ) : avatars.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground py-2">No avatars available. A default avatar will be used.</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                    {avatars.map((av) => (
                      <button
                        key={av.id}
                        onClick={() => setSelectedAvatarId(av.id)}
                        className={cn(
                          "rounded-lg border p-1.5 flex flex-col items-center gap-1 transition-all",
                          selectedAvatarId === av.id ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:border-primary/30"
                        )}
                      >
                        {av.preview_image_url ? (
                          <img src={av.preview_image_url} alt={av.name} className="w-12 h-12 rounded-full object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-primary/5 flex items-center justify-center">
                            <Users className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        <p className="text-[9px] font-medium text-center truncate w-full">{av.name}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Voice selection for voice mode */}
            {simMode === "voice" && (
              <div className="space-y-2 pt-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Select Voice</p>
                <div className="grid grid-cols-3 gap-2">
                  {ELEVENLABS_VOICES.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVoiceId(v.id)}
                      className={cn(
                        "rounded-lg border p-2.5 flex flex-col items-center gap-1.5 transition-all",
                        selectedVoiceId === v.id ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:border-primary/30"
                      )}
                    >
                      <img src={v.imageUrl} alt={v.name} className={cn("w-12 h-12 rounded-full object-cover", selectedVoiceId === v.id && "ring-2 ring-primary")} />
                      <p className="text-[9px] font-medium text-center">{v.name}</p>
                      <p className="text-[8px] text-muted-foreground capitalize">{v.gender}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-4 gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button
              variant="outline"
              className="rounded-xl gap-1"
              onClick={() => router.push(`/scenarios/edit?id=${scenario.id}&table=${table}`)}
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </Button>
            <Button className="rounded-xl gap-1" onClick={handleStart} disabled={startLoading}>
              {startLoading ? "Preparing…" : "Start Simulation"}
              {!startLoading && <ArrowRight className="w-4 h-4" />}
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
