"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

type NavItem = {
  href: string;
  label: string;
};

const navItems: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/maps", label: "Maps" },
  { href: "/contribute", label: "Contribute" },
  { href: "/sitemap", label: "Sitemap" },
];

export default function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/40 backdrop-blur-sm">
        <nav className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href as any} // typed-routes fix
                className={[
                  "px-4 py-1.5 rounded-full transition text-xs md:text-sm border",
                  isActive
                    ? "bg-emerald-400/10 border-emerald-400/60 text-emerald-200"
                    : "border-slate-800 text-slate-300 hover:border-emerald-400/40 hover:text-emerald-200",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Page content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/40 py-6 text-center text-xs text-slate-500">
        TravelSafePilot — making every journey safer.
      </footer>
    </div>
  );
}
