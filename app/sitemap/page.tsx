// app/sitemap/page.tsx
import Link from "next/link";

type SitemapItem = {
  href: string;
  label: string;
  description?: string;
};

const sitemapItems: SitemapItem[] = [
  {
    href: "/",
    label: "Home",
    description: "Overview of TravelSafePilot and what the platform does.",
  },
  {
    href: "/maps",
    label: "Route planner",
    description:
      "Plan trips with unsafe areas avoided and see live route safety info.",
  },
  {
    href: "/contribute",
    label: "Report unsafe areas",
    description:
      "Submit unsafe areas and incidents (community data contribution).",
  },
];

export default function SitemapPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-4xl px-4 py-16 space-y-8">
        <header className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">
            TravelSafePilot sitemap
          </h1>
          <p className="text-slate-300 max-w-2xl">
            A simple overview of the main pages that are currently available on
            the site. We&apos;ll expand this list as new modules go live.
          </p>
        </header>

        <section>
          <ul className="space-y-4">
            {sitemapItems.map((item) => (
              <li
                key={item.href}
                className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3"
              >
                <Link
                  // typed-routes fix
                  href={item.href as any}
                  className="text-emerald-300 hover:text-emerald-200 font-medium"
                >
                  {item.label}
                </Link>
                {item.description && (
                  <p className="text-sm text-slate-400 mt-1">
                    {item.description}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
