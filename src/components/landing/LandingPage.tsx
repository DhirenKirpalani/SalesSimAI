"use client";

import { useEffect, useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
  const pathname = usePathname();
  const [activeSection, setActiveSection] = useState("");
  const [openStep, setOpenStep] = useState(1);

  const scrollToTop = (e: MouseEvent<HTMLAnchorElement>) => {
    if (pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

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
    const updateFromHash = () => setActiveSection(window.location.hash);
    updateFromHash();
    window.addEventListener("hashchange", updateFromHash);
    return () => window.removeEventListener("hashchange", updateFromHash);
  }, []);

  useEffect(() => {
    const sections = ["hero", "features", "process", "usecases", "insights", "faq"];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        const topmost = visible.reduce((a, b) =>
          a.boundingClientRect.top < b.boundingClientRect.top ? a : b
        );
        setActiveSection(topmost.target.id === "hero" ? "" : `#${topmost.target.id}`);
      },
      { rootMargin: "0px 0px -80% 0px", threshold: 0 }
    );
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const isActive = (href: string) => {
    if (href.startsWith("#")) return activeSection === href;
    return false;
  };

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

  return (
    <div className="landing-page">
      

      <header>
        <nav className="wrap">
          <div className="logo">
            <Link href="/" onClick={scrollToTop}>
              <img src="/images/Logo.png" alt="Day1" style={{ height: 40, width: "auto" }} />
            </Link>
          </div>
          <div className="nav-links">
            <a href="#features" onClick={scrollTo("features")} className={isActive("#features") ? "active" : ""}>Product</a>
            <a href="#process" onClick={scrollTo("process")} className={isActive("#process") ? "active" : ""}>How it works</a>
            <a href="#usecases" onClick={scrollTo("usecases")} className={isActive("#usecases") ? "active" : ""}>Use cases</a>
            <a href="#insights" onClick={scrollTo("insights")} className={isActive("#insights") ? "active" : ""}>Resources</a>
            <a href="#faq" onClick={scrollTo("faq")} className={isActive("#faq") ? "active" : ""}>FAQ</a>
          </div>
          <div className="nav-cta">
            <Link className="nav-login" href="/login">Login</Link>
            <Link className="btn btn-primary btn-sm" href="/book-demo">Book a demo</Link>
          </div>
        </nav>
      </header>

      <section id="hero" className="hero">
        <div className="wrap hero-grid">
          <div>
            <div className="status-pill"><span className="live-dot"></span>Live from Day 1 — building in public.</div>
            <h1>Every call makes<br />the whole team <span className="hl">better.</span></h1>
            <p className="lead">Day1 turns your sales calls into a live intelligence loop. <strong>Objections and use cases surface on the leader dashboard</strong>, the AI buyer gets sharper, and <strong>battle cards go live in the next call</strong> — before the moment is missed.</p>
            <div className="hero-actions">
              <Link className="btn btn-outline" href="#features" onClick={scrollTo("features")}>Discover solution</Link>
              <Link className="btn btn-primary" href="/book-demo">Book a demo →</Link>
            </div>
            <div className="hero-meta">
              <span><i className="dot"></i>Works with your call recorder</span>
              <span><i className="dot"></i>No change to how reps sell</span>
            </div>
          </div>
          <div className="call-card">
            <div className="call-card-head">🎙️ AI Call Intel</div>
            <h4>Discovery Session</h4>
            <div className="skeleton-line" style={{ width: "85%" }}></div>
            <div className="skeleton-line" style={{ width: "60%" }}></div>
            <div className="skeleton-line highlight" style={{ width: "92%" }}></div>
            <div className="skeleton-line" style={{ width: "70%" }}></div>
            <div className="cc-row" style={{ marginTop: 14 }}>
              <div className="avatar">🎯</div>
              <div className="info"><div className="name">Pricing vs. incumbent</div><div className="sub">Battle card triggered mid-call</div></div>
              <span className="chip obj">Objection</span>
            </div>
            <div className="cc-row">
              <div className="avatar">📦</div>
              <div className="info"><div className="name">Multi-entity payouts</div><div className="sub">Use case tagged for playbook</div></div>
              <span className="chip use">Use case</span>
            </div>
            <div className="cc-cta">Let's go →</div>
          </div>
        </div>
      </section>

      <div className="audience-strip">
        <div className="wrap">
          <div>
            <h4>For sales leaders</h4>
            <p>See what's actually happening on the ground, call by call — no more guessing after the deal is lost.</p>
          </div>
          <div>
            <h4>For reps</h4>
            <p>Practice against an AI buyer that learns from real objections your team hears every day.</p>
          </div>
          <div>
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
          <div className="feature-grid">
            <div className="feature-card wide">
              <div className="feature-icon">📊</div>
              <h4>Call Intelligence Dashboard</h4>
              <p>See what's happening on the ground across every rep and every deal. Objections, use cases, and call quality, tracked in one view built for sales leaders — not buried in a CRM field.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🤖</div>
              <h4>AI Buyer Roleplay</h4>
              <p>Reps practice against an AI buyer that evolves from real calls — sharper and more current with every cycle.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔁</div>
              <h4>Collective Call Learning</h4>
              <p>One rep's toughest objection becomes practice for the whole team, automatically — nobody learns alone.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🚀</div>
              <h4>Product Launch Readiness</h4>
              <p>Product leaders upload a launch. Day1 turns it into a knowledge check so reps stay current before it shows up on a live call.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">�</div>
              <h4>Live Battle Cards</h4>
              <p>Deployed directly into real calls — objection handling and product knowledge, delivered right when reps need it, not after the call ends.</p>
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
            <div className="process-list">
              {processSteps.map((step, index) => (
                <div
                  key={step.id}
                  className={`item ${openStep === index ? "active" : ""}`}
                  onClick={() => setOpenStep(openStep === index ? -1 : index)}
                >
                  <div className="item-head">
                    {step.title}
                    <span className="chev">{openStep === index ? "−" : "+"}</span>
                  </div>
                  {openStep === index && <div className="item-body">{step.body}</div>}
                </div>
              ))}
            </div>
            <div className="process-visual">
              <div className="pv-card">
                <div className="pv-title">Call in Progress…</div>
                <div className="pv-sub">Analyzing live</div>
                <div className="pv-panels">
                  <div className="pv-panel">Rep<span className="cap">Marcus T.</span></div>
                  <div className="pv-panel">AI Buyer<span className="cap">Kilotech Persona</span></div>
                </div>
                <div className="pv-controls">
                  <div className="ctrl">�️</div>
                  <div className="ctrl">⏸</div>
                  <div className="ctrl stop">■</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="usecases">
        <div className="wrap">
          <div className="persona-banner">
            <div className="section-head">
              <h2 style={{ color: "#fff" }}>Buyers built from your own calls.</h2>
              <p>Every persona reps practice against is shaped by objections, hesitations, and questions Day1 captures from your team's real calls.</p>
            </div>
            <div className="persona-strip">
              <div className="persona-card"><div className="persona-photo">👤</div><div className="persona-info"><div className="name">Priya Nair</div><div className="role">Finance Buyer</div><div className="line">"Walk me through the pricing again."</div></div></div>
              <div className="persona-card"><div className="persona-photo">👤</div><div className="persona-info"><div className="name">Daniel Ho</div><div className="role">Procurement</div><div className="line">"What does your competitor do better?"</div></div></div>
              <div className="persona-card"><div className="persona-photo">👤</div><div className="persona-info"><div className="name">Wei Ling Tan</div><div className="role">Ops Director</div><div className="line">"How does this fit our current stack?"</div></div></div>
              <div className="persona-card"><div className="persona-photo">👤</div><div className="persona-info"><div className="name">Marcus Lee</div><div className="role">Skeptical CFO</div><div className="line">"Prove the ROI, not the pitch."</div></div></div>
              <div className="persona-card"><div className="persona-photo">👤</div><div className="persona-info"><div className="name">Amira Yusof</div><div className="role">New Prospect</div><div className="line">"I'm still comparing three vendors."</div></div></div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="section-head">
            <div className="eyebrow">Built to fit</div>
            <h2>Works with how your team already sells.</h2>
          </div>
          <div className="ent-grid">
            <div className="ent-card">
              <div className="ent-visual"><span className="badge-pill">Call recorder</span><span className="badge-pill">CRM</span></div>
              <h4>Connected to your stack</h4>
              <p>Day1 plugs into the call recording tool and CRM your team already uses. No new dialer, no new habit for reps.</p>
            </div>
            <div className="ent-card">
              <div className="ent-visual"><span className="badge-pill">GDPR-ready</span><span className="badge-pill">SG & EU hosting</span></div>
              <h4>Security & data protection</h4>
              <p><strong>GDPR-aligned</strong> data handling with <strong>Singapore and EU hosting</strong> options. ISO 27001 certification is on our roadmap as we scale.</p>
            </div>
            <div className="ent-card">
              <div className="ent-visual"><span className="badge-pill">Real-time</span></div>
              <h4>Live inside every call</h4>
              <p>Battle cards and objection guidance surface while the call is happening, not in a report reviewed days later.</p>
            </div>
          </div>
        </div>
      </section>

      <section style={{ background: "#fff", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div className="wrap">
          <div className="bento">
            <div className="bento-photo">
              <div><h4>Built to cut ramp-up time</h4><p>Give new reps realistic practice from day one instead of waiting weeks to sit in on a live call.</p></div>
            </div>
            <div className="bento-solid">
              <div className="big">Day 1</div>
              <div className="small">First call intel loop shipping now</div>
            </div>
            <div className="bento-solid">
              <div className="big">0 → 1</div>
              <div className="small">Every call from here forward feeds the loop</div>
            </div>
            <div className="bento-photo">
              <div><h4>Built to sharpen product knowledge</h4><p>Test reps on new launches before that knowledge gap shows up on a live client call.</p></div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="experience">
            <div className="exp-grid">
              <div>
                <h2>See the Day1 dashboard</h2>
                <p>Milestones, call scores, and coaching — one view for reps and leaders to track progress together.</p>
                <Link className="btn btn-primary" href="/book-demo">See it in action →</Link>
              </div>
              <div className="dash-mock">
                <div className="dash-top">Welcome back, Marcus</div>
                <div className="dash-sub">Here's how this week is shaping up.</div>
                <div className="dash-stats">
                  <div className="dash-stat orange"><div className="num">18</div><div className="lbl">Calls analyzed</div></div>
                  <div className="dash-stat light"><div className="num">78%</div><div className="lbl">Objection handling</div></div>
                </div>
                <div className="rail">
                  <div className="node done">✓</div><div className="rail-line"></div>
                  <div className="node current">▶</div><div className="rail-line"></div>
                  <div className="node">🔒</div>
                </div>
                <div className="rail-labels"><span>Pricing objections</span><span>Product Q1 launch</span><span>Multi-entity use case</span></div>
                <div className="perf-bar-label"><span>Objection handling score</span><span>78%</span></div>
                <div className="perf-bar"><div className="perf-fill" style={{ width: "78%" }}></div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="insights">
        <div className="wrap">
          <div className="section-head">
            <div className="eyebrow">Resources</div>
            <h2>Discover our latest insights</h2>
          </div>
          <div className="insight-grid">
            <div className="insight-card main">
              <div className="insight-photo">Launching Day1: Day One</div>
              <div className="insight-body">
                <div className="insight-date">July 5, 2026</div>
                <div className="insight-title">Why we're building a field intel loop, not another call recorder.</div>
                <a className="insight-link">Read the story →</a>
              </div>
            </div>
            <div className="insight-card">
              <div className="insight-photo soon">Coming soon</div>
              <div className="insight-body">
                <div className="insight-date">TBD</div>
                <div className="insight-title">Our first design partner story.</div>
              </div>
            </div>
            <div className="insight-card">
              <div className="insight-photo soon">Coming soon</div>
              <div className="insight-body">
                <div className="insight-date">TBD</div>
                <div className="insight-title">Inside the AI buyer training loop.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="demo">
        <div className="wrap">
          <div className="cta-banner">
            <h2>Be one of the first teams running Day1.</h2>
            <p>We're building this with early design partners — come shape it with us.</p>
            <div className="cta-actions">
              <Link className="btn btn-primary" href="/book-demo">Book a demo</Link>
              <Link className="btn btn-outline" href="/contact">Talk to us</Link>
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

      <footer>
        <div className="wrap">
          <div className="footer-top">
            <div className="footer-brand">
              <div className="logo">
                <Link href="/" onClick={scrollToTop}>
                  <img src="/images/Logo.png" alt="Day1" style={{ height: 36, width: "auto" }} />
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
    </div>
  );
}
