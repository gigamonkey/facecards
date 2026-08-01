# Staff section

Add a **Staff** section — a sibling to Mine (`?learn`) and Shared (`?shared`)
— that lets any staff viewer learn, review, and browse the names and faces of
BHS staff. Data comes from the public staff directory at
<https://bhs.berkeleyschools.net/staff/>, scraped into a `staff` spreadsheet
tab. Photos are **not** downloaded: the directory's images are publicly
accessible, so cards link to them directly.

## The source page (as scraped 2026-07-28)

- A WordPress page; the whole directory is one server-rendered TablePress
  table, `<table id="tablepress-11">`. No JS rendering — a plain
  `UrlFetchApp.fetch` of the page gets everything.

- Header row: Picture | Last Name | First Name | Role | Contact
  (@berkeley.net). 318 data rows today.

- Each row: `<td><img src='/wp-content/uploads/2025/09/52.jpg' …></td>` then
  last, first, role, contact as plain text. Photo srcs are root-relative.
  109 rows use the placeholder `/wp-content/uploads/2016/10/pp.png` — that
  means "no photo" (render the initials box).

- Contact is almost always a bare `@berkeley.net` username. Three rows are
  anomalous (a full gmail address, `zachmeredith@ cityofberkeley.info` with a
  space, `michellenutter@berkele.net` [sic]) — keep whatever's there; it's
  display-only.

- Role is free text with **136 distinct values** ("Math", "SPED", "BIHS
  History", "School Safety Officer", …) — too messy to group by, so the UI
  doesn't try (see Decisions).

## Step 1: scraper → `staff` tab

`refreshStaffDirectory()` in `Code.js`, run manually from the Apps Script
editor — the same operating model as `refreshPhotoMap`:

- `UrlFetchApp.fetch(STAFF_DIRECTORY_URL)`. Needs one new scope in
  `appsscript.json`'s `oauthScopes`:
  `https://www.googleapis.com/auth/script.external_request` (the scope list is
  explicit, so it won't be inferred).

- **Parse with regexes, not a DOM.** Apps Script has no HTML parser, and
  `XmlService` requires well-formed XML, which this page isn't. Anchor to the
  known structure: slice out `<table id="tablepress-11">…</table>`, iterate
  the `<tr>`s, capture the five `<td>`s, pull `src='…'` from the first.
  Decode the few HTML entities that can appear in names/roles
  (`&amp;`, `&#039;`, …).

- Normalize per row:
  - `photoUrl`: resolve the relative src against
    `https://bhs.berkeleyschools.net`; the `pp.png` placeholder → `''`.
  - `email`: `qualifyEmail(contact)` — bare usernames get `@berkeley.net`
    appended, cells that already contain `@` pass through unchanged.

- **Row-count guard**: if fewer than ~200 rows parse, throw without touching
  the tab — a page redesign must not silently empty the section.

- Write the `staff` tab (headers `lastName`, `firstName`, `role`, `email`,
  `photoUrl`) with the `clearContents` + header + `setValues` pattern from
  `refreshPhotoMap`, log the count, then `clearCaches()`.

This step is independently testable: run it from the editor and eyeball the
tab before any UI exists.

## Step 2: server route and model

- `STAFF_SHEET = 'staff'`; `readStaff()` via `sheetToObjects` (empty array if
  the tab doesn't exist yet — scraper never run → client shows a "no staff
  data yet" note instead of erroring).

- `buildStaffModel()` — the rows sorted by lastName, firstName. Identical for
  every viewer, so it's cached once under a single key (`cachedBig('staff')`
  — at ~40–60 KB of JSON it's near `cached()`'s 100 KB single-key limit, so
  use the chunked path).

- `doGet`: a `?staff` branch alongside the `?shared` ones — **before**
  `buildModel` and the landing-page check, so the directory works even for
  viewers with no sections. Route mode `'staff'`, `staffJson` = the model;
  every other branch sets `staffJson` to null. `index.html` gains
  `window.STAFF = <?!= staffJson ?>;`.

- Deep links: `?mode=learn|review|browse&scope=staff` should also send
  `staffJson` (any branch where `params.scope === 'staff'`), so a shared link
  lands straight in a staff study session like class deep links do.

## Step 3: client

New `js-staff.html` partial, included between `js-shared` and `js-app`:

- `renderStaff(container, staffModel)`: heading, the Learn / Review / Browse
  buttons (reuse `classHead`/`buttonsRow` from `js-home` with scope
  `'staff'`), a **filter** text input, and a `.faces` grid of staff cards
  with `attachFlip`.

- `buildStaffCard(p)`: a `.card` whose front is `<img loading="lazy"
  src=photoUrl>` (or the `.initials` box when `photoUrl` is empty — the
  existing `initials()` works on `{firstName, lastName}`), and whose `.back`
  is: first name (the "answer" line, styled like the student card's `name`),
  "First Last", role, email shown as the bare username. A plain `<img>` — none
  of the defer/proxy machinery: these are public URLs with no Google cookies
  involved, so they load everywhere, including mobile Safari. The
  numeric-filename URLs (`…/52.jpg`) leak no names, so study cards don't need
  the deferred "Loading…" treatment either. `runStudy` and `attachFlip` work
  as-is (they only need a `.back`; `loadCardImage` no-ops without a
  `.loading` box).

- **Filter**: case-insensitive substring match against name and role,
  narrowing both the grid and what Learn / Review / Browse run over. This is
  what makes study usable — 318 cards is far too many for one Learn session,
  and "math", "sped", "safety" carve out natural sets.

- Preload for study/browse: generalize `warmDirect` in `js-cards` to accept
  URLs (`thumbUrl(fileId)` already produces one), then warm the staff photo
  URLs the same way.

- `js-app`: navbar gains **Staff** (`appUrl('?staff')`); the menu gains a
  third box ("Learn staff names"); dispatch `ROUTE.mode === 'staff'` →
  `showStaff()`; `showStudy`/`studentsFor`/`titleFor` learn scope `'staff'`
  (students from `window.STAFF`, title "BHS staff"); the help overlay gains a
  Staff paragraph.

- CSS: `.card img` sizing is tuned for the uniform Drive portraits; the
  directory images vary in size and aspect ratio, so the staff cards likely
  need `object-fit: cover` (or equivalent) — check against real data.

## Step 4: ops

- `DEPLOY.md`: document `refreshStaffDirectory()` — run it after the school
  updates the directory (start of each year at minimum). It already calls
  `clearCaches()` itself.

- Refresh cadence: **manual for v1.** A weekly time-driven trigger is a
  one-liner in the Triggers panel if it becomes a chore, but an unattended
  scrape against a possibly-redesigned page argues for manual runs behind the
  row-count guard first.

## Decisions

1. **Alphabetical + filter, not grouped by role** — 136 free-text role values
   make grouping noise; the filter gets the same value cheaply.

2. **Keep malformed contact cells verbatim** — they're display-only; fixing
   them is the directory's job.

3. **Placeholder photo → initials box** — matches how students without photos
   render everywhere else.

4. **The viewer appears in their own study deck** (they're in the directory).
   Not worth filtering out in v1.

5. **Scraping etiquette** — one GET of a public page, run manually a few
   times a year; no politeness machinery needed.

## Implementation order

1. Scraper: scope in `appsscript.json`, `refreshStaffDirectory()`, verify the
   `staff` tab from the editor.
2. Server: `readStaff` / `buildStaffModel` / the `?staff` route + `staffJson`
   plumbing.
3. Client: `js-staff.html` (grid + cards), navbar/menu/dispatch/help.
4. Filter, URL preloading, CSS for variable aspect ratios, staff deep links.
5. `DEPLOY.md`.

## Changes to the plan

- **The site firewall blocks Google's fetchers** — bhs.berkeleyschools.net
  sometimes 403s `UrlFetchApp`, so two fallbacks were added:
  `uploadStaffDirectory` (an admin uploads the page's saved HTML source from
  the Staff view) and `scripts/scrape-staff.mjs` (scrape locally to TSV; see
  DEPLOY.md).

- **`staff overrides` tab** — per-field corrections (`email`, `firstName`,
  `lastName`, `role`, `photo`, `optOut`), hand-edited in the spreadsheet and
  merged over the scraped rows in `buildStaffModel()` so a re-scrape never
  clobbers an edit; a non-empty `optOut` drops the member from every
  viewer-facing route. (An in-app staff self-edit page was built and then
  removed in favor of the spreadsheet — commit 624d3ef.)

- **`aliases` tab** — staff whose public-directory email is a Workspace alias
  of their roster/login address are canonicalized to the primary
  (`canonicalStaffEmail`) before any join, so both addresses work.

- **Courses on staff cards** — `buildStaffModel()` joins staff to the
  roster's teachers by email username and shows the distinct courses each
  teaches.

- **Decision 4 reversed** — the viewer's own card is now excluded from staff
  study decks (commit 0f26374).

- **No-sections viewers get more than the route** — beyond placing `?staff`
  before the landing check, viewers with no sections now get the whole app
  with the Mine/Shared nav links and menu boxes hidden (commit 73ec60a);
  only Mine/student-study deep links render the landing page.
