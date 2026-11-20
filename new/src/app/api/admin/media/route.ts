import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/supabase/auth";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export async function POST(request: NextRequest) {
  const { supabase, user, administrator } = await getAuthenticatedAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!administrator) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "A file is required" }, { status: 400 });
  if (!allowedTypes.has(file.type)) return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "File exceeds 10 MB" }, { status: 400 });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${new Date().getFullYear()}/${crypto.randomUUID()}-${safeName}`;
  const { error: uploadError } = await supabase.storage.from("portfolio-media").upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 400 });

  const { data: publicUrl } = supabase.storage.from("portfolio-media").getPublicUrl(path);
  const { data, error } = await supabase.from("media_assets").insert({
    name: file.name,
    storage_path: path,
    public_url: publicUrl.publicUrl,
    mime_type: file.type,
    size_bytes: file.size,
  }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}
