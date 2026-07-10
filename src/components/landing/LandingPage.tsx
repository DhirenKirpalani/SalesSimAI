"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { HeroVisual } from "./HeroVisual";
import { flagSvg, shieldSvg, bubbleSvg } from "./enterprise-svgs";
import { useActiveSection, useAuth } from "./PageLayout";

const processSteps = [
  {
    id: "capture",
    title: "1. Capture",
    body: "Calls, recordings, and context are automatically ingested from your existing tools — no manual uploads or extra steps for reps.",
  },
  {
    id: "call-intel",
    title: "2. Call Intel",
    body: "Every call is recorded and analyzed automatically. Objections, use cases, and coaching moments are tagged — no extra step for reps.",
  },
  {
    id: "ai-buyer",
    title: "3. AI Buyer Training",
    body: "Real objections and hesitations from your calls train the AI buyer, so reps practice against the most current version of your market.",
  },
  {
    id: "battle-cards",
    title: "4. Live Battle Cards",
    body: "Objection handling and product knowledge surface in the next live call, right when reps need it — not in a report reviewed days later.",
  },
];

export function LandingPage() {
  const { setActiveSection } = useActiveSection();
  const { user } = useAuth();
  const [openStep, setOpenStep] = useState(1);
  const [isPlaying, setIsPlaying] = useState(true);
  const featureCarouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setOpenStep((prev) => (prev + 1) % processSteps.length);
    }, 4300);
    return () => clearInterval(interval);
  }, [isPlaying]);

  useEffect(() => {
    const carousel = featureCarouselRef.current;
    if (!carousel) return;
    let direction = 1;
    const interval = setInterval(() => {
      const maxScroll = carousel.scrollWidth - carousel.clientWidth;
      if (carousel.scrollLeft >= maxScroll - 1) direction = -1;
      if (carousel.scrollLeft <= 1) direction = 1;
      carousel.scrollBy({ left: direction * 320, behavior: "smooth" });
    }, 3500);
    const pause = () => clearInterval(interval);
    const resume = () => {
      clearInterval(interval);
      const newInterval = setInterval(() => {
        const maxScroll = carousel.scrollWidth - carousel.clientWidth;
        if (carousel.scrollLeft >= maxScroll - 1) direction = -1;
        if (carousel.scrollLeft <= 1) direction = 1;
        carousel.scrollBy({ left: direction * 320, behavior: "smooth" });
      }, 3500);
      return newInterval;
    };
    let currentInterval = interval;
    const handleMouseEnter = () => clearInterval(currentInterval);
    const handleMouseLeave = () => { currentInterval = resume(); };
    carousel.addEventListener("mouseenter", handleMouseEnter);
    carousel.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      clearInterval(currentInterval);
      carousel.removeEventListener("mouseenter", handleMouseEnter);
      carousel.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  const scrollTo = (id: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const target = sessionStorage.getItem("landing-section-scroll");
    if (target) {
      sessionStorage.removeItem("landing-section-scroll");
      const el = document.getElementById(target);
      if (el) el.scrollIntoView({ behavior: "instant" });
    }
  }, []);

  useEffect(() => {
    const sections = ["hero", "features", "process", "usecases", "faq"];
    const updateActiveSection = () => {
      const scrollPos = window.scrollY + 120;
      let current = "";
      for (const id of sections) {
        const el = document.getElementById(id);
        if (!el) continue;
        const top = el.offsetTop;
        const height = el.offsetHeight;
        if (scrollPos >= top && scrollPos < top + height) {
          current = id === "hero" ? "" : `#${id}`;
          break;
        }
      }
      setActiveSection(current);
    };
    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    return () => window.removeEventListener("scroll", updateActiveSection);
  }, [setActiveSection]);

  useEffect(() => {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("visible");
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -10% 0px" }
    );
    document.querySelectorAll(".landing-page section").forEach((el) => {
      el.classList.add("reveal");
      revealObserver.observe(el);
    });
    return () => revealObserver.disconnect();
  }, []);

  useEffect(() => {
    const handlers = new Map<Element, EventListener>();
    document.querySelectorAll(".faq-q").forEach((q) => {
      const handler = () => {
        const item = q.parentElement;
        if (!item) return;
        const answer = item.querySelector(".faq-a") as HTMLElement | null;
        const isOpen = item.classList.contains("open");
        document.querySelectorAll(".faq-item.open").forEach((el) => {
          el.classList.remove("open");
          const a = el.querySelector(".faq-a") as HTMLElement | null;
          if (a) a.style.maxHeight = "";
        });
        if (!isOpen) {
          item.classList.add("open");
          if (answer) answer.style.maxHeight = answer.scrollHeight + "px";
        }
      };
      q.addEventListener("click", handler);
      handlers.set(q, handler);
    });
    return () => {
      handlers.forEach((handler, q) => q.removeEventListener("click", handler));
    };
  }, []);

  // Subtle parallax: each section's content shifts slightly as it scrolls through the viewport
  useEffect(() => {
    const wraps = document.querySelectorAll(".landing-page section:not(#hero) > .wrap");
    let rafId: number;

    const updateParallax = () => {
      const viewportHeight = window.innerHeight;
      wraps.forEach((wrap) => {
        const section = wrap.parentElement as HTMLElement;
        if (!section) return;
        const rect = section.getBoundingClientRect();
        const progress = (viewportHeight - rect.top) / (viewportHeight + rect.height);
        const offset = (progress - 0.5) * -50;
        (wrap as HTMLElement).style.transform = `translateY(${offset}px)`;
      });
    };

    const handleScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateParallax);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    updateParallax();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="landing-page">
      <section id="hero" className="hero">
        <div className="wrap hero-grid">
          <div>
            <div className="status-pill"><span className="live-dot"></span>Live from Day 1 — building in public.</div>
            <h1>Every call makes<br />the whole team <span className="hl">better.</span></h1>
            <p className="lead">Day1 turns your sales calls into a live intelligence loop. <strong>Objections and use cases surface on the leader dashboard</strong>, the AI buyer gets sharper, and <strong>battle cards go live in the next call</strong> — before the moment is missed.</p>
            <div className="hero-actions">
              {user ? (
                <Link className="btn btn-primary" href="/dashboard">Go to Dashboard →</Link>
              ) : (
                <>
                  <Link className="btn btn-outline" href="#features" onClick={scrollTo("features")}>Discover solution</Link>
                  <Link className="btn btn-primary" href="/book-demo">Book a demo →</Link>
                </>
              )}
            </div>
            <div className="hero-meta">
              <span><i className="dot"></i>Works with your call recorder</span>
              <span><i className="dot"></i>No change to how reps sell</span>
            </div>
          </div>
          <HeroVisual />
        </div>
      </section>

      <div className="audience-strip">
        <div className="wrap">
          <div className="audience-card">
            <div className="audience-icon">
              <svg viewBox="0 0 48 48" fill="none">
                <rect x="6" y="14" width="36" height="24" rx="6" stroke="currentColor" strokeWidth="2.5"/>
                <path d="M14 26h8M14 32h20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                <circle cx="32" cy="22" r="3" fill="currentColor"/>
                <path d="M12 14v-3a4 4 0 0 1 4-4h16a4 4 0 0 1 4 4v3" stroke="currentColor" strokeWidth="2.5"/>
              </svg>
            </div>
            <h4>For sales leaders</h4>
            <p>See what's actually happening on the ground, call by call — no more guessing after the deal is lost.</p>
          </div>
          <div className="audience-card">
            <div className="audience-icon">
              <svg viewBox="0 0 48 48" fill="none">
                <path d="M24 6c-9.4 0-17 7.6-17 17s7.6 17 17 17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M24 6c9.4 0 17 7.6 17 17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="4 4"/>
                <circle cx="24" cy="23" r="6" stroke="currentColor" strokeWidth="2.5"/>
                <path d="M28 27l6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
            <h4>For reps</h4>
            <p>Practice against an AI buyer that learns from real objections your team hears every day.</p>
          </div>
          <div className="audience-card">
            <div className="audience-icon">
              <svg viewBox="0 0 48 48" fill="none">
                <path d="M24 6l6 12h12L30 30l4 14-10-7-10 7 4-14L6 18h12l6-12z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/>
              </svg>
            </div>
            <h4>For product teams</h4>
            <p>Push a launch, capture what changed, and know reps are tested and ready before the next call.</p>
          </div>
        </div>
      </div>

      <section id="features" style={{ background: "#fff", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div className="wrap">
          <div className="section-head">
            <div className="eyebrow">Product</div>
            <h2>A field intel dashboard, not another call recorder.</h2>
            <p>Five capabilities working off the same feed of real conversations.</p>
          </div>
          <div className="feature-carousel-wrapper">
            <div className="feature-carousel" ref={featureCarouselRef}>
              <div className="feature-card">
                <div className="feature-icon">
                  <svg viewBox="0 0 48 48" fill="none"><rect x="6" y="8" width="36" height="32" rx="6" stroke="currentColor" strokeWidth="2.5"/><path d="M14 36V24M14 24l6-6 6 8 8-14 6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <h4>Call Intelligence Dashboard</h4>
                <p>See what's happening on the ground across every rep and every deal. Objections, use cases, and call quality, tracked in one view built for sales leaders — not buried in a CRM field.</p>
                <svg className="feature-image" viewBox="0 0 240 160" fill="none">
                  <rect width="240" height="160" rx="16" fill="#FFF5F0" />
                  <rect x="16" y="16" width="208" height="28" rx="6" fill="#fff" stroke="#FFD6C8" strokeWidth="2" />
                  <rect x="28" y="60" width="80" height="84" rx="10" fill="#fff" stroke="#FFD6C8" strokeWidth="2" />
                  <rect x="120" y="60" width="92" height="84" rx="10" fill="#fff" stroke="#FFD6C8" strokeWidth="2" />
                  <rect x="32" y="96" width="56" height="8" rx="4" fill="#FF8A65" />
                  <rect x="32" y="112" width="44" height="8" rx="4" fill="#FFD6C8" />
                  <rect x="32" y="128" width="52" height="8" rx="4" fill="#FFD6C8" />
                  <rect x="132" y="80" width="12" height="48" rx="3" fill="#FF6B45" />
                  <rect x="152" y="64" width="12" height="64" rx="3" fill="#FF8A65" />
                  <rect x="172" y="88" width="12" height="40" rx="3" fill="#FFD6C8" />
                  <rect x="192" y="72" width="12" height="56" rx="3" fill="#FF8A65" />
                </svg>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <svg viewBox="0 0 48 48" fill="none"><rect x="14" y="10" width="20" height="20" rx="10" stroke="currentColor" strokeWidth="2.5"/><path d="M24 20v8M20 24h8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><path d="M18 36h12M24 30v6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
                </div>
                <h4>AI Buyer Roleplay</h4>
                <p>Reps practice against an AI buyer that evolves from real calls — sharper and more current with every cycle.</p>
                <svg className="feature-image" viewBox="0 0 160 160" fill="none">
                  <rect width="160" height="160" rx="16" fill="#FFF5F0" />
                  <circle cx="80" cy="52" r="28" fill="#FFE8E0" />
                  <circle cx="80" cy="52" r="20" fill="#FF8A65" />
                  <circle cx="80" cy="52" r="12" fill="#FF6B45" />
                  <path d="M80 84v16" stroke="#FF6B45" strokeWidth="4" strokeLinecap="round" />
                  <path d="M52 116h56" stroke="#FF8A65" strokeWidth="4" strokeLinecap="round" />
                  <path d="M80 104v20" stroke="#FF6B45" strokeWidth="4" strokeLinecap="round" />
                  <rect x="48" y="124" width="64" height="12" rx="6" fill="#FFD6C8" />
                </svg>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <svg viewBox="0 0 48 48" fill="none"><path d="M24 6v6M24 36v6M6 24h6M36 24h6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><circle cx="24" cy="24" r="10" stroke="currentColor" strokeWidth="2.5"/><path d="M20 24h8M24 20v8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
                </div>
                <h4>Collective Call Learning</h4>
                <p>One rep's toughest objection becomes practice for the whole team, automatically — nobody learns alone.</p>
                <svg className="feature-image" viewBox="0 0 160 160" fill="none">
                  <rect width="160" height="160" rx="16" fill="#FFF5F0" />
                  <circle cx="80" cy="56" r="24" fill="#FFE8E0" />
                  <circle cx="80" cy="56" r="14" fill="#FF6B45" />
                  <circle cx="48" cy="112" r="18" fill="#FF8A65" />
                  <circle cx="80" cy="124" r="18" fill="#FF6B45" />
                  <circle cx="112" cy="112" r="18" fill="#FF8A65" />
                  <path d="M66 88L54 100M94 88l12 12" stroke="#FF8A65" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <svg viewBox="0 0 48 48" fill="none"><path d="M24 6l6 12h12L30 30l4 14-10-7-10 7 4-14L6 18h12l6-12z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/></svg>
                </div>
                <h4>Product Launch Readiness</h4>
                <p>Product leaders upload a launch. Day1 turns it into a knowledge check so reps stay current before it shows up on a live call.</p>
                <svg className="feature-image" viewBox="0 0 160 160" fill="none">
                  <rect width="160" height="160" rx="16" fill="#FFF5F0" />
                  <path d="M80 20l12 24h24L96 84l8 28-24-16-24 16 8-28L44 44h24l12-24z" fill="#FF6B45" />
                  <path d="M56 110h48M68 122h24" stroke="#FF8A65" strokeWidth="4" strokeLinecap="round" />
                  <circle cx="44" cy="116" r="8" fill="#FFD6C8" />
                  <circle cx="116" cy="116" r="8" fill="#FFD6C8" />
                </svg>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <svg viewBox="0 0 48 48" fill="none"><rect x="8" y="10" width="32" height="24" rx="6" stroke="currentColor" strokeWidth="2.5"/><path d="M16 22h6M16 28h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><path d="M32 18l-4 8h6l-4 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <h4>Live Battle Cards</h4>
                <p>Deployed directly into real calls — objection handling and product knowledge, delivered right when reps need it, not after the call ends.</p>
                <svg className="feature-image" viewBox="0 0 160 160" fill="none">
                  <rect width="160" height="160" rx="16" fill="#FFF5F0" />
                  <rect x="32" y="28" width="96" height="64" rx="10" fill="#fff" stroke="#FF6B45" strokeWidth="2" />
                  <rect x="40" y="44" width="56" height="6" rx="3" fill="#FFD6C8" />
                  <rect x="40" y="58" width="72" height="6" rx="3" fill="#FFD6C8" />
                  <rect x="40" y="72" width="48" height="6" rx="3" fill="#FFD6C8" />
                  <path d="M108 100l-10 20h14l-10 20" stroke="#FF6B45" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                  <rect x="28" y="108" width="64" height="24" rx="8" fill="#FFD6C8" />
                </svg>
              </div>
            </div>
            <div className="feature-carousel-controls">
              <button className="feature-carousel-btn" onClick={() => featureCarouselRef.current?.scrollBy({ left: -320, behavior: 'smooth' })} aria-label="Previous">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19l-7-7 7-7"/></svg>
              </button>
              <button className="feature-carousel-btn" onClick={() => featureCarouselRef.current?.scrollBy({ left: 320, behavior: 'smooth' })} aria-label="Next">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7"/></svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="process">
        <div className="wrap">
          <div className="section-head">
            <div className="eyebrow">How it works</div>
            <h2>Capture, learn, and get sharper. All in one loop.</h2>
            <p>Our process of intelligence.</p>
          </div>
          <div className="process-layout">
            <div className="process-tabs">
              {processSteps.map((step, index) => (
                <div
                  key={step.id}
                  className={`tab-item ${openStep === index ? "is-tab-active" : ""}`}
                  onClick={() => setOpenStep(index)}
                >
                  <div className="tab-heading">
                    {step.title}
                    <span className="tab-toggle">{openStep === index ? "−" : "+"}</span>
                  </div>
                  {openStep === index && (
                    <div className="tab-description">{step.body}</div>
                  )}
                </div>
              ))}
            </div>
            <div className="process-visual">
              <div className={`pv-card pv-card-${processSteps[openStep].id}`}>
                <div className="pv-title">{processSteps[openStep].title}</div>
                <div className="pv-sub">{processSteps[openStep].body}</div>
                <div className="pv-image">
                  <div key={openStep} className="pv-illustration-wrap">
                    {openStep === 0 && (
                      <svg className="pv-illustration" viewBox="0 0 120 120" fill="none">
                      <defs>
                        <linearGradient id="cap-grad" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stopColor="#FFF5F0" />
                          <stop offset="100%" stopColor="#FFE8E0" />
                        </linearGradient>
                        <linearGradient id="mic-grad" x1="30" y1="30" x2="90" y2="90" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stopColor="#FF8A65" />
                          <stop offset="100%" stopColor="#FF6B45" />
                        </linearGradient>
                      </defs>
                      <rect width="120" height="120" rx="24" fill="url(#cap-grad)" />
                      <rect x="34" y="28" width="52" height="64" rx="12" fill="#fff" stroke="#FFD6C8" strokeWidth="2" />
                      <rect x="42" y="40" width="36" height="8" rx="4" fill="#FFD6C8" />
                      <path d="M52 56c0-4.4 3.6-8 8-8s8 3.6 8 8v8c0 4.4-3.6 8-8 8s-8-3.6-8-8v-8z" stroke="url(#mic-grad)" strokeWidth="3" />
                      <path d="M44 68c0 8.8 7.2 16 16 16s16-7.2 16-16" stroke="url(#mic-grad)" strokeWidth="3" strokeLinecap="round" />
                      <path d="M60 84v8" stroke="url(#mic-grad)" strokeWidth="3" strokeLinecap="round" />
                      <path d="M48 92h24" stroke="url(#mic-grad)" strokeWidth="3" strokeLinecap="round" />
                      <circle cx="88" cy="38" r="10" fill="url(#mic-grad)" fillOpacity="0.12" />
                      <path d="M84 38h8M88 34v8" stroke="#FF6B45" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  )}
                  {openStep === 1 && (
                    <svg className="pv-illustration" viewBox="0 0 120 120" fill="none">
                      <defs>
                        <linearGradient id="intel-grad" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stopColor="#FFF5F0" />
                          <stop offset="100%" stopColor="#FFE8E0" />
                        </linearGradient>
                        <linearGradient id="bar-grad" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
                          <stop offset="0%" stopColor="#FF6B45" />
                          <stop offset="100%" stopColor="#FF8A65" />
                        </linearGradient>
                        <filter id="intel-shadow" x="0" y="0" width="120" height="120" filterUnits="userSpaceOnUse">
                          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#FF6B45" floodOpacity="0.12" />
                        </filter>
                      </defs>
                      <rect width="120" height="120" rx="24" fill="url(#intel-grad)" />
                      <rect x="16" y="20" width="88" height="80" rx="14" fill="#fff" stroke="#FFD6C8" strokeWidth="2" filter="url(#intel-shadow)" />
                      <rect x="28" y="34" width="40" height="6" rx="3" fill="#FFD6C8" />
                      <rect x="28" y="46" width="64" height="4" rx="2" fill="#E5E5E5" />
                      <line x1="28" y1="64" x2="92" y2="64" stroke="#F0F0F0" strokeWidth="1" />
                      <line x1="28" y1="78" x2="92" y2="78" stroke="#F0F0F0" strokeWidth="1" />
                      <line x1="28" y1="92" x2="92" y2="92" stroke="#F0F0F0" strokeWidth="1" />
                      <rect x="32" y="74" width="10" height="18" rx="3" fill="url(#bar-grad)" />
                      <rect x="48" y="60" width="10" height="32" rx="3" fill="url(#bar-grad)" />
                      <rect x="64" y="48" width="10" height="44" rx="3" fill="url(#bar-grad)" />
                      <rect x="80" y="66" width="10" height="26" rx="3" fill="url(#bar-grad)" />
                      <path d="M32 76c8-8 16-4 24-12s16-6 24-14" stroke="#FF6B45" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                  )}
                  {openStep === 2 && (
                    <svg className="pv-illustration" viewBox="0 0 120 120" fill="none">
                      <defs>
                        <linearGradient id="train-grad" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stopColor="#FFF5F0" />
                          <stop offset="100%" stopColor="#FFE8E0" />
                        </linearGradient>
                        <linearGradient id="bot-grad" x1="45" y1="25" x2="75" y2="75" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stopColor="#FF8A65" />
                          <stop offset="100%" stopColor="#FF6B45" />
                        </linearGradient>
                      </defs>
                      <rect width="120" height="120" rx="24" fill="url(#train-grad)" />
                      <circle cx="60" cy="36" r="18" fill="url(#bot-grad)" />
                      <circle cx="54" cy="34" r="2.5" fill="#fff" />
                      <circle cx="66" cy="34" r="2.5" fill="#fff" />
                      <path d="M56 42c2.5 2 5.5 2 8 0" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                      <rect x="42" y="54" width="36" height="42" rx="10" fill="#fff" stroke="#FFD6C8" strokeWidth="2" />
                      <path d="M48 66h8M48 74h24M48 82h18" stroke="#E5E5E5" strokeWidth="3" strokeLinecap="round" />
                      <path d="M82 60c6 6 6 18 0 24" stroke="#FF8A65" strokeWidth="3" strokeLinecap="round" />
                      <path d="M88 54c10 10 10 32 0 42" stroke="#FFD6C8" strokeWidth="3" strokeLinecap="round" />
                      <path d="M34 64c-8 8-8 24 0 32" stroke="#FFD6C8" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  )}
                  {openStep === 3 && (
                    <svg className="pv-illustration" viewBox="0 0 120 120" fill="none">
                      <defs>
                        <linearGradient id="battle-grad" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stopColor="#FFF5F0" />
                          <stop offset="100%" stopColor="#FFE8E0" />
                        </linearGradient>
                        <linearGradient id="badge-grad" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
                          <stop offset="0%" stopColor="#FF6B45" />
                          <stop offset="100%" stopColor="#FF8A65" />
                        </linearGradient>
                      </defs>
                      <rect width="120" height="120" rx="24" fill="url(#battle-grad)" />
                      <rect x="18" y="24" width="84" height="58" rx="12" fill="#fff" stroke="#FFD6C8" strokeWidth="2" />
                      <rect x="30" y="38" width="36" height="6" rx="3" fill="#FFD6C8" />
                      <rect x="30" y="50" width="60" height="4" rx="2" fill="#E5E5E5" />
                      <rect x="30" y="60" width="48" height="4" rx="2" fill="#E5E5E5" />
                      <rect x="30" y="70" width="54" height="4" rx="2" fill="#E5E5E5" />
                      <circle cx="86" cy="44" r="12" fill="url(#badge-grad)" />
                      <path d="M82 44l4 4 8-8" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M92 88c-6-6-18-6-24 0" stroke="#FF8A65" strokeWidth="3" strokeLinecap="round" />
                      <path d="M86 94c-8-4-20-4-28 0" stroke="#FFD6C8" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  )}
                  </div>
                </div>
              </div>
              <button
                className={`tabs-playpause ${isPlaying ? "" : "is-paused"}`}
                onClick={() => setIsPlaying(!isPlaying)}
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                <svg className="icon-pause" viewBox="0 0 24 24" fill="currentColor"><path d="M9.75 20.25H7.5a.75.75 0 0 1-.75-.75V4.5a.75.75 0 0 1 .75-.75h2.25a.75.75 0 0 1 .75.75v15a.75.75 0 0 1-.75.75Z" /><path d="M16.5 20.25H14.25a.75.75 0 0 1-.75-.75V4.5a.75.75 0 0 1 .75-.75H16.5a.75.75 0 0 1 .75.75v15a.75.75 0 0 1-.75.75Z" /></svg>
                <svg className="icon-play" viewBox="0 0 24 24" fill="currentColor"><path d="M6.23 20.63a1.5 1.5 0 0 1-.82-.23 1.5 1.5 0 0 1-.68-1.28V5.2c0-.53.27-1.01.68-1.28.41-.28.93-.34 1.4-.18l11.62 6.95c.47.28.75.78.75 1.33 0 .55-.28 1.05-.75 1.33L7.09 20.3c-.26.16-.56.24-.86.24Z" /></svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="usecases">
        <div className="wrap">
          <div className="persona-banner">
            <div className="section-head center">
              <div className="eyebrow">AI personas</div>
              <h2 style={{ color: "#fff" }}>Buyers built from your own calls.</h2>
              <p>Every persona reps practice against is shaped by objections, hesitations, and questions Day1 captures from your team's real calls.</p>
            </div>
            <div className="persona-marquee">
              <div className="persona-row persona-row-left">
                <div className="persona-card"><img loading="lazy" src="https://cdn.prod.website-files.com/68da4dda1d086704a4f1d919/6a0c970a6cc3c8bccf1b492a_01.avif" alt="Sofia Moretti" className="persona-photo" /><div className="persona-info"><div className="name">Priya Nair</div><div className="role">Finance Buyer</div><div className="line">"Walk me through the pricing again."</div></div></div>
                <div className="persona-card"><img loading="lazy" src="https://cdn.prod.website-files.com/68da4dda1d086704a4f1d919/6a0ed60ce341dacc09501e25_33.webp" alt="Hugo Lambert" className="persona-photo" /><div className="persona-info"><div className="name">Daniel Ho</div><div className="role">Procurement</div><div className="line">"What does your competitor do better?"</div></div></div>
                <div className="persona-card"><img loading="lazy" src="https://cdn.prod.website-files.com/68da4dda1d086704a4f1d919/6a0c9a595eb16f7015d5c8ed_03.avif" alt="Anna Schmidt" className="persona-photo" /><div className="persona-info"><div className="name">Wei Ling Tan</div><div className="role">Ops Director</div><div className="line">"How does this fit our current stack?"</div></div></div>
                <div className="persona-card"><img loading="lazy" src="https://cdn.prod.website-files.com/68da4dda1d086704a4f1d919/6a0c9a599f26b99ef87159c7_02.avif" alt="David Bernard" className="persona-photo" /><div className="persona-info"><div className="name">Marcus Lee</div><div className="role">Skeptical CFO</div><div className="line">"Prove the ROI, not the pitch."</div></div></div>
                <div className="persona-card"><img loading="lazy" src="https://cdn.prod.website-files.com/68da4dda1d086704a4f1d919/6a0ed60c2e8527d759f62697_2.webp" alt="Layla Okonkwo" className="persona-photo" /><div className="persona-info"><div className="name">Amira Yusof</div><div className="role">New Prospect</div><div className="line">"I'm still comparing three vendors."</div></div></div>
                <div className="persona-card"><img loading="lazy" src="https://cdn.prod.website-files.com/68da4dda1d086704a4f1d919/6a0c970a6cc3c8bccf1b492a_01.avif" alt="Sofia Moretti" className="persona-photo" /><div className="persona-info"><div className="name">Priya Nair</div><div className="role">Finance Buyer</div><div className="line">"Walk me through the pricing again."</div></div></div>
                <div className="persona-card"><img loading="lazy" src="https://cdn.prod.website-files.com/68da4dda1d086704a4f1d919/6a0ed60ce341dacc09501e25_33.webp" alt="Hugo Lambert" className="persona-photo" /><div className="persona-info"><div className="name">Daniel Ho</div><div className="role">Procurement</div><div className="line">"What does your competitor do better?"</div></div></div>
                <div className="persona-card"><img loading="lazy" src="https://cdn.prod.website-files.com/68da4dda1d086704a4f1d919/6a0c9a595eb16f7015d5c8ed_03.avif" alt="Anna Schmidt" className="persona-photo" /><div className="persona-info"><div className="name">Wei Ling Tan</div><div className="role">Ops Director</div><div className="line">"How does this fit our current stack?"</div></div></div>
                <div className="persona-card"><img loading="lazy" src="https://cdn.prod.website-files.com/68da4dda1d086704a4f1d919/6a0c9a599f26b99ef87159c7_02.avif" alt="David Bernard" className="persona-photo" /><div className="persona-info"><div className="name">Marcus Lee</div><div className="role">Skeptical CFO</div><div className="line">"Prove the ROI, not the pitch."</div></div></div>
                <div className="persona-card"><img loading="lazy" src="https://cdn.prod.website-files.com/68da4dda1d086704a4f1d919/6a0ed60c2e8527d759f62697_2.webp" alt="Layla Okonkwo" className="persona-photo" /><div className="persona-info"><div className="name">Amira Yusof</div><div className="role">New Prospect</div><div className="line">"I'm still comparing three vendors."</div></div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="padding-global">
        <div className="wrap">
          <div className="grid-vertical">
            <div className="section-head">
              <div className="eyebrow">Built to fit</div>
              <h2>Built for enterprise standards</h2>
              <p>Everything you need to deploy Day1 at scale, with full confidence.</p>
            </div>
            <div className="list-card">
              <div className="card-persona big">
                <div className="content-card">
                  <div className="w-embed ent-hero-svg" dangerouslySetInnerHTML={{ __html: flagSvg }} />
                </div>
                <div className="container-card-content big">
                  <div className="heading-4">4 languages<br/>available</div>
                  <div className="paragraph text-medium-grey">English, Bahasa Indonesia, Malay, and Singaporean English — tailored for teams across Southeast Asia.</div>
                </div>
              </div>
              <div className="card-persona big">
                <div className="content-card">
                  <div className="w-embed ent-hero-svg" dangerouslySetInnerHTML={{ __html: shieldSvg }} />
                </div>
                <div className="container-card-content big">
                  <div className="heading-4">Security<br/>and Compliance</div>
                  <div className="paragraph text-medium-grey">End-to-end encryption, role-based access controls, and isolated organization data. SOC 2 and ISO 27001 certifications are in progress.</div>
                </div>
              </div>
              <div className="card-persona big">
                <div className="content-card">
                  <div className="w-embed ent-hero-svg" dangerouslySetInnerHTML={{ __html: bubbleSvg }} />
                </div>
                <div className="container-card-content big">
                  <div className="heading-4">Connected<br/>to your CRM and LMS</div>
                  <div className="paragraph text-medium-grey">Native integration with your CRM, LMS, and HR tools. Data flows seamlessly, teams save time.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="padding-global">
        <div className="wrap">
          <div className="section-head">
            <h2>The challenges we solve together</h2>
            <p>Reduce performance gaps, align strategy and execution, accelerate new employee autonomy.</p>
          </div>
          <div className="challenges-grid-wrapper">
            <div className="challenges-grid">
              <div className="challenges-item">
                <img src="https://cdn.prod.website-files.com/68da4dda1d086704a4f1d919/68dc0f905c0590c393e0e575_Frame%202147225027.avif" loading="lazy" alt="sales-working-on-muchbetter-ai-to-train-sales" className="challenges-item-bg" />
                <div className="challenges-item-content">
                  <p className="heading-4 text-white">Reduce ramp-up time by 30% to 50%</p>
                  <p className="paragraph medium text-white-80">Enable new hires to reach productivity faster through realistic practice, structured onboarding, and continuous reinforcement from day one.</p>
                </div>
              </div>
              <div className="challenges-item small">
                <div className="challenges-item-content">
                  <p className="number-heading-display">30–50% <br />faster ramp-up</p>
                  <p className="paragraph medium text-white-80">Cut time to first confident live call</p>
                </div>
              </div>
            </div>
            <div className="challenges-grid odd">
              <div className="challenges-item small">
                <div className="challenges-item-content">
                  <p className="number-heading-display">45% <br />better handling</p>
                  <p className="paragraph medium text-white-80">Measured in practice, not just training</p>
                </div>
              </div>
              <div className="challenges-item">
                <img src="https://cdn.prod.website-files.com/68da4dda1d086704a4f1d919/68dc0f900ac2dfa57ce34c10_Frame%202147225035.avif" loading="lazy" alt="sales-ai-coaching-pictures" className="challenges-item-bg" />
                <div className="challenges-item-content">
                  <p className="heading-4 text-white">Increase product knowledge and technical objection handling by 45%</p>
                  <p className="paragraph medium text-white-80">Help teams master complex products, respond confidently to customer questions, and handle technical objections more effectively.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="card-release-cta _02">
            <div className="bloc-spacing">
            <div className="spacer-xs max-w-400">
              <div>
                <h2 className="heading-2 text-white">Try the Day1</h2>
                <h2 className="heading-1-display-2 text-color-white">Experience</h2>
              </div>
              <div className="paragraph large text-white-80">Don't let engagement rely on memory. Automated notifications bring teams back to practice regularly: turning consistency into performance.</div>
              <div className="div-button">
                <Link className="button w-inline-block" href={user ? "/dashboard" : "/book-demo"}>
                  <div className="button-content">
                    <p className="button-text">{user ? "Go to Dashboard" : "Try it now"}</p>
                    <div className="button-icon w-embed">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M9 4L7.9425 5.0575L12.1275 9.25H3V10.75H12.1275L7.9425 14.9425L9 16L15 10L9 4Z" fill="currentColor" />
                      </svg>
                    </div>
                  </div>
                  <div className="button-bg"></div>
                </Link>
              </div>
            </div>
          </div>
          <div className="image-screen mobile-hide">
            <div className="day1-screen screen">
              <div className="day1-sidebar">
                <div className="day1-logo">
                  <Image src="/images/Logo.png" alt="Day1" width={40} height={40} />
                </div>
                <div className="day1-nav">
                  <div className="day1-nav-label">TRAIN</div>
                  <div className="day1-nav-item active"><span className="day1-nav-icon">▤</span>Dashboard</div>
                  <div className="day1-nav-item"><span className="day1-nav-icon">▶</span>Pathways</div>
                  <div className="day1-nav-item"><span className="day1-nav-icon">◷</span>History</div>
                </div>
                <div className="day1-nav">
                  <div className="day1-nav-label">SETTINGS</div>
                  <div className="day1-nav-item"><span className="day1-nav-icon">🌐</span>Language</div>
                  <div className="day1-nav-item"><span className="day1-nav-icon">⎋</span>Sign out</div>
                </div>
              </div>
              <div className="day1-main">
                <div className="day1-header">
                  <div>
                    <div className="day1-welcome">Welcome back, Marcus</div>
                    <div className="day1-sub">Here's how this week is shaping up.</div>
                  </div>
                  <div className="day1-badges">
                    <div className="day1-badge">🏆 Badges</div>
                    <div className="day1-badge dark">Next simulation awaits</div>
                  </div>
                </div>
                <div className="day1-stats">
                  <div className="day1-stat-card gradient"><div className="day1-stat-label">Activities completed</div><div className="day1-stat-num">18</div></div>
                  <div className="day1-stat-card"><div className="day1-stat-label">Last 3 simulations</div><div className="day1-stat-num green">78%</div></div>
                  <div className="day1-stat-card"><div className="day1-stat-label">Quiz scores</div><div className="day1-stat-num yellow">84%</div></div>
                  <div className="day1-stat-card"><div className="day1-stat-label">Top skill this month</div><div className="day1-stat-num pink">Discovery</div></div>
                </div>
                <div className="day1-path">
                  <div className="day1-path-header">
                    <div><div className="day1-path-title">[Pathway in progress]</div><div className="day1-path-sub">Progress: 35%</div></div>
                    <div className="day1-path-meta">Pathway 1</div>
                  </div>
                  <div className="day1-path-rail">
                    <div className="day1-path-node done">✓</div>
                    <div className="day1-path-line"></div>
                    <div className="day1-path-node current">▶</div>
                    <div className="day1-path-line"></div>
                    <div className="day1-path-node">🔒</div>
                    <div className="day1-path-line"></div>
                    <div className="day1-path-node">🔒</div>
                    <div className="day1-path-line"></div>
                    <div className="day1-path-node">🔒</div>
                    <div className="day1-path-line"></div>
                    <div className="day1-path-node badge">🏅</div>
                  </div>
                  <div className="day1-path-labels">
                    <span>Pricing objections</span>
                    <span>Product Q1 launch</span>
                    <span>Multi-entity</span>
                    <span>Enterprise</span>
                    <span>Advanced close</span>
                    <span>Badge</span>
                  </div>
                </div>
                <div className="day1-insights">
                  <div className="day1-insight">
                    <div className="day1-insight-title">Performance</div>
                    <div className="day1-insight-sub">Based on the last 3 simulations</div>
                    <div className="day1-skill"><span>Discovery</span><span className="day1-skill-bar"><span style={{ width: "80%" }}></span></span><span>80%</span></div>
                    <div className="day1-skill"><span>Objection handling</span><span className="day1-skill-bar"><span style={{ width: "50%" }}></span></span><span>50%</span></div>
                    <div className="day1-skill"><span>Technical depth</span><span className="day1-skill-bar"><span style={{ width: "60%" }}></span></span><span>60%</span></div>
                    <div className="day1-skill"><span>Closing</span><span className="day1-skill-bar"><span style={{ width: "80%" }}></span></span><span>80%</span></div>
                  </div>
                  <div className="day1-insight">
                    <div className="day1-insight-title">Strengths</div>
                    <div className="day1-insight-text">You consistently handle pricing objections and connect the product to business outcomes.</div>
                  </div>
                  <div className="day1-insight">
                    <div className="day1-insight-title">Focus areas</div>
                    <div className="day1-insight-text">Push deeper on multi-entity use cases and security questions during enterprise calls.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* <section id="insights">
        <div className="wrap">
          <div className="spacer-l">
            <div className="last-ressources-header">
              <div className="max-w-500">
                <h2 className="heading-2">Discover our latest insights</h2>
              </div>
              <Link className="button w-inline-block" href="/resources">
                <div className="button-content">
                  <p className="button-text">All our resources</p>
                  <div className="button-icon w-embed">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M9 4L7.9425 5.0575L12.1275 9.25H3V10.75H12.1275L7.9425 14.9425L9 16L15 10L9 4Z" fill="currentColor" />
                    </svg>
                  </div>
                </div>
                <div className="button-bg"></div>
              </Link>
            </div>
            <div className="last-ressources-grid">
              <div className="big-article-list-wrapper">
                <div role="list" className="big-article-list">
                  <div role="listitem" className="big-article-item-wrapper">
                    <Link className="big-article w-inline-block" href="/resources/launching-day1">
                      <div className="big-article-content">
                        <p className="heading-4">Turn Sales Skills into Measurable Revenue Performance</p>
                        <div className="last-articles-item-info">
                          <p className="ressource-date text-white">April 2, 2026</p>
                          <img loading="lazy" src="https://cdn.prod.website-files.com/68da4dda1d086704a4f1d919/68e52eefd451bf0a6ad01e3a_Frame%202147225023.svg" alt="" className="big-article-btn" />
                        </div>
                      </div>
                      <div className="big-article-bg-wrapper day1-gradient">
                        <div className="big-article-bg-logo">
                          <Image src="/images/Logo.png" alt="Day1" width={48} height={48} />
                        </div>
                        <div className="big-article-bg-filter"></div>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
              <div className="last-articles-wrapper">
                <div role="list" className="last-articles-grid">
                  <div role="listitem" className="last-articles-item-wrapper">
                    <Link className="articles-item w-inline-block" href="/resources/design-partner">
                      <div className="spacer-s">
                        <div className="last-articles-item-thumbnail-wrapper day1-thumb">
                          <Image src="/images/Logo.png" alt="Day1" width={80} height={80} className="last-articles-item-thumbnail" />
                        </div>
                        <p className="paragraph extra-large">Our first design partner story</p>
                      </div>
                      <div className="last-articles-item-info">
                        <p className="ressource-date">June 22, 2026</p>
                        <p className="button-link">Learn more</p>
                      </div>
                    </Link>
                  </div>
                  <div role="listitem" className="last-articles-item-wrapper">
                    <Link className="articles-item w-inline-block" href="/resources/ai-buyer-training">
                      <div className="spacer-s">
                        <div className="last-articles-item-thumbnail-wrapper day1-thumb alt">
                          <Image src="/images/Logo.png" alt="Day1" width={80} height={80} className="last-articles-item-thumbnail" />
                        </div>
                        <p className="paragraph extra-large">Inside the AI buyer training loop</p>
                      </div>
                      <div className="last-articles-item-info">
                        <p className="ressource-date">June 11, 2026</p>
                        <p className="button-link">Learn more</p>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section> */}

      <section id="demo">
        <div className="wrap">
          <div className="cta-banner">
            <h2>Be one of the first teams running Day1.</h2>
            <p>We're building this with early design partners — come shape it with us.</p>
            <div className="cta-actions">
              {user ? (
                <Link className="btn btn-primary" href="/dashboard">Go to Dashboard →</Link>
              ) : (
                <>
                  <Link className="btn btn-primary" href="/book-demo">Book a demo</Link>
                  <Link className="btn btn-outline" href="/contact">Talk to us</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section id="faq">
        <div className="wrap">
          <div className="section-head">
            <div className="eyebrow">FAQ</div>
            <h2>Common questions</h2>
          </div>
          <div className="faq-list">
            <div className="faq-item">
              <div className="faq-q">What is an AI field intelligence platform for sales?<span className="chev">⌄</span></div>
              <div className="faq-a"><p>It's a system that turns real sales calls into a live feed of insight — surfacing objections and use cases for leaders, and using that same data to keep AI roleplay and battle cards current for reps.</p></div>
            </div>
            <div className="faq-item">
              <div className="faq-q">How does Day1 turn call recordings into insights?<span className="chev">⌄</span></div>
              <div className="faq-a"><p>Calls are analyzed automatically after they happen. Objections, use cases, and coaching moments are tagged and routed to the dashboard — no manual note-taking.</p></div>
            </div>
            <div className="faq-item">
              <div className="faq-q">How does the AI buyer stay realistic?<span className="chev">⌄</span></div>
              <div className="faq-a"><p>The AI buyer is trained on objections and questions actually captured from your team's calls, so roleplay reflects what reps are hearing right now.</p></div>
            </div>
            <div className="faq-item">
              <div className="faq-q">Do reps have to change how they make calls?<span className="chev">⌄</span></div>
              <div className="faq-a"><p>No. Day1 connects to the call recording tool your team already uses. Capture happens in the background — reps just sell.</p></div>
            </div>
            <div className="faq-item">
              <div className="faq-q">How do battle cards show up during a real call?<span className="chev">⌄</span></div>
              <div className="faq-a"><p>When a known objection or product question comes up, the relevant battle card surfaces for the rep in the moment.</p></div>
            </div>
            <div className="faq-item">
              <div className="faq-q">Who is Day1 for?<span className="chev">⌄</span></div>
              <div className="faq-a"><p>Sales leaders who want visibility on the ground, reps who want to walk into calls prepared, and product leaders who need launches to land.</p></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
