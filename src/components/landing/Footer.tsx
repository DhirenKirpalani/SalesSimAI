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
                <img src="/images/Logo.png" alt="Day1" style={{ height: 36 }} loading="eager" />
              </Link>
            </div>
            <p>AI-powered conversation simulator. Practice real-life conversations with realistic AI personas.</p>
            <a
              href="https://www.producthunt.com/products/day1?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-day1"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-4"
            >
              <img
                alt="Day1 - Practice real conversations with AI | Product Hunt"
                width="250"
                height="54"
                src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1192819&theme=light&t=1783679294484"
              />
            </a>
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
