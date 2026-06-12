"use client";

import { Button } from "@/components/ui/button";
import { useThemeStore } from "@/stores/useThemeStore";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle({ className }: { className?: string }) {
  const { darkMode, toggleDarkMode } = useThemeStore();

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleDarkMode}
      className={className}
      aria-label="Toggle theme"
    >
      {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
