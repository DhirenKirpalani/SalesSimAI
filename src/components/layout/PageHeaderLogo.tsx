"use client";

import { useEffect, useState } from "react";

export function PageHeaderLogo() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);

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
    };
    load();
  }, []);

  if (!logoUrl) return null;

  return (
    <img
      src={logoUrl}
      alt={name ?? "Company"}
      className="h-8 max-w-[160px] object-contain mb-3"
    />
  );
}
