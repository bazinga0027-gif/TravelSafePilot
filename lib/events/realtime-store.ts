// lib/events/realtime-store.ts

import { promises as fs } from "fs";
import path from "path";
import {
  RealtimeEvent,
  RealtimeEventSeverity,
  RealtimeEventSourceType,
  REALTIME_EVENT_TTL_MINUTES,
  computeRealtimeExpiryDate,
  buildRealtimeSummary,
} from "./realtime-types";

const DATA_FILE = path.join(process.cwd(), "data", "realtime-events.json");

async function ensureFile() {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, "[]", "utf8");
  }
}

async function readAllEvents(): Promise<RealtimeEvent[]> {
  await ensureFile();
  const raw = await fs.readFile(DATA_FILE, "utf8");
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as RealtimeEvent[];
    }
    return [];
  } catch {
    return [];
  }
}

async function writeAllEvents(events: RealtimeEvent[]): Promise<void> {
  await ensureFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(events, null, 2), "utf8");
}

/**
 * Get real-time events, optionally filtered by bbox.
 * Expired events are auto-deactivated here.
 */
export async function getRealtimeEvents(params?: {
  minLat?: number;
  maxLat?: number;
  minLng?: number;
  maxLng?: number;
  activeOnly?: boolean;
}): Promise<RealtimeEvent[]> {
  const nowIso = new Date().toISOString();
  let all = await readAllEvents();

  // Auto-deactivate expired events
  let changed = false;
  all = all.map((ev) => {
    if (ev.isActive && ev.expiresAt && ev.expiresAt <= nowIso) {
      changed = true;
      return { ...ev, isActive: false };
    }
    return ev;
  });
  if (changed) {
    await writeAllEvents(all);
  }

  const { minLat, maxLat, minLng, maxLng, activeOnly = true } = params || {};
  let filtered = all;

  if (activeOnly) {
    filtered = filtered.filter((ev) => ev.isActive);
  }

  if (
    minLat !== undefined &&
    maxLat !== undefined &&
    minLng !== undefined &&
    maxLng !== undefined
  ) {
    filtered = filtered.filter(
      (ev) =>
        ev.latitude >= minLat &&
        ev.latitude <= maxLat &&
        ev.longitude >= minLng &&
        ev.longitude <= maxLng
    );
  }

  filtered.sort((a, b) => {
    const aTime = a.lastUpdatedAt || a.firstSeenAt;
    const bTime = b.lastUpdatedAt || b.firstSeenAt;
    if (aTime < bTime) return 1;
    if (aTime > bTime) return -1;
    return 0;
  });

  return filtered;
}

/**
 * Add a new real-time event (manual or via ingester).
 */
export async function addRealtimeEvent(input: {
  latitude: number;
  longitude: number;
  category: RealtimeEvent["category"];
  subCategory?: string;
  severity?: RealtimeEventSeverity;
  sourceType?: RealtimeEventSourceType;
  areaName?: string;
  title?: string;
  summary?: string;
  sourceName?: string;
  sourceUrl?: string;
  externalRefId?: string;
  occurredAt?: string;
  radiusMeters?: number;
}): Promise<RealtimeEvent> {
  const {
    latitude,
    longitude,
    category,
    subCategory,
    severity = "MEDIUM",
    sourceType = "OTHER",
    areaName,
    title,
    summary,
    sourceName,
    sourceUrl,
    externalRefId,
    occurredAt,
    radiusMeters = 200,
  } = input;

  const nowIso = new Date().toISOString();

  const computedSummary =
    summary ||
    buildRealtimeSummary({
      category,
      subCategory,
      areaName,
    });

  const computedTitle =
    title ||
    `${category} real-time event${
      subCategory ? `: ${subCategory.replace(/_/g, " ")}` : ""
    }`;

  const event: RealtimeEvent = {
    id: `rt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    latitude,
    longitude,
    radiusMeters,
    category,
    subCategory,
    severity,
    sourceType,
    title: computedTitle,
    summary: computedSummary,
    sourceName,
    sourceUrl,
    externalRefId,
    occurredAt,
    firstSeenAt: nowIso,
    lastUpdatedAt: nowIso,
    expiresAt: computeRealtimeExpiryDate(),
    isActive: true,
  };

  const all = await readAllEvents();
  all.push(event);
  await writeAllEvents(all);

  return event;
}

/**
 * Upsert by externalRefId — for feeds that re-send updates for same event.
 */
export async function upsertRealtimeEventByExternalRef(
  externalRefId: string,
  input: Omit<Parameters<typeof addRealtimeEvent>[0], "externalRefId">
): Promise<RealtimeEvent> {
  const all = await readAllEvents();
  const nowIso = new Date().toISOString();

  let existing = all.find((ev) => ev.externalRefId === externalRefId);

  if (!existing) {
    const created = await addRealtimeEvent({
      ...input,
      externalRefId,
    });
    return created;
  }

  existing = {
    ...existing,
    ...input,
    externalRefId,
    lastUpdatedAt: nowIso,
  };

  const updated = all.map((ev) => (ev.id === existing!.id ? existing! : ev));
  await writeAllEvents(updated);

  return existing;
}
