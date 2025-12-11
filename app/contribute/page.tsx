// app/contribute/page.tsx
import Link from "next/link";

export default function ContributePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-16 space-y-6">
        <h1 className="text-3xl font-semibold">
          Report an unsafe area (coming soon)
        </h1>

        <p className="text-slate-300">
          This page will let you submit unsafe areas, incidents, and community
          alerts directly into TravelSafePilot. We&apos;re still wiring up the
          backend and WhatsApp ingest, but the route needs to exist so the site
          can build cleanly.
        </p>

        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-800 hover:border-emerald-400/60 transition"
        >
          ⬅ Back to home
        </Link>
      </div>
    </main>
  );
}
