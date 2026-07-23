# Convert Facecards to a Google Apps Script web app

## Goal

Replace the Express/Node app (Google OAuth via passport, `students.tsv` loaded
at boot, photos served from `public/images/`) with a Google Apps Script web app
managed by [`hug`](/Users/peter/hacks/hug). Student data comes from a Google
Sheet; photos come from a Drive folder, surfaced as `drive.google.com/thumbnail`
URLs. The study experience (home grid + learn/review modes) is preserved.

## Target architecture

- **Single web app**, one `doGet(e)` entry point served by `HtmlService`.
- **Runs as the deployer** (`executeAs: USER_DEPLOYING`) so it can read the
  owner's private spreadsheet; **opened only by domain users**
  (`webapp.access: DOMAIN`).
- **Data**: read from a Google Sheet via `SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)`.
  Two tabs — a **students** tab and a generated **photos** tab mapping
  `studentNumber → Drive fileId`.
- **Images**: `<img src="https://drive.google.com/thumbnail?id=${fileId}&sz=w400" loading="lazy">`.
  The user's browser fetches and caches them; the photos folder is shared
  view-only with the domain.
- **Client code**: the existing ES-module frontend, converted to global-scope
  scripts included into `index.html` via the Apps Script `include()` pattern
  (Apps Script has no ES-module support and serves client JS only from `.html`
  files).
- **Config** via `hug config` (`config.js`, `CONFIG.*`): `SPREADSHEET_ID`,
  `DRIVE_FOLDER_ID`, and optionally an extra-emails allowlist.

## Access / auth model

Replaces passport + the `emails` allowlist with two gates:

1. **Deployment gate** — `appsscript.json` sets `webapp.access: "DOMAIN"` and
   `webapp.executeAs: "USER_DEPLOYING"`. Only accounts in the deployer's
   Workspace can open the app; the app itself runs as the deployer.

2. **In-code gate** — at the top of `doGet`:

   ```js
   const email = (Session.getActiveUser().getEmail() || '').toLowerCase();
   if (!email.endsWith('@berkeley.net')) {
     return HtmlService.createHtmlOutput('Not authorized.');
   }
   ```

   This is an **exact** `@berkeley.net` suffix — deliberately stricter than the
   current `hd.endsWith('berkeley.net')`, which would let `@students.berkeley.net`
   through. Students must be excluded, so the exact suffix is the real gate
   (belt-and-suspenders with the DOMAIN restriction, which may or may not treat
   `students.berkeley.net` as the same Workspace).

   `Session.getActiveUser().getEmail()` returns the accessing user's address
   when they're in the same Workspace domain as the script owner, which is our
   case, so this is reliable.

**Resource sharing:**

- Spreadsheet: owned by / shared only with the deployer. No one else needs
  access because the app reads it as the deployer.
- Photos folder: shared **view-only with the `berkeley.net` domain** so browsers
  can load thumbnail URLs. (Accepted tradeoff: any domain account with a photo
  URL can view that photo outside the app. Students are a different domain and
  are not granted access.)

**Deployer identity:** the Apps Script project must be created and deployed from
the **`berkeley.net` account** that owns the sheet and photos — so `clasp login`
must be that account, not `peter@gigamonkeys.com`. DOMAIN access resolves to
whatever Workspace the deploying account belongs to.

### Volunteers (deferred to v2)

For **v1, the gate is strictly `@berkeley.net`** — the hardcoded
`femiolukoya@volunteers.berkeley.net` from `index.js:69` is dropped, and there
is no extra-emails escape hatch. Keep the auth gate as the single exact-suffix
check above.

The proper volunteer feature is a **v2** item, out of scope here. Intended
design, recorded so v1 doesn't paint us into a corner: a teacher can add a
volunteer to a **specific section**, and that volunteer gets a page scoped to
just that section — the photo grid plus learn/review for that one section, and
nothing else. That implies future data for section↔volunteer assignments (a
sheet tab or similar) and a per-user scoping layer in `doGet` that resolves the
viewer's email to the sections they may see. v1's single full-access model is a
clean subset of that, so nothing here blocks it.

## Data model

### Students tab

The Sheet's columns (per your description): `studentNumber`, `firstName`,
`middleName`, `lastName`, `nickname`, `period`, `course`, `gender`,
`teacherEmail`, `personId`, `grade`, `teacherName`. Read with
`sheet.getDataRange().getValues()`; row 0 is the header; map each row to an
object keyed by header name (mirrors `loadTSV` in `file-utils.js`).

### Server-side reduction (port of `index.js:40-66`)

Build the same in-memory structures the Express app built, now inside Code.js:

- `slugify(course-p-period-teacher)` → `classes[slug]` with `{ ...row, name,
  teacherLast, teacher, students: [] }`.
- `teachers[teacher]` with `{ name, teacherLast, classes: {}, students: [] }`.
- Join each student to its photo `fileId` (see below) so the client can build
  thumbnail URLs.

The `emails` map is gone — replaced by the domain/email gate above.

### Photos tab (generated)

A second sheet tab, e.g. `photos`, with columns `studentNumber`, `fileId`.
Built/refreshed by an Apps Script function rather than at request time (listing
Drive on every load is slow and quota-limited):

```js
function refreshPhotoMap() {
  const folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
  const files = folder.getFiles();
  const rows = [];
  while (files.hasNext()) {
    const f = files.next();
    const m = f.getName().match(/^(\d+)\.jpe?g$/i); // <studentNumber>.jpg
    if (m) rows.push([m[1], f.getId()]);
  }
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName('photos') || ss.insertSheet('photos');
  sheet.clearContents();
  sheet.getRange(1, 1, 1, 2).setValues([['studentNumber', 'fileId']]);
  if (rows.length) sheet.getRange(2, 1, rows.length, 2).setValues(rows);
}
```

Run it **manually from the Apps Script editor** whenever photos are added —
which is itself a manual upload process, so no automation is needed. `doGet`
reads the `photos` tab and builds `studentNumber → fileId` for the join. Missing
photos → render a placeholder / blank card.

## Rendering & routing

Single-page app; no server-side page routing (a web app has one fixed URL).

- **`doGet(e)`** authorizes, builds the full data model (teachers/classes/
  students + fileIds), and injects it as JSON into the page via an
  `HtmlService.createTemplateFromFile('index')` template (`<?= JSON.stringify(model) ?>`
  into a `<script>` bootstrap variable). One page load, no extra round trip.
- **Client-side views** toggle without reload:
  - **Home** — teacher → class → photo-card grid (port of `index.njk`), using
    `loading="lazy"` thumbnails so the browser only fetches visible cards.
    Card click flips photo ↔ info (port of `public/js/index.js`).
  - **Study** — learn/review over a chosen scope (all / class / teacher), port
    of `study.njk` + `learn.js` / `review.js`.
- **Deep links / bootstrap state:** `doGet` reads `e.parameter` (e.g.
  `?mode=learn&scope=class&id=<slug>`) and injects an initial route so study
  views are still shareable, matching today's `/learn/p/:slug` etc. In-app
  navigation updates the view client-side (and optionally the URL via the web
  app's query string) without a full reload.

## Client code: ES modules → Apps Script includes

Apps Script serves client JS only inside `.html` files and has no module system,
so each current `public/js/*.js` module becomes a `.html` partial wrapping a
`<script>` (globals, no `import`/`export`), included in dependency order:

- `include()` helper in Code.js:
  ```js
  function include(name) {
    return HtmlService.createHtmlOutputFromFile(name).getContent();
  }
  ```
- `index.html` includes, in order: `js-dom` → `js-random` → `js-home` /
  `js-learn` / `js-review` → `js-app` (view switching / bootstrap).
- Conversions:
  - `dom.js` → `js-dom.html`: drop `export`; keep `$`, `$$`, builders as globals.
  - `random.js` → `js-random.html`: `shuffled` as a global.
  - `learn.js` / `review.js` → `js-learn.html` / `js-review.html`: keep the
    `State`/`Row` engines verbatim; replace the top-of-file
    `$('#cards').querySelectorAll(...)` bootstrap with a render step that builds
    the `.card` DOM from the injected JSON for the selected scope, then runs the
    same keyboard/touch logic. The Fibonacci-row learn engine and the
    missed-cards review engine are unchanged.
  - `index.js` (card flip) → folded into `js-home.html`.
- CSS (`public/css/index.css`, `study.css`) → inlined `<style>` in `index.html`
  or an included `css.html` partial.

## Config (`hug config` / `config.js`)

- `SPREADSHEET_ID` — the student spreadsheet.
- `DRIVE_FOLDER_ID` — the photos folder.

Accessed in server code as `CONFIG.SPREADSHEET_ID`, etc. `config.js` is pushed
with the code and lives in git (fine for IDs, not secrets — there are none here).

## Project setup with hug

The current repo is Express-shaped; we rebuild it as an Apps Script project on
the `convert` branch.

1. **Scaffold web app files** (from `hug`'s `templates/webapp/`): `appsscript.json`
   (edit `webapp` block → `DOMAIN` / `USER_DEPLOYING`), `Code.js`, `index.html`.
2. **Author** the server (`Code.js`: `doGet`, model builder, `refreshPhotoMap`,
   `include`) and client partials (`js-*.html`, `css.html`).
3. **Create the remote project** from the existing directory:
   ```bash
   hug init --bare facecards   # creates the Apps Script project, pushes local code
   ```
   (Run as the `berkeley.net` clasp account.)
4. **Configure resources:**
   ```bash
   hug config set SPREADSHEET_ID=<id> DRIVE_FOLDER_ID=<id>
   ```
5. **Populate the photos tab:** run `refreshPhotoMap` once (Apps Script editor).
6. **Deploy:**
   ```bash
   hug deploy "initial Apps Script web app"
   ```
   Open the deployment URL; verify auth, home grid, and both study modes.

Branch/fork note: `hug fork` + `hug config` gives a staging Apps Script project
pointed at a test sheet if wanted (per hug's branch-per-environment pattern).

## Files: remove / add

**Remove** (Express/Node/OAuth, no longer used): `index.js`, `google-oauth.js`,
`file-utils.js`, `public/js/*.js`, `views/*.njk`, `package.json` deps for
express/passport/nunjucks/morgan/dotenv, `.dockerignore`. Keep git history for
reference.

**Add**: `appsscript.json`, `Code.js`, `index.html`, `js-dom.html`,
`js-random.html`, `js-home.html`, `js-learn.html`, `js-review.html`, `js-app.html`,
`css.html`, `config.js` (via `hug config`), `.clasp.json` (via `hug init`).

**Update**: `CLAUDE.md` to describe the Apps Script architecture and hug workflow;
`.gitignore` for clasp artifacts. `README` optional.

## Implementation sequence

1. Scaffold `appsscript.json` (DOMAIN + USER_DEPLOYING), `Code.js`, `index.html`.
2. Port the data reduction into `Code.js`; add `readSheet`, model builder.
3. Add `refreshPhotoMap` + `photos`-tab read + student↔fileId join.
4. Implement the auth gate (pending volunteer decision).
5. Convert client modules to `js-*.html` includes; wire `include()`.
6. Build home view (grid + flip) from injected JSON.
7. Build study view; adapt `learn.js`/`review.js` to render from JSON.
8. Add deep-link bootstrap from `e.parameter`.
9. `hug init --bare`, `hug config set …`, run `refreshPhotoMap`, `hug deploy`.
10. Manual verification; then remove dead Express files and update `CLAUDE.md`.

## Verification

- **Auth**: a `@berkeley.net` account gets in; a `@students.berkeley.net` account
  is refused; volunteer behavior matches the chosen option.
- **Data**: teachers/classes/students match the sheet; slugs stable.
- **Images**: thumbnails render and cache; missing photos degrade gracefully.
- **Learn**: Fibonacci-row progression and wrong-answer recycling behave as today.
- **Review**: single pass then missed-only re-runs; "Perfect run!" on zero misses.
- **Input**: arrow keys + touch swipes; first press reveals the card back.

## Settled decisions

1. **Volunteers** — v1 is strictly `@berkeley.net`; the hardcoded volunteer is
   dropped. Proper per-section volunteer access is a v2 feature (see above).
2. **Photos tab refresh** — manual run from the Apps Script editor; no automation.
