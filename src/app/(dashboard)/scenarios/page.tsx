"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CustomScenarioCard } from "@/components/cards/CustomScenarioCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CustomScenario } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { Search, Plus, Sparkles, FileText, Inbox } from "lucide-react";
import { motion } from "framer-motion";
import { PageHeaderLogo } from "@/components/layout/PageHeaderLogo";
import { AnimatedPlaceholder } from "@/components/ui/animated-placeholder";
import { useMediaQuery } from "@/hooks/use-media-query";

const PRODUCT_TYPES = [
  { value: "All", label: "All Products" },
  { value: "payment", label: "Payment" },
  { value: "eor", label: "EoR" },
  { value: "cards", label: "Cards" },
];

export default function ScenariosPage() {
  const router = useRouter();
  const isMobile = useMediaQuery("(max-width: 640px)");
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("All");
  const [productType, setProductType] = useState("All");
  const [customScenarios, setCustomScenarios] = useState<CustomScenario[]>([]);
  const [platformDbScenarios, setPlatformDbScenarios] = useState<CustomScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);

  const loadCustomScenarios = useCallback(async () => {
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
      .order("created_at", { ascending: false });
    if (organizationId) {
      query = query.eq("organization_id", organizationId);
    } else {
      query = query.eq("user_id", user.id);
    }
    const { data, error } = await query;
    if (error) {
      console.error("[loadCustomScenarios] error:", error);
    }
    if (data) setCustomScenarios(data as CustomScenario[]);
  }, []);

  const loadPlatformScenarios = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("platform_scenarios")
      .select("id, user_id, created_by, organization_id, member_name, member_role, seller_company, seller_product, seller_description, preset_persona_id, custom_persona, scenario_type, product_type, difficulty, duration, context_note, name, avatar_id, avatar_name, voice_id, voice_avatar_image_url, elevenlabs_voice_id, scoring_criteria, evaluation_framework, created_at")
      .order("created_at", { ascending: false });
    if (data) setPlatformDbScenarios(data as CustomScenario[]);
  }, []);

  useEffect(() => {
    Promise.all([loadCustomScenarios(), loadPlatformScenarios()]).finally(() => setLoading(false));
  }, [loadCustomScenarios, loadPlatformScenarios]);

  const allDbScenarios = useMemo(
    () => [...customScenarios, ...platformDbScenarios],
    [customScenarios, platformDbScenarios]
  );

  const difficulties = ["All", "Beginner", "Intermediate", "Advanced", "Expert"];

  const filteredCustom = useMemo(() => {
    return customScenarios.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.seller_product.toLowerCase().includes(search.toLowerCase());
      const matchesDifficulty = difficulty === "All" || s.difficulty === difficulty;
      const matchesProduct = productType === "All" || s.product_type === productType;
      return matchesSearch && matchesDifficulty && matchesProduct;
    });
  }, [customScenarios, search, difficulty, productType]);

  const filteredPlatform = useMemo(() => {
    return platformDbScenarios.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.seller_product.toLowerCase().includes(search.toLowerCase());
      const matchesDifficulty = difficulty === "All" || s.difficulty === difficulty;
      const matchesProduct = productType === "All" || s.product_type === productType;
      return matchesSearch && matchesDifficulty && matchesProduct;
    });
  }, [platformDbScenarios, search, difficulty, productType]);

  if (loading) {
    return (
      <div className="space-y-6 sm:space-y-8 animate-pulse">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="h-9 w-64 bg-muted rounded" />
            <div className="h-4 w-72 sm:w-96 bg-muted rounded" />
          </div>
          <div className="h-10 w-full sm:w-40 bg-muted rounded-lg" />
        </div>
        <div className="h-10 bg-muted rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-muted rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="max-w-2xl">
          <PageHeaderLogo />
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">Scenario Library</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-2">
            Practice with AI buyers modeled on real fintech stakeholders — CFOs, risk officers, compliance leads, and more.
          </p>
        </div>
        <div className="relative group w-full sm:w-auto">
          <Button
            onClick={() => isMobile && setCreateMenuOpen(true)}
            className="w-full sm:w-auto rounded-lg gap-2 flex-shrink-0 bg-orange-500 hover:bg-orange-600 text-white h-11"
          >
            <Plus className="w-4 h-4" />
            Create Scenario
          </Button>

          {/* Desktop hover dropdown */}
          <div className="hidden sm:block absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 overflow-hidden">
            <button
              onClick={() => router.push("/scenarios/create")}
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted text-left transition-colors"
            >
              <div className="mt-0.5 p-1.5 rounded-lg bg-primary/10 text-primary">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Create manually</p>
                <p className="text-xs text-muted-foreground">Build every step yourself</p>
              </div>
            </button>
            <div className="h-px bg-border" />
            <button
              onClick={() => router.push("/scenarios/create-from-kb")}
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted text-left transition-colors"
            >
              <div className="mt-0.5 p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Create from Knowledge Base</p>
                <p className="text-xs text-muted-foreground">Auto-generate from uploaded URLs & documents</p>
              </div>
            </button>
          </div>

          {/* Mobile bottom sheet */}
          <Sheet open={createMenuOpen && isMobile} onOpenChange={setCreateMenuOpen}>
            <SheetContent side="bottom" className="rounded-t-2xl sm:hidden">
              <SheetHeader className="text-left pb-2">
                <SheetTitle className="text-base">Create scenario</SheetTitle>
              </SheetHeader>
              <div className="space-y-2 py-4">
                <button
                  onClick={() => { setCreateMenuOpen(false); router.push("/scenarios/create"); }}
                  className="w-full flex items-start gap-3 px-4 py-4 rounded-xl hover:bg-muted text-left transition-colors border border-border"
                >
                  <div className="mt-0.5 p-2 rounded-lg bg-primary/10 text-primary">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Create manually</p>
                    <p className="text-xs text-muted-foreground">Build every step yourself</p>
                  </div>
                </button>
                <button
                  onClick={() => { setCreateMenuOpen(false); router.push("/scenarios/create-from-kb"); }}
                  className="w-full flex items-start gap-3 px-4 py-4 rounded-xl hover:bg-muted text-left transition-colors border border-border"
                >
                  <div className="mt-0.5 p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Create from Knowledge Base</p>
                    <p className="text-xs text-muted-foreground">Auto-generate from uploaded URLs & documents</p>
                  </div>
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Search + filters */}
      <div className="space-y-4 sm:space-y-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-20 pointer-events-none" />
          <Input
            placeholder=""
            className="pl-9 rounded-lg border-border bg-card text-sm h-11"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {!search && (
            <div className="absolute left-9 right-3 top-1/2 -translate-y-1/2 pointer-events-none overflow-hidden z-10">
              <AnimatedPlaceholder
                options={[
                  "Search scenarios by name or product...",
                  "Search by buyer persona...",
                  "Search by scenario type...",
                  "Search by difficulty...",
                ]}
                interval={2500}
                className="text-sm text-muted-foreground"
              />
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
          <div className="space-y-2 min-w-0">
            <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">Difficulty</span>
            <div className="flex gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
              {difficulties.map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d === difficulty ? "All" : d)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-full sm:rounded-md text-[11px] sm:text-xs font-medium whitespace-nowrap transition-all flex-1 sm:flex-none text-center ${
                    difficulty === d
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-card text-muted-foreground border border-border hover:border-ring hover:bg-accent"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 min-w-0">
            <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">Product</span>
            <div className="flex gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
              {PRODUCT_TYPES.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setProductType(p.value === productType ? "All" : p.value)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-full sm:rounded-md text-[11px] sm:text-xs font-medium whitespace-nowrap transition-all flex-1 sm:flex-none text-center ${
                    productType === p.value
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-card text-muted-foreground border border-border hover:border-ring hover:bg-accent"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Custom scenarios section */}
      {filteredCustom.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <h2 className="text-sm font-semibold text-foreground">My Custom Scenarios</h2>
            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{filteredCustom.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {filteredCustom.map((scenario, i) => (
              <motion.div
                key={scenario.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <CustomScenarioCard scenario={scenario} onDeleted={loadCustomScenarios} />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* DB-seeded platform scenarios */}
      {filteredPlatform.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <h2 className="text-sm font-semibold text-foreground">Platform Scenarios</h2>
            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{filteredPlatform.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {filteredPlatform.map((scenario, i) => (
              <motion.div
                key={scenario.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <CustomScenarioCard scenario={scenario} onDeleted={loadPlatformScenarios} table="platform_scenarios" />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* No results from active filters */}
      {allDbScenarios.length > 0 && filteredCustom.length === 0 && filteredPlatform.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-14 sm:py-20 px-4 border border-dashed border-border rounded-2xl bg-muted/30"
        >
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Inbox className="w-7 h-7 sm:w-8 sm:h-8 text-muted-foreground" />
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1">No scenarios match</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-5">
            Try adjusting your search or filters to find what you&apos;re looking for.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() => { setSearch(""); setDifficulty("All"); setProductType("All"); }}
          >
            Clear filters
          </Button>
        </motion.div>
      )}

      {/* No scenarios at all */}
      {allDbScenarios.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-14 sm:py-20 px-4 border border-dashed border-border rounded-2xl bg-muted/30"
        >
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Inbox className="w-7 h-7 sm:w-8 sm:h-8 text-muted-foreground" />
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1">No scenarios yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-5">
            Create your first custom scenario to start practicing with AI buyers.
          </p>
          <Button
            className="rounded-xl gap-2 bg-orange-500 hover:bg-orange-600 text-white"
            onClick={() => setCreateMenuOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Create scenario
          </Button>
        </motion.div>
      )}
    </div>
  );
}
