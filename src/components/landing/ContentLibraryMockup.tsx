"use client";

const files = [
  { type: "pdf", typeClass: "bg-[#FDECEA] text-[#C0392B] border-[#F5C6BF]", name: "Product Overview — SalesSim Platform Q2 2026", meta: "Uploaded 2 days ago · Used in 4 modules", status: "active" },
  { type: "doc", typeClass: "bg-[#EBF3FE] text-[#1A56A0] border-[#B8D4F7]", name: "CFO Objection Handling Playbook", meta: "Uploaded 5 days ago · Used in roleplay + chatbot", status: "active" },
  { type: "ppt", typeClass: "bg-[#FEF0EE] text-[#C94415] border-[#F9C4BB]", name: "Competitor Battlecard — Airwallex 2026", meta: "Uploaded 1 week ago · Used in roleplay", status: "active" },
  { type: "mp4", typeClass: "bg-[#EEF7F2] text-[#1A6B3C] border-[#B3D9C3]", name: "Top performer call recording — Q1 Enterprise close", meta: "Uploaded today · Processing", status: "new" },
];

export function ContentLibraryMockup() {
  return (
    <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] overflow-hidden">
      <div className="bg-[var(--tag)] px-5 py-3 flex items-center justify-between border-b border-[var(--border)]">
        <span className="text-[0.75rem] font-semibold text-[var(--muted-foreground)]">Content library</span>
        <button className="bg-[var(--primary)] text-white text-[0.7rem] font-semibold px-3 py-1 rounded cursor-pointer">+ Add files</button>
      </div>
      <div className="px-5 py-3.5 flex flex-col gap-2">
        {files.map((f) => (
          <div key={f.name} className="flex items-center gap-3 px-3.5 py-2.5 rounded-md bg-[var(--tag)]">
            <span className={`font-mono text-[0.6rem] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${f.typeClass}`}>{f.type}</span>
            <div className="flex-1 min-w-0">
              <span className="text-[0.78rem] font-medium text-[var(--foreground)] block truncate">{f.name}</span>
              <span className="text-[0.65rem] text-[var(--muted-foreground)]">{f.meta}</span>
            </div>
            <span className={`text-[0.65rem] font-semibold px-2 py-0.5 rounded shrink-0 ${f.status === "active" ? "bg-[#EEF7F2] text-[var(--green)]" : "bg-[#FEF0EE] text-[var(--primary)]"}`}>
              {f.status === "active" ? "Active" : "Syncing"}
            </span>
          </div>
        ))}
      </div>
      <div className="px-5 py-3 border-t border-[var(--border)] bg-[#FAFAF8] flex items-center gap-2.5">
        <span className="w-[7px] h-[7px] rounded-full bg-[var(--green)] shrink-0" />
        <span className="text-[0.75rem] text-[var(--muted-foreground)]">
          All modules in sync · Last updated <strong className="text-[var(--green)] font-semibold">2 min ago</strong>
        </span>
      </div>
    </div>
  );
}
