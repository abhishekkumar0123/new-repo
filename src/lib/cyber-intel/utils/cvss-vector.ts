export type CvssVersion = "2.0" | "3.1" | "4.0";

export interface CvssVectorComponents {
  version: CvssVersion;
  vectorString: string | null;
  baseScore: number | null;
  baseSeverity: string | null;
  // CVSS 3.x / 4.0 metrics
  attackVector?: "N" | "A" | "L" | "P";
  attackComplexity?: "L" | "H";
  privilegesRequired?: "N" | "L" | "H";
  userInteraction?: "N" | "R";
  scope?: "U" | "C";
  confidentialityImpact?: "N" | "L" | "H";
  integrityImpact?: "N" | "L" | "H";
  availabilityImpact?: "N" | "L" | "H";
  // CVSS v2.0 specific
  authentication?: "N" | "S" | "M";
  // CVSS 4.0 specific
  attackRequirements?: "N" | "P";
  subsequentSystemConfidentiality?: "N" | "L" | "H";
  subsequentSystemIntegrity?: "N" | "L" | "H";
  subsequentSystemAvailability?: "N" | "L" | "H";
  // Human-readable labels
  labels: Record<string, string>;
}

const AV_LABELS: Record<string, string> = {
  N: "Network",
  A: "Adjacent Network",
  L: "Local",
  P: "Physical",
};

const AC_LABELS: Record<string, string> = {
  L: "Low",
  H: "High",
  M: "Medium",
};

const PR_LABELS: Record<string, string> = {
  N: "None",
  L: "Low",
  H: "High",
};

const UI_LABELS: Record<string, string> = {
  N: "None",
  R: "Required",
};

const S_LABELS: Record<string, string> = {
  U: "Unchanged",
  C: "Changed",
};

const IMPACT_LABELS: Record<string, string> = {
  N: "None",
  L: "Low",
  H: "High",
  P: "Partial",
  C: "Complete",
};

const AUTH_LABELS: Record<string, string> = {
  N: "None",
  S: "Single",
  M: "Multiple",
};

const AR_LABELS: Record<string, string> = {
  N: "None",
  P: "Present",
};

export function parseCvssVector(vectorString: string | null): CvssVectorComponents {
  const base: CvssVectorComponents = {
    version: "3.1",
    vectorString: null,
    baseScore: null,
    baseSeverity: null,
    labels: {},
  };

  if (!vectorString) return base;

  base.vectorString = vectorString;

  const parts = vectorString.split("/");
  let version: CvssVersion = "3.1";

  if (parts[0]?.startsWith("CVSS:")) {
    version = parts[0].replace("CVSS:", "") as CvssVersion;
    base.version = version;
  }

  const metrics: Record<string, string> = {};
  for (let i = version === "2.0" ? 0 : 1; i < parts.length; i++) {
    const part = parts[i];
    const eqIdx = part.indexOf(":");
    if (eqIdx === -1) continue;
    const key = part.slice(0, eqIdx);
    const value = part.slice(eqIdx + 1);
    metrics[key] = value;
  }

  if (version === "2.0") {
    base.attackVector = metrics.AV as any;
    base.attackComplexity = metrics.AC as any;
    base.authentication = metrics.Au as any;
    base.confidentialityImpact = metrics.C as any;
    base.integrityImpact = metrics.I as any;
    base.availabilityImpact = metrics.A as any;

    base.labels = {
      "Attack Vector": AV_LABELS[metrics.AV ?? ""] ?? metrics.AV ?? "Unknown",
      "Attack Complexity": AC_LABELS[metrics.AC ?? ""] ?? metrics.AC ?? "Unknown",
      Authentication: AUTH_LABELS[metrics.Au ?? ""] ?? metrics.Au ?? "Unknown",
      "Confidentiality Impact": IMPACT_LABELS[metrics.C ?? ""] ?? metrics.C ?? "Unknown",
      "Integrity Impact": IMPACT_LABELS[metrics.I ?? ""] ?? metrics.I ?? "Unknown",
      "Availability Impact": IMPACT_LABELS[metrics.A ?? ""] ?? metrics.A ?? "Unknown",
    };
  } else if (version.startsWith("4.0")) {
    base.attackVector = metrics.AV as any;
    base.attackComplexity = metrics.AC as any;
    base.attackRequirements = metrics.AT as any;
    base.privilegesRequired = metrics.PR as any;
    base.userInteraction = metrics.UI as any;
    base.confidentialityImpact = metrics.VC as any;
    base.integrityImpact = metrics.VI as any;
    base.availabilityImpact = metrics.VA as any;
    base.subsequentSystemConfidentiality = metrics.SC as any;
    base.subsequentSystemIntegrity = metrics.SI as any;
    base.subsequentSystemAvailability = metrics.SA as any;

    base.labels = {
      "Attack Vector": AV_LABELS[metrics.AV ?? ""] ?? metrics.AV ?? "Unknown",
      "Attack Complexity": AC_LABELS[metrics.AC ?? ""] ?? metrics.AC ?? "Unknown",
      "Attack Requirements": AR_LABELS[metrics.AT ?? ""] ?? metrics.AT ?? "Unknown",
      "Privileges Required": PR_LABELS[metrics.PR ?? ""] ?? metrics.PR ?? "Unknown",
      "User Interaction": UI_LABELS[metrics.UI ?? ""] ?? metrics.UI ?? "Unknown",
      "Confidentiality Impact": IMPACT_LABELS[metrics.VC ?? ""] ?? metrics.VC ?? "Unknown",
      "Integrity Impact": IMPACT_LABELS[metrics.VI ?? ""] ?? metrics.VI ?? "Unknown",
      "Availability Impact": IMPACT_LABELS[metrics.VA ?? ""] ?? metrics.VA ?? "Unknown",
      "Subsequent Confidentiality": IMPACT_LABELS[metrics.SC ?? ""] ?? metrics.SC ?? "Unknown",
      "Subsequent Integrity": IMPACT_LABELS[metrics.SI ?? ""] ?? metrics.SI ?? "Unknown",
      "Subsequent Availability": IMPACT_LABELS[metrics.SA ?? ""] ?? metrics.SA ?? "Unknown",
    };
  } else {
    // CVSS 3.1
    base.attackVector = metrics.AV as any;
    base.attackComplexity = metrics.AC as any;
    base.privilegesRequired = metrics.PR as any;
    base.userInteraction = metrics.UI as any;
    base.scope = metrics.S as any;
    base.confidentialityImpact = metrics.C as any;
    base.integrityImpact = metrics.I as any;
    base.availabilityImpact = metrics.A as any;

    base.labels = {
      "Attack Vector": AV_LABELS[metrics.AV ?? ""] ?? metrics.AV ?? "Unknown",
      "Attack Complexity": AC_LABELS[metrics.AC ?? ""] ?? metrics.AC ?? "Unknown",
      "Privileges Required": PR_LABELS[metrics.PR ?? ""] ?? metrics.PR ?? "Unknown",
      "User Interaction": UI_LABELS[metrics.UI ?? ""] ?? metrics.UI ?? "Unknown",
      Scope: S_LABELS[metrics.S ?? ""] ?? metrics.S ?? "Unknown",
      "Confidentiality Impact": IMPACT_LABELS[metrics.C ?? ""] ?? metrics.C ?? "Unknown",
      "Integrity Impact": IMPACT_LABELS[metrics.I ?? ""] ?? metrics.I ?? "Unknown",
      "Availability Impact": IMPACT_LABELS[metrics.A ?? ""] ?? metrics.A ?? "Unknown",
    };
  }

  return base;
}

export function formatCvssMetricLabel(key: string, value: string | null): string {
  if (!value) return "Unknown";
  const labelMaps: Record<string, Record<string, string>> = {
    "Attack Vector": AV_LABELS,
    "Attack Complexity": AC_LABELS,
    "Privileges Required": PR_LABELS,
    "User Interaction": UI_LABELS,
    Scope: S_LABELS,
    "Confidentiality Impact": IMPACT_LABELS,
    "Integrity Impact": IMPACT_LABELS,
    "Availability Impact": IMPACT_LABELS,
    Authentication: AUTH_LABELS,
    "Attack Requirements": AR_LABELS,
  };
  const map = labelMaps[key];
  if (map) return map[value] ?? value;
  return value;
}
