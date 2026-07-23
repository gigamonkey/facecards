# Next steps

Facecards is live as a Google Apps Script web app (see
`done/appscript-conversion.md`), deployed on the `app-script` branch and managed
with `hug`/`clasp`. As of 2026-07-23 it has: the `@berkeley.net`-only gate with
per-teacher scoping, a top navbar (Home / Learn / Shared), a menu home page with
a QR code, class face grids (`?learn`), learn/review study modes, the shared
views (`?shared` overview and `?shared-with=` table, with mobile list + swipe
variants), admin impersonation, and the no-sections landing page. Photos come
from a Drive folder — grids use thumbnail URLs, study mode proxies them through
the script so they work on mobile Safari. Data is served from a normalized
roster cached in `CacheService` (version-busted on edits), so warm loads are
~250 ms. No implementation plans are outstanding.

## Loose ends

- **Remove (or gate) the perf/timing logs.** Diagnosing slow loads left
  `console.log` timing throughout `Code.js`: `doGet`'s per-step timers
  (`getActiveUser`/`readAdmins`/`getBaseUrl`), the reads
  (`readStudents`/`readPhotoMap`/`buildData`), `getPhoto`, and the cache
  hit/skip/`cached big` lines. Perf is settled now — strip these or put them
  behind a debug flag so every request isn't logging a handful of lines. The
  top-level `doGet build` / `page.evaluate` are worth keeping.

- **Install the `warmData` hourly trigger** (DEPLOY.md §7) if not already done,
  so the cold ~5–7 s roster rebuild happens on a background schedule instead of
  on some unlucky user's page load.

- **`refreshPhotoMap` speed.** It iterates the Drive folder file-by-file via
  `DriveApp`; ~3,000 files runs in ~1–3 min, under the 6-minute cap. If a future
  refresh times out, switch to the Drive Advanced Service (`Drive.Files.list`
  with `fields: "nextPageToken, files(id, name)"`, `pageSize: 1000`) — a few
  bulk calls instead of thousands of per-file reads; needs the advanced service
  enabled in `appsscript.json`.

## Known future feature

- **Per-section volunteers (v2).** Let a teacher assign a volunteer to a specific
  section; the volunteer gets a page scoped to just that section's grid +
  learn/review. Design is recorded in `done/appscript-conversion.md`; the
  per-viewer scoping (email → authorized sections) is the foundation it extends.
  Write a plan when this is picked up.
