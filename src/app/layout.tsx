import type { Metadata } from "next";
import { Inter, Fraunces, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeInit } from "@/components/ThemeInit";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.day1app.io/"),
  title: {
    default: "Day1 — Practice Sales Conversations with AI Buyers",
    template: "%s | Day1",
  },
  description:
    "Day1 helps B2B and fintech sales teams practice discovery calls, objection handling, and MEDDIC conversations with realistic AI buyers. Increase close rates with AI-powered sales simulations.",
  keywords: [
    "sales training",
    "AI sales coaching",
    "sales simulation",
    "roleplay",
    "objection handling",
    "sales enablement",
    "MEDDIC",
    "revenue team training",
    "fintech sales training",
    "B2B sales coaching",
    "CFO objection handling",
    "compliance sales training",
    "enterprise sales training",
  ],
  authors: [{ name: "Day1" }],
  creator: "Day1",
  publisher: "Day1",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Day1",
    title: "Day1 — Practice Sales Conversations with AI Buyers",
    description:
      "Day1 helps B2B and fintech sales teams practice discovery calls, objection handling, and MEDDIC conversations with realistic AI buyers.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Day1 — Practice Sales Conversations with AI Buyers",
    description:
      "Day1 helps B2B and fintech sales teams practice discovery calls, objection handling, and MEDDIC conversations with realistic AI buyers.",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} ${jetbrainsMono.variable} h-full antialiased overflow-x-hidden`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeInit />
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
