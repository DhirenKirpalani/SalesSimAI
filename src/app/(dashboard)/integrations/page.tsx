"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Check, AlertCircle, Phone, FileText, Users, Trash2, ArrowRight } from "lucide-react";
import { PageHeaderLogo } from "@/components/layout/PageHeaderLogo";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GranolaNote {
  id: string;
  external_id: string;
  title: string | null;
  summary: string | null;
  created_at: string | null;
  updated_at: string | null;
  imported_at: string;
  owner: { name?: string; email?: string } | null;
  attendees: Array<{ name?: string; email?: string }> | null;
  web_url: string | null;
  product_type: string | null;
}

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  payment: "Payment",
  eor: "EoR",
  cards: "Cards",
};

const PRODUCT_TYPE_COLORS: Record<string, string> = {
  payment: "bg-blue-100 text-blue-800",
  eor: "bg-purple-100 text-purple-800",
  cards: "bg-green-100 text-green-800",
};

export default function IntegrationsPage() {
  const [notes, setNotes] = useState<GranolaNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [selectedProductType, setSelectedProductType] = useState<string>("all");

  async function loadNotes() {
    try {
      const res = await fetch("/api/granola/notes");
      if (!res.ok) throw new Error("Failed to load notes");
      const data = await res.json();
      setNotes(data.notes ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load notes";
      setResult({ type: "error", message });
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    setImporting(true);
    setResult(null);
    try {
      const res = await fetch("/api/granola/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 30 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setResult({
        type: "success",
        message: `Imported ${data.importedCount} notes${data.errors?.length ? `, ${data.errors.length} errors` : ""}`,
      });
      await loadNotes();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Import failed";
      setResult({ type: "error", message });
    } finally {
      setImporting(false);
    }
  }

  useEffect(() => {
    loadNotes();
  }, []);

  async function handleDelete() {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/granola/notes/${deleteTargetId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setNotes((prev) => prev.filter((n) => n.id !== deleteTargetId));
      setDeleteTargetId(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete";
      setResult({ type: "error", message });
    } finally {
      setDeleting(false);
    }
  }

  async function updateNoteProductType(noteId: string, productType: string) {
    try {
      const res = await fetch(`/api/granola/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_type: productType }),
      });
      if (!res.ok) throw new Error("Failed to update product type");
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, product_type: productType } : n))
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update product type";
      setResult({ type: "error", message });
    }
  }

  const dialogOpen = !!deleteTargetId;

  const filteredNotes = selectedProductType === "all"
    ? notes
    : notes.filter((n) => n.product_type === selectedProductType);

  const productTypeCounts = {
    all: notes.length,
    payment: notes.filter((n) => n.product_type === "payment").length,
    eor: notes.filter((n) => n.product_type === "eor").length,
    cards: notes.filter((n) => n.product_type === "cards").length,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <PageHeaderLogo />
        <h1 className="text-2xl font-bold tracking-tight">Call Library</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Import your real sales calls so you can review, search, and practice from them.
        </p>
      </div>

      <Card className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-primary/5 to-background p-6">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Phone className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold">Import recent calls</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Pull transcripts and summaries from your connected meeting source. The more calls you import, the smarter your practice scenarios become.
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <Button
                  onClick={handleImport}
                  disabled={importing}
                  className="rounded-xl gap-2"
                  size="sm"
                >
                  {importing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  {importing ? "Importing..." : "Import calls"}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {notes.length} call{notes.length !== 1 ? "s" : ""} imported
                </span>
              </div>
              {result && (
                <div
                  className={`text-xs flex items-center gap-1 mt-3 ${
                    result.type === "success" ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {result.type === "success" ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <AlertCircle className="w-3 h-3" />
                  )}
                  {result.message}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card className="rounded-2xl border bg-card shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Imported calls
          </CardTitle>
          <div className="flex flex-wrap gap-2 pt-3">
            {(["all", "payment", "eor", "cards"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setSelectedProductType(type)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                  selectedProductType === type
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-input hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {type === "all" ? "All" : PRODUCT_TYPE_LABELS[type]}
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                  selectedProductType === type ? "bg-primary-foreground/20" : "bg-muted"
                }`}>
                  {productTypeCounts[type]}
                </span>
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <FileText className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">
                {notes.length === 0 ? "No calls imported yet" : "No calls for this product type"}
              </p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                {notes.length === 0
                  ? "Click \"Import calls\" to pull your meeting history. You will be able to review transcripts and turn real objections into practice."
                  : "Try selecting a different product type or import more calls."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotes.map((note) => (
                <div
                  key={note.id}
                  className="rounded-xl border p-4 hover:bg-muted/40 transition-colors flex items-start justify-between gap-4"
                >
                  <Link href={`/integrations/${note.id}`} className="flex-1 min-w-0">
                    <p className="font-medium text-sm">
                      {note.title || "Untitled call"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {note.owner?.name || note.owner?.email || "Unknown owner"}
                      </span>
                      {note.attendees && note.attendees.length > 0 && (
                        <span> · {note.attendees.length} participant{note.attendees.length !== 1 ? "s" : ""}</span>
                      )}
                    </p>
                    {note.summary && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {note.summary}
                      </p>
                    )}
                  </Link>
                  <div className="flex items-center gap-2 shrink-0">
                    <Select
                      value={note.product_type || "payment"}
                      onValueChange={(v) => updateNoteProductType(note.id, v ?? "payment")}
                    >
                      <SelectTrigger className="h-8 text-xs w-[100px] rounded-xl px-2.5">
                        <SelectValue>{PRODUCT_TYPE_LABELS[note.product_type || "payment"]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="payment">Payment</SelectItem>
                        <SelectItem value="eor">EoR</SelectItem>
                        <SelectItem value="cards">Cards</SelectItem>
                      </SelectContent>
                    </Select>
                    <Link href={`/integrations/${note.id}`}>
                      <Button variant="ghost" size="sm" className="rounded-xl gap-1 text-xs h-8 px-2">
                        View
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="rounded-xl text-muted-foreground hover:text-red-500"
                      onClick={() => setDeleteTargetId(note.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete imported call?</DialogTitle>
            <DialogDescription>
              This will remove the imported call from Day1. The original meeting will remain in your meeting source.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => setDeleteTargetId(null)}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              className="rounded-xl bg-red-500 hover:bg-red-600 text-white"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
