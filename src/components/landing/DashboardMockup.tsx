"use client";

const sessions = [
  { initials: "JL", name: "James Lee — CFO Objection", meta: "Fintech SMB · 18 min · Today", score: 91 },
  { initials: "SR", name: "Sara Ramos — Compliance deep dive", meta: "Fintech Enterprise · 24 min · Today", score: 73 },
  { initials: "MT", name: "Marcus Tan — Pricing negotiation", meta: "Fintech Mid-market · 11 min · Yesterday", score: 68 },
];

const metrics = [
  { value: "12", label: "Sessions run" },
  { value: "84", label: "Avg. score" },
  { value: "3", label: "Need coaching" },
];

const tabs = ["Team readiness", "Call summaries", "Insights"];

export function DashboardMockup() {
  return (
    <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] overflow-hidden shadow-[0_2px_20px_rgba(11,15,26,0.07)] max-w-full">
      <div className="bg-[var(--foreground)] px-5 py-3 flex items-center justify-between">
        <span className="font-mono text-[0.7rem] text-[#6B7A99]">SalesSim / dashboard</span>
        <div className="flex gap-1.5">
          <span className="w-[9px] h-[9px] rounded-full bg-[#FF5F57]" />
          <span className="w-[9px] h-[9px] rounded-full bg-[#FFBD2E]" />
          <span className="w-[9px] h-[9px] rounded-full bg-[#28C840]" />
        </div>
      </div>
      <div className="grid grid-cols-[52px_1fr]">
        <div className="bg-[#F9F7F4] border-r border-[var(--border)] p-2 flex flex-col gap-1">
          <div className="w-9 h-9 rounded-lg bg-[var(--primary)] text-white flex items-center justify-center text-[0.8rem] cursor-pointer">⊞</div>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[0.8rem] text-[var(--muted-foreground)] hover:bg-[var(--tag)] cursor-pointer transition-colors">▷</div>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[0.8rem] text-[var(--muted-foreground)] hover:bg-[var(--tag)] cursor-pointer transition-colors">≡</div>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[0.8rem] text-[var(--muted-foreground)] hover:bg-[var(--tag)] cursor-pointer transition-colors">◎</div>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[0.8rem] text-[var(--muted-foreground)] hover:bg-[var(--tag)] cursor-pointer transition-colors mt-auto">⚙</div>
        </div>
        <div className="p-5">
          <div className="flex overflow-x-auto border-b border-[var(--border)] mb-4">
            {tabs.map((t, i) => (
              <div
                key={t}
                className={`text-[0.72rem] font-semibold px-3.5 py-2 border-b-2 cursor-pointer transition-colors ${
                  i === 0 ? "text-[var(--primary)] border-b-[var(--primary)]" : "text-[var(--muted-foreground)] border-b-transparent"
                }`}
              >
                {t}
              </div>
            ))}
          </div>
          <p className="text-[0.65rem] font-semibold tracking-[0.1em] uppercase text-[var(--muted-foreground)] mb-3">This week</p>
          <div className="grid grid-cols-3 gap-2.5 mb-4">
            {metrics.map((m) => (
              <div key={m.label} className="bg-[var(--tag)] rounded-lg p-3 text-center">
                <span className="font-mono text-[1.25rem] font-bold text-[var(--foreground)] block">{m.value}</span>
                <span className="text-[0.65rem] text-[var(--muted-foreground)]">{m.label}</span>
              </div>
            ))}
          </div>
          <p className="text-[0.65rem] font-semibold tracking-[0.1em] uppercase text-[var(--muted-foreground)] mb-3">Recent sessions</p>
          <div className="flex flex-col gap-2">
            {sessions.map((s) => (
              <div key={s.name} className="bg-[var(--tag)] rounded-lg px-3.5 py-2.5 flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-[var(--navy)] flex items-center justify-center text-[0.6rem] font-semibold text-white shrink-0">{s.initials}</div>
                <div className="flex-1 min-w-0">
                  <span className="text-[0.75rem] font-semibold text-[var(--foreground)] block truncate">{s.name}</span>
                  <span className="text-[0.65rem] text-[var(--muted-foreground)]">{s.meta}</span>
                </div>
                <span className="font-mono text-[0.8rem] font-bold text-[var(--primary)] shrink-0">{s.score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
