import Link from "next/link";
import { type MouseEvent } from "react";

type HeaderProps = {
  isActive: (href: string) => boolean;
  scrollToSection: (id: string) => (e: MouseEvent<HTMLAnchorElement>) => void;
  scrollToTop: (e: MouseEvent<HTMLAnchorElement>) => void;
};

export function Header({ isActive, scrollToSection, scrollToTop }: HeaderProps) {
  return (
    <header>
      <nav className="wrap">
        <div className="logo">
          <Link href="/" onClick={scrollToTop}>
            <img src="/images/Logo.png" alt="Day1" />
          </Link>
        </div>
        <div className="nav-links">
          <a href="/" onClick={scrollToSection("features")} className={isActive("/#features") ? "active" : ""}>Product</a>
          <a href="/" onClick={scrollToSection("process")} className={isActive("/#process") ? "active" : ""}>How it works</a>
          <a href="/" onClick={scrollToSection("usecases")} className={isActive("/#usecases") ? "active" : ""}>Use cases</a>
          <a href="/" onClick={scrollToSection("insights")} className={isActive("/#insights") ? "active" : ""}>Resources</a>
          <a href="/" onClick={scrollToSection("faq")} className={isActive("/#faq") ? "active" : ""}>FAQ</a>
        </div>
        <div className="nav-cta">
          <Link className={`nav-login ${isActive("/login") ? "active" : ""}`} href="/login">Login</Link>
          <Link className={`btn btn-primary btn-sm ${isActive("/book-demo") ? "active" : ""}`} href="/book-demo">Book a demo</Link>
        </div>
      </nav>
    </header>
  );
}
