"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Rachel Kim",
    role: "VP of Sales",
    org: "CloudScale",
    quote:
      "Day1 reduced our onboarding time by 40%. New reps are confidently handling objections within two weeks instead of two months.",
    initials: "RK",
  },
  {
    name: "Marcus Chen",
    role: "Enablement Director",
    org: "Vertex Labs",
    quote:
      "The scenario fidelity is remarkable. Our team practices with personas that feel exactly like our actual prospects.",
    initials: "MC",
  },
  {
    name: "Sophia Alvarez",
    role: "Account Executive",
    org: "NovaTech",
    quote:
      "I run a simulation before every big pitch. My close rate improved from 18% to 31% in one quarter.",
    initials: "SA",
  },
  {
    name: "James Wright",
    role: "Sales Manager",
    org: "Apex Solutions",
    quote:
      "Finally, a training tool that reps actually want to use. The competitive leaderboard drives real engagement.",
    initials: "JW",
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Loved by revenue teams worldwide
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            Join hundreds of companies using Day1 to build world-class sales teams.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <Card className="rounded-2xl border bg-card shadow-sm h-full">
                <CardContent className="p-6 space-y-4">
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                  <div className="flex items-center gap-3 pt-2">
                    <Avatar className="h-9 w-9 border">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {t.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.role}, {t.org}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
