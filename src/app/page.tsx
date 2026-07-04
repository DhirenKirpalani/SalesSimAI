import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "Day1 | AI Field Intelligence for Sales Teams",
  description:
    "Day1 turns your sales calls into a live intelligence loop — surfacing objections and use cases for leaders and keeping AI roleplay and battle cards current for reps.",
  alternates: {
    canonical: "https://www.day1app.io/",
  },
  openGraph: {
    title: "Day1 | AI Field Intelligence for Sales Teams",
    description:
      "Day1 turns your sales calls into a live intelligence loop — surfacing objections and use cases for leaders and keeping AI roleplay and battle cards current for reps.",
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
                  "AI-powered sales training platform for B2B teams. Practice discovery calls, objection handling, and fintech sales conversations with realistic AI buyers.",
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
      <LandingPage />
    </>
  );
}
