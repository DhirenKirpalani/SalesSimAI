"use client";

import { useEffect, useState } from "react";
import { Building2, Target, DollarSign, Trophy, AlertCircle, Lightbulb, ChevronDown, Route, Swords } from "lucide-react";

interface CallStep {
  id: number;
  label: string;
  hint: string;
}

interface Competitor {
  name: string;
  strengths: string[];
  weaknesses: string[];
  ourEdge: string[];
  notes: string[];
}

interface VoiceCallSidebarProps {
  sellerCompany?: string | null;
  sellerProduct?: string | null;
  sellerDescription?: string | null;
  contextNote?: string | null;
  buyerName?: string | null;
  buyerRole?: string | null;
  buyerPainPoints?: string[];
  callSteps?: CallStep[];
  currentStep?: number;
  scenarioType?: string | null;
}

interface CompetitiveDoc {
  id: string;
  name: string;
  content: string;
}

function parseBulletPoints(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\n|•|\-|\*/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length < 300);
}

function parseSentences(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .replace(/([.!?])\s+/g, "$1\n")
    .split(/\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .filter((s) => s.length > 40 && s.split(/\s+/).length >= 5);
}

function extractSection(text: string | null | undefined, headers: string[]): string | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const header of headers) {
    const idx = lower.indexOf(header.toLowerCase());
    if (idx === -1) continue;
    const after = text.slice(idx + header.length).trim();
    const end = after.search(/\n\n|##|(?:Key|Pricing|Competitive|Objection|Scenario):/i);
    const section = end > 0 ? after.slice(0, end).trim() : after.slice(0, 400).trim();
    if (section.length > 10) return section;
  }
  return null;
}

type CompetitorSection = "strengths" | "weaknesses" | "ourEdge" | "notes";

function parseCompetitors(text: string | null | undefined): Competitor[] | null {
  if (!text) return null;
  const raw = text.replace(/\r\n/g, "\n");
  const competitors: Competitor[] = [];
  let current: Competitor | null = null;
  let currentSection: CompetitorSection = "notes";

  const flushCurrent = () => {
    if (current && (current.notes.length > 0 || current.strengths.length > 0 || current.weaknesses.length > 0 || current.ourEdge.length > 0)) {
      competitors.push(current);
    }
  };

  const lines = raw.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const lower = trimmed.toLowerCase();

    // Detect competitor name as a heading or labeled line
    const nameMatch = trimmed.match(/^#{0,4}\s*(?:competitor:?\s*)?(.+)$/i) ||
      trimmed.match(/^\d+\.\s*(?:competitor:?\s*)?(.+)$/i) ||
      trimmed.match(/^(.+?):\s*(?:competitor|competitor\s+analysis)?\s*$/i);

    const sectionPatterns: { key: CompetitorSection; regex: RegExp }[] = [
      { key: "strengths", regex: /^(strengths?|pros?|advantages?|what they do well):?\s*/i },
      { key: "weaknesses", regex: /^(weaknesses?|cons?|gaps?|limitations?):?\s*/i },
      { key: "ourEdge", regex: /^(our\s*(edge|advantage)|why\s*(we| NorthPay)|how\s*we\s*win|differentiation):?\s*/i },
    ];

    let sectionHit: { key: CompetitorSection; remaining: string } | null = null;
    for (const { key, regex } of sectionPatterns) {
      const m = trimmed.match(regex);
      if (m) {
        sectionHit = { key, remaining: trimmed.replace(regex, "").trim() };
        break;
      }
    }

    if (sectionHit) {
      currentSection = sectionHit.key;
      if (sectionHit.remaining) {
        current?.[sectionHit.key].push(sectionHit.remaining);
      }
      continue;
    }

    // If line looks like a competitor name (no label prefix) and we already have content, start a new card
    if (nameMatch && !trimmed.match(/^[-*]/)) {
      const candidateName = nameMatch[1].trim();
      const isGenericHeader = /^(competitive|overview|summary|analysis|intelligence|context)$/i.test(candidateName);
      if (!isGenericHeader) {
        flushCurrent();
        current = {
          name: candidateName,
          strengths: [],
          weaknesses: [],
          ourEdge: [],
          notes: [],
        };
        currentSection = "notes";
        continue;
      }
    }

    // Remove bullet marker
    const clean = trimmed.replace(/^[-*•]\s*/, "").trim();
    if (!clean) continue;

    if (!current) {
      current = {
        name: "Competitive Landscape",
        strengths: [],
        weaknesses: [],
        ourEdge: [],
        notes: [],
      };
    }

    // Auto-classify bullet if it contains keywords
    const lowerClean = clean.toLowerCase();
    if (lowerClean.includes("strength") || lowerClean.includes("stronger") || lowerClean.includes("better at")) {
      current.strengths.push(clean);
    } else if (lowerClean.includes("weakness") || lowerClean.includes("lack") || lowerClean.includes("worse")) {
      current.weaknesses.push(clean);
    } else if (lowerClean.includes("we ") || lowerClean.includes("our ") || lowerClean.includes("advantage")) {
      current.ourEdge.push(clean);
    } else {
      current[currentSection].push(clean);
    }
  }

  flushCurrent();
  return competitors.length > 0 ? competitors : null;
}

function CompetitorCard({ competitor }: { competitor: Competitor }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2.5">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
        <Swords className="w-3.5 h-3.5 text-amber-400" />
        {competitor.name}
      </div>
      {competitor.strengths.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Their strengths</p>
          <ul className="space-y-1">
            {competitor.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                <span className="w-1 h-1 rounded-full bg-slate-500 mt-1.5 shrink-0" />
                <span className="leading-relaxed">{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {competitor.weaknesses.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Their weaknesses</p>
          <ul className="space-y-1">
            {competitor.weaknesses.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                <span className="w-1 h-1 rounded-full bg-red-500 mt-1.5 shrink-0" />
                <span className="leading-relaxed">{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {competitor.ourEdge.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-emerald-500 font-semibold">Our edge</p>
          <ul className="space-y-1">
            {competitor.ourEdge.map((e, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-emerald-100">
                <span className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span className="leading-relaxed">{e}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {competitor.notes.length > 0 && !competitor.strengths.length && !competitor.weaknesses.length && !competitor.ourEdge.length && (
        <ul className="space-y-1">
          {competitor.notes.map((n, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
              <span className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 shrink-0" />
              <span className="leading-relaxed">{n}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function VoiceCallSidebar({
  sellerCompany,
  sellerProduct,
  sellerDescription,
  contextNote,
  buyerName,
  buyerRole,
  buyerPainPoints,
  callSteps,
  currentStep = 0,
  scenarioType,
}: VoiceCallSidebarProps) {
  const isInterview = scenarioType === "First Round Interview" || scenarioType === "Product Knowledge Interview";
  const [showAll, setShowAll] = useState(false);
  const [showCallStructure, setShowCallStructure] = useState(false);
  const [competitiveDocs, setCompetitiveDocs] = useState<CompetitiveDoc[]>([]);
  const [loadingCompetitive, setLoadingCompetitive] = useState(false);

  useEffect(() => {
    async function loadCompetitiveDocs() {
      setLoadingCompetitive(true);
      try {
        const res = await fetch("/api/company/documents?document_type=competitive");
        if (!res.ok) return;
        const data = await res.json();
        const docs: CompetitiveDoc[] = (data.documents ?? [])
          .filter((d: any) => d.content?.trim())
          .map((d: any) => ({ id: d.id, name: d.name, content: d.content }));
        setCompetitiveDocs(docs);
      } catch (e) {
        console.error("[VoiceCallSidebar] failed to load competitive docs:", e);
      } finally {
        setLoadingCompetitive(false);
      }
    }
    loadCompetitiveDocs();
  }, []);

  const sellingPoints = parseSentences(sellerDescription);
  const visiblePoints = showAll ? sellingPoints : sellingPoints.slice(0, 5);
  const keyFeatures = parseBulletPoints(
    extractSection(contextNote, ["Key Features", "Key features", "What you are selling", "Product features"])
  ).slice(0, 6);

  const pricing =
    extractSection(contextNote, ["Pricing", "Price", "Fees", "Cost"]) ??
    extractSection(sellerDescription, ["Pricing", "Price", "Fees", "Cost"]);

  const competitiveSection =
    extractSection(contextNote, ["Competitive Intelligence", "Competitive Advantage", "Competitive advantage", "Why us"]) ??
    extractSection(sellerDescription, ["Competitive", "Advantage", "Why us"]);

  const competitors = parseCompetitors(competitiveSection);
  const hasCompetitive = competitors !== null || competitiveDocs.length > 0;
  const kbCompetitors = competitiveDocs
    .map((d) => parseCompetitors(d.content))
    .filter((c): c is Competitor[] => c !== null)
    .flat();

  return (
    <div className="h-full flex flex-col bg-[#0B0E14] border-r border-white/10 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Header */}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-orange-400 font-semibold mb-1">{isInterview ? "Interview Prep" : "Seller Cheat Sheet"}</p>
          <h3 className="text-sm font-semibold text-white leading-tight">
            {sellerCompany ?? "Your Company"}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">{sellerProduct ?? "Product"}</p>
        </div>

        {/* What you are selling — hidden for interviews */}
        {!isInterview && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
            <Building2 className="w-3.5 h-3.5" />
            What you are selling
          </div>
          {sellingPoints.length === 0 ? (
            <p className="text-xs text-slate-300 leading-relaxed">
              {sellerDescription ?? "No product description available."}
            </p>
          ) : (
            <>
              <ul className="space-y-1.5">
                {visiblePoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                    <span className="w-1 h-1 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                    <span className="leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
              {sellingPoints.length > 5 && (
                <button
                  onClick={() => setShowAll((v) => !v)}
                  className="text-[11px] text-orange-400 hover:text-orange-300 font-medium"
                >
                  {showAll ? "Show less" : `Show ${sellingPoints.length - 5} more`}
                </button>
              )}
            </>
          )}
        </div>
        )}

        {/* Key features — hidden for interviews */}
        {!isInterview && keyFeatures.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              <Target className="w-3.5 h-3.5" />
              Key Features
            </div>
            <ul className="space-y-1.5">
              {keyFeatures.map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                  <span className="w-1 h-1 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                  <span className="leading-relaxed">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Pricing — hidden for interviews */}
        {!isInterview && pricing && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              <DollarSign className="w-3.5 h-3.5" />
              Pricing
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="text-xs text-slate-300 leading-relaxed">{pricing}</p>
            </div>
          </div>
        )}

        {/* Competitive intelligence — hidden for interviews */}
        {!isInterview && hasCompetitive && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              <Trophy className="w-3.5 h-3.5" />
              Competitive Intelligence
            </div>
            <div className="space-y-3">
              {[...(competitors ?? []), ...kbCompetitors].map((competitor, i) => (
                <CompetitorCard key={i} competitor={competitor} />
              ))}
            </div>
            {competitiveSection && !competitors && kbCompetitors.length === 0 && (
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-slate-300 leading-relaxed">{competitiveSection}</p>
              </div>
            )}
          </div>
        )}

        {/* Buyer pain points — hidden for interviews */}
        {!isInterview && buyerPainPoints && buyerPainPoints.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              <AlertCircle className="w-3.5 h-3.5" />
              Buyer Pain Points
            </div>
            <ul className="space-y-1.5">
              {buyerPainPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                  <span className="w-1 h-1 rounded-full bg-red-500 mt-1.5 shrink-0" />
                  <span className="leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Talking to */}
        {(buyerName || buyerRole) && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              <Lightbulb className="w-3.5 h-3.5" />
              {isInterview ? "Interviewer" : "Talking to"}
            </div>
            <p className="text-xs text-slate-300">
              {buyerName}
              {buyerName && buyerRole && ", "}
              {buyerRole}
            </p>
          </div>
        )}

        {/* Call Structure — collapsed reference, hidden for interviews */}
        {!isInterview && callSteps && callSteps.length > 0 && (
          <div className="space-y-2">
            <button
              onClick={() => setShowCallStructure((v) => !v)}
              className="w-full flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-400 font-semibold"
            >
              <div className="flex items-center gap-1.5">
                <Route className="w-3.5 h-3.5" />
                Call Structure
              </div>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showCallStructure ? "rotate-180" : ""}`} />
            </button>
            {showCallStructure && (
              <div className="space-y-1.5">
                {callSteps.map((step, idx) => {
                  const isCompleted = idx < currentStep;
                  const isActive = idx === currentStep;
                  return (
                    <div
                      key={step.id}
                      className={`rounded-lg border p-2 text-xs ${
                        isActive
                          ? "bg-blue-500/10 border-blue-500/30 text-blue-100"
                          : isCompleted
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-100"
                          : "bg-white/5 border-white/10 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                            isCompleted
                              ? "bg-emerald-500 text-white"
                              : isActive
                              ? "bg-blue-500 text-white"
                              : "bg-white/10 text-white/50"
                          }`}
                        >
                          {step.id}
                        </span>
                        <span className={isActive ? "font-medium" : ""}>{step.label}</span>
                      </div>
                      {isActive && <p className="text-[10px] text-blue-200/80 mt-1 leading-tight">{step.hint}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
