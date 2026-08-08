"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Mic, DollarSign, Users, Briefcase, Handshake, Headphones, Package, Presentation, Languages, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { PageHeaderLogo } from "@/components/layout/PageHeaderLogo";

const FEATURED_COLLECTIONS = [
  {
    icon: Mic,
    title: "Interviews",
    value: "interviews",
    color: "text-blue-600 bg-blue-500/10",
    scenarios: ["Tell Me About Yourself", "Behavioral Interview", "Product Manager Interview", "Sales Interview"],
  },
  {
    icon: DollarSign,
    title: "Sales",
    value: "sales",
    color: "text-emerald-600 bg-emerald-500/10",
    scenarios: ["Cold Call", "Discovery Call", "Objection Handling", "Enterprise Demo"],
  },
  {
    icon: Users,
    title: "Leadership",
    value: "leadership",
    color: "text-purple-600 bg-purple-500/10",
    scenarios: ["Difficult Feedback", "Performance Review", "Managing Conflict", "Coaching a Team Member"],
  },
  {
    icon: Briefcase,
    title: "Corporate Communication",
    value: "corporate_communication",
    color: "text-orange-600 bg-orange-500/10",
    scenarios: ["Saying No Professionally", "Managing Priorities", "Stakeholder Update", "Escalating an Issue"],
  },
  {
    icon: Handshake,
    title: "Negotiation",
    value: "negotiation",
    color: "text-rose-600 bg-rose-500/10",
    scenarios: ["Salary Negotiation", "Budget Discussion", "Vendor Negotiation", "Scope Negotiation"],
  },
  {
    icon: Headphones,
    title: "Customer Success",
    value: "customer_success",
    color: "text-cyan-600 bg-cyan-500/10",
    scenarios: ["Onboarding Call", "Renewal Discussion", "Handling Churn Risk", "Upsell Conversation"],
  },
  {
    icon: Package,
    title: "Product Management",
    value: "product_management",
    color: "text-indigo-600 bg-indigo-500/10",
    scenarios: ["PRD Review", "Sprint Planning", "Roadmap Pitch", "Engineering Tradeoff"],
  },
  {
    icon: Presentation,
    title: "Presentations",
    value: "presentations",
    color: "text-amber-600 bg-amber-500/10",
    scenarios: ["Investor Pitch", "Quarterly Review", "Product Launch", "Team All-Hands"],
  },
  {
    icon: Languages,
    title: "Professional English",
    value: "professional_english",
    color: "text-teal-600 bg-teal-500/10",
    scenarios: ["Small Talk & Networking", "Email Tone Practice", "Meeting Participation", "Presentation Delivery"],
  },
];

export default function ScenariosPage() {
  const router = useRouter();

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="max-w-2xl">
          <PageHeaderLogo />
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">Practice Conversations</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-2">
            Sharpen your skills with AI-powered role-play. Get real-time feedback after every session.
          </p>
        </div>
        <Button
          onClick={() => router.push("/scenarios/create")}
          className="rounded-xl gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Create Scenario
        </Button>
      </div>

      {/* Category cards */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <h2 className="text-sm font-semibold text-foreground">Categories</h2>
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{FEATURED_COLLECTIONS.length}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {FEATURED_COLLECTIONS.map((cat, i) => (
            <motion.div
              key={cat.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.03 }}
            >
              <button
                onClick={() => router.push(`/scenarios/category/${cat.value}`)}
                className="group/cat w-full rounded-xl border border-border bg-card p-4 flex flex-col items-center gap-2.5 hover:border-primary/30 hover:bg-accent/50 transition-colors"
              >
                <div className={`p-2.5 rounded-lg ${cat.color}`}>
                  <cat.icon className="w-5 h-5" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-foreground text-center leading-tight">{cat.title}</span>
                <span className="text-[10px] text-muted-foreground">{cat.scenarios.length} scenarios</span>
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Custom scenarios section — link to categories instead */}
    </div>
  );
}
