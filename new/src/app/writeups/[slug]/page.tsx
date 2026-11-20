import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSupabaseServer } from "@/lib/supabase/server";

export default async function WriteupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createSupabaseServer();
  const live = supabase
    ? await supabase
        .from("writeups")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle()
    : { data: null };
  const writeup = live.data as Record<string, unknown> | null;

  return (
    <main className="min-h-screen px-5 pb-20 pt-28 lg:px-8">
      <article className="mx-auto max-w-3xl">
        <Link
          href="/#writeups"
          className="inline-flex items-center gap-2 font-mono text-xs text-[#77847e] hover:text-[#00ff91]"
        >
          <ArrowLeft size={14} /> Back to writeups
        </Link>
        <div className="glass-panel mt-6 p-7 sm:p-10">
          <p className="font-mono text-[10px] uppercase text-[#00ff91]">
            {writeup
              ? String(writeup.category || "Learning note")
              : "Draft preview"}
          </p>
          <h1 className="mt-3 text-4xl font-semibold">
            {writeup ? String(writeup.title) : "Published article title"}
          </h1>
          {typeof writeup?.summary === "string" && writeup.summary && (
            <p className="mt-4 text-lg leading-8 text-[#b7c2bd]">
              {writeup.summary}
            </p>
          )}
          <div className="mt-6 whitespace-pre-wrap text-base leading-8 text-[#9ba8a1]">
            {writeup
              ? String(writeup.content || "")
              : "Article content will be securely rendered from structured CMS fields after Supabase is configured."}
          </div>
        </div>
      </article>
    </main>
  );
}
