"use client";

import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState, type MouseEvent, createContext, useContext, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Header } from "./Header";
import { Footer } from "./Footer";

const ActiveSectionContext = createContext<{ activeSection: string; setActiveSection: (section: string) => void }>({
  activeSection: "",
  setActiveSection: () => {},
});

export const useActiveSection = () => useContext(ActiveSectionContext);

const AuthContext = createContext<{ user: User | null; loading: boolean }>({
  user: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export function PageLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [hash, setHash] = useState("");
  const [activeSection, setActiveSection] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const scrollToSection = (id: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (pathname === "/") {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    } else {
      sessionStorage.setItem("landing-section-scroll", id);
      router.push("/");
    }
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

  const isActive = useCallback(
    (href: string) => {
      if (href.startsWith("#")) {
        return pathname === "/" && activeSection === href;
      }
      if (href.startsWith("/#")) {
        return pathname === "/" && (activeSection === href.slice(1) || hash === href.slice(1));
      }
      return pathname === href;
    },
    [pathname, activeSection, hash]
  );

  return (
    <AuthContext.Provider value={{ user, loading: authLoading }}>
      <ActiveSectionContext.Provider value={{ activeSection, setActiveSection }}>
        <div className="marketing-layout">
          <Header isActive={isActive} scrollToSection={scrollToSection} scrollToTop={scrollToTop} user={user} loading={authLoading} />

          <main>{children}</main>

          <Footer pathname={pathname} scrollToTop={scrollToTop} />
        </div>
      </ActiveSectionContext.Provider>
    </AuthContext.Provider>
  );
}
