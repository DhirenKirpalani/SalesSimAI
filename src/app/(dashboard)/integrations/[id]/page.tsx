"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Clock, Users, MessageSquare, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { PageHeaderLogo } from "@/components/layout/PageHeaderLogo";
import { Badge } from "@/components/ui/badge";

interface TranscriptLine {
  speaker?: { source?: string; name?: string } | null;
  text?: string;
  start_time?: number;
}

interface Note {
  id: string;
  title: string | null;
  summary: string | null;
  summary_text: string | null;
  summary_markdown: string | null;
  transcript: TranscriptLine[] | null;
  owner: { name?: string; email?: string } | null;
  attendees: Array<{ name?: string; email?: string }> | null;
  created_at: string | null;
  web_url: string | null;
}

interface Analysis {
  totalLines: number;
  totalWords: number;
  speakerCounts: Record<string, number>;
}

export default function CallDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [open, setOpen] = useState({ summary: true, enhanced: true, transcript: false });

  useEffect(() => {
    async function loadNote() {
      try {
        const res = await fetch(`/api/granola/notes/${id}`);
        if (!res.ok) throw new Error("Failed to load note");
        const data = await res.json();
        setNote(data.note);

        const transcript = data.note?.transcript || [];
        const totalLines = transcript.length;
        const totalWords = transcript.reduce((sum: number, line: TranscriptLine) => {
          return sum + (line.text?.split(/\s+/).filter(Boolean).length || 0);
        }, 0);
        const speakerCounts: Record<string, number> = {};
        transcript.forEach((line: TranscriptLine) => {
          const speaker = line.speaker?.name || line.speaker?.source || "Unknown";
          speakerCounts[speaker] = (speakerCounts[speaker] || 0) + 1;
        });
        setAnalysis({ totalLines, totalWords, speakerCounts });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load note");
      } finally {
        setLoading(false);
      }
    }
    loadNote();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <PageHeaderLogo />
        <p className="text-red-500">{error || "Note not found"}</p>
        <Link href="/integrations">
          <Button variant="outline" size="sm" className="rounded-xl gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Call Library
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <PageHeaderLogo />
        <div className="flex items-center gap-3">
          <Link href="/integrations">
            <Button variant="ghost" size="sm" className="rounded-xl gap-1 px-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{note.title || "Untitled call"}</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Review the transcript, summary, and AI analysis.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Lines</p>
              <p className="font-semibold">{analysis?.totalLines || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Words</p>
              <p className="font-semibold">{analysis?.totalWords || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Speakers</p>
              <p className="font-semibold">{Object.keys(analysis?.speakerCounts || {}).length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border bg-card shadow-sm">
        <CardHeader
          className="pb-3 cursor-pointer"
          onClick={() => setOpen((o) => ({ ...o, summary: !o.summary }))}
        >
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" /> Summary
            </span>
            {open.summary ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </CardTitle>
        </CardHeader>
        {open.summary && (
          <CardContent>
            {note.summary || note.summary_text ? (
              <p className="text-sm leading-relaxed">{note.summary_text || note.summary}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No summary available.</p>
            )}
          </CardContent>
        )}
      </Card>

      {note.summary_markdown && (
        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardHeader
            className="pb-3 cursor-pointer"
            onClick={() => setOpen((o) => ({ ...o, enhanced: !o.enhanced }))}
          >
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4" /> Enhanced notes
              </span>
              {open.enhanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </CardTitle>
          </CardHeader>
          {open.enhanced && (
            <CardContent>
              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {note.summary_markdown}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      <Card className="rounded-2xl border bg-card shadow-sm">
        <CardHeader
          className="pb-3 cursor-pointer"
          onClick={() => setOpen((o) => ({ ...o, transcript: !o.transcript }))}
        >
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between gap-2">
            <span>Transcript</span>
            {open.transcript ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </CardTitle>
        </CardHeader>
        {open.transcript && (
          <CardContent>
            {note.transcript && note.transcript.length > 0 ? (
              <div className="space-y-4">
                {note.transcript.map((line, index) => (
                  <div key={index} className="text-sm">
                    <Badge variant="secondary" className="mb-1 text-xs">
                      {line.speaker?.name || line.speaker?.source || "Unknown"}
                    </Badge>
                    <p className="text-foreground leading-relaxed">{line.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No transcript available.</p>
            )}
          </CardContent>
        )}
      </Card>

      {note.web_url && (
        <div className="flex justify-end">
          <a
            href={note.web_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            View original in meeting source →
          </a>
        </div>
      )}
    </div>
  );
}
