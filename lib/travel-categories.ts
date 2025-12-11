export const CATEGORIES = ["Family", "Sporty", "Adventure", "Business", "Romantic"] as const;
export type Category = (typeof CATEGORIES)[number];

export function normalizeCategory(cat: string): Category {
  const found = CATEGORIES.find((c) => c.toLowerCase() === (cat || "").toLowerCase());
  return (found || "Family") as Category;
}
