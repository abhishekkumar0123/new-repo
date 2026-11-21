"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Copy, Share2 } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase/browser";

export function WriteupDetail({ slug }: { slug: string }) {
  const [article, setArticle] = useState<Record<string, unknown> | null>(null);
  const [related, setRelated] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    if (!supabase) {
      setLoading(false);
      return;
    }

    void supabase
      .from("writeups")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle()
      .then(async ({ data }) => {
        const found = (data as Record<string, unknown> | null) ?? null;
        setArticle(found);
        if (found) {
          const { data: relatedData } = await supabase
            .from("writeups")
            .select("*")
            .eq("status", "published")
            .neq("slug", slug)
            .limit(3);
          setRelated((relatedData as Record<string, unknown>[] | null) ?? []);
        }
        setLoading(false);
      });
  }, [slug]);

  const content = String(article?.content || "");
  const sections = useMemo(() => {
    return content
      .split("\n")
      .filter((line) => /^#{1,3}\s+/.test(line))
      .map((line) => {
        const heading = line.replace(/^#{1,3}\s+/, "").trim();
        return {
          heading,
          id: heading
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, ""),
        };
      });
  }, [content]);

  async function shareArticle() {
    const url = window.location.href;
    try {
      if (navigator.share)
        await navigator.share({
          title: String(article?.title || "Writeup"),
          url,
        });
      else {
        await navigator.clipboard.writeText(url);
        setCopied("Link copied");
        window.setTimeout(() => setCopied(""), 1600);
      }
    } catch {}
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied("Code copied");
      window.setTimeout(() => setCopied(""), 1600);
    } catch {}
  }

  const renderedBlocks = useMemo(() => {
    const blocks: {
      type: "heading" | "code" | "quote" | "paragraph" | "list";
      text: string;
      level?: number;
    }[] = [];
    const lines = content.split("\n");
    let code = false;
    let codeLines: string[] = [];

    lines.forEach((line) => {
      if (line.startsWith("```")) {
        if (code) {
          blocks.push({ type: "code", text: codeLines.join("\n") });
          codeLines = [];
        }
        code = !code;
        return;
      }
      if (code) {
        codeLines.push(line);
        return;
      }
      if (/^#{1,3}\s+/.test(line)) {
        const match = line.match(/^(#{1,3})\s+(.+)/);
        blocks.push({
          type: "heading",
          text: match?.[2] || line,
          level: match?.[1].length || 2,
        });
      } else if (/^>\s*/.test(line)) {
        blocks.push({ type: "quote", text: line.replace(/^>\s*/, "") });
      } else if (/^[-*]\s+/.test(line)) {
        blocks.push({ type: "list", text: line.replace(/^[-*]\s+/, "") });
      } else if (line.trim()) {
        blocks.push({ type: "paragraph", text: line });
      }
    });
    if (codeLines.length)
      blocks.push({ type: "code", text: codeLines.join("\n") });
    return blocks;
  }, [content]);

  return (
    <main className="min-h-screen px-5 pb-20 pt-28 lg:px-8">
      <article className="mx-auto max-w-6xl">
        <Link
          href="/writeups/"
          className="inline-flex items-center gap-2 font-mono text-xs text-[#77847e] hover:text-[#58d7f7]"
        >
          <ArrowLeft size={14} /> Back to writeups
        </Link>

        {loading ? (
          <div className="premium-card glass-panel mt-6 p-8 font-mono text-[10px] text-[#77847e]">
            Loading article…
          </div>
        ) : !article ? (
          <div className="premium-card glass-panel mt-6 p-8">
            <h1 className="text-2xl font-semibold">Writeup not available</h1>
            <p className="mt-3 text-sm text-[#77847e]">
              This article may be unpublished or the link may be incorrect.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[220px_minmax(0,760px)]">
            {sections.length > 0 && (
              <aside
                className="premium-card glass-panel h-fit p-4 lg:sticky lg:top-24"
                aria-label="Table of contents"
              >
                <p className="font-mono text-[9px] uppercase text-[#77847e]">
                  On this page
                </p>
                <div className="mt-3 space-y-2">
                  {sections.map((section) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className="block text-xs leading-5 text-[#9ba8a1] hover:text-[#58d7f7]"
                    >
                      {section.heading}
                    </a>
                  ))}
                </div>
              </aside>
            )}

            <div>
              <div className="premium-card glass-panel overflow-hidden">
                {String(article.cover_image || "") && (
                  <img
                    src={String(article.cover_image)}
                    alt=""
                    className="h-64 w-full object-cover opacity-90"
                  />
                )}
                <div className="p-7 sm:p-10">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      <span className="border border-[#58d7f7]/20 px-2 py-1 font-mono text-[9px] uppercase text-[#58d7f7]">
                        {String(article.category || "General Security")}
                      </span>
                      {String(article.difficulty || "") && (
                        <span className="border border-white/[0.08] px-2 py-1 font-mono text-[9px] text-[#77847e]">
                          {String(article.difficulty)}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => void shareArticle()}
                      className="inline-flex items-center gap-2 font-mono text-[9px] uppercase text-[#77847e] hover:text-[#58d7f7]"
                    >
                      <Share2 size={13} /> {copied || "Share"}
                    </button>
                  </div>
                  <h1 className="mt-5 text-4xl font-semibold">
                    {String(article.title)}
                  </h1>
                  {String(article.summary || "") && (
                    <p className="mt-4 text-lg leading-8 text-[#b7c2bd]">
                      {String(article.summary)}
                    </p>
                  )}
                  <div className="mt-5 flex flex-wrap gap-4 border-b border-white/[0.07] pb-5 font-mono text-[9px] uppercase text-[#77847e]">
                    <span>
                      {article.created_at
                        ? new Date(
                            String(article.created_at),
                          ).toLocaleDateString()
                        : "Publication date not set"}
                    </span>
                    <span>
                      {Number(article.read_time_minutes || 0) ||
                        Math.max(
                          1,
                          Math.ceil(content.split(/\s+/).length / 220),
                        )}{" "}
                      min read
                    </span>
                  </div>

                  <div className="mt-8 space-y-5 text-base leading-8 text-[#bdc8c2]">
                    {renderedBlocks.map((block, index) => {
                      if (block.type === "heading") {
                        const id = block.text
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/(^-|-$)/g, "");
                        const HeadingTag =
                          block.level === 1
                            ? "h2"
                            : block.level === 3
                              ? "h4"
                              : "h3";
                        return (
                          <HeadingTag
                            id={id}
                            key={`${block.text}-${index}`}
                            className="scroll-mt-24 pt-3 text-xl font-semibold text-[#f2f7f4]"
                          >
                            {block.text}
                          </HeadingTag>
                        );
                      }
                      if (block.type === "code")
                        return (
                          <div
                            key={index}
                            className="relative overflow-hidden border border-white/[0.08] bg-[#070b10]"
                          >
                            <button
                              type="button"
                              onClick={() => void copyCode(block.text)}
                              className="absolute right-3 top-3 inline-flex items-center gap-1 font-mono text-[9px] text-[#77847e] hover:text-[#58d7f7]"
                            >
                              <Copy size={12} /> Copy
                            </button>
                            <pre className="overflow-x-auto p-5 pr-16 font-mono text-xs leading-6">
                              <code>{block.text}</code>
                            </pre>
                          </div>
                        );
                      if (block.type === "quote")
                        return (
                          <blockquote
                            key={index}
                            className="border-l-2 border-[#58d7f7]/50 pl-5 italic text-[#9ba8a1]"
                          >
                            {block.text}
                          </blockquote>
                        );
                      if (block.type === "list")
                        return (
                          <p key={index} className="pl-4">
                            <span className="mr-3 text-[#58d7f7]">•</span>
                            {block.text}
                          </p>
                        );
                      return <p key={index}>{block.text}</p>;
                    })}
                  </div>

                  {Array.isArray(article.tags) && article.tags.length > 0 && (
                    <div className="mt-8 flex flex-wrap gap-2 border-t border-white/[0.07] pt-5">
                      {article.tags.map((tag) => (
                        <span
                          key={String(tag)}
                          className="border border-white/[0.07] px-2 py-1 font-mono text-[9px] text-[#77847e]"
                        >
                          {String(tag)}
                        </span>
                      ))}
                    </div>
                  )}

                  {Array.isArray(article.external_references) &&
                    article.external_references.length > 0 && (
                      <div className="mt-6">
                        <p className="font-mono text-[9px] uppercase text-[#77847e]">
                          References
                        </p>
                        <div className="mt-3 grid gap-2">
                          {article.external_references.map((reference) => (
                            <a
                              key={String(reference)}
                              href={String(reference)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="break-all text-sm text-[#58d7f7] hover:underline"
                            >
                              {String(reference)}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </div>

              {related.length > 0 && (
                <div className="mt-6">
                  <p className="mb-4 font-mono text-[9px] uppercase text-[#77847e]">
                    Related writeups
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {related.map((item) => (
                      <Link
                        key={String(item.id)}
                        href={`/writeups/?slug=${encodeURIComponent(String(item.slug))}`}
                        className="premium-card glass-panel p-4 text-sm hover:border-[#58d7f7]/30"
                      >
                        {String(item.title)}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </article>
    </main>
  );
}
