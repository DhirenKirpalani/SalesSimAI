import { Mic, Pause, Square, Sparkles, Clock, ArrowRight, Phone, Target } from "lucide-react";

export function HeroVisual() {
  return (
    <div className="hero-visual-wrapper">
      <div className="hero-stage">
        <div className="hero-tilt">
          {/* Card 1 — AI Call Intel / Discovery Session */}
          <div className="hero-card hero-card-1">
            <div className="hero-card-panel">
              <div className="hero-card-header">
                <div className="hero-avatar hero-avatar-company">N</div>
                <div className="hero-card-meta">
                  <div className="hero-card-title">Discovery Session</div>
                  <div className="hero-card-subtitle">NorthPay · B2B Fintech</div>
                </div>
                <div className="hero-duration-badge">
                  <Clock className="w-3 h-3" />
                  <span>15 min</span>
                </div>
              </div>

              <div className="hero-transcript">
                <div className="hero-message hero-message-buyer">
                  <div className="hero-message-avatar">EM</div>
                  <div className="hero-message-bubble">
                    <p>We&apos;re evaluating solutions to cut manual reconciliation time.</p>
                  </div>
                </div>
                <div className="hero-message hero-message-seller">
                  <div className="hero-message-bubble hero-message-bubble-seller">
                    <p>How much time is your team spending on reconciliation today?</p>
                  </div>
                  <div className="hero-message-avatar hero-message-avatar-seller">You</div>
                </div>
                <div className="hero-message hero-message-buyer">
                  <div className="hero-message-avatar">EM</div>
                  <div className="hero-message-bubble">
                    <p>About two days per month, and it&apos;s error-prone.</p>
                  </div>
                </div>
              </div>

              <button className="hero-card-cta">
                <Phone className="w-4 h-4" />
                <span>Let&apos;s go</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <svg className="hero-card-wave" viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <linearGradient id="hero-wave-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ff6b45" stopOpacity="0" />
                    <stop offset="50%" stopColor="#ff6b45" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#ff6b45" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 20 Q20 8 40 20 T80 20 T120 20 T160 20 T200 20"
                  fill="none"
                  stroke="url(#hero-wave-grad)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M0 20 Q25 32 50 20 T100 20 T150 20 T200 20"
                  fill="none"
                  stroke="url(#hero-wave-grad)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  opacity="0.6"
                />
              </svg>
            </div>
          </div>

          {/* Card 2 — Live coaching profile */}
          <div className="hero-card hero-card-2">
            <div className="hero-card-panel hero-profile-card">
              <div className="hero-live-pill">
                <span className="hero-live-dot"></span>
                <span>Live coaching</span>
              </div>

              <div className="hero-profile-circle">
                <img
                  src="https://i.pravatar.cc/150?img=5"
                  alt="Sylvie Carond"
                  className="hero-profile-image"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = "none";
                    const fallback = target.parentElement?.querySelector(".hero-profile-initials") as HTMLElement | null;
                    if (fallback) fallback.style.display = "flex";
                  }}
                />
                <span className="hero-profile-initials" style={{ display: "none" }}>SC</span>
                <div className="hero-profile-waves">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>

              <div className="hero-profile-info">
                <div className="hero-profile-name">Sylvie Carond</div>
                <div className="hero-profile-role">Senior AE — Fintech</div>
              </div>

              <div className="hero-profile-menu">
                <button className="hero-profile-btn" aria-label="Mute microphone">
                  <Mic className="w-4 h-4" />
                </button>
                <button className="hero-profile-btn" aria-label="Pause">
                  <Pause className="w-4 h-4" />
                </button>
                <button className="hero-profile-btn record" aria-label="End call">
                  <Square className="w-4 h-4 fill-current" />
                </button>
              </div>
            </div>
          </div>

          {/* Card 3 — Performance score */}
          <div className="hero-card hero-card-3">
            <div className="hero-card-panel hero-score-card">
              <div className="hero-score-header">
                <span className="hero-score-label">Call Score</span>
                <span className="hero-score-badge">
                  <Sparkles className="w-3 h-3" />
                  <span>AI scored</span>
                </span>
              </div>

              <div className="hero-score-summary">
                <div className="hero-score-ring">
                  <svg viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="28" className="hero-score-ring-bg" />
                    <circle cx="32" cy="32" r="28" className="hero-score-ring-progress" />
                  </svg>
                  <div className="hero-score-value">
                    <span className="hero-score-number">84</span>
                    <span className="hero-score-denom">/100</span>
                  </div>
                </div>
                <div className="hero-score-stamp">
                  <Target className="w-3.5 h-3.5" />
                  <span>Ninja</span>
                </div>
              </div>

              <div className="hero-score-rows">
                <div className="hero-score-row">
                  <span className="hero-score-title">Introduction</span>
                  <span className="hero-score-percent">92%</span>
                  <div className="hero-score-bar"><div></div></div>
                </div>
                <div className="hero-score-row">
                  <span className="hero-score-title">Discovery</span>
                  <span className="hero-score-percent">88%</span>
                  <div className="hero-score-bar"><div></div></div>
                </div>
                <div className="hero-score-row">
                  <span className="hero-score-title">Argumentation</span>
                  <span className="hero-score-percent">76%</span>
                  <div className="hero-score-bar"><div></div></div>
                </div>
                <div className="hero-score-row">
                  <span className="hero-score-title">Conclusion</span>
                  <span className="hero-score-percent">81%</span>
                  <div className="hero-score-bar"><div></div></div>
                </div>
                <div className="hero-score-row">
                  <span className="hero-score-title">Posture</span>
                  <span className="hero-score-percent">85%</span>
                  <div className="hero-score-bar"><div></div></div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4 — Workspaces */}
          <div className="hero-card hero-card-4">
            <div className="hero-card-panel hero-workspace-card">
              <div className="hero-card-header hero-workspace-header">
                <div className="hero-card-meta">
                  <div className="hero-card-title">Workspaces</div>
                  <div className="hero-card-subtitle">Switch teams in one click</div>
                </div>
              </div>

              <div className="hero-workspace-list">
                <div className="hero-workspace-item hero-workspace-active">
                  <div className="hero-workspace-avatar">AC</div>
                  <div className="hero-workspace-info">
                    <div className="hero-workspace-name">Acme Corp</div>
                    <div className="hero-workspace-plan">Growth · Admin</div>
                  </div>
                  <div className="hero-workspace-check">
                    <svg viewBox="0 0 20 20" className="hero-workspace-check-svg">
                      <circle cx="10" cy="10" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
                      <path d="M6 10 L9 13 L14 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>

                <div className="hero-workspace-item">
                  <div className="hero-workspace-avatar hero-workspace-avatar-2">NB</div>
                  <div className="hero-workspace-info">
                    <div className="hero-workspace-name">Northbridge</div>
                    <div className="hero-workspace-plan">Starter · Member</div>
                  </div>
                </div>

                <div className="hero-workspace-item">
                  <div className="hero-workspace-avatar hero-workspace-avatar-3">ST</div>
                  <div className="hero-workspace-info">
                    <div className="hero-workspace-name">Stripe Labs</div>
                    <div className="hero-workspace-plan">Enterprise · Member</div>
                  </div>
                </div>
              </div>

              <div className="hero-workspace-illustration">
                <svg viewBox="0 0 240 120" aria-hidden="true">
                  <defs>
                    <linearGradient id="hero-workspace-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ff6b45" stopOpacity="0.12" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0.08" />
                    </linearGradient>
                  </defs>
                  <rect x="20" y="30" width="80" height="70" rx="12" fill="#f8f8f6" stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
                  <rect x="40" y="50" width="40" height="6" rx="3" fill="#e5e5e5" />
                  <rect x="40" y="62" width="30" height="4" rx="2" fill="#e5e5e5" />
                  <rect x="40" y="72" width="35" height="4" rx="2" fill="#e5e5e5" />
                  <circle cx="45" cy="42" r="10" fill="url(#hero-workspace-grad)" />
                  <rect x="130" y="30" width="90" height="70" rx="12" fill="url(#hero-workspace-grad)" stroke="rgba(255,107,69,0.2)" strokeWidth="1.5" />
                  <circle cx="150" cy="52" r="12" fill="#ff6b45" fillOpacity="0.15" />
                  <text x="150" y="56" textAnchor="middle" fontSize="10" fontWeight="700" fill="#ff6b45">AC</text>
                  <rect x="170" y="48" width="36" height="5" rx="2.5" fill="#ff6b45" fillOpacity="0.2" />
                  <rect x="170" y="58" width="28" height="4" rx="2" fill="#ff6b45" fillOpacity="0.12" />
                  <path d="M120 65 L130 65" stroke="#ff6b45" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 2" />
                  <circle cx="125" cy="65" r="4" fill="#ff6b45" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
