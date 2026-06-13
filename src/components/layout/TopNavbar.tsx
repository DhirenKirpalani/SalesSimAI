"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Bell,
  Menu,
  X,
  Zap,
  LayoutDashboard,
  Library,
  Mic2,
  BarChart3,
  User,
  ShieldCheck,
  Moon,
  Sun,
  Trophy,
  MessageCircle,
  Calendar,
  Info,
  LogOut,
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

const mobileNavItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Scenarios", href: "/scenarios", icon: Library },
  { label: "Simulations", href: "/simulation", icon: Mic2 },
  { label: "Analysis", href: "/analysis", icon: BarChart3 },
  { label: "Profile", href: "/profile", icon: User },
  { label: "Admin", href: "/admin", icon: ShieldCheck },
];

type Notification = {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: "score" | "message" | "reminder" | "system";
};

const sampleNotifications: Notification[] = [
  {
    id: "1",
    title: "New High Score",
    message: "You achieved 92/100 on the Enterprise SaaS scenario.",
    time: "2 hours ago",
    read: false,
    type: "score",
  },
  {
    id: "2",
    title: "Coach Feedback",
    message: "Your objection handling has improved by 15% this week.",
    time: "5 hours ago",
    read: false,
    type: "message",
  },
  {
    id: "3",
    title: "Session Reminder",
    message: "Your scheduled practice session starts in 30 minutes.",
    time: "1 day ago",
    read: true,
    type: "reminder",
  },
  {
    id: "4",
    title: "Weekly Report",
    message: "Your weekly performance summary is now available.",
    time: "2 days ago",
    read: true,
    type: "system",
  },
];

const notificationIcon = (type: Notification["type"]) => {
  const className = "h-4 w-4 text-primary";
  switch (type) {
    case "score": return <Trophy className={className} />;
    case "message": return <MessageCircle className={className} />;
    case "reminder": return <Calendar className={className} />;
    case "system": return <Info className={className} />;
  }
};

export function TopNavbar() {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { darkMode, toggleDarkMode } = useThemeStore();
  const [initials, setInitials] = useState("U");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(sampleNotifications);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      const name = user?.user_metadata?.full_name || user?.email || "U";
      const letters = name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
      setInitials(letters);
    });
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card/80 backdrop-blur px-4 lg:px-6">
      <div className="md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger className="inline-flex items-center justify-center h-9 w-9 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground">
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <Link href="/" className="flex items-center gap-2 px-4 h-16 border-b hover:opacity-80 transition-opacity">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
                <Zap className="w-4 h-4" />
              </div>
              <span className="font-semibold text-sm tracking-tight">SalesSim AI</span>
            </Link>
            <nav className="flex flex-col gap-1 p-3">
              {mobileNavItems.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>
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
            <Button variant="ghost" size="icon" onClick={() => setSearchOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)} className="hidden sm:flex">
            <Search className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Button variant="ghost" size="icon" onClick={toggleDarkMode} className="hidden sm:flex">
        {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>

      <Sheet open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <SheetTrigger>
          <div className="relative inline-flex items-center justify-center h-9 w-9 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
            )}
          </div>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-sm p-0">
          <SheetHeader className="px-4 pt-4 pb-2 pr-10">
            <div className="flex items-center justify-between">
              <SheetTitle>Notifications</SheetTitle>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-primary hover:underline"
                >
                  Mark all as read
                </button>
              )}
            </div>
            <SheetDescription>
              {unreadCount > 0
                ? `You have ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}.`
                : "No new notifications."}
            </SheetDescription>
          </SheetHeader>
          <Separator />
          <ScrollArea className="h-[calc(100vh-8rem)]">
            <div className="flex flex-col">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 hover:bg-accent/50 transition-colors cursor-pointer",
                    !n.read && "bg-primary/5"
                  )}
                >
                  <div className="mt-0.5 shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    {notificationIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight">
                      {n.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {n.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1">
                      {n.time}
                    </p>
                  </div>
                  {!n.read && (
                    <span className="mt-2 shrink-0 h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <DropdownMenu>
        <DropdownMenuTrigger>
          <Avatar className="h-8 w-8 border cursor-pointer">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8}>
          <DropdownMenuItem onClick={() => router.push("/profile")}>
            <User className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
