const { config } = require("dotenv");
config();
const { createClient } = require("@supabase/supabase-js");

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const ID = "7fbba96d-66ec-4f46-ab38-68614a0124f6";

const newContextNote = [
  "FIRST ROUND INTERVIEW — BEHAVIORAL / PERSONAL",
  "",
  "This is a 1st-round interview with Jordan Lee, VP of Sales at Day1 (a B2B sales training company). The questions are NOT company-specific — they focus on the candidate's personal experience, character, and judgment. Jordan does not ask about Day1 products, the sales training industry, or company-specific scenarios.",
  "",
  "Let the conversation flow naturally. Follow your curiosity. Dig deep into interesting answers. Move on when you've heard enough.",
  "",
  "One question at a time. Short questions. React to what you hear.",
].join("\n");

(async () => {
  const { error } = await s.from("custom_scenarios").update({ context_note: newContextNote }).eq("id", ID);
  if (error) {
    console.error("err:", error.message);
    process.exit(1);
  }
  console.log("✅ context_note updated — removed numbered question flow, kept topic areas as guide");
})();
