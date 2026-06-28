"use client";

import { useState } from "react";
import { ContentLibraryMockup } from "./ContentLibraryMockup";

const steps = [
  { num: "01", title: "Upload your content", description: "Product docs, playbooks, pricing sheets, call recordings, battlecards. Drop them in. The platform learns your business — not a generic version of it." },
  { num: "02", title: "Configure your use cases", description: "Pick the modules that fit each team. Sales reps get roleplay. Leaders get summaries. Ops gets meeting notes. Customer teams get a chatbot. Same content layer, different surfaces." },
  { num: "03", title: "Teams work from it daily", description: "Reps practise on demand. Leaders read weekly summaries. Meetings are captured automatically. Customers get answers from your actual knowledge base." },
  { num: "04", title: "The platform gets smarter", description: "Every session, summary, and conversation feeds back into the system. Patterns surface. Coaching gaps become visible. The library updates as your business evolves." },
];

export function ShowcaseSection() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section id="how" className="max-w-[1100px] mx-auto px-6 lg:px-16 py-16 lg:py-20">
      <p className="text-[0.7rem] font-semibold tracking-[0.14em] uppercase text-[var(--primary)] mb-4">How it works</p>
      <h2 className="font-serif text-[1.75rem] sm:text-[2.1rem] font-bold tracking-[-0.02em] text-[var(--foreground)] mb-3 leading-[1.2]">
        Your content in. Better conversations out.
      </h2>
      <p className="text-[0.975rem] text-[var(--muted-foreground)] max-w-[520px] leading-[1.75]">
        The platform is only as good as what you put into it. That's the point — everything is grounded in your business, not a generic template.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start mt-12">
        <div className="flex flex-col gap-7">
          {steps.map((step, i) => (
            <div
              key={step.num}
              onClick={() => setActiveStep(i)}
              className={`p-4 rounded-lg border border-transparent cursor-pointer transition-all ${activeStep === i ? "bg-[var(--card)] border-[var(--border)]" : "hover:bg-[var(--card)] hover:border-[var(--border)]"}`}
            >
              <p className="font-mono text-[0.7rem] text-[var(--primary)] font-medium mb-1.5">{step.num}</p>
              <h4 className="text-[0.925rem] font-semibold text-[var(--foreground)] mb-1">{step.title}</h4>
              <p className="text-[0.825rem] text-[var(--muted-foreground)] leading-[1.6]">{step.description}</p>
            </div>
          ))}
        </div>
        <ContentLibraryMockup />
      </div>
    </section>
  );
}
