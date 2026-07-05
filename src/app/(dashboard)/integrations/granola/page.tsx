"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Check, AlertCircle, Phone, FileText, Users, Trash2, ArrowLeft, ArrowRight } from "lucide-react";
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

interface Call {
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
  source?: string | null;
}

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  payment: "Payment",
  eor: "EoR",
  cards: "Cards",
};

export default function GranolaIntegrationPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [selectedProductType, setSelectedProductType] = useState<string>("all");

  async function loadCalls() {
    try {
      const res = await fetch("/api/granola/notes");
      if (!res.ok) throw new Error("Failed to load calls");
      const data = await res.json();
      setCalls(data.notes ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load calls";
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
        message: `Imported ${data.importedCount} calls${data.errors?.length ? `, ${data.errors.length} errors` : ""}`,
      });
      await loadCalls();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Import failed";
      setResult({ type: "error", message });
    } finally {
      setImporting(false);
    }
  }

  useEffect(() => {
    loadCalls();
  }, []);

  async function handleDelete() {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/granola/notes/${deleteTargetId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setCalls((prev) => prev.filter((c) => c.id !== deleteTargetId));
      setDeleteTargetId(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete";
      setResult({ type: "error", message });
    } finally {
      setDeleting(false);
    }
  }

  async function updateCallProductType(callId: string, productType: string) {
    try {
      const res = await fetch(`/api/granola/notes/${callId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_type: productType }),
      });
      if (!res.ok) throw new Error("Failed to update product type");
      setCalls((prev) =>
        prev.map((c) => (c.id === callId ? { ...c, product_type: productType } : c))
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update product type";
      setResult({ type: "error", message });
    }
  }

  const dialogOpen = !!deleteTargetId;

  const filteredCalls = selectedProductType === "all"
    ? calls
    : calls.filter((c) => c.product_type === selectedProductType);

  const productTypeCounts = {
    all: calls.length,
    payment: calls.filter((c) => c.product_type === "payment").length,
    eor: calls.filter((c) => c.product_type === "eor").length,
    cards: calls.filter((c) => c.product_type === "cards").length,
  };

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
          <h1 className="text-2xl font-bold tracking-tight">Granola</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your imported Granola calls.
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
                Pull transcripts and summaries from your connected Granola workspace.
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
                  {calls.length} call{calls.length !== 1 ? "s" : ""} imported
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
          ) : filteredCalls.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <FileText className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">
                {calls.length === 0 ? "No calls imported yet" : "No calls for this product type"}
              </p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                {calls.length === 0
                  ? "Click \"Import calls\" to pull your meeting history from Granola."
                  : "Try selecting a different product type or import more calls."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCalls.map((call) => (
                <div
                  key={call.id}
                  className="rounded-xl border p-4 hover:bg-muted/40 transition-colors flex items-start justify-between gap-4"
                >
                  <Link href={`/integrations/${call.id}`} className="flex-1 min-w-0">
                    <p className="font-medium text-sm">
                      {call.title || "Untitled call"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {call.owner?.name || call.owner?.email || "Unknown owner"}
                      </span>
                      {call.attendees && call.attendees.length > 0 && (
                        <span> · {call.attendees.length} participant{call.attendees.length !== 1 ? "s" : ""}</span>
                      )}
                    </p>
                    {call.summary && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {call.summary}
                      </p>
                    )}
                  </Link>
                  <div className="flex items-center gap-2 shrink-0">
                    <Select
                      value={call.product_type || "payment"}
                      onValueChange={(v) => updateCallProductType(call.id, v ?? "payment")}
                    >
                      <SelectTrigger className="h-8 text-xs w-[100px] rounded-xl px-2.5">
                        <SelectValue>{PRODUCT_TYPE_LABELS[call.product_type || "payment"]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="payment">Payment</SelectItem>
                        <SelectItem value="eor">EoR</SelectItem>
                        <SelectItem value="cards">Cards</SelectItem>
                      </SelectContent>
                    </Select>
                    <Link href={`/integrations/${call.id}`}>
                      <Button variant="ghost" size="sm" className="rounded-xl gap-1 text-xs h-8 px-2">
                        View
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="rounded-xl text-muted-foreground hover:text-red-500"
                      onClick={() => setDeleteTargetId(call.id)}
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
              This will remove the imported call from Day1. The original meeting will remain in Granola.
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
