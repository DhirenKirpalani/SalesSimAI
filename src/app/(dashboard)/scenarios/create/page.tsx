"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Users,
  Check,
  Loader2,
  Clock,
  Sparkles,
  Send,
  FileText,
  ChevronDown,
  Phone,
  Video,
  GraduationCap,
  Handshake,
  Target,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface KbDoc {
  id: string;
  name: string;
  document_type: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface GeneratedScenario {
  seller_company: string;
  seller_product: string;
  product_type: string;
  seller_description: string;
  scenario_type: string;
  difficulty: string;
  duration: number;
  context_note: string;
  custom_persona: {
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
  };
  scoring_criteria: string;
  evaluation_framework: string;
}

const CATEGORY_SUGGESTIONS: Record<string, { icon: typeof Phone; label: string; text: string }[]> = {
  interviews: [
    { icon: GraduationCap, label: "Behavioral", text: "Behavioral interview for a product manager role at a tech startup" },
    { icon: Users, label: "First Round", text: "First round interview for a senior software engineer position" },
    { icon: Target, label: "Product Knowledge", text: "Product knowledge interview for a sales role at a SaaS company" },
    { icon: Phone, label: "Tell Me About Yourself", text: "Practice answering 'Tell me about yourself' for a marketing manager role" },
  ],
  sales: [
    { icon: Phone, label: "Cold Call", text: "I want to practice a cold call to a VP of Finance at a logistics company" },
    { icon: Target, label: "Discovery Call", text: "Discovery call with a Head of Operations at a mid-size manufacturer" },
    { icon: Handshake, label: "Objection Handling", text: "Handling objections from a prospect who thinks the price is too high" },
    { icon: Target, label: "Product Demo", text: "Product demo for a CFO who is concerned about ROI" },
  ],
  leadership: [
    { icon: Users, label: "Difficult Feedback", text: "Giving difficult feedback to a underperforming team member" },
    { icon: Target, label: "Performance Review", text: "Annual performance review with a senior developer" },
    { icon: Handshake, label: "Managing Conflict", text: "Resolving conflict between two team members on my team" },
    { icon: Users, label: "Coaching", text: "Coaching a team member who wants to grow into a leadership role" },
  ],
  corporate_communication: [
    { icon: Target, label: "Saying No", text: "Saying no professionally to a stakeholder requesting an unrealistic deadline" },
    { icon: Users, label: "Stakeholder Update", text: "Giving a status update to executives on a delayed project" },
    { icon: Handshake, label: "Escalation", text: "Escalating an issue to leadership when a vendor is failing to deliver" },
    { icon: Target, label: "Managing Priorities", text: "Discussing shifting priorities with a cross-functional team" },
  ],
  negotiation: [
    { icon: Handshake, label: "Salary", text: "Salary negotiation for a new job offer" },
    { icon: Target, label: "Budget", text: "Budget discussion with my manager for next quarter's headcount" },
    { icon: Handshake, label: "Vendor", text: "Negotiating pricing with a vendor who is raising their rates" },
    { icon: Handshake, label: "Scope", text: "Scope negotiation with a client requesting extra work outside the contract" },
  ],
  customer_success: [
    { icon: Phone, label: "Onboarding", text: "Onboarding call with a new customer who is eager to go live quickly" },
    { icon: Handshake, label: "Renewal", text: "Renewal discussion with a customer considering downgrading their plan" },
    { icon: Target, label: "Churn Risk", text: "Handling a churn risk call with a frustrated customer experiencing issues" },
    { icon: Phone, label: "Upsell", text: "Upsell conversation with a customer who has outgrown their current tier" },
  ],
  product_management: [
    { icon: Target, label: "PRD Review", text: "PRD review with engineering and design teams for a new feature" },
    { icon: Users, label: "Sprint Planning", text: "Sprint planning discussion with engineers pushing back on scope" },
    { icon: Target, label: "Roadmap Pitch", text: "Pitching a roadmap change to the executive team" },
    { icon: Handshake, label: "Engineering Tradeoff", text: "Discussing technical tradeoffs with a lead engineer on architecture" },
  ],
  presentations: [
    { icon: Target, label: "Investor Pitch", text: "Investor pitch for a Series A funding round" },
    { icon: Target, label: "Quarterly Review", text: "Quarterly business review presentation to the board" },
    { icon: Target, label: "Product Launch", text: "Product launch presentation to the sales and marketing teams" },
    { icon: Users, label: "All-Hands", text: "Team all-hands presentation on company strategy and goals" },
  ],
  professional_english: [
    { icon: Phone, label: "Small Talk", text: "Small talk and networking at a professional conference" },
    { icon: Target, label: "Email Tone", text: "Practicing professional email tone for a client follow-up" },
    { icon: Users, label: "Meeting Participation", text: "Participating actively in a cross-functional team meeting" },
    { icon: Target, label: "Presentation Delivery", text: "Delivering a short presentation in English to an international audience" },
  ],
};

const DEFAULT_SUGGESTIONS = [
  { icon: Phone, label: "Cold Call", text: "I want to practice a cold call to a VP of Finance at a logistics company" },
  { icon: GraduationCap, label: "Interview", text: "Behavioral interview for a product manager role at a tech startup" },
  { icon: Handshake, label: "Negotiation", text: "Negotiating a renewal with a skeptical customer who wants a discount" },
  { icon: Target, label: "Product Demo", text: "Product demo for a CFO who is concerned about ROI" },
];

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
};

function CreateScenarioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = searchParams.get("category") || "";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [scenario, setScenario] = useState<GeneratedScenario | null>(null);
  const [saving, setSaving] = useState(false);
  const [showKb, setShowKb] = useState(false);
  const [kbDocs, setKbDocs] = useState<KbDoc[]>([]);
  const [selectedKbIds, setSelectedKbIds] = useState<string[]>([]);
  const [statusText, setStatusText] = useState("");
  const [mode, setMode] = useState<"video" | "voice">("video");
  const [avatars, setAvatars] = useState<{ id: string; name: string; preview_image_url: string | null; gender: string | null }[]>([]);
  const [selectedAvatarId, setSelectedAvatarId] = useState("");
  const [selectedVoiceId, setSelectedVoiceId] = useState("");
  const [avatarsLoading, setAvatarsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const statusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const ELEVENLABS_VOICES = [
    { id: "8qPG2eSETnKl5ezq52Js", name: "Female Voice 1", gender: "female", imageUrl: "https://haqghlhwfpyrvfluyrkv.supabase.co/storage/v1/object/public/voice-avatars/3b36069a-1e17-45ac-9ccd-11af34c39617/1782747409955.jpg" },
    { id: "Y7xQSS5ZtS4xv4VJotWd", name: "Female Voice 2", gender: "female", imageUrl: "https://haqghlhwfpyrvfluyrkv.supabase.co/storage/v1/object/public/voice-avatars/3b36069a-1e17-45ac-9ccd-11af34c39617/1782748798191.jpg" },
    { id: "FXMPPfJPpDj0GSwJ6ASO", name: "Male Voice 1", gender: "male", imageUrl: "https://haqghlhwfpyrvfluyrkv.supabase.co/storage/v1/object/public/voice-avatars/3b36069a-1e17-45ac-9ccd-11af34c39617/1782747998663.jpg" },
  ];

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/company/documents?limit=100");
        if (res.ok) {
          const data = await res.json();
          setKbDocs((data.documents ?? []).map((d: any) => ({
            id: d.id,
            name: d.name,
            document_type: d.document_type,
          })));
        }
      } catch (e) {
        console.error("[create] failed to load KB docs:", e);
      }
    })();
  }, []);

  useEffect(() => {
    if (scenario && mode === "video" && avatars.length === 0 && !avatarsLoading) {
      setAvatarsLoading(true);
      fetch("/api/heygen-test/avatars?page=1&page_size=50")
        .then((r) => r.json())
        .then((data) => setAvatars(data.avatars ?? []))
        .catch(() => setAvatars([]))
        .finally(() => setAvatarsLoading(false));
    }
  }, [scenario, mode, avatars.length, avatarsLoading]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || generating) return;
    await handleSendWith(input.trim());
    setInput("");
  };

  const STATUS_MESSAGES = [
    "Analyzing your request...",
    "Reviewing knowledge base...",
    "Designing the persona...",
    "Crafting the scenario...",
    "Building scoring criteria...",
    "Finalizing details...",
  ];

  const startStatusRotation = () => {
    let idx = 0;
    setStatusText(STATUS_MESSAGES[0]);
    statusIntervalRef.current = setInterval(() => {
      idx = (idx + 1) % STATUS_MESSAGES.length;
      setStatusText(STATUS_MESSAGES[idx]);
    }, 2500);
  };

  const stopStatusRotation = () => {
    if (statusIntervalRef.current) {
      clearInterval(statusIntervalRef.current);
      statusIntervalRef.current = null;
    }
    setStatusText("");
  };

  const handleSendWith = async (message: string) => {
    if (!message.trim() || generating) return;

    const userMessage = message.trim();
    const newMessages = [...messages, { role: "user" as const, content: userMessage }];
    setMessages(newMessages);
    setGenerating(true);
    setError("");
    startStatusRotation();

    try {
      const res = await fetch("/api/scenario/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          kbDocIds: selectedKbIds,
          category,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate scenario");
      }

      if (data.type === "question") {
        // AI is asking a clarifying question
        setMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
      } else if (data.type === "scenario" && data.scenario) {
        setScenario(data.scenario);
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: `I've created your scenario: **${data.scenario.scenario_type}** with **${data.scenario.custom_persona.name}** (${data.scenario.custom_persona.jobTitle} at ${data.scenario.custom_persona.company}). Review it below and start when ready!`,
        }]);
      } else if (data.scenario) {
        // Backward compat: direct scenario response
        setScenario(data.scenario);
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: `I've created your scenario: **${data.scenario.scenario_type}** with **${data.scenario.custom_persona.name}** (${data.scenario.custom_persona.jobTitle} at ${data.scenario.custom_persona.company}). Review it below and start when ready!`,
        }]);
      }
    } catch (e: any) {
      setError(e.message || "Something went wrong");
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "Sorry, I couldn't generate the scenario. Please try again with more detail.",
      }]);
    } finally {
      stopStatusRotation();
      setGenerating(false);
    }
  };

  const handleSaveAndStart = async () => {
    if (!scenario) return;
    setSaving(true);
    setError("");

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("Not authenticated."); setSaving(false); return; }

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();
      const organizationId = userProfile?.organization_id ?? null;

      const scenarioName = `${scenario.seller_company} — ${scenario.scenario_type}`;

      // Map scenario_type to a category value for product_type
      // so the scenario appears in the right category page
      const SCENARIO_TYPE_TO_CATEGORY: Record<string, string> = {
        "First Discovery Call": "sales",
        "Objection Handling": "sales",
        "Product Demo": "sales",
        "Pitch": "sales",
        "Negotiation": "negotiation",
        "Win-Back": "customer_success",
        "Renewal": "customer_success",
        "Executive Presentation": "presentations",
        "Product Knowledge Interview": "product_management",
        "First Round Interview": "interviews",
        "Behavioral Interview": "interviews",
      };
      const productType = category || SCENARIO_TYPE_TO_CATEGORY[scenario.scenario_type] || "sales";

      const payload = {
        name: scenarioName,
        user_id: user.id,
        created_by: user.id,
        organization_id: organizationId,
        seller_company: scenario.seller_company,
        seller_product: scenario.seller_product,
        product_type: productType,
        seller_description: scenario.seller_description,
        scenario_type: scenario.scenario_type,
        difficulty: scenario.difficulty,
        duration: scenario.duration,
        context_note: scenario.context_note,
        custom_persona: scenario.custom_persona,
        preset_persona_id: null,
        avatar_id: selectedAvatarId || null,
        avatar_name: avatars.find((a) => a.id === selectedAvatarId)?.name ?? scenario.custom_persona.name,
        voice_id: null,
        elevenlabs_voice_id: selectedVoiceId || null,
        voice_avatar_image_url: ELEVENLABS_VOICES.find((v) => v.id === selectedVoiceId)?.imageUrl ?? null,
        scoring_criteria: scenario.scoring_criteria,
        evaluation_framework: scenario.evaluation_framework,
      };

      const { data: inserted, error: dbErr } = await supabase
        .from("custom_scenarios")
        .insert(payload)
        .select("id")
        .single();

      if (dbErr) { setError(dbErr.message); setSaving(false); return; }

      // Start simulation
      const simRes = await fetch("/api/simulation/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: inserted.id,
          scenarioTable: "custom_scenarios",
          scenarioName,
          avatarName: scenario.custom_persona.name,
          avatarId: mode === "video" ? (selectedAvatarId || undefined) : undefined,
          avatarImageUrl: mode === "video" ? (avatars.find((a) => a.id === selectedAvatarId)?.preview_image_url ?? undefined) : undefined,
          voiceAvatarImageUrl: mode === "voice"
            ? (ELEVENLABS_VOICES.find((v) => v.id === selectedVoiceId)?.imageUrl ?? undefined)
            : undefined,
          elevenlabsVoiceId: mode === "voice" ? (selectedVoiceId || undefined) : undefined,
          callMode: mode,
        }),
      });

      const simData = await simRes.json().catch(() => ({}));
      if (!simRes.ok || !simData.sessionId) {
        // Saved but couldn't start sim — go to scenarios page
        router.push("/scenarios");
      } else {
        router.push(`/simulation?sessionId=${simData.sessionId}`);
      }
    } catch (e: any) {
      setError(e.message || "Failed to save scenario");
      setSaving(false);
    }
  };

  const toggleKbDoc = (id: string) => {
    setSelectedKbIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3">
        <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight">
            {category ? `Create ${CATEGORY_LABELS[category] || "Custom"} Scenario` : "Create Custom Scenario"}
          </h1>
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">Describe what you want to practice — AI builds the scenario for you.</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={scenario ? "review" : "chat"}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {!scenario ? (
            /* ── Chat Screen ── */
            <div className="space-y-4">
              {/* Chat card */}
              <Card className="rounded-2xl border shadow-sm flex flex-col overflow-hidden">
                {/* Chat area */}
                <CardContent className="flex-1 p-4 sm:p-6 overflow-y-auto" style={{ minHeight: messages.length === 0 ? "420px" : "200px", maxHeight: "500px" }}>
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-6">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4 ring-1 ring-primary/10">
                        <Sparkles className="w-7 h-7 text-primary" />
                      </div>
                      <h2 className="text-base font-semibold mb-1">What do you want to practice?</h2>
                      <p className="text-xs text-muted-foreground mb-5 max-w-sm">Describe a scenario in your own words and I&apos;ll build a complete practice session for you.</p>
                      <div className="grid grid-cols-2 gap-2.5 w-full max-w-md">
                        {(category && CATEGORY_SUGGESTIONS[category] ? CATEGORY_SUGGESTIONS[category] : DEFAULT_SUGGESTIONS).map((s) => {
                          const Icon = s.icon;
                          return (
                            <button
                              key={s.label}
                              onClick={() => handleSendWith(s.text)}
                              className="group flex flex-col items-start gap-2 rounded-xl border border-border p-3 text-left hover:border-primary/40 hover:bg-primary/5 transition-all"
                            >
                              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                              </div>
                              <div>
                                <p className="text-xs font-semibold mb-0.5">{s.label}</p>
                                <p className="text-[11px] text-muted-foreground line-clamp-2">{s.text}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((msg, i) => (
                        <div
                          key={i}
                          className={cn(
                            "flex",
                            msg.role === "user" ? "justify-end" : "justify-start"
                          )}
                        >
                          {msg.role === "assistant" && (
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mr-2 shrink-0 ring-1 ring-primary/10">
                              <Sparkles className="w-3.5 h-3.5 text-primary" />
                            </div>
                          )}
                          <div
                            className={cn(
                              "rounded-2xl px-3.5 py-2.5 text-sm max-w-[80%]",
                              msg.role === "user"
                                ? "bg-primary text-primary-foreground rounded-br-md"
                                : "bg-muted text-foreground rounded-bl-md"
                            )}
                          >
                            {msg.content}
                          </div>
                        </div>
                      ))}
                      {generating && (
                        <div className="flex justify-start items-center">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mr-2 shrink-0 ring-1 ring-primary/10">
                            <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                          </div>
                          <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
                            <span className="text-xs text-muted-foreground animate-pulse">{statusText || "Thinking..."}</span>
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                  )}
                </CardContent>

                {/* KB selector (inline, subtle) */}
                {kbDocs.length > 0 && (
                  <div className="border-t px-4 sm:px-6 py-2.5">
                    <button
                      onClick={() => setShowKb(!showKb)}
                      className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
                    >
                      <ChevronDown className={cn("w-3 h-3 transition-transform", showKb && "rotate-180")} />
                      <FileText className="w-3 h-3" />
                      Knowledge Base
                      {selectedKbIds.length > 0 && (
                        <Badge variant="secondary" className="text-[9px] ml-0.5 h-4 px-1.5">{selectedKbIds.length}</Badge>
                      )}
                    </button>
                    {showKb && (
                      <div className="space-y-1 max-h-32 overflow-y-auto rounded-lg border p-1.5 mt-2">
                        {kbDocs.map((doc) => (
                          <label
                            key={doc.id}
                            className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50 cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={selectedKbIds.includes(doc.id)}
                              onChange={() => toggleKbDoc(doc.id)}
                              className="w-3.5 h-3.5 rounded border-input"
                            />
                            <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="text-[11px] font-medium truncate flex-1">{doc.name}</span>
                            <Badge variant="outline" className="text-[8px] shrink-0 h-4 px-1">{doc.document_type}</Badge>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Input bar */}
                <div className="border-t p-3 sm:p-4">
                  <div className="flex items-end gap-2">
                    <Textarea
                      className="rounded-xl text-sm min-h-[44px] max-h-28 resize-none border-border"
                      placeholder="Describe what you want to practice..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      disabled={generating}
                    />
                    <Button
                      className="rounded-xl shrink-0 h-11 w-11 p-0"
                      onClick={handleSend}
                      disabled={!input.trim() || generating}
                    >
                      {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </Card>

              {error && (
                <p className="text-xs text-red-500 bg-red-500/10 rounded-xl px-3 py-2">{error}</p>
              )}
            </div>
          ) : (
            /* ── Review Screen — Detailed ── */
            <div className="space-y-4">
              <Card className="rounded-2xl border shadow-sm">
                <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6">
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    Your Scenario is Ready
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Review all details below. Edit any field or start practicing now.</p>
                </CardHeader>
                <CardContent className="space-y-5 px-4 sm:px-6 pb-5 sm:pb-6">
                  {/* Scenario overview */}
                  <div className="flex items-center justify-between rounded-xl border p-3 bg-muted/30">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Scenario</p>
                      <p className="font-semibold text-sm truncate">{scenario.seller_product || "Untitled"}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-[10px]">{scenario.scenario_type}</Badge>
                      <Badge variant="outline" className="text-[10px]">{scenario.difficulty}</Badge>
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <Clock className="w-2.5 h-2.5" />{scenario.duration} min
                      </Badge>
                    </div>
                  </div>

                  {/* Seller info */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Seller Info</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="rounded-lg border p-2.5">
                        <p className="text-[10px] text-muted-foreground mb-0.5">Company</p>
                        <p className="text-xs font-medium">{scenario.seller_company}</p>
                      </div>
                      <div className="rounded-lg border p-2.5">
                        <p className="text-[10px] text-muted-foreground mb-0.5">Product</p>
                        <p className="text-xs font-medium">{scenario.seller_product}</p>
                      </div>
                    </div>
                    <div className="rounded-lg border p-2.5">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Description</p>
                      <p className="text-xs">{scenario.seller_description}</p>
                    </div>
                  </div>

                  {/* Persona details */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> Persona
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="rounded-lg border p-2.5">
                        <p className="text-[10px] text-muted-foreground mb-0.5">Name</p>
                        <p className="text-xs font-medium">{scenario.custom_persona.name}</p>
                      </div>
                      <div className="rounded-lg border p-2.5">
                        <p className="text-[10px] text-muted-foreground mb-0.5">Job Title</p>
                        <p className="text-xs font-medium">{scenario.custom_persona.jobTitle}</p>
                      </div>
                      <div className="rounded-lg border p-2.5">
                        <p className="text-[10px] text-muted-foreground mb-0.5">Company</p>
                        <p className="text-xs font-medium">{scenario.custom_persona.company}</p>
                      </div>
                      <div className="rounded-lg border p-2.5">
                        <p className="text-[10px] text-muted-foreground mb-0.5">Industry</p>
                        <p className="text-xs font-medium">{scenario.custom_persona.industry}</p>
                      </div>
                    </div>
                    <div className="rounded-lg border p-2.5">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Personality</p>
                      <p className="text-xs">{scenario.custom_persona.personality}</p>
                    </div>
                    {scenario.custom_persona.personalityTraits && (
                      <div className="rounded-lg border p-2.5">
                        <p className="text-[10px] text-muted-foreground mb-0.5">Traits</p>
                        <p className="text-xs">{scenario.custom_persona.personalityTraits}</p>
                      </div>
                    )}
                  </div>

                  {/* Pain points & goals */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Pain Points</p>
                      <ul className="space-y-1">
                        {scenario.custom_persona.painPoints?.map((p, i) => (
                          <li key={i} className="text-xs flex items-start gap-1.5">
                            <span className="text-muted-foreground shrink-0">•</span>
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Goals</p>
                      <ul className="space-y-1">
                        {scenario.custom_persona.goals?.map((g, i) => (
                          <li key={i} className="text-xs flex items-start gap-1.5">
                            <span className="text-muted-foreground shrink-0">•</span>
                            <span>{g}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Additional persona details */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Persona Context</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {scenario.custom_persona.painPointsCurrentProcess && (
                        <div className="rounded-lg border p-2.5">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Current Process Pain</p>
                          <p className="text-xs">{scenario.custom_persona.painPointsCurrentProcess}</p>
                        </div>
                      )}
                      {scenario.custom_persona.painPointsImpact && (
                        <div className="rounded-lg border p-2.5">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Pain Impact</p>
                          <p className="text-xs">{scenario.custom_persona.painPointsImpact}</p>
                        </div>
                      )}
                      {scenario.custom_persona.companyGoal && (
                        <div className="rounded-lg border p-2.5">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Company Goal</p>
                          <p className="text-xs">{scenario.custom_persona.companyGoal}</p>
                        </div>
                      )}
                      {scenario.custom_persona.personalMotivation && (
                        <div className="rounded-lg border p-2.5">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Personal Motivation</p>
                          <p className="text-xs">{scenario.custom_persona.personalMotivation}</p>
                        </div>
                      )}
                      {scenario.custom_persona.communicationStyle && (
                        <div className="rounded-lg border p-2.5">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Communication Style</p>
                          <p className="text-xs">{scenario.custom_persona.communicationStyle}</p>
                        </div>
                      )}
                      {scenario.custom_persona.communicationLanguage && (
                        <div className="rounded-lg border p-2.5">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Communication Language</p>
                          <p className="text-xs">{scenario.custom_persona.communicationLanguage}</p>
                        </div>
                      )}
                      {scenario.custom_persona.priorVendorExperience && (
                        <div className="rounded-lg border p-2.5">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Prior Vendor Experience</p>
                          <p className="text-xs">{scenario.custom_persona.priorVendorExperience}</p>
                        </div>
                      )}
                      {scenario.custom_persona.decisionCriteria && (
                        <div className="rounded-lg border p-2.5">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Decision Criteria</p>
                          <p className="text-xs">{scenario.custom_persona.decisionCriteria}</p>
                        </div>
                      )}
                      {scenario.custom_persona.hiddenConcern && (
                        <div className="rounded-lg border p-2.5">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Hidden Concern</p>
                          <p className="text-xs">{scenario.custom_persona.hiddenConcern}</p>
                        </div>
                      )}
                      {scenario.custom_persona.meetingSource && (
                        <div className="rounded-lg border p-2.5">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Meeting Source</p>
                          <p className="text-xs">{scenario.custom_persona.meetingSource}</p>
                        </div>
                      )}
                      {scenario.custom_persona.budgetStatus && (
                        <div className="rounded-lg border p-2.5">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Budget Status</p>
                          <p className="text-xs">{scenario.custom_persona.budgetStatus}</p>
                        </div>
                      )}
                      {scenario.custom_persona.timelinePressure && (
                        <div className="rounded-lg border p-2.5">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Timeline Pressure</p>
                          <p className="text-xs">{scenario.custom_persona.timelinePressure}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sample dialogues */}
                  {scenario.custom_persona.sampleDialogues && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sample Dialogues</p>
                      <div className="rounded-lg border p-2.5 bg-muted/30">
                        <p className="text-xs italic whitespace-pre-line">{scenario.custom_persona.sampleDialogues}</p>
                      </div>
                    </div>
                  )}

                  {/* Context note */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Context / Backstory</p>
                    <div className="rounded-lg border p-2.5 bg-muted/30">
                      <p className="text-xs whitespace-pre-line">{scenario.context_note}</p>
                    </div>
                  </div>

                  {/* Scoring criteria */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Scoring Criteria</p>
                    <div className="rounded-lg border p-2.5 bg-muted/30">
                      <p className="text-xs whitespace-pre-line">{scenario.scoring_criteria}</p>
                    </div>
                  </div>

                  {/* Evaluation framework */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Evaluation Framework:</span>
                    <Badge variant="outline" className="text-[10px]">{scenario.evaluation_framework}</Badge>
                  </div>

                  {/* KB indicator */}
                  {selectedKbIds.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <FileText className="w-3.5 h-3.5" />
                      {selectedKbIds.length} KB document{selectedKbIds.length > 1 ? "s" : ""} included
                    </div>
                  )}

                  {/* Practice mode with persona previews */}
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Practice Mode</p>
                    <div className="grid grid-cols-2 gap-3">
                      {/* Video Call card */}
                      <button
                        className={cn(
                          "rounded-xl border p-3 text-left transition-all",
                          mode === "video" ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:border-primary/30"
                        )}
                        onClick={() => setMode("video")}
                      >
                        <div className="flex items-center gap-1.5 mb-2">
                          <div className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center",
                            mode === "video" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
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
                            <p className="text-xs font-medium truncate">{scenario.custom_persona.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">AI Avatar</p>
                          </div>
                        </div>
                      </button>

                      {/* Voice Call card */}
                      <button
                        className={cn(
                          "rounded-xl border p-3 text-left transition-all",
                          mode === "voice" ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:border-primary/30"
                        )}
                        onClick={() => setMode("voice")}
                      >
                        <div className="flex items-center gap-1.5 mb-2">
                          <div className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center",
                            mode === "voice" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
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
                            <p className="text-xs font-medium truncate">{scenario.custom_persona.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">Voice Only</p>
                          </div>
                        </div>
                      </button>
                    </div>

                    {/* Avatar selection for video mode */}
                    {mode === "video" && (
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
                    {mode === "voice" && (
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

                  {error && (
                    <p className="text-xs text-red-500 bg-red-500/10 rounded-xl px-3 py-2">{error}</p>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex flex-col-reverse sm:flex-row gap-2">
                <Button
                  variant="outline"
                  className="rounded-xl gap-1 h-11 sm:h-9"
                  onClick={() => {
                    setScenario(null);
                    setMessages([]);
                  }}
                  disabled={saving}
                >
                  Start Over
                </Button>
                <Button
                  className="rounded-xl gap-1 h-11 sm:h-9 flex-1"
                  onClick={handleSaveAndStart}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Save & Start Simulation
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
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
