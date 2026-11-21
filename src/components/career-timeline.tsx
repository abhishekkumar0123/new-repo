"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  ChevronDown,
  Clock,
  Briefcase,
  BookOpen,
  ShieldAlert,
  Certificate,
  GraduationCap,
  GitBranch,
  Activity,
  ExternalLink,
} from "lucide-react";

interface TimelineEntry {
  id: string;
  title: string;
  organization?: string | null;
  description?: string | null;
  occurred_at?: string | null;
  category?: string | null;
  related_projects?: string[] | null;
  related_certifications?: string[] | null;
  related_skills?: string[] | null;
  visible: boolean;
  display_order: number;
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  Education: { label: "Education", color: "#58d7f7" },
  Career: { label: "Career", color: "#00ff91" },
  Projects: { label: "Projects", color: "#fbbf24" },
  Cybersecurity: { label: "Cybersecurity", color: "#58d7f7" },
  Certifications: { label: "Certifications", color: "#a855f7" },
  Learning: { label: "Learning", color: "#00ff91" },
  Achievements: { label: "Achievements", color: "#ff4d4d" },
};

const CATEGORY_ICONS: Record<string, typeof BookOpen> = {
  Education: GraduationCap,
  Career: Briefcase,
  Projects: GitBranch,
  Cybersecurity: ShieldAlert,
  Certifications: Certificate,
  Learning: BookOpen,
  Achievements: Activity,
};

export function CareerTimeline({
  timeline,
  projects,
  certifications,
  skills,
}: {
  timeline: Record<string, unknown>[];
  projects: Record<string, unknown>[];
  certifications: Record<string, unknown>[];
  skills: Record<string, unknown>[];
}) {
  const [filter, setFilter] = useState<string>("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>(["All"]);
    timeline.forEach((entry) => {
      const cat = String(entry.category || "").trim();
      if (cat) set.add(cat);
    });
    return Array.from(set);
  }, [timeline]);

  const currentEntry = useMemo(() => {
    const visible = timeline.filter((e) => Boolean(e.visible));
    if (visible.length === 0) return null;
    return visible.reduce((latest, entry) => {
      const entryDate = entry.occurred_at
        ? new Date(String(entry.occurred_at)).getTime()
        : 0;
      const latestDate = latest.occurred_at
        ? new Date(String(latest.occurred_at)).getTime()
        : 0;
      return entryDate > latestDate ? entry : latest;
    }, visible[0]);
  }, [timeline]);

  const filtered = useMemo(() => {
    return timeline.filter((entry) => {
      if (!entry.visible) return false;
      if (filter === "All") return true;
      return String(entry.category || "") === filter;
    });
  }, [timeline, filter]);

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "Date not set";
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Date not set";
    }
  };

  const findRelatedProjects = (slugs: string[] | undefined) => {
    if (!slugs?.length) return [];
    return projects.filter((p) =>
      slugs.includes(String(p.slug || p.id)) ||
      slugs.includes(String(p.id))
    );
  };

  const findRelatedCertifications = (ids: string[] | undefined) => {
    if (!ids?.length) return [];
    return certifications.filter((c) => ids.includes(String(c.id)));
  };

  const findRelatedSkills = (ids: string[] | undefined) => {
    if (!ids?.length) return [];
    return skills.filter((s) => ids.includes(String(s.id)));
  };

  const isCurrent = (entry: Record<string, unknown>) => {
    return (
      currentEntry &&
      String(currentEntry.id) === String(entry.id) &&
      Boolean(entry.occurred_at)
    );
  };

  if (filtered.length === 0) {
    return (
      <section id="timeline" className="border-y border-white/[0.06] px-5 py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10">
            <p className="font-mono text-xs uppercase tracking-[.18em] text-[#00ff91]">
              // 07 — journey
            </p>
            <h2 className="mt-4 text-4xl font-semibold">
              Career &amp; Learning Timeline
            </h2>
          </div>
          <div className="glass-panel p-12 text-center">
            <Clock className="mx-auto mb-4 text-[#58d7f7]/30" size={48} />
            <h3 className="text-lg font-semibold">
              No timeline entries yet
            </h3>
            <p className="mt-2 text-sm text-[#9ba8a1]">
              Add career and learning entries through the CMS to build your timeline.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="timeline" className="border-y border-white/[0.06] px-5 py-24 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10">
          <p className="font-mono text-xs uppercase tracking-[.18em] text-[#00ff91]">
            // 07 — journey
          </p>
          <h2 className="mt-4 text-4xl font-semibold">
            Career &amp; Learning Timeline
          </h2>
          <p className="mt-3 max-w-xl text-sm text-[#9ba8a1]">
            A chronological view of education, career steps, certifications, and
            security learning progress.
          </p>
        </div>

        <div className="mb-10 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              aria-pressed={filter === cat}
              className={`border px-3 py-2 font-mono text-[9px] uppercase transition ${filter === cat ? "border-[#00ff91]/45 bg-[#00ff91]/[0.07] text-[#00ff91]" : "border-white/[0.08] text-[#77847e] hover:border-[#00ff91]/25 hover:text-[#00ff91]"}`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative max-w-2xl mx-auto">
          <div className="absolute inset-y-0 left-[24px] w-[1px] bg-white/[0.08]" />

          {filtered.map((entry) => {
            const id = String(entry.id);
            const current = isCurrent(entry);
            const expanded = expandedId === id;
            const config =
              CATEGORY_CONFIG[String(entry.category || "")] ||
              CATEGORY_CONFIG.Learning;
            const Icon =
              CATEGORY_ICONS[String(entry.category || "")] || BookOpen;
            const dateStr = String(entry.occurred_at || "");
            const relatedProjects = findRelatedProjects(
              Array.isArray(entry.related_projects)
                ? entry.related_projects
                : undefined
            );
            const relatedCerts = findRelatedCertifications(
              Array.isArray(entry.related_certifications)
                ? entry.related_certifications
                : undefined
            );
            const relatedSkills = findRelatedSkills(
              Array.isArray(entry.related_skills)
                ? entry.related_skills
                : undefined
            );

            return (
              <article
                key={id}
                className="relative mb-14 pl-[56px]"
              >
                <div
                  className="absolute left-[19px] top-1 size-6 rounded-full border-2 border-white/[0.12] bg-[#070b10]"
                >
                  <div
                    className={`size-2.5 rounded-full bg-[#00ff91] shadow-[0_0_12px_rgba(0,255,145,0.5)] ${current ? "ring-2 ring-[#00ff91] ring-offset-2 ring-offset-[#070b10]" : ""}`}
                  />
                </div>
                <div
                  className={`premium-card glass-panel p-6 transition ${current ? "border-[#00ff91]/40" : ""}`}
                  data-premium-card
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <span
                      className={`font-mono text-[9px] uppercase tracking-wider px-2 py-1 rounded-md border ${current ? "border-[#00ff91]/30 bg-[#00ff91]/[0.1] text-[#00ff91]" : `border-[${config.color}]/20 bg-[${config.color}]/[0.05] text-[${config.color}]`}`}
                    >
                      {config.label}
                    </span>
                    {current && (
                      <span className="flex items-center gap-1.5 font-mono text-[9px] text-[#00ff91]">
                        <Clock size={12} /> Current milestone
                      </span>
                    )}
                    <span className="font-mono text-[9px] text-[#77847e]">
                      {formatDate(dateStr)}
                    </span>
                  </div>
                  <h3 className="mt-1 text-lg font-semibold">
                    {String(entry.title)}
                  </h3>
                  {String(entry.organization || "") && (
                    <p className="mt-1 text-sm text-[#58d7f7]">
                      {String(entry.organization)}
                    </p>
                  )}
                  <p className="mt-3 text-sm leading-6 text-[#9ba8a1]">
                    {String(entry.description || "No description provided.")}
                  </p>

                  <div className="mt-5 flex items-center gap-2 border-t border-white/[0.06] pt-3">
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : id)}
                      className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase text-[#58d7f7] transition hover:text-[#91e8fb]"
                    >
                      {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      {expanded ? "Show less" : "Show details"}
                    </button>
                  </div>

                  {expanded && (
                    <div className="mt-4 pt-4 border-t border-white/[0.06]">
                      {relatedProjects.length > 0 && (
                        <div className="mb-4">
                          <p className="mb-2 font-mono text-[9px] uppercase text-[#77847e]">
                            Related project evidence
                          </p>
                          <div className="grid gap-2">
                            {relatedProjects.map((project) => (
                              <Link
                                key={String(project.id || project.slug)}
                                href={`/projects/?slug=${encodeURIComponent(String(project.slug || project.id))}`}
                                className="flex items-center justify-between border border-white/[0.07] p-2 text-xs hover:border-[#00ff91]/30"
                              >
                                {String(project.title)}
                                <ExternalLink size={12} className="text-[#00ff91]" />
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                      {relatedCerts.length > 0 && (
                        <div className="mb-4">
                          <p className="mb-2 font-mono text-[9px] uppercase text-[#77847e]">
                            Related certifications
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {relatedCerts.map((cert) => (
                              <span
                                key={String(cert.id)}
                                className="border border-[#a855f7]/20 px-2 py-1 font-mono text-[9px] text-[#a855f7]"
                              >
                                {String(cert.name)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {relatedSkills.length > 0 && (
                        <div>
                          <p className="mb-2 font-mono text-[9px] uppercase text-[#77847e]">
                            Related skills
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {relatedSkills.map((skill) => (
                              <span
                                key={String(skill.id)}
                                className="border border-white/[0.07] px-2 py-1 font-mono text-[9px] text-[#77847e]"
                              >
                                {String(skill.name)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
