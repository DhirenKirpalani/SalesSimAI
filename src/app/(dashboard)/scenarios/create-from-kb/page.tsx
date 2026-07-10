"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, Sparkles, RefreshCw, Save, AlertCircle, CheckCircle2, Check, ChevronDown, CircleStop, Database, FileText, FileSearch, UserCog, MessageSquare, Wand2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AvatarPicker } from "@/components/AvatarPicker";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced", "Expert"] as const;
const DURATIONS = [5, 10, 15, 20];

function ScenarioTypeMultiSelect({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const toggle = (option: string) => {
    onChange(
      selected.includes(option)
        ? selected.filter((o) => o !== option)
        : [...selected, option]
    );
  };

  const selectAll = () => onChange([...options]);
  const deselectAll = () => onChange([]);

  return (
    <div className="space-y-2 relative" ref={containerRef}>
      <Label className="text-xs text-muted-foreground">Allowed scenario types</Label>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between rounded-lg border border-input bg-background px-3 py-2.5 sm:py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring min-h-[44px]"
      >
        <span>{selected.length === options.length ? "All selected" : `${selected.length} of ${options.length} selected`}</span>
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute z-10 left-0 right-0 sm:left-0 sm:right-0 lg:w-full rounded-lg border border-border bg-card shadow-lg p-2 max-h-64 lg:max-h-80 overflow-y-auto">
          <div className="flex items-center justify-between px-2 py-1 mb-1">
            <button type="button" onClick={selectAll} className="text-[10px] text-primary hover:underline">
              Select all
            </button>
            <button type="button" onClick={deselectAll} className="text-[10px] text-muted-foreground hover:text-foreground">
              Deselect all
            </button>
          </div>
          <div className="h-px bg-border mb-1" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-1">
          {options.map((option) => {
            const isSelected = selected.includes(option);
            return (
              <label
                key={option}
                className={cn(
                  "flex items-center gap-3 px-2 py-2.5 sm:py-2 rounded-lg cursor-pointer text-sm sm:text-xs transition-colors",
                  isSelected ? "bg-primary/5" : "hover:bg-muted/50"
                )}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(option)}
                  className="sr-only peer"
                />
                <div className={cn(
                  "w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0",
                  isSelected
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-border bg-background peer-focus:ring-2 peer-focus:ring-ring"
                )}>
                  {isSelected && <Check className="w-2.5 h-2.5" />}
                </div>
                <span className="flex-1">{option}</span>
              </label>
            );
          })}
          </div>
        </div>
      )}
    </div>
  );
}

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
  "Global EOR Onboarding",
  "Multi-Country Payroll Rollout",
  "Compliance & Benefits Review",
  "Expense & Cards Rollout",
  "Remote Team Expansion",
];

const PRODUCT_TYPES = [
  { value: "payment", label: "Payment" },
  { value: "eor", label: "EoR" },
  { value: "cards", label: "Cards" },
] as const;

const GENERATION_STEPS = [
  { id: "fetch", label: "Fetching knowledge base", description: "Loading URLs and uploaded documents", icon: Database },
  { id: "extract", label: "Extracting company profile", description: "AI is reading and structuring your company context", icon: FileSearch },
  { id: "persona", label: "Building buyer personas", description: "Creating 3 realistic buyers with goals and pain points", icon: UserCog },
  { id: "scenario", label: "Generating 3 scenarios", description: "Crafting distinct sales situations and opening lines", icon: MessageSquare },
  { id: "finalize", label: "Finalizing scenarios", description: "Preparing the review form", icon: Wand2 },
];

function GenerationSteps({ activeStep }: { activeStep: number }) {
  return (
    <div className="space-y-4 w-full max-w-md mx-auto text-left">
      {GENERATION_STEPS.map((step, index) => {
        const isCompleted = index < activeStep;
        const isActive = index === activeStep;
        const Icon = step.icon;
        return (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
            className={cn(
              "flex items-start gap-4 p-4 rounded-xl border transition-colors",
              isActive ? "bg-primary/5 border-primary/30" : isCompleted ? "bg-emerald-50/50 border-emerald-200/50" : "bg-background border-border"
            )}
          >
            <div className={cn(
              "mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors",
              isActive ? "bg-primary text-primary-foreground" : isCompleted ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
            )}>
              {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-medium", isActive && "text-primary")}>
                {step.label}
                {isActive && (
                  <motion.span
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                    className="inline-block align-middle ml-2 w-1.5 h-1.5 rounded-full bg-primary"
                  />
                )}
              </p>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

interface GeneratedPersona {
  name: string;
  jobTitle: string;
  company: string;
  industry: string;
  personality: string;
  personalityTraits: string;
  painPoints: string[];
  painPointsCurrentProcess: string;
  painPointsImpact: string;
  goals: string[];
  companyGoal: string;
  personalMotivation: string;
  communicationStyle: string;
  communicationLanguage: string;
  priorVendorExperience: string;
  decisionCriteria: string;
  hiddenConcern: string;
  meetingSource: string;
  budgetStatus: string;
  timelinePressure: string;
  sampleDialogues: string;
}

interface KnowledgeDocument {
  id: string;
  name: string;
  doc_type: string;
  document_type: string;
  file_path?: string | null;
  created_at?: string;
  creator_name?: string | null;
  creator_email?: string | null;
}

interface GeneratedScenario {
  seller_company: string;
  seller_product: string;
  product_type: "payment" | "eor" | "cards";
  seller_description: string;
  scenario_type: string;
  difficulty: string;
  duration: number;
  context_note: string;
  custom_persona: GeneratedPersona;
  avatar_name: string;
  avatar_id: string;
  voice_id: string;
  voice_avatar_image_url?: string;
  elevenlabs_voice_id?: string;
  evaluation_framework: string;
  custom_evaluation_framework: string;
  scoring_criteria: string;
}

export default function CreateFromKBPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"loading" | "select" | "generating" | "review" | "error">("loading");
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [scenarios, setScenarios] = useState<GeneratedScenario[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedToSave, setSelectedToSave] = useState<boolean[]>([true, true, true]);
  const [avatarId, setAvatarId] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [activeStep, setActiveStep] = useState(0);

  const [sourceUrls, setSourceUrls] = useState<string[]>([]);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [scenarioCount, setScenarioCount] = useState<number>(3);
  const [selectedScenarioTypes, setSelectedScenarioTypes] = useState<string[]>([...SCENARIO_TYPES]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const selectedScenario = scenarios[selectedIndex];

  // Animate through generation steps
  useEffect(() => {
    if (!generating && !loading) return;
    const interval = setInterval(() => {
      setActiveStep((prev) => {
        if (prev >= GENERATION_STEPS.length - 1) return prev;
        return prev + 1;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [generating, loading]);

  useEffect(() => {
    // Fetch sources and a default avatar, then show selection screen
    (async () => {
      try {
        const [orgRes, docsRes, avRes] = await Promise.all([
          fetch("/api/company/org"),
          fetch("/api/company/documents"),
          fetch("/api/heygen-test/avatars?page=1&page_size=1"),
        ]);

        if (orgRes.ok) {
          const orgData = await orgRes.json();
          const urls = orgData.organization?.source_urls ?? [];
          setSourceUrls(urls);
          setSelectedUrls(urls);
        }

        if (docsRes.ok) {
          const docsData = await docsRes.json();
          const docs = (docsData.documents ?? []) as KnowledgeDocument[];
          setDocuments(docs);
          setSelectedDocIds(docs.map((d) => d.id));
        }

        if (avRes.ok) {
          const avData = await avRes.json();
          const firstAvatar = avData.avatars?.[0];
          if (firstAvatar) {
            setAvatarId(firstAvatar.id);
            setVoiceId(firstAvatar.voice_id || "");
          }
        }
      } catch (err) {
        console.error("[create-from-kb] failed to load sources:", err);
      } finally {
        setLoading(false);
        setStatus("select");
      }
    })();
  }, []);

  const generateScenarios = async () => {
    setLoading(true);
    setGenerating(true);
    setActiveStep(0);
    setError("");
    setStatus("generating");
    abortControllerRef.current = new AbortController();
    try {
      const res = await fetch("/api/scenarios/generate-from-kb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          avatarId: avatarId || undefined,
          voiceId: voiceId || undefined,
          selectedUrls,
          selectedDocIds,
          count: scenarioCount,
          scenarioTypes: selectedScenarioTypes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");

      const generated = Array.isArray(data.data) ? data.data : [data.data];
      setProfile(data.profile);
      setScenarios(generated);
      setSelectedToSave(generated.map(() => true));
      setSelectedIndex(0);
      if (generated[0]?.avatar_id) setAvatarId(generated[0].avatar_id);
      if (generated[0]?.voice_id) setVoiceId(generated[0].voice_id || "");
      setStatus("review");
    } catch (e: any) {
      if (e.name === "AbortError") {
        setStatus("select");
      } else {
        setError(e.message || "Failed to generate scenarios from knowledge base");
        setStatus("error");
      }
    } finally {
      setLoading(false);
      setGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const stopGeneration = () => {
    abortControllerRef.current?.abort();
  };

  const handleSaveAll = async () => {
    if (scenarios.length === 0) return;
    setSaving(true);
    setError("");
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();
      const organizationId = userProfile?.organization_id ?? null;

      const toSave = scenarios
        .map((scenario, index) => ({ scenario, index }))
        .filter(({ index }) => selectedToSave[index]);

      if (toSave.length === 0) throw new Error("Select at least one scenario to save");

      const payloads = toSave.map(({ scenario }) => ({
        name: `${scenario.seller_company} — ${scenario.scenario_type}`,
        user_id: user.id,
        created_by: user.id,
        organization_id: organizationId,
        seller_company: scenario.seller_company,
        seller_product: scenario.seller_product,
        product_type: scenario.product_type,
        seller_description: scenario.seller_description,
        scenario_type: scenario.scenario_type,
        difficulty: scenario.difficulty,
        duration: scenario.duration,
        context_note: scenario.context_note,
        custom_persona: scenario.custom_persona,
        preset_persona_id: null,
        avatar_id: avatarId || null,
        avatar_name: scenario.avatar_name,
        voice_id: voiceId || null,
        scoring_criteria: scenario.scoring_criteria || null,
        evaluation_framework: scenario.evaluation_framework || null,
      }));

      const { error: dbErr } = await supabase.from("custom_scenarios").insert(payloads);
      if (dbErr) throw new Error(dbErr.message);

      router.push("/scenarios");
    } catch (e: any) {
      setError(e.message || "Failed to save scenarios");
      setSaving(false);
    }
  };

  const updateScenario = (index: number, field: keyof GeneratedScenario, value: string | number | Record<string, unknown> | null) => {
    setScenarios((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value ?? "" } : s))
    );
  };

  const updatePersona = (index: number, field: string, value: string | string[] | null) => {
    setScenarios((prev) =>
      prev.map((s, i) =>
        i === index ? { ...s, custom_persona: { ...s.custom_persona, [field]: value ?? "" } } : s
      )
    );
  };

  const toggleSave = (index: number) => {
    setSelectedToSave((prev) => prev.map((v, i) => (i === index ? !v : v)));
  };

  const toggleUrl = (url: string) => {
    setSelectedUrls((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]
    );
  };

  const toggleDoc = (id: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const selectAllUrls = () => setSelectedUrls([...sourceUrls]);
  const deselectAllUrls = () => setSelectedUrls([]);
  const selectAllDocs = () => setSelectedDocIds(documents.map((d) => d.id));
  const deselectAllDocs = () => setSelectedDocIds([]);

  const canGenerate = selectedUrls.length > 0 || selectedDocIds.length > 0;

  return (
    <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3">
        <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9" onClick={() => router.push("/scenarios")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight">Create from Knowledge Base</h1>
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
            {status === "review"
              ? "Review and edit the AI-generated scenarios before saving."
              : "Select the URLs and documents the AI should use to generate scenarios."}
          </p>
        </div>
      </div>

      {/* Source selection */}
      {(status === "select" || status === "loading") && (
        <Card className="rounded-2xl border shadow-sm">
          <CardContent className="py-5 sm:py-6 px-4 sm:px-6 space-y-6 sm:space-y-8">
            {/* URLs */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Database className="w-4 h-4 text-muted-foreground" />
                  Website URLs ({sourceUrls.length})
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={selectAllUrls}
                    className="text-xs text-primary hover:underline"
                  >
                    Select all
                  </button>
                  <span className="text-xs text-muted-foreground">·</span>
                  <button
                    onClick={deselectAllUrls}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Deselect all
                  </button>
                </div>
              </div>
              {sourceUrls.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No website URLs found. Add URLs in <button onClick={() => router.push("/company-knowledge")} className="text-primary hover:underline">Knowledge Base</button>.
                </p>
              ) : (
                <div className="space-y-2">
                  {sourceUrls.map((url) => (
                    <label
                      key={url}
                      className={cn(
                        "flex items-center gap-3 p-3 sm:p-3 rounded-xl border transition-all cursor-pointer",
                        selectedUrls.includes(url)
                          ? "bg-primary/5 border-primary/30 shadow-sm"
                          : "bg-card border-border hover:bg-muted/30 hover:border-border/80"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedUrls.includes(url)}
                        onChange={() => toggleUrl(url)}
                        className="sr-only peer"
                      />
                      <div className={cn(
                        "w-5 h-5 sm:w-4 sm:h-4 rounded border flex items-center justify-center transition-colors shrink-0",
                        selectedUrls.includes(url)
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-border bg-background peer-focus:ring-2 peer-focus:ring-ring"
                      )}>
                        {selectedUrls.includes(url) && <Check className="w-3 h-3 sm:w-2.5 sm:h-2.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground truncate">{url}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="h-px bg-border" />

            {/* Documents */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  Uploaded Documents ({documents.length})
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={selectAllDocs}
                    className="text-xs text-primary hover:underline"
                  >
                    Select all
                  </button>
                  <span className="text-xs text-muted-foreground">·</span>
                  <button
                    onClick={deselectAllDocs}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Deselect all
                  </button>
                </div>
              </div>
              {documents.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No documents uploaded. Upload documents in <button onClick={() => router.push("/company-knowledge")} className="text-primary hover:underline">Knowledge Base</button>.
                </p>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <label
                      key={doc.id}
                      className={cn(
                        "flex items-center gap-3 p-3 sm:p-3 rounded-xl border transition-all cursor-pointer",
                        selectedDocIds.includes(doc.id)
                          ? "bg-primary/5 border-primary/30 shadow-sm"
                          : "bg-card border-border hover:bg-muted/30 hover:border-border/80"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedDocIds.includes(doc.id)}
                        onChange={() => toggleDoc(doc.id)}
                        className="sr-only peer"
                      />
                      <div className={cn(
                        "w-5 h-5 sm:w-4 sm:h-4 rounded border flex items-center justify-center transition-colors shrink-0",
                        selectedDocIds.includes(doc.id)
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-border bg-background peer-focus:ring-2 peer-focus:ring-ring"
                      )}>
                        {selectedDocIds.includes(doc.id) && <Check className="w-3 h-3 sm:w-2.5 sm:h-2.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground truncate">{doc.name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                          {doc.doc_type} · {doc.document_type}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="h-px bg-border" />

            {/* Scenario generation options */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-muted-foreground" />
                Generation options
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Number of scenarios</Label>
                  <Select
                    value={String(scenarioCount)}
                    onValueChange={(value) => setScenarioCount(Number(value))}
                  >
                    <SelectTrigger className="rounded-lg h-11">
                      <SelectValue placeholder="Select count" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} scenario{n === 1 ? "" : "s"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <ScenarioTypeMultiSelect
                  options={SCENARIO_TYPES}
                  selected={selectedScenarioTypes}
                  onChange={setSelectedScenarioTypes}
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <p className="text-xs text-muted-foreground text-center sm:text-left">
                {selectedUrls.length + selectedDocIds.length} source{selectedUrls.length + selectedDocIds.length === 1 ? "" : "s"} selected
              </p>
              <Button
                onClick={generateScenarios}
                disabled={!canGenerate || loading || selectedScenarioTypes.length === 0}
                className="rounded-lg gap-2 h-11 sm:h-9"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {loading ? "Loading sources..." : "Generate Scenarios"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generating state */}
      {status === "generating" && (
        <Card className="rounded-2xl border shadow-sm">
          <CardContent className="py-8 px-6 space-y-6">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Generating {scenarioCount} scenario{scenarioCount === 1 ? "" : "s"} from your knowledge base</p>
              <p className="text-xs text-muted-foreground">This may take 30–60 seconds as AI reads your URLs and documents.</p>
            </div>
            <GenerationSteps activeStep={activeStep} />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Working on step {activeStep + 1} of {GENERATION_STEPS.length}
              </div>
              <Button variant="outline" size="sm" onClick={stopGeneration} className="rounded-lg gap-1.5">
                <CircleStop className="w-3.5 h-3.5" />
                Stop generation
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {!loading && status === "error" && (
        <Card className="rounded-2xl border shadow-sm border-red-200">
          <CardContent className="py-8 text-center space-y-4">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Could not generate from knowledge base</p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={() => router.push("/company-knowledge")}>
                Add URLs / Documents
              </Button>
              <Button onClick={() => setStatus("select")}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Back to Selection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review form */}
      {!loading && status === "review" && selectedScenario && (
        <div className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Scenario selector */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {scenarios.map((scenario, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => setSelectedIndex(index)}
                className={cn(
                  "cursor-pointer relative rounded-xl border p-4 transition-all",
                  selectedIndex === index
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-primary/40 hover:bg-muted/30"
                )}
              >
                <div className="flex items-start gap-2">
                  <button
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      toggleSave(index);
                    }}
                    className={cn(
                      "mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors",
                      selectedToSave[index]
                        ? "bg-primary border-primary text-primary-foreground"
                        : "bg-background border-border hover:border-primary/50"
                    )}
                  >
                    {selectedToSave[index] && <Check className="w-3 h-3" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{scenario.scenario_type}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {String(scenario.custom_persona.name || "Buyer")} · {String(scenario.custom_persona.jobTitle || "")}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Company */}
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Scenario {selectedIndex + 1}: Company & Product
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Company Name</Label>
                <Input
                  value={selectedScenario.seller_company}
                  onChange={(e) => updateScenario(selectedIndex, "seller_company", e.target.value)}
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Product</Label>
                <Input
                  value={selectedScenario.seller_product}
                  onChange={(e) => updateScenario(selectedIndex, "seller_product", e.target.value)}
                  className="rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Product Type</Label>
                  <Select
                    value={selectedScenario.product_type}
                    onValueChange={(v) => updateScenario(selectedIndex, "product_type", v as "payment" | "eor" | "cards")}
                  >
                    <SelectTrigger className="rounded-lg">
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
                  <Label className="text-xs">Scenario Type</Label>
                  <Select
                    value={selectedScenario.scenario_type}
                    onValueChange={(v) => updateScenario(selectedIndex, "scenario_type", v)}
                  >
                    <SelectTrigger className="rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCENARIO_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Difficulty</Label>
                  <Select
                    value={selectedScenario.difficulty}
                    onValueChange={(v) => updateScenario(selectedIndex, "difficulty", v)}
                  >
                    <SelectTrigger className="rounded-lg">
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
                  <Label className="text-xs">Duration (min)</Label>
                  <Select
                    value={String(selectedScenario.duration)}
                    onValueChange={(v) => updateScenario(selectedIndex, "duration", parseInt(v ?? "10"))}
                  >
                    <SelectTrigger className="rounded-lg">
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
                <Label className="text-xs">Seller Description</Label>
                <Textarea
                  value={selectedScenario.seller_description}
                  onChange={(e) => updateScenario(selectedIndex, "seller_description", e.target.value)}
                  className="rounded-lg min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Buyer Persona */}
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">B</span>
                Buyer Persona
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={String(selectedScenario.custom_persona.name || "")}
                    onChange={(e) => updatePersona(selectedIndex, "name", e.target.value)}
                    className="rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Job Title</Label>
                  <Input
                    value={String(selectedScenario.custom_persona.jobTitle || "")}
                    onChange={(e) => updatePersona(selectedIndex, "jobTitle", e.target.value)}
                    className="rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Buyer Company</Label>
                  <Input
                    value={String(selectedScenario.custom_persona.company || "")}
                    onChange={(e) => updatePersona(selectedIndex, "company", e.target.value)}
                    className="rounded-lg"
                    placeholder="e.g. BloomCommerce"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Industry</Label>
                  <Input
                    value={String(selectedScenario.custom_persona.industry || "")}
                    onChange={(e) => updatePersona(selectedIndex, "industry", e.target.value)}
                    className="rounded-lg"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Meeting Source</Label>
                <Input
                  value={String(selectedScenario.custom_persona.meetingSource || "")}
                  onChange={(e) => updatePersona(selectedIndex, "meetingSource", e.target.value)}
                  className="rounded-lg"
                  placeholder="e.g. Inbound demo request, warm referral, LinkedIn outreach"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Personality</Label>
                <Textarea
                  value={String(selectedScenario.custom_persona.personality || "")}
                  onChange={(e) => updatePersona(selectedIndex, "personality", e.target.value)}
                  className="rounded-lg min-h-[80px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Communication Style</Label>
                <Textarea
                  value={String(selectedScenario.custom_persona.communicationStyle || "")}
                  onChange={(e) => updatePersona(selectedIndex, "communicationStyle", e.target.value)}
                  className="rounded-lg min-h-[60px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Hidden Concern</Label>
                <Textarea
                  value={String(selectedScenario.custom_persona.hiddenConcern || "")}
                  onChange={(e) => updatePersona(selectedIndex, "hiddenConcern", e.target.value)}
                  className="rounded-lg min-h-[60px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Personality Traits</Label>
                <Textarea
                  value={String(selectedScenario.custom_persona.personalityTraits || "")}
                  onChange={(e) => updatePersona(selectedIndex, "personalityTraits", e.target.value)}
                  className="rounded-lg min-h-[60px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Pain Points</Label>
                  <Textarea
                    value={Array.isArray(selectedScenario.custom_persona.painPoints) ? selectedScenario.custom_persona.painPoints.join("\n") : ""}
                    onChange={(e) => updatePersona(selectedIndex, "painPoints", e.target.value.split("\n"))}
                    className="rounded-lg min-h-[80px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Goals</Label>
                  <Textarea
                    value={Array.isArray(selectedScenario.custom_persona.goals) ? selectedScenario.custom_persona.goals.join("\n") : ""}
                    onChange={(e) => updatePersona(selectedIndex, "goals", e.target.value.split("\n"))}
                    className="rounded-lg min-h-[80px]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Pain Process</Label>
                  <Textarea
                    value={String(selectedScenario.custom_persona.painPointsCurrentProcess || "")}
                    onChange={(e) => updatePersona(selectedIndex, "painPointsCurrentProcess", e.target.value)}
                    className="rounded-lg min-h-[80px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Pain Impact</Label>
                  <Textarea
                    value={String(selectedScenario.custom_persona.painPointsImpact || "")}
                    onChange={(e) => updatePersona(selectedIndex, "painPointsImpact", e.target.value)}
                    className="rounded-lg min-h-[80px]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Company Goal</Label>
                  <Textarea
                    value={String(selectedScenario.custom_persona.companyGoal || "")}
                    onChange={(e) => updatePersona(selectedIndex, "companyGoal", e.target.value)}
                    className="rounded-lg min-h-[80px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Personal Motivation</Label>
                  <Textarea
                    value={String(selectedScenario.custom_persona.personalMotivation || "")}
                    onChange={(e) => updatePersona(selectedIndex, "personalMotivation", e.target.value)}
                    className="rounded-lg min-h-[80px]"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Communication Language</Label>
                <Textarea
                  value={String(selectedScenario.custom_persona.communicationLanguage || "")}
                  onChange={(e) => updatePersona(selectedIndex, "communicationLanguage", e.target.value)}
                  className="rounded-lg min-h-[60px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Prior Vendor Experience</Label>
                  <Textarea
                    value={String(selectedScenario.custom_persona.priorVendorExperience || "")}
                    onChange={(e) => updatePersona(selectedIndex, "priorVendorExperience", e.target.value)}
                    className="rounded-lg min-h-[80px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Decision Criteria</Label>
                  <Textarea
                    value={String(selectedScenario.custom_persona.decisionCriteria || "")}
                    onChange={(e) => updatePersona(selectedIndex, "decisionCriteria", e.target.value)}
                    className="rounded-lg min-h-[80px]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Budget</Label>
                  <Input
                    value={String(selectedScenario.custom_persona.budgetStatus || "")}
                    onChange={(e) => updatePersona(selectedIndex, "budgetStatus", e.target.value)}
                    className="rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Timeline</Label>
                  <Input
                    value={String(selectedScenario.custom_persona.timelinePressure || "")}
                    onChange={(e) => updatePersona(selectedIndex, "timelinePressure", e.target.value)}
                    className="rounded-lg"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Sample Dialogues</Label>
                <Textarea
                  value={String(selectedScenario.custom_persona.sampleDialogues || "")}
                  onChange={(e) => updatePersona(selectedIndex, "sampleDialogues", e.target.value)}
                  className="rounded-lg min-h-[100px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Context Note */}
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Scenario Context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={selectedScenario.context_note}
                onChange={(e) => updateScenario(selectedIndex, "context_note", e.target.value)}
                className="rounded-lg min-h-[160px]"
              />
            </CardContent>
          </Card>

          {/* Evaluation Framework & Scoring Rubric */}
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">R</span>
                Evaluation Framework & Rubric
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Evaluation Framework</Label>
                <Select
                  value={selectedScenario.evaluation_framework || "Standard"}
                  onValueChange={(v) => updateScenario(selectedIndex, "evaluation_framework", v)}
                >
                  <SelectTrigger className="rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Standard", "MEDDIC", "BANT", "SPIN", "Challenger", "Sandler", "ValueSelling"].map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Scoring Rubric</Label>
                <Textarea
                  value={selectedScenario.scoring_criteria}
                  onChange={(e) => updateScenario(selectedIndex, "scoring_criteria", e.target.value)}
                  className="rounded-lg min-h-[160px]"
                  placeholder="5-7 concrete checkpoints the seller must hit..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Avatar */}
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Avatar</CardTitle>
            </CardHeader>
            <CardContent>
              <AvatarPicker
                selected={avatarId}
                onSelect={(id, voice, name) => {
                  setAvatarId(id);
                  setVoiceId(voice || "");
                }}
              />
            </CardContent>
          </Card>

          {/* Source preview */}
          {profile && (
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
              <p className="text-xs font-medium text-foreground">AI extracted this from your knowledge base</p>
              <p className="text-xs text-muted-foreground">
                Company: <span className="text-foreground">{String(profile.company_name || "Unknown")}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Tagline: <span className="text-foreground">{String(profile.tagline || "—")}</span>
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={handleSaveAll}
              disabled={saving}
              className="rounded-lg gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save {selectedToSave.filter(Boolean).length} Scenario{selectedToSave.filter(Boolean).length !== 1 ? "s" : ""}
            </Button>
            <Button
              variant="outline"
              onClick={() => generateScenarios()}
              disabled={generating}
              className="rounded-lg gap-2"
            >
              <RefreshCw className={cn("w-4 h-4", generating && "animate-spin")} />
              Regenerate All
            </Button>
            <Button
              variant="ghost"
              onClick={() => router.push("/scenarios")}
              className="rounded-lg"
            >
              Cancel
            </Button>
          </div>

        </div>
      )}
    </div>
  );
}
