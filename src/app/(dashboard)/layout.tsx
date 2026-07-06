"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNavbar } from "@/components/layout/TopNavbar";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isSimulation = pathname === "/simulation";

  return (
    <ThemeProvider>
      <div className="flex min-h-screen flex-col bg-background">
        <TopNavbar />
        <div className="flex flex-1 min-h-0">
          {!isSimulation && <Sidebar />}
          <main className={cn("flex-1 overflow-y-auto", !isSimulation && "p-4 lg:p-6")}>
            {children}
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
