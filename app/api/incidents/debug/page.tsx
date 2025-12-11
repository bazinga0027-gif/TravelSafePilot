"use client";

import { useEffect, useState } from "react";

type IncidentType =
  | "crime"
  | "protest"
  | "roadblock"
  | "unrest"
  | "accident"
  | "theft"
  | "hijacking"
  | "other";

type SeverityLevel = 1 | 2 | 3 | 4 | 5;

interface Incident {
  id: string;
  title: string;
  summary?: string;
  incidentType: IncidentType;
  severity: SeverityLevel;
  lat: number;
  lng: number;
  radiusMeters?: number | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
  reportedAt: string;
  validFrom?: string | null;
  validTo?: string | null;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export default function IncidentsDebugPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [sinceHours, setSinceHours] = useState<string>("72");
  const [minSeverity, setMinSeverity] = useState<string>("1");
  const [maxSeverity, setMaxSeverity] = useState<string>("5");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (sinceHours) params.set("sinceHours", sinceHours);
      if (minSeverity) params.set("minSeverity", minSeverity);
      if (maxSeverity) params.set("maxSeverity", maxSeverity);

      const res = await fetch(`/api/incidents?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed: ${res.status}`);
      }
      const data = (await res.json()) as Incident[];
      setIncidents(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Failed to load incidents");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Incident Intelligence – Debug</h1>
        <p className="text-sm text-gray-600">
          View incidents currently stored in the TravelSafePilot incident
          registry. This is a developer/operator page.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="font-semibold text-sm">Filters</h2>
        <div className="flex flex-wrap gap-3 text-sm items-end">
          <div>
            <label className="block text-xs font-medium">Since (hours)</label>
            <input
              type="number"
              value={sinceHours}
              onChange={(e) => setSinceHours(e.target.value)}
              className="border rounded px-2 py-1 w-24"
            />
          </div>
          <div>
            <label className="block text-xs font-medium">Min severity</label>
            <input
              type="number"
              min={1}
              max={5}
              value={minSeverity}
              onChange={(e) => setMinSeverity(e.target.value)}
              className="border rounded px-2 py-1 w-24"
            />
          </div>
          <div>
            <label className="block text-xs font-medium">Max severity</label>
            <input
              type="number"
              min={1}
              max={5}
              value={maxSeverity}
              onChange={(e) => setMaxSeverity(e.target.value)}
              className="border rounded px-2 py-1 w-24"
            />
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="px-4 py-1.5 rounded bg-black text-white text-xs disabled:opacity-60"
          >
            {loading ? "Loading..." : "Apply"}
          </button>
        </div>
      </section>

      {error && (
        <div className="border border-red-300 bg-red-50 text-red-800 px-4 py-2 rounded text-sm">
          {error}
        </div>
      )}

      <section className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <h2 className="font-semibold">Incidents</h2>
          <span className="text-gray-500">{incidents.length} found</span>
        </div>

        {incidents.length === 0 ? (
          <p className="text-sm text-gray-500">
            No incidents stored yet. You can POST to <code>/api/incidents</code>{" "}
            to seed test data or later connect real feeds (GDELT, news APIs,
            etc.).
          </p>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 text-left">Title</th>
                  <th className="p-2 text-left">Type</th>
                  <th className="p-2 text-left">Severity</th>
                  <th className="p-2 text-left">When</th>
                  <th className="p-2 text-left">Location</th>
                  <th className="p-2 text-left">Source</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((i) => (
                  <tr key={i.id} className="border-t">
                    <td className="p-2">
                      <div className="font-medium">{i.title}</div>
                      {i.summary && (
                        <div className="text-[11px] text-gray-600 line-clamp-2">
                          {i.summary}
                        </div>
                      )}
                    </td>
                    <td className="p-2 capitalize">{i.incidentType}</td>
                    <td className="p-2">{i.severity}</td>
                    <td className="p-2">
                      <div>{new Date(i.reportedAt).toLocaleString()}</div>
                      {i.validTo && (
                        <div className="text-[11px] text-gray-500">
                          until {new Date(i.validTo).toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td className="p-2 text-[11px]">
                      {i.lat.toFixed(4)}, {i.lng.toFixed(4)}
                      {i.radiusMeters
                        ? ` (±${Math.round(i.radiusMeters)}m)`
                        : ""}
                    </td>
                    <td className="p-2 text-[11px]">
                      {i.sourceUrl ? (
                        <a
                          href={i.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 underline"
                        >
                          {i.sourceName || "Source"}
                        </a>
                      ) : (
                        i.sourceName || "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
