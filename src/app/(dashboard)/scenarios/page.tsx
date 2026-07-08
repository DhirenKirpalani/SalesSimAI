"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CustomScenarioCard } from "@/components/cards/CustomScenarioCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CustomScenario } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { Search, Plus, Sparkles, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { PageHeaderLogo } from "@/components/layout/PageHeaderLogo";

const PRODUCT_TYPES = [
  { value: "All", label: "All Products" },
  { value: "payment", label: "Payment" },
  { value: "eor", label: "EoR" },
  { value: "cards", label: "Cards" },
];

export default function ScenariosPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("All");
  const [productType, setProductType] = useState("All");
  const [customScenarios, setCustomScenarios] = useState<CustomScenario[]>([]);
  const [platformDbScenarios, setPlatformDbScenarios] = useState<CustomScenario[]>([]);
  const [loading, setLoading] = useState(true);

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
      .select("*")
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
      .select("*")
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
      <div className="space-y-8 animate-pulse">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="h-9 w-64 bg-muted rounded" />
            <div className="h-4 w-96 bg-muted rounded" />
          </div>
          <div className="h-10 w-40 bg-muted rounded-lg" />
        </div>
        <div className="h-10 bg-muted rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-muted rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="max-w-2xl">
          <PageHeaderLogo />
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Scenario Library</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Practice with AI buyers modeled on real fintech stakeholders — CFOs, risk officers, compliance leads, and more.
          </p>
        </div>
        <div className="relative group">
          <Button
            className="rounded-lg gap-2 flex-shrink-0 bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Plus className="w-4 h-4" />
            Create Custom
          </Button>
          <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 overflow-hidden">
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
        </div>
      </div>

      {/* Search + filters */}
      <div className="space-y-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search scenarios by name or product..."
            className="pl-9 rounded-lg border-border bg-card text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          <div className="space-y-2 min-w-0">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Difficulty</span>
            <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
              {difficulties.map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d === difficulty ? "All" : d)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
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
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Product</span>
            <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
              {PRODUCT_TYPES.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setProductType(p.value === productType ? "All" : p.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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

      {allDbScenarios.length === 0 && (
        <div className="text-center py-20 border border-dashed border-border rounded-xl bg-muted/50">
          <p className="text-muted-foreground text-sm">No scenarios found. Create your first custom scenario to get started.</p>
        </div>
      )}
    </div>
  );
}
