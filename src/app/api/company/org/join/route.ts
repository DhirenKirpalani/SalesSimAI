import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/company/org/join
 * Accept an organization invite by invite ID
 */
export async function POST(req: NextRequest) {
  try {
    const { inviteId } = await req.json();
    if (!inviteId) {
      return NextResponse.json({ error: "Invite ID is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's email
    const { data: userData } = await supabase.auth.getUser();
    const userEmail = userData.user?.email?.toLowerCase();
    if (!userEmail) {
      return NextResponse.json({ error: "User email not found" }, { status: 400 });
    }

    // Verify invite exists and belongs to this user
    const { data: invite, error: inviteErr } = await supabase
      .from("organization_invites")
      .select("*")
      .eq("id", inviteId)
      .eq("email", userEmail)
      .eq("status", "pending")
      .single();

    if (inviteErr || !invite) {
      return NextResponse.json({ error: "Invite not found or already used" }, { status: 404 });
    }

    // Check if user already in an org
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (profile?.organization_id) {
      return NextResponse.json(
        { error: "You already belong to an organization" },
        { status: 409 }
      );
    }

    // Join the organization
    const { error: updateProfileErr } = await supabase
      .from("profiles")
      .update({ organization_id: invite.organization_id })
      .eq("id", user.id);

    if (updateProfileErr) {
      console.error("[api/company/org/join] update profile error:", updateProfileErr);
      return NextResponse.json({ error: "Failed to join organization" }, { status: 500 });
    }

    // Mark invite as accepted
    const { error: updateInviteErr } = await supabase
      .from("organization_invites")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", inviteId);

    if (updateInviteErr) {
      console.error("[api/company/org/join] update invite error:", updateInviteErr);
    }

    return NextResponse.json({ success: true, organization_id: invite.organization_id });
  } catch (err) {
    console.error("[api/company/org/join]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
