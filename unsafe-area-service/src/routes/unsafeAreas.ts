// unsafe-area-service/src/routes/unsafeAreas.ts
import type { QueryResultRow } from "pg";
import { Router } from "express";
import { z } from "zod";
import { query } from "../db";
import { LngLat } from "../types/geo";

const router = Router();

// [lng, lat]
const lngLatSchema = z.tuple([z.number(), z.number()]);

const createUnsafeAreaSchema = z.object({
  name: z.string().min(1),
  city: z.string().optional(),
  province: z.string().optional(),
  country: z.string().optional(),

  risk_level: z.enum(["low", "medium", "high", "extreme"]),
  category: z.string().min(1),

  // main geometry as ring of [lng, lat]
  polygon: z.array(lngLatSchema).min(3),

  source: z.string().optional(),
  valid_from: z.string().datetime().optional(),
  valid_to: z.string().datetime().optional(),

  permanent: z.boolean().default(true),
  notes: z.string().optional(),
});

const bboxSchema = z.object({
  north: z.coerce.number(),
  south: z.coerce.number(),
  east: z.coerce.number(),
  west: z.coerce.number(),
});

// ---- helpers ----

// LngLat[] -> WKT POLYGON((lng lat, lng lat, ...))
function buildPolygonWkt(ring: LngLat[]): string {
  const coordText = ring.map(([lng, lat]) => `${lng} ${lat}`).join(", ");
  return `POLYGON((${coordText}))`;
}

// WKT POLYGON((lng lat, ...)) -> LngLat[]
function parsePolygonWkt(wkt: string): LngLat[] {
  const coordsText = wkt
    .replace(/^POLYGON\s*\(\(/i, "")
    .replace(/\)\)\s*$/i, "");

  return coordsText.split(",").map((pair) => {
    const [lng, lat] = pair.trim().split(/\s+/).map(Number);
    return [lng, lat] as LngLat;
  });
}

// ---- routes ----

// POST /unsafe-areas – create new unsafe area
router.post("/", async (req, res, next) => {
  try {
    const parsed = createUnsafeAreaSchema.parse(req.body);

    const {
      name,
      city,
      province,
      country,
      risk_level,
      category,
      polygon,
      source,
      valid_from,
      valid_to,
      permanent,
      notes,
    } = parsed;

    const polygonWkt = buildPolygonWkt(polygon);

    const result = await query<{ id: string }>(
      `
      INSERT INTO unsafe_areas (
        name,
        city,
        province,
        country,
        risk_level,
        category,
        geom,
        source,
        valid_from,
        valid_to,
        permanent,
        notes
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        ST_GeomFromText($7, 4326),
        $8,
        $9,
        $10,
        $11,
        $12
      )
      RETURNING id
      `,
      [
        name,
        city ?? null,
        province ?? null,
        country ?? null,
        risk_level,
        category,
        polygonWkt,
        source ?? null,
        valid_from ?? null,
        valid_to ?? null,
        permanent,
        notes ?? null,
      ]
    );

    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.flatten() });
    }
    next(err);
  }
});

// GET /unsafe-areas?north=&south=&east=&west= – list areas in bbox
router.get("/", async (req, res, next) => {
  try {
    const { north, south, east, west } = bboxSchema.parse(req.query);

    const result = await query<{
      id: string;
      name: string;
      city: string | null;
      province: string | null;
      country: string | null;
      risk_level: string;
      category: string;
      source: string | null;
      valid_from: string | null;
      valid_to: string | null;
      permanent: boolean;
      notes: string | null;
      polygon_wkt: string;
    }>(
      `
      SELECT
        id,
        name,
        city,
        province,
        country,
        risk_level,
        category,
        source,
        valid_from,
        valid_to,
        permanent,
        notes,
        ST_AsText(geom) AS polygon_wkt
      FROM unsafe_areas
      WHERE geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)
      `,
      [west, south, east, north]
    );

    const areas = result.rows.map((row: QueryResultRow) => ({
      id: row.id,
      name: row.name,
      city: row.city ?? undefined,
      province: row.province ?? undefined,
      country: row.country ?? undefined,
      risk_level: row.risk_level,
      category: row.category,
      source: row.source ?? undefined,
      valid_from: row.valid_from ?? undefined,
      valid_to: row.valid_to ?? undefined,
      permanent: row.permanent,
      notes: row.notes ?? undefined,
      polygon: parsePolygonWkt(row.polygon_wkt),
    }));

    res.json({ areas });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.flatten() });
    }
    next(err);
  }
});

export default router;
