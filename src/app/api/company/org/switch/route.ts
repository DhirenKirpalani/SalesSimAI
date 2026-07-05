import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/company/org/switch
 * Switches the user's active organization to one they are a member of.
 */
export async function POST(req: NextRequest) {
  try {
    const { organizationId } = await req.json();
    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[api/company/org/switch POST] switching", { userId: user.id, organizationId });

    // Verify membership (with fallback for pre-migration / legacy orgs)
    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError) {
      console.error("[api/company/org/switch POST] membership lookup error:", membershipError);
    }
    console.log("[api/company/org/switch POST] membership found:", membership);

    let canSwitch = !!membership;

    if (!canSwitch) {
      // Fallback: check if user is the org creator or if it's their active profile org
      const [{ data: profile }, { data: org }] = await Promise.all([
        supabase.from("profiles").select("organization_id").eq("id", user.id).single(),
        supabase.from("organizations").select("created_by").eq("id", organizationId).single(),
      ]);
      console.log("[api/company/org/switch POST] fallback check:", { profile, org });
      canSwitch = profile?.organization_id === organizationId || org?.created_by === user.id;
    }

    if (!canSwitch) {
      return NextResponse.json({ error: "You are not a member of this organization" }, { status: 403 });
    }

    // Update active org on profile
    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ organization_id: organizationId })
      .eq("id", user.id);

    if (updateErr) {
      console.error("[api/company/org/switch POST]", updateErr);
      return NextResponse.json({ error: "Failed to switch organization" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/company/org/switch POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
