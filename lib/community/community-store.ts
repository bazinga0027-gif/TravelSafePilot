// lib/community/community-store.ts

import { promises as fs } from "fs";
import path from "path";
import {
  CommunityAlert,
  CommunityRiskType,
  COMMUNITY_ALERT_TTL_DAYS,
  buildSummary,
  computeExpiryDate,
} from "./community-types";

const DATA_FILE = path.join(process.cwd(), "data", "community-alerts.json");

async function ensureFileExists() {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, "[]", "utf8");
  }
}

async function readAllAlerts(): Promise<CommunityAlert[]> {
  await ensureFileExists();
  const raw = await fs.readFile(DATA_FILE, "utf8");
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as CommunityAlert[];
    }
    return [];
  } catch {
    return [];
  }
}

async function writeAllAlerts(alerts: CommunityAlert[]): Promise<void> {
  await ensureFileExists();
  await fs.writeFile(DATA_FILE, JSON.stringify(alerts, null, 2), "utf8");
}

export async function getCommunityAlerts(params?: {
  minLat?: number;
  maxLat?: number;
  minLng?: number;
  maxLng?: number;
}): Promise<CommunityAlert[]> {
  const alerts = await readAllAlerts();
  const nowIso = new Date().toISOString();

  let filtered = alerts.filter(
    (a) => a.isActive && a.expiresAt > nowIso // simple string compare on ISO works
  );

  const { minLat, maxLat, minLng, maxLng } = params || {};

  if (
    minLat !== undefined &&
    maxLat !== undefined &&
    minLng !== undefined &&
    maxLng !== undefined
  ) {
    filtered = filtered.filter(
      (a) =>
        a.latitude >= minLat &&
        a.latitude <= maxLat &&
        a.longitude >= minLng &&
        a.longitude <= maxLng
    );
  }

  // sort newest first
  filtered.sort((a, b) => {
    const aTime = a.lastReportedAt ?? a.firstReportedAt ?? a.expiresAt;
    const bTime = b.lastReportedAt ?? b.firstReportedAt ?? b.expiresAt;
    if (aTime < bTime) return 1;
    if (aTime > bTime) return -1;
    return 0;
  });

  return filtered;
}

export async function addCommunityAlert(input: {
  latitude: number;
  longitude: number;
  intersectionName: string;
  suburb?: string;
  city?: string;
  province?: string;
  riskType: CommunityRiskType;
  incidentCount?: number;
  detailsInternal?: string;
  partnerName?: string;
  partnerOrganisation?: string;
}): Promise<CommunityAlert> {
  const alerts = await readAllAlerts();
  const now = new Date().toISOString();
  const incidentCount =
    typeof input.incidentCount === "number" && input.incidentCount > 0
      ? input.incidentCount
      : 1;

  const alert: CommunityAlert = {
    id: `ca_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    latitude: input.latitude,
    longitude: input.longitude,
    intersectionName: input.intersectionName,
    suburb: input.suburb,
    city: input.city,
    province: input.province,
    riskType: input.riskType,
    summary: buildSummary({
      riskType: input.riskType,
      intersectionName: input.intersectionName,
      suburb: input.suburb,
      incidentCount,
    }),
    detailsInternal: input.detailsInternal,
    sourceType: "COMMUNITY",
    verificationStatus: "UNVERIFIED",
    incidentCount,
    firstReportedAt: now,
    lastReportedAt: now,
    expiresAt: computeExpiryDate(),
    riskScore: 10,
    isActive: true,
    partnerName: input.partnerName,
    partnerOrganisation: input.partnerOrganisation,
  };

  alerts.push(alert);
  await writeAllAlerts(alerts);

  return alert;
}
