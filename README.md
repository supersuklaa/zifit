# Zifit

A small offline-first PWA for designing and tracking gym workouts. Built with React, Vite, Tailwind CSS v4 and shadcn/ui. All data lives in the browser's `localStorage` (key `zifit:db`) — use **History → Export/Import** to back it up or move it between devices.

## Features

- **Workouts** – design reusable routines (exercises, sets × reps, starting weight, rest time).
- **Train** – log a live session with a workout timer, per-set weight/reps, previous-performance hints, auto-prefilled weights and a rest timer.
- **History** – past sessions, weekly count, total volume and per-exercise personal bests.
- Installable PWA with offline support (`public/manifest.webmanifest`, `public/sw.js`).

## Scripts

```sh
npm install
npm run dev      # dev server
npm run build    # type-check + production build (served from /zifit/)
npm run preview  # serve the build at http://localhost:4173/zifit/ (service worker is only registered in production)
```

## Deployment

Production builds use the base path `/zifit/` (set via `--base` in the `build`/`preview` scripts). The manifest and service worker use relative URLs, so only that flag needs changing to host elsewhere.

## Notes

- Tailwind runs through PostCSS, configured via the `postcss` key in `package.json`.
- shadcn components live in `src/components/ui` and use relative imports (no `@/` alias). After adding new ones with `npx shadcn add …`, move them from `@/components/ui` to `src/components/ui` and change their imports to relative paths.
- Bump `CACHE` in `public/sw.js` if you need to force-refresh cached files.
