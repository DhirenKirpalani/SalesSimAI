"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CustomScenarioCard } from "@/components/cards/CustomScenarioCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CustomScenario } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { Search, Plus, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function ScenariosPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("All");
  const [customScenarios, setCustomScenarios] = useState<CustomScenario[]>([]);
  const [platformDbScenarios, setPlatformDbScenarios] = useState<CustomScenario[]>([]);

  const loadCustomScenarios = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("custom_scenarios")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
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
    loadCustomScenarios();
    loadPlatformScenarios();
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
      return matchesSearch && matchesDifficulty;
    });
  }, [customScenarios, search, difficulty]);

  const filteredPlatform = useMemo(() => {
    return platformDbScenarios.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.seller_product.toLowerCase().includes(search.toLowerCase());
      const matchesDifficulty = difficulty === "All" || s.difficulty === difficulty;
      return matchesSearch && matchesDifficulty;
    });
  }, [platformDbScenarios, search, difficulty]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Scenario Library</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Practice with AI buyers modeled on real fintech stakeholders — CFOs, risk officers, compliance leads, and more.
          </p>
        </div>
        <Button
          className="rounded-xl gap-2 flex-shrink-0"
          onClick={() => router.push("/scenarios/create")}
        >
          <Plus className="w-4 h-4" />
          Create Custom
        </Button>
      </div>

      {/* Search + difficulty filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search scenarios..."
            className="pl-9 rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {difficulties.map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                difficulty === d
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary/40"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Custom scenarios section */}
      {filteredCustom.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <h2 className="text-sm font-semibold">My Custom Scenarios</h2>
            <span className="text-xs text-muted-foreground">({filteredCustom.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Platform Scenarios</h2>
            <span className="text-xs text-muted-foreground">({filteredPlatform.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
        <div className="text-center py-20">
          <p className="text-muted-foreground text-sm">No scenarios yet. Create your first custom scenario to get started.</p>
        </div>
      )}
    </div>
  );
}
