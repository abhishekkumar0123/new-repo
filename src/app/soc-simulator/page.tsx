"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Copy,
  Lightbulb,
  RotateCcw,
  Search,
  ShieldCheck,
  Terminal,
} from "lucide-react";

interface Scenario {
  id: string;
  title: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  time: string;
  source: string;
  destination: string;
  type: string;
  details: string;
  classification:
    | "True Positive"
    | "False Positive"
    | "Needs Further Investigation";
  correctActions: string[];
  dangerousActions: string[];
  evidence: { id: string; label: string; detail: string }[];
  logs: Record<string, string[]>;
  hints: string[];
  explanation: string;
  response: string;
  lessons: string;
}

const scenarios: Scenario[] = [
  {
    id: "ALERT-SIM-1042",
    title: "Repeated authentication failures",
    severity: "High",
    time: "2026-11-20 09:42 UTC",
    source: "198.51.100.42",
    destination: "10.20.3.18",
    type: "Identity / Authentication",
    details:
      "A fictional login source generated repeated failures followed by a successful login against a training account.",
    classification: "True Positive",
    correctActions: ["auth-history", "review-mfa", "correlate-logs"],
    dangerousActions: ["close-false-positive"],
    evidence: [
      {
        id: "failed-login",
        label: "Password failure burst",
        detail: "12 failures occurred between 09:38–09:40 UTC.",
      },
      {
        id: "success-login",
        label: "Successful login",
        detail: "A login succeeded from the same source at 09:41 UTC.",
      },
      {
        id: "mfa-state",
        label: "MFA review",
        detail:
          "The successful session did not trigger MFA challenge telemetry.",
      },
    ],
    logs: {
      Authentication: [
        "09:38:03 AUTH fail user=training-account src=198.51.100.42 result=invalid_password",
        "09:39:44 AUTH fail user=training-account src=198.51.100.42 attempts=8",
        "09:41:02 AUTH success user=training-account src=198.51.100.42 mfa=not_observed",
      ],
      Endpoint: [
        "09:41:05 identity-sign-in workstation=WS-SOC-018 user=training-account",
        "09:42:11 impossible-travel correlated secondary-session=true",
      ],
    },
    hints: [
      "Look for a failure burst followed by success.",
      "Correlate identity and endpoint timestamps.",
      "Successful access after failures is a stronger indicator than failures alone.",
    ],
    explanation:
      "The repeated failures and subsequent success indicate a likely password-based compromise scenario rather than routine noise.",
    response:
      "Validate MFA, review account activity, reset credentials if unauthorized, and escalate the identity incident.",
    lessons:
      "Authentication correlation and post-failure success are key signals in credential abuse investigations.",
  },
  {
    id: "ALERT-SIM-1188",
    title: "Suspicious sender and URL",
    severity: "Critical",
    time: "2026-11-20 11:15 UTC",
    source: "mail-gateway.example",
    destination: "training-user@example.test",
    type: "Email / Phishing",
    details:
      "A simulated message requested urgent action and contained a suspicious credential-verification link.",
    classification: "True Positive",
    correctActions: ["inspect-headers", "review-url", "correlate-logs"],
    dangerousActions: ["close-false-positive"],
    evidence: [
      {
        id: "sender-spf",
        label: "Sender authentication mismatch",
        detail:
          "Header analysis shows an SPF failure and mismatch between display name and source domain.",
      },
      {
        id: "url-risk",
        label: "Suspicious URL",
        detail:
          "The link uses a look-alike domain and redirects to a fictional credential form.",
      },
      {
        id: "urgency",
        label: "Urgency tactic",
        detail:
          "The message claims account suspension unless action occurs within 15 minutes.",
      },
    ],
    logs: {
      "Email Security": [
        "11:13:02 MAIL received from=notify-service.example.test reply-to=secure-review.example.test",
        "11:13:04 HEADER SPF=fail DKIM=fail FROM_MISMATCH=true",
        "11:13:06 URLDEFANG hxxps://secure-review-example.test/login",
        "11:14:01 USER action=open_link simulated_url=true",
      ],
      DNS: [
        "11:14:03 DNS query secure-review-example.test record=A category=new-domain",
      ],
    },
    hints: [
      "Compare the sender, reply-to, and From header.",
      "Inspect authentication results and domain age indicators.",
      "Urgency combined with credential collection is a strong phishing pattern.",
    ],
    explanation:
      "The mismatched sender identity, failed authentication checks, look-alike URL, and urgency language indicate a phishing attempt.",
    response:
      "Quarantine the message, block the fictional domain, and determine whether anyone interacted with the link.",
    lessons:
      "Email analysis should correlate headers, authentication results, URL context, and user interaction.",
  },
  {
    id: "ALERT-SIM-1321",
    title: "Unusual outbound network traffic",
    severity: "Medium",
    time: "2026-11-20 13:08 UTC",
    source: "10.20.8.44",
    destination: "203.0.113.21:8443",
    type: "Network / DNS",
    details:
      "A workstation established repeated encrypted outbound connections to an uncommon destination and port.",
    classification: "Needs Further Investigation",
    correctActions: ["review-dns", "inspect-process", "correlate-logs"],
    dangerousActions: ["isolate-endpoint"],
    evidence: [
      {
        id: "port-pattern",
        label: "Unusual destination port",
        detail:
          "Repeated outbound TLS sessions target TCP 8443 instead of common web ports.",
      },
      {
        id: "process-origin",
        label: "Unknown process",
        detail: "The traffic is initiated by an unsigned training process.",
      },
      {
        id: "dest-reputation",
        label: "Low reputation destination",
        detail:
          "Simulated reputation data marks the destination as newly observed.",
      },
    ],
    logs: {
      Firewall: [
        "13:06:12 ALLOW src=10.20.8.44 dst=203.0.113.21 dpt=8443 bytes=1842",
        "13:07:01 ALLOW src=10.20.8.44 dst=203.0.113.21 dpt=8443 count=18",
      ],
      Endpoint: [
        "13:05:50 PROCESS launch process=training-updater.exe signer=none",
        "13:06:09 PROCESS network-connect pid=4382 dst=203.0.113.21:8443",
      ],
      DNS: [
        "13:05:41 DNS query training-assets.example.test result=203.0.113.21",
      ],
    },
    hints: [
      "Check whether the process and destination are approved.",
      "Correlate DNS resolution with process and firewall telemetry.",
      "One unusual connection pattern may require additional evidence before containment.",
    ],
    explanation:
      "The unusual port, unsigned process, and newly observed destination are suspicious enough to require further correlation, but containment alone is not yet justified.",
    response:
      "Preserve endpoint evidence, validate the process, contact the workstation owner, and isolate if malicious activity is confirmed.",
    lessons:
      "Not every anomaly is confirmed malware. Escalation and correlation should precede disruptive action when evidence remains incomplete.",
  },
  {
    id: "ALERT-SIM-1469",
    title: "Malware detection on endpoint",
    severity: "Critical",
    time: "2026-11-20 14:31 UTC",
    source: "10.20.5.73",
    destination: "N/A",
    type: "Endpoint / Malware",
    details:
      "A simulated endpoint sensor detected a suspicious executable creating a persistence entry and contacting a remote host.",
    classification: "True Positive",
    correctActions: [
      "inspect-endpoint",
      "review-hash",
      "isolate-endpoint",
      "escalate-incident",
    ],
    dangerousActions: ["close-false-positive"],
    evidence: [
      {
        id: "hash-match",
        label: "Malicious hash relationship",
        detail:
          "The executable hash appears in the simulated malware-analysis watchlist.",
      },
      {
        id: "persistence",
        label: "Persistence behavior",
        detail: "The sample created a scheduled-task-style persistence entry.",
      },
      {
        id: "callback",
        label: "External callback",
        detail:
          "The endpoint contacted a newly observed destination shortly after execution.",
      },
    ],
    logs: {
      Endpoint: [
        "14:29:18 PROCESS create process=invoice-sync.exe hash=SIM-FAKE-MD5-001",
        "14:29:20 PERSISTENCE add task=SystemInvoiceSync",
        "14:29:25 NETWORK connect dst=203.0.113.88 dpt=443",
        "14:30:03 SENSOR verdict=malicious watchlist_match=true",
      ],
      Firewall: [
        "14:29:25 ALLOW src=10.20.5.73 dst=203.0.113.88 dpt=443 bytes=4602",
      ],
    },
    hints: [
      "Review the sensor verdict and file relationship.",
      "Persistence and a remote callback together materially increase severity.",
      "Preserve evidence first, then isolate the confirmed compromised endpoint.",
    ],
    explanation:
      "The malicious watchlist relationship, persistence change, and callback behavior identify a credible endpoint compromise.",
    response:
      "Collect evidence, isolate the endpoint in the simulated environment, block indicators, and escalate to incident response.",
    lessons:
      "High-confidence endpoint detections should trigger rapid containment with evidence preservation.",
  },
  {
    id: "ALERT-SIM-1596",
    title: "Unusual account access",
    severity: "High",
    time: "2026-11-20 22:16 UTC",
    source: "10.20.2.119",
    destination: "Identity directory",
    type: "Identity / Insider Risk",
    details:
      "A privileged account accessed confidential training records outside the usual time and role pattern.",
    classification: "Needs Further Investigation",
    correctActions: ["auth-history", "review-privileges", "correlate-logs"],
    dangerousActions: ["isolate-endpoint", "close-false-positive"],
    evidence: [
      {
        id: "unusual-time",
        label: "Unusual access time",
        detail:
          "The activity occurred at 22:16 UTC outside the account's normal schedule.",
      },
      {
        id: "role-mismatch",
        label: "Resource pattern",
        detail:
          "The account accessed records outside its normal operational scope.",
      },
      {
        id: "approved-change",
        label: "Potential business context",
        detail:
          "An approved maintenance window overlaps with the session but requires validation.",
      },
    ],
    logs: {
      Authentication: [
        "22:16:03 LOGIN privileged user=training-admin src=10.20.2.119 mfa=passed",
        "22:18:44 DIRECTORY read resource=confidential-training-batch scope=restricted",
      ],
      Change: ["21:45:00 CHANGE approved=request-SIM-882 maintenance=true"],
    },
    hints: [
      "Check whether an approved change explains the unusual session.",
      "Review the account role and resource scope.",
      "Avoid automatically assuming malicious intent when legitimate context may exist.",
    ],
    explanation:
      "The unusual time and resource access warrant review, but the overlapping maintenance record means a false positive is possible until context is confirmed.",
    response:
      "Validate maintenance authorization, review the privileged session, and escalate only if access lacks a legitimate explanation.",
    lessons:
      "Insider-risk alerts require access patterns, business context, and manager or change-record verification.",
  },
];

const actionOptions = [
  { id: "auth-history", label: "Review authentication history" },
  { id: "review-mfa", label: "Check MFA and session state" },
  { id: "inspect-headers", label: "Inspect email headers" },
  { id: "review-url", label: "Analyze suspicious URL" },
  { id: "review-dns", label: "Review DNS requests" },
  { id: "inspect-process", label: "Inspect process activity" },
  { id: "inspect-endpoint", label: "Examine endpoint activity" },
  { id: "review-hash", label: "Check file/hash reputation" },
  { id: "review-privileges", label: "Review account privileges" },
  { id: "correlate-logs", label: "Correlate timestamps and logs" },
  { id: "isolate-endpoint", label: "Isolate endpoint (simulated)" },
  { id: "escalate-incident", label: "Escalate incident (simulated)" },
  { id: "close-false-positive", label: "Close alert as false positive" },
];

function getDifficultyLogs(
  scenario: Scenario,
  difficulty: "Beginner" | "Intermediate" | "Advanced",
) {
  if (difficulty === "Beginner") {
    const entries = Object.entries(scenario.logs);
    return Object.fromEntries(
      entries.slice(0, 2).map(([source, logs]) => [source, logs.slice(-2)]),
    );
  }
  if (difficulty === "Advanced") {
    return {
      ...scenario.logs,
      "Correlation Context": [
        "CORRELATION benign-maintenance-window context=training-simulated",
        "CORRELATION note=review-before-containment risk_modifier=moderate",
      ],
    };
  }
  return scenario.logs;
}

export default function SocSimulatorPage() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [difficulty, setDifficulty] = useState<
    "Beginner" | "Intermediate" | "Advanced"
  >("Beginner");
  const [statusById, setStatusById] = useState<
    Record<string, "New" | "Investigating" | "Resolved">
  >({});
  const [completedActions, setCompletedActions] = useState<string[]>([]);
  const [classification, setClassification] = useState<string>("");
  const [hintsUsed, setHintsUsed] = useState(0);
  const [feedback, setFeedback] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [copied, setCopied] = useState("");
  const [logFilter, setLogFilter] = useState("All");

  const scenario = scenarios[activeIndex];
  const logs = useMemo(
    () => getDifficultyLogs(scenario, difficulty),
    [scenario, difficulty],
  );
  const status = statusById[scenario.id] || "New";

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("soc-simulator-progress");
      if (saved) {
        const parsed = JSON.parse(saved) as {
          score?: number;
          statusById?: Record<string, "New" | "Investigating" | "Resolved">;
        };
        if (typeof parsed.score === "number") setScore(parsed.score);
        if (parsed.statusById) setStatusById(parsed.statusById);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "soc-simulator-progress",
        JSON.stringify({ score, statusById }),
      );
    } catch {}
  }, [score, statusById]);

  function resetInvestigation(nextIndex = activeIndex) {
    setActiveIndex(nextIndex);
    setCompletedActions([]);
    setClassification("");
    setHintsUsed(0);
    setFeedback([]);
    setAnswered(false);
    setLogFilter("All");
  }

  function selectScenario(index: number) {
    resetInvestigation(index);
  }

  function startInvestigation() {
    setStatusById((current) => ({
      ...current,
      [scenario.id]: "Investigating",
    }));
  }

  function toggleAction(actionId: string) {
    setStatusById((current) => ({
      ...current,
      [scenario.id]: "Investigating",
    }));
    setCompletedActions((current) =>
      current.includes(actionId)
        ? current.filter((item) => item !== actionId)
        : [...current, actionId],
    );
  }

  function submitDecision() {
    if (!classification) {
      setFeedback([
        "Choose a classification before submitting the investigation.",
      ]);
      return;
    }

    let earned = 0;
    const discovered = completedActions.filter((action) =>
      scenario.correctActions.includes(action),
    );
    earned += discovered.length * 12;
    earned +=
      scenario.correctActions.filter((action) =>
        completedActions.includes(action),
      ).length * 6;

    const dangerous = completedActions.filter((action) =>
      scenario.dangerousActions.includes(action),
    );
    earned -= dangerous.length * 15;

    if (completedActions.length === 0) earned -= 5;

    if (classification === scenario.classification) {
      earned += 40;
      if (completedActions.length >= scenario.correctActions.length)
        earned += 15;
    } else {
      earned -= 15;
    }

    earned = Math.max(0, earned);
    setScore((current) => current + earned);
    setStatusById((current) => ({ ...current, [scenario.id]: "Resolved" }));
    setAnswered(true);

    const messages: string[] = [];
    if (classification === scenario.classification) {
      messages.push(`Classification correct: ${scenario.classification}.`);
    } else {
      messages.push(
        `Classification needs review. The correct result is ${scenario.classification}.`,
      );
    }

    const missed = scenario.correctActions.filter(
      (action) => !completedActions.includes(action),
    );
    if (missed.length)
      messages.push(
        `${missed.length} relevant investigation step(s) were not completed.`,
      );
    if (dangerous.length)
      messages.push(
        "A premature or potentially disruptive action reduced the score.",
      );
    messages.push(scenario.explanation);
    setFeedback(messages);
  }

  async function copyLogs() {
    const text = Object.entries(logs)
      .filter(([source]) => logFilter === "All" || source === logFilter)
      .flatMap(([source, entries]) =>
        entries.map((entry) => `[${source}] ${entry}`),
      )
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied("copied");
      window.setTimeout(() => setCopied(""), 1400);
    } catch {
      setCopied("copy unavailable");
    }
  }

  const completedCorrect = scenario.correctActions.filter((action) =>
    completedActions.includes(action),
  ).length;
  const progress = scenario.correctActions.length
    ? Math.round((completedCorrect / scenario.correctActions.length) * 100)
    : 0;
  const accuracy = answered
    ? Math.round(
        (classification === scenario.classification ? 70 : 30) +
          Math.min(30, progress * 0.3),
      )
    : 0;
  const missedEvidence = scenario.evidence.filter((item) => {
    const relatedActions = scenario.correctActions.filter((action) =>
      completedActions.includes(action),
    );
    return (
      relatedActions.length === 0 ||
      !completedActions.some((action) =>
        scenario.correctActions.includes(action),
      )
    );
  });

  return (
    <main className="min-h-screen px-5 pb-20 pt-28 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[.18em] text-[#58d7f7]">
              // fictional blue team environment
            </p>
            <h1 className="mt-3 text-4xl font-semibold">SOC Alert Simulator</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="border border-[#ffb86b]/25 bg-[#ffb86b]/[0.05] px-3 py-2 font-mono text-[10px] uppercase text-[#ffca8a]">
              Simulation only — no real network
            </span>
            <span className="border border-[#58d7f7]/25 px-3 py-2 font-mono text-[10px] text-[#58d7f7]">
              Analyst score: {score}
            </span>
          </div>
        </div>

        <div className="mb-5 grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="flex flex-wrap gap-2">
            {(["Beginner", "Intermediate", "Advanced"] as const).map(
              (level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => {
                    setDifficulty(level);
                    resetInvestigation(activeIndex);
                  }}
                  className={`border px-3 py-2 font-mono text-[10px] uppercase transition ${difficulty === level ? "border-[#58d7f7]/50 bg-[#58d7f7]/[0.07] text-[#58d7f7]" : "border-white/[0.07] text-[#77847e]"}`}
                >
                  {level}
                </button>
              ),
            )}
          </div>
          <div className="flex items-center gap-3 border border-white/[0.07] px-3 py-2 font-mono text-[10px] text-[#77847e]">
            <span className="size-1.5 animate-pulse rounded-full bg-[#00ff91]" />
            Analyst online
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
          <aside
            className="premium-card glass-panel h-fit space-y-2 p-3"
            aria-label="Alert queue"
          >
            <div className="flex items-center justify-between px-2 pb-2 pt-1">
              <p className="font-mono text-[10px] uppercase text-[#77847e]">
                Alert queue
              </p>
              <span className="font-mono text-[9px] text-[#58d7f7]">
                {scenarios.length} alerts
              </span>
            </div>
            {scenarios.map((item, index) => {
              const itemStatus = statusById[item.id] || "New";
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectScenario(index)}
                  className={`w-full border p-4 text-left transition ${activeIndex === index ? "border-[#58d7f7]/40 bg-[#58d7f7]/[0.06]" : "border-white/[0.07] bg-black/10 hover:border-[#58d7f7]/20"}`}
                >
                  <div className="flex justify-between gap-3 font-mono text-[9px]">
                    <span className="text-[#77847e]">{item.id}</span>
                    <span
                      className={
                        item.severity === "Critical" || item.severity === "High"
                          ? "text-[#ff7b72]"
                          : "text-[#ffca8a]"
                      }
                    >
                      {item.severity}
                    </span>
                  </div>
                  <p className="mt-3 text-sm">{item.title}</p>
                  <div className="mt-3 flex items-center justify-between font-mono text-[9px] text-[#77847e]">
                    <span>{item.time}</span>
                    <span
                      className={
                        itemStatus === "Resolved"
                          ? "text-[#00ff91]"
                          : "text-[#58d7f7]"
                      }
                    >
                      {itemStatus}
                    </span>
                  </div>
                </button>
              );
            })}
          </aside>

          <article className="premium-card glass-panel p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.07] pb-5">
              <div>
                <p className="font-mono text-[10px] text-[#77847e]">
                  {scenario.id} / {scenario.time}
                </p>
                <h2 className="mt-2 text-xl font-semibold">{scenario.title}</h2>
                <p className="mt-2 font-mono text-[9px] uppercase text-[#77847e]">
                  {scenario.type}
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-2 border px-3 py-2 font-mono text-[10px] ${scenario.severity === "Critical" || scenario.severity === "High" ? "border-[#ff7b72]/25 text-[#ff7b72]" : "border-[#ffca8a]/25 text-[#ffca8a]"}`}
              >
                <AlertTriangle size={13} /> {scenario.severity}
              </span>
            </div>

            <div className="grid gap-3 py-5 sm:grid-cols-3">
              {[
                ["SOURCE", scenario.source],
                ["TARGET", scenario.destination],
                ["STATUS", status],
              ].map(([label, value]) => (
                <div key={label} className="border border-white/[0.07] p-4">
                  <p className="font-mono text-[9px] text-[#77847e]">{label}</p>
                  <p
                    className={`mt-2 font-mono text-xs ${label === "STATUS" ? "text-[#58d7f7]" : "text-[#dfe7e3]"}`}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <p className="text-sm leading-7 text-[#bdc8c2]">
              {scenario.details}
            </p>

            {status === "New" ? (
              <button
                type="button"
                onClick={startInvestigation}
                className="mt-5 inline-flex h-11 items-center gap-2 bg-[#58d7f7] px-4 font-mono text-[10px] font-bold uppercase text-[#061016]"
              >
                <Search size={14} /> Start investigation
              </button>
            ) : (
              <>
                <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="flex items-center gap-2 font-mono text-xs uppercase text-[#58d7f7]">
                        <Terminal size={14} /> Simulated logs
                      </h3>
                      <button
                        type="button"
                        onClick={() => void copyLogs()}
                        className="flex items-center gap-1.5 font-mono text-[9px] uppercase text-[#77847e] hover:text-[#58d7f7]"
                      >
                        <Copy size={12} /> {copied || "Copy"}
                      </button>
                    </div>
                    <div className="mb-3 flex flex-wrap gap-2">
                      {["All", ...Object.keys(logs)].map((source) => (
                        <button
                          key={source}
                          type="button"
                          onClick={() => setLogFilter(source)}
                          className={`border px-2 py-1 font-mono text-[9px] ${logFilter === source ? "border-[#58d7f7]/40 text-[#58d7f7]" : "border-white/[0.07] text-[#77847e]"}`}
                        >
                          {source}
                        </button>
                      ))}
                    </div>
                    <div className="max-h-72 overflow-auto border border-white/[0.07] bg-black/20 p-3 font-mono text-[10px] leading-6">
                      {Object.entries(logs).map(([source, entries]) =>
                        logFilter !== "All" && source !== logFilter ? null : (
                          <div key={source} className="mb-3">
                            <p className="mb-1 text-[#58d7f7]">[{source}]</p>
                            {entries.map((entry) => (
                              <p
                                key={entry}
                                className="border-l border-[#58d7f7]/20 pl-2 text-[#bdc8c2]"
                              >
                                {entry}
                              </p>
                            ))}
                          </div>
                        ),
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-3 flex items-center gap-2 font-mono text-xs uppercase text-[#58d7f7]">
                      <Activity size={14} /> Investigation
                    </h3>
                    <div className="space-y-2">
                      {actionOptions.map((action) => (
                        <button
                          key={action.id}
                          type="button"
                          onClick={() => toggleAction(action.id)}
                          className={`flex w-full items-center justify-between border px-3 py-2 text-left text-xs transition ${completedActions.includes(action.id) ? "border-[#58d7f7]/35 bg-[#58d7f7]/[0.06] text-[#58d7f7]" : "border-white/[0.07] text-[#bdc8c2] hover:border-[#58d7f7]/20"}`}
                        >
                          <span>{action.label}</span>
                          {completedActions.includes(action.id) && (
                            <CheckCircle2 size={14} />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_280px]">
                  <div>
                    <h3 className="font-mono text-xs uppercase text-[#58d7f7]">
                      Evidence checklist
                    </h3>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {scenario.evidence.map((item) => {
                        const discovered = completedActions.some((action) =>
                          scenario.correctActions.includes(action),
                        );
                        return (
                          <details
                            key={item.id}
                            className="border border-white/[0.07] p-3"
                          >
                            <summary className="cursor-pointer font-mono text-[10px] text-[#dfe7e3]">
                              {item.label}
                            </summary>
                            <p className="mt-2 text-xs leading-5 text-[#77847e]">
                              {discovered
                                ? item.detail
                                : "Complete relevant investigation steps to reveal this evidence."}
                            </p>
                          </details>
                        );
                      })}
                    </div>

                    {difficulty !== "Advanced" && (
                      <button
                        type="button"
                        onClick={() =>
                          setHintsUsed((current) =>
                            Math.min(scenario.hints.length, current + 1),
                          )
                        }
                        className="mt-4 flex items-center gap-2 font-mono text-[10px] uppercase text-[#ffca8a]"
                      >
                        <Lightbulb size={13} /> Reveal hint ({hintsUsed}/
                        {scenario.hints.length})
                      </button>
                    )}
                    {hintsUsed > 0 && (
                      <div className="mt-3 border-l border-[#ffca8a]/35 pl-3 text-xs leading-6 text-[#bdc8c2]">
                        {scenario.hints.slice(0, hintsUsed).map((hint) => (
                          <p key={hint}>{hint}</p>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border border-white/[0.07] p-4">
                    <p className="font-mono text-[9px] uppercase text-[#77847e]">
                      Investigation progress
                    </p>
                    <div className="mt-3 h-1.5 overflow-hidden bg-white/[0.06]">
                      <div
                        className="h-full bg-[#58d7f7] transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="mt-2 font-mono text-[10px] text-[#58d7f7]">
                      {progress}% of relevant steps
                    </p>
                  </div>
                </div>

                <div className="mt-6 border-t border-white/[0.07] pt-5">
                  <p className="mb-3 font-mono text-[10px] uppercase text-[#77847e]">
                    Classification
                  </p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {[
                      "True Positive",
                      "False Positive",
                      "Needs Further Investigation",
                    ].map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setClassification(option)}
                        className={`border px-3 py-3 text-xs transition ${classification === option ? "border-[#58d7f7]/50 bg-[#58d7f7]/[0.07] text-[#58d7f7]" : "border-white/[0.07] text-[#bdc8c2]"}`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={submitDecision}
                      className="inline-flex h-11 items-center gap-2 bg-[#58d7f7] px-4 font-mono text-[10px] font-bold uppercase text-[#061016]"
                    >
                      <CheckCircle2 size={14} /> Submit decision
                    </button>
                    <button
                      type="button"
                      onClick={() => resetInvestigation(activeIndex)}
                      className="inline-flex h-11 items-center gap-2 border border-white/[0.08] px-4 font-mono text-[10px] uppercase text-[#77847e]"
                    >
                      <RotateCcw size={13} /> Reset scenario
                    </button>
                  </div>
                </div>

                {feedback.length > 0 && (
                  <div className="mt-6 border border-[#58d7f7]/20 bg-[#58d7f7]/[0.035] p-5">
                    <h3 className="mb-3 font-mono text-xs uppercase text-[#58d7f7]">
                      Investigation feedback
                    </h3>
                    <div className="space-y-2 text-xs leading-6 text-[#bdc8c2]">
                      {feedback.map((message) => (
                        <p key={message}>{message}</p>
                      ))}
                    </div>
                  </div>
                )}

                {answered && (
                  <div className="mt-6 border border-[#00ff91]/20 bg-[#00ff91]/[0.035] p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="font-mono text-xs uppercase text-[#00ff91]">
                        Incident report
                      </h3>
                      <span className="font-mono text-[10px] text-[#58d7f7]">
                        Accuracy: {accuracy}%
                      </span>
                    </div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="font-mono text-[9px] text-[#77847e]">
                          ANALYST CLASSIFICATION
                        </p>
                        <p className="mt-2 text-sm">{classification}</p>
                      </div>
                      <div>
                        <p className="font-mono text-[9px] text-[#77847e]">
                          CORRECT CLASSIFICATION
                        </p>
                        <p className="mt-2 text-sm">
                          {scenario.classification}
                        </p>
                      </div>
                      <div>
                        <p className="font-mono text-[9px] text-[#77847e]">
                          EVIDENCE DISCOVERED
                        </p>
                        <p className="mt-2 text-sm">
                          {completedCorrect} relevant step(s)
                        </p>
                      </div>
                      <div>
                        <p className="font-mono text-[9px] text-[#77847e]">
                          MISSED EVIDENCE
                        </p>
                        <p className="mt-2 text-sm">
                          {missedEvidence.length
                            ? `${missedEvidence.length} item(s)`
                            : "None"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-5 space-y-4 text-sm leading-7 text-[#bdc8c2]">
                      <p>
                        <strong className="text-[#dfe7e3]">
                          Recommended response:
                        </strong>{" "}
                        {scenario.response}
                      </p>
                      <p>
                        <strong className="text-[#dfe7e3]">
                          Lesson learned:
                        </strong>{" "}
                        {scenario.lessons}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        resetInvestigation((activeIndex + 1) % scenarios.length)
                      }
                      className="mt-5 inline-flex items-center gap-2 font-mono text-[10px] uppercase text-[#58d7f7]"
                    >
                      Next scenario <ChevronRight size={13} />
                    </button>
                  </div>
                )}
              </>
            )}
          </article>
        </div>

        <div className="mt-5 border border-white/[0.07] px-4 py-3 font-mono text-[9px] text-[#77847e]">
          <ShieldCheck className="mr-2 inline text-[#58d7f7]" size={12} />
          All alerts, identities, domains, indicators, and actions are fictional
          and client-side only.
        </div>

        <button
          type="button"
          onClick={() => {
            setScore(0);
            setStatusById({});
            resetInvestigation(0);
          }}
          className="inline-flex items-center gap-1.5 border border-white/[0.08] px-3 py-2 font-mono text-[10px] uppercase text-[#77847e] transition hover:border-[#58d7f7]/30 hover:text-[#58d7f7]"
        >
          <RotateCcw size={12} /> Reset lab
        </button>
      </div>
    </main>
  );
}
