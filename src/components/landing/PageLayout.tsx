"use client";

import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState, type MouseEvent } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";

export function PageLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [hash, setHash] = useState("");

  const scrollToSection = (id: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    sessionStorage.setItem("landing-section-scroll", id);
    router.push("/");
  };

  const scrollToTop = (e: MouseEvent<HTMLAnchorElement>) => {
    if (pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const updateHash = () => setHash(window.location.hash);
    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, [pathname]);

  const isActive = (href: string) => {
    if (href.startsWith("/#")) {
      return pathname === "/" && hash === href.slice(1);
    }
    return pathname === href;
  };

  return (
    <div className="marketing-layout">
      <Header isActive={isActive} scrollToSection={scrollToSection} scrollToTop={scrollToTop} />

      <main>{children}</main>

      <Footer pathname={pathname} scrollToTop={scrollToTop} />
    </div>
  );
}
