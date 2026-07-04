"use client";

import { useState } from "react";

const sectorTabs = [
  { id: "fintech", label: "Fintech" },
  { id: "insurance", label: "Insurance", soon: true },
  { id: "healthcare", label: "Healthcare", soon: true },
  { id: "enterprise", label: "Enterprise SaaS", soon: true },
];

const sectorCards = [
  { label: "Sales roleplay", title: "CFO and compliance objection handling", description: "Practise budget pushback, regulatory risk questions, API security concerns, and multi-stakeholder deal navigation — in the exact language fintech buyers use." },
  { label: "Call intelligence", title: "Weekly summaries from customer calls", description: "Structured summaries surface pricing sensitivity, competitor mentions, and churn signals from your customer conversations — without your team lifting a finger." },
  { label: "Internal operations", title: "Meeting notes built for finance teams", description: "Capture board updates, cross-functional syncs, and compliance reviews. Action items auto-tagged. Decisions documented. Nothing lost between the call and the follow-up." },
  { label: "Customer intelligence", title: "Chatbots that know your product cold", description: "Customer-facing or internal — answer pricing questions, integration FAQs, and onboarding queries from your actual product documentation, not generic AI responses." },
];

export function IndustriesSection() {
  const [activeTab, setActiveTab] = useState("fintech");

  return (
    <section id="sectors" className="bg-[var(--foreground)] py-16 lg:py-20 px-6 lg:px-16">
      <div className="max-w-[1100px] mx-auto">
        <p className="text-[0.7rem] font-semibold tracking-[0.14em] uppercase text-[var(--primary)] mb-3">Industries</p>
        <h2 className="font-serif text-[1.75rem] sm:text-[2.1rem] font-bold tracking-[-0.02em] text-[var(--background)] mb-3 leading-[1.2]">
          Built for your sector's conversations.
        </h2>
        <p className="text-[0.95rem] text-[#8A99B8] max-w-[480px] leading-[1.75] mb-10">
          Every industry has its own objections, compliance requirements, and buyer dynamics. Day1 is configured for the conversations your team actually has.
        </p>

        <div className="flex overflow-x-auto border-b border-[#2A3650] mb-10 pb-px">
          {sectorTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`text-[0.8rem] font-semibold px-6 py-3 border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? "text-[var(--background)] border-b-[var(--primary)]" : "text-[#6B7A99] border-b-transparent"}`}
            >
              {tab.label}
              {tab.soon && <span className="text-[0.65rem] ml-1 opacity-60">Soon</span>}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#2A3650] border border-[#2A3650] rounded-[10px] overflow-hidden">
          {sectorCards.map((c) => (
            <div key={c.title} className="bg-[#131929] p-7">
              <p className="text-[0.68rem] font-semibold tracking-[0.1em] uppercase text-[var(--primary)] mb-2">{c.label}</p>
              <h4 className="text-[0.925rem] font-semibold text-[var(--background)] mb-2">{c.title}</h4>
              <p className="text-[0.8rem] text-[#8A99B8] leading-[1.65]">{c.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
