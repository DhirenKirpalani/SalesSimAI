import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createSupabaseClient(url, key);
}

/**
 * GET /api/company/org/invite/[inviteId]
 * Public endpoint — returns invite details for the accept page (no auth required)
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  try {
    const { inviteId } = await params;
    const supabase = serviceSupabase();

    const { data: invite, error } = await supabase
      .from("organization_invites")
      .select("id, email, status, organizations(name)")
      .eq("id", inviteId)
      .single();

    if (error || !invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    if (invite.status !== "pending") {
      return NextResponse.json({ error: "Invite already used or expired" }, { status: 410 });
    }

    const orgName = Array.isArray(invite.organizations)
      ? (invite.organizations[0] as { name: string } | undefined)?.name
      : (invite.organizations as { name: string } | null)?.name;

    return NextResponse.json({
      invite: {
        id: invite.id,
        email: invite.email,
        org_name: orgName ?? "an organization",
        status: invite.status,
      },
    });
  } catch (err) {
    console.error("[api/company/org/invite/[inviteId] GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
