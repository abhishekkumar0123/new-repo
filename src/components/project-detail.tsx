"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase/browser";

export function ProjectDetail({ slug }: { slug: string }) {
  const [project, setProject] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    if (!supabase) return;
    void supabase
      .from("projects")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle()
      .then(({ data }) =>
        setProject((data as Record<string, unknown> | null) ?? null),
      );
  }, [slug]);

  return (
    <main className="min-h-screen px-5 pb-20 pt-28 lg:px-8">
      <article className="mx-auto max-w-4xl">
        <Link
          href="/#projects"
          className="inline-flex items-center gap-2 font-mono text-xs text-[#77847e] hover:text-[#00ff91]"
        >
          <ArrowLeft size={14} /> Back to projects
        </Link>
        <div className="glass-panel mt-6 overflow-hidden">
          <div className="border-b border-white/[0.07] p-7">
            <p className="font-mono text-[10px] text-[#00ff91]">
              CASE FILE /{" "}
              {project ? String(project.case_id || project.slug) : "DEMO"}
            </p>
            <h1 className="mt-3 text-4xl font-semibold">
              {project ? String(project.title) : "Sample Project Investigation"}
            </h1>
            <p className="mt-4 max-w-2xl text-[#9ba8a1]">
              {project
                ? String(project.short_description || "")
                : "This route is a clearly labelled layout preview, not a claim of personal work."}
            </p>
          </div>
          <div className="grid gap-6 p-7 sm:grid-cols-2">
            {[
              [
                "Objective",
                project?.objective,
                "Define the approved investigation goal from the admin project editor.",
              ],
              [
                "Lab setup",
                project?.environment,
                "Document the isolated environment, scope, and tools used.",
              ],
              [
                "Findings",
                project?.findings,
                "Add evidence-based findings through the CMS.",
              ],
              [
                "Lessons learned",
                project?.lessons,
                "Document truthful lessons from the investigation.",
              ],
            ].map(([title, value, fallback]) => (
              <div key={String(title)}>
                <h2 className="font-mono text-xs uppercase text-[#00ff91]">
                  {String(title)}
                </h2>
                <p className="mt-3 text-sm leading-7 text-[#9ba8a1]">
                  {project ? String(value || fallback) : String(fallback)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </article>
    </main>
  );
}
