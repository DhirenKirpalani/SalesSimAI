"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Video, Mic, BarChart3, Shield, Sparkles, Users } from "lucide-react";
import { useRef } from "react";

const features = [
  {
    icon: Video,
    title: "AI Video Simulations",
    description:
      "Practice with lifelike AI buyers in real-time video calls. Face objections, negotiations, and tough questions just like on a real Zoom call.",
  },
  {
    icon: Mic,
    title: "Voice-Powered Roleplay",
    description:
      "Speak naturally to AI buyers powered by ElevenLabs and OpenAI. The conversation flows in real-time with tone, urgency, and personality.",
  },
  {
    icon: BarChart3,
    title: "Performance Analytics",
    description:
      "Track simulations completed, average scores, best performances, and training time. Visualize trends and score distributions over time.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description:
      "SOC 2 Type II certified with SSO, role-based access, and full audit trails. Your call data and recordings are encrypted and secure.",
  },
  {
    icon: Sparkles,
    title: "AI Coaching & Feedback",
    description:
      "Get instant, actionable feedback after every simulation. Identify weak points, improve objection handling, and close more deals.",
  },
  {
    icon: Users,
    title: "Team Dashboard",
    description:
      "Managers get real-time visibility into team activity, scores, skill breakdowns, and coaching recommendations for every rep.",
  },
];

export function FeaturesSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const titleY = useTransform(scrollYProgress, [0, 0.3], [60, 0]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.2], [0, 1]);

  return (
    <section ref={sectionRef} className="py-32 bg-background relative overflow-hidden">
      {/* Subtle background gradient shift */}
      <motion.div
        style={{ opacity: useTransform(scrollYProgress, [0, 0.5], [0, 0.5]) }}
        className="absolute inset-0 pointer-events-none"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/[0.02] rounded-full blur-[150px]" />
      </motion.div>

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
            Features
          </motion.span>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight">
            Everything you need to close more deals
          </h2>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            A complete training platform built for modern revenue teams who want to win more competitive deals.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" style={{ perspective: 1000 }}>
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 60, rotateX: 15 }}
              whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, delay: i * 0.12, ease: "easeOut" }}
              className="group"
            >
              <motion.div
                whileHover={{ y: -10, transition: { duration: 0.3, ease: "easeOut" } }}
              >
                <Card className="rounded-2xl border bg-card/80 backdrop-blur-sm shadow-sm hover:shadow-2xl hover:shadow-primary/[0.07] transition-all duration-500 h-full border-transparent hover:border-primary/30 relative overflow-hidden">
                  {/* Hover glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <CardContent className="p-8 space-y-4 relative z-10">
                    <motion.div
                      whileHover={{ rotate: 8, scale: 1.15 }}
                      transition={{ type: "spring", stiffness: 300, damping: 15 }}
                      className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary"
                    >
                      <f.icon className="w-6 h-6" />
                    </motion.div>
                    <h3 className="font-semibold text-lg group-hover:text-primary transition-colors duration-300">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
