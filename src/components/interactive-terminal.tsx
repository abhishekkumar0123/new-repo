"use client";

import { FormEvent, useState } from "react";

const responses: Record<string, string[]> = {
  help: [
    "Available commands:",
    "whoami  about  skills  projects  contact  clear",
  ],
  whoami: ["visitor@portfolio:~$ Abhishek — cybersecurity fresher"],
  about: ["Current focus: SOC workflows, networking, and defensive analysis."],
  skills: [
    "Networking, Linux, Windows fundamentals, security monitoring, packet analysis.",
  ],
  projects: ["Open /projects to explore fictional and practical case files."],
  contact: [
    "Use the Contact section to send a message or add social links in the CMS.",
  ],
};

export function InteractiveTerminal() {
  const [lines, setLines] = useState<string[]>([
    "Welcome to abhishek.security",
    "Type 'help' to list commands.",
  ]);
  const [command, setCommand] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = command.trim().toLowerCase();
    if (!value) return;
    if (value === "clear") setLines([]);
    else
      setLines((current) => [
        ...current,
        `visitor@portfolio:~$ ${command}`,
        ...(responses[value] ?? [`command not found: ${command}`]),
      ]);
    setCommand("");
  }

  return (
    <section id="terminal" className="px-5 pb-24 lg:px-8">
      <div className="glass-panel mx-auto max-w-7xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3">
          <span className="font-mono text-[10px] uppercase tracking-[.16em] text-[#77847e]">
            interactive / safe shell
          </span>
          <span className="font-mono text-[10px] text-[#00ff91]">
            sandboxed
          </span>
        </div>
        <div className="min-h-72 p-5 sm:p-7">
          <div
            className="mb-5 space-y-1 font-mono text-xs text-[#bdc8c2]"
            aria-live="polite"
          >
            {lines.map((line, index) => (
              <div
                key={`${line}-${index}`}
                className={line.includes("not found") ? "text-[#ff7b72]" : ""}
              >
                {line}
              </div>
            ))}
          </div>
          <form
            onSubmit={submit}
            className="flex items-center gap-2 font-mono text-xs"
          >
            <label htmlFor="terminal-command" className="text-[#00ff91]">
              visitor@portfolio:~$
            </label>
            <input
              id="terminal-command"
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="min-w-0 flex-1 border-0 bg-transparent text-[#f2f7f4] outline-none"
              placeholder="type a command"
            />
          </form>
        </div>
      </div>
    </section>
  );
}
