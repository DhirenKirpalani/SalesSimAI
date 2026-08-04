import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeInit } from "@/components/ThemeInit";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#F76918",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.day1app.io/"),
  title: {
    default: "Day1 — The Gym for Professional Communication",
    template: "%s | Day1",
  },
  description:
    "Day1 helps professionals practice the conversations that determine their careers — interviews, sales calls, feedback, negotiations, and more. Build communication skills through realistic AI roleplay, coaching, and deliberate practice.",
  keywords: [
    "professional communication",
    "conversation practice",
    "AI roleplay",
    "interview practice",
    "sales simulation",
    "communication skills",
    "negotiation practice",
    "feedback practice",
    "AI coaching",
    "deliberate practice",
    "career preparation",
    "difficult conversations",
    "executive communication",
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
    title: "Day1 — The Gym for Professional Communication",
    description:
      "Day1 helps professionals practice the conversations that determine their careers — interviews, sales calls, feedback, negotiations, and more. Build communication skills through realistic AI roleplay, coaching, and deliberate practice.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Day1 — The Gym for Professional Communication",
    description:
      "Day1 helps professionals practice the conversations that determine their careers — interviews, sales calls, feedback, negotiations, and more. Build communication skills through realistic AI roleplay, coaching, and deliberate practice.",
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
      className={`${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const item = localStorage.getItem("sales-sim-theme");
                  if (item) {
                    const parsed = JSON.parse(item);
                    if (parsed?.state?.darkMode === true) {
                      document.documentElement.classList.add("dark");
                    } else {
                      document.documentElement.classList.remove("dark");
                    }
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeInit />
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
