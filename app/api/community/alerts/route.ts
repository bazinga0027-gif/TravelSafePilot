// app/api/community/alerts/route.ts

import { NextResponse } from "next/server";
import {
  getCommunityAlerts,
  addCommunityAlert,
} from "@/lib/community/community-store";
import { CommunityRiskType } from "@/lib/community/community-types";

function parseNumber(value: string | null): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

// GET /api/community/alerts?minLat=&maxLat=&minLng=&maxLng=
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const minLat = parseNumber(url.searchParams.get("minLat"));
    const maxLat = parseNumber(url.searchParams.get("maxLat"));
    const minLng = parseNumber(url.searchParams.get("minLng"));
    const maxLng = parseNumber(url.searchParams.get("maxLng"));

    const alerts = await getCommunityAlerts({
      minLat,
      maxLat,
      minLng,
      maxLng,
    });

    return NextResponse.json({ alerts });
  } catch (err) {
    console.error("[GET /api/community/alerts] error", err);
    return NextResponse.json(
      { error: "Failed to fetch community alerts" },
      { status: 500 }
    );
  }
}

// POST /api/community/alerts
// For now, no auth – we'll lock this down later for you + moderators only.
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      latitude,
      longitude,
      intersectionName,
      suburb,
      city,
      province,
      riskType,
      incidentCount,
      detailsInternal,
      partnerName,
      partnerOrganisation,
    } = body as {
      latitude: number;
      longitude: number;
      intersectionName: string;
      suburb?: string;
      city?: string;
      province?: string;
      riskType: CommunityRiskType;
      incidentCount?: number;
      detailsInternal?: string;
      partnerName?: string;
      partnerOrganisation?: string;
    };

    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      !intersectionName ||
      !riskType
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const alert = await addCommunityAlert({
      latitude,
      longitude,
      intersectionName,
      suburb,
      city,
      province,
      riskType,
      incidentCount,
      detailsInternal,
      partnerName,
      partnerOrganisation,
    });

    return NextResponse.json({ alert }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/community/alerts] error", err);
    return NextResponse.json(
      { error: "Failed to create community alert" },
      { status: 500 }
    );
  }
}
