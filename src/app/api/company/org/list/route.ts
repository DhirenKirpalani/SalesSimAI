import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface WorkspaceOrg {
  id: string;
  name: string;
  plan: string;
  logo_url?: string | null;
  created_by?: string;
  role: string;
}

/**
 * GET /api/company/org/list
 * Returns all organizations the current user is a member of,
 * plus the currently active organization id from their profile.
 * Falls back to the active profile org when the organization_members
 * migration hasn't run or is missing a row.
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

    const activeOrgId = profile?.organization_id ?? null;
    const organizations: WorkspaceOrg[] = [];

    // Try to load memberships from the junction table (may not exist yet)
    try {
      const { data: memberships } = await supabase
        .from("organization_members")
        .select("organization_id, role, organizations(id, name, plan, logo_url, created_by)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      (memberships ?? []).forEach((m) => {
        const org = normalizeOrg(m.organizations) as Partial<WorkspaceOrg>;
        organizations.push({
          id: m.organization_id,
          role: m.role,
          name: org.name ?? "Unknown",
          plan: org.plan ?? "Starter",
          logo_url: org.logo_url ?? null,
          created_by: org.created_by,
        });
      });
    } catch (membershipErr) {
      // organization_members table may not exist yet; fall through to active-org fallback
      console.warn("[api/company/org/list GET] memberships query failed:", membershipErr);
    }

    // Fallback: include the active org from profiles if it's not in the memberships list
    if (activeOrgId && !organizations.some((o) => o.id === activeOrgId)) {
      const { data: activeOrg } = await supabase
        .from("organizations")
        .select("id, name, plan, logo_url, created_by")
        .eq("id", activeOrgId)
        .single();

      if (activeOrg) {
        organizations.unshift({
          id: activeOrg.id,
          name: activeOrg.name,
          plan: activeOrg.plan,
          logo_url: activeOrg.logo_url ?? null,
          created_by: activeOrg.created_by,
          role: activeOrg.created_by === user.id ? "admin" : "member",
        });
      }
    }

    return NextResponse.json({
      activeOrganizationId: activeOrgId,
      organizations,
    });
  } catch (err) {
    console.error("[api/company/org/list GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function normalizeOrg(org: unknown): Partial<WorkspaceOrg> {
  if (!org) return {};
  if (Array.isArray(org)) return (org[0] as Partial<WorkspaceOrg>) ?? {};
  return org as Partial<WorkspaceOrg>;
}
