"use client";

import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How realistic are the fintech buyer personas?",
    answer:
      "Our AI buyers are trained on thousands of real fintech sales calls. They mirror the exact objections, negotiation tactics, and compliance questions your reps face from CFOs, risk officers, and procurement leads in live deals.",
  },
  {
    question: "Can I create custom scenarios for our fintech product?",
    answer:
      "Yes. Growth and Enterprise plans let you build custom scenarios tailored to your specific buyer personas, regulatory context, and competitive landscape. Enterprise customers get white-glove scenario setup from our team.",
  },
  {
    question: "How do sales leaders track team readiness?",
    answer:
      "The Sales Leader Dashboard shows win-rate lift, objection-handling scores, deal-stage readiness, and coaching gaps in real time. Leaders can identify which reps need help before deals are on the line.",
  },
  {
    question: "How is our sales data secured?",
    answer:
      "We are SOC 2 Type II certified and GDPR compliant. All call recordings and simulation data are encrypted at rest and in transit. Enterprise plans include SSO, SCIM provisioning, and full audit trails.",
  },
  {
    question: "What types of fintech buyers can reps practice with?",
    answer:
      "Reps can practice with AI buyers modeled on CFOs, Chief Risk Officers, compliance leads, procurement teams, and technical buyers. Each persona has realistic pain points, goals, and objection patterns specific to B2B fintech.",
  },
];

export function FAQSection() {
  return (
    <section className="py-32 bg-background relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/[0.02] rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40, filter: "blur(10px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-20"
        >
          <span className="inline-block text-xs font-semibold text-primary uppercase tracking-widest mb-4">
            FAQ
          </span>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight">
            Frequently asked questions
          </h2>
          <p className="mt-6 text-lg text-muted-foreground">
            Everything sales leaders need to know about SalesSim AI.
          </p>
        </motion.div>

        <Accordion className="space-y-3">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: "easeOut" }}
            >
              <AccordionItem
                value={`item-${i}`}
                className="rounded-2xl border bg-card/80 backdrop-blur-sm px-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <AccordionTrigger className="text-sm font-medium py-5 hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            </motion.div>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
