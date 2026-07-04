"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { DashboardMockup } from "./DashboardMockup";

export function HeroSection() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data.user);
    });
  }, []);

  return (
    <section className="max-w-[1100px] mx-auto px-6 lg:px-16 py-20 lg:py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
      <div>
        <p className="text-[0.7rem] font-semibold tracking-[0.14em] uppercase text-[var(--primary)] mb-5">
          Conversational AI Platform
        </p>
        <h1 className="font-serif text-[2rem] sm:text-[2.8rem] lg:text-[3.4rem] font-bold leading-[1.1] tracking-[-0.03em] text-[var(--foreground)] mb-6">
          Every conversation your team has is <em className="text-[var(--primary)] not-italic">data.</em> Most companies let it disappear.
        </h1>
        <p className="text-[1.05rem] text-[var(--muted-foreground)] leading-[1.75] mb-8 max-w-[440px]">
          Train before the call. Capture what happens on it. Learn from it at scale. Day1 turns every conversation — practice or live — into a coaching and intelligence asset.
        </p>
        <div className="flex flex-wrap items-center gap-5 mb-4">
          {isLoggedIn ? (
            <Link href="/dashboard">
              <Button className="bg-[var(--primary)] text-white px-7 py-3 rounded-md text-[0.95rem] font-semibold hover:bg-[#c94415] transition-colors">
                Go to dashboard
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/signup">
                <Button className="bg-[var(--primary)] text-white px-7 py-3 rounded-md text-[0.95rem] font-semibold hover:bg-[#c94415] transition-colors">
                  Book a demo
                </Button>
              </Link>
              <a href="#platform" className="text-[0.875rem] font-medium text-[var(--foreground)] no-underline border-b border-[var(--border)] pb-px hover:border-[var(--foreground)] transition-colors">
                See the platform
              </a>
            </>
          )}
        </div>
        <p className="text-[0.78rem] text-[var(--muted-foreground)]">
          Built for fintech revenue teams · Sector expansion in progress
        </p>
      </div>

      <DashboardMockup />
    </section>
  );
}
