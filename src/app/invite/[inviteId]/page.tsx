"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle, AlertCircle, Loader2, Building2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface InviteDetails {
  id: string;
  email: string;
  org_name: string;
  status: string;
}

export default function InviteAcceptPage() {
  const { inviteId } = useParams<{ inviteId: string }>();
  const router = useRouter();

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [inviteRes, supabase] = await Promise.all([
          fetch(`/api/company/org/invite/${inviteId}`),
          Promise.resolve(createClient()),
        ]);

        const inviteData = await inviteRes.json();
        if (!inviteRes.ok) {
          setFetchError(inviteData.error ?? "Invalid or expired invite link.");
        } else {
          setInvite(inviteData.invite);
        }

        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUserEmail(user?.email ?? null);
      } catch {
        setFetchError("Failed to load invite details.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [inviteId]);

  async function handleAccept() {
    setAccepting(true);
    setAcceptError(null);
    try {
      const res = await fetch("/api/company/org/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId }),
      });
      const data = await res.json();
      if (res.ok) {
        setAccepted(true);
        setTimeout(() => router.push("/dashboard"), 2000);
      } else {
        setAcceptError(data.error ?? "Failed to accept invite.");
      }
    } catch {
      setAcceptError("Something went wrong. Please try again.");
    } finally {
      setAccepting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-6 flex flex-col items-center gap-4 text-center">
            <AlertCircle className="w-10 h-10 text-destructive" />
            <p className="font-semibold text-lg">Invite not found</p>
            <p className="text-sm text-muted-foreground">{fetchError}</p>
            <Link href="/login" className={cn(buttonVariants({ variant: "outline" }))}>Go to Sign In</Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-6 flex flex-col items-center gap-4 text-center">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
            <p className="font-semibold text-lg">You&apos;ve joined {invite?.org_name}!</p>
            <p className="text-sm text-muted-foreground">Redirecting to your dashboard…</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const emailMatches = currentUserEmail?.toLowerCase() === invite?.email.toLowerCase();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-xl">You&apos;ve been invited</CardTitle>
          <CardDescription>
            Join <span className="font-semibold text-foreground">{invite?.org_name}</span> on SalesSim AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-4">
          <div className="rounded-lg bg-muted px-4 py-3 text-sm text-center text-muted-foreground">
            Invite sent to <span className="font-medium text-foreground">{invite?.email}</span>
          </div>

          {!currentUserEmail ? (
            <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground">
                Sign in or create an account with <strong>{invite?.email}</strong> to accept.
              </p>
              <Link href={`/login?redirect=/invite/${inviteId}`} className={cn(buttonVariants({ variant: "default" }), "w-full justify-center")}>Sign In</Link>
              <Link href={`/signup?redirect=/invite/${inviteId}&email=${encodeURIComponent(invite?.email ?? "")}`} className={cn(buttonVariants({ variant: "outline" }), "w-full justify-center")}>Create Account</Link>
            </div>
          ) : emailMatches ? (
            <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground">
                Signed in as <strong>{currentUserEmail}</strong>
              </p>
              {acceptError && (
                <p className="text-sm text-destructive text-center">{acceptError}</p>
              )}
              <Button onClick={handleAccept} disabled={accepting} className="w-full">
                {accepting ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />Accepting…</>
                ) : (
                  "Accept Invite & Join"
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-4 py-3 text-sm text-center text-amber-800 dark:text-amber-300">
                You&apos;re signed in as <strong>{currentUserEmail}</strong>. This invite is for{" "}
                <strong>{invite?.email}</strong>. Please sign in with the correct account.
              </div>
              <Link href={`/login?redirect=/invite/${inviteId}`} className={cn(buttonVariants({ variant: "outline" }), "w-full justify-center")}>Sign In with Different Account</Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
