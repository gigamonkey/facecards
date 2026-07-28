# Deploying Facecards from scratch

Facecards is a Google Apps Script web app managed with
[`hug`](https://github.com/gigamonkeys/hug) (a `clasp` wrapper). It reads
student data from a Google Sheet and student photos from a Drive folder, and is
restricted to `@berkeley.net` staff. This walks through a first-time deploy.

Everything must be done as the **`berkeley.net` account** that will own the
spreadsheet and photos — the app deploys with domain-restricted access and runs
_as the deploying user_ (`executeAs: USER_DEPLOYING`), so that account's
identity is what reads the sheet and folder. Do **not** use a personal
(`@gmail.com` / `@gigamonkeys.com`) account.

## 1. Prerequisites

- Node.js + npm.
- `hug` on your PATH. If it isn't installed:

  ```bash
  npm install -g @peterseibel/hug
  # …or, from a local checkout (e.g. ~/hacks/hug):
  cd ~/hacks/hug && npm install && npm link
  ```

- Logged in to clasp **as the berkeley.net account**:

  ```bash
  npx clasp login
  ```

  This opens a browser; pick the `berkeley.net` account. Credentials are stored
  globally in `~/.clasprc.json` and persist across projects.

## 2. Prepare the Google resources

You need a spreadsheet and a photos folder, and their IDs. The ID is the long
token in the URL: `https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit`,
`https://drive.google.com/drive/folders/<FOLDER_ID>`.

### Spreadsheet

Owned by (or shared only with) the deploying account — nobody else needs access,
because the app reads it _as_ that account.

- **`rosters` tab — student data.** A tab literally named `rosters`. Row 1 is a
  header row; the code keys off these column names:
  `studentNumber`, `firstName`, `middleName`, `lastName`, `nickname`, `period`,
  `course`, `gender`, `teacherEmail`, `personId`, `grade`, `teacherName`.
  Each teacher sees only the rows whose `teacherEmail` matches their login.
- **`admins` tab.** A tab literally named `admins`, with a header row containing
  `email`, then one admin address per row. Seed it with:

  ```
  email
  peterseibel@berkeley.net
  ```

  Admins can impersonate any user via `?as=` (see §7). Missing/empty tab ⇒ no
  admins.
- **`photos` tab.** You don't create this by hand — `refreshPhotoMap` generates
  it in §5.
- **`staff` tab.** Also generated, not hand-made — `refreshStaffDirectory`
  scrapes the public BHS staff directory into it (see §7). Until it has run,
  the Staff section just shows a "no staff data yet" note.

### Photos folder

- Contains one JPEG per student named `<studentNumber>.jpg` (e.g. `104822.jpg`).
- **Share it view-only with the `berkeley.net` domain.** The photos are shown via
  `drive.google.com/thumbnail` URLs that the viewer's own browser fetches, so
  each file must be readable by the signed-in user. (Tradeoff: any domain
  account with a photo's URL can view that photo outside the app. Students, on
  `@students.berkeley.net`, are a different domain and are not granted access.)

## 3. Create the Apps Script project

From this repository's directory (the one with `Code.js` and `appsscript.json`),
create a new Apps Script project from the existing code and push it:

```bash
hug init --bare facecards
```

`--bare` means "the code came first": it creates a new standalone Apps Script
project titled _facecards_, writes `.clasp.json`, and pushes the local files.
Only the Apps Script sources are pushed — `appsscript.json`, `Code.js`,
`config.js`, and the `*.html` files — per `.claspignore`.

## 4. Point it at your resources

```bash
hug config set SPREADSHEET_ID=<SPREADSHEET_ID> DRIVE_FOLDER_ID=<FOLDER_ID>
hug push
```

`hug config set` writes these into `config.js` (committed to git; the code reads
them as `CONFIG.SPREADSHEET_ID` / `CONFIG.DRIVE_FOLDER_ID`). `hug push` uploads
the updated `config.js` so the next step can use it.

## 5. Build the photo map

`refreshPhotoMap` scans the Drive folder for `<studentNumber>.jpg` files and
writes the `studentNumber → fileId` map into the `photos` tab, so serving pages
never has to hit the Drive API.

```bash
hug open        # opens the Apps Script editor in your browser
```

In the editor: pick `refreshPhotoMap` from the function dropdown and **Run**.
The first run triggers an OAuth consent screen — authorize the requested scopes
(Sheets, Drive read-only, your email address). When it finishes, confirm the
`photos` tab in the spreadsheet is populated.

Re-run `refreshPhotoMap` any time you add or change photos — that's the only
maintenance the photo map needs.

## 6. Deploy and verify

```bash
hug deploy "initial web app"
```

This pushes, cuts a version, and creates/updates the web-app deployment (access:
domain, execute as: you — from `appsscript.json`). Print the deployment URL:

```bash
hug deployments
```

Open the `…/exec` URL and check:

- **You** (an admin who also teaches) see your own sections, home grid, and both
  learn/review modes.
- A **non-teacher** `@berkeley.net` account sees the "contact Mr. Seibel" landing
  page.
- A **`@students.berkeley.net`** account is refused ("Not authorized").
- Photos load (they may take a moment the first time, then cache in the browser).

## 7. Day-to-day

- **New/updated photos:** upload to the folder, then run `refreshPhotoMap` (§5)
  — it also clears the cache, so the changes show up immediately.
- **Edited the roster or `admins` tab:** run `clearCaches` from the editor so the
  change appears right away. (Data is cached for up to 6 hours, so without this
  the edit still takes effect within that window on its own.)
- **Staff directory changed** (start of each year at minimum): run
  `refreshStaffDirectory` from the editor. It re-scrapes
  <https://bhs.berkeleyschools.net/staff/> into the `staff` tab and clears the
  caches. If it throws "did the page layout change?", the page's table markup
  no longer matches the parser — fix `parseStaffDirectory` before re-running
  (the tab is left untouched on failure).
- **Keep it fast (recommended):** add a time-driven trigger for `warmData` so the
  expensive roster rebuild happens in the background, not on a user's page load.
  In the editor: **Triggers** (clock icon) → **Add Trigger** → function
  `warmData`, event source **Time-driven**, **Hour timer**, **Every hour**.
- **Impersonate a user** (admins only): append `?as=teacher@berkeley.net` to the
  app URL to see exactly what that teacher sees, or use the "view as" box in the
  admin banner. A non-admin passing `?as=` is ignored.
- **Ship code changes:** `hug deploy "what changed"`. Roll back with
  `hug deploy --rollback <versionNumber>` (`hug versions` lists them).

## Troubleshooting

- **Everyone gets "Not authorized."** The gate reads
  `Session.getActiveUser().getEmail()`. It returns the address for users in the
  same Workspace as the deployer; if it comes back empty, confirm you deployed
  from the `berkeley.net` account and that testers are on `@berkeley.net`.
- **Authorization / scope errors.** The requested scopes are pinned in
  `appsscript.json` (`oauthScopes`: Sheets, Drive read-only, userinfo.email,
  external requests — the last for `refreshStaffDirectory`'s fetch of the staff
  directory page). If a scope is rejected or missing, adjust that list,
  `hug push`, and re-authorize.
- **Photos are blank.** Check the folder is shared view-only with the domain,
  filenames are exactly `<studentNumber>.jpg`, and `refreshPhotoMap` has run and
  filled the `photos` tab.
- **A teacher sees no sections.** Their login must exactly match a `teacherEmail`
  value in the student tab (case/whitespace are normalized, the address is not).

## Optional: a staging copy

To try changes against a test sheet without touching production, use hug's
branch-per-environment pattern:

```bash
git switch -c staging
hug fork                                   # new Apps Script project for this branch
hug config set SPREADSHEET_ID=<test-id>    # point at a test spreadsheet
hug deploy "staging"
```

`.clasp.json` and `config.js` are per-branch, so `git switch main` returns you to
production.
