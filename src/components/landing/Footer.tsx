"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useThemeStore } from "@/stores/useThemeStore";

const footerLinks = [
  { label: "About us", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Security", href: "/security" },
];

export function Footer() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { darkMode } = useThemeStore();
  const logoSrc = darkMode ? "/images/Logo.png" : "/images/Logo-footer.png";

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data.user);
    });
  }, []);

  return (
    <footer className="bg-[var(--foreground)]">
      {/* CTA section */}
      <section className="py-20 lg:py-28 px-6 lg:px-16 text-center">
        <div className="max-w-[1100px] mx-auto">
          <h2 className="font-serif text-[1.5rem] sm:text-[1.75rem] font-bold text-[var(--background)] tracking-[-0.02em] mb-4 sm:whitespace-nowrap">
            {isLoggedIn ? "Your team's conversations are your best asset." : "Your team's conversations are your best asset. Start using them."}
          </h2>
          <p className="text-[0.975rem] text-[#8A99B8] leading-[1.75] max-w-[460px] mx-auto mb-8">
            {isLoggedIn
              ? "Jump back into your dashboard to continue practising, reviewing calls, and coaching your team."
              : "Set up your first module in under an hour. No implementation timeline. No demo required to start."}
          </p>
          <Link href={isLoggedIn ? "/dashboard" : "/signup"}>
            <Button className="bg-[var(--primary)] text-white px-7 py-3 rounded-md text-[0.95rem] font-semibold hover:bg-[#c94415] transition-colors">
              {isLoggedIn ? "Go to dashboard" : "Book a demo"}
            </Button>
          </Link>
          {!isLoggedIn && (
            <p className="mt-4 text-[0.75rem] text-[#6B7A99]">
              14-day free trial · No credit card required · Cancel any time
            </p>
          )}
        </div>
      </section>

      {/* Footer bar */}
      <div className="border-t border-[#1E2840]">
        <div className="w-full px-6 lg:px-16 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Link
              href="/"
              onClick={(e) => {
                if (typeof window !== "undefined" && window.location.pathname === "/") {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
              className="inline-flex items-center hover:opacity-80 transition-opacity no-underline"
            >
              <Image
                src={logoSrc}
                alt="Day1"
                width={150}
                height={40}
                className="h-10 w-auto"
                priority
              />
            </Link>
            <div className="flex gap-8 text-[0.78rem] text-[#6B7A99]">
              {footerLinks.map((link) => (
                <a key={link.label} href={link.href} className="hover:text-[var(--background)] transition-colors no-underline">
                  {link.label}
                </a>
              ))}
            </div>
            <p className="text-[0.72rem] text-[#6B7A99]">
              © {new Date().getFullYear()} Day1
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
