"use client";

import { motion, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { useRef, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Cinematic particle system
const particles = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  size: Math.random() * 3 + 1,
  x: Math.random() * 100,
  y: Math.random() * 100,
  duration: Math.random() * 25 + 20,
  delay: Math.random() * 8,
  opacity: Math.random() * 0.5 + 0.1,
}));

const titleWords = ["Practice", "Sales", "Conversations", "with", "AI", "Buyers"];

function useMouseParallax() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 50, damping: 20 });
  const springY = useSpring(y, { stiffness: 50, damping: 20 });

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      x.set((e.clientX - cx) / cx);
      y.set((e.clientY - cy) / cy);
    };
    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, [x, y]);

  return { x: springX, y: springY };
}

export function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });
  const mouse = useMouseParallax();

  const bgY = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const midY = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.4], [1, 0]);
  const contentScale = useTransform(scrollYProgress, [0, 0.4], [1, 0.92]);
  const contentY = useTransform(scrollYProgress, [0, 0.4], [0, 60]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
    });
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative overflow-hidden bg-background min-h-[100dvh] flex items-center"
    >
      {/* Ultra-deep parallax: Layer 1 - slowest */}
      <motion.div
        style={{ y: bgY, x: useTransform(mouse.x, (v) => v * -20) }}
        className="absolute inset-0 pointer-events-none"
      >
        <div className="absolute top-[10%] left-[15%] w-[700px] h-[700px] bg-primary/[0.02] rounded-full blur-[150px]" />
        <div className="absolute bottom-[15%] right-[10%] w-[600px] h-[600px] bg-primary/[0.03] rounded-full blur-[180px]" />
      </motion.div>

      {/* Layer 2 - mid speed */}
      <motion.div
        style={{ y: midY, x: useTransform(mouse.x, (v) => v * -10) }}
        className="absolute inset-0 pointer-events-none"
      >
        <div className="absolute top-[30%] right-[25%] w-[450px] h-[450px] bg-primary/[0.03] rounded-full blur-[100px]" />
        <div className="absolute bottom-[25%] left-[30%] w-[350px] h-[350px] bg-primary/[0.02] rounded-full blur-[80px]" />
      </motion.div>

      {/* Animated radial glow pulse */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-primary/[0.02] rounded-full blur-[200px] pointer-events-none"
      />

      {/* Floating particles with mouse interaction */}
      {mounted && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute rounded-full"
              style={{
                width: p.size,
                height: p.size,
                left: `${p.x}%`,
                top: `${p.y}%`,
                background: "var(--color-primary)",
                opacity: p.opacity,
              }}
              animate={{
                y: [0, -40, 0],
                x: [0, 20, 0],
                opacity: [p.opacity * 0.4, p.opacity, p.opacity * 0.4],
                scale: [1, 1.5, 1],
              }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      )}

      {/* Cinematic diagonal light streak */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          background: "linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%)",
        }}
      />

      {/* Subtle noise texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.012]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "128px 128px",
        }}
      />

      {/* Content with parallax */}
      <motion.div
        style={{ opacity: contentOpacity, scale: contentScale, y: contentY }}
        className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center z-10"
      >
        {/* Glowing eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-sm px-5 py-2 text-xs font-medium text-primary mb-10"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          AI-Powered Sales Training Platform
        </motion.div>

        {/* Dramatic title reveal */}
        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight leading-[1.05] max-w-5xl mx-auto">
          {titleWords.map((word, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 60, rotateX: -40 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{
                delay: 0.4 + i * 0.1,
                duration: 0.7,
                ease: "easeOut",
              }}
              className={`inline-block mr-[0.3em] origin-bottom ${
                word === "AI" || word === "Buyers"
                  ? "text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary/80 to-primary/60"
                  : ""
              }`}
              style={{ perspective: 1000 }}
            >
              {word}
            </motion.span>
          ))}
        </h1>

        {/* Subtitle with mask reveal */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0, duration: 0.01 }}
          className="mt-10 max-w-2xl mx-auto overflow-hidden"
        >
          <motion.p
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.0, duration: 0.8, ease: "easeOut" }}
            className="text-lg sm:text-xl text-muted-foreground leading-relaxed"
          >
            Practice real-time voice and video calls with lifelike AI buyers. Built with HeyGen, ElevenLabs, and OpenAI for the most realistic sales training on earth.
          </motion.p>
        </motion.div>

        {/* CTA with elastic pop */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3, duration: 0.8, ease: "easeOut" }}
          className="mt-14 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          {isLoggedIn ? (
            <Link href="/dashboard">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Button
                  size="lg"
                  className="rounded-xl gap-2 text-sm px-10 py-7 shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-shadow"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Go to Dashboard
                </Button>
              </motion.div>
            </Link>
          ) : (
            <>
              <Link href="/signup">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Button
                    size="lg"
                    className="rounded-xl gap-2 text-sm px-10 py-7 shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-shadow"
                  >
                    Start Free Trial
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </motion.div>
              </Link>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-xl gap-2 text-sm px-10 py-7 border-2 hover:bg-muted/50"
                >
                  <Play className="w-4 h-4" />
                  Watch Demo
                </Button>
              </motion.div>
            </>
          )}
        </motion.div>

        {/* Bottom stats row with stagger */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6, duration: 0.8 }}
          className="mt-20 flex items-center justify-center gap-8 sm:gap-16"
        >
          {[
            { value: "500+", label: "Teams" },
            { value: "50K+", label: "Simulations" },
            { value: "94%", label: "Satisfaction" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.8 + i * 0.1, duration: 0.5 }}
              className="text-center"
            >
              <div className="text-2xl sm:text-3xl font-bold tracking-tight">{stat.value}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Scroll arrow */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.2, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted-foreground/40"
            >
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}
