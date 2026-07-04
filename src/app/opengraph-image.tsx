import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";
export const alt = "Day1 — Practice Sales Conversations with AI Buyers";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const filePath = join(process.cwd(), "public", "images", "Logo-footer.png");
    const buffer = await readFile(filePath);
    const base64 = buffer.toString("base64");
    return `data:image/png;base64,${base64}`;
  } catch (err) {
    console.error("[opengraph-image] failed to load logo:", err);
    return null;
  }
}

export default async function Image() {
  const logoUrl = await loadLogoDataUrl();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0B0F1A 0%, #151B2B 100%)",
          padding: 64,
        }}
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Day1"
            height={80}
            style={{
              objectFit: "contain",
              marginBottom: 48,
            }}
          />
        ) : (
          <div
            style={{
              fontSize: 80,
              fontWeight: 700,
              color: "#FFFFFF",
              fontFamily: "Inter, sans-serif",
              marginBottom: 48,
            }}
          >
            Day1
          </div>
        )}
        <div
          style={{
            fontSize: 40,
            color: "#F05A28",
            fontWeight: 600,
            textAlign: "center",
            maxWidth: 900,
            fontFamily: "Inter, sans-serif",
            lineHeight: 1.3,
          }}
        >
          Practice Sales Conversations with AI Buyers
        </div>
        <div
          style={{
            fontSize: 28,
            color: "#9AA4B2",
            textAlign: "center",
            maxWidth: 800,
            marginTop: 32,
            fontFamily: "Inter, sans-serif",
            lineHeight: 1.4,
          }}
        >
          Train against realistic prospects, improve objection handling, and increase close rates.
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
