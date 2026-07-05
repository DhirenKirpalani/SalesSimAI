import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createSupabaseClient(url, key);
}

/**
 * POST /api/company/org/invite
 * Admin invites a user by email to join their organization
 */
export async function POST(req: NextRequest) {
  try {
    const { email, organizationId } = await req.json() as { email?: string; organizationId?: string };
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

    const targetOrgId = organizationId || profile?.organization_id;
    if (!targetOrgId) {
      return NextResponse.json({ error: "You are not in an organization" }, { status: 400 });
    }

    // Verify admin + get org settings
    const { data: org } = await supabase
      .from("organizations")
      .select("created_by, email_domain")
      .eq("id", targetOrgId)
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

    // Check if a user with this email is already a member of this org
    const svc = serviceSupabase();
    const { data: existingProfiles } = await svc
      .from("profiles")
      .select("id, organization_members!inner(organization_id)")
      .eq("email", email.trim().toLowerCase())
      .eq("organization_members.organization_id", targetOrgId)
      .limit(1);

    if ((existingProfiles ?? []).length > 0) {
      return NextResponse.json({ error: "User already in organization" }, { status: 409 });
    }

    // Create invite
    const { data: invite, error: inviteErr } = await supabase
      .from("organization_invites")
      .insert({
        organization_id: targetOrgId,
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
 * GET /api/company/org/invite?organizationId=...
 * List pending invites for the admin's org
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedId = searchParams.get("organizationId");

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const targetOrgId = requestedId || profile?.organization_id;
    if (!targetOrgId) {
      return NextResponse.json({ invites: [] });
    }

    // Verify admin
    const { data: org } = await supabase
      .from("organizations")
      .select("created_by")
      .eq("id", targetOrgId)
      .single();

    if (org?.created_by !== user.id) {
      return NextResponse.json({ error: "Only admin can view invites" }, { status: 403 });
    }

    const { data: invites } = await supabase
      .from("organization_invites")
      .select("id, email, status, created_at, accepted_at")
      .eq("organization_id", targetOrgId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    return NextResponse.json({ invites: invites ?? [] });
  } catch (err) {
    console.error("[api/company/org/invite GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
