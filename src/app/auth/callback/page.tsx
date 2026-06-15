"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const hash = window.location.hash;
    const search = window.location.search;
    const type = new URLSearchParams(search).get("type");

    if (hash || search.includes("code=")) {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          router.push("/dashboard");
        } else if (type === "signup" || type === "email_change") {
          router.push("/login?confirmed=true");
        } else {
          router.push("/login?error=callback");
        }
      });
    } else {
      router.push("/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-muted-foreground">Completing sign in...</p>
    </div>
  );
}
