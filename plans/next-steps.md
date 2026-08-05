# Next steps

Facecards is live as a Google Apps Script web app (see
`done/appscript-conversion.md`), managed with `hug`/`clasp`. All planned
sections are built: Mine (class face grids + Learn / Review / Browse), Shared,
the Staff directory (see `done/staff-section.md`), owner-only custom lists
(see `done/custom-lists.md`), counselor caseloads (see
`done/counselor-caseloads.md`), and study progress that persists across
sessions. CLAUDE.md describes the architecture; DEPLOY.md covers standing it
up and the operational chores.

## Remaining plans

None — the plans directory is empty apart from this file and
`functionality.md`.

## Loose ends

- **Deploy the pending batch.** Committed but not deployed: the 2026-08-01
  client-only changes (Review mode deals unseen cards as post-miss spacers,
  the native confirms are replaced — in-page dialog for list delete, none
  for Start over — and all alerts are now inline status text) plus the
  counselor-caseloads work (server + client). `hug deploy` from the
  `berkeley.net` account, then load the `counselors` tab: the navbar
  Counselors button with the real export, or hand-seed rows and run
  `clearCaches()`. Until the tab has rows, nothing changes for any viewer.
  Then run the manual test pass in `done/counselor-caseloads.md` (§Testing)
  — the seeded-tab `?as=` checks and the real-export upload have not been
  exercised against the live app yet.

- **Counselor copy (optional).** The help overlay and menu still speak of
  "classes"; caseload grade groups read fine as classes, so only touch the
  phrasing if it grates in practice (called optional in
  `done/counselor-caseloads.md`).

- **Remove (or gate) the perf/timing logs.** Diagnosing slow loads left
  `logTime()` calls throughout `Code.js` (`doGet`'s per-step timers, the
  reads, `getPhoto`, cache hit/skip lines) plus a few bare `console.log`s.
  Perf is settled — strip them or put them behind a debug flag. The top-level
  `doGet build` / `page.evaluate` timers are worth keeping.

- **Install the `warmData` hourly trigger** (DEPLOY.md §7) if not already
  done, so the cold ~5–7 s roster rebuild happens on a background schedule
  instead of on some unlucky user's page load.

- **`refreshPhotoMap` speed.** It iterates the Drive folder file-by-file via
  `DriveApp`; ~3,000 files runs in ~1–3 min, under the 6-minute cap. If a
  future refresh times out, switch to the Drive Advanced Service
  (`Drive.Files.list` with `fields: "nextPageToken, files(id, name)"`,
  `pageSize: 1000`) — a few bulk calls instead of thousands of per-file
  reads; needs the advanced service enabled in `appsscript.json`.

## Known future feature

- **Per-section volunteers (v2).** Let a teacher assign a volunteer to a
  specific section; the volunteer gets a page scoped to just that section's
  grid + learn/review. Design is recorded in `done/appscript-conversion.md`;
  the per-viewer scoping (email → authorized sections) is the foundation it
  extends. Write a plan when this is picked up.
