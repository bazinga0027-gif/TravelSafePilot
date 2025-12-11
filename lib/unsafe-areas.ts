// lib/unsafe-areas.ts
// Simple permanent name registry used by Advice/Itinerary pages.

export type UnsafeRegistry = Record<string, string[]>;

export const UNSAFE_REGISTRY: UnsafeRegistry = {
  // Johannesburg
  johannesburg: ["Hillbrow", "Berea", "Yeoville", "Alexandra (select sections)", "Jeppe"],
  // Cape Town
  "cape town": ["Nyanga", "Khayelitsha", "Philippi"],
  // Durban
  durban: ["Umlazi (select sections)", "KwaMashu (select sections)"],
};

export function getUnsafeAreasForDestination(destRaw: string): string[] {
  const dest = (destRaw || "").toLowerCase();
  if (!dest) return [];
  for (const key of Object.keys(UNSAFE_REGISTRY)) {
    if (dest.includes(key)) return UNSAFE_REGISTRY[key];
  }
  return [];
}
