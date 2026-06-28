import Link from "next/link";
import { Button } from "@/components/ui/button";

export function PricingSection() {
  return (
    <section id="pricing" className="max-w-[1100px] mx-auto px-6 lg:px-16 py-16 lg:py-20 text-center">
      <p className="text-[0.7rem] font-semibold tracking-[0.14em] uppercase text-[var(--primary)] mb-4">Contact</p>
      <h2 className="font-serif text-[1.75rem] sm:text-[2.1rem] font-bold tracking-[-0.02em] text-[var(--foreground)] mb-3 leading-[1.2]">
        Let's talk about your team.
      </h2>
      <p className="text-[0.975rem] text-[var(--muted-foreground)] max-w-[520px] leading-[1.75] mx-auto">
        Tell us what you're trying to solve and we'll show you how SalesSim fits. No implementation fees, no long-term commitment required to get started.
      </p>

      <div className="mt-12 bg-[var(--card)] rounded-[10px] border border-[var(--border)] p-8 md:p-12 max-w-[600px] mx-auto">
        <h3 className="text-[1.1rem] font-semibold text-[var(--foreground)] mb-2">Ready to see it in action?</h3>
        <p className="text-[0.85rem] text-[var(--muted-foreground)] leading-[1.65] mb-6">
          Book a 20-minute call with our team. We'll walk through your use case, answer questions, and set up a pilot if it makes sense.
        </p>
        <Link href="/contact">
          <Button className="bg-[var(--primary)] text-white px-7 py-3 rounded-md text-[0.95rem] font-semibold hover:bg-[#c94415] transition-colors">
            Contact sales
          </Button>
        </Link>
      </div>
    </section>
  );
}
