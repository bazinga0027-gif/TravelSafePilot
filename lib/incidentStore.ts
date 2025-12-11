import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

export type IncidentType =
  | "crime"
  | "protest"
  | "roadblock"
  | "unrest"
  | "accident"
  | "theft"
  | "hijacking"
  | "other";

export type SeverityLevel = 1 | 2 | 3 | 4 | 5;

export interface Incident {
  id: string;
  title: string;
  summary?: string;
  incidentType: IncidentType;
  severity: SeverityLevel;
  lat: number;
  lng: number;
  radiusMeters?: number | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
  reportedAt: string; // ISO
  validFrom?: string | null; // ISO
  validTo?: string | null; // ISO
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

const DATA_FILE = path.join(process.cwd(), "data", "incidents.json");

function ensureDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, "[]", "utf-8");
  }
}

function readAll(): Incident[] {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
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

function writeAll(incidents: Incident[]) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(incidents, null, 2), "utf-8");
}

export interface IncidentInput {
  title: string;
  summary?: string;
  incidentType: IncidentType;
  severity: SeverityLevel;
  lat: number;
  lng: number;
  radiusMeters?: number | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
  reportedAt: string;
  validFrom?: string | null;
  validTo?: string | null;
  tags?: string[];
}

export function getAllIncidents(): Incident[] {
  return readAll().sort(
    (a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()
  );
}

export function addIncident(input: IncidentInput): Incident {
  const incidents = readAll();
  const now = new Date().toISOString();

  const incident: Incident = {
    id: randomUUID(),
    title: input.title,
    summary: input.summary,
    incidentType: input.incidentType,
    severity: input.severity,
    lat: input.lat,
    lng: input.lng,
    radiusMeters: input.radiusMeters ?? null,
    sourceName: input.sourceName ?? null,
    sourceUrl: input.sourceUrl ?? null,
    reportedAt: input.reportedAt,
    validFrom: input.validFrom ?? null,
    validTo: input.validTo ?? null,
    tags: input.tags ?? [],
    createdAt: now,
    updatedAt: now,
  };

  incidents.push(incident);
  writeAll(incidents);
  return incident;
}

export function bulkUpsertIncidents(newOnes: IncidentInput[]): Incident[] {
  // Simple strategy: append all for now.
  // Later we can de-duplicate by (sourceUrl + reportedAt + title).
  const incidents = readAll();
  const now = new Date().toISOString();

  const created: Incident[] = newOnes.map((i) => ({
    id: randomUUID(),
    title: i.title,
    summary: i.summary,
    incidentType: i.incidentType,
    severity: i.severity,
    lat: i.lat,
    lng: i.lng,
    radiusMeters: i.radiusMeters ?? null,
    sourceName: i.sourceName ?? null,
    sourceUrl: i.sourceUrl ?? null,
    reportedAt: i.reportedAt,
    validFrom: i.validFrom ?? null,
    validTo: i.validTo ?? null,
    tags: i.tags ?? [],
    createdAt: now,
    updatedAt: now,
  }));

  incidents.push(...created);
  writeAll(incidents);
  return created;
}

export interface IncidentFilter {
  sinceHours?: number;
  maxSeverity?: SeverityLevel;
  minSeverity?: SeverityLevel;
}

export function getRecentIncidents(filter: IncidentFilter = {}): Incident[] {
  const all = getAllIncidents();
  const now = Date.now();

  return all.filter((i) => {
    if (filter.sinceHours != null) {
      const cutoff = now - filter.sinceHours * 60 * 60 * 1000;
      if (new Date(i.reportedAt).getTime() < cutoff) return false;
    }

    if (filter.minSeverity != null && i.severity < filter.minSeverity) {
      return false;
    }

    if (filter.maxSeverity != null && i.severity > filter.maxSeverity) {
      return false;
    }

    return true;
  });
}

// --- Geo helpers ---

export interface LatLng {
  lat: number;
  lng: number;
}

export function haversineDistanceKm(a: LatLng, b: LatLng): number {
  const R = 6371; // km
  const dLat = deg2rad(b.lat - a.lat);
  const dLng = deg2rad(b.lng - a.lng);
  const la1 = deg2rad(a.lat);
  const la2 = deg2rad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const c =
    2 *
    Math.atan2(
      Math.sqrt(
        sinDLat * sinDLat +
          Math.cos(la1) * Math.cos(la2) * sinDLng * sinDLng
      ),
      Math.sqrt(
        1 -
          (sinDLat * sinDLat +
            Math.cos(la1) * Math.cos(la2) * sinDLng * sinDLng)
      )
    );

  return R * c;
}

function deg2rad(d: number): number {
  return (d * Math.PI) / 180;
}

export interface NearbyOptions extends IncidentFilter {
  radiusKm: number;
}

export function findIncidentsNearPoint(
  center: LatLng,
  opts: NearbyOptions
): Incident[] {
  const recent = getRecentIncidents(opts);

  return recent.filter((i) => {
    const distKm = haversineDistanceKm(center, { lat: i.lat, lng: i.lng });
    const effectiveRadiusKm =
      (i.radiusMeters ?? 0) > 0 ? (i.radiusMeters as number) / 1000 : 0;
    return distKm <= opts.radiusKm + effectiveRadiusKm;
  });
}

export interface RouteNearbyOptions extends IncidentFilter {
  corridorKm: number;
}

export function findIncidentsNearRoute(
  points: LatLng[],
  opts: RouteNearbyOptions
): { incidents: Incident[]; maxSeverity: SeverityLevel | null } {
  const recent = getRecentIncidents(opts);
  const corridor = opts.corridorKm;

  const hits: Incident[] = [];
  let maxSeverity: SeverityLevel | null = null;

  for (const incident of recent) {
    let nearestKm = Number.POSITIVE_INFINITY;
    for (const p of points) {
      const distKm = haversineDistanceKm(
        { lat: incident.lat, lng: incident.lng },
        p
      );
      if (distKm < nearestKm) nearestKm = distKm;
      if (nearestKm <= corridor) break;
    }

    const effectiveRadiusKm =
      (incident.radiusMeters ?? 0) > 0
        ? (incident.radiusMeters as number) / 1000
        : 0;

    if (nearestKm <= corridor + effectiveRadiusKm) {
      hits.push(incident);
      if (maxSeverity === null || incident.severity > maxSeverity) {
        maxSeverity = incident.severity;
      }
    }
  }

  return { incidents: hits, maxSeverity };
}
