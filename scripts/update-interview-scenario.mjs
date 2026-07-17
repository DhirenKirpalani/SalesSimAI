#!/usr/bin/env node
/**
 * One-off script: updates the First Round Interview scenario
 * from Brex → Day1 in the custom_scenarios table.
 *
 * Usage: node scripts/update-interview-scenario.mjs
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SCENARIO_ID = "7fbba96d-66ec-4f46-ab38-68614a0124f6";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  console.log("🔄 Updating scenario to Day1...");

  const { data: existing, error: fetchErr } = await supabase
    .from("custom_scenarios")
    .select("*")
    .eq("id", SCENARIO_ID)
    .single();

  if (fetchErr || !existing) {
    console.error("❌ Could not fetch scenario:", fetchErr?.message);
    process.exit(1);
  }

  // Update custom_persona JSON
  const persona = typeof existing.custom_persona === "string"
    ? JSON.parse(existing.custom_persona)
    : { ...existing.custom_persona };

  persona.company = "Day1";
  persona.industry = "B2B Sales Training";
  persona.personality = persona.personality.replace(
    "a fast-growing fintech company",
    "a fast-growing B2B sales training company"
  );

  // Update context_note
  const contextNote = (existing.context_note || "")
    .replace(/Brex/g, "Day1")
    .replace(/a B2B fintech company/g, "a B2B sales training company")
    .replace(/the fintech industry/g, "the sales training industry");

  const updates = {
    seller_company: "Day1",
    seller_product: "Interview practice — 1st round behavioral interview with a hiring manager at Day1",
    seller_description: existing.seller_description
      .replace(/Brex/g, "Day1")
      .replace(/a B2B fintech company/g, "a B2B sales training company"),
    custom_persona: persona,
    context_note: contextNote,
    name: "First Round Interview — Behavioral (Day1)",
  };

  const { error: updateErr } = await supabase
    .from("custom_scenarios")
    .update(updates)
    .eq("id", SCENARIO_ID);

  if (updateErr) {
    console.error("❌ Update failed:", updateErr.message);
    process.exit(1);
  }

  console.log("✅ Updated successfully:");
  console.log("   seller_company:", updates.seller_company);
  console.log("   name:", updates.name);
  console.log("   persona.company:", persona.company);
  console.log("   persona.industry:", persona.industry);
}

main().catch((err) => {
  console.error("❌ Fatal:", err);
  process.exit(1);
});
