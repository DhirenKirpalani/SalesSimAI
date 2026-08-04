import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";
import { PageLayout } from "@/components/landing/PageLayout";

export const metadata: Metadata = {
  title: "Day1 | The Gym for Professional Communication",
  description:
    "Day1 helps professionals practice the conversations that determine their careers — interviews, sales calls, feedback, negotiations, and more. Build communication skills through realistic AI roleplay, coaching, and deliberate practice.",
  alternates: {
    canonical: "https://www.day1app.io/",
  },
  openGraph: {
    title: "Day1 | The Gym for Professional Communication",
    description:
      "Day1 helps professionals practice the conversations that determine their careers — interviews, sales calls, feedback, negotiations, and more. Build communication skills through realistic AI roleplay, coaching, and deliberate practice.",
    url: "https://www.day1app.io/",
  },
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebSite",
                name: "Day1",
                url: "https://www.day1app.io/",
                potentialAction: {
                  "@type": "SearchAction",
                  target: "https://www.day1app.io/?q={search_term_string}",
                  "query-input": "required name=search_term_string",
                },
              },
              {
                "@type": "Organization",
                name: "Day1",
                url: "https://www.day1app.io/",
                logo: "https://www.day1app.io/images/Logo.png",
                sameAs: [],
              },
              {
                "@type": "SoftwareApplication",
                name: "Day1",
                applicationCategory: "BusinessApplication",
                operatingSystem: "Web",
                offers: {
                  "@type": "Offer",
                  price: "0",
                  priceCurrency: "USD",
                },
                description:
                  "Professional communication training platform. Practice interviews, sales calls, feedback, negotiations, and other career-defining conversations with realistic AI personas. Get personalized coaching and track improvement over time.",
                aggregateRating: {
                  "@type": "AggregateRating",
                  ratingValue: "4.8",
                  ratingCount: "120",
                },
              },
            ],
          }),
        }}
      />
      <PageLayout>
        <LandingPage />
      </PageLayout>
    </>
  );
}
