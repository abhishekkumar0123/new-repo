import {
  checkNvdAvailability,
} from "./nvd";
import {
  checkCisaKevAvailability,
} from "./cisa-kev";
import {
  checkFirstEpssAvailability,
} from "./epss";

export {
  fetchNvdCveList,
  fetchNvdCveById,
  checkNvdAvailability,
  type CveSearchParams,
} from "./nvd";

export {
  enrichCveWithKev,
  checkKevStatusForCve,
  checkCisaKevAvailability,
  clearKevCache,
  getCachedKevFeed,
} from "./cisa-kev";

export {
  enrichCveWithEpss,
  checkFirstEpssAvailability,
  clearEpssCache,
  fetchEpssBatch,
} from "./epss";

import type { CveIntelligenceStatus } from "../types";

export async function checkCveIntelligenceStatus(): Promise<CveIntelligenceStatus> {
  const [nvd, cisaKev, firstEpss] = await Promise.all([
    checkNvdAvailability(),
    checkCisaKevAvailability(),
    checkFirstEpssAvailability(),
  ]);

  return {
    nvd,
    cisaKev,
    firstEpss,
    lastRefresh: new Date().toISOString(),
  };
}
