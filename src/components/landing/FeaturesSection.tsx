"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Video, Mic, BarChart3, Shield, Sparkles, Users } from "lucide-react";
import { useRef } from "react";

const features = [
  {
    icon: Video,
    title: "Fintech Buyer Simulations",
    description:
      "Practice with AI buyers modeled on real fintech CFOs, compliance officers, and procurement leads. Face the exact objections your reps hear on live calls.",
  },
  {
    icon: Mic,
    title: "Voice-Powered Roleplay",
    description:
      "Speak naturally to AI buyers powered by ElevenLabs and OpenAI. Practice regulatory pushback, API integration concerns, and pricing negotiations in real time.",
  },
  {
    icon: BarChart3,
    title: "Performance Analytics",
    description:
      "Track rep readiness across deal stages, win-rate lift, objection-handling scores, and time-to-close improvements. Spot coaching gaps before they cost you deals.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description:
      "SOC 2 Type II certified with SSO, role-based access, and full audit trails. Built to meet the security standards your fintech buyers demand.",
  },
  {
    icon: Sparkles,
    title: "AI Coaching & Feedback",
    description:
      "Get instant, actionable feedback after every simulation. Sharpen compliance talk tracks, pricing pivots, and competitive differentiation for fintech deals.",
  },
  {
    icon: Users,
    title: "Sales Leader Dashboard",
    description:
      "Sales leaders get real-time visibility into team readiness, deal-win probability scores, and skill breakdowns tailored to B2B fintech selling motions.",
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
    <section id="features" ref={sectionRef} className="py-32 bg-background relative overflow-hidden">
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
            Built for the complexity of fintech sales
          </h2>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            From regulatory objections to multi-stakeholder deals, give your reps the reps they need to win in B2B fintech.
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
