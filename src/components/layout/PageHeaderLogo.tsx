"use client";

import { useEffect, useState } from "react";

export function PageHeaderLogo() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/company/org");
        const data = await res.json();
        if (data.organization) {
          setLogoUrl(data.organization.logo_url ?? null);
          setName(data.organization.name ?? null);
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return <div className="h-8 w-32 bg-muted/60 rounded-md mb-3 animate-pulse" />;
  }

  if (!logoUrl) return <div className="h-8 mb-3" />;

  return (
    <img
      src={logoUrl}
      alt={name ?? "Company"}
      className="h-8 max-w-[160px] object-contain mb-3 animate-in fade-in duration-500"
      loading="eager"
    />
  );
}
