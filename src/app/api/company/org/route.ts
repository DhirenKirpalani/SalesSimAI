import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createSupabaseClient(url, key);
}

function sanitizeBucketName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 30);
}

const KNOWLEDGE_BASE_BUCKET = process.env.KNOWLEDGE_BASE_BUCKET_NAME ?? "knowledge-base";

function deriveOrgFolderName(orgId: string, orgName: string): string {
  const base = sanitizeBucketName(orgName);
  const suffix = orgId.toLowerCase();
  const candidate = `${base}-${suffix}`;
  // Supabase storage object paths can be much longer than bucket names, but keep it tidy
  if (candidate.length <= 100) return candidate;
  return `${base.substring(0, Math.max(1, 99 - suffix.length - 1))}-${suffix}`;
}

async function ensureKnowledgeBaseBucket(svc: ReturnType<typeof serviceSupabase>): Promise<void> {
  const { data: existing } = await svc.storage.getBucket(KNOWLEDGE_BASE_BUCKET);
  if (existing) return;

  const { error } = await svc.storage.createBucket(KNOWLEDGE_BASE_BUCKET, {
    public: false,
    fileSizeLimit: 50 * 1024 * 1024, // 50MB
  });

  if (error) {
    throw new Error(`Failed to create knowledge base bucket: ${error.message}`);
  }
}

async function createOrgFolder(orgId: string, orgName: string): Promise<string> {
  const svc = serviceSupabase();
  await ensureKnowledgeBaseBucket(svc);

  const folderName = deriveOrgFolderName(orgId, orgName);
  const path = `${folderName}/.keep`;

  // Check if the folder already has contents
  const { data: existing, error: listErr } = await svc.storage.from(KNOWLEDGE_BASE_BUCKET).list(folderName, { limit: 1 });
  if (existing && existing.length > 0) {
    return folderName;
  }
  if (listErr && !listErr.message?.includes("Not found")) {
    console.error("[api/company/org POST] list folder error:", listErr);
  }

  // Create a placeholder file so the folder exists in the knowledge-base bucket
  const { error: uploadErr } = await svc.storage.from(KNOWLEDGE_BASE_BUCKET).upload(path, Buffer.from(""), {
    contentType: "text/plain",
    upsert: false,
  });

  if (uploadErr && !uploadErr.message?.includes("Duplicate")) {
    console.error("[api/company/org POST] create folder error:", uploadErr);
    throw new Error(`Failed to create org folder: ${uploadErr.message}`);
  }

  return folderName;
}

/**
 * GET /api/company/org
 * Returns the current user's organization + members.
 * Query param `id` can be used to fetch a specific organization.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedId = searchParams.get("id");
    const slug = searchParams.get("slug");

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    const svc = serviceSupabase();
    let organizationId = profile?.organization_id ?? null;

    if (requestedId || slug) {
      let resolvedId = requestedId;

      if (slug) {
        const { data: orgBySlug } = await svc
          .from("organizations")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();
        if (!orgBySlug) {
          return NextResponse.json({ error: "Organization not found" }, { status: 404 });
        }
        resolvedId = orgBySlug.id;
      }

      if (!resolvedId) {
        return NextResponse.json({ error: "Organization not found" }, { status: 404 });
      }

      // Verify membership in the requested organization (with fallback to active profile org)
      const { data: membership } = await svc
        .from("organization_members")
        .select("id")
        .eq("organization_id", resolvedId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!membership && profile?.organization_id !== resolvedId) {
        return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
      }
      organizationId = resolvedId;
    }

    if (!organizationId) {
      const response = NextResponse.json({ organization: null, members: [] });
      response.headers.set("Cache-Control", "private, no-cache");
      return response;
    }

    const { data: org } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", organizationId)
      .single();

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Fetch members from the organization_members junction table joined with profiles
    const { data: memberships } = await svc
      .from("organization_members")
      .select("role, position, profiles(id, full_name, email, position, created_at)")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: true });

    const members = (memberships ?? []).map((m) => {
      const p = Array.isArray(m.profiles) ? (m.profiles[0] as Record<string, unknown> | undefined) : (m.profiles as Record<string, unknown> | undefined);
      return {
        id: (p?.id as string) ?? "",
        full_name: (p?.full_name as string | null) ?? null,
        email: (p?.email as string | null) ?? null,
        position: (m.position as string | null) ?? (p?.position as string | null) ?? null,
        role: m.role,
        created_at: (p?.created_at as string) ?? new Date().toISOString(),
      };
    });

    const { data: creator } = await svc
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", org.created_by ?? "")
      .maybeSingle();

    const { data: myMembership } = await svc
      .from("organization_members")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .maybeSingle();

    const isAdmin = org.created_by === user.id || myMembership?.role === "admin";

    const response = NextResponse.json({ organization: org, members, isAdmin, creator, currentUserId: user.id });
    response.headers.set("Cache-Control", "private, no-cache");
    return response;
  } catch (err) {
    console.error("[api/company/org GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/company/org
 * Update organization settings (logo, theme, email_domain, etc.)
 * Body may include { organizationId } to target a specific org.
 */
export async function PATCH(req: NextRequest) {
  try {
    const updates = await req.json();
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    const targetOrgId = updates.organizationId || profile?.organization_id;

    if (!targetOrgId) {
      return NextResponse.json({ error: "Not in an organization" }, { status: 400 });
    }

    // Verify admin (creator or global admin if it's their active org)
    const { data: org } = await supabase
      .from("organizations")
      .select("created_by")
      .eq("id", targetOrgId)
      .single();

    const isOrgAdmin = org?.created_by === user.id || (profile?.role === "admin" && profile?.organization_id === targetOrgId);
    if (!isOrgAdmin) {
      return NextResponse.json({ error: "Only admin can update organization" }, { status: 403 });
    }

    const allowedFields = ["name", "logo_url", "theme_color", "theme_colors", "email_domain", "profile_data", "source_urls"];
    const filtered: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (updates[key] !== undefined) filtered[key] = updates[key];
    }

    if (Object.keys(filtered).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    // Use service role to bypass RLS for org admins who are not the creator
    const svc = serviceSupabase();
    const { data: updated, error } = await svc
      .from("organizations")
      .update(filtered)
      .eq("id", targetOrgId)
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
 * DELETE /api/company/org
 * Delete an organization by ID and unlink all members (creator only).
 * Body: { organizationId: string }
 */
export async function DELETE(req: NextRequest) {
  try {
    const { organizationId } = await req.json().catch(() => ({})) as { organizationId?: string };
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 });
    }

    // Verify creator
    const { data: org } = await supabase
      .from("organizations")
      .select("created_by")
      .eq("id", organizationId)
      .single();

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    if (org.created_by !== user.id) {
      return NextResponse.json({ error: "Only the workspace creator can delete it" }, { status: 403 });
    }

    // Use service role client to bypass RLS for destructive mutations
    const svc = serviceSupabase();

    // Unlink all members from the org (preserve role)
    const { error: unlinkErr } = await svc
      .from("profiles")
      .update({ organization_id: null })
      .eq("organization_id", organizationId);

    if (unlinkErr) {
      console.error("[api/company/org DELETE] unlink members error:", unlinkErr);
      return NextResponse.json({ error: "Failed to unlink members" }, { status: 500 });
    }

    // Delete membership records
    const { error: memberErr } = await svc
      .from("organization_members")
      .delete()
      .eq("organization_id", organizationId);

    if (memberErr) {
      console.error("[api/company/org DELETE] membership cleanup error:", memberErr);
    }

    // Delete the organization
    const { error: delErr } = await svc
      .from("organizations")
      .delete()
      .eq("id", organizationId);

    if (delErr) {
      console.error("[api/company/org DELETE] delete org error:", delErr);
      return NextResponse.json({ error: "Failed to delete organization" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/company/org DELETE]", err);
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

    // Generate a unique slug from the name
    const baseSlug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").replace(/-+/g, "-") || "org";
    let slug = baseSlug;
    let counter = 1;
    const svc = serviceSupabase();
    while (true) {
      const { data: existing } = await svc
        .from("organizations")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!existing) break;
      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    // Create org
    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .insert({ name: name.trim(), created_by: user.id, slug })
      .select()
      .single();

    if (orgErr || !org) {
      console.error("[api/company/org POST] create org error:", orgErr);
      return NextResponse.json({ error: "Failed to create organization" }, { status: 500 });
    }

    // Record membership in the junction table (admin since they created it)
    const { error: memberErr } = await svc
      .from("organization_members")
      .insert({ organization_id: org.id, user_id: user.id, role: "admin" });

    if (memberErr) {
      console.error("[api/company/org POST] membership error:", memberErr);
      // Continue — the org is usable even if membership recording fails, but log it
    }

    // Link user to the new org as their active workspace
    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ organization_id: org.id })
      .eq("id", user.id);

    if (updateErr) {
      console.error("[api/company/org POST] link user error:", updateErr);
      return NextResponse.json({ error: "Failed to link user to organization" }, { status: 500 });
    }

    // Create a dedicated folder for the organization inside the knowledge-base bucket
    try {
      await createOrgFolder(org.id, org.name);
    } catch (err) {
      console.error("[api/company/org POST] folder setup warning:", err);
      // Log and continue — the org is usable even if storage setup fails
    }

    return NextResponse.json({ organization: org });
  } catch (err) {
    console.error("[api/company/org POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
