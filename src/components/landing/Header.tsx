"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type MouseEvent } from "react";
import { User, LogOut, Menu, X } from "lucide-react";
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
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

  const navLinks = [
    { label: "Product", href: "/#features", id: "features" },
    { label: "How it works", href: "/#process", id: "process" },
    { label: "Use cases", href: "/#usecases", id: "usecases" },
    { label: "FAQ", href: "/#faq", id: "faq" },
  ];

  return (
    <header className="marketing-header">
      <nav className="wrap header-wrap">
        <Link href="/" className="header-logo" onClick={handleTop}>
          <img src="/images/Logo.png" alt="Day1" loading="eager" />
        </Link>

        <div className="header-nav hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.id}
              href={link.href}
              onClick={handleScroll(link.id)}
              className={cn(
                "header-link",
                isActive(`#${link.id}`) && "active"
              )}
            >
              {link.label}
            </a>
          ))}
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

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-xl text-sm font-medium transition-colors hover:bg-[var(--tag)]">
              <Menu className="w-5 h-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] sm:w-72 p-0 rounded-r-2xl bg-[var(--background)]">
              <div className="flex items-center justify-between px-5 h-16 border-b border-[var(--border)]">
                <Link href="/" onClick={handleTop} className="header-logo">
                  <img src="/images/Logo.png" alt="Day1" className="h-8 w-auto" loading="eager" />
                </Link>
              </div>
              <div className="px-5 pt-5 pb-2">
                <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Menu</p>
              </div>
              <nav className="flex flex-col gap-1.5 px-3 pb-32">
                {navLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.href}
                    onClick={(e) => { handleScroll(link.id)(e); setMobileOpen(false); }}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors min-h-[48px] no-underline",
                      isActive(`#${link.id}`)
                        ? "bg-[var(--foreground)] text-[var(--background)] shadow-sm"
                        : "text-[var(--muted-foreground)] hover:bg-[var(--tag)] hover:text-[var(--foreground)]"
                    )}
                  >
                    <span className="w-5 h-5 flex items-center justify-center">
                      {isActive(`#${link.id}`) ? <X className="w-4 h-4" /> : <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                    </span>
                    {link.label}
                  </a>
                ))}
              </nav>
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[var(--border)] bg-[var(--background)]">
                {!loading && (
                  user ? (
                    <div className="space-y-3">
                      <Link
                        href="/profile"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-3 p-3 rounded-xl bg-[var(--tag)] no-underline hover:opacity-80 transition-opacity"
                      >
                        <Avatar className="h-11 w-11 border shrink-0">
                          <AvatarFallback className="text-sm bg-[var(--foreground)] text-[var(--background)]">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-[var(--foreground)] truncate">
                            {user.user_metadata?.full_name || user.email || "User"}
                          </p>
                          {user.email && <p className="text-xs text-[var(--muted-foreground)] truncate">{user.email}</p>}
                        </div>
                      </Link>
                      <Button
                        variant="outline"
                        className="w-full h-11 rounded-xl text-sm font-semibold"
                        onClick={() => { handleLogout(); setMobileOpen(false); }}
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Log out
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Link href="/login" onClick={() => setMobileOpen(false)}>
                        <Button variant="outline" className="w-full h-11 rounded-xl text-sm font-semibold">
                          Log in
                        </Button>
                      </Link>
                      <Link href="/book-demo" onClick={() => setMobileOpen(false)}>
                        <Button className="w-full h-11 rounded-xl text-sm font-semibold">Book a demo</Button>
                      </Link>
                    </div>
                  )
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
