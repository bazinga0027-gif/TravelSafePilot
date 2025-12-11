export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  getUnsafeAreaById,
  updateUnsafeArea,
  deleteUnsafeArea,
  UnsafeAreaInput,
} from "@/lib/unsafeAreaStore";

// Next 16's validator expects: context: { params: Promise<{ id: string }> }
type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const area = getUnsafeAreaById(id);
    if (!area) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(area);
  } catch (err) {
    const { id } = await context.params.catch(() => ({ id: "unknown" }));
    console.error(`GET /api/unsafe-areas/${id} error:`, err);
    return NextResponse.json(
      { error: "Failed to load unsafe area" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const existing = getUnsafeAreaById(id);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = (await req.json()) as Partial<
      UnsafeAreaInput & { geometryJson?: string }
    >;

    let geometry = body.geometry ?? existing.geometry;

    if (body.geometryJson) {
      try {
        geometry = JSON.parse(body.geometryJson);
      } catch {
        return NextResponse.json(
          { error: "Invalid geometryJson: must be valid JSON" },
          { status: 400 }
        );
      }
    }

    const updated = updateUnsafeArea(id, {
      ...body,
      geometry,
    });

    if (!updated) {
      return NextResponse.json(
        { error: "Failed to update unsafe area" },
        { status: 500 }
      );
    }

    return NextResponse.json(updated);
  } catch (err) {
    const { id } = await context.params.catch(() => ({ id: "unknown" }));
    console.error(`PATCH /api/unsafe-areas/${id} error:`, err);
    return NextResponse.json(
      { error: "Failed to update unsafe area" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const ok = deleteUnsafeArea(id);
    if (!ok) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    const { id } = await context.params.catch(() => ({ id: "unknown" }));
    console.error(`DELETE /api/unsafe-areas/${id} error:`, err);
    return NextResponse.json(
      { error: "Failed to delete unsafe area" },
      { status: 500 }
    );
  }
}
