# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Facecards is a Google Apps Script web app that lets Berkeley (`berkeley.net`)
teachers learn and review the names and faces of the students in their classes.
Student data lives in a Google Sheet; student photos live in a Drive folder and
are shown as `drive.google.com/thumbnail` URLs. Managed with
[`hug`](https://github.com/gigamonkeys/hug) (a `clasp` wrapper) — see
`/Users/peter/hacks/hug`.

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
  path routing. "Routes" are query params (`?mode=…&scope=…&id=…`), read from
  `e.parameter`. Navigation between home and study is client-side (SPA), no reload.
- **No ES modules; client JS only lives in `.html`.** Each former
  `public/js/*.js` module is now a `js-*.html` partial wrapping a `<script>` of
  globals (no `import`/`export`), inlined into `index.html` via the `include()`
  helper in dependency order (see the include list at the bottom of `index.html`).
- **No static assets.** CSS is inlined via `css.html`; images come from Drive
  thumbnail URLs, not a served directory.

## Architecture

**Server (`Code.js`).** `doGet(e)`:

1. Authorizes: `Session.getActiveUser().getEmail()` must match exactly
   `@berkeley.net` (`isBerkeleyStaff`) — deliberately excludes
   `@students.berkeley.net`. The DOMAIN deployment setting is the coarse gate;
   this is the real one.
2. Resolves the **effective email** — an admin (listed in the `admins` sheet
   tab, read by `readAdmins`) may impersonate anyone via `?as=`; a non-admin's
   `?as=` is ignored server-side.
3. `buildModel(effective)` reads the sheet and reduces it to `{ teacherLast,
   classes }` **scoped to only that email's own sections** (rows where
   `teacherEmail` matches). Other teachers' rows are never sent to the client.
4. If the scoped model has no classes → renders `landing.html` ("contact Mr.
   Seibel"). Otherwise injects the model + route + context as JSON into
   `index.html` (via `<?!= jsonForScript(...) ?>`) for one-shot client rendering.

`refreshPhotoMap()` is run manually from the editor when photos change: it scans
`CONFIG.DRIVE_FOLDER_ID` for `<studentNumber>.jpg` files and writes the
`studentNumber → fileId` map into the `photos` sheet tab, so `doGet` never hits
the Drive API at request time.

**Spreadsheet tabs** (in `CONFIG.SPREADSHEET_ID`, private to the deployer):

- First tab — student rows (headers: `studentNumber`, `firstName`,
  `middleName`, `lastName`, `nickname`, `period`, `course`, `gender`,
  `teacherEmail`, `personId`, `grade`, `teacherName`). The student data must be
  the **first** tab.
- `photos` — generated `studentNumber`, `fileId`.
- `admins` — one admin `email` per row (seed with `peterseibel@berkeley.net`).

**Client.** `index.html` bootstraps `window.MODEL/ROUTE/CTX` then includes, in
order: `js-dom` (`$`, `$$`, `el`) → `js-random` (`shuffled`) → `js-cards`
(`buildCard`, `thumbUrl`) → `js-study` (`runStudy` shared input/advance driver)
→ `js-learn` (`LearnState` — Fibonacci-row Leitner engine) → `js-review`
(`ReviewState` — single pass + missed requeue) → `js-home` (`renderHome`, card
flip) → `js-app` (controller: `showHome`/`showStudy`, deep-link dispatch, admin
banner). The `LearnState`/`ReviewState` engines are ports of the old
`learn.js`/`review.js`; only their bootstrap changed (they now take a card array
built from the injected JSON instead of scraping server-rendered DOM).

## Access / deployment facts

- `appsscript.json`: `webapp.access: DOMAIN`, `executeAs: USER_DEPLOYING`.
- Spreadsheet: shared only with the deployer (app reads it as the deployer).
- Photos folder: shared **view-only with the domain** so browsers can load
  thumbnail URLs. (Tradeoff: any domain account with a photo URL can view it.)
- Deploy from the `berkeley.net` account, not `peter@gigamonkeys.com`.
