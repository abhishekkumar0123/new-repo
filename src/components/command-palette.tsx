"use client";

import * as React from "react";
import { Search, X, ArrowUp, ArrowDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  icon?: React.ReactNode;
}

const COMMANDS: CommandItem[] = [
  {
    id: "home",
    title: "Home",
    subtitle: "Return to the portfolio homepage",
    href: "/",
    icon: <span className="text-[#58d7f7]">◆</span>,
  },
  {
    id: "about",
    title: "About",
    subtitle: "Profile, background, and professional focus",
    href: "#about",
  },
  {
    id: "skills",
    title: "Skills & Foundations",
    subtitle: "Technical skills, tools, and learning areas",
    href: "#skills",
  },
  {
    id: "projects",
    title: "Investigations",
    subtitle: "Selected security case files and projects",
    href: "#projects",
  },
  {
    id: "writeups",
    title: "Writeups & Notes",
    subtitle: "Lab walkthroughs and learning summaries",
    href: "#writeups",
  },
  {
    id: "certifications",
    title: "Certifications & Credentials",
    subtitle: "Learning achievements and certifications",
    href: "#certifications",
  },
  {
    id: "timeline",
    title: "Timeline",
    subtitle: "Professional journey and milestones",
    href: "#timeline",
  },
  {
    id: "contact",
    title: "Contact",
    subtitle: "Get in touch for opportunities",
    href: "#contact",
  },
  {
    id: "cve-explorer",
    title: "CVE Explorer",
    subtitle: "Vulnerability intelligence and CVE records",
    href: "/vulnerabilities",
  },
  {
    id: "kev-intelligence",
    title: "KEV Intelligence Center",
    subtitle: "Known exploited vulnerabilities catalog",
    href: "/kev",
  },
  {
    id: "threat-intelligence",
    title: "Threat Intelligence Center",
    subtitle: "IOCs, threat feeds, and security intelligence",
    href: "/threat-intelligence",
  },
  {
    id: "network-topology",
    title: "Network Topology Explorer",
    subtitle: "Simulated network environment and topology",
    href: "/network-topology",
  },
  {
    id: "soc-simulator",
    title: "SOC Alert Simulator",
    subtitle: "Blue team alert investigation scenarios",
    href: "/soc-simulator",
  },
  {
    id: "cyber-intelligence",
    title: "CVE Intelligence Entry",
    subtitle: "CVE, KEV, and EPSS intelligence overview",
    href: "/cyber-intelligence",
  },
];

const typeSpeed = 30;

export function CommandPalette() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const filtered = React.useMemo(() => {
    if (!query.trim()) return COMMANDS;
    const q = query.toLowerCase();
    return COMMANDS.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.subtitle.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q),
    );
  }, [query]);

  React.useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = (href: string) => {
    setIsOpen(false);
    setQuery("");
    window.location.href = href;
  };

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (!isOpen) {
        if ((event.ctrlKey || event.metaKey) && event.key === "k") {
          event.preventDefault();
          setIsOpen(true);
          setQuery("");
          setSelectedIndex(0);
          window.requestAnimationFrame(() => {
            inputRef.current?.focus();
          });
        }
        return;
      }

      if (event.key === "Escape") {
        setIsOpen(false);
        setQuery("");
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        const item = filtered[selectedIndex];
        if (item) handleSelect(item.href);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filtered.length);
        return;
      }
    },
    [isOpen, filtered, selectedIndex, handleSelect],
  );

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center pointer-events-none"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div
        className={cn(
          "fixed inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto z-[75]",
          isOpen ? "opacity-100 transition-opacity duration-300" : "opacity-0 pointer-events-none",
        )}
        onClick={() => {
          setIsOpen(false);
          setQuery("");
        }}
      />
      {isOpen && (
        <div
          className={cn(
            "relative w-full max-w-md mx-auto p-6 pointer-events-auto z-[80] glass-panel rounded-xl border border-white/[0.08] shadow-[0_24px_64px_rgba(0,0,0,0.40)]",
            isOpen ? "animate-in zoom-in duration-300" : "opacity-0",
          )}
        >
          <div className="flex items-center justify-between mb-5">
            <p className="font-mono text-[9px] uppercase tracking-[.18em] text-[#58d7f7]">
              // command palette
            </p>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setQuery("");
              }}
              className="rounded-md p-2 text-[#77847e] hover:text-white hover:bg-white/[0.05] transition-colors"
              aria-label="Close command palette"
            >
              <X size={16} />
            </button>
          </div>
          <div className="relative mb-6">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#77847e]"
              size={16}
            />
            <input
              ref={inputRef}
              type="text"
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search commands or type a route..."
              className="h-11 w-full rounded-md border border-white/[0.08] bg-[#070b10]/80 pl-10 pr-4 font-mono text-sm text-[#dfe7e3] outline-none transition focus:border-[#58d7f7]/40"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-4 text-center">
                <p className="font-mono text-[9px] text-[#77847e]">
                  No matching commands
                </p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {filtered.map((command, index) => {
                  const isSelected = index === selectedIndex;
                  return (
                    <button
                      key={command.id}
                      type="button"
                      onClick={() => handleSelect(command.href)}
                      className={cn(
                        "flex items-center justify-between gap-3 px-4 py-3 rounded-md text-left transition-all",
                        isSelected
                          ? "bg-[#58d7f7]/[0.10] border border-[#58d7f7]/20 text-[#58d7f7]"
                          : "text-[#bdc8c2] hover:bg-white/[0.03] hover:border-white/[0.05] hover:border",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {command.icon ?? <span className="text-[#77847e]">›</span>}
                        <div>
                          <p className="font-mono text-xs font-semibold leading-none">
                            {command.title}
                          </p>
                          <p className="font-mono text-[8px] text-[#77847e] leading-none">
                            {command.subtitle}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono text-[8px] text-[#77847e]">
                        {command.href.startsWith("#") ? "Section" : "Route"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="mt-5 pt-4 border-t border-white/[0.05] flex items-center justify-between text-[9px] uppercase text-[#77847e]">
            <span>
              <span className="text-[#58d7f7]">⌘</span> + <span>K</span> Open
            </span>
            <span className="flex items-center gap-1">
              <span>↑↓</span> Navigate <span>Enter</span> Select
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
