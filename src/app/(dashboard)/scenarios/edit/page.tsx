"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Building2, Users, FileCheck, Check, Loader2, Save, Video, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

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

interface FormData {
  name: string;
  sellerCompany: string;
  sellerProduct: string;
  sellerDescription: string;
  scenarioType: string;
  difficulty: string;
  duration: number;
  contextNote: string;
  scoringCriteria: string;
  evaluationFramework: string;
  personaName: string;
  personaJobTitle: string;
  personaCompany: string;
  personaIndustry: string;
  personaPersonality: string;
  personaTraits: string;
  personaPainPoints: string;
  personaPainPointsProcess: string;
  personaPainPointsImpact: string;
  personaGoals: string;
  personaCompanyGoal: string;
  personaPersonalMotivation: string;
  personaCommStyle: string;
  personaCommLanguage: string;
  personaPriorVendor: string;
  personaDecisionCriteria: string;
  personaHiddenConcern: string;
  personaMeetingSource: string;
  personaBudget: string;
  personaTimeline: string;
  personaSampleDialogues: string;
}

const TABS = [
  { id: 1, label: "Scenario", icon: Building2 },
  { id: 2, label: "Persona", icon: Users },
  { id: 3, label: "Avatar & Voice", icon: Video },
  { id: 4, label: "Review", icon: FileCheck },
];

const EMPTY_FORM: FormData = {
  name: "",
  sellerCompany: "",
  sellerProduct: "",
  sellerDescription: "",
  scenarioType: "",
  difficulty: "Beginner",
  duration: 10,
  contextNote: "",
  scoringCriteria: "",
  evaluationFramework: "Standard",
  personaName: "",
  personaJobTitle: "",
  personaCompany: "",
  personaIndustry: "",
  personaPersonality: "",
  personaTraits: "",
  personaPainPoints: "",
  personaPainPointsProcess: "",
  personaPainPointsImpact: "",
  personaGoals: "",
  personaCompanyGoal: "",
  personaPersonalMotivation: "",
  personaCommStyle: "",
  personaCommLanguage: "",
  personaPriorVendor: "",
  personaDecisionCriteria: "",
  personaHiddenConcern: "",
  personaMeetingSource: "",
  personaBudget: "",
  personaTimeline: "",
  personaSampleDialogues: "",
};

function EditScenarioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const table = searchParams.get("table") || "custom_scenarios";

  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [tab, setTab] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [avatars, setAvatars] = useState<HeyGenAvatar[]>([]);
  const [selectedAvatarId, setSelectedAvatarId] = useState("");
  const [selectedVoiceId, setSelectedVoiceId] = useState("");
  const [avatarsLoading, setAvatarsLoading] = useState(false);

  useEffect(() => {
    if (!id) {
      setError("Missing scenario ID");
      setLoading(false);
      return;
    }
    (async () => {
      const supabase = createClient();
      const { data, error: dbErr } = await supabase
        .from(table)
        .select("*")
        .eq("id", id)
        .single();
      if (dbErr || !data) {
        setError(dbErr?.message || "Scenario not found");
        setLoading(false);
        return;
      }
      const p = (data.custom_persona as Record<string, unknown> | null) ?? {};
      setForm({
        name: data.name ?? "",
        sellerCompany: data.seller_company ?? "",
        sellerProduct: data.seller_product ?? "",
        sellerDescription: data.seller_description ?? "",
        scenarioType: data.scenario_type ?? "",
        difficulty: data.difficulty ?? "Beginner",
        duration: data.duration ?? 10,
        contextNote: data.context_note ?? "",
        scoringCriteria: data.scoring_criteria ?? "",
        evaluationFramework: data.evaluation_framework ?? "Standard",
        personaName: (p.name as string) ?? "",
        personaJobTitle: (p.jobTitle as string) ?? "",
        personaCompany: (p.company as string) ?? "",
        personaIndustry: (p.industry as string) ?? "",
        personaPersonality: (p.personality as string) ?? "",
        personaTraits: Array.isArray(p.personalityTraits) ? (p.personalityTraits as string[]).join("\n") : (p.personalityTraits as string) ?? "",
        personaPainPoints: Array.isArray(p.painPoints) ? (p.painPoints as string[]).join("\n") : "",
        personaPainPointsProcess: (p.painPointsCurrentProcess as string) ?? "",
        personaPainPointsImpact: (p.painPointsImpact as string) ?? "",
        personaGoals: Array.isArray(p.goals) ? (p.goals as string[]).join("\n") : "",
        personaCompanyGoal: (p.companyGoal as string) ?? "",
        personaPersonalMotivation: (p.personalMotivation as string) ?? "",
        personaCommStyle: (p.communicationStyle as string) ?? "",
        personaCommLanguage: (p.communicationLanguage as string) ?? "",
        personaPriorVendor: (p.priorVendorExperience as string) ?? "",
        personaDecisionCriteria: (p.decisionCriteria as string) ?? "",
        personaHiddenConcern: (p.hiddenConcern as string) ?? "",
        personaMeetingSource: (p.meetingSource as string) ?? "",
        personaBudget: (p.budgetStatus as string) ?? "",
        personaTimeline: (p.timelinePressure as string) ?? "",
        personaSampleDialogues: (p.sampleDialogues as string) ?? "",
      });
      setSelectedAvatarId(data.avatar_id ?? "");
      setSelectedVoiceId(data.elevenlabs_voice_id ?? "");
      setLoading(false);
    })();
  }, [id, table]);

  useEffect(() => {
    if (tab === 3 && avatars.length === 0 && !avatarsLoading) {
      setAvatarsLoading(true);
      fetch("/api/heygen-test/avatars?page=1&page_size=50")
        .then((r) => r.json())
        .then((data) => setAvatars(data.avatars ?? []))
        .catch(() => setAvatars([]))
        .finally(() => setAvatarsLoading(false));
    }
  }, [tab, avatars.length, avatarsLoading]);

  const update = (field: keyof FormData, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    setError("");
    try {
      const supabase = createClient();
      const payload = {
        name: form.name,
        seller_company: form.sellerCompany,
        seller_product: form.sellerProduct,
        seller_description: form.sellerDescription,
        scenario_type: form.scenarioType,
        difficulty: form.difficulty,
        duration: Number(form.duration),
        context_note: form.contextNote || null,
        scoring_criteria: form.scoringCriteria || null,
        evaluation_framework: form.evaluationFramework || null,
        avatar_id: selectedAvatarId || null,
        avatar_name: avatars.find((a) => a.id === selectedAvatarId)?.name ?? null,
        elevenlabs_voice_id: selectedVoiceId || null,
        voice_avatar_image_url: ELEVENLABS_VOICES.find((v) => v.id === selectedVoiceId)?.imageUrl ?? null,
        custom_persona: {
          name: form.personaName,
          jobTitle: form.personaJobTitle,
          company: form.personaCompany,
          industry: form.personaIndustry,
          personality: form.personaPersonality,
          personalityTraits: form.personaTraits.split("\n").map((s) => s.trim()).filter(Boolean),
          painPoints: form.personaPainPoints.split("\n").map((s) => s.trim()).filter(Boolean),
          painPointsCurrentProcess: form.personaPainPointsProcess || undefined,
          painPointsImpact: form.personaPainPointsImpact || undefined,
          goals: form.personaGoals.split("\n").map((s) => s.trim()).filter(Boolean),
          companyGoal: form.personaCompanyGoal || undefined,
          personalMotivation: form.personaPersonalMotivation || undefined,
          communicationStyle: form.personaCommStyle || undefined,
          communicationLanguage: form.personaCommLanguage || undefined,
          priorVendorExperience: form.personaPriorVendor || undefined,
          decisionCriteria: form.personaDecisionCriteria || undefined,
          hiddenConcern: form.personaHiddenConcern || undefined,
          meetingSource: form.personaMeetingSource || undefined,
          budgetStatus: form.personaBudget || undefined,
          timelinePressure: form.personaTimeline || undefined,
          sampleDialogues: form.personaSampleDialogues || undefined,
        },
      };

      const { error: dbErr } = await supabase.from(table).update(payload).eq("id", id);
      if (dbErr) throw new Error(dbErr.message);
      router.back();
    } catch (e: any) {
      setError(e.message || "Failed to save");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !form.name) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <p className="text-sm text-red-500">{error}</p>
        <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight">Edit Scenario</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Update scenario and persona details</p>
        </div>
      </div>

      {/* Tab indicators */}
      <div className="flex items-center gap-2">
        {TABS.map((t, i) => {
          const Icon = t.icon;
          const active = tab === t.id;
          const done = tab > t.id;
          return (
            <div key={t.id} className="flex items-center gap-2">
              <button
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                  done ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                  active ? "bg-primary/10 text-primary" :
                  "bg-muted text-muted-foreground"
                )}
              >
                {done ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                <span className="hidden sm:inline">{t.label}</span>
              </button>
              {i < TABS.length - 1 && (
                <div className={cn("flex-1 h-px w-4 bg-border", done && "bg-emerald-500/30")} />
              )}
            </div>
          );
        })}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {/* Tab 1: Scenario & Seller */}
          {tab === 1 && (
            <Card className="rounded-2xl border shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  Scenario & Seller Details
                </CardTitle>
                <p className="text-xs text-muted-foreground">Update the scenario setup and what you&apos;re selling.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Scenario Name</Label>
                  <Input value={form.name} onChange={(e) => update("name", e.target.value)} className="rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Company Name</Label>
                    <Input value={form.sellerCompany} onChange={(e) => update("sellerCompany", e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">What do you sell?</Label>
                    <Input value={form.sellerProduct} onChange={(e) => update("sellerProduct", e.target.value)} className="rounded-xl" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Product Description</Label>
                  <Textarea value={form.sellerDescription} onChange={(e) => update("sellerDescription", e.target.value)} rows={3} className="rounded-xl text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Scenario Type</Label>
                    <Input value={form.scenarioType} onChange={(e) => update("scenarioType", e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Difficulty</Label>
                    <select value={form.difficulty} onChange={(e) => update("difficulty", e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm">
                      <option>Beginner</option>
                      <option>Intermediate</option>
                      <option>Advanced</option>
                      <option>Expert</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Duration (min)</Label>
                    <Input type="number" value={form.duration} onChange={(e) => update("duration", Number(e.target.value))} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Evaluation Framework</Label>
                    <select value={form.evaluationFramework} onChange={(e) => update("evaluationFramework", e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm">
                      <option value="">Standard (Discovery-based)</option>
                      <option value="MEDDIC">MEDDIC</option>
                      <option value="BANT">BANT</option>
                      <option value="SPIN">SPIN Selling</option>
                      <option value="Challenger">Challenger Sale</option>
                      <option value="Sandler">Sandler</option>
                      <option value="ValueSelling">ValueSelling</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Context / Backstory</Label>
                  <Textarea value={form.contextNote} onChange={(e) => update("contextNote", e.target.value)} rows={3} className="rounded-xl text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Scoring Criteria</Label>
                  <Textarea value={form.scoringCriteria} onChange={(e) => update("scoringCriteria", e.target.value)} rows={5} className="rounded-xl text-sm" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tab 2: Persona */}
          {tab === 2 && (
            <Card className="rounded-2xl border shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Buyer Persona
                </CardTitle>
                <p className="text-xs text-muted-foreground">Who will you be talking to in this simulation?</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Full Name</Label>
                    <Input value={form.personaName} onChange={(e) => update("personaName", e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Job Title</Label>
                    <Input value={form.personaJobTitle} onChange={(e) => update("personaJobTitle", e.target.value)} className="rounded-xl" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Company</Label>
                    <Input value={form.personaCompany} onChange={(e) => update("personaCompany", e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Industry</Label>
                    <Input value={form.personaIndustry} onChange={(e) => update("personaIndustry", e.target.value)} className="rounded-xl" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Meeting Source</Label>
                  <Input value={form.personaMeetingSource} onChange={(e) => update("personaMeetingSource", e.target.value)} className="rounded-xl text-sm" placeholder="Inbound demo, LinkedIn outreach, warm referral..." />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Personality / Behaviour <span className="font-normal text-muted-foreground">(one per line)</span></Label>
                  <Textarea value={form.personaTraits} onChange={(e) => update("personaTraits", e.target.value)} rows={4} className="rounded-xl text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Personality Summary</Label>
                  <Textarea value={form.personaPersonality} onChange={(e) => update("personaPersonality", e.target.value)} rows={2} className="rounded-xl text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Pain Points <span className="font-normal text-muted-foreground">(one per line)</span></Label>
                    <Textarea value={form.personaPainPoints} onChange={(e) => update("personaPainPoints", e.target.value)} rows={3} className="rounded-xl text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Goals <span className="font-normal text-muted-foreground">(one per line)</span></Label>
                    <Textarea value={form.personaGoals} onChange={(e) => update("personaGoals", e.target.value)} rows={3} className="rounded-xl text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Current Process</Label>
                    <Textarea value={form.personaPainPointsProcess} onChange={(e) => update("personaPainPointsProcess", e.target.value)} rows={2} className="rounded-xl text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Pain Impact</Label>
                    <Input value={form.personaPainPointsImpact} onChange={(e) => update("personaPainPointsImpact", e.target.value)} className="rounded-xl text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Company Goal</Label>
                    <Input value={form.personaCompanyGoal} onChange={(e) => update("personaCompanyGoal", e.target.value)} className="rounded-xl text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Personal Motivation</Label>
                    <Input value={form.personaPersonalMotivation} onChange={(e) => update("personaPersonalMotivation", e.target.value)} className="rounded-xl text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Communication Style</Label>
                    <Input value={form.personaCommStyle} onChange={(e) => update("personaCommStyle", e.target.value)} className="rounded-xl text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Communication Language</Label>
                    <Input value={form.personaCommLanguage} onChange={(e) => update("personaCommLanguage", e.target.value)} className="rounded-xl text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Prior Vendor Experience</Label>
                    <Input value={form.personaPriorVendor} onChange={(e) => update("personaPriorVendor", e.target.value)} className="rounded-xl text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Decision Criteria</Label>
                    <Input value={form.personaDecisionCriteria} onChange={(e) => update("personaDecisionCriteria", e.target.value)} className="rounded-xl text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Hidden Concern</Label>
                    <Input value={form.personaHiddenConcern} onChange={(e) => update("personaHiddenConcern", e.target.value)} className="rounded-xl text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Budget Status</Label>
                    <Input value={form.personaBudget} onChange={(e) => update("personaBudget", e.target.value)} className="rounded-xl text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Timeline Pressure</Label>
                    <Input value={form.personaTimeline} onChange={(e) => update("personaTimeline", e.target.value)} className="rounded-xl text-sm" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Sample Dialogues</Label>
                  <Textarea value={form.personaSampleDialogues} onChange={(e) => update("personaSampleDialogues", e.target.value)} rows={3} className="rounded-xl text-sm" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tab 3: Avatar & Voice */}
          {tab === 3 && (
            <Card className="rounded-2xl border shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Video className="w-4 h-4 text-primary" />
                  Avatar & Voice Configuration
                </CardTitle>
                <p className="text-xs text-muted-foreground">Configure the persona for video and voice call modes. The mode is chosen when starting a simulation.</p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Video Call Avatar */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Video className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold">Video Call Avatar</p>
                      <p className="text-[10px] text-muted-foreground">Shown when the user selects video call mode</p>
                    </div>
                  </div>
                  {avatarsLoading ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                      <div className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      Loading avatars...
                    </div>
                  ) : avatars.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">No avatars available. A default avatar will be used.</p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto pr-1">
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
                            <img src={av.preview_image_url} alt={av.name} className="w-14 h-14 rounded-full object-cover" />
                          ) : (
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/30 to-primary/5 flex items-center justify-center">
                              <Users className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                          <p className="text-[9px] font-medium text-center truncate w-full">{av.name}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="h-px bg-border" />

                {/* Voice Call Voice */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold">Voice Call Voice</p>
                      <p className="text-[10px] text-muted-foreground">Used when the user selects voice call mode</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {ELEVENLABS_VOICES.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVoiceId(v.id)}
                        className={cn(
                          "rounded-xl border p-3 flex flex-col items-center gap-2 transition-all",
                          selectedVoiceId === v.id ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:border-primary/30"
                        )}
                      >
                        <img src={v.imageUrl} alt={v.name} className={cn("w-14 h-14 rounded-full object-cover", selectedVoiceId === v.id && "ring-2 ring-primary")} />
                        <div className="text-center">
                          <p className="text-[10px] font-medium">{v.name}</p>
                          <p className="text-[9px] text-muted-foreground capitalize">{v.gender}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tab 4: Review */}
          {tab === 4 && (
            <Card className="rounded-2xl border shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-primary" />
                  Review & Save
                </CardTitle>
                <p className="text-xs text-muted-foreground">Check the details below before saving.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Scenario</p>
                    <p className="text-sm font-medium mt-0.5">{form.name || "Untitled"}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {form.scenarioType && <Badge variant="outline" className="text-[10px]">{form.scenarioType}</Badge>}
                      <Badge variant="outline" className="text-[10px]">{form.difficulty}</Badge>
                      <Badge variant="outline" className="text-[10px]">{form.duration} min</Badge>
                      {form.evaluationFramework && <Badge variant="outline" className="text-[10px]">{form.evaluationFramework}</Badge>}
                    </div>
                  </div>
                  <div className="h-px bg-border" />
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Seller</p>
                    <p className="text-sm font-medium mt-0.5">{form.sellerCompany} — {form.sellerProduct}</p>
                    {form.sellerDescription && <p className="text-xs text-muted-foreground mt-1">{form.sellerDescription}</p>}
                  </div>
                  <div className="h-px bg-border" />
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Persona</p>
                    <p className="text-sm font-medium mt-0.5">{form.personaName} — {form.personaJobTitle} at {form.personaCompany}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{form.personaIndustry}</p>
                    {form.personaTraits && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {form.personaTraits.split("\n").filter(Boolean).slice(0, 4).map((t, i) => (
                          <span key={i} className="text-[10px] bg-muted px-1.5 py-0.5 rounded-md text-muted-foreground">{t.trim()}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {form.contextNote && (
                    <>
                      <div className="h-px bg-border" />
                      <div>
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Context</p>
                        <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">{form.contextNote}</p>
                      </div>
                    </>
                  )}
                  <div className="h-px bg-border" />
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Avatar & Voice</p>
                    <div className="flex items-center gap-4 mt-1.5">
                      <div className="flex items-center gap-1.5">
                        <Video className="w-3.5 h-3.5 text-primary" />
                        {selectedAvatarId && avatars.find((a) => a.id === selectedAvatarId) ? (
                          <>
                            {avatars.find((a) => a.id === selectedAvatarId)?.preview_image_url && (
                              <img src={avatars.find((a) => a.id === selectedAvatarId)!.preview_image_url!} alt="" className="w-6 h-6 rounded-full object-cover" />
                            )}
                            <span className="text-xs text-muted-foreground">{avatars.find((a) => a.id === selectedAvatarId)?.name}</span>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">Default avatar</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-primary" />
                        {selectedVoiceId && ELEVENLABS_VOICES.find((v) => v.id === selectedVoiceId) ? (
                          <>
                            <img src={ELEVENLABS_VOICES.find((v) => v.id === selectedVoiceId)!.imageUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                            <span className="text-xs text-muted-foreground">{ELEVENLABS_VOICES.find((v) => v.id === selectedVoiceId)?.name}</span>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">Default voice</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-500 bg-red-500/10 rounded-xl px-3 py-2">{error}</p>
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          className="rounded-xl h-11"
          onClick={() => tab === 1 ? router.back() : setTab(tab - 1)}
          disabled={saving}
        >
          <ArrowLeft className="w-4 h-4" />
          {tab === 1 ? "Cancel" : "Back"}
        </Button>
        {tab < 4 ? (
          <Button className="rounded-xl h-11 gap-1.5" onClick={() => setTab(tab + 1)}>
            Next
            <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button className="rounded-xl h-11 gap-1.5" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </Button>
        )}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}>
      <EditScenarioPage />
    </Suspense>
  );
}
