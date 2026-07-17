const { config } = require("dotenv");
config();
const { createClient } = require("@supabase/supabase-js");

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const ORG_ID = "d2fd0f80-2910-4dd1-aba6-236a2becdcbd";

(async () => {
  // Find a user in this org
  const { data: profiles, error: profErr } = await s
    .from("profiles")
    .select("id, email, full_name")
    .eq("organization_id", ORG_ID);

  if (profErr) {
    console.error("profile err:", profErr.message);
    process.exit(1);
  }

  if (!profiles || profiles.length === 0) {
    console.log("No profiles found in org. Trying to find org owner...");
    const { data: org, error: orgErr } = await s
      .from("organizations")
      .select("id, name, created_by")
      .eq("id", ORG_ID)
      .single();

    if (orgErr) {
      console.error("org err:", orgErr.message);
      process.exit(1);
    }
    console.log("Org:", org);
    if (org?.created_by) {
      console.log("Org created_by:", org.created_by);
    }
    process.exit(0);
  }

  console.log("Profiles in org:", JSON.stringify(profiles, null, 2));
})();
