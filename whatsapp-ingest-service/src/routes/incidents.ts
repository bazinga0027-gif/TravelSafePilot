// src/routes/incidents.ts
import { Router, Request, Response } from "express";
import { query } from "../db";
import { parseIncidentFromText } from "../services/incidentParser";
import { ParsedIncident } from "../types";

export const incidentsRouter = Router();

/**
 * POST /incidents/from-text
 *
 * Accepts raw text (e.g. copy/paste from WhatsApp) and optional context.
 */
incidentsRouter.post("/incidents/from-text", async (req: Request, res: Response) => {
  try {
    const { text, city, province, country, source } = req.body || {};

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Missing or invalid 'text' field" });
    }

    const parsed: ParsedIncident = parseIncidentFromText(text, {
      defaultCity: city,
      defaultProvince: province,
      defaultCountry: country,
      source: source === "web" || source === "app" || source === "manual" ? source : "web"
    });

    const now = new Date();

    // Columns must match VALUES count exactly.
    const result = await query<{ id: number }>(
      `
        INSERT INTO community_incidents (
          source,
          source_group_id,
          raw_message_id,
          raw_text,
          media_url,
          media_type,
          incident_type,
          category,
          severity,
          lat,
          lng,
          location_text,
          city,
          province,
          country,
          occurred_at,
          reported_at,
          confidence,
          metadata
        )
        VALUES (
          $1,  -- source
          NULL,  -- source_group_id
          NULL,  -- raw_message_id
          $2,  -- raw_text
          NULL,  -- media_url
          NULL,  -- media_type
          $3,  -- incident_type
          $4,  -- category
          $5,  -- severity
          $6,  -- lat
          $7,  -- lng
          $8,  -- location_text
          $9,  -- city
          $10, -- province
          $11, -- country
          $12, -- occurred_at
          $13, -- reported_at
          $14, -- confidence
          $15  -- metadata
        )
        RETURNING id;
      `,
      [
        parsed.source,
        parsed.rawText,
        parsed.incidentType,
        parsed.category,
        parsed.severity,
        parsed.lat,
        parsed.lng,
        parsed.locationText,
        parsed.city,
        parsed.province,
        parsed.country,
        parsed.occurredAt ?? now,
        now,
        parsed.confidence,
        JSON.stringify(parsed.metadata || {})
      ]
    );

    return res.status(201).json({
      status: "ok",
      id: result.rows[0].id,
      parsed
    });
  } catch (err) {
    console.error("Error in /incidents/from-text:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /incidents
 *
 * Fetch incidents for a bounding box and optional time window.
 *
 * Query params:
 *  - north, south, east, west (floats, optional – bbox)
 *  - hours (int, default 24)
 *  - max (int, default 200, max 1000)
 */
incidentsRouter.get("/incidents", async (req: Request, res: Response) => {
  try {
    const { north, south, east, west, hours, max } = req.query;

    const hoursBack = hours ? Number(hours) : 24;
    const maxRows = max ? Math.min(Number(max), 1000) : 200;

    const params: any[] = [];
    const where: string[] = [];

    // Time filter
    params.push(hoursBack);
    where.push(`reported_at >= NOW() - ($1::int || ' hours')::interval`);

    let paramIndex = params.length + 1;

    // Bbox filter if provided
    if (north && south) {
      params.push(Number(south), Number(north));
      where.push(`lat IS NOT NULL AND lat BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
      paramIndex += 2;
    }

    if (east && west) {
      params.push(Number(west), Number(east));
      where.push(`lng IS NOT NULL AND lng BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
      paramIndex += 2;
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    params.push(maxRows);

    const sql = `
      SELECT
        id,
        source,
        source_group_id,
        incident_type,
        category,
        severity,
        lat,
        lng,
        location_text,
        city,
        province,
        country,
        occurred_at,
        reported_at,
        confidence,
        metadata
      FROM community_incidents
      ${whereClause}
      ORDER BY reported_at DESC
      LIMIT $${params.length};
    `;

    const result = await query(sql, params);

    return res.json({
      count: result.rows.length,
      incidents: result.rows
    });
  } catch (err) {
    console.error("Error in GET /incidents:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});
