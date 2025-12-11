// lib/events/realtime-types.ts

export type RealtimeEventSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type RealtimeEventSourceType =
  | "OFFICIAL"
  | "NEWS"
  | "COMMUNITY"
  | "USER_REPORT"
  | "OTHER";

export interface RealtimeEvent {
  id: string;

  // Position
  latitude: number;
  longitude: number;
  radiusMeters: number;

  // Classification
  category:
    | "PROTEST"
    | "ACCIDENT"
    | "ROAD_BLOCKAGE"
    | "POLICE_OPERATION"
    | "INFRASTRUCTURE"
    | "GENERAL_SAFETY";
  subCategory?: string;

  severity: RealtimeEventSeverity;
  sourceType: RealtimeEventSourceType;

  title: string;
  summary: string;

  // Source metadata
  sourceName?: string;
  sourceUrl?: string;
  externalRefId?: string;

  // Timing
  occurredAt?: string; // ISO
  firstSeenAt: string; // ISO
  lastUpdatedAt: string; // ISO
  expiresAt: string; // ISO (real-time → must die)
  isActive: boolean;
}

// Default TTL for real-time events (minutes)
export const REALTIME_EVENT_TTL_MINUTES = 30;

export function computeRealtimeExpiryDate(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + REALTIME_EVENT_TTL_MINUTES);
  return d.toISOString();
}

export function buildRealtimeSummary(input: {
  category: RealtimeEvent["category"];
  subCategory?: string;
  areaName?: string;
}): string {
  const { category, subCategory, areaName } = input;

  const baseMap: Record<RealtimeEvent["category"], string> = {
    PROTEST: "Protest / unrest reported",
    ACCIDENT: "Traffic accident reported",
    ROAD_BLOCKAGE: "Road blockage reported",
    POLICE_OPERATION: "Police activity reported",
    INFRASTRUCTURE: "Infrastructure issue reported",
    GENERAL_SAFETY: "Safety-related event reported",
  };

  const base = baseMap[category] ?? "Real-time safety event reported";
  const sub = subCategory ? ` (${subCategory.replace(/_/g, " ")})` : "";
  const where = areaName ? ` near ${areaName}` : "";

  return `${base}${sub}${where}.`;
}
