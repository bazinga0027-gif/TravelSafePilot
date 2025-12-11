// app/layout.tsx
import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "TravelSafePilot",
  description: "Safety-first travel planning with live geofencing.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 antialiased">
        {children}

        {/* Google Maps JS loader – same behaviour as before, just centralized */}
        {mapsKey && (
          <Script
            id="gmp-loader"
            src={`https://maps.googleapis.com/maps/api/js?key=${mapsKey}&v=weekly&libraries=places`}
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
