"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function AboutCta() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data.user);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 min-h-[44px]">
        <div className="h-10 w-36 rounded-md bg-muted animate-pulse" />
        <div className="h-10 w-28 rounded-md bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
      <Link href={isLoggedIn ? "/dashboard" : "/signup"}>
        <Button className="rounded-md gap-2 px-6 py-3 text-sm font-semibold">
          {isLoggedIn ? "Go to dashboard" : "Start practicing"}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </Link>
      <Link href="/contact">
        <Button variant="outline" className="rounded-md px-6 py-3 text-sm font-semibold">
          Talk to us
        </Button>
      </Link>
    </div>
  );
}
