"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  Bell,
  Menu,
  X,
  Zap,
  LayoutDashboard,
  Library,
  Mic2,
  BarChart3,
  User,
  ShieldCheck,
  Moon,
  Sun,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { useThemeStore } from "@/stores/useThemeStore";

const mobileNavItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Scenarios", href: "/scenarios", icon: Library },
  { label: "Simulations", href: "/simulation", icon: Mic2 },
  { label: "Analysis", href: "/analysis", icon: BarChart3 },
  { label: "Profile", href: "/profile", icon: User },
  { label: "Admin", href: "/admin", icon: ShieldCheck },
];

export function TopNavbar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { darkMode, toggleDarkMode } = useThemeStore();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card/80 backdrop-blur px-4 lg:px-6">
      <div className="md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger className="inline-flex items-center justify-center h-9 w-9 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground">
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex items-center gap-2 px-4 h-16 border-b">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
                <Zap className="w-4 h-4" />
              </div>
              <span className="font-semibold text-sm tracking-tight">SalesSim AI</span>
            </div>
            <nav className="flex flex-col gap-1 p-3">
              {mobileNavItems.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex-1" />

      <div className={cn("flex items-center gap-2 transition-all", searchOpen ? "flex-1" : "w-auto")}>
        {searchOpen ? (
          <div className="flex items-center gap-2 flex-1">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search scenarios, users, or sessions..."
              className="h-9 flex-1"
              onBlur={() => setSearchOpen(false)}
            />
            <Button variant="ghost" size="icon" onClick={() => setSearchOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)} className="hidden sm:flex">
            <Search className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Button variant="ghost" size="icon" onClick={toggleDarkMode} className="hidden sm:flex">
        {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>

      <Button variant="ghost" size="icon" className="relative">
        <Bell className="h-4 w-4" />
        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
      </Button>

      <Avatar className="h-8 w-8 border">
        <AvatarFallback className="text-xs bg-primary/10 text-primary">AM</AvatarFallback>
      </Avatar>
    </header>
  );
}
