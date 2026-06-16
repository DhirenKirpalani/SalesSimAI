"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { mockPersonas } from "@/lib/data/mockData";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Your Company", icon: Building2 },
  { id: 2, label: "Buyer Persona", icon: Users },
  { id: 3, label: "Scenario Setup", icon: Settings2 },
  { id: 4, label: "Review", icon: FileCheck },
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
];

const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced", "Expert"] as const;
const DURATIONS = [10, 15, 20, 25, 30, 40];

type Difficulty = typeof DIFFICULTIES[number];

interface FormState {
  sellerCompany: string;
  sellerProduct: string;
  sellerDescription: string;
  usePresetPersona: boolean;
  presetPersonaId: string;
  customPersonaName: string;
  customPersonaTitle: string;
  customPersonaCompany: string;
  customPersonaIndustry: string;
  customPersonaPersonality: string;
  customPersonaPainPoints: string;
  scenarioType: string;
  difficulty: Difficulty;
  duration: number;
  contextNote: string;
}

const INITIAL: FormState = {
  sellerCompany: "",
  sellerProduct: "",
  sellerDescription: "",
  usePresetPersona: true,
  presetPersonaId: "",
  customPersonaName: "",
  customPersonaTitle: "",
  customPersonaCompany: "",
  customPersonaIndustry: "",
  customPersonaPersonality: "",
  customPersonaPainPoints: "",
  scenarioType: "First Discovery Call",
  difficulty: "Intermediate",
  duration: 20,
  contextNote: "",
};

export default function CreateScenarioPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
    if (step === 3) return !!form.scenarioType;
    return true;
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated."); setSaving(false); return; }

    const payload = {
      user_id: user.id,
      name: scenarioName,
      seller_company: form.sellerCompany,
      seller_product: form.sellerProduct,
      seller_description: form.sellerDescription,
      preset_persona_id: form.usePresetPersona ? form.presetPersonaId : null,
      custom_persona: !form.usePresetPersona ? {
        name: form.customPersonaName,
        jobTitle: form.customPersonaTitle,
        company: form.customPersonaCompany,
        industry: form.customPersonaIndustry,
        personality: form.customPersonaPersonality,
        painPoints: form.customPersonaPainPoints.split("\n").map((s) => s.trim()).filter(Boolean),
      } : null,
      scenario_type: form.scenarioType,
      difficulty: form.difficulty,
      duration: form.duration,
      context_note: form.contextNote || null,
    };

    const { error: dbErr } = await supabase.from("custom_scenarios").insert(payload);
    if (dbErr) { setError(dbErr.message); setSaving(false); return; }
    router.push("/scenarios");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => router.push("/scenarios")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Create Custom Scenario</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Build a simulation tailored to your product and buyers</p>
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
                <p className="text-xs text-muted-foreground">This becomes the context the AI buyer understands — what you're selling and why it matters.</p>
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
                      <Label className="text-xs font-medium">Personality / Behaviour</Label>
                      <Input className="rounded-xl" placeholder="e.g. Analytical, skeptical, asks for data before committing" value={form.customPersonaPersonality} onChange={(e) => set("customPersonaPersonality", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Pain Points <span className="font-normal text-muted-foreground">(one per line)</span></Label>
                      <Textarea
                        className="rounded-xl text-sm min-h-[80px]"
                        placeholder={"Finance processes are manual and error-prone\nLack of visibility into team spend\nAudit prep takes weeks"}
                        value={form.customPersonaPainPoints}
                        onChange={(e) => set("customPersonaPainPoints", e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Scenario Setup */}
          {step === 3 && (
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
              </CardContent>
            </Card>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
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
                </div>

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

        {step < 4 ? (
          <Button
            className="rounded-xl gap-1"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canGoNext()}
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
              onClick={handleSave}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Save for Later
            </Button>
            <Button
              className="rounded-xl gap-1"
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Save & Start
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
