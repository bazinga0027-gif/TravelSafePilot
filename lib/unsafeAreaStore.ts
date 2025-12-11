import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

export type UnsafeAreaType = "permanent" | "temporary";
export type RiskLevel = "low" | "medium" | "high" | "extreme";

export interface UnsafeArea {
  id: string;
  name: string;
  city?: string;
  province?: string;
  country?: string;
  type: UnsafeAreaType;
  riskLevel: RiskLevel;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  notes?: string | null;
  geometry: any; // Expecting GeoJSON Polygon / MultiPolygon, can tighten later
  createdAt: string;
  updatedAt: string;
}

const DATA_FILE = path.join(process.cwd(), "data", "unsafe-areas.json");

function ensureDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, "[]", "utf-8");
  }
}

function readAll(): UnsafeArea[] {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as UnsafeArea[];
    }
    return [];
  } catch {
    return [];
  }
}

function writeAll(areas: UnsafeArea[]) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(areas, null, 2), "utf-8");
}

export function getAllUnsafeAreas(): UnsafeArea[] {
  return readAll().sort((a, b) => a.name.localeCompare(b.name));
}

export function getUnsafeAreaById(id: string): UnsafeArea | undefined {
  return readAll().find((a) => a.id === id);
}

export interface UnsafeAreaInput {
  name: string;
  city?: string;
  province?: string;
  country?: string;
  type: UnsafeAreaType;
  riskLevel: RiskLevel;
  isActive?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  notes?: string | null;
  geometry: any; // GeoJSON
}

export function createUnsafeArea(input: UnsafeAreaInput): UnsafeArea {
  const areas = readAll();
  const now = new Date().toISOString();

  const area: UnsafeArea = {
    id: randomUUID(),
    name: input.name,
    city: input.city,
    province: input.province,
    country: input.country ?? "South Africa",
    type: input.type,
    riskLevel: input.riskLevel,
    isActive: input.isActive ?? true,
    startsAt: input.startsAt ?? null,
    endsAt: input.endsAt ?? null,
    notes: input.notes ?? null,
    geometry: input.geometry,
    createdAt: now,
    updatedAt: now,
  };

  areas.push(area);
  writeAll(areas);
  return area;
}

export function updateUnsafeArea(
  id: string,
  input: Partial<UnsafeAreaInput>
): UnsafeArea | undefined {
  const areas = readAll();
  const index = areas.findIndex((a) => a.id === id);
  if (index === -1) return undefined;

  const now = new Date().toISOString();
  const existing = areas[index];

  const updated: UnsafeArea = {
    ...existing,
    ...input,
    country: input.country ?? existing.country,
    isActive: input.isActive ?? existing.isActive,
    startsAt: input.startsAt ?? existing.startsAt,
    endsAt: input.endsAt ?? existing.endsAt,
    notes: input.notes ?? existing.notes,
    geometry: input.geometry ?? existing.geometry,
    updatedAt: now,
  };

  areas[index] = updated;
  writeAll(areas);
  return updated;
}

export function deleteUnsafeArea(id: string): boolean {
  const areas = readAll();
  const filtered = areas.filter((a) => a.id !== id);
  if (filtered.length === areas.length) return false;
  writeAll(filtered);
  return true;
}
