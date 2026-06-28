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
import { Menu, X, User, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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

function Logo() {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (typeof window !== "undefined" && window.location.pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <Link href="/" onClick={handleClick} className="font-serif text-[1.2rem] font-bold text-[var(--foreground)] no-underline hover:opacity-80 transition-opacity">
      SalesSim<span className="text-[var(--primary)]">.</span>
    </Link>
  );
}

export function LandingNavbar() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [initials, setInitials] = useState("U");
  const [activeSection, setActiveSection] = useState<string>("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      setIsLoggedIn(!!user);
      if (user) {
        const name = user.user_metadata?.full_name || user.email || "U";
        const letters = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
        setInitials(letters);
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
        <Logo />

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
                  Book a demo
                </Button>
              </Link>
              <button
                onClick={() => setMobileOpen((v) => !v)}
                className="md:hidden p-2 rounded-lg hover:bg-[var(--tag)] transition-colors"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--background)]">
          <div className="px-6 py-4 space-y-3">
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
                  className={`block text-sm font-medium transition-colors py-1 no-underline ${
                    isActive ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {link.label}
                </a>
              );
            })}
            <div className="pt-2 flex flex-col gap-2">
              {isLoggedIn ? (
                <>
                  <Link href="/profile" onClick={() => setMobileOpen(false)}>
                    <Button className="w-full rounded-md">Profile</Button>
                  </Link>
                  <Button variant="outline" className="w-full rounded-md" onClick={() => { handleLogout(); setMobileOpen(false); }}>
                    Log out
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileOpen(false)}>
                    <Button variant="outline" className="w-full rounded-md">
                      Log in
                    </Button>
                  </Link>
                  <Link href="/signup" onClick={() => setMobileOpen(false)}>
                    <Button className="w-full rounded-md">Book a demo</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
