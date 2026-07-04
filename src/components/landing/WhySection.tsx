"use client";

const whyCards = [
  { icon: "▷", title: "Practise", description: "AI roleplay built from your product, your ICP, and your real objections. Reps get confident before the call — not after the debrief." },
  { icon: "≡", title: "Capture", description: "Every conversation — customer call, internal meeting, support chat — captured, structured, and summarised. Nothing falls through the cracks." },
  { icon: "◎", title: "Automate", description: "Turn your captured conversations into live knowledge — chatbots, wikis, and FAQs that answer from your actual content, always up to date." },
];

export function WhySection() {
  return (
    <section className="max-w-[1100px] mx-auto px-6 lg:px-16 py-16 lg:py-20">
      <p className="text-[0.7rem] font-semibold tracking-[0.14em] uppercase text-[var(--primary)] mb-4">Why Day1</p>
      <h2 className="font-serif text-[1.75rem] sm:text-[2.1rem] font-bold tracking-[-0.02em] text-[var(--foreground)] mb-3 leading-[1.2]">
        Prospective and retrospective. In one place.
      </h2>
      <p className="text-[0.975rem] text-[var(--muted-foreground)] max-w-[520px] leading-[1.75]">
        Most tools pick a side. Gong and Attention tell you what went wrong after the deal. Training platforms help you practise before it. We do both — grounded in your own content.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
        {whyCards.map((c) => (
          <div key={c.title} className="bg-[var(--card)] rounded-[10px] border border-[var(--border)] p-7">
            <div className="text-[1.25rem] mb-4">{c.icon}</div>
            <h3 className="text-[0.95rem] font-semibold text-[var(--foreground)] mb-1.5">{c.title}</h3>
            <p className="text-[0.825rem] text-[var(--muted-foreground)] leading-[1.65]">{c.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
