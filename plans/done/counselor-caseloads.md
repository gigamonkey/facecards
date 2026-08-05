# Counselor caseloads

Give counselors their students in the app. Counselors don't appear in the
roster export (it's class-based), but all the student-level data the app
needs — name, nickname, grade, gender, photo, full schedule — is already in
the normalized blob keyed by student number (`buildData`, `Code.js`). So the
only new *data* is a mapping from student number to counselor email; the work
is presenting a caseload in the model.

**Presentation decision:** a counselor's caseload appears as class-like
groups, one per grade ("Grade 9", "Grade 10", …), folded into
`model.classes`. Grade-sized groups keep Learn decks manageable (a whole
caseload is ~300 students), and reusing the `classes` shape means the home
grid, study modes, deep links, `hasOwn`, and saved progress all work with
essentially no client changes — unlike inventing a parallel `model.caseload`
key that every client code path would have to learn about. The join itself
copies the `listsFor` pattern (`Code.js:230`): resolve numbers through
`studentBase` + `scheduleFor`, silently dropping numbers not in the roster.

## New spreadsheet tab: `counselors`

One row per (student, counselor):

- `studentNumber` — roster student number.

- `counselorEmail` — the counselor's `berkeley.net` address (bare usernames
  qualified via `qualifyEmail`, aliases canonicalized via
  `canonicalStaffEmail` so a Workspace-alias address in the export still
  matches the login address).

- `counselorName` — "Last, First" like the roster's `teacherName`; shown as
  the counselor's name in teachers' shared views and used for the Mine page
  heading and `?shared-with=` name matching. Technically optional (username
  fallback), but the export should include it.

Extra columns are ignored. Like every tab, edits require `clearCaches()` —
but the upload flow (below) handles that itself.

## Server changes (`Code.js`)

1. **Read the tab into the data blob.** `COUNSELORS_SHEET = 'counselors'`;
   `readCounselors()` like `readLists()` (`[]` if the tab doesn't exist, so
   nothing changes until the tab is created). In `buildData()`, build
   `data.caseloads = { username: { last, full, students: [nums…] } }` (names
   parsed from `counselorName` like the roster's `teacherName`; username as
   the fallback), skipping rows whose number or email is empty, and push the
   counselor's username onto a new `students[num].counselors` array — the
   per-student reverse index the shared views walk, parallel to
   `st.teachers`. Don't require the number to be in `students` here — filter
   at model-build time like `listsFor` does. Living inside `buildData` means
   it's covered by the existing `data` cache entry and `clearCaches()`
   invariant for free.

2. **Fold caseload groups into the model.** In `buildModelUncached()`
   (`Code.js:187`), after the periods loop: if
   `data.caseloads[username(email)]` exists, group its numbers by
   `data.students[num].grade` (dropping unknown numbers), one entry in
   `classes` per grade:

   - slug: `slugify(username + '-g' + grade)` — can't collide with class
     slugs, which are `username + '-p' + period`;

   - name: `'Grade ' + grade` (empty grade → a final "No grade" group);
     groups added in numeric grade order, after any real classes;

   - students: `studentBase` + `scheduleFor`, with `course: ''` and
     `period: ''` (see the card tweak below);

   - `model.teacherLast`: when the viewer has no `data.teachers` entry, use
     the caseload's `last` (parsed from `counselorName`) so the Mine heading
     isn't blank.

   Everything downstream is automatic: `hasOwn` (`Code.js:72`) counts
   `model.classes`, so counselors get the Mine/Shared chrome and skip the
   landing page; `?mode=learn&scope=class&id=<username>-g9` deep links work;
   per-deck saved progress keys off the slug.

3. **Shared views, both directions.** Sharing is symmetric: counselors see
   which teachers teach their advisees, and teachers see their students'
   counselors.

   - *Counselor as viewer:* `buildSharedModelUncached` and
     `buildSharedOverviewUncached` derive "my students" from
     `myStudentNums(me)` where `me = data.teachers[username]` — a pure
     counselor has no such entry and gets nothing. Union the viewer's
     caseload numbers into that set in both (and don't bail early when `me`
     is undefined but a caseload exists). In the `?shared-with=` table, the
     "my classes" cell for a caseload-only student is `['Counselor']`, with
     `minePeriod` a finite sentinel (9999, matching `periodNum`'s fallback)
     so the sort stays NaN-free.

   - *Teacher as viewer:* in `buildSharedOverviewUncached`, walk
     `st.counselors` alongside `st.teachers` (`Code.js:336`) and emit
     counselor entries in the same `teachers` list: name from
     `data.caseloads`, photo via the existing `staffPhotoByUsername` join
     (counselors are staff), `courses: ['Counselor']` — the overview client
     renders whatever `courses` it gets (`js-shared.html:131`), so no client
     change. The row links to `?shared-with=<counselor>` like any other. For
     that page to resolve, extend `resolveTeachers` and `teacherNamesFor` to
     also match caseload holders (email, username, last/full from
     `counselorName`), match students by `st.counselors`, and render the
     "their classes" cell as `['Counselor']` with the same 9999 period
     sentinel.

4. **Owner upload: `uploadCounselors(csv, as)`.** Mirror `uploadRoster`
   (`Code.js:1022`): owner-only gate, delimiter sniffed from the header
   line, required headers `studentNumber` + `counselorEmail`, whole-tab
   replace under the script lock with plain-text formats, then
   `clearCaches()` + `getData()` rewarm. Guards before touching the tab:
   headers present, and a row floor — every BHS student has a counselor, so
   a real export has thousands of rows; require ≥1000 valid
   (number + email-shaped) rows. Return counts including how many rows
   matched no roster student, so a mismatched export is visible immediately.
   (Until this lands, hand-pasting into the tab + `clearCaches()` from the
   editor works.)

## Client changes

1. **Card class line** (`js-cards.html:50`): the back currently always
   renders `Period N` when `hideClass` is unset, which for a caseload
   student (empty course and period) would render a dangling "Period ".
   Change it to skip the line entirely when both are empty (and show just
   the course when only the period is empty). Class and list cards are
   unaffected.

2. **Navbar upload** (`js-app.html:366`): generalize `buildRosterOverlay`
   to take a small config (title, hint text, `google.script.run` endpoint)
   and add a "Counselors" button beside "Roster" in the owner chrome,
   reusing the same modal shell.

3. **Copy** (optional): the help overlay and menu speak of "classes";
   caseload grades read fine as classes, so only touch this if the phrasing
   grates in practice.

Nothing else: `renderHome`, `studentsFor`/`titleFor` (`scope=class`), study
modes, browse (the schedule table is genuinely useful for counselors), and
photo loading all treat the grade groups as ordinary classes.

## Docs and ops

- CLAUDE.md: add the `counselors` tab to the spreadsheet-tabs list; mention
  the second navbar upload.

- DEPLOY.md: the tab's shape, the upload flow, and the `clearCaches()` rule
  for hand edits.

## Testing

Seed the tab with a handful of rows for a test counselor email, then
`?as=<counselor>` as an admin: menu shows all three boxes; Mine shows the
grade grids; Learn/Review/Browse work per grade and for "All students";
browse shows schedules; `?shared` lists the advisees' teachers. Then
`?as=` a teacher of one of those advisees: their `?shared` overview shows
the counselor (photo, name, "Counselor", count), and its link opens a
`?shared-with=` table of the students they share, sorted sanely. Views of a
teacher with no seeded advisees are unchanged. Then upload a real export
through the new button
and re-check, plus confirm the guards reject a header-less or truncated
file. Verify a caseload student with no photo still gets the initials box.
