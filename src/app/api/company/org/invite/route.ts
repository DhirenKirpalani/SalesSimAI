import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/company/org/invite
 * Admin invites a user by email to join their organization
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email?.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get admin's org
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "You are not in an organization" }, { status: 400 });
    }

    // Verify admin + get org settings
    const { data: org } = await supabase
      .from("organizations")
      .select("created_by, email_domain")
      .eq("id", profile.organization_id)
      .single();

    if (org?.created_by !== user.id) {
      return NextResponse.json({ error: "Only organization admin can invite" }, { status: 403 });
    }

    // Email domain restriction
    if (org?.email_domain) {
      const domain = email.trim().toLowerCase().split("@")[1];
      if (domain !== org.email_domain.toLowerCase()) {
        return NextResponse.json(
          { error: `Only ${org.email_domain} email addresses are allowed` },
          { status: 400 }
        );
      }
    }

    // Check if user already in this org
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email.trim().toLowerCase())
      .eq("organization_id", profile.organization_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "User already in organization" }, { status: 409 });
    }

    // Create invite
    const { data: invite, error: inviteErr } = await supabase
      .from("organization_invites")
      .insert({
        organization_id: profile.organization_id,
        email: email.trim().toLowerCase(),
        invited_by: user.id,
      })
      .select()
      .single();

    if (inviteErr) {
      if (inviteErr.message?.includes("duplicate")) {
        return NextResponse.json({ error: "Invite already pending" }, { status: 409 });
      }
      console.error("[api/company/org/invite] error:", inviteErr);
      return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
    }

    // TODO: Send email notification (Resend, SendGrid, etc.)
    // For now, return the invite token for frontend to share
    return NextResponse.json({ invite });
  } catch (err) {
    console.error("[api/company/org/invite]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/company/org/invite
 * List pending invites for the admin's org
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ invites: [] });
    }

    // Verify admin
    const { data: org } = await supabase
      .from("organizations")
      .select("created_by")
      .eq("id", profile.organization_id)
      .single();

    if (org?.created_by !== user.id) {
      return NextResponse.json({ error: "Only admin can view invites" }, { status: 403 });
    }

    const { data: invites } = await supabase
      .from("organization_invites")
      .select("id, email, status, created_at, accepted_at")
      .eq("organization_id", profile.organization_id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    return NextResponse.json({ invites: invites ?? [] });
  } catch (err) {
    console.error("[api/company/org/invite GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
