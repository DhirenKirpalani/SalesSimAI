"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { CustomScenarioCard } from "@/components/cards/CustomScenarioCard";
import { Button } from "@/components/ui/button";
import { CustomScenario } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Plus, Mic, DollarSign, Users, Briefcase, Handshake, Headphones, Package, Presentation, Languages } from "lucide-react";
import { motion } from "framer-motion";
import { PageHeaderLogo } from "@/components/layout/PageHeaderLogo";
import { useMediaQuery } from "@/hooks/use-media-query";

const CATEGORY_META: Record<string, { title: string; icon: typeof Mic; color: string; scenarios: string[] }> = {
  interviews: {
    title: "Interviews",
    icon: Mic,
    color: "text-blue-600 bg-blue-500/10",
    scenarios: ["Tell Me About Yourself", "Behavioral Interview", "Product Manager Interview", "Sales Interview"],
  },
  sales: {
    title: "Sales",
    icon: DollarSign,
    color: "text-emerald-600 bg-emerald-500/10",
    scenarios: ["Cold Call", "Discovery Call", "Objection Handling", "Enterprise Demo"],
  },
  leadership: {
    title: "Leadership",
    icon: Users,
    color: "text-purple-600 bg-purple-500/10",
    scenarios: ["Difficult Feedback", "Performance Review", "Managing Conflict", "Coaching a Team Member"],
  },
  corporate_communication: {
    title: "Corporate Communication",
    icon: Briefcase,
    color: "text-orange-600 bg-orange-500/10",
    scenarios: ["Saying No Professionally", "Managing Priorities", "Stakeholder Update", "Escalating an Issue"],
  },
  negotiation: {
    title: "Negotiation",
    icon: Handshake,
    color: "text-rose-600 bg-rose-500/10",
    scenarios: ["Salary Negotiation", "Budget Discussion", "Vendor Negotiation", "Scope Negotiation"],
  },
  customer_success: {
    title: "Customer Success",
    icon: Headphones,
    color: "text-cyan-600 bg-cyan-500/10",
    scenarios: ["Onboarding Call", "Renewal Discussion", "Handling Churn Risk", "Upsell Conversation"],
  },
  product_management: {
    title: "Product Management",
    icon: Package,
    color: "text-indigo-600 bg-indigo-500/10",
    scenarios: ["PRD Review", "Sprint Planning", "Roadmap Pitch", "Engineering Tradeoff"],
  },
  presentations: {
    title: "Presentations",
    icon: Presentation,
    color: "text-amber-600 bg-amber-500/10",
    scenarios: ["Investor Pitch", "Quarterly Review", "Product Launch", "Team All-Hands"],
  },
  professional_english: {
    title: "Professional English",
    icon: Languages,
    color: "text-teal-600 bg-teal-500/10",
    scenarios: ["Small Talk & Networking", "Email Tone Practice", "Meeting Participation", "Presentation Delivery"],
  },
};

export default function CategoryPage() {
  const router = useRouter();
  const params = useParams();
  const isMobile = useMediaQuery("(max-width: 640px)");
  const categoryValue = params.category as string;
  const meta = CATEGORY_META[categoryValue];

  const [customScenarios, setCustomScenarios] = useState<CustomScenario[]>([]);
  const [platformScenarios, setPlatformScenarios] = useState<CustomScenario[]>([]);
  const [loading, setLoading] = useState(true);

  const loadScenarios = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();
    const organizationId = userProfile?.organization_id ?? null;

    let query = supabase
      .from("custom_scenarios")
      .select("id, user_id, created_by, organization_id, member_name, member_role, seller_company, seller_product, seller_description, preset_persona_id, custom_persona, scenario_type, product_type, difficulty, duration, context_note, name, avatar_id, avatar_name, voice_id, voice_avatar_image_url, elevenlabs_voice_id, scoring_criteria, evaluation_framework, created_at")
      .eq("product_type", categoryValue)
      .order("created_at", { ascending: false });
    if (organizationId) {
      query = query.eq("organization_id", organizationId);
    } else {
      query = query.eq("user_id", user.id);
    }
    const { data: customData } = await query;
    if (customData) setCustomScenarios(customData as CustomScenario[]);

    const { data: platformData, error: platformError } = await supabase
      .from("platform_scenarios")
      .select("id, created_by, organization_id, seller_company, seller_product, seller_description, preset_persona_id, custom_persona, scenario_type, product_type, difficulty, duration, context_note, name, scoring_criteria, evaluation_framework, created_at")
      .eq("product_type", categoryValue)
      .order("created_at", { ascending: false });
    if (platformError) console.error("[platform_scenarios] query error:", platformError.message);
    if (platformData) setPlatformScenarios(platformData as CustomScenario[]);
  }, [categoryValue]);

  useEffect(() => {
    loadScenarios().finally(() => setLoading(false));
  }, [loadScenarios]);

  const allScenarios = useMemo(
    () => [...customScenarios, ...platformScenarios],
    [customScenarios, platformScenarios]
  );

  if (!meta) {
    return (
      <div className="max-w-2xl mx-auto py-8 text-center">
        <p className="text-muted-foreground">Category not found.</p>
        <Button variant="outline" className="mt-4 rounded-xl" onClick={() => router.push("/scenarios")}>
          Back to Practice
        </Button>
      </div>
    );
  }

  const Icon = meta.icon;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-9 w-48 bg-muted rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-muted rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl h-9 w-9 shrink-0"
            onClick={() => router.push("/scenarios")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <PageHeaderLogo />
            <div className="flex items-center gap-2.5 mt-1">
              <div className={`p-2 rounded-lg ${meta.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">{meta.title}</h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              Practice {meta.title.toLowerCase()} scenarios with AI personas. Click a scenario to start practicing, or create your own.
            </p>
          </div>
        </div>
        <Button
          onClick={() => router.push(`/scenarios/create?category=${categoryValue}`)}
          className="w-full sm:w-auto rounded-lg gap-2 flex-shrink-0 bg-orange-500 hover:bg-orange-600 text-white h-11"
        >
          <Plus className="w-4 h-4" />
          Create Scenario
        </Button>
      </div>

      {/* Scenarios — playable if seeded, otherwise link to create form */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <h2 className="text-sm font-semibold text-foreground">Scenarios</h2>
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{meta.scenarios.length}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {meta.scenarios.map((name, i) => {
            const platformMatch = platformScenarios.find((s) => s.name === name);
            if (platformMatch) {
              return (
                <motion.div
                  key={platformMatch.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                >
                  <CustomScenarioCard scenario={platformMatch} onDeleted={loadScenarios} table="platform_scenarios" />
                </motion.div>
              );
            }
            return (
              <motion.div
                key={name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <button
                  onClick={() => router.push(`/scenarios/create?category=${categoryValue}&name=${encodeURIComponent(name)}`)}
                  className="group/tpl w-full rounded-2xl border border-border bg-card p-4 sm:p-5 text-left hover:shadow-md hover:border-primary/20 transition-all duration-300 hover:-translate-y-0.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground leading-tight">{name}</p>
                      <p className="text-xs text-muted-foreground mt-1">Click to start building this scenario</p>
                    </div>
                    <div className={`p-2 rounded-lg ${meta.color} shrink-0 transition-transform group-hover/tpl:scale-110`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* User's custom scenarios in this category */}
      {customScenarios.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <h2 className="text-sm font-semibold text-foreground">My Scenarios</h2>
            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{customScenarios.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {customScenarios.map((scenario, i) => (
              <motion.div
                key={scenario.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <CustomScenarioCard scenario={scenario} onDeleted={loadScenarios} />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state for user scenarios */}
      {allScenarios.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-10 px-4 border border-dashed border-border rounded-2xl bg-muted/30"
        >
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            You haven&apos;t created any {meta.title.toLowerCase()} scenarios yet. Pick a template below to get started.
          </p>
        </motion.div>
      )}
    </div>
  );
}
