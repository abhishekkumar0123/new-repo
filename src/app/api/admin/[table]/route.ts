import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/supabase/auth";

const tables = new Set([
  "profile", "site_sections", "skill_categories", "skills", "projects",
  "project_images", "writeups", "certifications", "lab_entries",
  "timeline_entries", "social_links", "media_assets", "contact_messages", "site_settings",
]);

async function requireAdmin() {
  const { supabase, user, administrator } = await getAuthenticatedAdmin();
  if (!supabase) return { response: NextResponse.json({ error: "Supabase is not configured" }, { status: 503 }) as NextResponse };
  if (!user) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) as NextResponse };
  if (!administrator) return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) as NextResponse };
  return { supabase };
}

export async function GET(_request: NextRequest, context: { params: Promise<{ table: string }> }) {
  const { table } = await context.params;
  if (!tables.has(table)) return NextResponse.json({ error: "Invalid collection" }, { status: 404 });
  const authorized = await requireAdmin();
  if (authorized.response) return authorized.response;
  const supabase = authorized.supabase!;

  const orderColumn = table === "profile" || table === "site_settings" ? undefined : "display_order";
  let query = supabase.from(table).select("*").limit(500);
  if (orderColumn) query = query.order(orderColumn, { ascending: true });
  if (table === "projects" || table === "writeups") query = query.order("updated_at", { ascending: false });
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: NextRequest, context: { params: Promise<{ table: string }> }) {
  const { table } = await context.params;
  if (!tables.has(table)) return NextResponse.json({ error: "Invalid collection" }, { status: 404 });
  const authorized = await requireAdmin();
  if (authorized.response) return authorized.response;
  const supabase = authorized.supabase!;

  const body = await request.json();
  const allowed = Object.fromEntries(Object.entries(body).filter(([key]) => !["id", "created_at", "updated_at"].includes(key)).slice(0, 40));
  if (Object.keys(allowed).length === 0) return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  const { data, error } = await supabase.from(table).insert(allowed).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}

export async function PUT(request: NextRequest, context: { params: Promise<{ table: string }> }) {
  const { table } = await context.params;
  if (!tables.has(table)) return NextResponse.json({ error: "Invalid collection" }, { status: 404 });
  const authorized = await requireAdmin();
  if (authorized.response) return authorized.response;
  const supabase = authorized.supabase!;

  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: "Record id is required" }, { status: 400 });
  const allowed = Object.fromEntries(Object.entries(body).filter(([key]) => !["id", "created_at", "updated_at"].includes(key)).slice(0, 40));
  if (Object.keys(allowed).length === 0) return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  if (table === "projects" || table === "writeups") allowed.updated_at = new Date().toISOString();
  const { data, error } = await supabase.from(table).update(allowed).eq("id", body.id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ table: string }> }) {
  const { table } = await context.params;
  if (!tables.has(table)) return NextResponse.json({ error: "Invalid collection" }, { status: 404 });
  const authorized = await requireAdmin();
  if (authorized.response) return authorized.response;
  const supabase = authorized.supabase!;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Record id is required" }, { status: 400 });
  if (table === "media_assets") {
    const { data: asset } = await supabase.from("media_assets").select("storage_path").eq("id", id).single();
    if (asset?.storage_path) await supabase.storage.from("portfolio-media").remove([asset.storage_path]);
  }
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
