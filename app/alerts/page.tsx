// app/alerts/page.tsx

import { getCommunityAlerts } from "@/lib/community/community-store";
import { CommunityAlert } from "@/lib/community/community-types";

export const dynamic = "force-dynamic"; // always read latest from disk

function formatRiskType(riskType: CommunityAlert["riskType"]) {
  return riskType
    .toLowerCase()
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

export default async function AlertsPage() {
  const alerts = await getCommunityAlerts();

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Community Safety Alerts
        </h1>
        <p className="text-sm text-gray-600">
          Community-reported hotspots and safety alerts. These are submitted by
          local neighbourhood watch partners and may not be independently
          verified. Always stay alert and use your own judgement.
        </p>
      </header>

      {alerts.length === 0 ? (
        <p className="text-gray-700 text-sm">
          No community alerts have been captured yet. Once neighbourhood watch
          partners start submitting incidents, they&apos;ll show up here and on
          the map.
        </p>
      ) : (
        <ul className="space-y-4">
          {alerts.map((a) => (
            <li
              key={a.id}
              className="border rounded-lg p-4 shadow-sm bg-white space-y-1"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <div className="text-sm font-semibold">
                    {a.summary || a.intersectionName}
                  </div>
                  <div className="text-xs text-gray-600">
                    {a.intersectionName}
                    {a.suburb ? `, ${a.suburb}` : ""}
                    {a.city ? `, ${a.city}` : ""}
                    {a.province ? `, ${a.province}` : ""}
                  </div>
                  <div className="text-xs text-gray-500">
                    Type: {formatRiskType(a.riskType)} · Source: Community ·
                    Incidents: {a.incidentCount}
                  </div>
                  {a.lastReportedAt && (
                    <div className="text-xs text-gray-500">
                      Last reported:{" "}
                      {new Date(a.lastReportedAt).toLocaleString()}
                    </div>
                  )}
                </div>
                {a.partnerOrganisation || a.partnerName ? (
                  <div className="text-right text-[11px] text-gray-500">
                    Submitted by
                    <br />
                    {a.partnerOrganisation && (
                      <span className="font-medium">
                        {a.partnerOrganisation}
                      </span>
                    )}
                    {a.partnerName && (
                      <>
                        <br />
                        <span>{a.partnerName}</span>
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
