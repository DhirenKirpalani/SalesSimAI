"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type MouseEvent, useEffect } from "react";
import { User, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type HeaderProps = {
  isActive: (href: string) => boolean;
  scrollToSection: (id: string) => (e: MouseEvent<HTMLAnchorElement>) => void;
  scrollToTop: (e: MouseEvent<HTMLAnchorElement>) => void;
  user: SupabaseUser | null;
  loading: boolean;
};

export function Header({ isActive, scrollToSection, scrollToTop, user, loading }: HeaderProps) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = user
    ? (user.user_metadata?.full_name || user.email || "U")
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "U";

  useEffect(() => {
    if (mobileOpen) document.body.classList.add("menu-open");
    else document.body.classList.remove("menu-open");
    return () => document.body.classList.remove("menu-open");
  }, [mobileOpen]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const handleScroll = (id: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    setMobileOpen(false);
    scrollToSection(id)(e);
  };

  const handleTop = (e: MouseEvent<HTMLAnchorElement>) => {
    setMobileOpen(false);
    scrollToTop(e);
  };

  return (
    <header className="marketing-header">
      <nav className="wrap header-wrap">
        <Link href="/" className="header-logo" onClick={handleTop}>
          <img src="/images/Logo.png" alt="Day1" />
        </Link>

        <div className={`header-nav ${mobileOpen ? "open" : ""}`}>
          <a href="/" onClick={handleScroll("features")} className={`header-link ${isActive("#features") ? "active" : ""}`}>Product</a>

          <a href="/" onClick={handleScroll("process")} className={`header-link ${isActive("#process") ? "active" : ""}`}>How it works</a>

          <a href="/" onClick={handleScroll("usecases")} className={`header-link ${isActive("#usecases") ? "active" : ""}`}>Use cases</a>

          {/* <a href="/" onClick={handleScroll("insights")} className={`header-link ${isActive("#insights") ? "active" : ""}`}>Resources</a> */}

          <a href="/" onClick={handleScroll("faq")} className={`header-link ${isActive("#faq") ? "active" : ""}`}>FAQ</a>

          {!loading && (
            user ? (
              <div className="mobile-profile-section">
                <div className="mobile-profile-actions">
                  <Link className="mobile-profile-icon" href="/profile" onClick={() => setMobileOpen(false)} aria-label="Profile">
                    <Avatar className="h-10 w-10 border">
                      <AvatarFallback className="text-sm bg-primary/10 text-primary">{initials}</AvatarFallback>
                    </Avatar>
                  </Link>
                  <button
                    className="mobile-profile-icon"
                    onClick={() => { setMobileOpen(false); handleLogout(); }}
                    aria-label="Log out"
                  >
                    <LogOut size={20} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="mobile-guest-actions">
                <Link className="header-link mobile-only" href="/login" onClick={() => setMobileOpen(false)}>
                  Login
                </Link>
                <Link className="btn btn-primary mobile-only" href="/book-demo" onClick={() => setMobileOpen(false)}>
                  Book a demo
                </Link>
              </div>
            )
          )}
        </div>

        <div className="header-right">
          {!loading && (
            user ? (
              <div className="header-profile-desktop">
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Avatar className="h-8 w-8 border cursor-pointer">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" sideOffset={8}>
                    <DropdownMenuItem onClick={() => router.push("/profile")}>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <>
                <Link className="header-login" href="/login">Login</Link>
                <Link className="btn btn-primary btn-sm" href="/book-demo">Book a demo</Link>
              </>
            )
          )}
          <button
            className={`header-burger ${mobileOpen ? "open" : ""}`}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </nav>

      <div className={`header-backdrop ${mobileOpen ? "show" : ""}`} onClick={() => setMobileOpen(false)}></div>
    </header>
  );
}
