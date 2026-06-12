"use client";

import { ScoreCard } from "@/components/cards/ScoreCard";
import { RadarScoreChart } from "@/components/charts/RadarScoreChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockAnalysis } from "@/lib/data/mockData";
import {
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";

export default function AnalysisPage() {
  const analysis = mockAnalysis;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Session Analysis</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review your performance breakdown and coaching recommendations.
        </p>
      </div>

      {/* Overall Score */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex justify-center"
      >
        <ScoreCard label="Overall Score" score={analysis.overallScore} size="lg" />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RadarScoreChart />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 content-start">
          <ScoreCard label="Discovery" score={analysis.breakdown.discovery} />
          <ScoreCard label="Qualification" score={analysis.breakdown.qualification} />
          <ScoreCard label="Communication" score={analysis.breakdown.communication} />
          <ScoreCard label="Objection Handling" score={analysis.breakdown.objectionHandling} />
          <ScoreCard label="Closing" score={analysis.breakdown.closing} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Strengths */}
        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ThumbsUp className="w-4 h-4 text-emerald-500" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analysis.strengths.map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{s}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Weaknesses */}
        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ThumbsDown className="w-4 h-4 text-red-500" />
              Weaknesses
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analysis.weaknesses.map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{w}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Missed Opportunities */}
        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              Missed Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analysis.missedOpportunities.map((m, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5">
                  {i + 1}
                </Badge>
                <span>{m}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Coaching Recommendations */}
        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Coaching Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analysis.coachingRecommendations.map((c, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <Badge variant="secondary" className="text-[10px] shrink-0 mt-0.5">
                  Tip
                </Badge>
                <span>{c}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
