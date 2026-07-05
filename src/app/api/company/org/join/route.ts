import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createSupabaseClient(url, key);
}

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

    // Verify invite exists and belongs to this user (service role bypasses RLS — invitees aren't org members yet)
    const admin = serviceSupabase();
    const { data: invite, error: inviteErr } = await admin
      .from("organization_invites")
      .select("*")
      .eq("id", inviteId)
      .eq("email", userEmail)
      .eq("status", "pending")
      .single();

    if (inviteErr || !invite) {
      return NextResponse.json({ error: "Invite not found or already used" }, { status: 404 });
    }

    // Check if already a member of this org
    const { data: existingMembership } = await admin
      .from("organization_members")
      .select("id")
      .eq("organization_id", invite.organization_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingMembership) {
      // Already a member — just mark the invite accepted and set active org
      await admin
        .from("organization_invites")
        .update({ status: "accepted", accepted_at: new Date().toISOString() })
        .eq("id", inviteId);

      await admin
        .from("profiles")
        .update({ organization_id: invite.organization_id })
        .eq("id", user.id);

      return NextResponse.json({ success: true, organization_id: invite.organization_id });
    }

    // Add membership record
    const { error: memberErr } = await admin
      .from("organization_members")
      .insert({ organization_id: invite.organization_id, user_id: user.id, role: "member" });

    if (memberErr) {
      console.error("[api/company/org/join] insert membership error:", memberErr);
      return NextResponse.json({ error: "Failed to join organization" }, { status: 500 });
    }

    // Set the joined org as the active workspace
    const { error: updateProfileErr } = await admin
      .from("profiles")
      .update({ organization_id: invite.organization_id })
      .eq("id", user.id);

    if (updateProfileErr) {
      console.error("[api/company/org/join] update profile error:", updateProfileErr);
      return NextResponse.json({ error: "Failed to join organization" }, { status: 500 });
    }

    // Mark invite as accepted — use service role to bypass RLS
    const { error: updateInviteErr } = await admin
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
