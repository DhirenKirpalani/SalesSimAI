"use client";

import { Building2, Target, DollarSign, Trophy, AlertCircle, Lightbulb } from "lucide-react";

interface VoiceCallSidebarProps {
  sellerCompany?: string | null;
  sellerProduct?: string | null;
  sellerDescription?: string | null;
  contextNote?: string | null;
  buyerName?: string | null;
  buyerRole?: string | null;
  buyerPainPoints?: string[];
}

function parseBulletPoints(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\n|•|\-|\*/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length < 300);
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

export function VoiceCallSidebar({
  sellerCompany,
  sellerProduct,
  sellerDescription,
  contextNote,
  buyerName,
  buyerRole,
  buyerPainPoints,
}: VoiceCallSidebarProps) {
  const keyFeatures = parseBulletPoints(
    extractSection(contextNote, ["Key Features", "Key features", "What you are selling", "Product features"]) ??
      sellerDescription
  ).slice(0, 6);

  const pricing =
    extractSection(contextNote, ["Pricing", "Price", "Fees", "Cost"]) ??
    extractSection(sellerDescription, ["Pricing", "Price", "Fees", "Cost"]);

  const competitive =
    extractSection(contextNote, ["Competitive Intelligence", "Competitive Advantage", "Competitive advantage", "Why us"]) ??
    extractSection(sellerDescription, ["Competitive", "Advantage", "Why us"]);

  return (
    <div className="h-full flex flex-col bg-[#0B0E14] border-r border-white/10 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Header */}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-orange-400 font-semibold mb-1">Seller Cheat Sheet</p>
          <h3 className="text-sm font-semibold text-white leading-tight">
            {sellerCompany ?? "Your Company"}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">{sellerProduct ?? "Product"}</p>
        </div>

        {/* What you are selling */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
            <Building2 className="w-3.5 h-3.5" />
            What you are selling
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {sellerDescription ?? "No product description available."}
          </p>
        </div>

        {/* Key features */}
        {keyFeatures.length > 0 && (
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

        {/* Pricing */}
        {pricing && (
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

        {/* Competitive intelligence */}
        {competitive && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              <Trophy className="w-3.5 h-3.5" />
              Competitive Edge
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="text-xs text-slate-300 leading-relaxed">{competitive}</p>
            </div>
          </div>
        )}

        {/* Buyer pain points */}
        {buyerPainPoints && buyerPainPoints.length > 0 && (
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
              Talking to
            </div>
            <p className="text-xs text-slate-300">
              {buyerName}
              {buyerName && buyerRole && ", "}
              {buyerRole}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
