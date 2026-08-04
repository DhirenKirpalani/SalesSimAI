"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu, X, User, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/layout/Logo";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Platform", href: "/#platform" },
  { label: "How it works", href: "/#how" },
  { label: "Industries", href: "/#sectors" },
  { label: "Pricing", href: "/#pricing" },
];

function scrollToSection(id: string) {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: "smooth" });
  }
}

function handleNavClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
  if (typeof window !== "undefined" && window.location.pathname === "/") {
    e.preventDefault();
    const id = href.replace("/#", "");
    scrollToSection(id);
  }
}

function LogoWithScroll() {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (typeof window !== "undefined" && window.location.pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return <Logo onClick={handleClick} />;
}

export function LandingNavbar() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [initials, setInitials] = useState("U");
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [activeSection, setActiveSection] = useState<string>("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      setIsLoggedIn(!!user);
      if (user) {
        const name = (user.user_metadata?.full_name as string) || user.email || "U";
        const email = user.email || "";
        const letters = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
        setInitials(letters);
        setUserName(name);
        setUserEmail(email);
      }
    });
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  useEffect(() => {
    const sectionIds = navLinks.map((link) => link.href.replace("/#", ""));

    const handleScroll = () => {
      const scrollPosition = window.scrollY + 120; // navbar offset
      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const element = document.getElementById(sectionIds[i]);
        if (element && element.offsetTop <= scrollPosition) {
          setActiveSection(sectionIds[i]);
          return;
        }
      }
      setActiveSection("");
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className="sticky top-0 z-50 bg-[var(--background)] border-b border-[var(--border)]">
      <div className="w-full px-6 lg:px-16 py-5 flex md:grid md:grid-cols-[1fr_auto_1fr] items-center justify-between md:justify-normal">
        <LogoWithScroll />

        <ul className="hidden md:flex md:justify-center gap-8 list-none">
          {navLinks.map((link) => {
            const isActive = activeSection && link.href === `/#${activeSection}`;
            return (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className={`text-[0.875rem] font-medium no-underline transition-colors ${
                    isActive
                      ? "text-[var(--foreground)] border-b border-[var(--foreground)] pb-0.5"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {link.label}
                </a>
              </li>
            );
          })}
        </ul>

        <div className="flex justify-end items-center gap-4">
          {isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Avatar className="h-9 w-9 border cursor-pointer">
                  <AvatarFallback className="text-xs bg-[var(--tag)] text-[var(--primary)]">{initials}</AvatarFallback>
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
          ) : (
            <>
              <Link href="/login" className="hidden md:block text-[0.85rem] font-medium text-[var(--muted-foreground)] no-underline hover:text-[var(--foreground)] transition-colors">
                Log in
              </Link>
              <Link href="/signup">
                <Button className="bg-[var(--foreground)] text-[var(--background)] px-5 py-2 rounded-md text-[0.85rem] font-semibold hover:bg-[#1f2a3e] transition-colors">
                  Sign up
                </Button>
              </Link>
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-xl text-sm font-medium transition-colors hover:bg-[var(--tag)]">
                  <Menu className="w-5 h-5" />
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] sm:w-72 p-0 rounded-r-2xl">
                  <div className="flex items-center px-5 h-16 border-b border-[var(--border)]">
                    <Logo />
                  </div>
                  <div className="px-5 pt-5 pb-2">
                    <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Menu</p>
                  </div>
                  <nav className="flex flex-col gap-1.5 px-3 pb-4">
                    {navLinks.map((link) => {
                      const isActive = activeSection && link.href === `/#${activeSection}`;
                      return (
                        <a
                          key={link.href}
                          href={link.href}
                          onClick={(e) => {
                            handleNavClick(e, link.href);
                            setMobileOpen(false);
                          }}
                          className={cn(
                            "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors min-h-[48px] no-underline",
                            isActive
                              ? "bg-[var(--foreground)] text-[var(--background)] shadow-sm"
                              : "text-[var(--muted-foreground)] hover:bg-[var(--tag)] hover:text-[var(--foreground)]"
                          )}
                        >
                          <span className="w-5 h-5 flex items-center justify-center">
                            {isActive ? <X className="w-4 h-4" /> : <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                          </span>
                          {link.label}
                        </a>
                      );
                    })}
                  </nav>
                  <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[var(--border)] bg-[var(--background)]">
                    {isLoggedIn ? (
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
                            <p className="text-sm font-semibold text-[var(--foreground)] truncate">{userName}</p>
                            {userEmail && <p className="text-xs text-[var(--muted-foreground)] truncate">{userEmail}</p>}
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
                        <Link href="/signup" onClick={() => setMobileOpen(false)}>
                          <Button className="w-full h-11 rounded-xl text-sm font-semibold">Sign up</Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
