const { config } = require("dotenv");
config();
const { createClient } = require("@supabase/supabase-js");

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const ID = "7fbba96d-66ec-4f46-ab38-68614a0124f6";

(async () => {
  const { error } = await s.from("custom_scenarios").update({
    seller_description: "A first-round behavioral interview simulation. The hiring manager is from Day1 (a B2B sales training company) but the questions are personal and experience-based — NOT company-specific. The candidate is asked about their background, challenges, failures, conflicts, strengths, and career vision. The interviewer asks short, natural questions and follows up based on what they hear.",
  }).eq("id", ID);
  if (error) {
    console.error("err:", error.message);
    process.exit(1);
  }
  console.log("✅ seller_description updated — removed STAR framework reference");
})();
