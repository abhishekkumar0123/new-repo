"use client";

import Link from "next/link";
import { useMemo, useState, type ComponentType } from "react";
import { ArrowUpRight, Search, X } from "lucide-react";

export interface ShowcaseProject {
  id: string;
  title: string;
  category: string;
  description: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  isDemo?: boolean;
  featured?: boolean;
  status?: string;
  tools?: string[];
  githubUrl?: string;
  liveUrl?: string;
}

export function ProjectShowcase({ projects }: { projects: ShowcaseProject[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  const categories = useMemo(() => {
    const values = Array.from(
      new Set(projects.map((project) => project.category).filter(Boolean)),
    );
    return ["All", ...values].slice(0, 9);
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return projects.filter((project) => {
      const categoryMatch = category === "All" || project.category === category;
      const searchable = [
        project.title,
        project.description,
        project.category,
        project.status,
        ...(project.tools || []),
      ]
        .join(" ")
        .toLowerCase();
      return categoryMatch && (!normalized || searchable.includes(normalized));
    });
  }, [projects, query, category]);

  function resetFilters() {
    setQuery("");
    setCategory("All");
  }

  return (
    <>
      <div className="mb-8 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <label className="relative block">
          <span className="sr-only">Search projects</span>
          <Search
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#77847e]"
            size={16}
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search projects, tools, or categories"
            className="h-12 w-full border border-white/[0.08] bg-[#0d161d]/80 pl-11 pr-11 font-mono text-xs text-[#dfe7e3] outline-none transition placeholder:text-[#77847e] focus:border-[#58d7f7]/40"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center text-[#77847e] hover:text-[#58d7f7]"
              aria-label="Clear project search"
            >
              <X size={14} />
            </button>
          )}
        </label>

        <div
          className="flex flex-wrap items-center gap-2"
          aria-label="Project category filters"
        >
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              aria-pressed={category === item}
              className={`h-12 border px-3 font-mono text-[9px] uppercase transition ${category === item ? "border-[#58d7f7]/45 bg-[#58d7f7]/[0.07] text-[#58d7f7]" : "border-white/[0.08] text-[#77847e] hover:border-[#58d7f7]/25 hover:text-[#58d7f7]"}`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5 flex items-center justify-between gap-3 font-mono text-[9px] uppercase text-[#77847e]">
        <span>
          {filteredProjects.length} case file
          {filteredProjects.length === 1 ? "" : "s"}
        </span>
        {(query || category !== "All") && (
          <button
            type="button"
            onClick={resetFilters}
            className="text-[#58d7f7] hover:text-[#91e8fb]"
          >
            Reset filters
          </button>
        )}
      </div>

      {filteredProjects.length ? (
        <div className="grid gap-5 lg:grid-cols-3">
          {filteredProjects.map((project) => {
            const Icon = project.icon;
            return (
              <article
                key={project.id}
                data-premium-card
                data-tilt
                className={`premium-card glass-panel overflow-hidden ${project.featured ? "lg:col-span-2" : ""}`}
              >
                <div
                  className={`relative flex items-center justify-between border-b border-white/[0.07] bg-[#0c1310] p-6 ${project.featured ? "h-52" : "h-44"}`}
                >
                  {project.featured && (
                    <span className="absolute left-5 top-5 border border-[#58d7f7]/30 bg-[#58d7f7]/[0.06] px-2 py-1 font-mono text-[9px] uppercase text-[#58d7f7]">
                      Featured
                    </span>
                  )}
                  <span className="font-mono text-[10px] text-[#77847e]">
                    CASE / {project.id}
                  </span>
                  <Icon
                    size={project.featured ? 68 : 54}
                    className="text-[#58d7f7]/35"
                  />
                </div>

                <div className="p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="border border-[#58d7f7]/15 bg-[#58d7f7]/[0.04] px-2 py-1 font-mono text-[9px] uppercase text-[#58d7f7]">
                      {project.category}
                    </span>
                    <span className="font-mono text-[9px] uppercase text-[#77847e]">
                      {project.status === "published"
                        ? project.isDemo
                          ? "Sample"
                          : "Published"
                        : project.status || "Case file"}
                    </span>
                  </div>

                  <h3 className="mt-5 text-xl font-semibold">
                    {project.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[#9ba8a1]">
                    {project.description}
                  </p>

                  {project.tools?.length ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {project.tools.slice(0, 5).map((tool) => (
                        <span
                          key={tool}
                          className="border border-white/[0.07] px-2 py-1 font-mono text-[9px] text-[#77847e]"
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-6 flex flex-wrap items-center gap-4">
                    <Link
                      href={`/projects/?slug=${encodeURIComponent(project.id)}`}
                      className="inline-flex items-center gap-2 font-mono text-xs text-[#58d7f7]"
                    >
                      View case study <ArrowUpRight size={14} />
                    </Link>
                    {project.githubUrl && (
                      <a
                        href={project.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[10px] text-[#77847e] hover:text-[#58d7f7]"
                      >
                        GitHub
                      </a>
                    )}
                    {project.liveUrl && (
                      <a
                        href={project.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[10px] text-[#77847e] hover:text-[#58d7f7]"
                      >
                        Live demo
                      </a>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="premium-card glass-panel px-6 py-14 text-center">
          <Search className="mx-auto text-[#58d7f7]/50" size={28} />
          <h3 className="mt-4 text-lg font-semibold">No matching case files</h3>
          <p className="mt-2 text-sm text-[#77847e]">
            Try a different search or category.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-5 border border-[#58d7f7]/30 px-4 py-2 font-mono text-[10px] uppercase text-[#58d7f7]"
          >
            Reset filters
          </button>
        </div>
      )}
    </>
  );
}
