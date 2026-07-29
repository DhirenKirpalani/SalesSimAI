"use client";

import { useEffect, useState, useCallback, Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ScoreCard } from "@/components/cards/ScoreCard";
import { StatCard } from "@/components/cards/StatCard";
import { RadarScoreChart } from "@/components/charts/RadarScoreChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Loader2,
  Inbox,
  ArrowRight,
  Clock,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  AlertCircle,
  BarChart3,
  Trophy,
} from "lucide-react";
import { motion } from "framer-motion";
import { PageHeaderLogo } from "@/components/layout/PageHeaderLogo";
import { getFrameworkById, MEDDIC } from "@/lib/evaluation-frameworks";

interface CoachingMoment {
  buyer_quote: string;
  signal: string;
  what_they_should_have_said: string;
}

interface Analysis {
  overall_score: number;
  breakdown: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  missed_opportunities: string[];
  coaching_recommendations: string[];
  coaching_moments?: CoachingMoment[];
  framework?: string;
}

interface SessionSummary {
  id: string;
  scenario_name: string | null;
  analysis?: Analysis | null;
  duration_s: number | null;
  started_at: string;
  ended_at: string | null;
  source?: "voice" | "text" | "video";
}

const PAGE_SIZE = 10;

function AnalysisContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session");

  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [currentSession, setCurrentSession] = useState<SessionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();
    const organizationId = profile?.organization_id ?? null;

    let query = supabase
      .from("simulation_sessions")
      .select("id, scenario_name, call_mode, analysis, started_at, ended_at, duration_s, simulation_coaching(overall_score)")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("started_at", { ascending: false })
      .limit(100);
    if (organizationId) {
      query = query.eq("organization_id", organizationId);
    }
    const { data } = await query;

    const mapped: SessionSummary[] = (data ?? []).map((s) => {
      const coachingArr = s.simulation_coaching as Array<{ overall_score?: number }> | null;
      const coaching = coachingArr?.[0] ?? null;
      const mode = (s.call_mode ?? "voice") as string;
      const storedAnalysis = s.analysis as Analysis | null;
      const label = mode === "text" ? "Text Simulation" : mode === "video" ? "Video Call" : "Voice Simulation";
      return {
        id: s.id,
        scenario_name: s.scenario_name ?? label,
        analysis: storedAnalysis ?? (mode === "voice" && coaching ? ({ overall_score: coaching.overall_score } as Analysis) : null),
        duration_s: s.duration_s ?? null,
        started_at: s.started_at ?? new Date().toISOString(),
        ended_at: s.ended_at,
        source: (mode === "text" ? "text" : mode === "video" ? "video" : "voice") as SessionSummary["source"],
      };
    });

    setSessions(mapped);
    setLoading(false);
  }, []);

  const loadAnalysis = useCallback(async (sid: string, source?: string) => {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    // Voice session: read from simulation_coaching
    if (source === "voice") {
      const [{ data: session }, { data: coaching }] = await Promise.all([
        supabase.from("simulation_sessions")
          .select("id, scenario_name, started_at, ended_at, duration_s")
          .eq("id", sid).single(),
        supabase.from("simulation_coaching")
          .select("overall_score, discovery_score, objection_score, empathy_score, missed_opportunities, recommendations")
          .eq("session_id", sid).single(),
      ]);

      if (!session) { setError("Session not found"); setLoading(false); return; }

      if (coaching) {
        const voiceAnalysis: Analysis = {
          overall_score: coaching.overall_score ?? 0,
          breakdown: {
            identify_pain: coaching.discovery_score ?? 0,
            metrics: 0,
            economic_buyer: coaching.empathy_score ?? 0,
            decision_criteria: coaching.objection_score ?? 0,
            decision_process: 0,
            champion: 0,
          },
          strengths: (coaching.recommendations ?? []).slice(0, 3),
          weaknesses: coaching.missed_opportunities ?? [],
          missed_opportunities: coaching.missed_opportunities ?? [],
          coaching_recommendations: coaching.recommendations ?? [],
          coaching_moments: [],
        };
        setAnalysis(voiceAnalysis);
        setCurrentSession({
          id: session.id,
          scenario_name: session.scenario_name ?? "Voice Simulation",
          duration_s: session.duration_s ?? null,
          started_at: session.started_at ?? new Date().toISOString(),
          ended_at: session.ended_at,
        } as SessionSummary);
        setLoading(false);
        return;
      }

      setError("No analysis available for this session.");
      setLoading(false);
      return;
    }

    // Text / video session: read analysis from simulation_sessions.analysis
    const { data: session } = await supabase
      .from("simulation_sessions")
      .select("id, scenario_name, analysis, duration_s, started_at, ended_at")
      .eq("id", sid)
      .single();

    if (!session) { setError("Session not found"); setLoading(false); return; }

    if (session.analysis) {
      setAnalysis(session.analysis as Analysis);
      setCurrentSession({
        id: session.id,
        scenario_name: session.scenario_name ?? "Simulation",
        duration_s: session.duration_s ?? null,
        started_at: session.started_at ?? new Date().toISOString(),
        ended_at: session.ended_at,
      } as SessionSummary);
      setLoading(false);
      return;
    }

    setError("No analysis available for this session. The call may have ended before feedback was generated.");
    setLoading(false);
  }, []);

  useEffect(() => {
    if (sessionId) {
      const source = searchParams.get("source") ?? undefined;
      loadAnalysis(sessionId, source ?? undefined);
    } else {
      loadSessions();
    }
  }, [sessionId, loadAnalysis, loadSessions, searchParams]);

  const totalPages = Math.ceil(sessions.length / PAGE_SIZE);
  const paginatedSessions = useMemo(() => {
    return sessions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }, [sessions, page]);

  const fw = analysis?.framework ? getFrameworkById(analysis.framework) : MEDDIC;
  const radarData = analysis
    ? fw.dimensions.map((dim) => ({
        subject: dim.label,
        A: analysis.breakdown[dim.key] ?? 0,
        fullMark: 100,
      }))
    : [];

  if (loading || generating) {
    return (
      <div className="space-y-4 sm:space-y-6 max-w-6xl mx-auto px-4 sm:px-0 animate-pulse">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-4 w-72 sm:w-96 bg-muted rounded" />
        </div>
        {generating && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Generating AI analysis…</span>
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-2xl" />
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl border bg-card p-4">
              <div className="w-10 h-10 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 bg-muted rounded" />
                <div className="h-3 w-1/2 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Session list view
  if (!sessionId) {
    const analyzedSessions = sessions.filter((s) => s.analysis?.overall_score !== undefined);
    const scores = analyzedSessions.map((s) => s.analysis!.overall_score);
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    const bestScore = scores.length ? Math.max(...scores) : null;
    const totalMins = Math.round(sessions.reduce((sum, s) => sum + (s.duration_s ?? 0), 0) / 60);

    return (
      <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto px-4 sm:px-0 overflow-x-hidden">
        <div>
          <PageHeaderLogo />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Analysis</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">AI-generated insights across your practice sessions. Select a session to dive deeper.</p>
        </div>

        {sessions.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <StatCard label="Avg Score" value={avgScore ?? "—"} icon={TrendingUp} trend="neutral" />
            <StatCard label="Best Score" value={bestScore ?? "—"} icon={Trophy} trend="neutral" />
            <StatCard label="Sessions Analyzed" value={analyzedSessions.length} icon={BarChart3} trend="neutral" />
            <StatCard label="Practice Time" value={`${totalMins}m`} icon={Clock} trend="neutral" />
          </div>
        )}

        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 sm:py-24 px-4 gap-4 text-center border border-dashed border-border rounded-2xl bg-muted/30">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-muted flex items-center justify-center">
              <Inbox className="w-7 h-7 sm:w-8 sm:h-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-sm sm:text-base">No completed sessions yet</p>
              <p className="text-xs text-muted-foreground mt-1">Finish a simulation to unlock analysis</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => router.push("/scenarios")} className="gap-1.5 rounded-xl">
              Browse Scenarios
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {paginatedSessions.map((s, i) => {
              const score = s.analysis?.overall_score ?? null;
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.04 }}
                  className="group flex items-start sm:items-center gap-3 sm:gap-4 rounded-2xl border bg-card px-4 sm:px-5 py-4 hover:shadow-sm hover:border-primary/30 transition-all cursor-pointer overflow-hidden"
                  onClick={() => router.push(`/analysis?session=${s.id}${s.source ? `&source=${s.source}` : ``}`)}
                >
                  <div className="flex flex-col items-center gap-1 w-12 shrink-0 pt-0.5">
                    {score !== null ? (
                      <>
                        <div className={cn(
                          "text-base sm:text-lg font-bold tabular-nums leading-none px-2 py-1 rounded-xl",
                          score >= 70 ? "bg-emerald-500/10 text-emerald-500" : score >= 40 ? "bg-amber-500/10 text-amber-500" : "bg-red-500/10 text-red-400"
                        )}>{score}</div>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wide hidden sm:block">Score</p>
                      </>
                    ) : (
                      <div className="text-[9px] text-muted-foreground uppercase tracking-wide text-center">No score</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1 overflow-hidden">
                    <div className="flex items-start gap-2">
                      <p className="font-medium text-sm truncate flex-1 min-w-0">{s.scenario_name ?? "Untitled"}</p>
                      {s.analysis && (
                        <Badge variant="secondary" className="text-[10px] bg-violet-500/10 text-violet-600 border-violet-500/20 shrink-0 mt-0.5">{s.analysis?.framework === "star" ? "STAR" : "MEDDIC"}</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(s.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                      {score !== null && (
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {s.analysis?.framework === "star" ? "STAR" : "MEDDIC"} {score}/100
                        </span>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="shrink-0 gap-1 text-xs opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity rounded-xl h-8 w-8 sm:h-auto sm:w-auto p-0 sm:px-3">
                    <span className="hidden sm:inline">View</span>
                    <ArrowRight className="w-4 h-4 sm:w-3 sm:h-3" />
                  </Button>
                </motion.div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl h-10 w-10 sm:h-8 sm:w-8"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl h-10 w-10 sm:h-8 sm:w-8"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Error state
  if (error) {
    const noMessages = error.toLowerCase().includes("no messages");
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center max-w-sm mx-auto">
        <div className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center",
          noMessages ? "bg-amber-500/10" : "bg-red-500/10"
        )}>
          {noMessages
            ? <MessageSquare className="w-6 h-6 text-amber-500" />
            : <AlertCircle className="w-6 h-6 text-red-500" />}
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold">
            {noMessages ? "No conversation to analyse" : "Analysis failed"}
          </p>
          <p className="text-xs text-muted-foreground">
            {noMessages
              ? "This session ended before any messages were exchanged. Start a simulation, have a conversation with the buyer, then end it to get your coaching report."
              : error}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push(noMessages ? "/simulation" : "/analysis")} className="rounded-xl gap-1">
          {noMessages ? "Start a Simulation" : "Back to Analysis"}
        </Button>
      </div>
    );
  }

  if (!analysis) return null;

  // Analysis detail view
  return (
    <div className="space-y-4 sm:space-y-6 max-w-6xl mx-auto px-4 sm:px-0">
      <div className="flex items-center gap-2 sm:gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/analysis")} className="rounded-xl gap-1 text-muted-foreground h-9 shrink-0">
          <ChevronLeft className="w-4 h-4" /> <span className="hidden sm:inline">All Sessions</span>
        </Button>
        {currentSession && (
          <h1 className="text-base sm:text-lg font-semibold truncate">{currentSession?.scenario_name ?? "Session Analysis"}</h1>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="flex justify-center"
      >
        <ScoreCard label="Overall Score" score={analysis.overall_score} size="lg" />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <RadarScoreChart data={radarData} />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 content-start">
          {fw.dimensions.map((dim) => (
            <ScoreCard key={dim.key} label={dim.label} score={analysis.breakdown[dim.key] ?? 0} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardHeader className="pb-3 px-4 sm:px-6">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ThumbsUp className="w-4 h-4 text-emerald-500" /> Strengths
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 sm:px-6">
            {analysis.strengths.map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{s}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardHeader className="pb-3 px-4 sm:px-6">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ThumbsDown className="w-4 h-4 text-red-500" /> Weaknesses
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 sm:px-6">
            {analysis.weaknesses.map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{w}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardHeader className="pb-3 px-4 sm:px-6">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" /> Missed Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 sm:px-6">
            {analysis.missed_opportunities.map((m, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5">{i + 1}</Badge>
                <span>{m}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardHeader className="pb-3 px-4 sm:px-6">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Coaching Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 sm:px-6">
            {analysis.coaching_recommendations.map((c, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <Badge variant="secondary" className="text-[10px] shrink-0 mt-0.5">Tip</Badge>
                <span>{c}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Coaching Moments — transcript-specific advice */}
      {analysis.coaching_moments && analysis.coaching_moments.length > 0 && (
        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardHeader className="pb-3 px-4 sm:px-6">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-violet-500" /> Key Moments from Your Call
            </CardTitle>
            <p className="text-xs text-muted-foreground">When the buyer said something important, here is what you should have said instead.</p>
          </CardHeader>
          <CardContent className="space-y-4 px-4 sm:px-6">
            {analysis.coaching_moments.map((moment, i) => (
              <div key={i} className="space-y-2 rounded-xl border border-border p-3 bg-muted/20">
                <div className="flex items-start gap-2">
                  <Badge className="text-[10px] bg-violet-500/10 text-violet-600 border-violet-500/20 shrink-0">Moment {i + 1}</Badge>
                  <div className="space-y-1 flex-1">
                    <p className="text-xs font-medium text-muted-foreground">Buyer said:</p>
                    <p className="text-sm italic text-foreground">&ldquo;{moment.buyer_quote}&rdquo;</p>
                  </div>
                </div>
                <div className="pl-10">
                  <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Signal: {moment.signal}</p>
                </div>
                <div className="pl-10 space-y-1">
                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">You should have said:</p>
                  <p className="text-sm bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-2 text-foreground">{moment.what_they_should_have_said}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <AnalysisContent />
    </Suspense>
  );
}
