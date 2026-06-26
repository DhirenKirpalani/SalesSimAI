import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * DELETE /api/company/org/members?userId={userId}
 * Remove a member from the organization (admin only)
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("userId");
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
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!adminProfile?.organization_id) {
      return NextResponse.json({ error: "Not in an organization" }, { status: 400 });
    }

    // Verify admin
    const { data: org } = await supabase
      .from("organizations")
      .select("created_by")
      .eq("id", adminProfile.organization_id)
      .single();

    if (org?.created_by !== user.id) {
      return NextResponse.json({ error: "Only admin can remove members" }, { status: 403 });
    }

    // Can't remove yourself
    if (targetUserId === user.id) {
      return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
    }

    // Remove member from org
    const { error } = await supabase
      .from("profiles")
      .update({ organization_id: null })
      .eq("id", targetUserId)
      .eq("organization_id", adminProfile.organization_id);

    if (error) {
      console.error("[api/company/org/members DELETE] error:", error);
      return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/company/org/members DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/company/org/members
 * Update a member's role (admin only)
 */
export async function PATCH(req: NextRequest) {
  try {
    const { userId, role } = await req.json();
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
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!adminProfile?.organization_id) {
      return NextResponse.json({ error: "Not in an organization" }, { status: 400 });
    }

    const { data: org } = await supabase
      .from("organizations")
      .select("created_by")
      .eq("id", adminProfile.organization_id)
      .single();

    if (org?.created_by !== user.id) {
      return NextResponse.json({ error: "Only admin can update roles" }, { status: 403 });
    }

    const { error } = await supabase
      .from("profiles")
      .update({ role: role as "admin" | "user" })
      .eq("id", userId)
      .eq("organization_id", adminProfile.organization_id);

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
