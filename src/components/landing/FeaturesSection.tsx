"use client";

import { useState } from "react";

const personaCards = [
  {
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    label: "Sales reps",
    title: "Practise the call before it's real",
    description: "AI roleplay against buyer archetypes built from your product and your ICP. Fail safely. Get feedback. Walk into the call ready.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    label: "Sales leaders",
    title: "Know what's happening across every deal",
    description: "AI note taker pulls structured summaries from customer calls — weekly. Spot themes, track objections, coach from evidence not instinct.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    label: "Operations",
    title: "Never lose what was decided in a meeting",
    description: "Internal meeting note taker captures decisions, action items, and context. Searchable. Summarised. Delivered to whoever needs it.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    label: "Customer teams",
    title: "Answer faster, escalate less",
    description: "Smarter chatbots and internal wikis grounded in your actual content — not generic AI. Customer-facing or internal, the answers are yours.",
  },
];

export function FeaturesSection() {
  const [activePersona, setActivePersona] = useState(0);

  return (
    <section id="platform" className="max-w-[1100px] mx-auto px-6 lg:px-16 py-16 lg:py-20">
      <p className="text-[0.7rem] font-semibold tracking-[0.14em] uppercase text-[var(--primary)] mb-4">The platform</p>
      <h2 className="font-serif text-[1.75rem] sm:text-[2.1rem] font-bold tracking-[-0.02em] text-[var(--foreground)] mb-3 leading-[1.2]">
        One platform. Every conversation that matters.
      </h2>
      <p className="text-[0.975rem] text-[var(--muted-foreground)] max-w-[520px] leading-[1.75]">
        Different teams have different priorities. SalesSim gives each persona the tool that fits their job — all pulling from the same conversation layer underneath.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--border)] border border-[var(--border)] rounded-[10px] overflow-hidden mt-12">
        {personaCards.map((card, i) => (
          <div
            key={card.title}
            onClick={() => setActivePersona(i)}
            className={`bg-[var(--card)] p-7 cursor-pointer transition-colors relative ${activePersona === i ? "bg-[#FFF9F6]" : "hover:bg-[#FFF9F6]"}`}
          >
            {activePersona === i && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[var(--primary)]" />}
            <div className="w-10 h-10 rounded-[10px] bg-[var(--tag)] flex items-center justify-center mb-5 text-[var(--foreground)]">
              {card.icon}
            </div>
            <p className="text-[0.68rem] font-semibold tracking-[0.1em] uppercase text-[var(--primary)] mb-1.5">{card.label}</p>
            <p className="text-[0.95rem] font-semibold text-[var(--foreground)] mb-2 leading-[1.3]">{card.title}</p>
            <p className="text-[0.8rem] text-[var(--muted-foreground)] leading-[1.6]">{card.description}</p>
            <a href="#how" className={`text-[0.78rem] font-semibold text-[var(--primary)] no-underline mt-4 inline-block border-b border-transparent transition-colors ${activePersona === i ? "border-b-[var(--primary)]" : ""}`}>
              Learn more →
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
