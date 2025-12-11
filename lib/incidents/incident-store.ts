// lib/incidents/incident-store.ts

import { promises as fs } from "fs";
import path from "path";
import {
  Incident,
  IncidentCategory,
  IncidentSourceType,
  computeIncidentExpiryDate,
} from "./incident-types";

const DATA_FILE = path.join(process.cwd(), "data", "incidents.json");

async function ensureFileExists() {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, "[]", "utf8");
  }
}

async function readAllIncidents(): Promise<Incident[]> {
  await ensureFileExists();
  const raw = await fs.readFile(DATA_FILE, "utf8");
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as Incident[];
    }
    return [];
  } catch {
    return [];
  }
}

async function writeAllIncidents(incidents: Incident[]): Promise<void> {
  await ensureFileExists();
  await fs.writeFile(DATA_FILE, JSON.stringify(incidents, null, 2), "utf8");
}

export async function getIncidents(params?: {
  minLat?: number;
  maxLat?: number;
  minLng?: number;
  maxLng?: number;
}): Promise<Incident[]> {
  const incidents = await readAllIncidents();
  const nowIso = new Date().toISOString();

  let filtered = incidents.filter(
    (i) => i.isActive && i.expiresAt > nowIso
  );

  const { minLat, maxLat, minLng, maxLng } = params || {};

  if (
    minLat !== undefined &&
    maxLat !== undefined &&
    minLng !== undefined &&
    maxLng !== undefined
  ) {
    filtered = filtered.filter(
      (i) =>
        i.latitude >= minLat &&
        i.latitude <= maxLat &&
        i.longitude >= minLng &&
        i.longitude <= maxLng
    );
  }

  filtered.sort((a, b) => {
    const aTime = a.occurredAt ?? a.createdAt;
    const bTime = b.occurredAt ?? b.createdAt;
    if (aTime < bTime) return 1;
    if (aTime > bTime) return -1;
    return 0;
  });

  return filtered;
}

export async function addIncident(input: {
  latitude: number;
  longitude: number;
  title: string;
  category: IncidentCategory;
  summary: string;
  source: IncidentSourceType;
  sourceName?: string;
  url?: string;
  occurredAt?: string;
  severity?: number;
  ttlDays?: number;
}): Promise<Incident> {
  const incidents = await readAllIncidents();
  const now = new Date().toISOString();

  const incident: Incident = {
    id: `inc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    latitude: input.latitude,
    longitude: input.longitude,
    title: input.title,
    category: input.category,
    summary: input.summary,
    source: input.source,
    sourceName: input.sourceName,
    url: input.url,
    occurredAt: input.occurredAt ?? now,
    createdAt: now,
    expiresAt: computeIncidentExpiryDate(input.ttlDays),
    severity:
      typeof input.severity === "number" && input.severity > 0
        ? input.severity
        : undefined,
    isActive: true,
  };

  incidents.push(incident);
  await writeAllIncidents(incidents);

  return incident;
}
