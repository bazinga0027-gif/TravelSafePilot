export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  findIncidentsNearPoint,
  haversineDistanceKm,
} from "@/lib/incidentStore";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const latParam = searchParams.get("lat");
    const lngParam = searchParams.get("lng");
    const radiusParam = searchParams.get("radiusKm") ?? "2";
    const sinceHoursParam = searchParams.get("sinceHours") ?? "72";
    const minSeverityParam = searchParams.get("minSeverity");
    const maxSeverityParam = searchParams.get("maxSeverity");

    if (!latParam || !lngParam) {
      return NextResponse.json(
        { error: "lat and lng are required query parameters" },
        { status: 400 }
      );
    }

    const lat = Number(latParam);
    const lng = Number(lngParam);
    const radiusKm = Number(radiusParam);
    const sinceHours = Number(sinceHoursParam);
    const minSeverity = minSeverityParam
      ? (Number(minSeverityParam) as any)
      : undefined;
    const maxSeverity = maxSeverityParam
      ? (Number(maxSeverityParam) as any)
      : undefined;

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json(
        { error: "Invalid lat or lng" },
        { status: 400 }
      );
    }

    const incidents = findIncidentsNearPoint(
      { lat, lng },
      {
        radiusKm,
        sinceHours,
        minSeverity,
        maxSeverity,
      }
    );

    const total = incidents.length;
    const highestSeverity = incidents.reduce(
      (max, i) => (i.severity > max ? i.severity : max),
      0
    );
    const closestKm =
      incidents.length === 0
        ? null
        : incidents.reduce((min, i) => {
            const d = haversineDistanceKm(
              { lat, lng },
              { lat: i.lat, lng: i.lng }
            );
            return d < min ? d : min;
          }, Number.POSITIVE_INFINITY);

    return NextResponse.json({
      center: { lat, lng },
      radiusKm,
      sinceHours,
      total,
      highestSeverity: highestSeverity || null,
      closestKm,
      incidents,
    });
  } catch (err) {
    console.error("GET /api/incidents/nearby error:", err);
    return NextResponse.json(
      { error: "Failed to load nearby incidents" },
      { status: 500 }
    );
  }
}
