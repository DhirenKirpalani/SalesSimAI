"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Mail, User, Loader2, Check, AlertCircle, Briefcase } from "lucide-react";

interface Profile {
  full_name: string | null;
  email: string;
  role: string;
  company: string | null;
  position: string | null;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    const supabase = createClient();

    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("full_name, email, role, company, position")
        .eq("id", user.id)
        .single();

      if (data) {
        setProfile(data);
      } else {
        setProfile({
          full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
          email: user.email || "",
          role: "user",
          company: user.user_metadata?.company || null,
          position: user.user_metadata?.position || null,
        });
      }
      setLoading(false);
    }

    loadProfile();
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setStatus("idle");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      setStatus("error");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name,
        company: profile.company,
        position: profile.position,
      })
      .eq("id", user.id);

    if (error) {
      setStatus("error");
    } else {
      setStatus("success");
      // Also update auth metadata so navbar initials stay in sync
      await supabase.auth.updateUser({
        data: { full_name: profile.full_name, company: profile.company, position: profile.position },
      });
    }
    setSaving(false);
  };

  const initials = (profile?.full_name || profile?.email || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account settings and preferences.
        </p>
      </div>

      {/* Profile Info — Editable */}
      <Card className="rounded-2xl border bg-card shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border">
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-lg">{profile?.full_name || profile?.email}</p>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-xs font-medium">Full Name</Label>
              <Input
                id="full_name"
                value={profile?.full_name || ""}
                onChange={(e) => setProfile((p) => p ? { ...p, full_name: e.target.value } : p)}
                placeholder="Your name"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company" className="text-xs font-medium">Company</Label>
              <Input
                id="company"
                value={profile?.company || ""}
                onChange={(e) => setProfile((p) => p ? { ...p, company: e.target.value } : p)}
                placeholder="Your organization"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position" className="text-xs font-medium flex items-center gap-1">
                <Briefcase className="w-3 h-3" /> Position
              </Label>
              <Input
                id="position"
                value={profile?.position || ""}
                onChange={(e) => setProfile((p) => p ? { ...p, position: e.target.value } : p)}
                placeholder="e.g. CFO, Head of Sales"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-1">
                <User className="w-3 h-3" /> Role
              </Label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border bg-muted/30 text-sm text-muted-foreground">
                <span className="capitalize">{profile?.role || "user"}</span>
                <span className="text-[10px] text-muted-foreground/60">(managed by admin)</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-1">
                <Mail className="w-3 h-3" /> Email
              </Label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border bg-muted/30 text-sm text-muted-foreground">
                {profile?.email}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl gap-2"
              size="sm"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Save Changes
            </Button>
            {status === "success" && (
              <span className="text-xs text-emerald-500 flex items-center gap-1">
                <Check className="w-3 h-3" /> Saved successfully
              </span>
            )}
            {status === "error" && (
              <span className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Failed to save
              </span>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
