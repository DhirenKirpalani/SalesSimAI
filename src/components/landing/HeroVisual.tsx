export function HeroVisual() {
  return (
    <div className="hero-visual-wrapper">
      <div className="hero-stage">
        <div className="hero-tilt">
          {/* Card 1 — AI Call Intel / Discovery Session */}
          <div className="hero-card hero-card-1">
            <div className="hero-card-panel">
              <div className="hero-card-tag">🎙️ AI Call Intel</div>
              <h4>Discovery Session</h4>
              <div className="hero-skeleton-lines">
                <div className="hero-skeleton-line" style={{ width: "85%" }}></div>
                <div className="hero-skeleton-line" style={{ width: "60%" }}></div>
                <div className="hero-skeleton-line highlight" style={{ width: "92%" }}></div>
                <div className="hero-skeleton-line" style={{ width: "70%" }}></div>
              </div>
              <div className="hero-card-cta">Let&apos;s go →</div>
            </div>
          </div>

          {/* Card 2 — Live coaching profile */}
          <div className="hero-card hero-card-2">
            <div className="hero-card-panel hero-profile-card">
              <div className="hero-profile-circle">
                🎯
                <div className="hero-profile-waves">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
              <div>
                <div className="hero-profile-name">Sylvie Carond</div>
                <div className="hero-profile-role">Senior AE — Fintech</div>
              </div>
              <div className="hero-profile-menu">
                <div className="hero-profile-btn">🎙️</div>
                <div className="hero-profile-btn">⏸</div>
                <div className="hero-profile-btn record">■</div>
              </div>
            </div>
          </div>

          {/* Card 3 — Performance score */}
          <div className="hero-card hero-card-3">
            <div className="hero-card-panel hero-score-card">
              <div className="hero-score-header">
                <span className="hero-score-label">Performance</span>
                <span className="hero-score-badge">✨ AI scored</span>
              </div>
              <div className="hero-score-stamp">🎯 Ninja</div>
              <div className="hero-score-rows">
                <div className="hero-score-row">
                  <span className="hero-score-title">Introduction</span>
                  <div className="hero-score-bar"><div></div></div>
                </div>
                <div className="hero-score-row">
                  <span className="hero-score-title">Discovery</span>
                  <div className="hero-score-bar"><div></div></div>
                </div>
                <div className="hero-score-row">
                  <span className="hero-score-title">Argumentation</span>
                  <div className="hero-score-bar"><div></div></div>
                </div>
                <div className="hero-score-row">
                  <span className="hero-score-title">Conclusion</span>
                  <div className="hero-score-bar"><div></div></div>
                </div>
                <div className="hero-score-row">
                  <span className="hero-score-title">Posture</span>
                  <div className="hero-score-bar"><div></div></div>
                </div>
                <div className="hero-score-row">
                  <span className="hero-score-title">Total</span>
                  <div className="hero-score-bar"><div></div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
