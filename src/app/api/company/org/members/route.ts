import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createSupabaseClient(url, key);
}

/**
 * DELETE /api/company/org/members?userId={userId}&organizationId={organizationId}
 * Remove a member from the organization (admin only)
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("userId");
    const organizationId = searchParams.get("organizationId");
    if (!targetUserId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get admin's org
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    const targetOrgId = organizationId || adminProfile?.organization_id;
    if (!targetOrgId) {
      return NextResponse.json({ error: "Not in an organization" }, { status: 400 });
    }

    // Verify admin
    const { data: org } = await supabase
      .from("organizations")
      .select("created_by")
      .eq("id", targetOrgId)
      .single();

    const isOrgAdmin = org?.created_by === user.id || adminProfile?.role === "admin";
    if (!isOrgAdmin) {
      return NextResponse.json({ error: "Only admin can remove members" }, { status: 403 });
    }

    // Can't remove yourself
    if (targetUserId === user.id) {
      return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
    }

    // Remove membership record — use service role to bypass RLS
    const svc = serviceSupabase();
    const { error: memberError } = await svc
      .from("organization_members")
      .delete()
      .eq("organization_id", targetOrgId)
      .eq("user_id", targetUserId);

    if (memberError) {
      console.error("[api/company/org/members DELETE] membership error:", memberError);
      return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
    }

    // If their active org was this one, clear it
    const { error: profileError } = await svc
      .from("profiles")
      .update({ organization_id: null })
      .eq("id", targetUserId)
      .eq("organization_id", targetOrgId);

    if (profileError) {
      console.error("[api/company/org/members DELETE] profile error:", profileError);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/company/org/members DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/company/org/members
 * Update a member's role in the organization_members table (admin only)
 */
export async function PATCH(req: NextRequest) {
  try {
    const { userId, role, organizationId } = await req.json() as { userId?: string; role?: string; organizationId?: string };
    if (!userId || !role || !["admin", "user"].includes(role)) {
      return NextResponse.json({ error: "userId and valid role required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    const targetOrgId = organizationId || adminProfile?.organization_id;
    if (!targetOrgId) {
      return NextResponse.json({ error: "Not in an organization" }, { status: 400 });
    }

    const { data: org } = await supabase
      .from("organizations")
      .select("created_by")
      .eq("id", targetOrgId)
      .single();

    const isOrgAdmin = org?.created_by === user.id || adminProfile?.role === "admin";
    if (!isOrgAdmin) {
      return NextResponse.json({ error: "Only admin can update roles" }, { status: 403 });
    }

    // Update role in the membership table — use service role to bypass RLS
    const svc = serviceSupabase();
    const { error } = await svc
      .from("organization_members")
      .update({ role: role as "admin" | "user" })
      .eq("organization_id", targetOrgId)
      .eq("user_id", userId);

    if (error) {
      console.error("[api/company/org/members PATCH] error:", error);
      return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/company/org/members PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
