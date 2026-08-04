"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/layout/Logo";
import { User, Users, ArrowRight, Loader2 } from "lucide-react";

type Mode = null | "personal" | "create" | "join";

export default function OnboardingPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(null);
  const [name, setName] = useState("");
  const [inviteId, setInviteId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePersonal = async () => {
    setLoading(true);
    router.push("/dashboard");
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/company/org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create workspace");
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  const handleJoinWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = inviteId.trim().split("/").pop() ?? inviteId.trim();
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/company/org/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Invalid invite");
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/[0.03] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-primary/[0.04] rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-10">
          <Logo href="/" className="inline-flex items-center justify-center mb-6 hover:opacity-80 transition-opacity text-xl" />
          <h1 className="text-2xl font-bold tracking-tight">How will you use Day1?</h1>
          <p className="mt-2 text-sm text-muted-foreground">You can always change this later in settings.</p>
        </div>

        <AnimatePresence mode="wait">
          {!mode && (
            <motion.div
              key="choice"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="space-y-3"
            >
              {/* Personal */}
              <button
                onClick={() => setMode("personal")}
                className="w-full text-left rounded-2xl border border-border bg-card hover:border-primary/40 hover:bg-primary/[0.02] transition-all p-5 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">Just me — personal practice</p>
                    <p className="text-sm text-muted-foreground mt-0.5">Practice interviews, negotiations, and career conversations on your own.</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </div>
              </button>

              {/* Create workspace */}
              <button
                onClick={() => setMode("create")}
                className="w-full text-left rounded-2xl border border-border bg-card hover:border-primary/40 hover:bg-primary/[0.02] transition-all p-5 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">Create a team workspace</p>
                    <p className="text-sm text-muted-foreground mt-0.5">Set up a shared space for your team to practice and track progress together.</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </div>
              </button>

              {/* Join workspace */}
              <button
                onClick={() => setMode("join")}
                className="w-full text-left rounded-2xl border border-border bg-card hover:border-primary/40 hover:bg-primary/[0.02] transition-all p-5 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">Join an existing workspace</p>
                    <p className="text-sm text-muted-foreground mt-0.5">Enter an invite link or code from your team admin.</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </div>
              </button>
            </motion.div>
          )}

          {mode === "personal" && (
            <motion.div
              key="personal"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="rounded-2xl border border-border bg-card p-6 text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mx-auto">
                <User className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold">Personal practice mode</p>
                <p className="text-sm text-muted-foreground mt-1">You'll start with the full scenario library. Create your own scenarios anytime.</p>
              </div>
              <Button
                onClick={handlePersonal}
                disabled={loading}
                className="w-full rounded-xl h-11 text-sm font-semibold"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Go to dashboard <ArrowRight className="w-4 h-4 ml-1" /></>}
              </Button>
              <button onClick={() => setMode(null)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                ← Back
              </button>
            </motion.div>
          )}

          {mode === "create" && (
            <motion.div
              key="create"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="rounded-2xl border border-border bg-card p-6 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold">Create a workspace</p>
                  <p className="text-xs text-muted-foreground">You'll be the admin — invite your team after.</p>
                </div>
              </div>
              <form onSubmit={handleCreateWorkspace} className="space-y-3">
                <Input
                  placeholder="Workspace name (e.g. Acme Sales Team)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-xl h-11"
                  required
                  autoFocus
                />
                {error && <p className="text-xs text-destructive">{error}</p>}
                <Button type="submit" disabled={loading || !name.trim()} className="w-full rounded-xl h-11 text-sm font-semibold">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Create workspace <ArrowRight className="w-4 h-4 ml-1" /></>}
                </Button>
              </form>
              <button onClick={() => { setMode(null); setError(null); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                ← Back
              </button>
            </motion.div>
          )}

          {mode === "join" && (
            <motion.div
              key="join"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="rounded-2xl border border-border bg-card p-6 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                  <ArrowRight className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold">Join a workspace</p>
                  <p className="text-xs text-muted-foreground">Paste the invite link or code from your admin.</p>
                </div>
              </div>
              <form onSubmit={handleJoinWorkspace} className="space-y-3">
                <Input
                  placeholder="Invite link or code"
                  value={inviteId}
                  onChange={(e) => setInviteId(e.target.value)}
                  className="rounded-xl h-11"
                  required
                  autoFocus
                />
                {error && <p className="text-xs text-destructive">{error}</p>}
                <Button type="submit" disabled={loading || !inviteId.trim()} className="w-full rounded-xl h-11 text-sm font-semibold">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Join workspace <ArrowRight className="w-4 h-4 ml-1" /></>}
                </Button>
              </form>
              <button onClick={() => { setMode(null); setError(null); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                ← Back
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
