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
    question: "How realistic are the AI buyer personas?",
    answer:
      "Our AI buyers are built from thousands of real sales call transcripts and are designed to mirror specific personality types, industries, and objection patterns. They adapt in real-time based on your responses.",
  },
  {
    question: "Can I create custom scenarios for my product?",
    answer:
      "Yes. Growth and Enterprise plans allow you to create custom scenarios with your own buyer personas, product details, and competitive dynamics. Enterprise customers also get help from our team to build scenarios.",
  },
  {
    question: "Is there a mobile app?",
    answer:
      "SalesSim AI is fully responsive and works great on mobile browsers. A native iOS and Android app is on the roadmap for Q3 2024.",
  },
  {
    question: "How is my data secured?",
    answer:
      "We are SOC 2 Type II certified and GDPR compliant. All data is encrypted at rest and in transit. Enterprise plans include SSO, SCIM provisioning, and audit logs.",
  },
  {
    question: "Can managers track team progress?",
    answer:
      "Absolutely. The admin dashboard gives managers real-time visibility into team activity, scores, skill breakdowns, and coaching recommendations.",
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
            Everything you need to know about SalesSim AI.
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
