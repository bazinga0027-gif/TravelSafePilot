// app/page.tsx
import Link from "next/link";
import SiteShell from "@/components/SiteShell";

export default function HomePage() {
  return (
    <SiteShell>
      <main className="min-h-[calc(100vh-120px)] bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-4xl px-4 py-16 space-y-8">
          <section className="space-y-4">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              TravelSafePilot
            </h1>
            <p className="text-slate-300 max-w-2xl">
              Plan safer trips with route intelligence, unsafe-area avoidance,
              and live incident awareness. This is the early public version of
              the platform while we wire up maps, WhatsApp ingest and community
              data.
            </p>
          </section>

          <section className="flex flex-wrap gap-3">
            <Link
              href="/maps"
              className="inline-flex items-center justify-center rounded-full border border-emerald-400/60 bg-emerald-500/20 px-6 py-2.5 text-sm font-medium text-emerald-100 hover:bg-emerald-500/30 hover:border-emerald-400 transition"
            >
              Open route planner
            </Link>

            <Link
              href="/contribute"
              className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-900/70 px-6 py-2.5 text-sm font-medium text-slate-100 hover:bg-slate-800 hover:border-emerald-400/60 transition"
            >
              Report unsafe area
            </Link>

            <Link
              href="/sitemap"
              className="inline-flex items-center justify-center rounded-full border border-slate-800 bg-slate-900/50 px-6 py-2.5 text-xs md:text-sm font-medium text-slate-300 hover:bg-slate-800/70 hover:border-emerald-400/40 transition"
            >
              View sitemap
            </Link>
          </section>

          <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-4 text-xs text-slate-400 space-y-1">
            <p>
              ⚠️ Early-stage build: features are being wired in (unsafe-area
              service, WhatsApp ingest, incident overlays, etc.).
            </p>
            <p>
              If something breaks, try again in a bit — or head to the maps page
              to test the latest routing.
            </p>
          </section>
        </div>
      </main>
    </SiteShell>
  );
}
