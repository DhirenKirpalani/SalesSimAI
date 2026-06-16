"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ScenarioCard } from "@/components/cards/ScenarioCard";
import { CustomScenarioCard } from "@/components/cards/CustomScenarioCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { mockScenarios, industries, difficulties } from "@/lib/data/mockData";
import { CustomScenario } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { Search, SlidersHorizontal, Plus, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function ScenariosPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("All");
  const [difficulty, setDifficulty] = useState("All");
  const [customScenarios, setCustomScenarios] = useState<CustomScenario[]>([]);

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

  useEffect(() => {
    loadCustomScenarios();
  }, [loadCustomScenarios]);

  const filtered = useMemo(() => {
    return mockScenarios.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.description.toLowerCase().includes(search.toLowerCase());
      const matchesIndustry = industry === "All" || s.industry === industry;
      const matchesDifficulty = difficulty === "All" || s.difficulty === difficulty;
      return matchesSearch && matchesIndustry && matchesDifficulty;
    });
  }, [search, industry, difficulty]);

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

      {/* Custom scenarios section */}
      {customScenarios.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <h2 className="text-sm font-semibold">My Custom Scenarios</h2>
            <span className="text-xs text-muted-foreground">({customScenarios.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {customScenarios.map((scenario, i) => (
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

      {/* Filters */}
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
          <Select value={industry} onValueChange={(v) => setIndustry(v ?? "All")}>
            <SelectTrigger className="w-40 rounded-xl">
              <SlidersHorizontal className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Industry" />
            </SelectTrigger>
            <SelectContent>
              {industries.map((i) => (
                <SelectItem key={i} value={i}>
                  {i}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={difficulty} onValueChange={(v) => setDifficulty(v ?? "All")}>
            <SelectTrigger className="w-40 rounded-xl">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              {difficulties.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Platform scenarios */}
      {customScenarios.length > 0 && (
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Platform Scenarios</h2>
          <span className="text-xs text-muted-foreground">({filtered.length})</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((scenario, i) => (
          <motion.div
            key={scenario.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.03 }}
          >
            <ScenarioCard scenario={scenario} />
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20">
          <p className="text-muted-foreground text-sm">No scenarios match your filters.</p>
        </div>
      )}
    </div>
  );
}
