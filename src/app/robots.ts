import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin/", "/dashboard/", "/analysis/", "/simulation/", "/simulations/", "/scenarios/", "/profile/", "/company-knowledge/", "/company-onboarding/"],
    },
    sitemap: "https://www.day1app.io/sitemap.xml",
  };
}
