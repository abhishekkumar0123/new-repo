"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";
import {
  ArrowUpRight,
  Network,
  Search,
  SearchCheck,
  ShieldAlert,
  Terminal,
  X,
} from "lucide-react";

interface SkillsExplorerProps {
  categories: Record<string, unknown>[];
  skills: Record<string, unknown>[];
  projects: Record<string, unknown>[];
}

interface SkillItem {
  id: string;
  name: string;
  description: string;
  category: string;
  indicator: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  projects: Record<string, unknown>[];
}

interface ToolItem {
  name: string;
  category: string;
  description: string;
  status: "Exploring" | "Learning" | "Practicing";
  useCases: string[];
  documentation?: string;
  projects: Record<string, unknown>[];
}

const fallbackCategories = [
  {
    id: "networking",
    name: "Networking",
    description: "TCP/IP, routing concepts, and packet analysis fundamentals",
  },
  {
    id: "linux",
    name: "Linux",
    description: "Command-line fundamentals and system navigation",
  },
  {
    id: "monitoring",
    name: "Security Monitoring",
    description: "Log review, alert triage, and investigation workflow",
  },
  {
    id: "fundamentals",
    name: "Security Fundamentals",
    description: "CIA triad, authentication, risk, and threat awareness",
  },
];

const fallbackSkills = [
  {
    name: "Networking",
    description: "TCP/IP, routing concepts, packet analysis fundamentals",
    icon: "Network",
    indicator: "Learning",
  },
  {
    name: "Linux",
    description: "Command-line fundamentals and system navigation",
    icon: "Terminal",
    indicator: "Learning",
  },
  {
    name: "Security Monitoring",
    description: "Log review, alert triage, investigation workflow",
    icon: "SearchCheck",
    indicator: "Learning",
  },
  {
    name: "Security Fundamentals",
    description: "CIA triad, authentication, risk and threat awareness",
    icon: "ShieldAlert",
    indicator: "Learning",
  },
];

function iconFor(
  name: string,
): ComponentType<{ size?: number; className?: string }> {
  const lower = name.toLowerCase();
  if (lower.includes("linux") || lower.includes("terminal")) return Terminal;
  if (lower.includes("network") || lower.includes("packet")) return Network;
  if (lower.includes("monitor") || lower.includes("analysis"))
    return SearchCheck;
  return ShieldAlert;
}

export function SkillsExplorer({
  categories,
  skills,
  projects,
}: SkillsExplorerProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedSkill, setSelectedSkill] = useState<SkillItem | null>(null);
  const [selectedTool, setSelectedTool] = useState<ToolItem | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const categoryList = categories.length
    ? categories.map((item) => ({
        id: String(item.id),
        name: String(item.name),
        description: String(item.description || ""),
      }))
    : fallbackCategories;

  const skillList: SkillItem[] = useMemo(() => {
    const source = skills.length
      ? skills
      : fallbackSkills.map((item, index) => ({
          ...item,
          id: `fallback-${index}`,
          category_id: null,
        }));

    return source.map((skill, index) => {
      const name = String(skill.name);
      const categoryId = skill.category_id ? String(skill.category_id) : null;
      const categoryName = categoryId
        ? categoryList.find((item) => item.id === categoryId)?.name ||
          "Cybersecurity"
        : fallbackCategories.find((item) => item.name === name)?.name ||
          "Cybersecurity";

      const projectMatches = projects.filter((project) => {
        const haystack = [
          project.title,
          project.category,
          project.short_description,
          project.objective,
          project.environment,
          project.process,
          project.tools,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(name.toLowerCase());
      });

      return {
        id: String(skill.id || `skill-${index}`),
        name,
        description: String(skill.description || ""),
        category: categoryName,
        indicator: String(skill.indicator || "Learning"),
        icon: iconFor(String(skill.icon || name)),
        projects: projectMatches,
      };
    });
  }, [skills, projects, categoryList]);

  const tools: ToolItem[] = useMemo(() => {
    const toolNames = new Set<string>();

    projects.forEach((project) => {
      if (Array.isArray(project.tools)) {
        project.tools.forEach((tool) => {
          const name = String(tool || "").trim();
          if (name) toolNames.add(name);
        });
      }
    });

    ["Linux", "Nmap", "Wireshark"].forEach((name) => {
      const confirmedByText = [...projects].some((project) =>
        [
          project.title,
          project.category,
          project.short_description,
          project.description,
          project.process,
          project.environment,
        ]
          .join(" ")
          .toLowerCase()
          .includes(name.toLowerCase()),
      );
      if (name === "Linux" || name === "Nmap" || name === "Wireshark") {
        if (
          confirmedByText ||
          skillList.some((skill) =>
            skill.name.toLowerCase().includes(name.toLowerCase()),
          )
        ) {
          toolNames.add(name);
        }
      }
    });

    return Array.from(toolNames)
      .slice(0, 12)
      .map((name) => {
        const lower = name.toLowerCase();
        const projectMatches = projects.filter((project) => {
          const listMatch =
            Array.isArray(project.tools) &&
            project.tools.some((tool) => String(tool).toLowerCase() === lower);
          const textMatch = [
            project.title,
            project.category,
            project.short_description,
            project.description,
            project.process,
            project.environment,
          ]
            .join(" ")
            .toLowerCase()
            .includes(lower);
          return listMatch || textMatch;
        });

        const isLinux = lower === "linux";
        const isNetwork =
          lower.includes("nmap") ||
          lower.includes("wireshark") ||
          lower.includes("network");
        return {
          name,
          category: isLinux
            ? "Operating System"
            : isNetwork
              ? "Network / Packet Analysis"
              : "Project Tool",
          description: isLinux
            ? "Linux command-line environment for system navigation and security learning."
            : isNetwork
              ? `${name} is associated with network analysis or packet-investigation learning.`
              : `${name} is listed in the portfolio project or learning data.`,
          status: "Exploring" as const,
          useCases: isLinux
            ? [
                "Command-line navigation",
                "System fundamentals",
                "Security workflow practice",
              ]
            : isNetwork
              ? [
                  "Network traffic review",
                  "Packet or connection analysis",
                  "Learning lab documentation",
                ]
              : [
                  "Technical project workflow",
                  "Evidence review",
                  "Learning and documentation",
                ],
          documentation: isLinux
            ? "https://linux.org/"
            : lower === "nmap"
              ? "https://nmap.org/docs.html"
              : lower === "wireshark"
                ? "https://www.wireshark.org/docs/"
                : undefined,
          projects: projectMatches,
        };
      });
  }, [projects, skillList]);

  const filteredSkills = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return skillList.filter((skill) => {
      const categoryMatch = category === "All" || skill.category === category;
      const searchable =
        `${skill.name} ${skill.description} ${skill.category} ${skill.indicator}`.toLowerCase();
      return categoryMatch && (!normalized || searchable.includes(normalized));
    });
  }, [skillList, category, query]);

  useEffect(() => {
    if (!selectedSkill && !selectedTool) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedSkill(null);
        setSelectedTool(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.setTimeout(() => dialogRef.current?.focus(), 0);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedSkill, selectedTool]);

  function resetFilters() {
    setQuery("");
    setCategory("All");
  }

  const activeDetail = Boolean(selectedSkill || selectedTool);

  return (
    <>
      <div className="mb-8 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <label className="relative block">
          <span className="sr-only">Search skills</span>
          <Search
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#77847e]"
            size={16}
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search skills or learning areas"
            className="h-12 w-full border border-white/[0.08] bg-[#0d161d]/80 pl-11 pr-11 font-mono text-xs text-[#dfe7e3] outline-none placeholder:text-[#77847e] focus:border-[#58d7f7]/40"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center text-[#77847e] hover:text-[#58d7f7]"
              aria-label="Clear skill search"
            >
              <X size={14} />
            </button>
          )}
        </label>

        <div
          className="flex max-w-full flex-wrap gap-2"
          aria-label="Skill categories"
        >
          {["All", ...categoryList.map((item) => item.name)].map((item) => (
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

      <div className="mb-5 flex items-center justify-between font-mono text-[9px] uppercase text-[#77847e]">
        <span>
          {filteredSkills.length} learning area
          {filteredSkills.length === 1 ? "" : "s"}
        </span>
        {(query || category !== "All") && (
          <button
            type="button"
            onClick={resetFilters}
            className="text-[#58d7f7]"
          >
            Reset filters
          </button>
        )}
      </div>

      {filteredSkills.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filteredSkills.map((skill) => {
            const Icon = skill.icon;
            return (
              <button
                key={skill.id}
                type="button"
                data-premium-card
                data-tilt
                onClick={() => setSelectedSkill(skill)}
                className="premium-card glass-panel group p-6 text-left transition hover:-translate-y-1"
              >
                <Icon size={22} className="text-[#58d7f7]" />
                <p className="mt-5 font-mono text-[9px] uppercase text-[#77847e]">
                  {skill.category}
                </p>
                <h3 className="mt-2 font-mono text-sm text-white">
                  {skill.name}
                </h3>
                <p className="mt-3 text-sm leading-6 text-[#9ba8a1]">
                  {skill.description}
                </p>
                <span className="mt-4 inline-flex border border-white/[0.07] px-2 py-1 font-mono text-[9px] text-[#77847e]">
                  {skill.indicator || "Learning"}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="premium-card glass-panel px-6 py-12 text-center">
          <h3 className="text-lg font-semibold">No matching skills</h3>
          <p className="mt-2 text-sm text-[#77847e]">
            Try another category or search term.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-5 border border-[#58d7f7]/30 px-4 py-2 font-mono text-[10px] uppercase text-[#58d7f7]"
          >
            Reset
          </button>
        </div>
      )}

      <div className="mt-12">
        <div className="mb-5">
          <p className="font-mono text-[10px] uppercase tracking-[.16em] text-[#58d7f7]">
            // tools & technologies
          </p>
          <h3 className="mt-3 text-2xl font-semibold">
            Cybersecurity tools explorer
          </h3>
        </div>

        {tools.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) => (
              <button
                key={tool.name}
                type="button"
                data-premium-card
                onClick={() => setSelectedTool(tool)}
                className="premium-card glass-panel p-5 text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[9px] uppercase text-[#77847e]">
                      {tool.category}
                    </p>
                    <h4 className="mt-2 font-mono text-sm text-white">
                      {tool.name}
                    </h4>
                  </div>
                  <span className="border border-[#58d7f7]/20 px-2 py-1 font-mono text-[8px] uppercase text-[#58d7f7]">
                    {tool.status}
                  </span>
                </div>
                <p className="mt-3 text-xs leading-6 text-[#9ba8a1]">
                  {tool.description}
                </p>
                {tool.projects.length > 0 && (
                  <p className="mt-3 font-mono text-[9px] text-[#77847e]">
                    {tool.projects.length} linked project
                    {tool.projects.length === 1 ? "" : "s"}
                  </p>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="premium-card glass-panel p-6 text-sm text-[#77847e]">
            No verified tool data is currently listed. Tools will appear here
            when they are added to project or CMS data.
          </div>
        )}
      </div>

      {activeDetail && (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedSkill(null);
              setSelectedTool(null);
            }
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={
              selectedSkill
                ? `${selectedSkill.name} details`
                : `${selectedTool?.name} details`
            }
            tabIndex={-1}
            className="premium-card glass-panel max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6 sm:p-7"
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] pb-4">
              <div>
                <p className="font-mono text-[9px] uppercase text-[#58d7f7]">
                  {selectedSkill
                    ? selectedSkill.category
                    : selectedTool?.category}
                </p>
                <h3 className="mt-2 text-2xl font-semibold">
                  {selectedSkill ? selectedSkill.name : selectedTool?.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedSkill(null);
                  setSelectedTool(null);
                }}
                className="grid size-9 place-items-center border border-white/[0.08] text-[#77847e] hover:text-[#58d7f7]"
                aria-label="Close details"
              >
                <X size={16} />
              </button>
            </div>

            {selectedSkill && (
              <div className="mt-5 space-y-5">
                <p className="text-sm leading-7 text-[#9ba8a1]">
                  {selectedSkill.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="border border-[#58d7f7]/20 px-2 py-1 font-mono text-[9px] text-[#58d7f7]">
                    {selectedSkill.indicator || "Learning"}
                  </span>
                </div>
                {selectedSkill.projects.length ? (
                  <div>
                    <p className="font-mono text-[9px] uppercase text-[#77847e]">
                      Related project evidence
                    </p>
                    <div className="mt-3 grid gap-2">
                      {selectedSkill.projects.map((project) => (
                        <Link
                          key={String(project.id || project.slug)}
                          href={`/projects/?slug=${encodeURIComponent(String(project.slug || project.id))}`}
                          className="flex items-center justify-between border border-white/[0.07] p-3 text-sm hover:border-[#58d7f7]/30"
                        >
                          {String(project.title)}{" "}
                          <ArrowUpRight size={14} className="text-[#58d7f7]" />
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[#77847e]">
                    No explicitly linked project evidence is configured.
                  </p>
                )}
              </div>
            )}

            {selectedTool && (
              <div className="mt-5 space-y-5">
                <p className="text-sm leading-7 text-[#9ba8a1]">
                  {selectedTool.description}
                </p>
                <div>
                  <p className="font-mono text-[9px] uppercase text-[#77847e]">
                    Learning status
                  </p>
                  <p className="mt-2 border-l border-[#58d7f7]/30 pl-3 text-sm text-[#58d7f7]">
                    {selectedTool.status}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[9px] uppercase text-[#77847e]">
                    Key use cases
                  </p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {selectedTool.useCases.map((useCase) => (
                      <p
                        key={useCase}
                        className="border border-white/[0.07] p-3 text-xs text-[#bdc8c2]"
                      >
                        {useCase}
                      </p>
                    ))}
                  </div>
                </div>
                {selectedTool.projects.length ? (
                  <div>
                    <p className="font-mono text-[9px] uppercase text-[#77847e]">
                      Related project evidence
                    </p>
                    <div className="mt-3 grid gap-2">
                      {selectedTool.projects.map((project) => (
                        <Link
                          key={String(project.id || project.slug)}
                          href={`/projects/?slug=${encodeURIComponent(String(project.slug || project.id))}`}
                          className="flex items-center justify-between border border-white/[0.07] p-3 text-sm hover:border-[#58d7f7]/30"
                        >
                          {String(project.title)}{" "}
                          <ArrowUpRight size={14} className="text-[#58d7f7]" />
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[#77847e]">
                    No explicitly linked project evidence is configured.
                  </p>
                )}
                {selectedTool.documentation && (
                  <a
                    href={selectedTool.documentation}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 border border-[#58d7f7]/30 px-4 py-2 font-mono text-[10px] uppercase text-[#58d7f7]"
                  >
                    Official documentation <ArrowUpRight size={13} />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
