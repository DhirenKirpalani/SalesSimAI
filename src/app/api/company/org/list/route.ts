import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createSupabaseClient(url, key);
}

interface WorkspaceOrg {
  id: string;
  slug: string;
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

    // Load memberships from the junction table using service role to bypass RLS edge cases
    const svc = serviceSupabase();
    const { data: memberships } = await svc
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (memberships && memberships.length > 0) {
      const orgIds = memberships.map((m) => m.organization_id);
      const { data: orgs } = await svc
        .from("organizations")
        .select("id, slug, name, plan, logo_url, created_by")
        .in("id", orgIds);

      const orgMap = new Map((orgs ?? []).map((o) => [o.id, o]));

      memberships.forEach((m) => {
        const org = orgMap.get(m.organization_id);
        organizations.push({
          id: m.organization_id,
          slug: org?.slug ?? m.organization_id,
          role: m.role,
          name: org?.name ?? "Unknown",
          plan: org?.plan ?? "Starter",
          logo_url: org?.logo_url ?? null,
          created_by: org?.created_by,
        });
      });
    }

    // Fallback: include the active org from profiles if it's not in the memberships list
    if (activeOrgId && !organizations.some((o) => o.id === activeOrgId)) {
      const { data: activeOrg } = await svc
        .from("organizations")
        .select("id, slug, name, plan, logo_url, created_by")
        .eq("id", activeOrgId)
        .single();

      if (activeOrg) {
        organizations.unshift({
          id: activeOrg.id,
          slug: activeOrg.slug ?? activeOrg.id,
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
