"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase/browser";
import { WriteupsHub } from "@/components/writeups-hub";
import { WriteupDetail } from "@/components/writeup-detail";

export default function WriteupsPage() {
  const [writeups, setWriteups] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [slug, setSlug] = useState("");

  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get("slug");
    if (slug) {
      setSlug(slug);
    }

    const supabase = createSupabaseBrowser();
    if (!supabase) {
      setLoading(false);
      return;
    }

    void supabase
      .from("writeups")
      .select("*")
      .eq("status", "published")
      .order("featured", { ascending: false })
      .order("display_order", { ascending: true })
      .then(({ data }) => {
        setWriteups((data as Record<string, unknown>[] | null) ?? []);
        setLoading(false);
      });
  }, []);

  if (slug) return <WriteupDetail slug={slug} />;

  return (
    <main className="min-h-screen px-5 pb-20 pt-28 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/#writeups"
          className="inline-flex items-center gap-2 font-mono text-xs text-[#77847e] hover:text-[#58d7f7]"
        >
          <ArrowLeft size={14} /> Back to portfolio
        </Link>
        <div className="mt-6">
          <p className="font-mono text-xs uppercase tracking-[.18em] text-[#58d7f7]">
            // knowledge base
          </p>
          <h1 className="mt-3 text-4xl font-semibold">
            Writeups &amp; research notes
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#9ba8a1]">
            Search published cybersecurity investigations, tutorials, lab notes,
            and learning documentation.
          </p>
        </div>
        <div className="mt-8">
          {loading ? (
            <div className="premium-card glass-panel p-8 font-mono text-[10px] text-[#77847e]">
              Loading published knowledge base…
            </div>
          ) : (
            <WriteupsHub writeups={writeups} />
          )}
        </div>
      </div>
    </main>
  );
}
