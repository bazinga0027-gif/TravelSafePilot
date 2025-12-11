"use client";

import { useMemo, useState, FormEvent } from "react";
import { getUnsafeAreasForDestination } from "@/lib/unsafe-areas";
import { CATEGORIES, normalizeCategory } from "@/lib/travel-categories";

type PlanItem = { day: number; title: string; details: string };

function buildItinerary(days: number, category: string, destination: string): PlanItem[] {
  const items: PlanItem[] = [];
  const style = normalizeCategory(category);
  for (let i = 1; i <= days; i++) {
    if (style === "Family") {
      items.push({
        day: i,
        title: `Family-friendly highlights (Day ${i})`,
        details: `Plan daytime activities in secure, central locations around ${destination}. Pre-book transport and meals to avoid late detours.`,
      });
    } else if (style === "Sporty") {
      items.push({
        day: i,
        title: `Active day plan (Day ${i})`,
        details: `Early workout or hike with a partner; stick to popular routes. Afternoon recovery and safe urban exploration.`,
      });
    } else if (style === "Adventure") {
      items.push({
        day: i,
        title: `Adventure focus (Day ${i})`,
        details: `Licensed operator for any high-risk activity. Share route and check-in times. Avoid isolated returns after dark.`,
      });
    } else if (style === "Business") {
      items.push({
        day: i,
        title: `Meetings & mobility (Day ${i})`,
        details: `Consolidate meetings by area; use vetted transport. Keep buffer time to avoid rushed, unsafe shortcuts.`,
      });
    } else {
      items.push({
        day: i,
        title: `Relaxed highlights (Day ${i})`,
        details: `Central attractions, scenic viewpoints, and reservations within well-lit districts. Pre-book rides for evenings.`,
      });
    }
  }
  return items;
}

export default function ItineraryPage() {
  const [destination, setDestination] = useState<string>("");
  const [durationDays, setDurationDays] = useState<number>(3);
  const [category, setCategory] = useState<string>("Family");
  const [submitted, setSubmitted] = useState<boolean>(false);

  const unsafeAreas = useMemo(
    () => getUnsafeAreasForDestination(destination),
    [destination]
  );

  const plan = useMemo(
    () => (submitted ? buildItinerary(durationDays, category, destination) : []),
    [submitted, durationDays, category, destination]
  );

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <main className="min-h-screen p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Itinerary</h1>

      <form className="grid md:grid-cols-4 gap-3 items-end" onSubmit={onSubmit}>
        <div className="flex flex-col gap-1">
          <label className="text-sm">Destination</label>
          <input
            type="text"
            placeholder="e.g. Johannesburg, South Africa"
            className="border rounded-xl px-3 py-2"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm">Duration (days)</label>
          <input
            type="number"
            min={1}
            max={30}
            className="border rounded-xl px-3 py-2"
            value={durationDays}
            onChange={(e) => setDurationDays(Number(e.target.value || 1))}
            required
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm">Category</label>
          <select
            className="border rounded-xl px-3 py-2"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className="px-4 py-2 rounded-2xl shadow bg-black text-white">
          Build
        </button>
      </form>

      {submitted && (
        <section className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Plan Summary</h2>
            <p className="text-sm opacity-80">
              {durationDays} day{durationDays > 1 ? "s" : ""} in <strong>{destination}</strong> · Style:{" "}
              <strong>{normalizeCategory(category)}</strong>
            </p>
          </div>

          <div className="space-y-4">
            {plan.map((d) => (
              <div key={d.day} className="rounded-2xl border p-4 space-y-1">
                <h3 className="font-semibold">
                  Day {d.day}: {d.title}
                </h3>
                <p className="text-sm opacity-80">{d.details}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">Areas to Avoid (auto-excluded in routing)</h3>
            {unsafeAreas.length === 0 ? (
              <p className="text-sm opacity-70">
                No permanent exclusion matches yet — routing will still dynamically avoid flagged polygons where
                applicable.
              </p>
            ) : (
              <ul className="list-disc pl-5 text-sm space-y-1">
                {unsafeAreas.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
