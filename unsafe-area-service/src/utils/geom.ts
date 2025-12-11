import { LngLat } from "../types/geo";

/**
 * Build WKT POLYGON from an array of [lng, lat] pairs.
 * Ensures closure (first == last) automatically.
 */
export function buildPolygonWkt(coords: LngLat[]): string {
  if (coords.length < 3) {
    throw new Error("Polygon requires at least 3 coordinates");
  }

  const closed =
    coords[0][0] === coords[coords.length - 1][0] &&
    coords[0][1] === coords[coords.length - 1][1]
      ? coords
      : [...coords, coords[0]];

  const coordStr = closed
    .map(([lng, lat]) => `${lng} ${lat}`)
    .join(", ");

  return `POLYGON((${coordStr}))`;
}

/**
 * Build WKT LINESTRING from an array of [lng, lat] pairs.
 */
export function buildLineStringWkt(coords: LngLat[]): string {
  if (coords.length < 2) {
    throw new Error("LineString requires at least 2 coordinates");
  }

  const coordStr = coords
    .map(([lng, lat]) => `${lng} ${lat}`)
    .join(", ");

  return `LINESTRING(${coordStr})`;
}
