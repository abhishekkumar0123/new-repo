"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { Hero } from "@/components/hero";
import {
  ArrowUpRight,
  BookOpen,
  FileBadge,
  FlaskConical,
  FolderLock,
  Network,
  SearchCheck,
  ShieldAlert,
} from "lucide-react";
import { InteractiveTerminal } from "@/components/interactive-terminal";
import { ContactForm } from "@/components/contact-form";
import {
  ProjectShowcase,
  type ShowcaseProject,
} from "@/components/project-showcase";
import { getPortfolioData } from "@/lib/portfolio-data";

const skills = [
  [
    "Networking",
    "TCP/IP, routing concepts, packet analysis fundamentals",
    Network,
  ],
  ["Linux", "Command-line fundamentals and system navigation", TerminalIcon],
  [
    "Security Monitoring",
    "Log review, alert triage, investigation workflow",
    SearchCheck,
  ],
  [
    "Security Fundamentals",
    "CIA triad, authentication, risk and threat awareness",
    ShieldAlert,
  ],
];

function TerminalIcon({ size = 20 }: { size?: number }) {
  return (
    <span className="font-mono text-lg" style={{ fontSize: size }}>
      ⌁
    </span>
  );
}

const projects = [
  {
    id: "SIM-001",
    title: "Network Traffic Investigation",
    category: "Packet Analysis",
    description:
      "A clearly labelled sample case file demonstrating a structured packet-investigation workflow.",
    icon: Network,
  },
  {
    id: "SIM-002",
    title: "SOC Alert Triage Workflow",
    category: "Detection",
    description:
      "A fictional investigation exercise covering evidence review and analyst recommendations.",
    icon: ShieldAlert,
    isDemo: true,
  },
  {
    id: "SIM-003",
    title: "Security Learning Lab",
    category: "Lab Notes",
    description:
      "A sample editable case file for documenting an isolated, authorized practice environment.",
    icon: FlaskConical,
    isDemo: true,
  },
];

export default function Home() {
  const [portfolio, setPortfolio] = useState<Awaited<
    ReturnType<typeof getPortfolioData>
  > | null>(null);

  useEffect(() => {
    void getPortfolioData()
      .then(setPortfolio)
      .catch(() => setPortfolio(null));
  }, []);

  const liveSkills = portfolio?.skills?.length
    ? portfolio.skills.map(
        (skill: Record<string, unknown>) =>
          [
            String(skill.name),
            String(skill.description || ""),
            String(skill.icon || "Network") === "ShieldAlert"
              ? ShieldAlert
              : String(skill.icon || "Network") === "SearchCheck"
                ? SearchCheck
                : String(skill.icon || "Network") === "Terminal"
                  ? TerminalIcon
                  : Network,
          ] as const,
      )
    : skills;

  const liveProjects: ShowcaseProject[] = portfolio?.projects?.length
    ? portfolio.projects.map((project: Record<string, unknown>) => ({
        id: String(project.slug || project.id),
        title: String(project.title),
        category: String(project.category || "Other"),
        description: String(
          project.short_description || "Published investigation case file.",
        ),
        icon: FolderLock,
        isDemo: Boolean(project.is_demo),
        featured: Boolean(project.featured),
        status: String(project.status || "published"),
        tools: Array.isArray(project.tools)
          ? project.tools.map((tool) => String(tool)).filter(Boolean)
          : [],
        githubUrl: String(project.github_url || "") || undefined,
        liveUrl: String(project.live_url || "") || undefined,
      }))
    : projects.map((project) => ({
        id: project.id,
        title: project.title,
        category: project.category,
        description: project.description,
        icon: project.icon,
        isDemo: Boolean(project.isDemo),
        featured: false,
        status: "Published",
        tools: [],
      }));
  return (
    <main>
      <SiteHeader />
      <Hero profile={portfolio?.profile} links={portfolio?.links} />

      <section className="border-b border-white/[0.06] px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 text-center">
            <p className="font-mono text-xs uppercase tracking-[.18em] text-[#00ff91]">
              // core expertise
            </p>
            <h2 className="mt-4 text-4xl font-semibold">My expertise</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                title: "Defensive operations",
                text: "SOC analysis, log monitoring, threat hunting, and structured incident investigation.",
                Icon: ShieldAlert,
              },
              {
                title: "Network security",
                text: "TCP/IP fundamentals, traffic analysis, network troubleshooting, and packet evidence review.",
                Icon: Network,
              },
              {
                title: "Security foundations",
                text: "Linux, Windows, risk awareness, authentication, and evidence-based security analysis.",
                Icon: SearchCheck,
              },
            ].map(({ title, text, Icon }) => (
              <article
                key={title}
                data-premium-card
                data-tilt
                className="premium-card glass-panel p-7 text-center transition hover:-translate-y-2 hover:border-[#00ff91]/35"
              >
                <Icon size={34} className="mx-auto text-[#00ff91]" />
                <h3 className="mt-5 text-xl font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#9ba8a1]">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div
        className="overflow-hidden border-b border-white/[0.06] bg-[#101915] py-5"
        aria-label="Technical focus"
      >
        <div className="flex min-w-max justify-center gap-10 font-mono text-xs text-[#9ba8a1]">
          <span>PYTHON</span>
          <span className="text-[#00ff91]">LINUX</span>
          <span>WIRESHARK</span>
          <span className="text-[#00ff91]">NETWORKING</span>
          <span>SIEM</span>
          <span className="text-[#00ff91]">NMAP</span>
          <span>PACKET ANALYSIS</span>
        </div>
      </div>

      <section
        id="about"
        className="border-y border-white/[0.06] px-5 py-24 lg:px-8"
      >
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.75fr_1.25fr]">
          <div>
            <p className="font-mono text-xs uppercase tracking-[.18em] text-[#00ff91]">
              // 01 — profile
            </p>
            <h2 className="mt-4 text-4xl font-semibold">About me</h2>
          </div>
          <div className="glass-panel p-7 sm:p-9">
            <p className="text-lg leading-8 text-[#bdc8c2]">
              {String(
                portfolio?.profile?.biography ||
                  "I am a cybersecurity fresher developing foundational knowledge for a SOC Analyst role. My current focus is on understanding networks, security telemetry, alert investigation, and clear documentation.",
              )}
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <div className="border border-white/[0.07] p-4">
                <p className="font-mono text-[10px] uppercase text-[#77847e]">
                  Current objective
                </p>
                <p className="mt-2 text-sm text-[#dfe7e3]">
                  {String(
                    portfolio?.profile?.objective ||
                      "Secure an entry-level cybersecurity opportunity",
                  )}
                </p>
              </div>
              <div className="border border-white/[0.07] p-4">
                <p className="font-mono text-[10px] uppercase text-[#77847e]">
                  Learning focus
                </p>
                <p className="mt-2 text-sm text-[#dfe7e3]">
                  {String(
                    portfolio?.profile?.learning_focus ||
                      "SOC workflows and defensive analysis",
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="skills" className="px-5 py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10">
            <p className="font-mono text-xs uppercase tracking-[.18em] text-[#00ff91]">
              // 02 — arsenal
            </p>
            <h2 className="mt-4 text-4xl font-semibold">
              Skills &amp; foundations
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {liveSkills.map(([title, description, Icon]) => {
              const Component = Icon as React.ElementType;
              return (
                <article
                  key={String(title)}
                  data-premium-card
                  data-tilt
                  className="premium-card glass-panel group p-6 transition hover:-translate-y-1 hover:border-[#00ff91]/30"
                >
                  <Component size={22} className="text-[#00ff91]" />
                  <h3 className="mt-5 font-mono text-sm text-white">
                    {String(title)}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[#9ba8a1]">
                    {String(description)}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section
        id="projects"
        className="border-y border-white/[0.06] px-5 py-24 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[.18em] text-[#00ff91]">
                // 03 — case files
              </p>
              <h2 className="mt-4 text-4xl font-semibold">
                Selected investigations
              </h2>
            </div>
            <span className="hidden font-mono text-[10px] uppercase tracking-widest text-[#77847e] sm:block">
              {portfolio?.projects?.length
                ? `${liveProjects.length} published entries`
                : "3 sample entries"}
            </span>
          </div>
          <ProjectShowcase projects={liveProjects} />
        </div>
      </section>

      <InteractiveTerminal
        profile={portfolio?.profile}
        projects={portfolio?.projects}
        certifications={portfolio?.certifications}
        links={portfolio?.links}
      />

      <section id="writeups" className="px-5 py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="font-mono text-xs uppercase tracking-[.18em] text-[#00ff91]">
            // 04 — journal
          </p>
          <h2 className="mt-4 text-4xl font-semibold">
            Writeups &amp; learning notes
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {portfolio?.writeups?.length ? (
              portfolio.writeups
                .slice(0, 3)
                .map((writeup: Record<string, unknown>) => (
                  <Link
                    key={String(writeup.id)}
                    href={`/writeups/?slug=${encodeURIComponent(String(writeup.slug))}`}
                    className="premium-card glass-panel p-6 transition hover:-translate-y-1 hover:border-[#00ff91]/30"
                  >
                    <BookOpen className="text-[#00ff91]" />
                    <h3 className="mt-5 font-semibold">
                      {String(writeup.title)}
                    </h3>
                    <p className="mt-3 text-sm text-[#9ba8a1]">
                      {String(writeup.summary || "Published learning note.")}
                    </p>
                  </Link>
                ))
            ) : (
              <>
                <div className="glass-panel p-6">
                  <BookOpen className="text-[#00ff91]" />
                  <p className="mt-5 text-sm text-[#9ba8a1]">
                    Lab walkthrough template and CTF notes will appear here.
                  </p>
                </div>
                <div className="glass-panel p-6">
                  <SearchCheck className="text-[#00ff91]" />
                  <p className="mt-5 text-sm text-[#9ba8a1]">
                    Security investigations can be published through the CMS.
                  </p>
                </div>
                <div className="glass-panel p-6">
                  <FileBadge className="text-[#00ff91]" />
                  <p className="mt-5 text-sm text-[#9ba8a1]">
                    Tool tutorials and learning summaries are supported.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <section
        id="certifications"
        className="border-y border-white/[0.06] px-5 py-24 lg:px-8"
      >
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[.7fr_1.3fr]">
          <div>
            <p className="font-mono text-xs uppercase tracking-[.18em] text-[#00ff91]">
              // 05 — credentials
            </p>
            <h2 className="mt-4 text-4xl font-semibold">Certifications</h2>
          </div>
          <div className="glass-panel flex min-h-40 items-center gap-5 p-7">
            <FolderLock className="shrink-0 text-[#00ff91]" />
            <div>
              <p className="font-semibold">No certifications listed yet</p>
              <p className="mt-2 text-sm text-[#9ba8a1]">
                This section displays only credentials you add and verify in the
                admin CMS.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="px-5 py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="glass-panel grid gap-8 p-7 sm:p-10 lg:grid-cols-2">
            <div>
              <p className="font-mono text-xs uppercase tracking-[.18em] text-[#00ff91]">
                // 06 — secure channel
              </p>
              <h2 className="mt-4 text-4xl font-semibold">
                Let&apos;s connect
              </h2>
              <p className="mt-5 max-w-md text-[#9ba8a1]">
                Add your professional contact details and social links through
                the CMS.
              </p>
            </div>
            <div className="grid gap-3">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[0.06] px-5 py-7 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 font-mono text-[10px] uppercase tracking-wider text-[#77847e] sm:flex-row sm:justify-between">
          <span>© 2026 Abhishek</span>
          <span>Cybersecurity portfolio / sample content</span>
        </div>
      </footer>
    </main>
  );
}
