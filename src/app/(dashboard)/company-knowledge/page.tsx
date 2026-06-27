"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UrlChipInput } from "@/components/ui/UrlChipInput";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Loader2,
  Upload,
  Trash2,
  Users,
  Mail,
  Building2,
  FileText,
  CheckCircle,
  AlertCircle,
  Plus,
  X,
  Search,
  Sparkles,
} from "lucide-react";
import { useRole } from "@/hooks/useRole";
import { useRouter } from "next/navigation";

interface Organization {
  id: string;
  name: string;
  plan: string;
  created_by: string;
  created_at: string;
  logo_url?: string | null;
  theme_color?: string | null;
  email_domain?: string | null;
  source_urls?: string[];
  profile_data?: Record<string, unknown> | null;
}

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

interface Document {
  id: string;
  name: string;
  doc_type: string;
  document_type: string;
  file_path: string | null;
  created_at: string;
  creator_name: string | null;
  creator_email: string | null;
  creator_role: string | null;
  chunk_count: number;
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

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  icp: "ICP",
  value_prop: "Value Prop",
  competitive: "Competitive",
  objection_handling: "Objection Handling",
  product_pricing: "Product/Pricing",
  process_methodology: "Process/Methodology",
};

export default function CompanyKnowledgePage() {
  const router = useRouter();
  const { isAdmin, loading: roleLoading } = useRole();
  const [activeTab, setActiveTab] = useState("documents");
  const [loading, setLoading] = useState(true);

  // Org state
  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);
  const [invites, setInvites] = useState<Invite[]>([]);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<"idle" | "success" | "error">("idle");
  const [inviteMessage, setInviteMessage] = useState("");

  // Document upload
  const [docs, setDocs] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle");
  const [uploadMessage, setUploadMessage] = useState("");
  const [selectedProductType, setSelectedProductType] = useState("payment");
  const [selectedDocumentType, setSelectedDocumentType] = useState("icp");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Create org form
  const [newOrgName, setNewOrgName] = useState("");
  const [creatingOrg, setCreatingOrg] = useState(false);

  // Settings
  const [logoUrl, setLogoUrl] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [emailDomain, setEmailDomain] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsStatus, setSettingsStatus] = useState<"idle" | "success" | "error">("idle");
  const [settingsMessage, setSettingsMessage] = useState("");
  const [deletingOrg, setDeletingOrg] = useState(false);
  const [deleteOrgOpen, setDeleteOrgOpen] = useState(false);
  const [deleteOrgError, setDeleteOrgError] = useState<string | null>(null);
  const [docToDelete, setDocToDelete] = useState<string | null>(null);
  const [deleteDocOpen, setDeleteDocOpen] = useState(false);

  // Onboarding URLs
  const [onboardingUrls, setOnboardingUrls] = useState<string[]>([]);

  // Auto-save URLs to DB when they change (debounced)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!org?.id) return;
      try {
        await fetch("/api/company/org", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source_urls: onboardingUrls }),
        });
      } catch (e) {
        console.error("[company-knowledge] auto-save URLs error:", e);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [onboardingUrls, org?.id]);

  const fetchOrg = useCallback(async () => {
    try {
      const res = await fetch("/api/company/org");
      const data = await res.json();
      if (res.ok) {
        setOrg(data.organization);
        setMembers(data.members ?? []);
        setIsOrgAdmin(data.isAdmin ?? false);
        if (data.organization) {
          setLogoUrl(data.organization.logo_url ?? "");
          setEmailDomain(data.organization.email_domain ?? "");
          if (data.organization.source_urls?.length > 0) {
            setOnboardingUrls(data.organization.source_urls);
          }
        }
      }
    } catch (e) {
      console.error("[company-knowledge] fetch org error:", e);
    }
  }, []);

  const fetchInvites = useCallback(async () => {
    try {
      const res = await fetch("/api/company/org/invite");
      const data = await res.json();
      if (res.ok) {
        setInvites(data.invites ?? []);
      }
    } catch (e) {
      console.error("[company-knowledge] fetch invites error:", e);
    }
  }, []);

  const fetchDocs = useCallback(async () => {
    try {
      const res = await fetch("/api/company/documents");
      const data = await res.json();
      if (res.ok) {
        setDocs(data.documents ?? []);
      }
    } catch (e) {
      console.error("[company-knowledge] fetch docs error:", e);
    }
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      await Promise.all([fetchOrg(), fetchDocs()]);
      setLoading(false);
    }
    load();
  }, [fetchOrg, fetchDocs]);

  useEffect(() => {
    if (isOrgAdmin && org) {
      fetchInvites();
    }
  }, [isOrgAdmin, org, fetchInvites]);

  // ── Create Org ─────────────────────────────────────────────────────
  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    setCreatingOrg(true);
    try {
      const res = await fetch("/api/company/org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newOrgName.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setOrg(data.organization);
        setIsOrgAdmin(true);
        setNewOrgName("");
        await fetchOrg(); // refresh members list
      } else {
        setInviteStatus("error");
        setInviteMessage(data.error || "Failed to create organization");
      }
    } catch {
      setInviteStatus("error");
      setInviteMessage("Failed to create organization");
    } finally {
      setCreatingOrg(false);
    }
  }

  // ── Invite Member ────────────────────────────────────────────────────
  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    setInviteStatus("idle");
    try {
      const res = await fetch("/api/company/org/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim() }),
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

  // ── Upload Document ──────────────────────────────────────────────────
  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setSelectedFiles(files);
    setUploadStatus("idle");
    setUploadMessage("");
  }

  function handleClearFiles() {
    setSelectedFiles([]);
    setUploadStatus("idle");
    setUploadMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleUpload() {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setUploadStatus("idle");

    const formData = new FormData();
    formData.append("productType", selectedProductType);
    formData.append("documentType", selectedDocumentType);
    for (const file of selectedFiles) {
      formData.append("files", file);
    }

    try {
      const res = await fetch("/api/company/documents", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setUploadStatus("success");
        setUploadMessage(`Uploaded ${selectedFiles.length} file(s), ${data.chunks} chunk(s)`);
        setSelectedFiles([]);
        fetchDocs();
      } else {
        setUploadStatus("error");
        setUploadMessage(data.error || "Upload failed");
      }
    } catch {
      setUploadStatus("error");
      setUploadMessage("Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // ── Delete Document ──────────────────────────────────────────────────
  function handleDeleteDoc(filePath: string | null) {
    if (!filePath) return;
    setDocToDelete(filePath);
    setDeleteDocOpen(true);
  }

  async function confirmDeleteDoc() {
    if (!docToDelete) return;
    try {
      const res = await fetch(
        `/api/company/documents?file_path=${encodeURIComponent(docToDelete)}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setDeleteDocOpen(false);
        setDocToDelete(null);
        setUploadStatus("idle");
        setUploadMessage("");
        fetchDocs();
      }
    } catch (e) {
      console.error("[company-knowledge] delete doc error:", e);
    }
  }

  // ── Settings ─────────────────────────────────────────────────────────
  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsStatus("idle");
    try {
      const res = await fetch("/api/company/org", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logo_url: logoUrl || null,
          email_domain: emailDomain || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSettingsStatus("success");
        setSettingsMessage("Settings saved");
        setOrg(data.organization);
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

  function handleDeleteOrg() {
    setDeleteOrgError(null);
    setDeleteOrgOpen(true);
  }

  async function confirmDeleteOrg() {
    setDeletingOrg(true);
    setDeleteOrgError(null);
    try {
      const res = await fetch("/api/company/org", { method: "DELETE" });
      if (res.ok) {
        setOrg(null);
        setMembers([]);
        setIsOrgAdmin(false);
        setDeleteOrgOpen(false);
        setActiveTab("documents");
      } else {
        const data = await res.json();
        setDeleteOrgError(data.error || "Failed to delete organization");
      }
    } catch (e) {
      console.error("[company-knowledge] delete org error:", e);
      setDeleteOrgError("Failed to delete organization");
    } finally {
      setDeletingOrg(false);
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

  // ── Member Management ──────────────────────────────────────────────
  async function handleUpdateMemberRole(userId: string, newRole: string) {
    try {
      const res = await fetch("/api/company/org/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (res.ok) {
        fetchOrg();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update role");
      }
    } catch (e) {
      console.error("[company-knowledge] update role error:", e);
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!confirm("Remove this member from the organization?")) return;
    try {
      const res = await fetch(`/api/company/org/members?userId=${userId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchOrg();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to remove member");
      }
    } catch (e) {
      console.error("[company-knowledge] remove member error:", e);
    }
  }

  // ── Admin Gate ───────────────────────────────────────────────────────
  if (!roleLoading && !isAdmin) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Company Knowledge Base is only available to administrators.
            </p>
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── No Org State ─────────────────────────────────────────────────────
  if (!loading && !org) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Company Knowledge Base
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground">
              You are not part of an organization yet. Create one to start sharing
              documents with your team.
            </p>
            <form onSubmit={handleCreateOrg} className="flex gap-3">
              <Input
                placeholder="Organization name (e.g., Aspire)"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={creatingOrg || !newOrgName.trim()}>
                {creatingOrg ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {org?.logo_url ? (
              <img
                src={org.logo_url}
                alt={org.name}
                className="h-8 object-contain"
              />
            ) : (
              <>
                <Building2 className="w-6 h-6" />
                {org?.name}
              </>
            )}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isOrgAdmin ? "Admin" : "Member"} · Plan: {org?.plan}
          </p>
        </div>
        <Badge variant="outline">{members.length} member{members.length !== 1 ? "s" : ""}</Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="documents">Knowledge Base</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          {isOrgAdmin && <TabsTrigger value="settings">Settings</TabsTrigger>}
        </TabsList>

        {/* ── Knowledge Base Tab ─────────────────────────────────────── */}
        <TabsContent value="documents" className="space-y-4">
          {/* Website Extraction */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="w-4 h-4" />
                AI Company Profile Extraction
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Extract your company profile from your website to create structured context for role-play scenarios.
              </p>
              <UrlChipInput
                label="Website URLs"
                value={onboardingUrls}
                onChange={setOnboardingUrls}
              />
            </CardContent>
          </Card>

          {/* Document Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Upload className="w-4 h-4" />
                Upload Document
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <Label className="text-xs mb-1 block">Product Type</Label>
                  <Select value={selectedProductType} onValueChange={(v) => setSelectedProductType(v ?? "payment")}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select type">
                        {PRODUCT_TYPE_LABELS[selectedProductType] || "Select type"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="payment">Payment</SelectItem>
                      <SelectItem value="eor">EoR</SelectItem>
                      <SelectItem value="cards">Cards</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label className="text-xs mb-1 block">Document Type</Label>
                  <Select value={selectedDocumentType} onValueChange={(v) => setSelectedDocumentType(v ?? "icp")}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select type">
                        {DOCUMENT_TYPE_LABELS[selectedDocumentType] || "Select type"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="icp">ICP</SelectItem>
                      <SelectItem value="value_prop">Value Prop</SelectItem>
                      <SelectItem value="competitive">Competitive</SelectItem>
                      <SelectItem value="objection_handling">Objection Handling</SelectItem>
                      <SelectItem value="product_pricing">Product/Pricing</SelectItem>
                      <SelectItem value="process_methodology">Process/Methodology</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label className="text-xs mb-1 block">File</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.pptx,.txt,.md,.json,.csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                    multiple
                    onChange={handleFilePick}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-background text-sm transition-colors cursor-pointer hover:bg-accent hover:text-accent-foreground ${
                      uploading ? "opacity-50" : ""
                    }`}
                  >
                    <Upload className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="truncate flex-1">
                      {selectedFiles.length === 0
                        ? "Click to choose files"
                        : `${selectedFiles.length} file(s) selected`}
                    </span>
                    {selectedFiles.length > 0 && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClearFiles();
                        }}
                        className="ml-auto text-muted-foreground hover:text-red-500 cursor-pointer shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={handleUpload}
                  disabled={selectedFiles.length === 0 || uploading}
                  className="min-w-[100px]"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-1" />
                      Upload
                    </>
                  )}
                </Button>

                {uploadStatus !== "idle" && (
                  <div
                    className={`flex items-center gap-2 text-sm ${
                      uploadStatus === "success" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {uploadStatus === "success" ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    {uploadMessage}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Document List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="w-4 h-4" />
                Knowledge Base ({docs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {docs.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">
                  No documents uploaded yet. Upload your first document above.
                </p>
              ) : (
                <div className="space-y-2">
                  {docs.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                        <p className="text-sm font-medium truncate">{doc.name}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex flex-col gap-1 items-end">
                          <Badge
                            className={`text-xs ${
                              PRODUCT_TYPE_COLORS[doc.doc_type] || "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {PRODUCT_TYPE_LABELS[doc.doc_type] || doc.doc_type}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}
                          </span>
                        </div>
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-muted-foreground">
                            {doc.creator_name || doc.creator_email?.split("@")[0] || "Unknown"}
                            {doc.creator_role && (
                              <span className="ml-1 text-[10px] uppercase tracking-wider opacity-70">
                                ({doc.creator_role})
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-muted-foreground/70">
                            {new Date(doc.created_at).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteDoc(doc.file_path)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
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

          {/* ── Delete Document Dialog ─────────────────────────────────────── */}
          <Dialog open={deleteDocOpen} onOpenChange={setDeleteDocOpen}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-base">Delete document?</DialogTitle>
                <DialogDescription>
                  This will permanently remove the document and all its indexed chunks from the knowledge base.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2">
                <Button variant="outline" className="rounded-xl" onClick={() => setDeleteDocOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" className="rounded-xl gap-1" onClick={confirmDeleteDoc}>
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ── Members Tab ────────────────────────────────────────────── */}
        <TabsContent value="members" className="space-y-4">
          {/* Invite Section (Admin only) */}
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
                  <div
                    className={`flex items-center gap-2 text-sm ${
                      inviteStatus === "success" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {inviteStatus === "success" ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    {inviteMessage}
                  </div>
                )}

                {invites.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Pending Invites
                    </p>
                    {invites.map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          <Mail className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm">{inv.email}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(inv.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Members List */}
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
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {m.full_name || m.email.split("@")[0]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {m.position || "No position"} · {m.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isOrgAdmin && org?.created_by !== m.id && (
                        <>
                          <Select
                            value={m.role || "user"}
                            onValueChange={(v) => handleUpdateMemberRole(m.id, v ?? "user")}
                          >
                            <SelectTrigger className="w-[100px] h-7 text-xs">
                              <SelectValue />
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
                        <Badge variant="secondary" className="text-xs">
                          Owner
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Settings Tab ───────────────────────────────────────────── */}
        {isOrgAdmin && (
          <TabsContent value="settings" className="space-y-4">
            {/* Branding */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="w-4 h-4" />
                  Branding
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleSaveSettings} className="space-y-4">
                  {/* Logo */}
                  <div>
                    <Label className="text-xs mb-1 block">Company Logo</Label>
                    <div className="flex items-center gap-3">
                      {logoUrl && (
                        <img
                          src={logoUrl}
                          alt="Logo preview"
                          className="w-12 h-12 rounded-lg object-contain border shrink-0"
                        />
                      )}
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFileSelect}
                        className="hidden"
                      />
                      <div
                        onClick={() => logoInputRef.current?.click()}
                        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-md border border-input bg-background text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        <Upload className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="truncate flex-1">
                          {logoUrl ? "Change logo" : "Click to choose a file"}
                        </span>
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
                    <p className="text-xs text-muted-foreground mt-1">
                      Upload a PNG/JPG logo. It will be shown on the company page.
                    </p>
                  </div>

                  {/* Email Domain Restriction */}
                  <div>
                    <Label className="text-xs mb-1 block">Invite Email Domain</Label>
                    <Input
                      value={emailDomain}
                      onChange={(e) => setEmailDomain(e.target.value)}
                      placeholder="aspire.com"
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Only emails from this domain can be invited. Leave blank to allow any domain.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <Button type="submit" disabled={savingSettings}>
                      {savingSettings ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Save Settings"
                      )}
                    </Button>
                    {settingsStatus !== "idle" && (
                      <div
                        className={`flex items-center gap-2 text-sm ${
                          settingsStatus === "success" ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {settingsStatus === "success" ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <AlertCircle className="w-4 h-4" />
                        )}
                        {settingsMessage}
                      </div>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* ── Danger Zone ─────────────────────────────────────────────────── */}
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
                      This action cannot be undone.
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={deletingOrg}
                    onClick={handleDeleteOrg}
                  >
                    {deletingOrg ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-1" />
                    )}
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* ── Delete Confirmation Dialog ─────────────────────────────────── */}
            <Dialog open={deleteOrgOpen} onOpenChange={setDeleteOrgOpen}>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle className="text-base">Delete organization?</DialogTitle>
                  <DialogDescription>
                    This will permanently remove the organization. All members will be unlinked and all data will be lost. This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                {deleteOrgError && (
                  <div className="text-sm text-red-600 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {deleteOrgError}
                  </div>
                )}
                <DialogFooter className="gap-2">
                  <Button variant="outline" className="rounded-xl" onClick={() => setDeleteOrgOpen(false)} disabled={deletingOrg}>
                    Cancel
                  </Button>
                  <Button variant="destructive" className="rounded-xl gap-1" onClick={confirmDeleteOrg} disabled={deletingOrg}>
                    {deletingOrg ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
