"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export interface ThemeColors {
  primary: string;
  background: string;
  foreground: string;
  surface: string;
}

export const DEFAULT_THEME_COLORS: ThemeColors = {
  primary: "#F76918",
  background: "#F6EFE1",
  foreground: "#3D1805",
  surface: "#FFFFFF",
};

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.replace("#", "").match(/.{1,2}/g);
  if (!m || m.length < 3) return null;
  return [parseInt(m[0], 16), parseInt(m[1], 16), parseInt(m[2], 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0")).join("");
}

function lighten(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex(
    Math.round(rgb[0] + (255 - rgb[0]) * amount),
    Math.round(rgb[1] + (255 - rgb[1]) * amount),
    Math.round(rgb[2] + (255 - rgb[2]) * amount),
  );
}

function darken(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex(
    Math.round(rgb[0] * (1 - amount)),
    Math.round(rgb[1] * (1 - amount)),
    Math.round(rgb[2] * (1 - amount)),
  );
}

function mixWithOpacity(hex: string, opacity: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${opacity})`;
}

export function applyThemeColors(colors: Partial<ThemeColors>) {
  const root = document.documentElement;
  const isDark = root.classList.contains("dark");

  const c = { ...DEFAULT_THEME_COLORS, ...colors };

  // 1. Primary → buttons, rings, accents, charts, sidebar active
  root.style.setProperty("--primary", c.primary);
  root.style.setProperty("--primary-foreground", "#FFFFFF");
  root.style.setProperty("--ring", c.primary);
  root.style.setProperty("--sidebar-ring", c.primary);
  root.style.setProperty("--sidebar-primary", c.primary);
  root.style.setProperty("--sidebar-primary-foreground", "#FFFFFF");
  root.style.setProperty("--chart-1", c.primary);
  root.style.setProperty("--chart-2", lighten(c.primary, 0.2));
  root.style.setProperty("--chart-3", lighten(c.primary, 0.4));
  root.style.setProperty("--chart-4", lighten(c.primary, 0.6));
  root.style.setProperty("--chart-5", lighten(c.primary, 0.8));

  // 2. Background → page bg, secondary, muted, accent
  root.style.setProperty("--background", c.background);
  root.style.setProperty("--secondary", c.background);
  root.style.setProperty("--secondary-foreground", c.foreground);
  const mutedBg = isDark ? darken(c.background, 0.15) : darken(c.background, 0.04);
  root.style.setProperty("--muted", mutedBg);
  root.style.setProperty("--accent", mutedBg);
  root.style.setProperty("--accent-foreground", c.foreground);
  root.style.setProperty("--tag", mutedBg);

  // 3. Foreground → all text colors
  root.style.setProperty("--foreground", c.foreground);
  root.style.setProperty("--card-foreground", c.foreground);
  root.style.setProperty("--popover-foreground", c.foreground);
  root.style.setProperty("--sidebar-foreground", c.foreground);
  root.style.setProperty("--sidebar-accent-foreground", c.foreground);
  root.style.setProperty("--muted-foreground", isDark ? lighten(c.foreground, 0.4) : darken(c.foreground, 0.35));

  // 4. Surface → cards, popovers, sidebar bg
  root.style.setProperty("--card", c.surface);
  root.style.setProperty("--popover", c.surface);
  root.style.setProperty("--sidebar", c.surface);

  // Derived borders from foreground/background
  root.style.setProperty("--border", isDark ? mixWithOpacity(c.foreground, 0.12) : darken(c.background, 0.12));
  root.style.setProperty("--input", isDark ? mixWithOpacity(c.foreground, 0.15) : mutedBg);
  root.style.setProperty("--sidebar-border", isDark ? mixWithOpacity(c.foreground, 0.12) : darken(c.background, 0.12));
  root.style.setProperty("--sidebar-accent", mutedBg);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let cancelled = false;

    async function loadTheme() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("organization_id")
          .eq("id", user.id)
          .single();

        const orgId = profile?.organization_id;
        if (!orgId || cancelled) return;

        const { data: org } = await supabase
          .from("organizations")
          .select("theme_colors, theme_color")
          .eq("id", orgId)
          .single();

        if (cancelled || !org) return;

        if (org.theme_colors) {
          applyThemeColors(org.theme_colors as Partial<ThemeColors>);
        } else if (org.theme_color) {
          applyThemeColors({ primary: org.theme_color });
        }
      } catch {
        // silently fail — default theme will be used
      }
    }

    loadTheme();
    return () => { cancelled = true; };
  }, []);

  return <>{children}</>;
}
