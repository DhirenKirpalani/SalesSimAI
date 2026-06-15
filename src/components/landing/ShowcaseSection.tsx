"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Video, Mic, BarChart3, Zap } from "lucide-react";

const steps = [
  {
    icon: Video,
    title: "Pick Your Buyer",
    description: "Choose from AI avatars with distinct personalities — skeptical CFOs, cautious legal, fast-talking founders.",
  },
  {
    icon: Mic,
    title: "Start the Call",
    description: "Jump into a real-time voice and video call. Speak naturally. The AI hears you, sees you, and responds instantly.",
  },
  {
    icon: BarChart3,
    title: "Review the Playback",
    description: "Watch the recording with AI-generated scores on tone, pacing, objection handling, and closing technique.",
  },
  {
    icon: Zap,
    title: "Get Coaching",
    description: "Receive targeted coaching based on exactly where the deal slipped — not generic advice, your specific moments.",
  },
];

export function ShowcaseSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const imageY = useTransform(scrollYProgress, [0, 1], [120, -120]);
  const imageScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.82, 1, 0.82]);
  const imageRotate = useTransform(scrollYProgress, [0, 1], [-3, 3]);
  const card1Y = useTransform(scrollYProgress, [0, 1], [60, -180]);
  const card2Y = useTransform(scrollYProgress, [0, 1], [180, -60]);

  return (
    <section id="showcase" ref={sectionRef} className="py-32 bg-muted/30 relative overflow-hidden">
      {/* Large ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-primary/[0.03] rounded-full blur-[200px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 50, filter: "blur(10px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-20"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-block text-xs font-semibold text-primary uppercase tracking-widest mb-4"
          >
            How It Works
          </motion.span>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight">
            It feels like a real call
          </h2>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Because it basically is. Real-time video, real-time voice, real objections.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Steps */}
          <div className="space-y-12">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: -50, filter: "blur(6px)" }}
                whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.7, delay: i * 0.12, ease: "easeOut" }}
                className="flex gap-5 group"
              >
                <div className="flex flex-col items-center">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary shrink-0"
                  >
                    <step.icon className="w-6 h-6" />
                  </motion.div>
                  {i < steps.length - 1 && (
                    <motion.div
                      initial={{ scaleY: 0 }}
                      whileInView={{ scaleY: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: i * 0.12 + 0.3 }}
                      className="w-px h-12 bg-gradient-to-b from-border to-transparent mt-4 origin-top"
                    />
                  )}
                </div>
                <div className="pt-1">
                  <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Video call mockup */}
          <motion.div
            style={{ y: imageY, scale: imageScale, rotate: imageRotate }}
            className="relative hidden lg:block"
          >
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.3 }}
              className="relative"
            >
              {/* Main video call card */}
              <div className="rounded-3xl border bg-card shadow-2xl shadow-primary/5 overflow-hidden">
                {/* Browser chrome */}
                <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <div className="flex-1 text-center">
                    <span className="text-[10px] text-muted-foreground font-mono">sales-sim.ai / call</span>
                  </div>
                </div>

                {/* Video grid */}
                <div className="p-4 space-y-3">
                  {/* AI Buyer - large tile */}
                  <div className="relative rounded-2xl bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 aspect-video flex items-end p-4 overflow-hidden">
                    {/* Ambient lighting */}
                    <div className="absolute inset-0 opacity-40">
                      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
                      <div className="absolute top-1/3 left-1/4 w-24 h-24 rounded-full bg-primary/15 blur-2xl" />
                      <div className="absolute bottom-1/4 right-1/4 w-20 h-20 rounded-full bg-blue-500/10 blur-xl" />
                    </div>
                    {/* AI Buyer — real woman photo */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                      <div className="relative w-28 h-28">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/25 to-blue-500/15 blur-lg" />
                        <div className="relative w-28 h-28 rounded-full border-2 border-primary/30 overflow-hidden">
                          <img
                            src="https://i.pravatar.cc/300?img=5"
                            alt="Margaret Walsh"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {/* Speaking ring */}
                        <div className="absolute -inset-2 rounded-full border-2 border-primary/15 animate-pulse" />
                      </div>
                    </div>
                    {/* Live indicator */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-[9px] text-white/90 font-medium">LIVE</span>
                    </div>
                    {/* Connection quality */}
                    <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2 py-0.5">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-400"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
                      <span className="text-[8px] text-white/70">Excellent</span>
                    </div>
                    {/* Name badge */}
                    <div className="relative z-10 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1.5">
                      <p className="text-[10px] text-white/90 font-medium">Margaret Walsh</p>
                      <p className="text-[9px] text-white/50">CFO, Summit Industries</p>
                    </div>
                  </div>

                  {/* Self view - salesperson tile */}
                  <div className="flex gap-3">
                    <div className="relative w-36 h-20 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 overflow-hidden">
                      {/* Background office blur */}
                      <div className="absolute inset-0 opacity-30">
                        <div className="absolute top-2 right-4 w-8 h-8 rounded-full bg-amber-500/20 blur-lg" />
                        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/40 to-transparent" />
                      </div>
                      {/* Salesperson avatar — real person photo */}
                      <div className="absolute bottom-2 left-2 flex items-center gap-2">
                        <div className="relative w-9 h-9 rounded-full border border-white/20 overflow-hidden">
                          <img
                            src="https://i.pravatar.cc/150?img=12"
                            alt="John Doe"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <span className="text-[8px] text-white/80 font-medium block">John Doe</span>
                          <span className="text-[7px] text-white/50">Account Executive</span>
                        </div>
                      </div>
                      {/* Voice wave indicator */}
                      <div className="absolute top-2 right-2 flex items-end gap-0.5 h-3">
                        {[0.4, 0.7, 1, 0.6, 0.8].map((h, i) => (
                          <motion.div
                            key={i}
                            animate={{ height: [h * 12, h * 6, h * 12] }}
                            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
                            className="w-0.5 bg-emerald-400/80 rounded-full"
                          />
                        ))}
                      </div>
                    </div>
                    {/* Call controls */}
                    <div className="flex-1 flex items-center justify-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 004.24 1.09 2 2 0 011.82 2v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.42 19.42 0 01-3.33-2.67m0 0a19.79 19.79 0 01-3.07-8.63A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L7.09 9.91"/></svg>
                      </div>
                      <div className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-white/70"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>
                      </div>
                      <div className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-white/70"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Transcription bar */}
                <div className="px-4 pb-4">
                  <div className="rounded-xl bg-muted/50 p-3 space-y-1.5">
                    <p className="text-[10px] text-muted-foreground">
                      <span className="text-primary font-medium">Margaret:</span> We are already 12% over budget. I need a bulletproof ROI case before I sign off.
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 italic">
                      Listening...
                    </p>
                  </div>
                </div>
              </div>

              {/* Floating score card */}
              <motion.div
                style={{ y: card1Y }}
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-6 -right-6 rounded-2xl border bg-card shadow-xl p-4 w-44"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Live Score</p>
                </div>
                <p className="text-3xl font-bold">84</p>
                <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: "84%" }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.5, delay: 0.5 }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                  />
                </div>
              </motion.div>

              {/* Floating transcript card */}
              <motion.div
                style={{ y: card2Y }}
                animate={{ y: [0, 12, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute -bottom-4 -left-4 rounded-2xl border bg-card shadow-xl p-4 w-40"
              >
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Sentiment</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-xs font-medium">Skeptical</span>
                </div>
                <p className="text-[9px] text-muted-foreground mt-1">Buyer is probing for weak points</p>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
