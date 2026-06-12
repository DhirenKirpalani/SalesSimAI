import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeInit } from "@/components/ThemeInit";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SalesSim AI — Practice Sales Conversations with AI Buyers",
  description:
    "Train against realistic prospects, improve objection handling, and increase close rates with AI-powered sales simulations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeInit />
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
