"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ChevronLeft,
  Eye,
  EyeOff,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";

interface ThreatEvent {
  id: string;
  category:
    | "DDoS Simulation"
    | "Brute Force"
    | "Phishing Campaign"
    | "Malware Activity"
    | "Port Scanning"
    | "Suspicious Login"
    | "Data Exfiltration Simulation"
    | "Botnet Activity";
  severity: "Critical" | "High" | "Medium" | "Low";
  origin: string;
  originRegion: string;
  target: string;
  targetRegion: string;
  sourceIp: string;
  targetIp: string;
  protocol: string;
  status: "Monitoring" | "Contained" | "Investigating";
  time: string;
  description: string;
  indicators: string[];
  response: string;
  originX: number;
  originY: number;
  targetX: number;
  targetY: number;
}

const threatEvents: ThreatEvent[] = [
  {
    id: "THREAT-SIM-001",
    category: "DDoS Simulation",
    severity: "Critical",
    origin: "Fictional East Europe",
    originRegion: "Europe",
    target: "Training CDN",
    targetRegion: "North America",
    sourceIp: "198.51.100.18",
    targetIp: "203.0.113.20",
    protocol: "UDP / 443",
    status: "Contained",
    time: "09:41",
    description:
      "A simulated traffic surge attempts to overwhelm a fictional training CDN edge.",
    indicators: [
      "Synthetic packet burst",
      "Abnormal connection count",
      "Repeated UDP pressure",
    ],
    response:
      "Apply fictional rate limits, preserve logs, and validate upstream filtering.",
    originX: 490,
    originY: 205,
    targetX: 255,
    targetY: 230,
  },
  {
    id: "THREAT-SIM-002",
    category: "Brute Force",
    severity: "High",
    origin: "Fictional South Asia",
    originRegion: "Asia",
    target: "Training Identity Portal",
    targetRegion: "North America",
    sourceIp: "192.0.2.42",
    targetIp: "198.51.100.44",
    protocol: "HTTPS / 443",
    status: "Investigating",
    time: "09:44",
    description:
      "Repeated authentication failures target a simulated training identity account.",
    indicators: [
      "Failure burst",
      "One post-failure login",
      "MFA challenge absent",
    ],
    response:
      "Review authentication history, validate MFA, and reset credentials if compromise is confirmed.",
    originX: 700,
    originY: 290,
    targetX: 270,
    targetY: 245,
  },
  {
    id: "THREAT-SIM-003",
    category: "Phishing Campaign",
    severity: "High",
    origin: "Fictional West Africa",
    originRegion: "Africa",
    target: "Training Mail Gateway",
    targetRegion: "Europe",
    sourceIp: "203.0.113.77",
    targetIp: "192.0.2.80",
    protocol: "SMTP / 587",
    status: "Contained",
    time: "09:48",
    description:
      "A fictional campaign uses urgency and a look-alike login domain to request credentials.",
    indicators: ["Sender mismatch", "SPF failure", "Look-alike domain"],
    response:
      "Quarantine messages, block the simulated domain, and identify any opened links.",
    originX: 475,
    originY: 360,
    targetX: 505,
    targetY: 210,
  },
  {
    id: "THREAT-SIM-004",
    category: "Malware Activity",
    severity: "Critical",
    origin: "Fictional East Asia",
    originRegion: "Asia",
    target: "Simulated Lab Workstation",
    targetRegion: "North America",
    sourceIp: "198.51.100.88",
    targetIp: "10.20.3.18",
    protocol: "HTTPS / 443",
    status: "Investigating",
    time: "09:51",
    description:
      "A watchlisted fictional executable creates persistence and establishes a synthetic callback.",
    indicators: [
      "Malicious hash relationship",
      "Persistence change",
      "Outbound callback",
    ],
    response:
      "Preserve evidence, isolate the simulated endpoint, and escalate to incident response.",
    originX: 790,
    originY: 255,
    targetX: 235,
    targetY: 260,
  },
  {
    id: "THREAT-SIM-005",
    category: "Port Scanning",
    severity: "Medium",
    origin: "Fictional Central Europe",
    originRegion: "Europe",
    target: "Training Perimeter",
    targetRegion: "Asia",
    sourceIp: "192.0.2.115",
    targetIp: "198.51.100.33",
    protocol: "TCP / Multiple",
    status: "Monitoring",
    time: "09:54",
    description:
      "A synthetic host probes several fictional perimeter ports in rapid succession.",
    indicators: [
      "Sequential port sequence",
      "Low-payload connections",
      "Repeated source",
    ],
    response:
      "Correlate firewall telemetry, confirm automated behavior, and continue monitoring.",
    originX: 515,
    originY: 205,
    targetX: 745,
    targetY: 275,
  },
  {
    id: "THREAT-SIM-006",
    category: "Suspicious Login",
    severity: "Medium",
    origin: "Fictional South America",
    originRegion: "South America",
    target: "Privileged Training Account",
    targetRegion: "Europe",
    sourceIp: "203.0.113.132",
    targetIp: "192.0.2.91",
    protocol: "SAML / 443",
    status: "Investigating",
    time: "09:57",
    description:
      "A privileged training account signs in from an unusual fictional region and resource scope.",
    indicators: [
      "Unusual access time",
      "New source region",
      "Restricted resource access",
    ],
    response:
      "Validate authorized maintenance, review role context, and escalate only if access is unexplained.",
    originX: 330,
    originY: 390,
    targetX: 510,
    targetY: 220,
  },
  {
    id: "THREAT-SIM-007",
    category: "Data Exfiltration Simulation",
    severity: "Critical",
    origin: "Fictional North America",
    originRegion: "North America",
    target: "Fictional Storage Host",
    targetRegion: "Europe",
    sourceIp: "198.51.100.145",
    targetIp: "203.0.113.210",
    protocol: "HTTPS / 443",
    status: "Monitoring",
    time: "10:02",
    description:
      "A workstation sends a synthetic unusually large data volume to an external training destination.",
    indicators: [
      "Large outbound payload",
      "New destination",
      "Off-hours transfer",
    ],
    response:
      "Inspect process and user context, preserve packet metadata, and escalate if transfer validation fails.",
    originX: 220,
    originY: 250,
    targetX: 500,
    targetY: 215,
  },
  {
    id: "THREAT-SIM-008",
    category: "Botnet Activity",
    severity: "Low",
    origin: "Fictional Oceania",
    originRegion: "Oceania",
    target: "Fictional DNS Relay",
    targetRegion: "Asia",
    sourceIp: "192.0.2.201",
    targetIp: "198.51.100.53",
    protocol: "DNS / 53",
    status: "Monitoring",
    time: "10:05",
    description:
      "A synthetic device cohort generates low-confidence repeated DNS requests to new domains.",
    indicators: [
      "Repeated short TTL queries",
      "Shared request pattern",
      "No direct process match",
    ],
    response:
      "Aggregate telemetry, correlate endpoints, and avoid containment without a stronger confirmed indicator.",
    originX: 800,
    originY: 435,
    targetX: 735,
    targetY: 285,
  },
];

const severityColor = {
  Critical: "#ff6b6b",
  High: "#ffb86b",
  Medium: "#58d7f7",
  Low: "#00ff91",
};

const categories = [
  "All",
  "DDoS Simulation",
  "Brute Force",
  "Phishing Campaign",
  "Malware Activity",
  "Port Scanning",
  "Suspicious Login",
  "Data Exfiltration Simulation",
  "Botnet Activity",
] as const;

const regions = [
  "All",
  "North America",
  "South America",
  "Europe",
  "Africa",
  "Asia",
  "Oceania",
] as const;

function curvedPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
) {
  const middleX = (sourceX + targetX) / 2;
  const middleY = (sourceY + targetY) / 2;
  const distance = Math.abs(targetX - sourceX);
  const bend = Math.min(95, 34 + distance * 0.12);
  return `M ${sourceX} ${sourceY} Q ${middleX} ${middleY - bend} ${targetX} ${targetY}`;
}

export default function ThreatIntelligencePage() {
  const [severityFilter, setSeverityFilter] = useState<
    "All" | ThreatEvent["severity"]
  >("All");
  const [categoryFilter, setCategoryFilter] =
    useState<(typeof categories)[number]>("All");
  const [regionFilter, setRegionFilter] =
    useState<(typeof regions)[number]>("All");
  const [running, setRunning] = useState(true);
  const [routesVisible, setRoutesVisible] = useState(true);
  const [markersVisible, setMarkersVisible] = useState(true);
  const [selectedId, setSelectedId] = useState(threatEvents[0].id);
  const [feed, setFeed] = useState(threatEvents.slice(0, 5));
  const [phase, setPhase] = useState(0);
  const [feedCursor, setFeedCursor] = useState(5);

  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (!running || reducedMotion) return;
    const interval = window.setInterval(() => {
      setPhase((value) => (value + 1) % 100);
      setFeedCursor((cursor) => {
        const nextEvent = threatEvents[cursor % threatEvents.length];
        setFeed((current) => [nextEvent, ...current].slice(0, 8));
        return cursor + 1;
      });
    }, 4200);
    return () => window.clearInterval(interval);
  }, [running, reducedMotion]);

  const filteredEvents = useMemo(() => {
    return threatEvents.filter((event) => {
      const severityMatch =
        severityFilter === "All" || event.severity === severityFilter;
      const categoryMatch =
        categoryFilter === "All" || event.category === categoryFilter;
      const regionMatch =
        regionFilter === "All" ||
        event.originRegion === regionFilter ||
        event.targetRegion === regionFilter;
      return severityMatch && categoryMatch && regionMatch;
    });
  }, [severityFilter, categoryFilter, regionFilter]);

  const visibleFeed = feed.filter((event) => {
    const severityMatch =
      severityFilter === "All" || event.severity === severityFilter;
    const categoryMatch =
      categoryFilter === "All" || event.category === categoryFilter;
    const regionMatch =
      regionFilter === "All" ||
      event.originRegion === regionFilter ||
      event.targetRegion === regionFilter;
    return severityMatch && categoryMatch && regionMatch;
  });

  const selected =
    threatEvents.find((event) => event.id === selectedId) || threatEvents[0];
  const criticalCount = filteredEvents.filter(
    (event) => event.severity === "Critical",
  ).length;
  const highCount = filteredEvents.filter(
    (event) => event.severity === "High",
  ).length;

  const regionCounts = filteredEvents.reduce<Record<string, number>>(
    (counts, event) => {
      counts[event.targetRegion] = (counts[event.targetRegion] || 0) + 1;
      return counts;
    },
    {},
  );
  const mostTargeted =
    Object.entries(regionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "None";

  const categoryCounts = filteredEvents.reduce<Record<string, number>>(
    (counts, event) => {
      counts[event.category] = (counts[event.category] || 0) + 1;
      return counts;
    },
    {},
  );
  const frequentCategory =
    Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    "None";

  function resetSimulation() {
    setSeverityFilter("All");
    setCategoryFilter("All");
    setRegionFilter("All");
    setRunning(true);
    setRoutesVisible(true);
    setMarkersVisible(true);
    setSelectedId(threatEvents[0].id);
    setFeed(threatEvents.slice(0, 5));
    setFeedCursor(5);
    setPhase(0);
  }

  return (
    <main className="min-h-screen px-5 pb-20 pt-28 lg:px-8">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[.18em] text-[#58d7f7]">
              // simulated threat intelligence
            </p>
            <h1 className="mt-3 text-4xl font-semibold">
              Global Threat Monitor
            </h1>
          </div>
          <Link
            href="/network-topology/"
            className="inline-flex items-center gap-2 font-mono text-[10px] uppercase text-[#77847e] transition hover:text-[#58d7f7]"
          >
            <ChevronLeft size={13} /> Network topology
          </Link>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {[
            ["Simulated events", String(filteredEvents.length)],
            ["Critical", String(criticalCount)],
            ["High severity", String(highCount)],
            [
              "Active routes",
              String(routesVisible ? filteredEvents.length : 0),
            ],
            ["Most targeted", mostTargeted],
            ["Top category", frequentCategory],
          ].map(([label, value]) => (
            <div
              key={label}
              className="premium-card glass-panel min-h-20 px-4 py-3"
            >
              <p className="font-mono text-[9px] uppercase text-[#77847e]">
                {label}
              </p>
              <p className="mt-2 truncate font-mono text-[11px] text-[#58d7f7]">
                {value}
              </p>
            </div>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap gap-2 border border-white/[0.07] p-3">
          {(["All", "Critical", "High", "Medium", "Low"] as const).map(
            (severity) => (
              <button
                key={severity}
                type="button"
                onClick={() => setSeverityFilter(severity)}
                className={`border px-3 py-2 font-mono text-[9px] uppercase ${severityFilter === severity ? "border-[#58d7f7]/40 bg-[#58d7f7]/[0.06] text-[#58d7f7]" : "border-white/[0.07] text-[#77847e]"}`}
              >
                {severity}
              </button>
            ),
          )}

          <select
            value={categoryFilter}
            onChange={(event) =>
              setCategoryFilter(
                event.target.value as (typeof categories)[number],
              )
            }
            className="border border-white/[0.07] bg-[#0d161d] px-3 py-2 font-mono text-[9px] uppercase text-[#77847e] outline-none"
            aria-label="Filter threat category"
          >
            {categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>

          <select
            value={regionFilter}
            onChange={(event) =>
              setRegionFilter(event.target.value as (typeof regions)[number])
            }
            className="border border-white/[0.07] bg-[#0d161d] px-3 py-2 font-mono text-[9px] uppercase text-[#77847e] outline-none"
            aria-label="Filter threat region"
          >
            {regions.map((region) => (
              <option key={region}>{region}</option>
            ))}
          </select>

          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => setRunning((value) => !value)}
              className="inline-flex h-9 items-center gap-2 border border-[#58d7f7]/25 px-3 font-mono text-[9px] uppercase text-[#58d7f7]"
            >
              {running ? <Pause size={12} /> : <Play size={12} />}{" "}
              {running ? "Pause" : "Resume"}
            </button>
            <button
              type="button"
              onClick={() => setRoutesVisible((value) => !value)}
              className="grid size-9 place-items-center border border-white/[0.08] text-[#77847e]"
              aria-label="Toggle routes"
            >
              {routesVisible ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
            <button
              type="button"
              onClick={() => setMarkersVisible((value) => !value)}
              className="grid size-9 place-items-center border border-white/[0.08] text-[#77847e]"
              aria-label="Toggle markers"
            >
              {markersVisible ? (
                <Activity size={12} />
              ) : (
                <AlertTriangle size={12} />
              )}
            </button>
            <button
              type="button"
              onClick={resetSimulation}
              className="grid size-9 place-items-center border border-white/[0.08] text-[#77847e]"
              aria-label="Reset threat simulation"
            >
              <RotateCcw size={12} />
            </button>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_350px]">
          <section
            className="premium-card glass-panel overflow-hidden"
            aria-label="Global simulated threat map"
          >
            <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
              <p className="font-mono text-[10px] uppercase text-[#77847e]">
                Global activity map
              </p>
              <span className="flex items-center gap-2 font-mono text-[9px] text-[#77847e]">
                <span
                  className={`size-1.5 rounded-full ${running ? "animate-pulse bg-[#00ff91]" : "bg-[#77847e]"}`}
                />
                {running ? "Simulation live" : "Simulation paused"}
              </span>
            </div>

            <div className="overflow-auto">
              <svg
                viewBox="0 0 980 520"
                role="img"
                aria-label="Interactive fictional global threat activity map"
                className="min-w-[720px] w-full select-none"
              >
                <defs>
                  <filter id="threat-glow">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <pattern
                    id="threat-grid"
                    width="30"
                    height="30"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M30 0H0V30"
                      fill="none"
                      stroke="rgba(88,215,247,.055)"
                      strokeWidth="1"
                    />
                  </pattern>
                </defs>
                <rect width="980" height="520" fill="#091016" />
                <rect width="980" height="520" fill="url(#threat-grid)" />

                <g fill="#13202a" stroke="rgba(88,215,247,.18)" strokeWidth="1">
                  <path d="M90 135L130 88L200 75L254 105L250 165L310 205L282 265L220 252L178 310L130 270L92 215Z" />
                  <path d="M300 315L350 285L405 330L390 410L350 485L314 430L278 370Z" />
                  <path d="M465 125L520 95L575 112L620 148L592 205L538 215L490 195Z" />
                  <path d="M455 220L520 215L575 260L555 330L520 410L470 350L440 270Z" />
                  <path d="M625 135L695 105L790 125L850 180L825 245L765 260L710 225L655 225Z" />
                  <path d="M780 330L845 320L875 365L845 415L798 405Z" />
                  <path d="M860 285L875 270L890 300L875 315Z" />
                  <path d="M120 430L145 420L155 450L135 465Z" />
                </g>

                {routesVisible &&
                  filteredEvents.map((event) => {
                    const selectedRoute = event.id === selectedId;
                    const color = severityColor[event.severity];
                    const packetProgress =
                      ((phase + filteredEvents.indexOf(event) * 13) % 100) /
                      100;
                    const middleX = (event.originX + event.targetX) / 2;
                    const middleY = (event.originY + event.targetY) / 2;
                    const distance = Math.abs(event.targetX - event.originX);
                    const bend = Math.min(95, 34 + distance * 0.12);
                    const path = `M ${event.originX} ${event.originY} Q ${middleX} ${middleY - bend} ${event.targetX} ${event.targetY}`;
                    const packetX =
                      packetProgress < 0.5
                        ? event.originX +
                          (middleX - event.originX) * packetProgress * 2
                        : middleX +
                          (event.targetX - middleX) *
                            (packetProgress - 0.5) *
                            2;
                    const packetY =
                      packetProgress < 0.5
                        ? event.originY +
                          (middleY - bend - event.originY) * packetProgress * 2
                        : middleY -
                          bend +
                          (event.targetY - (middleY - bend)) *
                            (packetProgress - 0.5) *
                            2;
                    return (
                      <g
                        key={event.id}
                        onClick={() => setSelectedId(event.id)}
                        className="cursor-pointer"
                      >
                        <path
                          d={path}
                          fill="none"
                          stroke={selectedRoute ? "#f2f7f4" : color}
                          strokeWidth={selectedRoute ? 2.2 : 1.2}
                          strokeDasharray={
                            event.severity === "Critical" ? "7 5" : "5 7"
                          }
                          opacity={selectedRoute ? 1 : 0.62}
                        />
                        {running && !reducedMotion && (
                          <circle
                            cx={packetX}
                            cy={packetY}
                            r="3"
                            fill={color}
                            filter="url(#threat-glow)"
                            opacity="0.95"
                          />
                        )}
                      </g>
                    );
                  })}

                {markersVisible &&
                  filteredEvents.map((event) => {
                    const selectedMarker = event.id === selectedId;
                    const color = severityColor[event.severity];
                    return (
                      <g key={event.id}>
                        <g
                          role="button"
                          tabIndex={0}
                          aria-label={`${event.category} from ${event.origin}`}
                          onClick={() => setSelectedId(event.id)}
                          onKeyDown={(keyEvent) => {
                            if (
                              keyEvent.key === "Enter" ||
                              keyEvent.key === " "
                            ) {
                              keyEvent.preventDefault();
                              setSelectedId(event.id);
                            }
                          }}
                          className="cursor-pointer"
                        >
                          {selectedMarker && (
                            <circle
                              cx={event.originX}
                              cy={event.originY}
                              r="10"
                              fill="none"
                              stroke={color}
                              strokeWidth="1"
                              opacity="0.7"
                            />
                          )}
                          <circle
                            cx={event.originX}
                            cy={event.originY}
                            r={selectedMarker ? 5 : 3.5}
                            fill={color}
                            filter="url(#threat-glow)"
                          />
                          <text
                            x={event.originX + 8}
                            y={event.originY - 8}
                            fill="#dfe7e3"
                            fontSize="7.5"
                            fontFamily="monospace"
                            opacity="0.75"
                          >
                            {event.originRegion}
                          </text>
                        </g>
                        <g
                          role="button"
                          tabIndex={0}
                          aria-label={`${event.category} target ${event.target}`}
                          onClick={() => setSelectedId(event.id)}
                          onKeyDown={(keyEvent) => {
                            if (
                              keyEvent.key === "Enter" ||
                              keyEvent.key === " "
                            ) {
                              keyEvent.preventDefault();
                              setSelectedId(event.id);
                            }
                          }}
                          className="cursor-pointer"
                        >
                          {selectedMarker && (
                            <circle
                              cx={event.targetX}
                              cy={event.targetY}
                              r="12"
                              fill="none"
                              stroke="#f2f7f4"
                              strokeWidth="1"
                              opacity="0.55"
                            />
                          )}
                          <circle
                            cx={event.targetX}
                            cy={event.targetY}
                            r={selectedMarker ? 5 : 3.5}
                            fill={color}
                            filter="url(#threat-glow)"
                          />
                        </g>
                      </g>
                    );
                  })}
              </svg>
            </div>

            <div className="grid gap-1 border-t border-white/[0.07] px-4 py-3 sm:grid-cols-8">
              {threatEvents.slice(0, 8).map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => setSelectedId(event.id)}
                  className={`h-1.5 border-t-2 ${selectedId === event.id ? "border-[#f2f7f4]" : "border-white/[0.12]"}`}
                  title={event.category}
                  aria-label={`Inspect ${event.category}`}
                >
                  <span className="sr-only">{event.category}</span>
                </button>
              ))}
            </div>
          </section>

          <aside className="space-y-5">
            <div className="premium-card glass-panel p-5">
              <p className="font-mono text-[9px] uppercase text-[#77847e]">
                Selected threat
              </p>
              <div className="mt-2 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{selected.category}</h2>
                  <p className="mt-1 font-mono text-[9px] text-[#77847e]">
                    {selected.id}
                  </p>
                </div>
                <span
                  className="border px-2 py-1 font-mono text-[9px]"
                  style={{
                    borderColor: `${severityColor[selected.severity]}55`,
                    color: severityColor[selected.severity],
                  }}
                >
                  {selected.severity}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <p className="font-mono text-[9px] text-[#77847e]">ORIGIN</p>
                  <p className="mt-1 text-xs">{selected.origin}</p>
                </div>
                <div>
                  <p className="font-mono text-[9px] text-[#77847e]">TARGET</p>
                  <p className="mt-1 text-xs">{selected.target}</p>
                </div>
                <div>
                  <p className="font-mono text-[9px] text-[#77847e]">
                    SOURCE IP
                  </p>
                  <p className="mt-1 font-mono text-[10px]">
                    {selected.sourceIp}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[9px] text-[#77847e]">
                    TARGET IP
                  </p>
                  <p className="mt-1 font-mono text-[10px]">
                    {selected.targetIp}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-xs leading-6 text-[#bdc8c2]">
                {selected.description}
              </p>
              <div className="mt-4">
                <p className="font-mono text-[9px] text-[#77847e]">
                  SIMULATED INDICATORS
                </p>
                <div className="mt-2 space-y-1">
                  {selected.indicators.map((indicator) => (
                    <p
                      key={indicator}
                      className="border-l border-[#58d7f7]/25 pl-2 text-xs text-[#bdc8c2]"
                    >
                      {indicator}
                    </p>
                  ))}
                </div>
              </div>
              <div className="mt-4 border border-[#58d7f7]/15 bg-[#58d7f7]/[0.035] p-3">
                <p className="flex items-center gap-2 font-mono text-[9px] text-[#58d7f7]">
                  <ShieldCheck size={12} /> DEFENSIVE RESPONSE
                </p>
                <p className="mt-2 text-xs leading-5 text-[#bdc8c2]">
                  {selected.response}
                </p>
              </div>
              <div className="mt-4 flex justify-between border-t border-white/[0.07] pt-3 font-mono text-[9px] text-[#77847e]">
                <span>{selected.protocol}</span>
                <span>{selected.status}</span>
                <span>{selected.time}</span>
              </div>
            </div>

            <div className="premium-card glass-panel p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-mono text-[10px] uppercase text-[#77847e]">
                  Simulated threat feed
                </p>
                <span
                  className={`size-1.5 rounded-full ${running ? "animate-pulse bg-[#00ff91]" : "bg-[#77847e]"}`}
                />
              </div>
              <div className="max-h-[360px] space-y-2 overflow-y-auto">
                {visibleFeed.length ? (
                  visibleFeed.map((event) => (
                    <button
                      key={`${event.id}-${event.time}`}
                      type="button"
                      onClick={() => setSelectedId(event.id)}
                      className={`w-full border p-3 text-left transition ${selectedId === event.id ? "border-[#58d7f7]/40 bg-[#58d7f7]/[0.055]" : "border-white/[0.07] hover:border-[#58d7f7]/20"}`}
                    >
                      <div className="flex items-center justify-between font-mono text-[9px]">
                        <span style={{ color: severityColor[event.severity] }}>
                          {event.severity}
                        </span>
                        <span className="text-[#77847e]">{event.time}</span>
                      </div>
                      <p className="mt-2 text-xs">{event.category}</p>
                      <p className="mt-1 truncate font-mono text-[9px] text-[#77847e]">
                        {event.origin} → {event.target}
                      </p>
                    </button>
                  ))
                ) : (
                  <p className="py-6 text-center font-mono text-[9px] text-[#77847e]">
                    No events match the selected filters.
                  </p>
                )}
              </div>
            </div>

            <section
              className="premium-card glass-panel mt-5 p-4"
              aria-label="Threat activity timeline"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[9px] uppercase text-[#77847e]">
                    Activity timeline
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-[#58d7f7]">
                    09:41 — 10:05 simulated UTC
                  </p>
                </div>
                <span className="font-mono text-[9px] text-[#77847e]">
                  Select an event
                </span>
              </div>
              <div className="grid h-24 grid-cols-8 items-end gap-2">
                {filteredEvents.slice(0, 8).map((event, index) => {
                  const height =
                    event.severity === "Critical"
                      ? 88
                      : event.severity === "High"
                        ? 72
                        : event.severity === "Medium"
                          ? 54
                          : 38;
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => setSelectedId(event.id)}
                      className="group flex h-full flex-col items-center justify-end gap-2"
                      aria-label={`Inspect ${event.category} at ${event.time}`}
                    >
                      <span
                        className={`w-full max-w-16 transition group-hover:brightness-125 ${selectedId === event.id ? "ring-1 ring-[#f2f7f4]" : ""}`}
                        style={{
                          height,
                          background: `linear-gradient(to top, ${severityColor[event.severity]}55, ${severityColor[event.severity]})`,
                        }}
                      />
                      <span className="font-mono text-[8px] text-[#77847e]">
                        {event.time}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          </aside>
        </div>

        <div className="mt-5 border border-white/[0.07] px-4 py-3 font-mono text-[9px] text-[#77847e]">
          <ShieldCheck className="mr-2 inline text-[#58d7f7]" size={12} />
          All locations, addresses, indicators, and attack routes are fictional
          and used only for portfolio simulation.
        </div>
      </div>
    </main>
  );
}
