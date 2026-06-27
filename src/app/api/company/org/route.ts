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
 * DELETE /api/company/org
 * Delete the organization and unlink all members (admin only).
 * Preserves each user's role in profiles.
 */
export async function DELETE() {
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
      return NextResponse.json({ error: "Only admin can delete organization" }, { status: 403 });
    }

    // Use service role client to bypass RLS for destructive mutations
    const svc = serviceSupabase();

    // Unlink all members from the org (preserve role)
    const { error: unlinkErr } = await svc
      .from("profiles")
      .update({ organization_id: null })
      .eq("organization_id", profile.organization_id);

    if (unlinkErr) {
      console.error("[api/company/org DELETE] unlink members error:", unlinkErr);
      return NextResponse.json({ error: "Failed to unlink members" }, { status: 500 });
    }

    // Delete the organization
    const { error: delErr } = await svc
      .from("organizations")
      .delete()
      .eq("id", profile.organization_id);

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
