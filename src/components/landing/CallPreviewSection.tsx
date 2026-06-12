"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export function CallPreviewSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [80, -80]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.9, 1, 0.9]);

  return (
    <section ref={sectionRef} className="py-24 bg-background relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] bg-primary/[0.02] rounded-full blur-[180px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 50, filter: "blur(10px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-16"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-block text-xs font-semibold text-primary uppercase tracking-widest mb-4"
          >
            In Action
          </motion.span>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight">
            See it in action
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            A live sales call between your rep and an AI buyer. Real objections. Real pressure. Real practice.
          </p>
        </motion.div>

        {/* Large video call illustration */}
        <motion.div
          style={{ y, scale }}
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.2 }}
          className="relative"
        >
          <div className="rounded-3xl border bg-card shadow-2xl shadow-primary/5 overflow-hidden">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-5 py-3.5 border-b bg-muted/30">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-400" />
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="w-3 h-3 rounded-full bg-emerald-400" />
              </div>
              <div className="flex-1 text-center">
                <span className="text-[11px] text-muted-foreground font-mono">sales-sim.ai / simulation / margaret-walsh</span>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-500/10 rounded-full px-2.5 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-medium text-emerald-600">Recording</span>
              </div>
            </div>

            {/* Video call grid — 2 participants side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
              {/* Salesperson — left */}
              <div className="relative rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 aspect-[4/3] overflow-hidden">
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-4 right-4 w-16 h-16 rounded-full bg-amber-500/20 blur-2xl" />
                  <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/50 to-transparent" />
                </div>
                {/* Centered avatar */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="relative w-24 h-24">
                    <div className="absolute inset-0 rounded-full bg-primary/20 blur-lg" />
                    <div className="relative w-24 h-24 rounded-full border-2 border-white/20 overflow-hidden">
                      <img
                        src="https://i.pravatar.cc/300?img=12"
                        alt="John Doe"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>
                {/* Name badge */}
                <div className="absolute bottom-4 left-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1.5">
                    <p className="text-[11px] text-white/90 font-medium">John Doe</p>
                    <p className="text-[9px] text-white/50">Account Executive — You</p>
                  </div>
                </div>
                {/* Voice wave */}
                <div className="absolute top-4 right-4 flex items-end gap-0.5 h-4">
                  {[0.3, 0.6, 1, 0.5, 0.8, 0.4, 0.9].map((h, i) => (
                    <motion.div
                      key={i}
                      animate={{ height: [h * 16, h * 8, h * 16] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.08 }}
                      className="w-1 bg-emerald-400/70 rounded-full"
                    />
                  ))}
                </div>
              </div>

              {/* AI Buyer — right */}
              <div className="relative rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 aspect-[4/3] overflow-hidden">
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-1/3 left-1/4 w-20 h-20 rounded-full bg-primary/20 blur-2xl" />
                  <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/50 to-transparent" />
                </div>
                {/* Centered avatar */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="relative w-24 h-24">
                    <div className="absolute inset-0 rounded-full bg-primary/20 blur-lg" />
                    <div className="relative w-24 h-24 rounded-full border-2 border-primary/30 overflow-hidden">
                      <img
                        src="https://i.pravatar.cc/300?img=5"
                        alt="Margaret Walsh"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {/* AI indicator ring */}
                    <div className="absolute -inset-2 rounded-full border-2 border-primary/20 animate-pulse" />
                  </div>
                </div>
                {/* Name badge */}
                <div className="absolute bottom-4 left-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1.5">
                    <p className="text-[11px] text-white/90 font-medium">Margaret Walsh</p>
                    <p className="text-[9px] text-white/50">CFO, Summit Industries — AI Buyer</p>
                  </div>
                </div>
                {/* Connection quality */}
                <div className="absolute top-4 right-4 flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-400">
                    <path d="M18 20V10M12 20V4M6 20v-6"/>
                  </svg>
                  <span className="text-[9px] text-white/70">Excellent</span>
                </div>
              </div>
            </div>

            {/* Bottom bar — transcript + controls */}
            <div className="px-4 pb-4 space-y-3">
              {/* Live transcript */}
              <div className="rounded-xl bg-muted/40 p-3.5">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[8px] font-bold text-primary">AI</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      <span className="text-foreground font-medium">Margaret:</span> I have looked at three vendors this quarter. Every single one promised 3x ROI in six months. None delivered. Why should I believe your numbers?
                    </p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="text-[9px] text-muted-foreground/60 italic">Suggested response:</span>
                      <span className="text-[9px] text-primary/70 bg-primary/5 rounded px-1.5 py-0.5">Acknowledge the skepticism → Pivot to proof → Ask for a small trial</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls bar */}
              <div className="flex items-center justify-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-white/60"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-white/60"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                </div>
                <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 004.24 1.09 2 2 0 011.82 2v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.42 19.42 0 01-3.33-2.67m0 0a19.79 19.79 0 01-3.07-8.63A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L7.09 9.91"/></svg>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-white/60"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/20 backdrop-blur-sm border border-primary/20 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-primary"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
