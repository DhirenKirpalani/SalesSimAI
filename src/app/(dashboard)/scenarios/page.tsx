"use client";

import { useState, useMemo } from "react";
import { ScenarioCard } from "@/components/cards/ScenarioCard";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { mockScenarios, industries, difficulties } from "@/lib/data/mockData";
import { Search, SlidersHorizontal } from "lucide-react";
import { motion } from "framer-motion";

export default function ScenariosPage() {
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("All");
  const [difficulty, setDifficulty] = useState("All");

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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Scenario Library</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Choose a scenario to practice with a realistic AI buyer.
        </p>
      </div>

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
