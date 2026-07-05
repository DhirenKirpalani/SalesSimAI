import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createSupabaseClient(url, key);
}

/**
 * GET /api/company/org/my-invite
 * Returns pending invites for the currently logged-in user's email.
 * Uses service role to bypass RLS (invitees aren't org members yet so can't SELECT).
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = user.email?.toLowerCase();
    if (!userEmail) {
      return NextResponse.json({ invites: [] });
    }

    const admin = serviceSupabase();

    // Get all orgs the user is already a member of
    const { data: memberships } = await admin
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id);

    const memberOrgIds = new Set((memberships ?? []).map((m) => m.organization_id));

    const { data: invites } = await admin
      .from("organization_invites")
      .select("id, email, status, created_at, organization_id, invited_by, organizations(name)")
      .eq("email", userEmail)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    // Skip invites to orgs the user is already a member of
    const filteredInvites = (invites ?? []).filter(
      (inv) => !memberOrgIds.has(inv.organization_id)
    );

    // Fetch inviter names in one batch query
    const inviterIds = [...new Set(filteredInvites.map((inv) => inv.invited_by).filter(Boolean))];
    const inviterNames: Record<string, string> = {};
    if (inviterIds.length > 0) {
      const { data: inviterProfiles } = await admin
        .from("profiles")
        .select("id, full_name")
        .in("id", inviterIds);
      (inviterProfiles ?? []).forEach((p) => { inviterNames[p.id] = p.full_name ?? ""; });
    }

    const mapped = filteredInvites.map((inv) => {
      const orgName = Array.isArray(inv.organizations)
        ? (inv.organizations[0] as { name: string } | undefined)?.name
        : (inv.organizations as { name: string } | null)?.name;
      return {
        id: inv.id,
        email: inv.email,
        status: inv.status,
        created_at: inv.created_at,
        org_name: orgName ?? "an organization",
        invited_by_name: inv.invited_by ? (inviterNames[inv.invited_by] || null) : null,
      };
    });

    return NextResponse.json({ invites: mapped });
  } catch (err) {
    console.error("[api/company/org/my-invite GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
