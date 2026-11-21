"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, Search, X } from "lucide-react";

export function WriteupsHub({
  writeups,
}: {
  writeups: Record<string, unknown>[];
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [difficulty, setDifficulty] = useState("All");
  const [tag, setTag] = useState("All");

  const categories = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set(
          writeups
            .map((item) => String(item.category || "General Security"))
            .filter(Boolean),
        ),
      ),
    ],
    [writeups],
  );
  const difficulties = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set(
          writeups.map((item) => String(item.difficulty || "")).filter(Boolean),
        ),
      ),
    ],
    [writeups],
  );
  const tags = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set(
          writeups
            .flatMap((item) =>
              Array.isArray(item.tags) ? item.tags.map(String) : [],
            )
            .filter(Boolean),
        ),
      ),
    ],
    [writeups],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return writeups.filter((item) => {
      const itemTags = Array.isArray(item.tags) ? item.tags.map(String) : [];
      return (
        (category === "All" ||
          String(item.category || "General Security") === category) &&
        (difficulty === "All" ||
          String(item.difficulty || "") === difficulty) &&
        (tag === "All" || itemTags.includes(tag)) &&
        (!normalized ||
          [item.title, item.summary, item.category, item.content, ...itemTags]
            .join(" ")
            .toLowerCase()
            .includes(normalized))
      );
    });
  }, [writeups, query, category, difficulty, tag]);

  function reset() {
    setQuery("");
    setCategory("All");
    setDifficulty("All");
    setTag("All");
  }

  return (
    <>
      <div className="mb-8 grid gap-3 lg:grid-cols-[1fr_auto]">
        <label className="relative block">
          <span className="sr-only">Search writeups</span>
          <Search
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#77847e]"
            size={16}
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search articles, topics, or tags"
            className="h-12 w-full border border-white/[0.08] bg-[#0d161d]/80 pl-11 pr-11 font-mono text-xs outline-none placeholder:text-[#77847e] focus:border-[#58d7f7]/40"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center text-[#77847e] hover:text-[#58d7f7]"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </label>
        <div className="flex flex-wrap gap-2">
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="h-12 border border-white/[0.08] bg-[#0d161d] px-3 font-mono text-[9px] uppercase text-[#77847e] outline-none"
            aria-label="Filter by category"
          >
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value)}
            className="h-12 border border-white/[0.08] bg-[#0d161d] px-3 font-mono text-[9px] uppercase text-[#77847e] outline-none"
            aria-label="Filter by difficulty"
          >
            {difficulties.map((item) => (
              <option key={item}>{item || "All"}</option>
            ))}
          </select>
          <select
            value={tag}
            onChange={(event) => setTag(event.target.value)}
            className="h-12 border border-white/[0.08] bg-[#0d161d] px-3 font-mono text-[9px] uppercase text-[#77847e] outline-none"
            aria-label="Filter by tag"
          >
            {tags.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-5 flex items-center justify-between font-mono text-[9px] uppercase text-[#77847e]">
        <span>
          {filtered.length} article{filtered.length === 1 ? "" : "s"}
        </span>
        {(query ||
          category !== "All" ||
          difficulty !== "All" ||
          tag !== "All") && (
          <button type="button" onClick={reset} className="text-[#58d7f7]">
            Reset filters
          </button>
        )}
      </div>

      {filtered.length ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((writeup) => {
            const tags = Array.isArray(writeup.tags)
              ? writeup.tags.map(String).filter(Boolean)
              : [];
            const readTime =
              Number(writeup.read_time_minutes || 0) ||
              Math.max(
                1,
                Math.ceil(
                  String(writeup.content || "").split(/\s+/).length / 220,
                ),
              );
            const created = writeup.created_at
              ? new Date(String(writeup.created_at)).toLocaleDateString()
              : "";
            return (
              <article
                key={String(writeup.id)}
                data-premium-card
                className="premium-card glass-panel group overflow-hidden"
              >
                {String(writeup.cover_image || "") && (
                  <img
                    src={String(writeup.cover_image)}
                    alt=""
                    className="h-44 w-full object-cover opacity-80 transition duration-500 group-hover:scale-[1.02] group-hover:opacity-100"
                  />
                )}
                <div className="p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="border border-[#58d7f7]/20 px-2 py-1 font-mono text-[9px] uppercase text-[#58d7f7]">
                      {String(writeup.category || "General Security")}
                    </span>
                    {Boolean(writeup.featured) && (
                      <span className="font-mono text-[9px] uppercase text-[#ffca8a]">
                        Featured
                      </span>
                    )}
                  </div>
                  <h2 className="mt-5 text-xl font-semibold">
                    {String(writeup.title)}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-[#9ba8a1]">
                    {String(writeup.summary || "Published learning note.")}
                  </p>
                  {tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {tags.slice(0, 4).map((item) => (
                        <span
                          key={item}
                          className="border border-white/[0.07] px-2 py-1 font-mono text-[9px] text-[#77847e]"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/[0.07] pt-4 font-mono text-[9px] text-[#77847e]">
                    <span>{readTime} min read</span>
                    <span>{String(writeup.difficulty || "Unrated")}</span>
                    <span>{created}</span>
                  </div>
                  <Link
                    href={`/writeups/?slug=${encodeURIComponent(String(writeup.slug))}`}
                    className="mt-5 inline-flex items-center gap-2 font-mono text-xs text-[#58d7f7]"
                  >
                    Read writeup <ArrowUpRight size={14} />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="premium-card glass-panel px-6 py-14 text-center">
          <h2 className="text-lg font-semibold">No matching writeups</h2>
          <p className="mt-2 text-sm text-[#77847e]">
            Try another search or reset the filters.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-5 border border-[#58d7f7]/30 px-4 py-2 font-mono text-[10px] uppercase text-[#58d7f7]"
          >
            Reset filters
          </button>
        </div>
      )}
    </>
  );
}
