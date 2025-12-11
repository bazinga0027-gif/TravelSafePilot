import { NextResponse } from "next/server";
import {
  getRealtimeEvents,
  addRealtimeEvent,
} from "@/lib/events/realtime-store";
import { RealtimeEvent } from "@/lib/events/realtime-types";

function parseNumber(value: string | null): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

// GET /api/events/realtime?minLat=&maxLat=&minLng=&maxLng=
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const minLat = parseNumber(url.searchParams.get("minLat"));
    const maxLat = parseNumber(url.searchParams.get("maxLat"));
    const minLng = parseNumber(url.searchParams.get("minLng"));
    const maxLng = parseNumber(url.searchParams.get("maxLng"));

    const events = await getRealtimeEvents({
      minLat,
      maxLat,
      minLng,
      maxLng,
      activeOnly: true,
    });

    return NextResponse.json({ events });
  } catch (err) {
    console.error("[GET /api/events/realtime] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch real-time events" },
      { status: 500 }
    );
  }
}

// POST /api/events/realtime
// For now, open; later we’ll lock this to admin / ingesters / NW partners.
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<RealtimeEvent> & {
      category: RealtimeEvent["category"];
      latitude: number;
      longitude: number;
    };

    const { latitude, longitude, category } = body;

    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      !category
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const event = await addRealtimeEvent({
      latitude,
      longitude,
      category,
      subCategory: body.subCategory,
      severity: body.severity,
      sourceType: body.sourceType,
      areaName: body.summary, // or pass something more specific later
      title: body.title,
      summary: body.summary,
      sourceName: body.sourceName,
      sourceUrl: body.sourceUrl,
      externalRefId: body.externalRefId,
      occurredAt: body.occurredAt,
      radiusMeters: body.radiusMeters,
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/events/realtime] error:", err);
    return NextResponse.json(
      { error: "Failed to create real-time event" },
      { status: 500 }
    );
  }
}
