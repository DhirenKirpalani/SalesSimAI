"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export type AppRole = "admin" | "user";

export function useRole() {
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function loadRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      setRole((data?.role as AppRole) || "user");
      setLoading(false);
    }

    loadRole();
  }, []);

  return { role, isAdmin: role === "admin", isUser: role === "user", loading };
}
