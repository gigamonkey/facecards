# Next steps

Facecards is live as a Google Apps Script web app (see
`done/appscript-conversion.md`), deployed on the `app-script` branch and managed
with `hug`/`clasp`. Domain-restricted to `@berkeley.net`, per-teacher scoping,
sheet-backed data, Drive-thumbnail photos, learn/review, admin impersonation,
and the no-sections landing page are all working in production as of
2026-07-22. No implementation plans are outstanding.

## Loose ends

- **Remove (or gate) the perf/timing logs.** While diagnosing slow page loads we
  added `console.log` timing throughout `Code.js`: `doGet`'s per-step timers
  (`getActiveUser`/`readAdmins`/`getBaseUrl`), the sheet/photo reads
  (`readStudents`/`readPhotoMap`/`buildData`), `getPhoto`, and the cache
  hit/skip/`cached big` lines. Perf is now good (~250 ms warm), so strip these —
  or put them behind a debug flag — so every request isn't logging a handful of
  lines. Keep the top-level `doGet build` / `page.evaluate` if useful.

- **`refreshPhotoMap` speed.** It iterates the Drive folder file-by-file via
  `DriveApp`; ~3,000 files runs in ~1–3 min, under the 6-minute cap. If a future
  refresh times out (`Exceeded maximum execution time`), switch to the Drive
  Advanced Service: `Drive.Files.list({ q: "'<FOLDER_ID>' in parents and trashed
  = false", fields: "nextPageToken, files(id, name)", pageSize: 1000 })` — a few
  bulk calls instead of thousands of per-file metadata reads. Requires enabling
  the advanced service in `appsscript.json`.

- **Image throttling — not currently a problem.** The home photo grid loaded
  cleanly at real class sizes, so plain `drive.google.com/thumbnail` URLs were
  kept. If throttling appears (blank/broken tiles on large grids), the fixes, in
  order of effort: make study mode set `img.src` only for the current/next card
  (it currently sets `src` on all cards up front, so a big "learn all" fires many
  requests at once — a latent burst), add an `onerror` retry-with-backoff on grid
  images, and as a last resort proxy the bytes through `google.script.run`
  (which also re-gains access control, at the cost of latency and no cross-session
  browser cache).

## Known future feature

- **Per-section volunteers (v2).** Let a teacher assign a volunteer to a specific
  section; the volunteer gets a page scoped to just that section's grid +
  learn/review. Design is recorded in `done/appscript-conversion.md`; v1's
  per-teacher scoping is the foundation it extends (resolve viewer email →
  authorized sections). Write a plan when this is picked up.
