import { Router } from "express";
import { z } from "zod";
import { query } from "../db";
import { LngLat } from "../types/geo";
import { buildLineStringWkt } from "../utils/geom";

const router = Router();

const evaluateRouteSchema = z.object({
  path: z.array(
    z.tuple([
      z.number(), // lng
      z.number()  // lat
    ]) as any as z.ZodType<LngLat>
  ).min(2),
  country_code: z.string().length(2).optional(),
  city: z.string().optional()
});

type AreaHit = {
  id: string;
  name: string;
  risk_level: "low" | "medium" | "high" | "extreme";
  category: string;
  city: string;
  province: string;
  country_code: string;
};

type AlertHit = {
  id: string;
  title: string;
  risk_level: "low" | "medium" | "high" | "extreme";
  category: string;
  city: string;
  province: string;
  country_code: string;
  radius_m: number;
};

function computeScore(
  areaHits: AreaHit[],
  alertHits: AlertHit[]
): { score: number; label: string } {
  let score = 0;

  const riskWeight: Record<string, number> = {
    low: 1,
    medium: 3,
    high: 6,
    extreme: 10
  };

  for (const a of areaHits) {
    score += riskWeight[a.risk_level] ?? 0;
  }

  for (const alert of alertHits) {
    score += (riskWeight[alert.risk_level] ?? 0) * 0.5;
  }

  let label: string;
  if (score === 0) label = "safe";
  else if (score <= 6) label = "caution";
  else if (score <= 15) label = "unsafe";
  else label = "dangerous";

  return { score, label };
}

router.post("/evaluate", async (req, res) => {
  const parsed = evaluateRouteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { path, country_code, city } = parsed.data;

  try {
    const lineWkt = buildLineStringWkt(path);

    const areaConditions: string[] = ["ST_Intersects(geometry, ST_GeomFromText($1, 4326))"];
    const areaParams: any[] = [lineWkt];

    if (country_code) {
      areaParams.push(country_code.toUpperCase());
      areaConditions.push(`country_code = $${areaParams.length}`);
    }
    if (city) {
      areaParams.push(city);
      areaConditions.push(`city = $${areaParams.length}`);
    }

    const areaWhere = `WHERE ${areaConditions.join(" AND ")}`;

    const areaResult = await query<AreaHit>(
      `
      SELECT
        id, name, risk_level, category, city, province, country_code
      FROM unsafe_areas
      ${areaWhere}
      `,
      areaParams
    );

    const alertConditions: string[] = [
      `
      ST_DWithin(
        center::geography,
        ST_GeogFromText($1),
        radius_m
      )
      `
    ];
    const alertParams: any[] = [lineWkt];

    if (country_code) {
      alertParams.push(country_code.toUpperCase());
      alertConditions.push(`country_code = $${alertParams.length}`);
    }
    if (city) {
      alertParams.push(city);
      alertConditions.push(`city = $${alertParams.length}`);
    }

    const alertWhere = `WHERE ${alertConditions.join(" AND ")}`;

    const alertResult = await query<AlertHit>(
      `
      SELECT
        id, title, risk_level, category, city, province, country_code, radius_m
      FROM unsafe_alerts
      ${alertWhere}
      `,
      alertParams
    );

    const { score, label } = computeScore(areaResult.rows, alertResult.rows);

    res.json({
      score,
      label,
      areas: areaResult.rows,
      alerts: alertResult.rows
    });
  } catch (err) {
    console.error("Error evaluating route", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
