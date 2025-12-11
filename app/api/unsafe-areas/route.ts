export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  createUnsafeArea,
  getAllUnsafeAreas,
  UnsafeAreaInput,
} from "@/lib/unsafeAreaStore";

export async function GET() {
  try {
    const areas = getAllUnsafeAreas();
    return NextResponse.json(areas);
  } catch (err) {
    console.error("GET /api/unsafe-areas error:", err);
    return NextResponse.json(
      { error: "Failed to load unsafe areas" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as UnsafeAreaInput & {
      geometryJson?: string;
    };

    if (!body.name || !body.type || !body.riskLevel) {
      return NextResponse.json(
        { error: "Missing required fields: name, type, riskLevel" },
        { status: 400 }
      );
    }

    let geometry = body.geometry;

    if (!geometry && body.geometryJson) {
      try {
        geometry = JSON.parse(body.geometryJson);
      } catch {
        return NextResponse.json(
          { error: "Invalid geometryJson: must be valid JSON" },
          { status: 400 }
        );
      }
    }

    if (!geometry) {
      return NextResponse.json(
        { error: "geometry or geometryJson is required" },
        { status: 400 }
      );
    }

    const area = createUnsafeArea({
      name: body.name,
      city: body.city,
      province: body.province,
      country: body.country,
      type: body.type,
      riskLevel: body.riskLevel,
      isActive: body.isActive,
      startsAt: body.startsAt,
      endsAt: body.endsAt,
      notes: body.notes,
      geometry,
    });

    return NextResponse.json(area, { status: 201 });
  } catch (err) {
    console.error("POST /api/unsafe-areas error:", err);
    return NextResponse.json(
      { error: "Failed to create unsafe area" },
      { status: 500 }
    );
  }
}
