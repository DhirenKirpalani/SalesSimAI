"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Loader2,
  Upload,
  Trash2,
  Users,
  Mail,
  Building2,
  CheckCircle,
  AlertCircle,
  Copy,
  Check,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface Member {
  id: string;
  full_name: string | null;
  email: string;
  position: string | null;
  role: string | null;
  created_at: string;
}

interface Invite {
  id: string;
  email: string;
  status: string;
  created_at: string;
  accepted_at: string | null;
}

interface Organization {
  id: string;
  name: string;
  plan: string;
  created_by: string;
  created_at: string;
  logo_url?: string | null;
  email_domain?: string | null;
}

interface WorkspaceManagementProps {
  organizationId: string;
  isOrgAdmin: boolean;
  currentUserId?: string;
  initialLogoUrl?: string | null;
  onLogoChange?: (url: string) => void;
  mode?: "full" | "members" | "settings";
}

export function WorkspaceManagement({
  organizationId,
  isOrgAdmin,
  currentUserId,
  initialLogoUrl,
  onLogoChange,
  mode = "full",
}: WorkspaceManagementProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(mode === "settings" ? "settings" : "members");
  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<"idle" | "success" | "error">("idle");
  const [inviteMessage, setInviteMessage] = useState("");
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);

  const [logoUrl, setLogoUrl] = useState(initialLogoUrl ?? "");
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsStatus, setSettingsStatus] = useState<"idle" | "success" | "error">("idle");
  const [settingsMessage, setSettingsMessage] = useState("");

  const [deletingOrg, setDeletingOrg] = useState(false);
  const [deleteOrgOpen, setDeleteOrgOpen] = useState(false);
  const [deleteOrgError, setDeleteOrgError] = useState<string | null>(null);

  const fetchOrg = useCallback(async () => {
    try {
      const res = await fetch(`/api/company/org?id=${encodeURIComponent(organizationId)}`);
      const data = await res.json();
      if (res.ok) {
        setOrg(data.organization);
        setMembers(data.members ?? []);
        if (data.organization?.logo_url) {
          setLogoUrl(data.organization.logo_url);
        }
      }
    } catch (e) {
      console.error("[WorkspaceManagement] fetch org error:", e);
    }
  }, [organizationId]);

  const fetchInvites = useCallback(async () => {
    try {
      const res = await fetch(`/api/company/org/invite?organizationId=${encodeURIComponent(organizationId)}`);
      const data = await res.json();
      if (res.ok) {
        setInvites(data.invites ?? []);
      }
    } catch (e) {
      console.error("[WorkspaceManagement] fetch invites error:", e);
    }
  }, [organizationId]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      await Promise.all([fetchOrg(), fetchInvites()]);
      setLoading(false);
    }
    load();
  }, [fetchOrg, fetchInvites]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    setInviteStatus("idle");
    try {
      const res = await fetch("/api/company/org/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), organizationId }),
      });
      const data = await res.json();
      if (res.ok) {
        setInviteStatus("success");
        setInviteMessage(`Invite sent to ${inviteEmail}`);
        setInviteEmail("");
        fetchInvites();
      } else {
        setInviteStatus("error");
        setInviteMessage(data.error || "Failed to send invite");
      }
    } catch {
      setInviteStatus("error");
      setInviteMessage("Failed to send invite");
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleUpdateMemberRole(userId: string, newRole: string) {
    try {
      const res = await fetch("/api/company/org/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole, organizationId }),
      });
      if (res.ok) {
        fetchOrg();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update role");
      }
    } catch (e) {
      console.error("[WorkspaceManagement] update role error:", e);
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!confirm("Remove this member from the organization?")) return;
    try {
      const res = await fetch(`/api/company/org/members?userId=${userId}&organizationId=${organizationId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchOrg();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to remove member");
      }
    } catch (e) {
      console.error("[WorkspaceManagement] remove member error:", e);
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsStatus("idle");
    try {
      const res = await fetch("/api/company/org", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logo_url: logoUrl || null, organizationId }),
      });
      const data = await res.json();
      if (res.ok) {
        setSettingsStatus("success");
        setSettingsMessage("Settings saved");
        setOrg(data.organization);
        onLogoChange?.(logoUrl);
      } else {
        setSettingsStatus("error");
        setSettingsMessage(data.error || "Failed to save settings");
      }
    } catch {
      setSettingsStatus("error");
      setSettingsMessage("Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleLogoFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    setLogoUrl(dataUrl);
    if (logoInputRef.current) logoInputRef.current.value = "";
  }

  async function confirmDeleteOrg() {
    setDeletingOrg(true);
    setDeleteOrgError(null);
    try {
      const res = await fetch("/api/company/org", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId }),
      });
      if (res.ok) {
        setDeleteOrgOpen(false);
        router.push("/workspace");
      } else {
        const data = await res.json();
        setDeleteOrgError(data.error || "Failed to delete organization");
      }
    } catch (e) {
      console.error("[WorkspaceManagement] delete org error:", e);
      setDeleteOrgError("Failed to delete organization");
    } finally {
      setDeletingOrg(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const membersContent = (
    <div className="space-y-4">
      {isOrgAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="w-4 h-4" />
              Invite Team Member
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleInvite} className="flex gap-3">
              <Input
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={inviteLoading || !inviteEmail.trim()}>
                {inviteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Invite"}
              </Button>
            </form>

            {inviteStatus !== "idle" && (
              <div className={`flex items-center gap-2 text-sm ${inviteStatus === "success" ? "text-green-600" : "text-red-600"}`}>
                {inviteStatus === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {inviteMessage}
              </div>
            )}

            {invites.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pending Invites</p>
                {invites.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3 h-3 text-muted-foreground" />
                      <span className="text-sm">{inv.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{new Date(inv.created_at).toLocaleDateString()}</span>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        title="Copy invite link"
                        onClick={() => {
                          const link = `${window.location.origin}/invite/${inv.id}`;
                          navigator.clipboard.writeText(link);
                          setCopiedInviteId(inv.id);
                          setTimeout(() => setCopiedInviteId(null), 2000);
                        }}
                      >
                        {copiedInviteId === inv.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-4 h-4" />
            Team Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="text-sm font-medium">{m.full_name || m.email.split("@")[0]}</p>
                  <p className="text-xs text-muted-foreground">{m.position || "No position"} · {m.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {isOrgAdmin && org?.created_by !== m.id && currentUserId !== m.id && (
                    <>
                      <Select value={m.role || "user"} onValueChange={(v) => handleUpdateMemberRole(m.id, v ?? "user")}>
                        <SelectTrigger className="min-w-[130px] h-8 text-xs px-2.5 bg-background border hover:bg-accent hover:border-primary/30 transition-colors gap-2">
                          <span className="text-muted-foreground">Role:</span>
                          <SelectValue className="capitalize" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(m.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 px-2"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                  {org?.created_by === m.id && (
                    <Badge variant="secondary" className="text-xs">Owner</Badge>
                  )}
                  {!isOrgAdmin && (
                    <Badge variant="secondary" className="text-xs capitalize">{m.role || "Member"}</Badge>
                  )}
                  {isOrgAdmin && currentUserId === m.id && org?.created_by !== m.id && (
                    <Badge variant="secondary" className="text-xs capitalize">{m.role || "Member"}</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const settingsContent = isOrgAdmin ? (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="w-4 h-4" />
            Branding
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <Label className="text-xs mb-1 block">Company Logo</Label>
              <div className="flex items-center gap-3">
                {logoUrl && (
                  <img src={logoUrl} alt="Logo preview" className="w-12 h-12 rounded-lg object-contain border shrink-0" />
                )}
                <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoFileSelect} className="hidden" />
                <div
                  onClick={() => logoInputRef.current?.click()}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-md border border-input bg-background text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <Upload className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="truncate flex-1">{logoUrl ? "Change logo" : "Click to choose a file"}</span>
                  {logoUrl && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setLogoUrl("");
                        if (logoInputRef.current) logoInputRef.current.value = "";
                      }}
                      className="ml-auto text-muted-foreground hover:text-red-500 cursor-pointer shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Upload a PNG/JPG logo. It will be shown on the company page.</p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={savingSettings}>
                {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Settings"}
              </Button>
              {settingsStatus !== "idle" && (
                <div className={`flex items-center gap-2 text-sm ${settingsStatus === "success" ? "text-green-600" : "text-red-600"}`}>
                  {settingsStatus === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {settingsMessage}
                </div>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-red-600">
            <AlertCircle className="w-4 h-4" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Delete Organization</p>
              <p className="text-xs text-muted-foreground mt-1">
                Permanently delete this organization. All members will be unlinked and all data will be lost.
              </p>
            </div>
            <Button variant="destructive" size="sm" disabled={deletingOrg} onClick={() => setDeleteOrgOpen(true)}>
              {deletingOrg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1" />}
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={deleteOrgOpen} onOpenChange={setDeleteOrgOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Delete organization?</DialogTitle>
            <DialogDescription>
              This will permanently remove the organization. All members will be unlinked and all data will be lost.
            </DialogDescription>
          </DialogHeader>
          {deleteOrgError && (
            <div className="text-sm text-red-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {deleteOrgError}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOrgOpen(false)} disabled={deletingOrg}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteOrg} disabled={deletingOrg}>
              {deletingOrg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  ) : null;

  if (mode === "members") return membersContent;
  if (mode === "settings") return settingsContent;

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="w-full sm:w-fit bg-muted/60 border border-border/60 rounded-xl p-1 shadow-sm h-auto gap-1">
        <TabsTrigger
          value="members"
          className="w-full sm:w-auto sm:flex-none h-auto gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-muted/80 data-active:bg-primary data-active:text-primary-foreground data-active:shadow-sm data-active:hover:bg-primary"
        >
          <Users className="w-4 h-4" />
          Members
        </TabsTrigger>
        {isOrgAdmin && (
          <TabsTrigger
            value="settings"
            className="w-full sm:w-auto sm:flex-none h-auto gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-muted/80 data-active:bg-primary data-active:text-primary-foreground data-active:shadow-sm data-active:hover:bg-primary"
          >
            <Building2 className="w-4 h-4" />
            Settings
          </TabsTrigger>
        )}
      </TabsList>
      <TabsContent value="members" className="pt-3">{membersContent}</TabsContent>
      {isOrgAdmin && <TabsContent value="settings" className="pt-3">{settingsContent}</TabsContent>}
    </Tabs>
  );
}
