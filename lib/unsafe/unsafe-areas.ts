// lib/unsafe/unsafe-areas.ts
// Adapter for legacy MapClient import. Provides polygons + re-exports registry helpers.

export type LatLng = { lat: number; lng: number };
export type UnsafePolygon = {
  name: string;
  city?: string;
  country: string;
  polygon: LatLng[];
};

// Development-friendly polygons (rough boxes). Refine later.
export const PERMANENT_UNSAFE_AREAS: UnsafePolygon[] = [
  // Johannesburg
  {
    name: "Hillbrow",
    city: "Johannesburg",
    country: "ZA",
    polygon: [
      { lat: -26.187, lng: 28.050 },
      { lat: -26.187, lng: 28.058 },
      { lat: -26.197, lng: 28.058 },
      { lat: -26.197, lng: 28.050 },
    ],
  },
  {
    name: "Berea",
    city: "Johannesburg",
    country: "ZA",
    polygon: [
      { lat: -26.189, lng: 28.060 },
      { lat: -26.189, lng: 28.070 },
      { lat: -26.197, lng: 28.070 },
      { lat: -26.197, lng: 28.060 },
    ],
  },
  {
    name: "Yeoville",
    city: "Johannesburg",
    country: "ZA",
    polygon: [
      { lat: -26.181, lng: 28.060 },
      { lat: -26.181, lng: 28.071 },
      { lat: -26.190, lng: 28.071 },
      { lat: -26.190, lng: 28.060 },
    ],
  },
  {
    name: "Alexandra (sections)",
    city: "Johannesburg",
    country: "ZA",
    polygon: [
      { lat: -26.103, lng: 28.102 },
      { lat: -26.103, lng: 28.118 },
      { lat: -26.116, lng: 28.118 },
      { lat: -26.116, lng: 28.102 },
    ],
  },

  // Cape Town
  {
    name: "Khayelitsha",
    city: "Cape Town",
    country: "ZA",
    polygon: [
      { lat: -34.037, lng: 18.658 },
      { lat: -34.037, lng: 18.704 },
      { lat: -34.068, lng: 18.704 },
      { lat: -34.068, lng: 18.658 },
    ],
  },
  {
    name: "Nyanga",
    city: "Cape Town",
    country: "ZA",
    polygon: [
      { lat: -34.008, lng: 18.560 },
      { lat: -34.008, lng: 18.586 },
      { lat: -34.028, lng: 18.586 },
      { lat: -34.028, lng: 18.560 },
    ],
  },
  {
    name: "Philippi",
    city: "Cape Town",
    country: "ZA",
    polygon: [
      { lat: -34.025, lng: 18.575 },
      { lat: -34.025, lng: 18.620 },
      { lat: -34.055, lng: 18.620 },
      { lat: -34.055, lng: 18.575 },
    ],
  },

  // Durban
  {
    name: "Umlazi (sections)",
    city: "Durban",
    country: "ZA",
    polygon: [
      { lat: -29.960, lng: 30.890 },
      { lat: -29.960, lng: 30.930 },
      { lat: -29.990, lng: 30.930 },
      { lat: -29.990, lng: 30.890 },
    ],
  },
  {
    name: "KwaMashu (sections)",
    city: "Durban",
    country: "ZA",
    polygon: [
      { lat: -29.720, lng: 31.010 },
      { lat: -29.720, lng: 31.040 },
      { lat: -29.750, lng: 31.040 },
      { lat: -29.750, lng: 31.010 },
    ],
  },
];

// Keep name registry available to other pages:
export { UNSAFE_REGISTRY, getUnsafeAreasForDestination } from "../unsafe-areas";
