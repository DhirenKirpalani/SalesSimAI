import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const READ_KEY = "read_notification_ids";

/**
 * GET /api/user/notifications-read
 * Returns the current user's read notification IDs stored in profile_data.
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
      .select("profile_data")
      .eq("id", user.id)
      .single();

    const readIds = (profile?.profile_data as { read_notification_ids?: string[] } | null)?.read_notification_ids ?? [];
    return NextResponse.json({ readIds });
  } catch (err) {
    console.error("[api/user/notifications-read GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/user/notifications-read
 * Merges the provided read IDs into the user's profile_data.
 */
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { readIds } = (await req.json()) as { readIds?: string[] };
    if (!Array.isArray(readIds)) {
      return NextResponse.json({ error: "readIds must be an array" }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("profile_data")
      .eq("id", user.id)
      .single();

    const existingData = (profile?.profile_data as Record<string, unknown> | null) ?? {};
    const existingIds = new Set((existingData.read_notification_ids as string[] | undefined) ?? []);
    readIds.forEach((id) => existingIds.add(id));

    const { error } = await supabase
      .from("profiles")
      .update({
        profile_data: {
          ...existingData,
          [READ_KEY]: [...existingIds],
        },
      })
      .eq("id", user.id);

    if (error) {
      console.error("[api/user/notifications-read PATCH]", error);
      return NextResponse.json({ error: "Failed to save read state" }, { status: 500 });
    }

    return NextResponse.json({ readIds: [...existingIds] });
  } catch (err) {
    console.error("[api/user/notifications-read PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
