"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Bell,
  Menu,
  X,
  LayoutDashboard,
  Library,
  Mic2,
  BarChart3,
  User,
  ShieldCheck,
  BookOpen,
  Moon,
  Sun,
  Trophy,
  MessageCircle,
  Sparkles,
  Info,
  LogOut,
  Building2,
  Loader2,
  Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { useThemeStore } from "@/stores/useThemeStore";
import { createClient } from "@/lib/supabase/client";
import { useRole } from "@/hooks/useRole";
import { Logo } from "@/components/layout/Logo";

const baseMobileNavItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Scenarios", href: "/scenarios", icon: Library },
  { label: "Simulations", href: "/simulations", icon: Mic2 },
  { label: "Analysis", href: "/analysis", icon: BarChart3 },
  { label: "Company Knowledge", href: "/company-knowledge", icon: BookOpen },
  { label: "Workspace", href: "/workspace", icon: Building2 },
  { label: "Profile", href: "/profile", icon: User },
];

type Notification = {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: "score" | "message" | "scenario" | "system" | "invite";
  inviteId?: string;
  orgName?: string;
};

async function fetchReadIds(): Promise<string[]> {
  try {
    const res = await fetch("/api/user/notifications-read");
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.readIds) ? data.readIds : [];
  } catch {
    return [];
  }
}

async function persistReadIds(ids: Set<string>) {
  try {
    await fetch("/api/user/notifications-read", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ readIds: [...ids] }),
    });
  } catch {
    /* ignore */
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const notificationIcon = (type: Notification["type"]) => {
  const className = "h-4 w-4 text-primary";
  switch (type) {
    case "score": return <Trophy className={className} />;
    case "message": return <MessageCircle className={className} />;
    case "scenario": return <Sparkles className={className} />;
    case "system": return <Info className={className} />;
    case "invite": return <Building2 className={className} />;
  }
};

export function TopNavbar() {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { darkMode, toggleDarkMode } = useThemeStore();
  const [initials, setInitials] = useState("U");
  const [userLoading, setUserLoading] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationLimit, setNotificationLimit] = useState(10);
  const [hasMoreNotifications, setHasMoreNotifications] = useState(true);
  const readIdsRef = useRef<Set<string>>(new Set());
  const [acceptingInvite, setAcceptingInvite] = useState<string | null>(null);
  const [acceptedInvites, setAcceptedInvites] = useState<Set<string>>(new Set());
  const [workspaces, setWorkspaces] = useState<{ id: string; name: string; role: string; logo_url?: string | null }[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [switchingWorkspaceId, setSwitchingWorkspaceId] = useState<string | null>(null);

  const { isAdmin } = useRole();

  const buildNotifications = useCallback((sessions: any[], voiceTextSessions: any[], scenarios: any[], invites: any[], readIds: Set<string>): Notification[] => {
    const notifs: Notification[] = [];
    invites.forEach((inv) => {
      const id = `invite-${inv.id}`;
      notifs.push({
        id,
        title: "Organization invite",
        message: inv.invited_by_name
          ? `${inv.invited_by_name} invited you to join ${inv.org_name}.`
          : `You've been invited to join ${inv.org_name}.`,
        time: timeAgo(inv.created_at),
        read: readIds.has(id),
        type: "invite",
        inviteId: inv.id,
        orgName: inv.org_name,
      });
    });
    // Video sessions (HeyGen)
    sessions.forEach((s) => {
      const score = s.overall_score as number | undefined;
      const name = s.scenario_name ?? "a simulation";
      const id = `session-${s.id}`;
      notifs.push({
        id,
        title: score !== undefined ? `Simulation scored ${score}/100` : "Simulation completed",
        message: score !== undefined
          ? `You scored ${score}/100 on "${name}".`
          : `Your simulation "${name}" has ended.`,
        time: timeAgo(s.ended_at ?? s.started_at),
        read: readIds.has(id),
        type: score !== undefined && score >= 80 ? "score" : "message",
      });
    });
    // Voice + text sessions (simulation_sessions)
    voiceTextSessions.forEach((s) => {
      const score = s.overall_score as number | undefined;
      const name = s.scenario_name ?? "a simulation";
      const id = `sim-session-${s.id}`;
      notifs.push({
        id,
        title: score !== undefined ? `Simulation scored ${score}/100` : "Simulation completed",
        message: score !== undefined
          ? `You scored ${score}/100 on "${name}".`
          : `Your simulation "${name}" has ended.`,
        time: timeAgo(s.ended_at ?? s.created_at ?? s.started_at),
        read: readIds.has(id),
        type: score !== undefined && score >= 80 ? "score" : "message",
      });
    });
    scenarios.forEach((s) => {
      const id = `scenario-${s.id}`;
      notifs.push({
        id,
        title: "Scenario created",
        message: `"${s.name}" is ready to practice.`,
        time: timeAgo(s.created_at),
        read: readIds.has(id),
        type: "scenario",
      });
    });
    return notifs.sort((a, b) => {
      if (a.type === "invite" && b.type !== "invite") return -1;
      if (b.type === "invite" && a.type !== "invite") return 1;
      const getTs = (n: Notification) => {
        const s = sessions.find((s) => `session-${s.id}` === n.id);
        if (s) return s.ended_at ?? s.started_at ?? "";
        const vts = voiceTextSessions.find((s) => `sim-session-${s.id}` === n.id);
        if (vts) return vts.ended_at ?? vts.created_at ?? "";
        const sc = scenarios.find((s) => `scenario-${s.id}` === n.id);
        if (sc) return sc.created_at ?? "";
        const inv = invites.find((i: any) => `invite-${i.id}` === n.id);
        return inv?.created_at ?? "";
      };
      return new Date(getTs(b)).getTime() - new Date(getTs(a)).getTime();
    });
  }, []);

  const mobileNavItems = isAdmin
    ? [...baseMobileNavItems, { label: "Admin", href: "/admin", icon: ShieldCheck }]
    : baseMobileNavItems;

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) => {
      const notif = prev.find((n) => n.id === id);
      if (!notif || notif.read) return prev;
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      const ids = new Set([...readIdsRef.current, id]);
      readIdsRef.current = ids;
      persistReadIds(ids);
      return updated;
    });
  };

  const markAllRead = () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      const ids = new Set([...readIdsRef.current, ...updated.map((n) => n.id)]);
      readIdsRef.current = ids;
      persistReadIds(ids);
      return updated;
    });
  };

  useEffect(() => {
    const supabase = createClient();
    let sessionsCache: any[] = [];
    let voiceTextSessionsCache: any[] = [];
    let scenariosCache: any[] = [];
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let userId: string | null = null;

    let invitesCache: any[] = [];

    const load = async () => {
      if (!userId) return;
      const limit = notificationLimit;
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", userId)
        .single();
      const organizationId = userProfile?.organization_id ?? null;
      let scenarioQuery = supabase
        .from("custom_scenarios")
        .select("id, name, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (organizationId) {
        scenarioQuery = scenarioQuery.or(`organization_id.eq.${organizationId},user_id.eq.${userId}`);
      } else {
        scenarioQuery = scenarioQuery.eq("user_id", userId);
      }
      const [{ data: sessions }, { data: voiceTextSessions }, { data: scenarios }, inviteRes] = await Promise.all([
        supabase
          .from("heygen_sessions")
          .select("id, scenario_name, overall_score:analysis->overall_score, started_at, ended_at")
          .eq("user_id", userId)
          .eq("organization_id", organizationId)
          .not("ended_at", "is", null)
          .order("ended_at", { ascending: false })
          .limit(limit),
        supabase
          .from("simulation_sessions")
          .select("id, scenario_name, overall_score:analysis->overall_score, created_at, ended_at")
          .eq("user_id", userId)
          .eq("organization_id", organizationId)
          .not("ended_at", "is", null)
          .order("ended_at", { ascending: false })
          .limit(limit),
        scenarioQuery,
        fetch("/api/company/org/my-invite").then((r) => r.json()).catch(() => ({ invites: [] })),
      ]);
      sessionsCache = sessions ?? [];
      voiceTextSessionsCache = voiceTextSessions ?? [];
      scenariosCache = scenarios ?? [];
      invitesCache = (inviteRes?.invites ?? []).filter((inv: any) => !acceptedInvites.has(inv.id));
      setNotifications(buildNotifications(sessionsCache, voiceTextSessionsCache, scenariosCache, invitesCache, readIdsRef.current));
      setHasMoreNotifications(
        sessionsCache.length === limit ||
        voiceTextSessionsCache.length === limit ||
        scenariosCache.length === limit
      );
    };

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      userId = user.id;

      const name = user?.user_metadata?.full_name || user?.email || "U";
      const letters = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
      setInitials(letters);
      setUserLoading(false);
      readIdsRef.current = new Set(await fetchReadIds());

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();
      const organizationId = userProfile?.organization_id ?? null;

      load();

      pollInterval = setInterval(load, 120_000);

      channel = supabase.channel(`notif_${user.id}_${Date.now()}`);
      channel.on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "heygen_sessions", filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (!payload.new.ended_at) return;
          if (organizationId && payload.new.organization_id !== organizationId) return;
          const updated = payload.new;
          sessionsCache = [updated, ...sessionsCache.filter((s) => s.id !== updated.id)].slice(0, 10);
          setNotifications(buildNotifications(sessionsCache, voiceTextSessionsCache, scenariosCache, invitesCache, readIdsRef.current));
        }
      );
      channel.on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "simulation_sessions", filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (!payload.new.ended_at || payload.new.status !== "completed") return;
          if (organizationId && payload.new.organization_id !== organizationId) return;
          const updated = payload.new;
          voiceTextSessionsCache = [updated, ...voiceTextSessionsCache.filter((s) => s.id !== updated.id)].slice(0, 10);
          setNotifications(buildNotifications(sessionsCache, voiceTextSessionsCache, scenariosCache, invitesCache, readIdsRef.current));
        }
      );
      channel.on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "custom_scenarios", filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (organizationId && payload.new.organization_id !== organizationId) return;
          scenariosCache = [payload.new, ...scenariosCache].slice(0, 5);
          setNotifications(buildNotifications(sessionsCache, voiceTextSessionsCache, scenariosCache, invitesCache, readIdsRef.current));
        }
      );
      if (organizationId) {
        channel.on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "custom_scenarios", filter: `organization_id=eq.${organizationId}` },
          (payload) => {
            scenariosCache = [payload.new, ...scenariosCache].slice(0, 5);
            setNotifications(buildNotifications(sessionsCache, voiceTextSessionsCache, scenariosCache, invitesCache, readIdsRef.current));
          }
        );
      }
      channel.subscribe();
    });

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      if (channel) supabase.removeChannel(channel);
    };
  }, [buildNotifications, acceptedInvites, notificationLimit]);

  async function handleAcceptInvite(inviteId: string, notifId: string) {
    setAcceptingInvite(inviteId);
    try {
      const res = await fetch("/api/company/org/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId }),
      });
      if (res.ok) {
        setAcceptedInvites((prev) => new Set([...prev, inviteId]));
        setNotifications((prev) => prev.filter((n) => n.id !== notifId));
        window.location.reload();
      }
    } catch {
      // silent fail
    } finally {
      setAcceptingInvite(null);
    }
  }

  // Load workspaces for the profile dropdown switcher
  useEffect(() => {
    fetch("/api/company/org/list")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.organizations)) {
          setWorkspaces(data.organizations);
          setActiveWorkspaceId(data.activeOrganizationId ?? null);
        }
      })
      .catch((err) => console.error("[TopNavbar] fetch workspaces error:", err));
  }, []);

  async function handleSwitchWorkspace(workspaceId: string) {
    if (workspaceId === activeWorkspaceId) return;
    setSwitchingWorkspaceId(workspaceId);
    try {
      const res = await fetch("/api/company/org/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: workspaceId }),
      });
      if (res.ok) {
        setActiveWorkspaceId(workspaceId);
        window.location.reload();
      } else {
        const err = await res.json().catch(() => ({}));
        console.error("[TopNavbar] switch workspace error:", err);
      }
    } catch (err) {
      console.error("[TopNavbar] switch workspace error:", err);
    } finally {
      setSwitchingWorkspaceId(null);
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card px-4 lg:px-6">
      <div className="flex items-center gap-3 md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger className="inline-flex items-center justify-center h-10 w-10 rounded-xl text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground">
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] sm:w-72 p-0 rounded-r-2xl">
            <div className="flex items-center px-5 h-16 border-b">
              <Logo />
            </div>
            <div className="px-5 pt-5 pb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Menu</p>
            </div>
            <nav className="flex flex-col gap-1.5 px-3 pb-4">
              {mobileNavItems.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors min-h-[48px]",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <item.icon className={cn("w-5 h-5", active && "text-primary-foreground")} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>
        <Logo />
      </div>

      <div className="hidden md:block">
        <Logo />
      </div>

      <div className="flex-1" />

      <div className={cn("flex items-center gap-2 transition-all", searchOpen ? "flex-1" : "w-auto")}>
        {searchOpen ? (
          <div className="flex items-center gap-2 flex-1">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search scenarios, users, or sessions..."
              className="h-9 flex-1"
              onBlur={() => setSearchOpen(false)}
            />
            <Button variant="ghost" size="icon" onClick={() => setSearchOpen(false)} title="Close search">
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)} className="hidden sm:flex" title="Search">
            <Search className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Button variant="ghost" size="icon" onClick={toggleDarkMode} className="hidden sm:flex" title={darkMode ? "Light mode" : "Dark mode"}>
        {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>

      <Sheet open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <SheetTrigger title="Notifications">
          <div className="relative inline-flex items-center justify-center h-9 w-9 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
            )}
          </div>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 rounded-l-2xl sm:rounded-l-2xl">
          <SheetHeader className="px-4 sm:px-5 pt-5 pb-3 pr-12">
            <div className="flex items-center justify-between gap-3">
              <SheetTitle className="text-base sm:text-lg">Notifications</SheetTitle>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-primary hover:underline shrink-0 mr-10"
                >
                  Mark all as read
                </button>
              )}
            </div>
            <SheetDescription className="text-xs sm:text-sm">
              {unreadCount > 0
                ? `You have ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}.`
                : "No new notifications."}
            </SheetDescription>
          </SheetHeader>
          <Separator />
          <ScrollArea className="h-[calc(100vh-9rem)]">
            <div className="flex flex-col gap-2 p-3 sm:p-4">
              {notifications.slice(0, notificationLimit).map((n) => (
                <div
                  key={n.id}
                  onClick={() => n.type !== "invite" && markAsRead(n.id)}
                  className={cn(
                    "flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl border transition-all",
                    n.type !== "invite" && "hover:bg-accent/40 cursor-pointer",
                    !n.read ? "bg-primary/5 border-primary/10 shadow-sm" : "bg-card border-border"
                  )}
                >
                  <div className={cn(
                    "mt-0.5 shrink-0 w-10 h-10 sm:w-9 sm:h-9 rounded-full flex items-center justify-center",
                    n.type === "invite" ? "bg-blue-500/10 text-blue-600" : "bg-primary/10 text-primary"
                  )}>
                    {notificationIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight">
                      {n.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {n.message}
                    </p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1.5">
                      {n.time}
                    </p>
                    {n.type === "invite" && n.inviteId && (
                      <div className="flex flex-col sm:flex-row gap-2 mt-3">
                        <Button
                          size="sm"
                          onClick={() => handleAcceptInvite(n.inviteId!, n.id)}
                          disabled={acceptingInvite === n.inviteId}
                          className="h-9 sm:h-8 rounded-lg"
                        >
                          {acceptingInvite === n.inviteId ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <><Check className="w-4 h-4 mr-1" /> Accept</>)
                          }
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setNotifications((prev) => prev.filter((x) => x.id !== n.id))}
                          className="h-9 sm:h-8 rounded-lg"
                        >
                          Dismiss
                        </Button>
                      </div>
                    )}
                  </div>
                  {!n.read && n.type !== "invite" && (
                    <span className="mt-2 shrink-0 h-2 w-2 sm:h-1.5 sm:w-1.5 rounded-full bg-primary" />
                  )}
                </div>
              ))}
              {hasMoreNotifications && (
                <button
                  onClick={() => setNotificationLimit((prev) => prev + 10)}
                  className="w-full py-3 text-center text-sm font-medium text-primary hover:bg-accent rounded-xl transition-colors"
                >
                  View more
                </button>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {userLoading ? (
        <div className="h-9 w-9 sm:h-8 sm:w-8 rounded-full bg-muted/60 animate-pulse border" />
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Avatar className="h-9 w-9 sm:h-8 sm:w-8 border cursor-pointer animate-in fade-in duration-300" title="Account menu">
              <AvatarFallback className="text-sm sm:text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="w-72 sm:w-64 rounded-xl">
          <div className="px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Workspaces
          </div>
          {workspaces.map((workspace) => {
            const isActive = workspace.id === activeWorkspaceId;
            return (
              <DropdownMenuItem
                key={workspace.id}
                onClick={() => handleSwitchWorkspace(workspace.id)}
                disabled={switchingWorkspaceId === workspace.id}
                className="flex items-center justify-between py-2.5 px-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {workspace.logo_url ? (
                    <img src={workspace.logo_url} alt="" className="w-5 h-5 object-contain rounded" />
                  ) : (
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                  )}
                  <span className="truncate text-sm">{workspace.name}</span>
                </div>
                {isActive && <Check className="w-4 h-4 text-primary shrink-0 ml-2" />}
                {switchingWorkspaceId === workspace.id && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0 ml-2" />}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/profile")} className="py-2.5 px-3 text-sm">
            <User className="mr-3 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={handleLogout} className="py-2.5 px-3 text-sm">
            <LogOut className="mr-3 h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      )}
    </header>
  );
}
