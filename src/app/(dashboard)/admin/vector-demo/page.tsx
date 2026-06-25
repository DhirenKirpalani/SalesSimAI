"use client";

import { useState, useCallback } from "react";
import { Search, Database, ArrowRight, Loader2 } from "lucide-react";

interface VectorResult {
  id: string;
  session_id: string;
  source: string;
  content: string;
  similarity: number;
  metadata: { scenario_type?: string; overall_score?: number; turn_index?: number };
  created_at: string;
}

export default function VectorDemoPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<VectorResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{ count: number } | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/simulation/vector/stats");
      const data = await res.json();
      setStats(data);
    } catch {
      setStats({ count: 0 });
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/simulation/vector/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), limit: 8 }),
      });
      const data = await res.json();
      setResults(data.results ?? []);
    } finally {
      setLoading(false);
    }
  }, [query]);

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Vector Store Demo</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Semantic search across stored sales call conversations using OpenAI embeddings + pgvector.
        </p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4">
        <button
          onClick={loadStats}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border hover:bg-accent/50 transition-colors text-sm"
        >
          <Database className="w-4 h-4" />
          {statsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Load Stats"}
        </button>
        {stats && (
          <span className="text-sm text-muted-foreground">
            <strong className="text-foreground">{stats.count}</strong> conversation vectors stored
          </span>
        )}
      </div>

      {/* Search */}
      <div className="space-y-3">
        <label className="text-sm font-medium">Semantic Search Query</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="e.g. 'seller handled price objection well' or 'buyer was skeptical about FX fees'"
            className="flex-1 px-4 py-2.5 rounded-lg bg-card border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Try: "I don't know corporate cards", "price too high", "need CFO approval", "competitor mentioned"
        </p>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Results ({results.length})</h3>
          {results.map((r, i) => (
            <div
              key={r.id}
              className="p-4 rounded-xl border bg-card hover:bg-accent/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                    r.source === "user" ? "bg-blue-500/10 text-blue-400" : "bg-emerald-500/10 text-emerald-400"
                  }`}>
                    {r.source === "user" ? "SELLER" : "BUYER"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {r.metadata.scenario_type ?? "Unknown"}
                  </span>
                  {typeof r.metadata.overall_score === "number" && (
                    <span className="text-[10px] text-muted-foreground">
                      Score: {r.metadata.overall_score}
                    </span>
                  )}
                </div>
                <span className="text-xs font-mono text-blue-400">
                  {(r.similarity * 100).toFixed(1)}% match
                </span>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{r.content}</p>
            </div>
          ))}
        </div>
      )}

      {results.length === 0 && !loading && query && (
        <p className="text-sm text-muted-foreground">No similar conversations found.</p>
      )}
    </div>
  );
}
