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
import { SkillsExplorer } from "@/components/skills-explorer";
import { CertificationsTracker } from "@/components/certifications-tracker";
import { AboutSection } from "@/components/about-section";
import { CareerTimeline } from "@/components/career-timeline";
import { ContactSection } from "@/components/contact-section";
import { FooterSection } from "@/components/footer-section";
import { CyberIntelHomeDashboard } from "@/components/cyber-intel/cyber-intel-home-dashboard";
import { ThreatIntelHomePreview } from "@/components/cyber-intel/threat-intel-home-preview";
import { DomainIntelHomePreview } from "@/components/cyber-intel/domain-intel-home-preview";
import { UrlAnalyzerHomePreview } from "@/components/cyber-intel/url-analyzer-home-preview";
import { HashLookupHomePreview } from "@/components/cyber-intel/hash-lookup-home-preview";
import { IOCEnrichmentHomePreview } from "@/components/cyber-intel/ioc-enrichment-home-preview";
import { CertificateInspectorHomePreview } from "@/components/cyber-intel/certificate-inspector-home-preview";

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

      <AboutSection profile={portfolio?.profile} />

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
          <SkillsExplorer
            categories={portfolio?.categories || []}
            skills={portfolio?.skills || []}
            projects={portfolio?.projects || []}
          />
        </div>
      </section>

      <section id="projects" className="border-y border-white/[0.06] px-5 py-24 lg:px-8">
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

      <CyberIntelHomeDashboard />

      <ThreatIntelHomePreview />

      <DomainIntelHomePreview />

      <UrlAnalyzerHomePreview />

      <HashLookupHomePreview />

      <IOCEnrichmentHomePreview />

      <CertificateInspectorHomePreview />

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
        <div className="mx-auto max-w-7xl">
          <div className="mb-10">
            <p className="font-mono text-xs uppercase tracking-[.18em] text-[#58d7f7]">
              // 05 — credentials
            </p>
            <h2 className="mt-4 text-4xl font-semibold">
              Certifications &amp; learning
            </h2>
          </div>
          <CertificationsTracker
            certifications={portfolio?.certifications || []}
            learning={portfolio?.learning || []}
            projects={portfolio?.projects || []}
          />
        </div>
      </section>

      <CareerTimeline
        timeline={portfolio?.timeline || []}
        projects={portfolio?.projects || []}
        certifications={portfolio?.certifications || []}
        skills={portfolio?.skills || []}
      />

      <ContactSection
        profile={portfolio?.profile}
        links={portfolio?.links || []}
        settings={portfolio?.settings}
      />

      <FooterSection
        links={portfolio?.links || []}
        settings={portfolio?.settings}
        profile={portfolio?.profile}
      />
    </main>
  );
}
