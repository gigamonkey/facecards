# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Facecards is a Google Apps Script web app that lets Berkeley (`berkeley.net`)
teachers learn and review the names and faces of the students in their classes.
Student data lives in a Google Sheet; student photos live in a Drive folder.
Managed with [`hug`](https://github.com/gigamonkeys/hug) (a `clasp` wrapper) —
see `/Users/peter/hacks/hug`. `DEPLOY.md` documents standing the whole thing up
from scratch (resources, deployment, triggers, troubleshooting).

(The app was previously an Express/Node server; that history is in git. See
`plans/done/appscript-conversion.md` for the conversion rationale.)

## Development with hug / clasp

There is no local build or test step — it's Apps Script. Work happens against a
live Apps Script project via `clasp` (through `hug`). Auth must be the
**`berkeley.net` account** that owns the spreadsheet and photos, since the app
deploys with domain access and `executeAs: USER_DEPLOYING`.

```bash
npx clasp login          # once, as the berkeley.net account
hug push                 # push local files to the Apps Script project
hug open                 # open the editor in the browser
hug deploy "message"     # push + version + update the web-app deployment
hug config set K=V       # write config.js (CONFIG.*) — resource IDs
hug pull [-f]            # pull remote (refuses on dirty tree without -f)
```

`config.js` (managed by `hug config`, committed to git) holds `CONFIG.SPREADSHEET_ID`
and `CONFIG.DRIVE_FOLDER_ID`. `.clasp.json` is per-branch (hug's
branch-per-environment pattern) and is committed. `.claspignore` restricts the
push to the Apps Script sources — only `appsscript.json`, `Code.js`, `config.js`,
and the `*.html` files are pushed.

## Apps Script constraints that shape the code

- **One entry point.** A web app is a single `doGet(e)` with one fixed URL, no
  path routing. "Routes" are query params, read from `e.parameter`. Navigation
  between the home views and study is client-side (SPA), no reload.
- **No ES modules; client JS only lives in `.html`.** Each former
  `public/js/*.js` module is now a `js-*.html` partial wrapping a `<script>` of
  globals (no `import`/`export`), inlined into `index.html` via the `include()`
  helper in dependency order (see the include list at the bottom of `index.html`).
- **No static assets.** CSS is inlined via `css.html`. Photos are
  `drive.google.com/thumbnail` URLs where the browser will load them, with a
  server-side proxy fallback (`getPhoto`, a base64 data URL via
  `google.script.run`) where it won't (browsers that strip the cross-site
  Google cookie, e.g. mobile Safari). `js-cards` probes once per page load and
  picks a path.

## Architecture

**Server (`Code.js`).** `doGet(e)`:

1. Authorizes: `Session.getActiveUser().getEmail()` must match exactly
   `@berkeley.net` (`isBerkeleyStaff`) — deliberately excludes
   `@students.berkeley.net`. The DOMAIN deployment setting is the coarse gate;
   this is the real one.
2. Resolves the **effective email** — an admin (listed in the `admins` sheet
   tab, read by `readAdmins`) may impersonate anyone via `?as=`; a non-admin's
   `?as=` is ignored server-side.
3. `buildModel(effective)` reduces the roster to `{ teacherLast, classes }`
   **scoped to only that email's own sections** (rows where `teacherEmail`
   matches). Other teachers' rows are never sent to the client. Each student
   also carries their full cross-teacher `schedule` (for browse mode).
4. Routes by query param: `?shared-with=<teacher>` (students shared with that
   teacher), `?shared` (overview of all sharing teachers), `?staff` (the
   scraped BHS staff directory — same for every viewer), `?staff-edit` (a form
   for correcting one's own staff entry),
   `?mode=learn|review|browse[&scope=&id=]` (study/browse deep link; `scope=staff`
   studies the staff directory), `?learn` (the class face grids), default
   (two-box menu). A model with no classes renders `landing.html` ("contact
   Mr. Seibel") instead. The model + route + context land in `index.html` as
   JSON (via `<?!= jsonForScript(...) ?>`) for one-shot client rendering.

**Caching.** The roster sheet is large, so requests never read it directly:
`getData()` normalizes the whole roster once into a students+teachers blob, and
per-viewer models are derived from that — all memoized in `CacheService`
chunks (6h TTL) under a version token (`CACHE_VERSION` script property).
`clearCaches()` bumps the version; `warmData()` (meant for an hourly trigger —
see `DEPLOY.md`) bumps it and rebuilds the blob. **After editing the roster or
changing what the model contains, run `clearCaches()`** — otherwise viewers
keep getting the stale cached shape for up to 6 hours.

`refreshPhotoMap()` is run manually from the editor when photos change: it
scans `CONFIG.DRIVE_FOLDER_ID` for `<studentNumber>.jpg` files, writes the
`studentNumber → fileId` map to the `photos` tab and a `missing photos` tab
(students with no photo file), then clears the caches.

**Spreadsheet tabs** (in `CONFIG.SPREADSHEET_ID`, private to the deployer):

- `rosters` — student rows (headers: `studentNumber`, `firstName`,
  `middleName`, `lastName`, `nickname`, `period`, `course`, `gender`,
  `teacherEmail`, `personId`, `grade`, `teacherName`, `room`).
- `photos`, `missing photos` — generated by `refreshPhotoMap()`.
- `admins` — one admin `email` per row (seed with `peterseibel@berkeley.net`).
- `staff` — the BHS staff directory, generated by `refreshStaffDirectory()`
  (run manually from the editor): it scrapes the public page at
  bhs.berkeleyschools.net/staff/ — one TablePress table — into
  `lastName, firstName, role, email, photoUrl` rows. Photos are not
  downloaded; `photoUrl` is the page's own public image URL ('' for the
  placeholder image, rendered as initials). The site's firewall sometimes
  403s Google's fetch servers; fallbacks that fetch from a trusted machine
  instead: an admin can upload the page's saved HTML source from the Staff
  view (`uploadStaffDirectory`), or `scripts/scrape-staff.mjs` scrapes
  locally to TSV (see DEPLOY.md). `buildStaffModel()` also joins each entry
  to the roster's teachers by email username, adding the distinct `courses`
  they teach (shown on the staff cards).
- `staff overrides` — staff members' corrections to their own entries
  (`email`, `firstName`, `lastName`, `role`, `photo`, `optOut`), written from
  the `?staff-edit` form (`saveStaffOverride`, `saveStaffPhoto`,
  `removeStaffPhoto`, `saveStaffOptOut`; `updateStaffOverride` does the
  merging rewrite). An opted-out member is dropped from `publicStaffModel()`
  — absent from every viewer-facing route — but `?staff-edit` resolves the
  viewer's entry from the full model (`staffEntryFor`, sent as
  `window.STAFF_ENTRY`), so they can rejoin. The
  `photo` column holds a self-taken 172x228 JPEG as a data URL (a file-input
  picker + canvas crop — getUserMedia can't work in Google's iframe, which
  doesn't delegate camera permission; crop/confirm flow borrowed from
  gigamonkey/photobooth), which the model serves as the entry's `photoUrl`. Merged over the scraped rows in `buildStaffModel()` (non-empty
  cell wins, per field), so a directory re-scrape never clobbers an edit.

**Client.** `index.html` bootstraps `window.MODEL/ROUTE/CTX/SHARED` then
includes, in order: `js-dom` (`$`, `$$`, `el`, `appUrl`, `helpOpen`) →
`js-random` (`shuffled`) → `js-cards` (`buildCard`, photo loading: the
direct-vs-proxy probe, per-session photo caches, pooled preloading) →
`js-study` (`runStudy` shared input/advance driver) → `js-learn` (`LearnState`
— forgetting-curve spaced-repetition engine, tuning documented in `TUNING.md`)
→ `js-review` (`ReviewState` — the Learn engine with an optimistic prior: one
pass if nothing is missed) → `js-home` (`renderHome` face grids + card flip,
`renderBrowse` one-at-a-time carousel with the info and schedule always
showing) → `js-shared` (shared-students views: desktop table + overview,
mobile list + swipe carousel; `runCarousel`, reused by browse) → `js-staff`
(the staff directory: filterable face grid, staff flash/browse cards — plain
`<img>`s to the public photo URLs, no Drive proxy machinery — and the
`?staff-edit` self-edit form) → `js-app`
(controller: view dispatch, deep links, the navbar — Home / Mine / Shared /
Staff, admin view-as form and impersonation banner — and the help overlay).

All client-built full-page links go through `appUrl()`, which re-appends
`?as=` so admin impersonation survives navigation — the server only honors the
URL param; there is no other session state (Apps Script can't set cookies).

## Access / deployment facts

- `appsscript.json`: `webapp.access: DOMAIN`, `executeAs: USER_DEPLOYING`.
- Spreadsheet: shared only with the deployer (app reads it as the deployer).
- Photos folder: shared **view-only with the domain** so browsers can load
  thumbnail URLs. (Tradeoff: any domain account with a photo URL can view it.)
- Deploy from the `berkeley.net` account, not `peter@gigamonkeys.com`.
