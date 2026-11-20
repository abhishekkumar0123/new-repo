"use client";

import { useState } from "react";
import { AlertTriangle, ChevronRight, ShieldCheck } from "lucide-react";

const alerts = [
  {
    id: "ALERT-SIM-1042",
    severity: "High",
    time: "2026-11-20 09:42",
    source: "198.51.100.42",
    destination: "10.20.3.18",
    type: "Repeated authentication failures",
    details:
      "A fictional login source generated multiple failures followed by one successful login.",
    evidence: [
      "09:38 — 12 failed logins for user training-account",
      "09:41 — successful login from the same source",
      "09:42 — impossible-travel rule matched a secondary session",
    ],
    steps: [
      "Validate whether the source is expected",
      "Review account activity and MFA state",
      "Correlate endpoint and identity logs",
      "Escalate if unauthorized access is confirmed",
    ],
    action:
      "Disable the account temporarily and notify the identity/security team.",
    conclusion:
      "Simulated brute-force pattern with possible credential misuse. This data is fictional and does not represent a real network.",
  },
  {
    id: "ALERT-SIM-1188",
    severity: "Medium",
    time: "2026-11-20 11:15",
    source: "203.0.113.77",
    destination: "10.20.8.4",
    type: "Suspicious outbound DNS",
    details:
      "A workstation generated repeated short-lived DNS queries to newly observed domains.",
    evidence: [
      "11:12 — 46 DNS queries in 60 seconds",
      "All destinations use low-reputation fictional domains",
      "No approved automation is associated",
    ],
    steps: [
      "Confirm the workstation owner",
      "Inspect process and network telemetry",
      "Isolate only if compromise indicators are strong",
    ],
    action: "Collect DNS and endpoint evidence before containment.",
    conclusion:
      "The alert requires analyst validation and should not be automatically classified as malware.",
  },
];

export default function SocSimulatorPage() {
  const [active, setActive] = useState(0);
  const alert = alerts[active];
  return (
    <main className="min-h-screen px-5 pb-20 pt-28 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[.18em] text-[#00ff91]">
              // fictional environment
            </p>
            <h1 className="mt-3 text-4xl font-semibold">SOC Alert Simulator</h1>
          </div>
          <span className="border border-[#ffb86b]/25 bg-[#ffb86b]/[0.05] px-3 py-2 font-mono text-[10px] uppercase text-[#ffca8a]">
            Simulation only — no real network
          </span>
        </div>
        <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
          <aside className="space-y-3">
            {alerts.map((item, index) => (
              <button
                key={item.id}
                onClick={() => setActive(index)}
                className={`w-full border p-4 text-left transition ${
                  active === index
                    ? "border-[#00ff91]/40 bg-[#00ff91]/[0.06]"
                    : "border-white/[0.07] bg-[#101915]"
                }`}
              >
                <div className="flex justify-between gap-3 font-mono text-[10px]">
                  <span className="text-[#77847e]">{item.id}</span>
                  <span
                    className={
                      item.severity === "High"
                        ? "text-[#ff7b72]"
                        : "text-[#ffca8a]"
                    }
                  >
                    {item.severity}
                  </span>
                </div>
                <p className="mt-3 text-sm">{item.type}</p>
              </button>
            ))}
          </aside>
          <article className="glass-panel p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.07] pb-5">
              <div>
                <p className="font-mono text-[10px] text-[#77847e]">
                  {alert.time}
                </p>
                <h2 className="mt-2 text-xl font-semibold">{alert.type}</h2>
              </div>
              <span className="inline-flex items-center gap-2 border border-[#00ff91]/20 px-3 py-2 font-mono text-[10px] text-[#00ff91]">
                <AlertTriangle size={13} />
                {alert.severity}
              </span>
            </div>
            <div className="grid gap-3 py-5 sm:grid-cols-3">
              <div className="border border-white/[0.07] p-4">
                <p className="font-mono text-[9px] text-[#77847e]">SOURCE</p>
                <p className="mt-2 font-mono text-xs">{alert.source}</p>
              </div>
              <div className="border border-white/[0.07] p-4">
                <p className="font-mono text-[9px] text-[#77847e]">
                  DESTINATION
                </p>
                <p className="mt-2 font-mono text-xs">{alert.destination}</p>
              </div>
              <div className="border border-white/[0.07] p-4">
                <p className="font-mono text-[9px] text-[#77847e]">STATUS</p>
                <p className="mt-2 font-mono text-xs text-[#00ff91]">
                  UNDER REVIEW
                </p>
              </div>
            </div>
            <p className="text-sm leading-7 text-[#bdc8c2]">{alert.details}</p>
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="font-mono text-xs uppercase text-[#00ff91]">
                  Evidence / logs
                </h3>
                <div className="mt-3 space-y-2">
                  {alert.evidence.map((item) => (
                    <p
                      key={item}
                      className="border-l border-[#00ff91]/30 pl-3 text-xs leading-6 text-[#9ba8a1]"
                    >
                      {item}
                    </p>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-mono text-xs uppercase text-[#00ff91]">
                  Investigation steps
                </h3>
                <div className="mt-3 space-y-2">
                  {alert.steps.map((item, index) => (
                    <p
                      key={item}
                      className="flex gap-3 text-xs leading-6 text-[#9ba8a1]"
                    >
                      <span className="font-mono text-[#00ff91]">
                        0{index + 1}
                      </span>
                      {item}
                    </p>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="border border-white/[0.07] p-4">
                <p className="font-mono text-[9px] text-[#77847e]">
                  RECOMMENDED ACTION
                </p>
                <p className="mt-2 text-sm leading-6">{alert.action}</p>
              </div>
              <div className="border border-[#00ff91]/15 bg-[#00ff91]/[0.04] p-4">
                <p className="flex items-center gap-2 font-mono text-[9px] text-[#00ff91]">
                  <ShieldCheck size={12} />
                  FINAL CONCLUSION
                </p>
                <p className="mt-2 text-sm leading-6 text-[#bdc8c2]">
                  {alert.conclusion}
                </p>
              </div>
            </div>
          </article>
        </div>
      </div>
    </main>
  );
}
