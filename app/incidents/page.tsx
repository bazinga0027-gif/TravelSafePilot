import { getIncidents } from "@/lib/incidents/incident-store";
import { IncidentRecord } from "@/lib/incidents/incident-types";

export const dynamic = "force-dynamic";

// Severity is defined as number | undefined in IncidentRecord
// We'll convert numeric severities into readable labels.
function formatSeverity(sev: IncidentRecord["severity"]) {
  if (sev == null) return "Unknown";

  // Example scale:
  // 1–2 → Low
  // 3 → Medium
  // 4 → High
  // 5 → Critical
  if (sev <= 2) return "Low";
  if (sev === 3) return "Medium";
  if (sev === 4) return "High";
  if (sev >= 5) return "Critical";

  return String(sev);
}

export default async function IncidentsPage() {
  // Removed { activeOnly: true } to match getIncidents() signature
  const incidents = await getIncidents();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Incident Intelligence
        </h1>
        <p className="text-sm text-gray-600">
          Verified and structured safety incidents from official and news
          sources. These can be used to inform routes, trip planning, and
          advisory screens in TravelSafePilot.
        </p>
      </header>

      {incidents.length === 0 ? (
        <p className="text-gray-700 text-sm">
          No incidents have been captured yet. As data sources are connected
          (news APIs, official feeds, etc.), they&apos;ll be visible here and
          on the map.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">Title</th>
                <th className="px-3 py-2 text-left">Location</th>
                <th className="px-3 py-2 text-left">Category</th>
                <th className="px-3 py-2 text-left">Severity</th>
                <th className="px-3 py-2 text-left">Source</th>
                <th className="px-3 py-2 text-left">Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((i) => (
                <tr key={i.id} className="border-t last:border-b">
                  <td className="px-3 py-2 align-top">
                    <div className="font-medium">{i.title}</div>
                    <div className="text-xs text-gray-600 line-clamp-2">
                      {i.summary}
                    </div>
                  </td>

                  <td className="px-3 py-2 align-top text-xs text-gray-700">
                    {[i.street, i.suburb, i.city, i.province]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </td>

                  <td className="px-3 py-2 align-top text-xs text-gray-700">
                    {i.category}
                    {i.subCategory ? ` / ${i.subCategory}` : ""}
                  </td>

                  <td className="px-3 py-2 align-top text-xs text-gray-700">
                    {formatSeverity(i.severity)}
                  </td>

                  <td className="px-3 py-2 align-top text-xs text-gray-700">
                    {i.sourceName || i.sourceType}
                  </td>

                  <td className="px-3 py-2 align-top text-xs text-gray-600">
                    {i.lastUpdatedAt
                      ? new Date(i.lastUpdatedAt).toLocaleString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
