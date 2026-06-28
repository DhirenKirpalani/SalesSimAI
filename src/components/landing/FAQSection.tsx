"use client";

import { useState } from "react";

const faqs = [
  { q: "Do we have to use all four modules at once?", a: "No. Most teams start with one module — usually roleplay or call summaries — and add others as they see value. The platform is modular. You pick what fits your team today." },
  { q: "How does the content library work?", a: "Upload any file — PDF, DOCX, PPTX, MP4, or plain text. Every module draws from the same library, so when you update a document, all modules reflect it automatically. New product? Upload the brief and your roleplay, chatbot, and wiki are updated the same day." },
  { q: "How realistic is the AI roleplay?", a: "The buyer persona is built from what you upload — your ICP, your objection patterns, your product context. The AI isn't pulling from a generic database. The more detail you add, the more realistic the simulation. You can also upload recordings of real customer calls to train the persona further." },
  { q: "What makes the call summaries useful vs. just transcripts?", a: "Transcripts are noise. Summaries surface what matters: objections raised, decisions made, next steps agreed, competitor mentions, and sentiment signals. Weekly digests land in your inbox so you don't have to log in to stay informed." },
  { q: "How long does setup take?", a: "Most teams run their first session within an hour of signing up. You need one content file, one buyer persona, and one user invite. That's it to start. Depth builds over time as you add content and configure more modules." },
  { q: "Is our content secure?", a: "Your documents are encrypted at rest and in transit. They are never used to train shared models or shared between tenants. Enterprise plans include data residency and on-premise options. Security documentation is available on request." },
];

export function FAQSection() {
  const [openFaqs, setOpenFaqs] = useState<Set<number>>(new Set());

  const toggleFaq = (i: number) => {
    const next = new Set(openFaqs);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setOpenFaqs(next);
  };

  return (
    <section className="max-w-[1100px] mx-auto px-6 lg:px-16 py-16 lg:py-20">
      <p className="text-[0.7rem] font-semibold tracking-[0.14em] uppercase text-[var(--primary)] mb-4">FAQ</p>
      <h2 className="font-serif text-[1.75rem] sm:text-[2.1rem] font-bold tracking-[-0.02em] text-[var(--foreground)] mb-3 leading-[1.2]">
        Common questions
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-10">
        {faqs.map((faq, i) => {
          const open = openFaqs.has(i);
          return (
            <div key={faq.q} onClick={() => toggleFaq(i)} className="bg-[var(--card)] rounded-lg border border-[var(--border)] px-5 py-5 cursor-pointer">
              <div className="flex justify-between items-start gap-4">
                <span className="text-[0.875rem] font-semibold text-[var(--foreground)] leading-[1.4]">{faq.q}</span>
                <div className={`w-[14px] h-[14px] rounded-full border-[1.5px] flex items-center justify-center text-[0.7rem] shrink-0 mt-0.5 transition-colors ${open ? "bg-[var(--primary)] border-[var(--primary)] text-white" : "border-[var(--muted-foreground)] text-[var(--muted-foreground)]"}`}>
                  +
                </div>
              </div>
              <div className={`text-[0.8rem] text-[var(--muted-foreground)] leading-[1.7] mt-3 ${open ? "block" : "hidden"}`}>
                {faq.a}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
