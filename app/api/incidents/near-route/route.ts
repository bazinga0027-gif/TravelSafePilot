export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  findIncidentsNearRoute,
  LatLng,
} from "@/lib/incidentStore";

interface NearRouteRequestBody {
  points: LatLng[];
  corridorKm?: number;
  sinceHours?: number;
  minSeverity?: number;
  maxSeverity?: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as NearRouteRequestBody;

    if (!Array.isArray(body.points) || body.points.length < 2) {
      return NextResponse.json(
        { error: "points must be an array of at least 2 LatLng entries" },
        { status: 400 }
      );
    }

    const points = body.points.filter(
      (p) =>
        p &&
        typeof p.lat === "number" &&
        typeof p.lng === "number" &&
        Number.isFinite(p.lat) &&
        Number.isFinite(p.lng)
    );

    if (points.length < 2) {
      return NextResponse.json(
        { error: "points must contain valid lat/lng entries" },
        { status: 400 }
      );
    }

    const corridorKm = body.corridorKm ?? 1.0;
    const sinceHours = body.sinceHours ?? 72;
    const minSeverity =
      body.minSeverity != null ? (body.minSeverity as any) : undefined;
    const maxSeverity =
      body.maxSeverity != null ? (body.maxSeverity as any) : undefined;

    const { incidents, maxSeverity: highest } = findIncidentsNearRoute(points, {
      corridorKm,
      sinceHours,
      minSeverity,
      maxSeverity,
    });

    const total = incidents.length;
    let riskScore: number | null = null;
    if (highest != null && total > 0) {
      riskScore = highest * Math.log(1 + total);
    }

    return NextResponse.json({
      corridorKm,
      sinceHours,
      total,
      highestSeverity: highest,
      riskScore,
      incidents,
    });
  } catch (err) {
    console.error("POST /api/incidents/near-route error:", err);
    return NextResponse.json(
      { error: "Failed to analyze incidents near route" },
      { status: 500 }
    );
  }
}
