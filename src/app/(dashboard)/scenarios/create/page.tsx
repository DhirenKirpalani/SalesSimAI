"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Users,
  Settings2,
  FileCheck,
  Check,
  Plus,
  Loader2,
  Clock,
  Sparkles,
  Image,
  Phone,
  Upload,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { mockPersonas } from "@/lib/data/mockData";
import { cn } from "@/lib/utils";
import { AvatarPicker } from "@/components/AvatarPicker";

const STEPS = [
  { id: 1, label: "Your Company", icon: Building2 },
  { id: 2, label: "Buyer Persona", icon: Users },
  { id: 3, label: "Avatar", icon: Image },
  { id: 4, label: "Scenario Setup", icon: Settings2 },
  { id: 5, label: "Review", icon: FileCheck },
];

const SCENARIO_TYPES = [
  "First Discovery Call",
  "Objection Handling",
  "Negotiation",
  "Product Demo",
  "Pitch",
  "Win-Back",
  "Renewal",
  "Executive Presentation",
  "Product Knowledge Interview",
];

const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced", "Expert"] as const;
const DURATIONS = [5, 10, 15, 20];

const PRODUCT_TYPES = [
  { value: "payment", label: "Payment" },
  { value: "eor", label: "EoR" },
  { value: "cards", label: "Cards" },
] as const;

type ProductType = typeof PRODUCT_TYPES[number]["value"];

const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  payment: "Payment",
  eor: "EoR",
  cards: "Cards",
};

const EVALUATION_FRAMEWORKS = [
  { value: "", label: "Standard (Discovery-based)" },
  { value: "MEDDIC", label: "MEDDIC" },
  { value: "BANT", label: "BANT" },
  { value: "SPIN", label: "SPIN Selling" },
  { value: "Challenger", label: "Challenger Sale" },
  { value: "Sandler", label: "Sandler" },
  { value: "ValueSelling", label: "ValueSelling" },
  { value: "Custom", label: "Custom" },
];

const KNOWN_FRAMEWORK_VALUES = new Set(EVALUATION_FRAMEWORKS.map((f) => f.value));
function isKnownFramework(value: string | null | undefined): boolean {
  return !!value && KNOWN_FRAMEWORK_VALUES.has(value);
}

type Difficulty = typeof DIFFICULTIES[number];

interface FormState {
  sellerCompany: string;
  sellerProduct: string;
  productType: "payment" | "eor" | "cards";
  sellerDescription: string;
  usePresetPersona: boolean;
  presetPersonaId: string;
  customPersonaName: string;
  customPersonaTitle: string;
  customPersonaCompany: string;
  customPersonaIndustry: string;
  customPersonaPersonality: string;
  customPersonaPersonalityTraits: string;
  customPersonaPainPoints: string;
  customPersonaPainPointsProcess: string;
  customPersonaPainPointsImpact: string;
  customPersonaGoals: string;
  customPersonaCompanyGoal: string;
  customPersonaPersonalMotivation: string;
  customPersonaCommStyle: string;
  customPersonaCommLanguage: string;
  customPersonaPriorVendor: string;
  customPersonaDecisionCriteria: string;
  customPersonaHiddenConcern: string;
  customPersonaMeetingSource: string;
  customPersonaBudget: string;
  customPersonaTimeline: string;
  customPersonaSampleDialogues: string;
  scenarioType: string;
  difficulty: Difficulty;
  duration: number;
  contextNote: string;
  avatarId: string;
  avatarName: string;
  voiceId: string;
  voiceAvatarImageUrl: string;
  elevenlabsVoiceId: string;
  scoringCriteria: string;
  evaluationFramework: string;
  customEvaluationFramework: string;
}

const LS_KEY = "day1_createScenario";

const INITIAL: FormState = {
  sellerCompany: "",
  sellerProduct: "",
  productType: "payment",
  sellerDescription: "",
  usePresetPersona: true,
  presetPersonaId: "",
  customPersonaName: "",
  customPersonaTitle: "",
  customPersonaCompany: "",
  customPersonaIndustry: "",
  customPersonaPersonality: "",
  customPersonaPersonalityTraits: "",
  customPersonaPainPoints: "",
  customPersonaPainPointsProcess: "",
  customPersonaPainPointsImpact: "",
  customPersonaGoals: "",
  customPersonaCompanyGoal: "",
  customPersonaPersonalMotivation: "",
  customPersonaCommStyle: "",
  customPersonaCommLanguage: "",
  customPersonaPriorVendor: "",
  customPersonaDecisionCriteria: "",
  customPersonaHiddenConcern: "",
  customPersonaMeetingSource: "",
  customPersonaBudget: "",
  customPersonaTimeline: "",
  customPersonaSampleDialogues: "",
  scenarioType: "First Discovery Call",
  difficulty: "Intermediate",
  duration: 5,
  contextNote: "",
  avatarId: "",
  avatarName: "",
  voiceId: "",
  voiceAvatarImageUrl: "",
  elevenlabsVoiceId: "",
  scoringCriteria: "",
  evaluationFramework: "",
  customEvaluationFramework: "",
};

function loadFromStorage(): { step: number; form: FormState } | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return { step: parsed.step ?? 1, form: { ...INITIAL, ...parsed.form } };
  } catch {
    return null;
  }
}

function CreateScenarioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId");
  const editTable = searchParams.get("editTable") || "custom_scenarios";
  const isEditMode = !!editId;

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadingEdit, setLoadingEdit] = useState(isEditMode);
  const [uploadingVoiceAvatar, setUploadingVoiceAvatar] = useState(false);
  const voiceAvatarInputRef = useRef<HTMLInputElement>(null);

  // Restore from localStorage on client mount (avoid hydration mismatch)
  useEffect(() => {
    if (isEditMode) return;
    const saved = loadFromStorage();
    if (saved) {
      setStep(saved.step);
      setForm(saved.form);
    }
  }, [isEditMode]);

  // Load existing scenario in edit mode
  useEffect(() => {
    if (!isEditMode || !editId) return;
    let cancelled = false;
    (async () => {
      setLoadingEdit(true);
      const supabase = createClient();
      const { data } = await supabase.from(editTable).select("*").eq("id", editId).single();
      if (!cancelled && data) {
        const cp = data.custom_persona as Record<string, unknown> | null;
        setForm({
          sellerCompany: data.seller_company ?? "",
          sellerProduct: data.seller_product ?? "",
          productType: (data.product_type as "payment" | "eor" | "cards") ?? "payment",
          sellerDescription: data.seller_description ?? "",
          usePresetPersona: !cp && !!data.preset_persona_id,
          presetPersonaId: data.preset_persona_id ?? "",
          customPersonaName: cp?.name ? String(cp.name) : "",
          customPersonaTitle: cp?.jobTitle ? String(cp.jobTitle) : "",
          customPersonaCompany: cp?.company ? String(cp.company) : "",
          customPersonaIndustry: cp?.industry ? String(cp.industry) : "",
          customPersonaPersonality: cp?.personality ? String(cp.personality) : "",
          customPersonaPersonalityTraits: Array.isArray(cp?.personalityTraits) ? (cp.personalityTraits as string[]).join("\n") : (cp?.personalityTraits ? String(cp.personalityTraits) : ""),
          customPersonaPainPoints: Array.isArray(cp?.painPoints) ? (cp.painPoints as string[]).join("\n") : "",
          customPersonaPainPointsProcess: cp?.painPointsCurrentProcess ? String(cp.painPointsCurrentProcess) : "",
          customPersonaPainPointsImpact: cp?.painPointsImpact ? String(cp.painPointsImpact) : "",
          customPersonaGoals: Array.isArray(cp?.goals) ? (cp.goals as string[]).join("\n") : "",
          customPersonaCompanyGoal: cp?.companyGoal ? String(cp.companyGoal) : "",
          customPersonaPersonalMotivation: cp?.personalMotivation ? String(cp.personalMotivation) : "",
          customPersonaCommStyle: cp?.communicationStyle ? String(cp.communicationStyle) : "",
          customPersonaCommLanguage: cp?.communicationLanguage ? String(cp.communicationLanguage) : "",
          customPersonaPriorVendor: cp?.priorVendorExperience ? String(cp.priorVendorExperience) : "",
          customPersonaDecisionCriteria: cp?.decisionCriteria ? String(cp.decisionCriteria) : "",
          customPersonaHiddenConcern: cp?.hiddenConcern ? String(cp.hiddenConcern) : "",
          customPersonaMeetingSource: cp?.meetingSource ? String(cp.meetingSource) : "",
          customPersonaBudget: cp?.budgetStatus ? String(cp.budgetStatus) : "",
          customPersonaTimeline: cp?.timelinePressure ? String(cp.timelinePressure) : "",
          customPersonaSampleDialogues: cp?.sampleDialogues ? String(cp.sampleDialogues) : "",
          scenarioType: data.scenario_type ?? "First Discovery Call",
          difficulty: (data.difficulty as Difficulty) ?? "Intermediate",
          duration: data.duration ?? 5,
          contextNote: data.context_note ?? "",
          avatarId: data.avatar_id ?? "",
          avatarName: data.avatar_name ?? "",
          voiceId: data.voice_id ?? "",
          voiceAvatarImageUrl: data.voice_avatar_image_url ?? "",
          elevenlabsVoiceId: data.elevenlabs_voice_id ?? "",
          scoringCriteria: data.scoring_criteria ?? "",
          evaluationFramework: isKnownFramework(data.evaluation_framework) ? data.evaluation_framework : "Custom",
          customEvaluationFramework: isKnownFramework(data.evaluation_framework) ? "" : (data.evaluation_framework ?? ""),
        });
      }
      setLoadingEdit(false);
    })();
    return () => { cancelled = true; };
  }, [isEditMode, editId, editTable]);

  // Persist state whenever step or form changes (skip in edit mode)
  useEffect(() => {
    if (isEditMode) return;
    localStorage.setItem(LS_KEY, JSON.stringify({ step, form }));
  }, [step, form, isEditMode]);

  const set = (field: keyof FormState, value: string | boolean | number) =>
    setForm((f) => ({ ...f, [field]: value }));

  const selectedPresetPersona = mockPersonas.find((p) => p.id === form.presetPersonaId);

  const scenarioName = form.sellerCompany && form.scenarioType
    ? `${form.sellerCompany} — ${form.scenarioType}`
    : "Untitled Scenario";

  const canGoNext = () => {
    if (step === 1) return form.sellerCompany.trim() && form.sellerProduct.trim() && form.sellerDescription.trim().length >= 20;
    if (step === 2) {
      if (form.usePresetPersona) return !!form.presetPersonaId;
      return form.customPersonaName.trim() && form.customPersonaTitle.trim() && form.customPersonaCompany.trim();
    }
    if (step === 3) return !!form.avatarId;
    if (step === 4) return !!form.scenarioType;
    return true;
  };

  const handleVoiceAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVoiceAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/scenarios/voice-avatar", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      set("voiceAvatarImageUrl", data.url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setError(msg);
    } finally {
      setUploadingVoiceAvatar(false);
      if (voiceAvatarInputRef.current) voiceAvatarInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated."); setSaving(false); return; }

    const { data: userProfile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();
    const organizationId = userProfile?.organization_id ?? null;

    const payload: Record<string, unknown> = {
      seller_company: form.sellerCompany,
      seller_product: form.sellerProduct,
      product_type: form.productType,
      seller_description: form.sellerDescription,
      preset_persona_id: form.usePresetPersona ? form.presetPersonaId : null,
      custom_persona: !form.usePresetPersona ? {
        name: form.customPersonaName,
        jobTitle: form.customPersonaTitle,
        company: form.customPersonaCompany,
        industry: form.customPersonaIndustry,
        personality: form.customPersonaPersonality,
        personalityTraits: form.customPersonaPersonalityTraits.split("\n").map((s) => s.trim()).filter(Boolean),
        painPoints: form.customPersonaPainPoints.split("\n").map((s) => s.trim()).filter(Boolean),
        painPointsCurrentProcess: form.customPersonaPainPointsProcess || undefined,
        painPointsImpact: form.customPersonaPainPointsImpact || undefined,
        goals: form.customPersonaGoals.split("\n").map((s) => s.trim()).filter(Boolean),
        companyGoal: form.customPersonaCompanyGoal || undefined,
        personalMotivation: form.customPersonaPersonalMotivation || undefined,
        communicationStyle: form.customPersonaCommStyle || undefined,
        communicationLanguage: form.customPersonaCommLanguage || undefined,
        priorVendorExperience: form.customPersonaPriorVendor || undefined,
        decisionCriteria: form.customPersonaDecisionCriteria || undefined,
        hiddenConcern: form.customPersonaHiddenConcern || undefined,
        meetingSource: form.customPersonaMeetingSource || undefined,
        budgetStatus: form.customPersonaBudget || undefined,
        timelinePressure: form.customPersonaTimeline || undefined,
        sampleDialogues: form.customPersonaSampleDialogues || undefined,
      } : null,
      scenario_type: form.scenarioType,
      difficulty: form.difficulty,
      duration: form.duration,
      context_note: form.contextNote || null,
      avatar_id: form.avatarId || null,
      avatar_name: form.avatarName || null,
      voice_id: form.voiceId || null,
      voice_avatar_image_url: form.voiceAvatarImageUrl || null,
      elevenlabs_voice_id: form.elevenlabsVoiceId || null,
      scoring_criteria: form.scoringCriteria || null,
      evaluation_framework: form.evaluationFramework === "Custom"
        ? (form.customEvaluationFramework || "Custom")
        : (form.evaluationFramework || null),
    };

    if (isEditMode && editId) {
      const { error: dbErr } = await supabase.from(editTable).update(payload).eq("id", editId);
      if (dbErr) { setError(dbErr.message); setSaving(false); return; }
      router.push("/scenarios");
    } else {
      const { error: dbErr } = await supabase.from("custom_scenarios").insert({
        ...payload,
        name: scenarioName,
        user_id: user.id,
        created_by: user.id,
        organization_id: organizationId,
      });
      if (dbErr) { setError(dbErr.message); setSaving(false); return; }
      localStorage.removeItem(LS_KEY);
      router.push("/scenarios");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => router.push("/scenarios")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">{isEditMode ? "Edit Scenario" : "Create Custom Scenario"}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{isEditMode ? "Update the scenario details below." : "Build a simulation tailored to your product and buyers"}</p>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const active = step === s.id;
          const done = step > s.id;
          return (
            <div key={s.id} className="flex items-center gap-2">
              <div className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                done ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                active ? "bg-primary/10 text-primary" :
                "bg-muted text-muted-foreground"
              )}>
                {done ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn("flex-1 h-px w-4 bg-border", done && "bg-emerald-500/30")} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {/* Step 1: Your Company */}
          {step === 1 && (
            <Card className="rounded-2xl border shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  Tell us about your company
                </CardTitle>
                <p className="text-xs text-muted-foreground">This becomes the context the AI buyer understands — what you&apos;re selling and why it matters.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sellerCompany" className="text-xs font-medium">Company Name</Label>
                  <Input
                    id="sellerCompany"
                    placeholder="e.g. Aspire, Stripe, Rippling"
                    className="rounded-xl"
                    value={form.sellerCompany}
                    onChange={(e) => set("sellerCompany", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sellerProduct" className="text-xs font-medium">What do you sell?</Label>
                  <Input
                    id="sellerProduct"
                    placeholder="e.g. B2B expense management SaaS for scale-ups in SEA"
                    className="rounded-xl"
                    value={form.sellerProduct}
                    onChange={(e) => set("sellerProduct", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Product Type</Label>
                  <Select value={form.productType} onValueChange={(v) => set("productType", v as ProductType)}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCT_TYPES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sellerDescription" className="text-xs font-medium">
                    Company & Product Brief
                    <span className="ml-1 text-muted-foreground font-normal">(min. 20 chars)</span>
                  </Label>
                  <Textarea
                    id="sellerDescription"
                    className="rounded-xl min-h-[180px] text-sm"
                    placeholder={`Write a brief like you'd give to a new hire. Include:
• What problem you solve
• Who your ideal customer is
• Key value propositions
• Differentiators vs competitors
• Any pricing / packaging context

Example:
Aspire is a B2B fintech platform offering corporate cards, multi-currency accounts, and expense management for growing businesses in Southeast Asia. We help finance teams replace manual processes and spreadsheets with automated approval workflows and real-time spend visibility. Our core differentiator is instant onboarding (no branch visits) and deep ERP integrations with Xero, NetSuite, and QuickBooks. We sell to CFOs, Financial Controllers, and finance ops leaders at companies with 50–500 employees.`}
                    value={form.sellerDescription}
                    onChange={(e) => set("sellerDescription", e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">{form.sellerDescription.length} characters</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Buyer Persona */}
          {step === 2 && (
            <Card className="rounded-2xl border shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Choose a buyer persona
                </CardTitle>
                <p className="text-xs text-muted-foreground">Who will you be selling to? Pick a preset or build your own.</p>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Toggle */}
                <div className="flex rounded-xl border overflow-hidden">
                  <button
                    className={cn("flex-1 py-2 text-xs font-medium transition-colors", form.usePresetPersona ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
                    onClick={() => set("usePresetPersona", true)}
                  >
                    Preset Personas
                  </button>
                  <button
                    className={cn("flex-1 py-2 text-xs font-medium transition-colors", !form.usePresetPersona ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
                    onClick={() => set("usePresetPersona", false)}
                  >
                    Build My Own
                  </button>
                </div>

                {form.usePresetPersona ? (
                  <div className="space-y-2">
                    {mockPersonas.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => set("presetPersonaId", p.id)}
                        className={cn(
                          "w-full text-left rounded-xl border p-3 transition-all",
                          form.presetPersonaId === p.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/40 hover:bg-muted/30"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.jobTitle} · {p.company}</p>
                          </div>
                          {form.presetPersonaId === p.id && (
                            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                              <Check className="w-3 h-3 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {p.painPoints.slice(0, 2).map((pt) => (
                            <span key={pt} className="text-[10px] bg-muted px-1.5 py-0.5 rounded-md text-muted-foreground">{pt}</span>
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Full Name</Label>
                        <Input className="rounded-xl" placeholder="Daniel Lim" value={form.customPersonaName} onChange={(e) => set("customPersonaName", e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Job Title</Label>
                        <Input className="rounded-xl" placeholder="Financial Controller" value={form.customPersonaTitle} onChange={(e) => set("customPersonaTitle", e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Company</Label>
                        <Input className="rounded-xl" placeholder="BloomCommerce" value={form.customPersonaCompany} onChange={(e) => set("customPersonaCompany", e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Industry</Label>
                        <Input className="rounded-xl" placeholder="E-commerce, Fintech..." value={form.customPersonaIndustry} onChange={(e) => set("customPersonaIndustry", e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Meeting Source</Label>
                      <Input
                        className="rounded-xl text-sm"
                        placeholder="Inbound demo request, LinkedIn outreach, warm referral..."
                        value={form.customPersonaMeetingSource}
                        onChange={(e) => set("customPersonaMeetingSource", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Personality / Behaviour <span className="font-normal text-muted-foreground">(one per line)</span></Label>
                      <Textarea
                        className="rounded-xl text-sm min-h-[80px]"
                        placeholder={"Analytical and detail-oriented\nProfessional but slightly skeptical\nDoes not reveal problems immediately\nWill answer when asked good discovery questions\nPushes back on vague claims"}
                        value={form.customPersonaPersonalityTraits}
                        onChange={(e) => set("customPersonaPersonalityTraits", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Current Process</Label>
                      <Textarea
                        className="rounded-xl text-sm min-h-[60px]"
                        placeholder={"Expenses approved through email and spreadsheets\nFinance manually reconciles transactions monthly\nLimited visibility into department spending"}
                        value={form.customPersonaPainPointsProcess}
                        onChange={(e) => set("customPersonaPainPointsProcess", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Impact</Label>
                      <Textarea
                        className="rounded-xl text-sm min-h-[60px]"
                        placeholder={"Finance team spends too much time on admin\nErrors happen during reconciliation\nReporting takes longer than it should"}
                        value={form.customPersonaPainPointsImpact}
                        onChange={(e) => set("customPersonaPainPointsImpact", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Other Pain Points <span className="font-normal text-muted-foreground">(one per line)</span></Label>
                      <Textarea
                        className="rounded-xl text-sm min-h-[60px]"
                        placeholder={"Lack of visibility into team spend\nAudit prep takes weeks"}
                        value={form.customPersonaPainPoints}
                        onChange={(e) => set("customPersonaPainPoints", e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Company Goal</Label>
                        <Input className="rounded-xl text-sm" placeholder="Improve finance operations" value={form.customPersonaCompanyGoal} onChange={(e) => set("customPersonaCompanyGoal", e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Personal Motivation</Label>
                        <Input className="rounded-xl text-sm" placeholder="Reduce manual work and look more strategic to CFO" value={form.customPersonaPersonalMotivation} onChange={(e) => set("customPersonaPersonalMotivation", e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Other Goals <span className="font-normal text-muted-foreground">(one per line)</span></Label>
                      <Textarea
                        className="rounded-xl text-sm min-h-[60px]"
                        placeholder={"Get budget approval by Q3\nUnderstand integration requirements"}
                        value={form.customPersonaGoals}
                        onChange={(e) => set("customPersonaGoals", e.target.value)}
                      />
                    </div>

                    {/* Advanced persona fields */}
                    <div className="pt-2">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Advanced (for realism)</p>
                      <div className="grid grid-cols-1 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-[11px] font-medium">Communication Language / Environment</Label>
                          <Textarea
                            className="rounded-xl text-sm min-h-[60px]"
                            placeholder={"Singapore business environment\nProfessional casual communication\nShort responses\nMay naturally mix English with Singlish/Bahasa\nMatch seller's language\nDoes not overshare information\nPolite but skeptical"}
                            value={form.customPersonaCommLanguage}
                            onChange={(e) => set("customPersonaCommLanguage", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[11px] font-medium">Communication Style</Label>
                          <Input className="rounded-xl text-sm" placeholder="Short sentences, never volunteers numbers..." value={form.customPersonaCommStyle} onChange={(e) => set("customPersonaCommStyle", e.target.value)} />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                        <div className="space-y-1.5">
                          <Label className="text-[11px] font-medium">Prior Vendor Experience</Label>
                          <Input className="rounded-xl text-sm" placeholder="Tried Expensify 2 years ago..." value={form.customPersonaPriorVendor} onChange={(e) => set("customPersonaPriorVendor", e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[11px] font-medium">Decision Criteria</Label>
                          <Input className="rounded-xl text-sm" placeholder="Must have Xero integration..." value={form.customPersonaDecisionCriteria} onChange={(e) => set("customPersonaDecisionCriteria", e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[11px] font-medium">Hidden Concern</Label>
                          <Input className="rounded-xl text-sm" placeholder="Worried team will resist change..." value={form.customPersonaHiddenConcern} onChange={(e) => set("customPersonaHiddenConcern", e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[11px] font-medium">Budget Status</Label>
                          <Input className="rounded-xl text-sm" placeholder="Needs CFO sign-off >$30k/year..." value={form.customPersonaBudget} onChange={(e) => set("customPersonaBudget", e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[11px] font-medium">Timeline Pressure</Label>
                          <Input className="rounded-xl text-sm" placeholder="Audit in 6 weeks..." value={form.customPersonaTimeline} onChange={(e) => set("customPersonaTimeline", e.target.value)} />
                        </div>
                      </div>
                      <div className="space-y-1.5 mt-3">
                        <Label className="text-[11px] font-medium">Sample Dialogue <span className="font-normal text-muted-foreground">(few-shot examples)</span></Label>
                        <Textarea
                          className="rounded-xl text-sm min-h-[100px]"
                          placeholder={`Seller: "We automate expense management."\nYou: "We already have a process. What part of automate?"\n\nSeller: "Can I show you a demo?"\nYou: "Not sure we're there yet."`}
                          value={form.customPersonaSampleDialogues}
                          onChange={(e) => set("customPersonaSampleDialogues", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Avatar */}
          {step === 3 && (
            <Card className="rounded-2xl border shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Image className="w-4 h-4 text-primary" />
                  Choose an avatar
                </CardTitle>
                <p className="text-xs text-muted-foreground">Pick the LiveAvatar that represents your buyer persona.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <AvatarPicker
                  selected={form.avatarId}
                  onSelect={(id, voiceId, name) => {
                    set("avatarId", id);
                    set("avatarName", name);
                    set("voiceId", voiceId ?? "");
                  }}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 4: Scenario Setup */}
          {step === 4 && (
            <Card className="rounded-2xl border shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-primary" />
                  Configure the scenario
                </CardTitle>
                <p className="text-xs text-muted-foreground">Set the call type, difficulty, and any contextual backstory.</p>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Call Type</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {SCENARIO_TYPES.map((type) => (
                      <button
                        key={type}
                        onClick={() => set("scenarioType", type)}
                        className={cn(
                          "rounded-xl border px-3 py-2 text-xs font-medium text-left transition-all",
                          form.scenarioType === type
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Difficulty</Label>
                    <Select value={form.difficulty} onValueChange={(v) => set("difficulty", v as Difficulty)}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DIFFICULTIES.map((d) => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Duration</Label>
                    <Select value={String(form.duration)} onValueChange={(v) => set("duration", Number(v))}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DURATIONS.map((d) => (
                          <SelectItem key={d} value={String(d)}>{d} min</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contextNote" className="text-xs font-medium">
                    Context / Backstory <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Textarea
                    id="contextNote"
                    className="rounded-xl text-sm min-h-[100px]"
                    placeholder={`Add any context that sets the scene. For example:
"You met Daniel at the SEA Finance Summit last week. He mentioned 'finance is a bit messy' before taking your card. This is your follow-up call — he hasn't shared any documents and is coming in to listen."`}
                    value={form.contextNote}
                    onChange={(e) => set("contextNote", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium">Evaluation Framework <span className="font-normal text-muted-foreground">(optional)</span></Label>
                  <Select value={form.evaluationFramework} onValueChange={(v) => set("evaluationFramework", v ?? "")}>
                    <SelectTrigger className="rounded-xl w-full">
                      <SelectValue placeholder="Select a framework" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border shadow-lg">
                      {EVALUATION_FRAMEWORKS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {form.evaluationFramework === "Custom" && (
                  <div className="space-y-2">
                    <Label htmlFor="customEvaluationFramework" className="text-xs font-medium">Custom Framework Name</Label>
                    <Input
                      id="customEvaluationFramework"
                      className="rounded-xl"
                      placeholder="e.g. Force Management, Command of the Message"
                      value={form.customEvaluationFramework}
                      onChange={(e) => set("customEvaluationFramework", e.target.value)}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="scoringCriteria" className="text-xs font-medium">
                    Scoring Criteria <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Textarea
                    id="scoringCriteria"
                    className="rounded-xl text-sm min-h-[120px]"
                    placeholder={`Describe what success looks like for this scenario. This shapes how the AI evaluates your sales reps.

Examples:
• Uncovered the buyer's real pain (not just surface complaints)
• Mapped the full decision process and timeline
• Identified 2+ business metrics they care about
• Handled budget objection without discounting
• Gained commitment to a next step with a specific date`}
                    value={form.scoringCriteria}
                    onChange={(e) => set("scoringCriteria", e.target.value)}
                  />
                </div>

                <div className="border-t pt-5 mt-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">
                    <Phone className="w-3.5 h-3.5" />
                    Voice Call Settings
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">
                        Voice Call Avatar <span className="font-normal text-muted-foreground">(optional)</span>
                      </Label>
                      <div className="flex items-center gap-3">
                        {form.voiceAvatarImageUrl && (
                          <img
                            src={form.voiceAvatarImageUrl}
                            alt="Voice avatar preview"
                            className="w-12 h-12 rounded-lg object-cover border shrink-0"
                          />
                        )}
                        <input
                          ref={voiceAvatarInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleVoiceAvatarFileSelect}
                          className="hidden"
                          disabled={uploadingVoiceAvatar}
                        />
                        <div
                          onClick={() => !uploadingVoiceAvatar && voiceAvatarInputRef.current?.click()}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-2.5 rounded-md border border-input bg-background text-sm transition-colors",
                            uploadingVoiceAvatar
                              ? "opacity-60 cursor-not-allowed"
                              : "cursor-pointer hover:bg-accent hover:text-accent-foreground"
                          )}
                        >
                          {uploadingVoiceAvatar ? (
                            <Loader2 className="w-4 h-4 text-muted-foreground shrink-0 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4 text-muted-foreground shrink-0" />
                          )}
                          <span className="truncate flex-1">
                            {uploadingVoiceAvatar
                              ? "Uploading…"
                              : form.voiceAvatarImageUrl
                                ? "Change avatar"
                                : "Click to upload an image"}
                          </span>
                          {form.voiceAvatarImageUrl && !uploadingVoiceAvatar && (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                set("voiceAvatarImageUrl", "");
                                if (voiceAvatarInputRef.current) voiceAvatarInputRef.current.value = "";
                              }}
                              className="ml-auto text-muted-foreground hover:text-red-500 cursor-pointer shrink-0"
                            >
                              <X className="w-4 h-4" />
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground">Upload a PNG/JPG image. It will be shown in the voice call panel during audio-only simulations.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="elevenlabsVoiceId" className="text-xs font-medium">
                        ElevenLabs Voice ID <span className="font-normal text-muted-foreground">(optional)</span>
                      </Label>
                      <Input
                        id="elevenlabsVoiceId"
                        className="rounded-xl"
                        placeholder="e.g. Y7xQSS5ZtS4xv4VJotWd"
                        value={form.elevenlabsVoiceId}
                        onChange={(e) => set("elevenlabsVoiceId", e.target.value)}
                      />
                      <p className="text-[11px] text-muted-foreground">ElevenLabs voice ID used for the audio-only buyer voice. Leave empty to use the agent default.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 5: Review */}
          {step === 5 && (
            <Card className="rounded-2xl border shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-primary" />
                  Review your scenario
                </CardTitle>
                <p className="text-xs text-muted-foreground">Everything looks good? Save and start your simulation.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Scenario name */}
                <div className="flex items-start justify-between rounded-xl border p-3 bg-muted/30">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Scenario</p>
                    <p className="font-semibold text-sm">{scenarioName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{form.difficulty}</Badge>
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <Clock className="w-2.5 h-2.5" />{form.duration} min
                    </Badge>
                  </div>
                </div>

                {/* Seller brief */}
                <div className="rounded-xl border p-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">You&apos;re selling</p>
                  <p className="text-sm font-medium">{form.sellerProduct}</p>
                  <p className="text-xs text-muted-foreground">at <span className="font-medium text-foreground">{form.sellerCompany}</span></p>
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-3">{form.sellerDescription}</p>
                  <div className="pt-2">
                    <Badge variant="outline" className="text-[10px]">
                      {PRODUCT_TYPE_LABELS[form.productType]}
                    </Badge>
                  </div>
                </div>

                {/* Avatar */}
                {form.avatarId && (
                  <div className="rounded-xl border p-3 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Avatar</p>
                    <p className="text-sm font-medium">{form.avatarName ? form.avatarName.split(" ")[0] : form.avatarId}</p>
                  </div>
                )}

                {/* Buyer */}
                <div className="rounded-xl border p-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Buyer persona</p>
                  {form.usePresetPersona && selectedPresetPersona ? (
                    <>
                      <p className="text-sm font-medium">{selectedPresetPersona.name}</p>
                      <p className="text-xs text-muted-foreground">{selectedPresetPersona.jobTitle} · {selectedPresetPersona.company}</p>
                      <p className="text-xs text-muted-foreground mt-1 italic">{selectedPresetPersona.personality}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium">{form.customPersonaName}</p>
                      <p className="text-xs text-muted-foreground">{form.customPersonaTitle} · {form.customPersonaCompany}</p>
                      {form.customPersonaPersonality && <p className="text-xs text-muted-foreground mt-1 italic">{form.customPersonaPersonality}</p>}
                    </>
                  )}
                </div>

                {/* Persona details */}
                <div className="rounded-xl border p-3 space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Persona details</p>
                  {form.customPersonaPersonalityTraits && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Personality / Behaviour</p>
                      <p className="text-xs text-muted-foreground whitespace-pre-line">{form.customPersonaPersonalityTraits}</p>
                    </div>
                  )}
                  {form.customPersonaPainPointsProcess && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Current Process</p>
                      <p className="text-xs text-muted-foreground whitespace-pre-line">{form.customPersonaPainPointsProcess}</p>
                    </div>
                  )}
                  {form.customPersonaPainPointsImpact && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Impact</p>
                      <p className="text-xs text-muted-foreground whitespace-pre-line">{form.customPersonaPainPointsImpact}</p>
                    </div>
                  )}
                  {form.customPersonaPainPoints && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Other Pain Points</p>
                      <p className="text-xs text-muted-foreground whitespace-pre-line">{form.customPersonaPainPoints}</p>
                    </div>
                  )}
                  {form.customPersonaCompanyGoal && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Company Goal</p>
                      <p className="text-xs text-muted-foreground whitespace-pre-line">{form.customPersonaCompanyGoal}</p>
                    </div>
                  )}
                  {form.customPersonaPersonalMotivation && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Personal Motivation</p>
                      <p className="text-xs text-muted-foreground whitespace-pre-line">{form.customPersonaPersonalMotivation}</p>
                    </div>
                  )}
                  {form.customPersonaGoals && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Other Goals</p>
                      <p className="text-xs text-muted-foreground whitespace-pre-line">{form.customPersonaGoals}</p>
                    </div>
                  )}
                  {form.customPersonaCommLanguage && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Communication Language / Environment</p>
                      <p className="text-xs text-muted-foreground whitespace-pre-line">{form.customPersonaCommLanguage}</p>
                    </div>
                  )}
                  {form.customPersonaCommStyle && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Communication Style</p>
                      <p className="text-xs text-muted-foreground whitespace-pre-line">{form.customPersonaCommStyle}</p>
                    </div>
                  )}
                  {form.customPersonaPriorVendor && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Prior Vendor Experience</p>
                      <p className="text-xs text-muted-foreground whitespace-pre-line">{form.customPersonaPriorVendor}</p>
                    </div>
                  )}
                  {form.customPersonaDecisionCriteria && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Decision Criteria</p>
                      <p className="text-xs text-muted-foreground whitespace-pre-line">{form.customPersonaDecisionCriteria}</p>
                    </div>
                  )}
                  {form.customPersonaHiddenConcern && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Hidden Concern</p>
                      <p className="text-xs text-muted-foreground whitespace-pre-line">{form.customPersonaHiddenConcern}</p>
                    </div>
                  )}
                  {form.customPersonaBudget && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Budget Status</p>
                      <p className="text-xs text-muted-foreground whitespace-pre-line">{form.customPersonaBudget}</p>
                    </div>
                  )}
                  {form.customPersonaTimeline && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Timeline Pressure</p>
                      <p className="text-xs text-muted-foreground whitespace-pre-line">{form.customPersonaTimeline}</p>
                    </div>
                  )}
                  {form.customPersonaSampleDialogues && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Sample Dialogue</p>
                      <p className="text-xs text-muted-foreground whitespace-pre-line">{form.customPersonaSampleDialogues}</p>
                    </div>
                  )}
                </div>

                {/* Call type */}
                <div className="rounded-xl border p-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Call type</p>
                  <p className="text-sm font-medium">{form.scenarioType}</p>
                </div>

                {/* Context note */}
                {form.contextNote && (
                  <div className="rounded-xl border p-3 space-y-1 bg-primary/5 border-primary/20">
                    <p className="text-xs font-medium text-primary uppercase tracking-wide">Backstory</p>
                    <p className="text-xs text-muted-foreground">{form.contextNote}</p>
                  </div>
                )}

                {/* Evaluation */}
                {form.evaluationFramework && (
                  <div className="rounded-xl border p-3 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Evaluation Framework</p>
                    <p className="text-sm font-medium">
                      {form.evaluationFramework === "Custom"
                        ? (form.customEvaluationFramework || "Custom")
                        : (EVALUATION_FRAMEWORKS.find(f => f.value === form.evaluationFramework)?.label || form.evaluationFramework)}
                    </p>
                  </div>
                )}
                {form.scoringCriteria && (
                  <div className="rounded-xl border p-3 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Scoring Criteria</p>
                    <p className="text-xs text-muted-foreground whitespace-pre-line">{form.scoringCriteria}</p>
                  </div>
                )}

                {(form.voiceAvatarImageUrl || form.elevenlabsVoiceId) && (
                  <div className="rounded-xl border p-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Voice Call Settings</p>
                    {form.voiceAvatarImageUrl && (
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted border">
                          <img src={form.voiceAvatarImageUrl} alt="Voice avatar" className="w-full h-full object-cover" />
                        </div>
                        <p className="text-xs text-muted-foreground">Voice call avatar uploaded</p>
                      </div>
                    )}
                    {form.elevenlabsVoiceId && (
                      <p className="text-xs text-muted-foreground">Voice ID: <span className="font-medium text-foreground">{form.elevenlabsVoiceId}</span></p>
                    )}
                  </div>
                )}

                {error && (
                  <p className="text-xs text-red-500 bg-red-500/10 rounded-xl px-3 py-2">{error}</p>
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          className="rounded-xl"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 1}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>

        {step < 5 ? (
          <Button
            className="rounded-xl gap-1"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canGoNext() || loadingEdit}
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="rounded-xl gap-1"
              disabled={saving}
              onClick={() => router.push("/scenarios")}
            >
              Cancel
            </Button>
            <Button
              className="rounded-xl gap-1"
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isEditMode ? "Update Scenario" : "Save & Start"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CreateScenarioPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <CreateScenarioPage />
    </Suspense>
  );
}
