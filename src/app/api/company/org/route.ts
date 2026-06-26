import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/company/org
 * Returns the current user's organization + members
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
      return NextResponse.json({ organization: null, members: [] });
    }

    const { data: org } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", profile.organization_id)
      .single();

    const [{ data: members }, { data: creator }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, position, role, created_at")
        .eq("organization_id", profile.organization_id)
        .order("created_at", { ascending: true }),
      supabase.from("profiles").select("id, full_name, email").eq("id", org?.created_by ?? "").maybeSingle(),
    ]);

    const isAdmin = org?.created_by === user.id;

    return NextResponse.json({ organization: org, members: members ?? [], isAdmin, creator });
  } catch (err) {
    console.error("[api/company/org GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/company/org
 * Update organization settings (logo, theme, email_domain, etc.)
 */
export async function PATCH(req: NextRequest) {
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
      return NextResponse.json({ error: "Not in an organization" }, { status: 400 });
    }

    // Verify admin
    const { data: org } = await supabase
      .from("organizations")
      .select("created_by")
      .eq("id", profile.organization_id)
      .single();

    if (org?.created_by !== user.id) {
      return NextResponse.json({ error: "Only admin can update organization" }, { status: 403 });
    }

    const updates = await req.json();
    const allowedFields = ["name", "logo_url", "theme_color", "email_domain", "profile_data", "source_urls"];
    const filtered: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (updates[key] !== undefined) filtered[key] = updates[key];
    }

    if (Object.keys(filtered).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { data: updated, error } = await supabase
      .from("organizations")
      .update(filtered)
      .eq("id", profile.organization_id)
      .select()
      .single();

    if (error) {
      console.error("[api/company/org PATCH] error:", error);
      return NextResponse.json({ error: "Failed to update organization" }, { status: 500 });
    }

    return NextResponse.json({ organization: updated });
  } catch (err) {
    console.error("[api/company/org PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/company/org
 * Create a new organization and link the current user as admin
 */
export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "Organization name is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user already belongs to an org
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

    // Create org
    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .insert({ name: name.trim(), created_by: user.id })
      .select()
      .single();

    if (orgErr || !org) {
      console.error("[api/company/org POST] create org error:", orgErr);
      return NextResponse.json({ error: "Failed to create organization" }, { status: 500 });
    }

    // Link user to org
    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ organization_id: org.id })
      .eq("id", user.id);

    if (updateErr) {
      console.error("[api/company/org POST] link user error:", updateErr);
      return NextResponse.json({ error: "Failed to link user to organization" }, { status: 500 });
    }

    return NextResponse.json({ organization: org });
  } catch (err) {
    console.error("[api/company/org POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
