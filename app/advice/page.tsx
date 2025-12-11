"use client";

import { useMemo, useState, FormEvent } from "react";
import { getUnsafeAreasForDestination } from "@/lib/unsafe-areas";
import { CATEGORIES, normalizeCategory } from "@/lib/travel-categories";

export default function AdvicePage() {
  const [destination, setDestination] = useState<string>("");
  const [durationDays, setDurationDays] = useState<number>(3);
  const [category, setCategory] = useState<string>("Family");
  const [submitted, setSubmitted] = useState<boolean>(false);

  const unsafeAreas = useMemo(
    () => getUnsafeAreasForDestination(destination),
    [destination]
  );

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <main className="min-h-screen p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Travel Advice</h1>

      <form className="grid md:grid-cols-4 gap-3 items-end" onSubmit={onSubmit}>
        <div className="flex flex-col gap-1">
          <label className="text-sm">Destination</label>
          <input
            type="text"
            placeholder="e.g. Cape Town, South Africa"
            className="border rounded-xl px-3 py-2"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            required
          />
          <p className="text-xs opacity-60">
            (Autocomplete upgrade is handled on /maps; plain text is fine here.)
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm">Duration (days)</label>
          <input
            type="number"
            min={1}
            max={60}
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
          Generate
        </button>
      </form>

      {submitted && (
        <section className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Overview</h2>
            <p className="text-sm opacity-80">
              Destination: <strong>{destination || "—"}</strong> · Duration:{" "}
              <strong>
                {durationDays} day{durationDays > 1 ? "s" : ""}
              </strong>{" "}
              · Style: <strong>{category}</strong>
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="font-semibold">Risk Level & Context</h3>
              <ul className="list-disc pl-5 text-sm space-y-1">
                <li>Keep valuables discreet; avoid phone use in hotspot streets and transport nodes.</li>
                <li>Prefer ride-hailing/taxis at night; stick to main roads and lit areas.</li>
                <li>Plan routes in advance; avoid unplanned detours through higher-risk neighborhoods.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold">Category Tips ({normalizeCategory(category)})</h3>
              <ul className="list-disc pl-5 text-sm space-y-1">
                {normalizeCategory(category) === "Family" && (
                  <>
                    <li>Choose attractions with secure parking and on-site security; prefer daytime activities.</li>
                    <li>Carry a small first-aid kit; share location live within your group.</li>
                  </>
                )}
                {normalizeCategory(category) === "Sporty" && (
                  <>
                    <li>For early runs/hikes, go with a partner or group; check trail advisories first.</li>
                    <li>Keep hydration and ID; avoid isolated trails at dawn/dusk.</li>
                  </>
                )}
                {normalizeCategory(category) === "Adventure" && (
                  <>
                    <li>Use licensed operators; verify insurance coverage and radios.</li>
                    <li>Share planned route and check-in times with a contact.</li>
                  </>
                )}
                {normalizeCategory(category) === "Business" && (
                  <>
                    <li>Use hotel-vetted transport; avoid displaying laptops/phones on street.</li>
                    <li>Keep copies of documents; enable device tracking/remote wipe.</li>
                  </>
                )}
                {normalizeCategory(category) === "Romantic" && (
                  <>
                    <li>Book centrally; for evening dinners, pre-book transport door-to-door.</li>
                    <li>Keep minimal valuables on nights out; watch drinks closely.</li>
                  </>
                )}
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">Areas to Avoid (auto-exclude in routes)</h3>
            {unsafeAreas.length === 0 ? (
              <p className="text-sm opacity-70">No specific permanent exclusions matched for this destination.</p>
            ) : (
              <ul className="list-disc pl-5 text-sm space-y-1">
                {unsafeAreas.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            )}
            <p className="text-xs opacity-60">
              Dynamic incident geofences are planned; these will appear automatically once detected.
            </p>
          </div>
        </section>
      )}
    </main>
  );
}
