export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

const INCIDENT_SERVICE_URL =
  process.env.INCIDENT_SERVICE_URL || "http://localhost:4002";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const params = new URLSearchParams();

    // Pass through supported filters
    for (const key of ["north", "south", "east", "west", "hours", "max"]) {
      const value = searchParams.get(key);
      if (value) params.set(key, value);
    }

    // Fetch from ingest service
    const res = await fetch(
      `${INCIDENT_SERVICE_URL}/incidents?${params.toString()}`
    );

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    // Translate DB incidents -> frontend incident model
    const incidents = data.incidents.map((inc: any) => ({
      id: inc.id,
      title: inc.incident_type ?? "Incident",
      incidentType: inc.incident_type ?? "unknown",
      severity: inc.severity ?? 1,
      lat: inc.lat,
      lng: inc.lng,
      reportedAt: inc.reported_at,
      city: inc.city,
      rawText: inc.location_text ?? inc.raw_text,
      metadata: inc.metadata
    }));

    return NextResponse.json(incidents);
  } catch (err) {
    console.error("GET /api/incidents error:", err);
    return NextResponse.json(
      { error: "Failed to load incidents" },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    {
      error: "POST /api/incidents is disabled. Use the ingest service instead.",
    },
    { status: 405 }
  );
}
