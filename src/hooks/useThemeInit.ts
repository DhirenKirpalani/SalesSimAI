"use client";

import { useEffect, useState } from "react";
import { useThemeStore } from "@/stores/useThemeStore";

export function useThemeInit() {
  const { darkMode, setDarkMode } = useThemeStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("sales-sim-theme");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (typeof parsed.state?.darkMode === "boolean") {
          setDarkMode(parsed.state.darkMode);
        }
      } catch {
        // ignore
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode, mounted]);
}
