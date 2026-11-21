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
  ZoomIn,
  ZoomOut,
} from "lucide-react";

interface NetworkNode {
  id: string;
  name: string;
  type: string;
  ip: string;
  os: string;
  role: string;
  status: "Normal" | "Active" | "Suspicious" | "Compromised" | "Offline";
  x: number;
  y: number;
  activity: string[];
  services: string[];
  security: string;
}

interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  status: "normal" | "blocked" | "suspicious";
  traffic: "HTTPS" | "DNS" | "SSH" | "Suspicious" | "Blocked";
}

const nodes: NetworkNode[] = [
  {
    id: "attacker",
    name: "External Host",
    type: "Attacker",
    ip: "203.0.113.77",
    os: "Unknown simulated host",
    role: "Untrusted external source",
    status: "Suspicious",
    x: 78,
    y: 300,
    activity: [
      "Repeated login attempts",
      "Connection attempts blocked by policy",
    ],
    services: ["Outbound TCP 443"],
    security: "Fictional external actor. No real host is contacted.",
  },
  {
    id: "internet",
    name: "Internet",
    type: "External Network",
    ip: "Documentation range",
    os: "Cloud / external",
    role: "Public network boundary",
    status: "Active",
    x: 210,
    y: 300,
    activity: ["Normal web requests", "One suspicious source observed"],
    services: ["TCP 80/443", "UDP 53"],
    security: "Simulated external network for educational use.",
  },
  {
    id: "router",
    name: "Edge Router",
    type: "Router",
    ip: "10.20.0.1",
    os: "Simulated network OS",
    role: "Routes traffic between network zones",
    status: "Normal",
    x: 345,
    y: 300,
    activity: ["Routes 2.8 MB/s synthetic traffic", "Policy rules operational"],
    services: ["Routing", "NAT"],
    security: "Management access restricted to SOC analysts.",
  },
  {
    id: "firewall",
    name: "Firewall",
    type: "Security Gateway",
    ip: "10.20.0.2",
    os: "Simulated firewall OS",
    role: "Filters inbound and outbound traffic",
    status: "Active",
    x: 480,
    y: 300,
    activity: ["Blocked 4 suspicious flows", "3 firewall rules matched"],
    services: ["TCP 443", "UDP 53", "Management HTTPS"],
    security: "One simulated suspicious flow remains under review.",
  },
  {
    id: "switch",
    name: "Core Switch",
    type: "Switch",
    ip: "10.20.1.10",
    os: "Simulated switch firmware",
    role: "Connects internal devices and servers",
    status: "Normal",
    x: 615,
    y: 300,
    activity: ["STP converged", "Traffic mirrored to SIEM"],
    services: ["VLAN 20", "VLAN 30"],
    security: "No unauthorized configuration change observed.",
  },
  {
    id: "workstation",
    name: "SOC-WS-018",
    type: "Workstation",
    ip: "10.20.3.18",
    os: "Windows 11 simulated",
    role: "Analyst workstation",
    status: "Suspicious",
    x: 750,
    y: 150,
    activity: ["Unusual process launched", "Outbound DNS query observed"],
    services: ["TCP 3389", "Endpoint agent"],
    security: "Validate process and isolate only after correlation.",
  },
  {
    id: "laptop",
    name: "Training Laptop",
    type: "Laptop",
    ip: "10.20.3.44",
    os: "Linux training image",
    role: "Student and lab access",
    status: "Normal",
    x: 750,
    y: 300,
    activity: ["Normal identity sign-in", "No threat detections"],
    services: ["SSH 22", "HTTPS 443"],
    security: "Endpoint controls are reporting normally.",
  },
  {
    id: "dns",
    name: "DNS Server",
    type: "Infrastructure",
    ip: "10.20.1.53",
    os: "Linux DNS service",
    role: "Resolves internal and allowed external names",
    status: "Normal",
    x: 750,
    y: 450,
    activity: ["Resolved 218 simulated queries", "New-domain query elevated"],
    services: ["UDP/TCP 53"],
    security: "DNS logging enabled and forwarded to the SIEM.",
  },
  {
    id: "web",
    name: "Web Server",
    type: "Application Server",
    ip: "10.20.2.20",
    os: "Linux / simulated web stack",
    role: "Hosts the training web application",
    status: "Normal",
    x: 895,
    y: 300,
    activity: ["Normal HTTP requests", "One credential probe blocked"],
    services: ["TCP 80", "TCP 443"],
    security: "WAF and application logging enabled.",
  },
  {
    id: "database",
    name: "Training Database",
    type: "Database Server",
    ip: "10.20.2.30",
    os: "Linux / simulated database",
    role: "Stores non-production training records",
    status: "Normal",
    x: 895,
    y: 150,
    activity: [
      "Read activity from web server",
      "No privilege escalation detected",
    ],
    services: ["TCP 5432"],
    security: "Contains no real or sensitive records.",
  },
  {
    id: "siem",
    name: "SIEM Console",
    type: "Monitoring Platform",
    ip: "10.20.1.80",
    os: "Security monitoring platform",
    role: "Collects and correlates security telemetry",
    status: "Active",
    x: 895,
    y: 450,
    activity: [
      "Correlating 3 simulated alerts",
      "Dashboard health: operational",
    ],
    services: ["HTTPS 443", "Log ingestion 5514"],
    security: "Primary analysis and alert correlation layer.",
  },
];

const edges: NetworkEdge[] = [
  {
    id: "attacker-internet",
    source: "attacker",
    target: "internet",
    status: "suspicious",
    traffic: "Suspicious",
  },
  {
    id: "internet-router",
    source: "internet",
    target: "router",
    status: "normal",
    traffic: "HTTPS",
  },
  {
    id: "router-firewall",
    source: "router",
    target: "firewall",
    status: "normal",
    traffic: "HTTPS",
  },
  {
    id: "firewall-switch",
    source: "firewall",
    target: "switch",
    status: "blocked",
    traffic: "Blocked",
  },
  {
    id: "switch-workstation",
    source: "switch",
    target: "workstation",
    status: "suspicious",
    traffic: "Suspicious",
  },
  {
    id: "switch-laptop",
    source: "switch",
    target: "laptop",
    status: "normal",
    traffic: "SSH",
  },
  {
    id: "switch-dns",
    source: "switch",
    target: "dns",
    status: "normal",
    traffic: "DNS",
  },
  {
    id: "switch-web",
    source: "switch",
    target: "web",
    status: "normal",
    traffic: "HTTPS",
  },
  {
    id: "web-database",
    source: "web",
    target: "database",
    status: "normal",
    traffic: "HTTPS",
  },
  {
    id: "switch-siem",
    source: "switch",
    target: "siem",
    status: "normal",
    traffic: "DNS",
  },
  {
    id: "workstation-dns",
    source: "workstation",
    target: "dns",
    status: "suspicious",
    traffic: "Suspicious",
  },
];

const statusColors = {
  Normal: "#77847e",
  Active: "#58d7f7",
  Suspicious: "#ffca8a",
  Compromised: "#ff7b72",
  Offline: "#52635a",
};

const trafficColors = {
  HTTPS: "#58d7f7",
  DNS: "#00ff91",
  SSH: "#a78bfa",
  Suspicious: "#ffca8a",
  Blocked: "#ff7b72",
};

function getNode(id: string) {
  return nodes.find((node) => node.id === id)!;
}

export default function NetworkTopologyPage() {
  const [selectedId, setSelectedId] = useState("firewall");
  const [running, setRunning] = useState(true);
  const [trafficVisible, setTrafficVisible] = useState(true);
  const [labelsVisible, setLabelsVisible] = useState(true);
  const [eventMode, setEventMode] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [trafficType, setTrafficType] = useState<
    "All" | NetworkEdge["traffic"]
  >("All");
  const [phase, setPhase] = useState(0);

  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (!running || reducedMotion) return;
    const interval = window.setInterval(
      () => setPhase((value) => (value + 1) % 120),
      90,
    );
    return () => window.clearInterval(interval);
  }, [running, reducedMotion]);

  const selected = getNode(selectedId);
  const connected = useMemo(
    () =>
      edges
        .filter(
          (edge) => edge.source === selectedId || edge.target === selectedId,
        )
        .map((edge) => {
          const otherId =
            edge.source === selectedId ? edge.target : edge.source;
          return getNode(otherId).name;
        }),
    [selectedId],
  );

  const visibleEdges =
    trafficType === "All"
      ? edges
      : edges.filter((edge) => edge.traffic === trafficType);
  const securityAlerts = eventMode ? 3 : 1;

  function resetNetwork() {
    setSelectedId("firewall");
    setRunning(true);
    setTrafficVisible(true);
    setLabelsVisible(true);
    setEventMode(false);
    setZoom(1);
    setTrafficType("All");
    setPhase(0);
  }

  return (
    <main className="min-h-screen px-5 pb-20 pt-28 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[.18em] text-[#58d7f7]">
              // fictional network environment
            </p>
            <h1 className="mt-3 text-4xl font-semibold">
              Network Topology Explorer
            </h1>
          </div>
          <Link
            href="/soc-simulator/"
            className="inline-flex items-center gap-2 font-mono text-[10px] uppercase text-[#77847e] transition hover:text-[#58d7f7]"
          >
            <ChevronLeft size={13} /> SOC Simulator
          </Link>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Devices", String(nodes.length)],
            ["Active connections", String(edges.length)],
            ["Traffic", running ? "Running" : "Paused"],
            ["Security alerts", String(securityAlerts)],
          ].map(([label, value]) => (
            <div key={label} className="glass-panel premium-card px-4 py-3">
              <p className="font-mono text-[9px] uppercase text-[#77847e]">
                {label}
              </p>
              <p className="mt-1 font-mono text-sm text-[#58d7f7]">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
          <section
            className="premium-card glass-panel overflow-hidden"
            aria-label="Simulated network topology"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRunning((value) => !value)}
                  className="inline-flex h-9 items-center gap-2 border border-[#58d7f7]/25 px-3 font-mono text-[9px] uppercase text-[#58d7f7]"
                >
                  {running ? <Pause size={12} /> : <Play size={12} />}{" "}
                  {running ? "Pause" : "Start"}
                </button>
                <button
                  type="button"
                  onClick={resetNetwork}
                  className="inline-flex h-9 items-center gap-2 border border-white/[0.08] px-3 font-mono text-[9px] uppercase text-[#77847e]"
                >
                  <RotateCcw size={12} /> Reset
                </button>
                <button
                  type="button"
                  onClick={() => setTrafficVisible((value) => !value)}
                  className="inline-flex h-9 items-center gap-2 border border-white/[0.08] px-3 font-mono text-[9px] uppercase text-[#77847e]"
                >
                  {trafficVisible ? <EyeOff size={12} /> : <Eye size={12} />}{" "}
                  Traffic
                </button>
                <button
                  type="button"
                  onClick={() => setLabelsVisible((value) => !value)}
                  className="inline-flex h-9 items-center gap-2 border border-white/[0.08] px-3 font-mono text-[9px] uppercase text-[#77847e]"
                >
                  {labelsVisible ? "Hide" : "Show"} Labels
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Zoom out"
                  onClick={() =>
                    setZoom((value) => Math.max(0.75, value - 0.1))
                  }
                  className="grid size-9 place-items-center border border-white/[0.08] text-[#77847e]"
                >
                  <ZoomOut size={14} />
                </button>
                <span className="w-10 text-center font-mono text-[9px] text-[#77847e]">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  aria-label="Zoom in"
                  onClick={() =>
                    setZoom((value) => Math.min(1.35, value + 0.1))
                  }
                  className="grid size-9 place-items-center border border-white/[0.08] text-[#77847e]"
                >
                  <ZoomIn size={14} />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 border-b border-white/[0.07] px-4 py-3">
              {(
                ["All", "HTTPS", "DNS", "SSH", "Suspicious", "Blocked"] as const
              ).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTrafficType(type)}
                  className={`border px-2 py-1 font-mono text-[9px] ${trafficType === type ? "border-[#58d7f7]/40 text-[#58d7f7]" : "border-white/[0.07] text-[#77847e]"}`}
                >
                  {type}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setEventMode((value) => !value)}
                className={`ml-auto border px-2 py-1 font-mono text-[9px] ${eventMode ? "border-[#ff7b72]/45 bg-[#ff7b72]/[0.05] text-[#ff7b72]" : "border-white/[0.07] text-[#77847e]"}`}
              >
                {eventMode ? "Event active" : "Trigger security event"}
              </button>
            </div>

            <div className="overflow-auto bg-[#070b10]/50">
              <svg
                viewBox="0 0 980 600"
                role="img"
                aria-label="Interactive simulated network topology"
                className="min-w-[720px] w-full select-none"
              >
                <defs>
                  <filter id="node-glow">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <pattern
                    id="topology-grid"
                    width="32"
                    height="32"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 32 0 L 0 0 0 32"
                      fill="none"
                      stroke="rgba(88,215,247,0.05)"
                      strokeWidth="1"
                    />
                  </pattern>
                </defs>
                <rect width="980" height="600" fill="url(#topology-grid)" />
                <g
                  transform={`translate(${490 * (1 - zoom)} ${300 * (1 - zoom)}) scale(${zoom})`}
                >
                  {edges.map((edge) => {
                    const source = getNode(edge.source);
                    const target = getNode(edge.target);
                    const selectedConnection =
                      edge.source === selectedId || edge.target === selectedId;
                    const visible =
                      trafficVisible &&
                      (trafficType === "All" || edge.traffic === trafficType);
                    const lineColor =
                      edge.status === "blocked"
                        ? "#ff7b72"
                        : edge.status === "suspicious"
                          ? "#ffca8a"
                          : selectedConnection
                            ? "#58d7f7"
                            : "#4f6870";
                    const suspiciousEvent =
                      eventMode &&
                      (edge.source === "attacker" ||
                        edge.target === "workstation" ||
                        edge.source === "workstation" ||
                        edge.status === "suspicious");
                    const dx = target.x - source.x;
                    const dy = target.y - source.y;
                    const length = Math.sqrt(dx * dx + dy * dy);
                    const midX = (source.x + target.x) / 2;
                    const midY = (source.y + target.y) / 2;
                    const offset = phase % 120;
                    const packetT =
                      ((offset + edges.indexOf(edge) * 17) % 120) / 120;
                    const packetX = source.x + dx * packetT;
                    const packetY = source.y + dy * packetT;
                    return (
                      <g key={edge.id}>
                        <line
                          x1={source.x}
                          y1={source.y}
                          x2={target.x}
                          y2={target.y}
                          stroke={suspiciousEvent ? "#ff7b72" : lineColor}
                          strokeWidth={selectedConnection ? 2.2 : 1.2}
                          strokeDasharray={
                            edge.status === "blocked"
                              ? "8 7"
                              : edge.status === "suspicious" || suspiciousEvent
                                ? "5 5"
                                : undefined
                          }
                          opacity={visible ? 0.9 : 0.28}
                        />
                        {visible && running && !reducedMotion && (
                          <circle
                            cx={packetX}
                            cy={packetY}
                            r={edge.status === "blocked" ? 2.5 : 3}
                            fill={
                              suspiciousEvent
                                ? "#ff7b72"
                                : trafficColors[edge.traffic]
                            }
                            filter="url(#node-glow)"
                            opacity="0.95"
                          >
                            <title>{edge.traffic} traffic</title>
                          </circle>
                        )}
                        {visible && (
                          <text
                            x={midX}
                            y={midY - 7}
                            textAnchor="middle"
                            fill={
                              suspiciousEvent
                                ? "#ff7b72"
                                : trafficColors[edge.traffic]
                            }
                            fontSize="8"
                            fontFamily="monospace"
                            opacity="0.82"
                          >
                            {edge.traffic}
                          </text>
                        )}
                      </g>
                    );
                  })}

                  {nodes.map((node) => {
                    const selectedNode = selectedId === node.id;
                    const eventAffected =
                      eventMode &&
                      (node.id === "attacker" ||
                        node.id === "workstation" ||
                        node.id === "firewall" ||
                        node.id === "siem");
                    const status =
                      eventAffected && node.status !== "Compromised"
                        ? node.id === "workstation"
                          ? "Compromised"
                          : "Suspicious"
                        : node.status;
                    const color = statusColors[status];
                    return (
                      <g
                        key={node.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`${node.name}, ${node.type}, ${status}`}
                        onClick={() => setSelectedId(node.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedId(node.id);
                          }
                        }}
                        className="cursor-pointer"
                      >
                        {selectedNode && (
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r="42"
                            fill="none"
                            stroke="#58d7f7"
                            strokeWidth="1.5"
                            opacity="0.42"
                          />
                        )}
                        {eventAffected && (
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r="34"
                            fill="none"
                            stroke="#ff7b72"
                            strokeWidth="1"
                            opacity="0.38"
                          />
                        )}
                        <rect
                          x={node.x - 28}
                          y={node.y - 28}
                          width="56"
                          height="56"
                          rx="10"
                          fill="#0d161d"
                          stroke={selectedNode ? "#58d7f7" : color}
                          strokeWidth={selectedNode ? 2 : 1.2}
                          filter={
                            selectedNode || eventAffected
                              ? "url(#node-glow)"
                              : undefined
                          }
                        />
                        <circle
                          cx={node.x + 19}
                          cy={node.y - 19}
                          r="4"
                          fill={color}
                        />
                        <text
                          x={node.x}
                          y={node.y - 5}
                          textAnchor="middle"
                          fill="#58d7f7"
                          fontSize="15"
                          fontFamily="monospace"
                        >
                          {node.type === "Router" || node.type === "Switch"
                            ? "NET"
                            : node.type === "Security Gateway"
                              ? "FW"
                              : node.type === "SIEM"
                                ? "SOC"
                                : node.id === "attacker"
                                  ? "!"
                                  : node.id === "internet"
                                    ? "WEB"
                                    : node.id === "database"
                                      ? "DB"
                                      : node.id === "dns"
                                        ? "DNS"
                                        : "SYS"}
                        </text>
                        {labelsVisible && (
                          <g>
                            <rect
                              x={node.x - 61}
                              y={node.y + 34}
                              width="122"
                              height="34"
                              rx="5"
                              fill="#091015"
                              stroke="rgba(88,215,247,0.12)"
                            />
                            <text
                              x={node.x}
                              y={node.y + 47}
                              textAnchor="middle"
                              fill="#dfe7e3"
                              fontSize="9"
                              fontFamily="monospace"
                            >
                              {node.name}
                            </text>
                            <text
                              x={node.x}
                              y={node.y + 59}
                              textAnchor="middle"
                              fill="#77847e"
                              fontSize="7.5"
                              fontFamily="monospace"
                            >
                              {node.ip}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </g>
              </svg>
            </div>

            <div className="flex flex-wrap gap-4 border-t border-white/[0.07] px-4 py-3 font-mono text-[9px] text-[#77847e]">
              {Object.entries(statusColors).map(([status, color]) => (
                <span key={status} className="flex items-center gap-1.5">
                  <span
                    className="size-2 rounded-full"
                    style={{ background: color }}
                  />
                  {status}
                </span>
              ))}
            </div>
          </section>

          <aside
            className="premium-card glass-panel h-fit p-5"
            aria-label="Selected device information"
          >
            <div className="flex items-start justify-between gap-3 border-b border-white/[0.07] pb-4">
              <div>
                <p className="font-mono text-[9px] uppercase text-[#77847e]">
                  Selected device
                </p>
                <h2 className="mt-2 text-xl font-semibold">{selected.name}</h2>
                <p className="mt-1 font-mono text-[10px] text-[#58d7f7]">
                  {selected.type}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId("firewall")}
                className="border border-white/[0.08] px-2 py-1 font-mono text-[9px] text-[#77847e]"
              >
                Clear
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="font-mono text-[9px] text-[#77847e]">
                    IP ADDRESS
                  </p>
                  <p className="mt-1 font-mono text-[11px]">{selected.ip}</p>
                </div>
                <div>
                  <p className="font-mono text-[9px] text-[#77847e]">STATUS</p>
                  <p
                    className="mt-1 font-mono text-[10px]"
                    style={{ color: statusColors[selected.status] }}
                  >
                    {selected.status}
                  </p>
                </div>
              </div>
              <div>
                <p className="font-mono text-[9px] text-[#77847e]">
                  OPERATING ENVIRONMENT
                </p>
                <p className="mt-1 text-xs leading-5 text-[#bdc8c2]">
                  {selected.os}
                </p>
              </div>
              <div>
                <p className="font-mono text-[9px] text-[#77847e]">ROLE</p>
                <p className="mt-1 text-xs leading-5 text-[#bdc8c2]">
                  {selected.role}
                </p>
              </div>
              <div>
                <p className="font-mono text-[9px] text-[#77847e]">
                  CONNECTED DEVICES
                </p>
                <p className="mt-1 text-xs leading-5 text-[#bdc8c2]">
                  {connected.join(", ") || "No direct connections"}
                </p>
              </div>
              <div>
                <p className="font-mono text-[9px] text-[#77847e]">
                  PORTS / SERVICES
                </p>
                <p className="mt-1 text-xs leading-5 text-[#bdc8c2]">
                  {selected.services.join(" • ")}
                </p>
              </div>
              <div>
                <p className="font-mono text-[9px] text-[#77847e]">
                  RECENT ACTIVITY
                </p>
                <div className="mt-1 space-y-1">
                  {selected.activity.map((item) => (
                    <p
                      key={item}
                      className="border-l border-[#58d7f7]/25 pl-2 text-xs leading-5 text-[#bdc8c2]"
                    >
                      {item}
                    </p>
                  ))}
                </div>
              </div>
              <div className="border border-[#58d7f7]/15 bg-[#58d7f7]/[0.035] p-3">
                <p className="flex items-center gap-2 font-mono text-[9px] text-[#58d7f7]">
                  <ShieldCheck size={12} /> SECURITY NOTE
                </p>
                <p className="mt-2 text-xs leading-5 text-[#bdc8c2]">
                  {selected.security}
                </p>
              </div>
            </div>

            {eventMode && (
              <div className="mt-4 border border-[#ff7b72]/20 bg-[#ff7b72]/[0.035] p-3">
                <p className="flex items-center gap-2 font-mono text-[9px] text-[#ff7b72]">
                  <AlertTriangle size={12} /> SIMULATED EVENT
                </p>
                <p className="mt-2 text-xs leading-5 text-[#bdc8c2]">
                  A fictional workstation callback is being correlated across
                  the firewall and SIEM.
                </p>
              </div>
            )}
          </aside>
        </div>

        <div className="mt-5 border border-white/[0.07] px-4 py-3 font-mono text-[9px] text-[#77847e]">
          <Activity className="mr-2 inline text-[#58d7f7]" size={12} />
          All devices, addresses, traffic flows, and security events are
          fictional and run entirely in the browser.
        </div>
      </div>
    </main>
  );
}
