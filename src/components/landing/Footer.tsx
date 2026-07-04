import Link from "next/link";
import { type MouseEvent } from "react";

type FooterProps = {
  pathname: string;
  scrollToTop: (e: MouseEvent<HTMLAnchorElement>) => void;
};

export function Footer({ pathname, scrollToTop }: FooterProps) {
  return (
    <footer>
      <div className="wrap">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="logo">
              <Link href="/" onClick={scrollToTop}>
                <img src="/images/Logo.png" alt="Day1" style={{ height: 36 }} />
              </Link>
            </div>
            <p>AI field intelligence for sales teams. Turn every call into team-wide readiness.</p>
          </div>
          <div>
            <h4>Company</h4>
            <Link className={pathname === "/about" ? "active" : ""} href="/about">About us</Link>
            <Link className={pathname === "/book-demo" ? "active" : ""} href="/book-demo">Book a demo</Link>
            <Link className={pathname === "/contact" ? "active" : ""} href="/contact">Contact</Link>
          </div>
          <div>
            <h4>Legal</h4>
            <Link className={pathname === "/terms" ? "active" : ""} href="/terms">Terms of service</Link>
            <Link className={pathname === "/privacy" ? "active" : ""} href="/privacy">Privacy policy</Link>
            <Link className={pathname === "/security" ? "active" : ""} href="/security">Security</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Day1. All rights reserved.</span>
          <span>Singapore</span>
        </div>
      </div>
    </footer>
  );
}
