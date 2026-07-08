"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Users, Settings, LayoutGrid, Briefcase, Loader2, Calendar, Crown, Mail, Shield, IdCard } from "lucide-react";
import { WorkspaceManagement } from "@/components/workspace/WorkspaceManagement";

interface Member {
  id: string;
  full_name: string | null;
  email: string | null;
  position: string | null;
  role: string;
  created_at: string;
}

interface Organization {
  id: string;
  name: string;
  plan: string;
  logo_url?: string | null;
  email_domain?: string | null;
  theme_color?: string | null;
  theme_colors?: { primary: string; background: string; foreground: string; surface: string } | null;
  created_by?: string;
  created_at: string;
}

interface WorkspaceDetails {
  organization: Organization | null;
  members: Member[];
  isAdmin: boolean;
  creator?: { id: string; full_name: string | null; email: string | null } | null;
  currentUserId?: string;
}

export default function WorkspaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WorkspaceDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch(`/api/company/org?slug=${encodeURIComponent(slug)}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load workspace");
        setData(json);
      })
      .catch((err) => {
        console.error("[WorkspaceDetailPage]", err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-10 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data?.organization) {
    return (
      <div className="max-w-5xl mx-auto py-10 space-y-4">
        <Button variant="outline" onClick={() => router.push("/workspace")}>
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to workspaces
        </Button>
        <div className="text-center py-12 text-muted-foreground bg-card rounded-lg border">
          {error || "Workspace not found."}
        </div>
      </div>
    );
  }

  const org = data.organization;
  const members = data.members;
  const createdAt = new Date(org.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const stats = [
    {
      icon: Users,
      label: "Members",
      value: members.length,
      subtext: members.length === 1 ? "1 person" : `${members.length} people`,
    },
    {
      icon: Shield,
      label: "Your role",
      value: data.isAdmin ? "Admin" : "Member",
      subtext: data.isAdmin ? "Full access" : "Limited access",
    },
    {
      icon: Calendar,
      label: "Created",
      value: createdAt,
      subtext: data.creator?.full_name ? `by ${data.creator.full_name}` : undefined,
    },
    {
      icon: IdCard,
      label: "Plan",
      value: org.plan,
      subtext: "Workspace tier",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => router.push("/workspace")} className="rounded-full">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back
        </Button>
      </div>

      <Card className="overflow-hidden border-0 shadow-md bg-gradient-to-br from-white to-muted/30">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="relative shrink-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white shadow-sm border flex items-center justify-center p-3">
                {org.logo_url ? (
                  <img
                    src={org.logo_url}
                    alt={org.name}
                    className="w-full h-full object-contain"
                    loading="eager"
                    decoding="async"
                    fetchPriority="high"
                  />
                ) : (
                  <Briefcase className="w-12 h-12 sm:w-14 sm:h-14 text-primary/80" />
                )}
              </div>
              {data.creator?.id === org.created_by && (
                <div className="absolute -bottom-2 -right-2 bg-amber-100 text-amber-700 rounded-full p-1.5 border border-background shadow-sm">
                  <Crown className="w-4 h-4" />
                </div>
              )}
            </div>
            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-center sm:justify-start">
                <h1 className="text-3xl font-bold tracking-tight">{org.name}</h1>
                <Badge className="w-fit mx-auto sm:mx-0 capitalize bg-primary/10 text-primary hover:bg-primary/10 border-0">
                  {org.plan}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {data.isAdmin ? "Workspace admin" : "Workspace member"}
                {data.creator?.full_name && (
                  <span className="hidden sm:inline"> · Created by {data.creator.full_name}</span>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full sm:w-fit grid grid-cols-3 sm:flex bg-muted/60 border border-border/60 rounded-full p-0 shadow-sm h-auto gap-0">
          <TabsTrigger
            value="overview"
            className="w-full sm:w-auto sm:flex-none h-auto gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-muted/80 data-active:bg-primary data-active:text-primary-foreground data-active:hover:bg-primary data-active:hover:text-primary-foreground"
          >
            <LayoutGrid className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="members"
            className="w-full sm:w-auto sm:flex-none h-auto gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-muted/80 data-active:bg-primary data-active:text-primary-foreground data-active:hover:bg-primary data-active:hover:text-primary-foreground"
          >
            <Users className="w-4 h-4" />
            Members
          </TabsTrigger>
          {data.isAdmin && (
            <TabsTrigger
              value="settings"
              className="w-full sm:w-auto sm:flex-none h-auto gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-muted/80 data-active:bg-primary data-active:text-primary-foreground data-active:hover:bg-primary data-active:hover:text-primary-foreground"
            >
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-4 pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <Card key={stat.label} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <stat.icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</span>
                  </div>
                  <div>
                    <p className="text-lg font-semibold">{stat.value}</p>
                    {stat.subtext && <p className="text-xs text-muted-foreground mt-0.5">{stat.subtext}</p>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                Workspace details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Workspace name</p>
                  <p className="font-medium">{org.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Plan</p>
                  <p className="font-medium capitalize">{org.plan}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium">{createdAt}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Created by</p>
                  <p className="font-medium">{data.creator?.full_name || "Unknown"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="space-y-4 pt-3">
          <WorkspaceManagement
            organizationId={org.id}
            isOrgAdmin={data.isAdmin}
            currentUserId={data.currentUserId}
            mode="members"
          />
        </TabsContent>

        {data.isAdmin && (
          <TabsContent value="settings" className="space-y-4 pt-3">
            <WorkspaceManagement
              organizationId={org.id}
              isOrgAdmin={data.isAdmin}
              currentUserId={data.currentUserId}
              initialLogoUrl={org.logo_url}
              mode="settings"
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
