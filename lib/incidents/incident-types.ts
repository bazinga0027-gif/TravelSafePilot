// lib/incidents/incident-types.ts

export type IncidentCategory =
  | "CRIME"
  | "PROTEST"
  | "ROAD_CLOSURE"
  | "ACCIDENT"
  | "UNREST"
  | "OTHER";

export type IncidentSourceType = "NEWS" | "OFFICIAL" | "COMMUNITY" | "OTHER";

export interface Incident {
  id: string;

  // core geo position
  latitude: number;
  longitude: number;

  // optional human-readable location fields used in UI
  street?: string;
  suburb?: string;
  city?: string;
  province?: string;

  title: string;
  category: IncidentCategory;
  summary: string;

  // optional finer-grained category (e.g. "Hijacking", "Armed robbery")
  subCategory?: string;

  // source metadata
  source: IncidentSourceType;
  sourceName?: string; // e.g. "News24", "City of Cape Town"
  sourceType?: string; // optional extra label used in some UIs

  url?: string;

  occurredAt?: string;   // ISO
  createdAt: string;     // ISO
  expiresAt: string;     // ISO

  // numeric 1–5 severity used for weighting / display
  severity?: number;     // 1–5, optional weight
  isActive: boolean;

  // when this record was last updated/seen, used on the incidents page
  lastUpdatedAt?: string; // ISO
}

export const INCIDENT_TTL_DAYS = 7;

export function computeIncidentExpiryDate(days?: number): string {
  const d = new Date();
  d.setDate(d.getDate() + (days ?? INCIDENT_TTL_DAYS));
  return d.toISOString();
}

// Alias Incident → IncidentRecord, matching imports in page.tsx
export type IncidentRecord = Incident;
