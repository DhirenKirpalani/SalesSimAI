"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Library,
  Mic2,
  BarChart3,
  User,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Plug,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useRole } from "@/hooks/useRole";
const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Scenarios", href: "/scenarios", icon: Library },
  { label: "Simulations", href: "/simulations", icon: Mic2 },
  { label: "Analysis", href: "/analysis", icon: BarChart3 },
  { label: "Knowledge Base", href: "/company-knowledge", icon: BookOpen },
  { label: "Workspace", href: "/workspace", icon: Building2 },
  { label: "Profile", href: "/profile", icon: User },
  { label: "Admin", href: "/admin", icon: ShieldCheck, adminOnly: true },
  { label: "Integration", href: "/integrations", icon: Plug },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { isAdmin } = useRole();

  const visibleNavItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r bg-card transition-all duration-300 ease-in-out sticky top-16 h-[calc(100vh-4rem)] z-40",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {visibleNavItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className={cn("w-4 h-4 shrink-0", active && "text-primary")} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-2">
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex items-center justify-center w-full py-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!collapsed && <span className="ml-2 text-sm">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
