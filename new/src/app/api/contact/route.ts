import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  subject: z.string().trim().max(150).optional().default(""),
  message: z.string().trim().min(10).max(5000),
  website: z.string().max(100).optional().default(""),
});

const attempts = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const record = attempts.get(ip);
  if (record && record.resetAt > now && record.count >= 5) {
    return NextResponse.json({ error: "Too many submissions. Please try again later." }, { status: 429 });
  }
  if (!record || record.resetAt <= now) attempts.set(ip, { count: 1, resetAt: now + 10 * 60 * 1000 });
  else record.count += 1;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please check the form fields." }, { status: 400 });
  if (parsed.data.website) return NextResponse.json({ success: true });

  const supabase = await createSupabaseServer();
  if (!supabase) return NextResponse.json({ error: "Contact service is not configured." }, { status: 503 });
  const { error } = await supabase.from("contact_messages").insert({
    name: parsed.data.name,
    email: parsed.data.email,
    subject: parsed.data.subject,
    message: parsed.data.message,
  });
  if (error) return NextResponse.json({ error: "Unable to submit the message." }, { status: 400 });
  return NextResponse.json({ success: true });
}
