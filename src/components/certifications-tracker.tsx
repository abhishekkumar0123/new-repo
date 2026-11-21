"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, CheckCircle2, ExternalLink } from "lucide-react";

interface CertificationTrackerProps {
  certifications: Record<string, unknown>[];
  learning: Record<string, unknown>[];
  projects: Record<string, unknown>[];
}

export function CertificationsTracker({
  certifications,
  learning,
  projects,
}: CertificationTrackerProps) {
  const [filter, setFilter] = useState("All");

  const statusLabels: Record<string, string> = {
    earned: "Earned",
    pursuing: "Currently pursuing",
    planned: "Planned",
    completed_training: "Completed training",
    in_progress: "In progress",
  };

  const visibleCertifications = useMemo(() => {
    return certifications.filter(
      (item) => filter === "All" || String(item.status || "planned") === filter,
    );
  }, [certifications, filter]);

  const learningStatuses: Record<string, string> = {
    not_started: "Not Started",
    planned: "Planned",
    in_progress: "In Progress",
    completed: "Completed",
    earned: "Earned",
  };

  const visibleLearning = useMemo(() => {
    return learning.filter(
      (item) =>
        filter === "All" || String(item.status || "not_started") === filter,
    );
  }, [learning, filter]);

  const filters = [
    "All",
    "earned",
    "pursuing",
    "planned",
    "completed_training",
    "in_progress",
  ];

  return (
    <>
      <div
        className="mb-6 flex flex-wrap gap-2"
        aria-label="Certification and learning filters"
      >
        {filters.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            aria-pressed={filter === item}
            className={`border px-3 py-2 font-mono text-[9px] uppercase transition ${filter === item ? "border-[#58d7f7]/45 bg-[#58d7f7]/[0.07] text-[#58d7f7]" : "border-white/[0.08] text-[#77847e] hover:text-[#58d7f7]"}`}
          >
            {item === "All" ? "All records" : statusLabels[item] || item}
          </button>
        ))}
      </div>

      {visibleCertifications.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleCertifications.map((item) => {
            const status = String(item.status || "planned");
            const relatedProjects = Array.isArray(item.related_projects)
              ? item.related_projects.map(String).filter(Boolean)
              : [];
            const projectLinks = projects.filter(
              (project) =>
                relatedProjects.includes(String(project.slug)) ||
                relatedProjects.includes(String(project.id)),
            );
            return (
              <article
                key={String(item.id)}
                data-premium-card
                className="premium-card glass-panel p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[9px] uppercase text-[#77847e]">
                      {String(item.issuer || "Issuing organization")}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold">
                      {String(item.name)}
                    </h3>
                  </div>
                  {String(item.image_url || "") && (
                    <img
                      src={String(item.image_url)}
                      alt=""
                      className="h-12 w-12 object-contain opacity-80"
                    />
                  )}
                </div>
                <span className="mt-4 inline-flex border border-[#58d7f7]/20 px-2 py-1 font-mono text-[9px] text-[#58d7f7]">
                  {statusLabels[status] || status}
                </span>
                {String(item.description || "") && (
                  <p className="mt-4 text-sm leading-6 text-[#9ba8a1]">
                    {String(item.description)}
                  </p>
                )}
                <div className="mt-4 space-y-2 font-mono text-[9px] text-[#77847e]">
                  {String(item.issue_date || "") && <p>Issued: {String(item.issue_date)}</p>}
                  {String(item.expiration_date || "") && (
                    <p>Expires: {String(item.expiration_date)}</p>
                  )}
                  {String(item.verification_id || "") && (
                    <p>Verification ID: {String(item.verification_id)}</p>
                  )}
                </div>
                {Array.isArray(item.related_skills) &&
                  item.related_skills.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {item.related_skills.map((skill) => (
                        <span
                          key={String(skill)}
                          className="border border-white/[0.07] px-2 py-1 font-mono text-[9px] text-[#77847e]"
                        >
                          {String(skill)}
                        </span>
                      ))}
                    </div>
                  )}
                {projectLinks.length > 0 && (
                  <div className="mt-4 grid gap-2">
                    {projectLinks.map((project) => (
                      <Link
                        key={String(project.id)}
                        href={`/projects/?slug=${encodeURIComponent(String(project.slug || project.id))}`}
                        className="flex items-center justify-between border border-white/[0.07] p-2 text-xs hover:border-[#58d7f7]/30"
                      >
                        {String(project.title)} <ArrowUpRight size={13} />
                      </Link>
                    ))}
                  </div>
                )}
                {String(item.credential_url || "") && (
                  <a
                    href={String(item.credential_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-flex items-center gap-2 font-mono text-[10px] uppercase text-[#58d7f7]"
                  >
                    <ExternalLink size={13} /> Verify credential
                  </a>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="premium-card glass-panel p-7 text-sm text-[#77847e]">
          No certifications have been published for this status yet.
        </div>
      )}

      <div className="mt-12">
        <div className="mb-5">
          <p className="font-mono text-[10px] uppercase tracking-[.16em] text-[#58d7f7]">
            // learning tracker
          </p>
          <h3 className="mt-3 text-2xl font-semibold">
            Study and lab progress
          </h3>
        </div>

        {visibleLearning.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {visibleLearning.map((item) => {
              const status = String(item.status || "not_started");
              const progress = Number(item.progress || 0);
              const relatedProjects = Array.isArray(item.related_projects)
                ? item.related_projects.map(String).filter(Boolean)
                : [];
              const projectLinks = projects.filter(
                (project) =>
                  relatedProjects.includes(String(project.slug)) ||
                  relatedProjects.includes(String(project.id)),
              );
              return (
                <article
                  key={String(item.id)}
                  data-premium-card
                  className="premium-card glass-panel p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[9px] uppercase text-[#77847e]">
                        {String(item.provider || "Independent learning")}
                      </p>
                      <h4 className="mt-2 font-semibold">
                        {String(item.title)}
                      </h4>
                    </div>
                    <span className="border border-white/[0.07] px-2 py-1 font-mono text-[9px] text-[#58d7f7]">
                      {learningStatuses[status] || status}
                    </span>
                  </div>
                  {String(item.category || "") && (
                    <p className="mt-3 font-mono text-[9px] text-[#77847e]">
                      {String(item.category)}
                    </p>
                  )}
                  {status === "in_progress" ||
                  status === "completed" ||
                  status === "earned" ? (
                    <div className="mt-4">
                      <div className="h-1.5 overflow-hidden bg-white/[0.06]">
                        <div
                          className="h-full bg-[#58d7f7]"
                          style={{
                            width: `${Math.max(0, Math.min(100, progress))}%`,
                          }}
                        />
                      </div>
                      <p className="mt-2 font-mono text-[9px] text-[#77847e]">
                        Stored progress: {progress}%
                      </p>
                    </div>
                  ) : null}
                  {String(item.target_date || "") && (
                    <p className="mt-3 font-mono text-[9px] text-[#77847e]">
                      Target: {String(item.target_date)}
                    </p>
                  )}
                  {String(item.notes || "") && (
                    <p className="mt-3 text-sm leading-6 text-[#9ba8a1]">
                      {String(item.notes)}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-3">
                    {String(item.course_url || "") && (
                      <a
                        href={String(item.course_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 font-mono text-[10px] text-[#58d7f7]"
                      >
                        <ExternalLink size={12} /> Course or resource
                      </a>
                    )}
                    {status === "earned" && (
                      <span className="flex items-center gap-1 font-mono text-[9px] text-[#00ff91]">
                        <CheckCircle2 size={12} /> Earned
                      </span>
                    )}
                  </div>
                  {projectLinks.length > 0 && (
                    <div className="mt-4 grid gap-2">
                      {projectLinks.map((project) => (
                        <Link
                          key={String(project.id)}
                          href={`/projects/?slug=${encodeURIComponent(String(project.slug || project.id))}`}
                          className="flex items-center justify-between border border-white/[0.07] p-2 text-xs hover:border-[#58d7f7]/30"
                        >
                          {String(project.title)} <ArrowUpRight size={13} />
                        </Link>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="premium-card glass-panel p-7 text-sm text-[#77847e]">
            No learning records have been published for this status.
          </div>
        )}
      </div>
    </>
  );
}
