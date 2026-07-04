"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AvatarPicker } from "@/components/AvatarPicker";
import { createClient } from "@/lib/supabase/client";
import {
  Loader2,
  Sparkles,
  Globe,
  Users,
  Image,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  FileText,
  RefreshCw,
  ChevronRight,
  Wand2,
  Upload,
  X,
  File,
  Search,
  ScanLine,
  BrainCircuit,
  FileSearch,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ExtractionPhase {
  icon: React.ElementType;
  label: string;
  description: string;
}

const EXTRACTION_PHASES: ExtractionPhase[] = [
  { icon: Search, label: "Discovering pages", description: "Scanning the website structure..." },
  { icon: ScanLine, label: "Reading content", description: "Extracting text from pages found..." },
  { icon: FileSearch, label: "Finding stories", description: "Looking for case studies and testimonials..." },
  { icon: BrainCircuit, label: "Analyzing with AI", description: "Synthesizing company profile from all pages..." },
  { icon: Check, label: "Profile ready", description: "Company context extracted successfully" },
];

type Step = "input" | "preview" | "avatar" | "generating" | "success";

interface CompanyProfile {
  company_name: string;
  tagline: string;
  website_url?: string;
  product_deep_dive?: {
    overview: string;
    key_features: string[];
    how_it_works: string;
    pricing_model: string;
    ideal_customer_profile: string;
  };
  industries_served?: string[];
  target_customer_segments?: Array<{ segment: string; company_size: string; use_case: string }>;
  pain_points_solved: string[];
  current_process_problems: string[];
  value_propositions: string[];
  common_objections?: Array<{ objection: string; underlying_concern: string; handling_approach: string }>;
  competitive_landscape?: {
    primary_competitors: string[];
    key_differentiators: string[];
    why_customers_switch: string;
  };
  buyer_personas: Array<{
    name: string;
    full_role?: string;
    role?: string;
    company_type?: string;
    industry: string;
    age_approx?: string;
    personality: string;
    communication_style?: string;
    pain_points: string[];
    goals: string[];
    hidden_concerns?: string;
    prior_experience?: string;
    budget_authority?: string;
    decision_timeline?: string;
    decision_criteria?: string[];
    objections_they_raise?: string[];
    opening_line?: string;
    background_context?: string;
  }>;
  customer_testimonials?: Array<{
    customer_name?: string;
    customer_company?: string;
    quote: string;
    before_state: string;
    after_state: string;
    source: string;
  }>;
  sales_scenario_seeds?: Array<{
    scenario_type: string;
    buyer_persona: string;
    setup: string;
    buyer_opening: string;
    seller_goal: string;
    hidden_challenges: string[];
  }>;
  industry_dynamics?: {
    market_trend: string;
    regulatory_factors: string;
    buying_cycle: string;
    budget_seasonality: string;
  };
}

export default function CompanyOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("input");
  const [url, setUrl] = useState("");
  const [successStoriesUrl, setSuccessStoriesUrl] = useState("");
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarId, setAvatarId] = useState("");
  const [voiceId, setVoiceId] = useState<string | null>(null);
  const [avatarName, setAvatarName] = useState("");
  const [generatedCount, setGeneratedCount] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [extractionPhase, setExtractionPhase] = useState(0);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  // Load user's organization on mount
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();
      if (profile?.organization_id) {
        setOrganizationId(profile.organization_id);
      }
    })();
  }, []);

  // Cycle through extraction phases while loading
  useEffect(() => {
    if (!loading) { setExtractionPhase(0); return; }
    let phase = 0;
    const interval = setInterval(() => {
      phase = Math.min(phase + 1, EXTRACTION_PHASES.length - 1);
      setExtractionPhase(phase);
    }, 2500);
    return () => clearInterval(interval);
  }, [loading]);

  const extract = async () => {
    setLoading(true);
    setError(null);
    try {
      const hasUrl = url.trim().length > 0;
      const hasFiles = uploadedFiles.length > 0;

      if (!hasUrl && !hasFiles) {
        setError("Provide a website URL, upload files, or both");
        setLoading(false);
        return;
      }

      if (hasUrl && hasFiles) {
        const formData = new FormData();
        formData.append("url", url.trim());
        if (successStoriesUrl.trim()) formData.append("successStoriesUrl", successStoriesUrl.trim());
        uploadedFiles.forEach((f, i) => formData.append(`file${i}`, f));
        const res = await fetch("/api/company/extract-combined", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Extraction failed");
        setProfile(data.data);
        await saveCompanyProfile(data.data);
      } else if (hasFiles) {
        const formData = new FormData();
        uploadedFiles.forEach((f, i) => formData.append(`file${i}`, f));
        const res = await fetch("/api/company/extract-files", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Extraction failed");
        setProfile(data.data);
        await saveCompanyProfile(data.data);
      } else {
        const res = await fetch("/api/company/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: url.trim(), successStoriesUrl: successStoriesUrl.trim() || undefined }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Extraction failed");
        setProfile(data.data);
        await saveCompanyProfile(data.data);
      }
      setStep("preview");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
       "application/vnd.openxmlformats-officedocument.presentationml.presentation", "text/plain"]
        .some((t) => f.type === t) ||
      f.name.toLowerCase().endsWith(".pdf") || f.name.toLowerCase().endsWith(".docx") ||
      f.name.toLowerCase().endsWith(".pptx") || f.name.toLowerCase().endsWith(".txt")
    );
    setUploadedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const generate = async () => {
    if (!profile || !avatarId) return;
    setLoading(true);
    setStep("generating");
    try {
      const res = await fetch("/api/company/generate-scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, avatarId, voiceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setGeneratedCount(data.count);
      setStep("success");
    } catch (e: any) {
      setError(e.message);
      setStep("avatar");
    } finally {
      setLoading(false);
    }
  };

  const updateProfileField = <K extends keyof CompanyProfile>(key: K, value: CompanyProfile[K]) => {
    setProfile((prev) => prev ? { ...prev, [key]: value } : prev);
  };

  const saveCompanyProfile = async (companyProfile: CompanyProfile) => {
    if (!organizationId) return;
    try {
      const supabase = createClient();
      await supabase
        .from("organizations")
        .update({ profile_data: companyProfile })
        .eq("id", organizationId);
    } catch (e) {
      console.error("[company-onboarding] Failed to save company profile:", e);
    }
  };

  const steps = [
    { id: "input" as Step, label: "Source", icon: Globe },
    { id: "preview" as Step, label: "Preview", icon: FileText },
    { id: "avatar" as Step, label: "Avatar", icon: Image },
    { id: "generating" as Step, label: "Generate", icon: Sparkles },
    { id: "success" as Step, label: "Done", icon: CheckCircle2 },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === step);

  return (
    <div className="max-w-3xl mx-auto space-y-6 px-4 sm:px-6 lg:px-0 py-4 sm:py-0">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">AI Scenario Generator</h1>
        <p className="text-sm text-muted-foreground">
          Provide your company website, upload documents, or both. AI will extract your business context and generate realistic sales scenarios.
        </p>
      </div>

      {/* Stepper — scrollable on mobile */}
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-2 max-w-full [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === currentStepIndex;
            const isDone = i < currentStepIndex;
            return (
              <div key={s.id} className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                <div
                  className={cn(
                    "flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-medium transition-colors whitespace-nowrap",
                    isActive && "bg-primary text-primary-foreground",
                    isDone && "bg-primary/10 text-primary",
                    !isActive && !isDone && "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                  <span className="text-[10px] sm:text-xs">{s.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground/40 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* STEP 1: INPUT */}
        {step === "input" && (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <Card className="rounded-2xl border bg-card shadow-sm">
              <CardHeader className="pb-2 px-4 sm:px-6">
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />
                  Company Source
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 px-4 sm:px-6">
                {/* Website section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">Website</Label>
                    <span className="text-xs text-muted-foreground">(optional if files are uploaded)</span>
                  </div>
                  <div className="space-y-2">
                    <Input
                      placeholder="https://choco-up.com"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="rounded-xl"
                    />
                    <p className="text-xs text-muted-foreground">
                      We will scrape your homepage, about page, and product descriptions.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Success Stories URL (optional)</Label>
                    <Input
                      placeholder="https://choco-up.com/success-stories"
                      value={successStoriesUrl}
                      onChange={(e) => setSuccessStoriesUrl(e.target.value)}
                      className="rounded-xl"
                    />
                    <p className="text-xs text-muted-foreground">
                      Links to case studies, testimonials, or customer stories help AI extract real pain points.
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">and / or</span>
                  </div>
                </div>

                {/* Files section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <File className="w-4 h-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">Upload Files</Label>
                    <span className="text-xs text-muted-foreground">(optional if website URL is provided)</span>
                  </div>
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={cn(
                      "border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer",
                      dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-muted-foreground/40"
                    )}
                  >
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm font-medium">Drag & drop files here</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, DOCX, PPTX, TXT — sales decks, pitch decks, case studies, product sheets
                    </p>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.docx,.pptx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain"
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? []);
                        setUploadedFiles((prev) => [...prev, ...files]);
                      }}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="mt-3 inline-block">
                      <span className="inline-flex items-center justify-center h-8 px-3 text-xs font-medium rounded-lg border border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors">
                        Browse Files
                      </span>
                    </label>
                  </div>

                  {uploadedFiles.length > 0 && (
                    <div className="space-y-1.5">
                      {uploadedFiles.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg px-3 py-2">
                          <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="flex-1 truncate">{f.name}</span>
                          <span className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(0)} KB</span>
                          <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-red-500">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                {loading ? (
                  <div className="rounded-xl border bg-card p-4 sm:p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        >
                          <Loader2 className="w-5 h-5 text-primary" />
                        </motion.div>
                      </div>
                      <div>
                        <AnimatePresence mode="wait">
                          <motion.p
                            key={extractionPhase}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            className="text-sm font-medium"
                          >
                            {EXTRACTION_PHASES[Math.min(extractionPhase, EXTRACTION_PHASES.length - 1)].label}
                          </motion.p>
                        </AnimatePresence>
                        <p className="text-xs text-muted-foreground">
                          {EXTRACTION_PHASES[Math.min(extractionPhase, EXTRACTION_PHASES.length - 1)].description}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {EXTRACTION_PHASES.map((phase, i) => {
                        const Icon = phase.icon;
                        const isActive = i === extractionPhase;
                        const isDone = i < extractionPhase;
                        return (
                          <div key={i} className="flex items-center gap-2">
                            <div className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center transition-colors duration-500",
                              isDone ? "bg-emerald-500 text-white" :
                              isActive ? "bg-primary text-primary-foreground animate-pulse" :
                              "bg-muted text-muted-foreground"
                            )}>
                              {isDone ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                            </div>
                            <span className={cn(
                              "text-xs transition-colors duration-300",
                              isDone ? "text-emerald-600 line-through opacity-60" :
                              isActive ? "text-foreground font-medium" :
                              "text-muted-foreground"
                            )}>
                              {phase.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={extract}
                    disabled={!url.trim() && uploadedFiles.length === 0}
                    className="w-full rounded-xl"
                  >
                    <Wand2 className="w-4 h-4 mr-2" />
                    Extract Company Context
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* STEP 2: PREVIEW */}
        {step === "preview" && profile && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-4"
          >
            <Card className="rounded-2xl border bg-card shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Extracted Company Profile
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="h-8 gap-1 rounded-lg" onClick={() => setStep("input")}>
                    <RefreshCw className="w-3.5 h-3.5" />
                    Re-extract
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Review and edit before generating scenarios. The more accurate, the better the simulations.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Company Header */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Company Name</Label>
                    <Input value={profile.company_name} onChange={(e) => updateProfileField("company_name", e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tagline</Label>
                    <Input value={profile.tagline} onChange={(e) => updateProfileField("tagline", e.target.value)} className="rounded-xl" />
                  </div>
                </div>

                {/* Product Deep Dive */}
                {profile.product_deep_dive && (
                  <div className="space-y-2 rounded-xl border bg-muted/20 p-4">
                    <Label className="text-xs font-semibold">Product Deep Dive</Label>
                    <p className="text-sm">{profile.product_deep_dive.overview}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.product_deep_dive.key_features.map((f: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-[10px]">{f}</Badge>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="bg-background rounded-lg p-2.5 border">
                        <span className="text-muted-foreground">Pricing:</span>
                        <p className="font-medium mt-0.5">{profile.product_deep_dive.pricing_model}</p>
                      </div>
                      <div className="bg-background rounded-lg p-2.5 border">
                        <span className="text-muted-foreground">Ideal Customer:</span>
                        <p className="font-medium mt-0.5">{profile.product_deep_dive.ideal_customer_profile}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pain Points + Current Problems */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Pain Points Solved</Label>
                    <ul className="space-y-1.5">
                      {profile.pain_points_solved.map((p: string, i: number) => (
                        <li key={i} className="text-sm flex gap-2">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-amber-600">Customer BEFORE State</Label>
                    <p className="text-[11px] text-muted-foreground">What painful manual process the customer endures before this solution</p>
                    <ul className="space-y-1.5">
                      {profile.current_process_problems.map((p: string, i: number) => (
                        <li key={i} className="text-sm flex gap-2 bg-amber-50 rounded-lg p-2">
                          <span className="text-amber-500 mt-0.5">⚠</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Value Props */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Value Propositions</Label>
                  <div className="flex flex-wrap gap-2">
                    {profile.value_propositions.map((v: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">{v}</Badge>
                    ))}
                  </div>
                </div>

                {/* Competitive Landscape */}
                {profile.competitive_landscape && (
                  <div className="space-y-2 rounded-xl border bg-muted/20 p-4">
                    <Label className="text-xs font-semibold">Competitive Landscape</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground">Competitors:</span>
                        <p className="font-medium">{profile.competitive_landscape.primary_competitors.join(", ")}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Why customers switch:</span>
                        <p className="font-medium">{profile.competitive_landscape.why_customers_switch}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Objections */}
                {profile.common_objections && profile.common_objections.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs">Common Objections</Label>
                    {profile.common_objections.map((o, i) => (
                      <div key={i} className="rounded-lg border bg-red-50/50 p-3 space-y-1">
                        <p className="text-sm font-medium text-red-700">"{o.objection}"</p>
                        <p className="text-xs text-muted-foreground">Underlying: {o.underlying_concern}</p>
                        <p className="text-xs text-emerald-600">How to handle: {o.handling_approach}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Buyer Personas — Rich Cards */}
                <div className="space-y-3">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    Buyer Personas ({profile.buyer_personas.length})
                  </Label>
                  <div className="space-y-3">
                    {profile.buyer_personas.map((persona, i) => (
                      <Card key={i} className="rounded-xl border overflow-hidden">
                        <div className="bg-muted/40 px-3 sm:px-4 py-3 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                          <div>
                            <p className="text-sm font-semibold">{persona.name}{persona.age_approx ? `, ${persona.age_approx}` : ""}</p>
                            <p className="text-xs text-muted-foreground">{persona.full_role || persona.role} {persona.company_type ? `• ${persona.company_type}` : ""}</p>
                          </div>
                          <Badge variant="secondary" className="text-[10px]">{persona.industry}</Badge>
                        </div>
                        <CardContent className="p-4 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Personality</span>
                              <p className="text-xs">{persona.personality}</p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Communication Style</span>
                              <p className="text-xs">{persona.communication_style || "Not specified"}</p>
                            </div>
                          </div>
                          {persona.background_context && (
                            <div className="bg-muted/30 rounded-lg p-2.5 text-xs">{persona.background_context}</div>
                          )}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Pain Points</span>
                              <ul className="mt-1 space-y-1">
                                {persona.pain_points.map((p: string, j: number) => (
                                  <li key={j} className="text-xs flex gap-1.5"><span className="text-red-400">•</span>{p}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Goals</span>
                              <ul className="mt-1 space-y-1">
                                {persona.goals.map((g: string, j: number) => (
                                  <li key={j} className="text-xs flex gap-1.5"><span className="text-emerald-400">•</span>{g}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                          {persona.hidden_concerns && (
                            <div className="bg-amber-50 rounded-lg p-2.5 border border-amber-100">
                              <span className="text-[10px] uppercase tracking-wider text-amber-600 font-medium">Hidden Concerns</span>
                              <p className="text-xs text-amber-800 mt-0.5">{persona.hidden_concerns}</p>
                            </div>
                          )}
                          {persona.opening_line && (
                            <div className="bg-primary/5 rounded-lg p-2.5 border border-primary/10">
                              <span className="text-[10px] uppercase tracking-wider text-primary font-medium">Opening Line</span>
                              <p className="text-xs italic text-primary/80 mt-0.5">"{persona.opening_line}"</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Customer Testimonials */}
                {profile.customer_testimonials && profile.customer_testimonials.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs">Customer Testimonials</Label>
                    {profile.customer_testimonials.map((t, i) => (
                      <div key={i} className="rounded-xl border bg-muted/20 p-3 sm:p-4 space-y-2">
                        <p className="text-sm italic">"{t.quote}"</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div className="bg-red-50 rounded-lg p-2 border border-red-100">
                            <span className="text-red-500 font-medium">Before:</span>
                            <p className="text-red-700 mt-0.5">{t.before_state}</p>
                          </div>
                          <div className="bg-emerald-50 rounded-lg p-2 border border-emerald-100">
                            <span className="text-emerald-500 font-medium">After:</span>
                            <p className="text-emerald-700 mt-0.5">{t.after_state}</p>
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground">— {t.customer_name || "Customer"}{t.customer_company ? `, ${t.customer_company}` : ""}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Scenario Seeds */}
                {profile.sales_scenario_seeds && profile.sales_scenario_seeds.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs">Pre-built Scenario Ideas</Label>
                    {profile.sales_scenario_seeds.map((s, i) => (
                      <div key={i} className="rounded-xl border bg-primary/5 p-4 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">{s.scenario_type}</Badge>
                          <span className="text-xs text-muted-foreground">Target: {s.buyer_persona}</span>
                        </div>
                        <p className="text-xs">{s.setup}</p>
                        <p className="text-xs italic text-primary/70">"{s.buyer_opening}"</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Industry Dynamics */}
                {profile.industry_dynamics && (
                  <div className="space-y-2 rounded-xl border bg-muted/20 p-4">
                    <Label className="text-xs font-semibold">Industry Context</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div><span className="text-muted-foreground">Market trend:</span> <p className="font-medium mt-0.5">{profile.industry_dynamics.market_trend}</p></div>
                      <div><span className="text-muted-foreground">Buying cycle:</span> <p className="font-medium mt-0.5">{profile.industry_dynamics.buying_cycle}</p></div>
                    </div>
                  </div>
                )}

                <Button onClick={() => setStep("avatar")} className="w-full rounded-xl">
                  Looks Good — Pick an Avatar
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* STEP 3: AVATAR PICKER */}
        {step === "avatar" && (
          <motion.div
            key="avatar"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <Card className="rounded-2xl border bg-card shadow-sm">
              <CardHeader className="px-4 sm:px-6">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <Image className="w-4 h-4 text-primary" />
                  Choose an Avatar for Your Scenarios
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  This avatar will play the buyer/interviewer in all generated scenarios.
                </p>
              </CardHeader>
              <CardContent className="space-y-4 px-4 sm:px-6">
                <AvatarPicker
                  selected={avatarId}
                  onSelect={(id, vId, name) => {
                    setAvatarId(id);
                    setVoiceId(vId);
                    setAvatarName(name);
                  }}
                />

                {error && (
                  <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button variant="outline" className="flex-1 rounded-xl min-h-[44px]" onClick={() => setStep("preview")}>
                    Back
                  </Button>
                  <Button
                    className="flex-1 rounded-xl min-h-[44px]"
                    disabled={!avatarId || loading}
                    onClick={generate}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Scenarios
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* STEP 4: GENERATING */}
        {step === "generating" && (
          <motion.div
            key="generating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 gap-6"
          >
            <div className="relative w-20 h-20">
              <motion.div
                className="absolute inset-0 rounded-full bg-primary/10"
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            </div>
            <div className="text-center space-y-3 max-w-sm">
              <p className="font-medium text-lg">Building your sales scenarios...</p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <motion.p
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  Creating buyer personas from extracted profile...
                </motion.p>
                <motion.p
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                >
                  Generating realistic pain points and objections...
                </motion.p>
                <motion.p
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                >
                  Crafting interview and discovery call scripts...
                </motion.p>
              </div>
            </div>
            <div className="w-64 h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                animate={{ width: ["0%", "30%", "60%", "90%", "100%"] }}
                transition={{ duration: 8, times: [0, 0.2, 0.5, 0.8, 1] }}
              />
            </div>
          </motion.div>
        )}

        {/* STEP 5: SUCCESS */}
        {step === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-16 gap-5"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold">{generatedCount} Scenarios Created!</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                AI generated realistic sales scenarios based on your company profile. They are now in your Scenarios page.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto px-4">
              <Button variant="outline" className="rounded-xl min-h-[44px]" onClick={() => setStep("input")}>
                Onboard Another Company
              </Button>
              <Button className="rounded-xl min-h-[44px]" onClick={() => router.push("/scenarios")}>
                View My Scenarios
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
