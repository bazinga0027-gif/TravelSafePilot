// unsafe-area-service/src/routes/alerts.ts
import type { QueryResultRow } from "pg";
import { Router } from "express";
import { z } from "zod";
import { query } from "../db";
import { LngLat } from "../types/geo";

const router = Router();

// [lng, lat]
const lngLatSchema = z.tuple([z.number(), z.number()]);

// Body when creating an alert
const createAlertSchema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  risk_level: z.enum(["low", "medium", "high", "extreme"]),
  category: z.string().min(1),
  center: lngLatSchema,
  radius_m: z.number().positive(),
  polygon: z.array(lngLatSchema).min(3).optional(),
});

// Querystring for bbox lookups
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

// POST /alerts – create an alert
router.post("/", async (req, res, next) => {
  try {
    const parsed = createAlertSchema.parse(req.body);
    const { title, message, risk_level, category, center, radius_m, polygon } =
      parsed;

    const [lng, lat] = center;

    const polygonWkt = polygon ? buildPolygonWkt(polygon) : null;

    const result = await query<{ id: string }>(
      `
      INSERT INTO alerts (
        title,
        message,
        risk_level,
        category,
        center,
        radius_m,
        polygon
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        ST_SetSRID(ST_MakePoint($5, $6), 4326),
        $7,
        CASE WHEN $8 IS NULL THEN NULL ELSE ST_GeomFromText($8, 4326) END
      )
      RETURNING id
      `,
      [title, message, risk_level, category, lng, lat, radius_m, polygonWkt]
    );

    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.flatten() });
    }
    next(err);
  }
});

// GET /alerts?north=&south=&east=&west= – list alerts in bbox
router.get("/", async (req, res, next) => {
  try {
    const { north, south, east, west } = bboxSchema.parse(req.query);

    const result = await query<{
      id: string;
      title: string;
      message: string;
      risk_level: string;
      category: string;
      center_lng: number;
      center_lat: number;
      radius_m: number;
      polygon_wkt: string | null;
    }>(
      `
      SELECT
        id,
        title,
        message,
        risk_level,
        category,
        ST_X(center::geometry) AS center_lng,
        ST_Y(center::geometry) AS center_lat,
        radius_m,
        CASE
          WHEN polygon IS NULL THEN NULL
          ELSE ST_AsText(polygon)
        END AS polygon_wkt
      FROM alerts
      WHERE center && ST_MakeEnvelope($1, $2, $3, $4, 4326)
      `,
      [west, south, east, north]
    );

    const alerts = result.rows.map((row: QueryResultRow) => ({
      id: row.id,
      title: row.title,
      message: row.message,
      risk_level: row.risk_level,
      category: row.category,
      center: [row.center_lng, row.center_lat] as LngLat,
      radius_m: row.radius_m,
      polygon: row.polygon_wkt ? parsePolygonWkt(row.polygon_wkt) : null,
    }));

    res.json({ alerts });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.flatten() });
    }
    next(err);
  }
});

export default router;
