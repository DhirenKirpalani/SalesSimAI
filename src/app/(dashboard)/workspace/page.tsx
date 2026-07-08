"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Building2, Briefcase, Plus, Loader2, Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole } from "@/hooks/useRole";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Workspace {
  id: string;
  slug: string;
  name: string;
  plan: string;
  logo_url?: string | null;
  created_by?: string;
  role: string;
}

export default function WorkspacePage() {
  const router = useRouter();
  const { isAdmin } = useRole();
  const [userId, setUserId] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createStatus, setCreateStatus] = useState<"idle" | "success" | "error">("idle");
  const [createMessage, setCreateMessage] = useState("");

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const fetchWorkspaces = useCallback(async () => {
    try {
      const res = await fetch("/api/company/org/list");
      const data = await res.json();
      if (data.organizations) {
        setWorkspaces(data.organizations);
        setActiveWorkspaceId(data.activeOrganizationId ?? null);
      }
    } catch (err) {
      console.error("[WorkspacePage] fetch workspaces error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setCreateStatus("idle");
    setCreateMessage("");
    try {
      const res = await fetch("/api/company/org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.organization) {
        setCreateStatus("success");
        setCreateMessage("Workspace created successfully.");
        setNewName("");
        await fetchWorkspaces();
        setTimeout(() => {
          setAddOpen(false);
          setCreateStatus("idle");
          setCreateMessage("");
        }, 1200);
      } else {
        setCreateStatus("error");
        setCreateMessage(data.error || "Failed to create workspace.");
      }
    } catch (err) {
      setCreateStatus("error");
      setCreateMessage("An unexpected error occurred.");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-8 space-y-8 animate-pulse">
        <div className="space-y-2">
          <div className="h-9 w-48 bg-muted rounded" />
          <div className="h-4 w-96 bg-muted rounded" />
        </div>
        <div className="h-48 bg-muted rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const otherWorkspaces = workspaces.filter((w) => w.id !== activeWorkspaceId);

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Workspaces</h1>
        <p className="text-muted-foreground">
          Manage your workspaces and switch between organizations.
        </p>
      </div>

      {activeWorkspace && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Active workspace
          </p>
          <Card
            className="border-primary/30 ring-1 ring-primary/10 overflow-hidden relative cursor-pointer transition-all hover:shadow-lg"
            onClick={() => router.push(`/workspace/${activeWorkspace.slug}`)}
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
            <div className="flex flex-col sm:flex-row relative">
              <div className="p-6 sm:p-8 flex items-center justify-center sm:justify-start">
                <div className="w-24 h-24 flex items-center justify-center overflow-hidden">
                  {activeWorkspace.logo_url ? (
                    <img
                      src={activeWorkspace.logo_url}
                      alt={activeWorkspace.name}
                      className="w-full h-full object-contain"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <Briefcase className="w-12 h-12 text-primary" />
                  )}
                </div>
              </div>
              <CardContent className="flex-1 p-6 sm:py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div className="min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-2xl font-semibold tracking-tight truncate">{activeWorkspace.name}</h2>
                    <Badge variant="secondary" className="text-[10px] font-medium uppercase tracking-wider">
                      {activeWorkspace.plan}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {activeWorkspace.role === "admin" ? "Workspace admin" : "Workspace member"} · Current workspace session
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge className="bg-primary text-primary-foreground hover:bg-primary">
                    <Check className="w-3 h-3 mr-1" />
                    Active
                  </Badge>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </CardContent>
            </div>
          </Card>
        </div>
      )}

      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          {otherWorkspaces.length > 0 ? "Other workspaces" : "Create a workspace"}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {otherWorkspaces.map((workspace) => (
            <Card
              key={workspace.id}
              className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5"
              onClick={() => router.push(`/workspace/${workspace.slug}`)}
            >
              <CardContent className="p-5 relative">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center p-2">
                    {workspace.logo_url ? (
                      <img
                        src={workspace.logo_url}
                        alt={workspace.name}
                        className="w-full h-full object-contain"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <Building2 className="w-7 h-7 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pr-6">
                    <h3 className="font-semibold truncate">{workspace.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {workspace.plan} · {workspace.role === "admin" ? "Admin" : "Member"}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}

          {isAdmin && (
            <Card
              className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30 border-dashed hover:-translate-y-0.5"
              onClick={() => {
                setNewName("");
                setCreateStatus("idle");
                setCreateMessage("");
                setAddOpen(true);
              }}
            >
              <CardContent className="p-5 flex items-center gap-4 h-full">
                <div className="shrink-0 w-14 h-14 rounded-xl bg-muted flex items-center justify-center">
                  <Plus className="w-7 h-7 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-muted-foreground">Add workspace</h3>
                  <p className="text-xs text-muted-foreground mt-1">Create a new organization</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {!activeWorkspace && !isAdmin && workspaces.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          You are not part of any workspace yet. Contact your admin to be invited.
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create workspace</DialogTitle>
            <DialogDescription>
              Create a new workspace to keep your sales content organized.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workspace-name">Workspace name</Label>
              <Input
                id="workspace-name"
                placeholder="e.g., Aspire"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={creating}
              />
            </div>
            {createMessage && (
              <p className={cn("text-sm", createStatus === "error" ? "text-destructive" : "text-green-600")}>
                {createMessage}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating || !newName.trim()}>
                {creating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
