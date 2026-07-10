import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function PolicyCard({
  id,
  number,
  title,
  icon: Icon,
  highlighted,
  children,
}: {
  id?: string;
  number: string;
  title: string;
  icon: LucideIcon;
  highlighted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        "rounded-2xl border p-5 sm:p-6 lg:p-8 shadow-sm scroll-mt-28 transition-shadow hover:shadow-md",
        highlighted
          ? "border-[#FF6B45]/30 bg-gradient-to-b from-[#FFF8F3] to-white"
          : "border-[#E7E4DF] bg-white"
      )}
    >
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 sm:w-7 sm:h-7 rounded-lg bg-[#F6EFE1] text-[#FF6B45] flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-[11px] sm:text-xs font-bold text-[#FF6B45] uppercase tracking-wider">
            Section {number}
          </span>
        </div>
        <h2
          className="text-lg sm:text-xl lg:text-2xl font-bold text-[#1B1A1E]"
          style={{ fontFamily: "Poppins, sans-serif" }}
        >
          {title}
        </h2>
      </div>
      <div className="text-[#68646C] text-sm sm:text-base">{children}</div>
    </section>
  );
}

export function BulletList({
  items,
  columns = 1,
}: {
  items: string[];
  columns?: 1 | 2;
}) {
  return (
    <ul
      className={cn(
        "grid gap-2 mb-4",
        columns === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
      )}
    >
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2 text-[#68646C]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B45] mt-2 shrink-0" />
          <span className="leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}
