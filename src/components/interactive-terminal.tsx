"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";

interface TerminalProps {
  profile?: Record<string, unknown> | null;
  projects?: Record<string, unknown>[];
  certifications?: Record<string, unknown>[];
  links?: Record<string, unknown>[];
}

interface TerminalLine {
  text: string;
  tone?: "prompt" | "muted" | "success" | "error";
}

const availableCommands = [
  "help",
  "about",
  "whoami",
  "skills",
  "projects",
  "certifications",
  "contact",
  "resume",
  "clear",
  "history",
  "date",
  "pwd",
  "ls",
  "banner",
  "sudo",
];

export function InteractiveTerminal({
  profile,
  projects = [],
  certifications = [],
  links = [],
}: TerminalProps) {
  const [lines, setLines] = useState<TerminalLine[]>([
    {
      text: "Welcome to abhishek.security — safe simulation mode",
      tone: "success",
    },
    { text: "Type 'help' to list commands.", tone: "muted" },
  ]);
  const [command, setCommand] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [copied, setCopied] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    outputRef.current?.scrollTo({
      top: outputRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [lines]);

  const name = String(profile?.name || "Abhishek");
  const title = String(profile?.title || "Cybersecurity Fresher");
  const introduction = String(
    profile?.introduction ||
      "Building practical skills in security monitoring, incident investigation, networking, and defensive analysis.",
  );
  const resumeUrl = String(profile?.resume_url || "");

  function execute(rawCommand: string) {
    const trimmed = rawCommand.trim();
    if (!trimmed) return;

    const parts = trimmed.split(/\s+/);
    const action = parts[0].toLowerCase();

    setHistory((current) => [...current, trimmed]);
    setHistoryIndex(-1);

    if (action === "clear") {
      setLines([]);
      return;
    }

    const next: TerminalLine[] = [
      { text: `visitor@portfolio:~$ ${trimmed}`, tone: "prompt" },
    ];

    switch (action) {
      case "help":
        next.push(
          { text: "Available commands:", tone: "success" },
          { text: availableCommands.join("  "), tone: "muted" },
        );
        break;
      case "about":
        next.push({ text: introduction });
        break;
      case "whoami":
        next.push({ text: `${name} — ${title}`, tone: "success" });
        break;
      case "skills":
        next.push(
          { text: "Core focus:", tone: "success" },
          {
            text: "Networking • Linux • Security Monitoring • Packet Analysis • SOC Workflows",
            tone: "muted",
          },
        );
        break;
      case "projects":
        if (projects.length) {
          projects.slice(0, 6).forEach((project) => {
            next.push({
              text: `- ${String(project.title)} [${String(project.category || "Case file")}]`,
            });
          });
        } else {
          next.push({
            text: "No published projects are currently configured.",
            tone: "muted",
          });
        }
        break;
      case "certifications":
        if (certifications.length) {
          certifications.forEach((item) => {
            next.push({
              text: `- ${String(item.name)} — ${String(item.issuer || "Issuer not configured")}`,
            });
          });
        } else {
          next.push({
            text: "No verified certifications are currently listed.",
            tone: "muted",
          });
        }
        break;
      case "contact":
        if (links.length) {
          links.forEach((link) => {
            next.push({
              text: `${String(link.platform || "Link")}: ${String(link.url || "")}`,
              tone: "muted",
            });
          });
        } else {
          next.push({
            text: "Use the Contact section to reach me. No social links are currently configured.",
            tone: "muted",
          });
        }
        break;
      case "resume":
        next.push(
          resumeUrl
            ? { text: `Resume link: ${resumeUrl}`, tone: "success" }
            : {
                text: "No resume link is configured in the CMS.",
                tone: "muted",
              },
        );
        break;
      case "history":
        if (history.length) {
          history.forEach((item, index) =>
            next.push({ text: `${index + 1}  ${item}`, tone: "muted" }),
          );
        } else {
          next.push({ text: "History is empty.", tone: "muted" });
        }
        break;
      case "date":
        next.push({ text: new Date().toString(), tone: "muted" });
        break;
      case "pwd":
        next.push({ text: "/home/visitor/portfolio", tone: "muted" });
        break;
      case "ls":
        next.push({
          text: "about.txt  skills/  projects/  certifications/  contact.txt  resume",
          tone: "muted",
        });
        break;
      case "banner":
        next.push(
          { text: "  ╔══════════════════════════════════╗", tone: "success" },
          { text: "  ║  ABHISHEK // SECURITY CONSOLE    ║", tone: "success" },
          { text: "  ╚══════════════════════════════════╝", tone: "success" },
        );
        break;
      case "sudo":
        next.push({
          text: "Nice try. This simulated terminal has no privilege escalation.",
          tone: "success",
        });
        break;
      case "matrix":
        next.push(
          { text: "Initializing matrix cascade...", tone: "success" },
          { text: "01001000 01101001 01100100 01101000 01100100 01100101 01101110", tone: "muted" },
          { text: "Hidden layer accessed. No decryption key required.", tone: "muted" },
          { text: "Press Ctrl+C (or type 'clear') to return.", tone: "muted" },
        );
        break;
      case "secret":
        next.push(
          { text: "Accessing restricted memory sector...", tone: "success" },
          { text: "SECRET://CYBER-PORTFOLIO//HIDDEN-NOTE.TXT", tone: "muted" },
          { text: "Content: All data shown here is simulated for demonstration.", tone: "muted" },
          { text: "No real credentials, keys, or personal data are stored in this terminal.", tone: "muted" },
        );
        break;
      case "decrypt":
        next.push(
          { text: "Running simulated decryption routine...", tone: "success" },
          { text: "Key derivation: simulated", tone: "muted" },
          { text: "Ciphertext: none provided.", tone: "muted" },
          { text: "Plaintext: decryption requires real input. This is a visual simulation only.", tone: "muted" },
        );
        break;
      case "easteregg":
        next.push(
          { text: "You found the hidden command registry.", tone: "success" },
          { text: "Available hidden commands: matrix, secret, decrypt, easteregg, 42, whoami --secret", tone: "muted" },
          { text: "Try the Konami code (↑↑↓↓←→←→BA) for a full-screen reveal.", tone: "muted" },
        );
        break;
      case "42":
        next.push(
          { text: "Querying the answer database...", tone: "success" },
          { text: "Result: 42", tone: "muted" },
          { text: "Question: unknown (simulated).", tone: "muted" },
        );
        break;
      case "whoami":
        if (parts.includes("--secret")) {
          next.push({
            text: "visitor@portfolio:~$ whoami --secret",
            tone: "prompt",
          });
          next.push({
            text: "You are a visitor exploring a cybersecurity learning portfolio.",
            tone: "success",
          });
          next.push({
            text: "No elevated identity. No hidden privileges. Just curiosity.",
            tone: "muted",
          });
        } else {
          next.push({ text: `${name} — ${title}`, tone: "success" });
        }
        break;
      default:
        next.push({ text: `command not found: ${action}`, tone: "error" });
    }

    setLines((current) => [...current, ...next]);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    execute(command);
    setCommand("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!history.length) return;
      const nextIndex =
        historyIndex === -1
          ? history.length - 1
          : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setCommand(history[nextIndex]);
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (historyIndex === -1) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= history.length) {
        setHistoryIndex(-1);
        setCommand("");
      } else {
        setHistoryIndex(nextIndex);
        setCommand(history[nextIndex]);
      }
    }
  }

  async function copyOutput() {
    const text = lines.map((line) => line.text).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section id="terminal" className="px-5 pb-24 lg:px-8">
      <div className="glass-panel mx-auto max-w-7xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5" aria-hidden="true">
              <span className="size-2.5 rounded-full bg-[#ff5f57]" />
              <span className="size-2.5 rounded-full bg-[#febc2e]" />
              <span className="size-2.5 rounded-full bg-[#28c840]" />
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[.16em] text-[#77847e]">
              interactive / safe shell
            </span>
          </div>
          <button
            type="button"
            onClick={() => void copyOutput()}
            className="font-mono text-[10px] uppercase text-[#77847e] transition hover:text-[#58d7f7]"
            aria-label="Copy terminal output"
          >
            {copied ? "copied" : "copy output"}
          </button>
        </div>

        <div
          ref={outputRef}
          className="h-72 overflow-y-auto p-5 sm:h-80 sm:p-7"
          role="log"
          aria-live="polite"
          aria-label="Terminal output"
        >
          <div className="space-y-1.5 font-mono text-xs leading-6 text-[#bdc8c2]">
            {lines.map((line, index) => (
              <div
                key={`${line.text}-${index}`}
                className={
                  line.tone === "prompt"
                    ? "text-[#58d7f7]"
                    : line.tone === "muted"
                      ? "text-[#77847e]"
                      : line.tone === "success"
                        ? "text-[#00ff91]"
                        : line.tone === "error"
                          ? "text-[#ff7b72]"
                          : ""
                }
              >
                {line.text}
              </div>
            ))}
          </div>

          <form
            onSubmit={submit}
            className="mt-2 flex items-center gap-2 font-mono text-xs"
          >
            <label
              htmlFor="terminal-command"
              className="shrink-0 text-[#58d7f7]"
            >
              visitor@portfolio:~$
            </label>
            <input
              ref={inputRef}
              id="terminal-command"
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              spellCheck={false}
              className="min-w-0 flex-1 border-0 bg-transparent text-[#f2f7f4] caret-[#58d7f7] outline-none"
              placeholder="type a command"
              onFocus={() =>
                inputRef.current?.scrollIntoView({ block: "nearest" })
              }
            />
          </form>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-white/[0.07] px-5 py-3">
          {["help", "whoami", "skills", "projects", "banner", "clear"].map(
            (suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => {
                  setCommand(suggestion);
                  inputRef.current?.focus({ preventScroll: true });
                }}
                className="border border-white/[0.07] px-2.5 py-1.5 font-mono text-[9px] uppercase text-[#77847e] transition hover:border-[#58d7f7]/35 hover:text-[#58d7f7]"
              >
                {suggestion}
              </button>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
