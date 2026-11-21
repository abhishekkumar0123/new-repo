"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase/browser";

export function ProjectDetail({ slug }: { slug: string }) {
  const [project, setProject] = useState<Record<string, unknown> | null>(null);
  const [images, setImages] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    if (!supabase) {
      setLoading(false);
      return;
    }

    void supabase
      .from("projects")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle()
      .then(async ({ data }) => {
        const found = (data as Record<string, unknown> | null) ?? null;
        setProject(found);
        if (found?.id) {
          const gallery = await supabase
            .from("project_images")
            .select("*")
            .eq("project_id", String(found.id))
            .order("display_order");
          setImages(gallery.data ?? []);
        }
        setLoading(false);
      });
  }, [slug]);

  const category = String(project?.category || "");
  const difficulty = String(project?.difficulty || "");
  const githubUrl = String(project?.github_url || "");
  const liveUrl = String(project?.live_url || "");

  const tools = Array.isArray(project?.tools)
    ? project.tools.map((tool) => String(tool)).filter(Boolean)
    : [];

  const sections = project
    ? [
        ["Overview", project.short_description],
        ["Objective", project.objective],
        ["Environment / lab setup", project.environment],
        ["Methodology / process", project.process],
        ["Full report", project.report],
        ["Evidence", project.evidence],
        ["Findings", project.findings],
        ["Lessons learned", project.lessons],
      ].filter(([, value]) => String(value || "").trim())
    : [];

  return (
    <main className="min-h-screen px-5 pb-20 pt-28 lg:px-8">
      <article className="mx-auto max-w-5xl">
        <Link
          href="/#projects"
          className="inline-flex items-center gap-2 font-mono text-xs text-[#77847e] hover:text-[#58d7f7]"
        >
          <ArrowLeft size={14} /> Back to projects
        </Link>

        <div className="premium-card glass-panel mt-6 overflow-hidden">
          <div className="border-b border-white/[0.07] p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] text-[#58d7f7]">
                  CASE FILE /{" "}
                  {project
                    ? String(project.case_id || project.slug || "UNSPECIFIED")
                    : "SAMPLE"}
                </p>
                <h1 className="mt-3 text-4xl font-semibold">
                  {project
                    ? String(project.title)
                    : loading
                      ? "Loading case file"
                      : "Sample Project Investigation"}
                </h1>
              </div>
              {project && (
                <span className="border border-[#58d7f7]/20 px-3 py-2 font-mono text-[9px] uppercase text-[#58d7f7]">
                  {String(project.status || "published")}
                </span>
              )}
            </div>

            <p className="mt-4 max-w-3xl text-[#9ba8a1]">
              {project
                ? String(project.short_description || "")
                : "This route is a clearly labelled layout preview, not a claim of personal work."}
            </p>

            {project && (
              <div className="mt-5 flex flex-wrap gap-2">
                {category && (
                  <span className="border border-[#58d7f7]/15 px-2 py-1 font-mono text-[9px] uppercase text-[#58d7f7]">
                    {String(category)}
                  </span>
                )}
                {difficulty && (
                  <span className="border border-white/[0.08] px-2 py-1 font-mono text-[9px] text-[#77847e]">
                    {String(difficulty)}
                  </span>
                )}
                {tools.map((tool) => (
                  <span
                    key={tool}
                    className="border border-white/[0.08] px-2 py-1 font-mono text-[9px] text-[#77847e]"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            )}
          </div>

          {sections.length ? (
            <div className="grid gap-6 p-7 lg:grid-cols-2">
              {sections.map(([title, value]) => (
                <section
                  key={String(title)}
                  className="border border-white/[0.07] p-5"
                >
                  <h2 className="font-mono text-xs uppercase text-[#58d7f7]">
                    {String(title)}
                  </h2>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#9ba8a1]">
                    {String(value)}
                  </p>
                </section>
              ))}
            </div>
          ) : (
            <div className="p-7">
              <p className="text-sm leading-7 text-[#9ba8a1]">
                {loading
                  ? "Loading available case-study details…"
                  : "No additional verified case-study details have been published for this sample."}
              </p>
            </div>
          )}

          {images.length > 0 && (
            <div className="border-t border-white/[0.07] p-7">
              <h2 className="font-mono text-xs uppercase text-[#58d7f7]">
                Visual evidence
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {images.map((image) => (
                  <figure
                    key={String(image.id)}
                    className="overflow-hidden border border-white/[0.07]"
                  >
                    <img
                      src={String(image.media_url)}
                      alt={String(image.alt || "Project evidence")}
                      className="h-52 w-full object-cover"
                    />
                  </figure>
                ))}
              </div>
            </div>
          )}

          {project && (githubUrl || liveUrl) && (
            <div className="flex flex-wrap gap-3 border-t border-white/[0.07] p-7">
              {githubUrl && (
                <a
                  href={String(githubUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center gap-2 border border-[#58d7f7]/30 px-4 font-mono text-[10px] uppercase text-[#58d7f7]"
                >
                  <ExternalLink size={14} /> GitHub repository
                </a>
              )}
              {liveUrl && (
                <a
                  href={String(liveUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center gap-2 border border-white/[0.08] px-4 font-mono text-[10px] uppercase text-[#77847e]"
                >
                  <ExternalLink size={14} /> Live demo
                </a>
              )}
            </div>
          )}
        </div>
      </article>
    </main>
  );
}
