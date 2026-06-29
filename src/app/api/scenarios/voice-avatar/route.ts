import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const VOICE_AVATARS_BUCKET = "voice-avatars";
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createSupabaseClient(url, key);
}

async function ensureVoiceAvatarsBucket(svc: ReturnType<typeof serviceSupabase>): Promise<void> {
  const { data: existing } = await svc.storage.getBucket(VOICE_AVATARS_BUCKET);
  if (existing) return;

  const { error } = await svc.storage.createBucket(VOICE_AVATARS_BUCKET, {
    public: true,
    fileSizeLimit: MAX_FILE_SIZE,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/jpg", "image/webp"],
  });

  if (error && !error.message?.includes("already exists")) {
    throw new Error(`Failed to create voice avatars bucket: ${error.message}`);
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File size must be under 2MB" }, { status: 400 });
    }

    const svc = serviceSupabase();
    await ensureVoiceAvatarsBucket(svc);

    const ext = file.name.split(".").pop() || "png";
    const path = `${user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await svc.storage
      .from(VOICE_AVATARS_BUCKET)
      .upload(path, Buffer.from(await file.arrayBuffer()), {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("[voice-avatar upload] error:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: publicUrlData } = svc.storage.from(VOICE_AVATARS_BUCKET).getPublicUrl(path);
    if (!publicUrlData?.publicUrl) {
      return NextResponse.json({ error: "Failed to get public URL" }, { status: 500 });
    }

    return NextResponse.json({ url: publicUrlData.publicUrl });
  } catch (err) {
    console.error("[voice-avatar upload] unexpected error:", err);
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
