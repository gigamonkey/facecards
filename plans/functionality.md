# Functionality

User-visible functionality of Facecards. Checked items are implemented and
live; unchecked items are planned.

## Access and identity

- [x] Sign-in restricted to `@berkeley.net` accounts; `@students.berkeley.net`
      (students) are refused with "Not authorized"

- [x] Each teacher sees only the sections they teach (other teachers' data is
      never sent to the browser)

- [x] `@berkeley.net` users with no sections get a "contact Mr. Seibel" landing
      page instead of an empty view

## Home and navigation

- [x] A top navbar (Home / Mine / Shared) appears on every page; admins also get
      the impersonation controls (view-as, "back to me") there

- [x] A "?" in the navbar opens a help overlay explaining Mine vs. Shared and
      the Learn / Review / Browse modes, with device-appropriate instructions
      (tap/swipe vs. keys); closed by its ×, clicking the backdrop, or Escape

- [x] Home page is a menu with two choices: "Learn students' names" (the class
      face grids, at `?learn`) and "See shared students" (`?shared`), plus a QR
      code to the app URL for opening it on a phone

- [x] `?learn` shows the teacher's classes as grids of student photo cards

- [x] Classes are grouped by room + period (per teacher); the class name
      concatenates the distinct course names sharing that slot
      (e.g. `Biology / Biology H Period 2`)

- [x] Clicking a card flips it between the photo and the student's info
      (name, nickname, grade/gender, course/period, student number)

- [x] Per-class Learn / Review / Browse buttons, plus the same three across all
      of the teacher's students

- [x] Home and shared grids show student photos via Google Drive thumbnail URLs;
      a student with no photo shows a box with their initials instead (everywhere
      — grids, study cards, and the shared views)

- [x] On phones the photo grid is hidden and study mode is used instead

- [x] Shareable deep links open a specific study session directly
      (`?mode=learn|review|browse&scope=class&id=<slug>`)

- [x] `?shared-with=<teacher>` shows a table of students the current teacher
      shares with the named teacher — photo, flashcard info, your class(es), and
      their class(es) — sorted by your period, then theirs, then last then first
      name (the teacher is matched by last name, username, or full email). On
      mobile it's a swipe-through viewer: one student at a time (photo, info,
      both teachers' classes), swipe left/right to move

- [x] `?shared` shows an overview: every teacher the current teacher shares
      students with, each as a face grid (plus the distinct course names those
      students take with that teacher), with the teacher's name linking to their
      `?shared-with=` page. On mobile it's a plain list of teachers with
      shared-student counts

## Study modes

- [x] One card shown at a time; press a key or tap to reveal the back, then
      right arrow / swipe right = got it, left arrow / swipe left = missed

- [x] Keyboard (arrow keys) and touch-swipe input

- [x] Study photos load one at a time through the script (not Drive thumbnail
      URLs), so they work on mobile browsers like Safari that block the
      cross-site Drive cookies the grids rely on; each is cached for the session
      and the rest are prefetched in the background

- [x] A not-yet-loaded study card shows the student's initials, not their name,
      so it doesn't give away the answer

- [x] On phones, larger study photos and info text than the grids

- [x] **Learn** mode: spaced-repetition engine (Leitner boxes sized by the
      Fibonacci sequence); wrong answers recycle to the deck

- [x] **Review** mode: one pass through the deck, then re-runs only the missed
      cards until none remain ("Perfect run!" when nothing was missed)

- [x] **Browse** mode: the students one at a time with everything visible — the
      photo, name, grade/gender, and a table of the student's full schedule
      (period, class, teacher, across all their teachers) — swiping or arrow
      keys to move between students

- [x] Study scope is one class or all of the teacher's students

## Administration

- [x] Student roster and section assignments come from a Google Sheet

- [x] Admins (listed in an `admins` sheet tab, editable without redeploying) can
      impersonate any user via `?as=` or a "view as" box, with a banner and a
      "back to my view" link

- [x] Impersonation survives navigation — client-built links re-append `?as=`
      (Apps Script offers no cookies or session state)

- [x] Bare usernames are accepted anywhere an email is expected (admins tab and
      "view as"); `@berkeley.net` is appended automatically

- [x] Photo lookup is (re)built from the Drive folder into a `photos` sheet tab
      by running `refreshPhotoMap` after uploading new images; it also writes a
      `missing photos` tab (personId, studentNumber) of students with no photo

## Planned

- [ ] Custom lists (admin-only): an admin can upload a text file of student
      numbers (one per line, any students in the roster) as a named list that
      appears on the Mine page with its own face grid and Learn / Review /
      Browse, and can be replaced or deleted (see `custom-lists.md`)

- [ ] Per-section volunteer access: a teacher can assign a volunteer to a
      specific section, and that volunteer gets a page scoped to just that
      section's grid and learn/review (v2 — see `done/appscript-conversion.md`)
