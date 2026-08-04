"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/layout/Logo";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
    }
  };

  const getInboxUrl = (email: string) => {
    const domain = email.split("@")[1]?.toLowerCase() ?? "";
    if (domain === "gmail.com" || domain === "googlemail.com") return "https://mail.google.com";
    if (domain === "outlook.com" || domain === "hotmail.com" || domain === "live.com" || domain === "msn.com") return "https://outlook.live.com";
    if (domain === "yahoo.com" || domain === "yahoo.co.uk") return "https://mail.yahoo.com";
    if (domain === "icloud.com" || domain === "me.com" || domain === "mac.com") return "https://www.icloud.com/mail";
    return null;
  };

  const handleGoogle = async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/[0.03] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-primary/[0.04] rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="text-center mb-8">
          <Logo href="/" className="inline-flex items-center justify-center mb-6 hover:opacity-80 transition-opacity text-xl" />
          <h1 className="text-2xl font-bold tracking-tight">Start practicing</h1>
          <p className="mt-2 text-sm text-muted-foreground">Free to start. No credit card required.</p>
        </div>

        <Card className="rounded-2xl border bg-gradient-to-b from-card to-card/90 shadow-xl shadow-primary/10">
          <CardContent className="p-6 space-y-3">
            {sent ? (
              <div className="text-center space-y-4 py-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Check your email</p>
                  <p className="text-sm text-muted-foreground mt-1">We sent a sign-in link to <strong>{email}</strong>. Click it to continue.</p>
                </div>
                {getInboxUrl(email) && (
                  <a
                    href={getInboxUrl(email)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                  >
                    Open inbox
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
                <button
                  onClick={() => setSent(false)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
                >
                  Use a different email
                </button>
              </div>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="w-full rounded-xl h-12 text-sm font-medium gap-2"
                  onClick={handleGoogle}
                  type="button"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Continue with Google
                </Button>

                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                  <div className="relative flex justify-center text-[10px] uppercase">
                    <span className="bg-card px-2 text-muted-foreground">or</span>
                  </div>
                </div>

                <form onSubmit={handleMagicLink} className="space-y-3">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="rounded-xl h-12 pl-10"
                      required
                    />
                  </div>
                  {error && <p className="text-xs text-destructive text-center">{error}</p>}
                  <Button type="submit" className="w-full rounded-xl h-12 text-sm font-semibold" disabled={loading}>
                    {loading ? "Sending link..." : "Continue with email"}
                    {!loading && <ArrowRight className="w-4 h-4 ml-1" />}
                  </Button>
                </form>

                <p className="text-center text-xs text-muted-foreground pt-1">
                  We'll email you a magic link — no password needed.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-5">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
