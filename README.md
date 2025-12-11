# TravelSafePilot — Clean Overwrite

## Quick Start
1) Copy all files into your project root (C:\Code\travelsafepilot).
2) Create `.env.local` from `.env.example` and set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.
3) From the root:
   - Delete `.next` and `node_modules` if present
   - `npm install`
   - `npm run dev`
4) Go to `http://localhost:3000/maps`.

## What’s included
- Next.js 16 App Router baseline
- `/maps` using Google Maps Web Components (`<gmp-place-autocomplete>`)
- `/itinerary` with an Areas-to-Avoid panel wired to a small local registry
- `/advice` placeholder
- Minimal styling in `app/globals.css`

## Notes
- If you use Cloud Map Styles, replace `mapId` in `app/maps/page.tsx` with a real one or remove the property.
- The unsafe registry is at `lib/unsafe/registry.json`. Expand as needed.
