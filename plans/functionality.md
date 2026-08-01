# Functionality

User-visible functionality of Facecards. Checked items are implemented and
live; unchecked items are planned.

## Access and identity

- [x] Sign-in restricted to `@berkeley.net` accounts; `@students.berkeley.net`
      (students) are refused with "Not authorized"

- [x] Each teacher sees only the sections they teach (other teachers' data is
      never sent to the browser)

- [x] `@berkeley.net` users with no sections still get the app — the staff
      directory, with the Mine/Shared links and menu boxes hidden; only a
      Mine or student-study deep link shows them a "contact Mr. Seibel"
      landing page

## Home and navigation

- [x] A top navbar (Home / Mine / Shared / Staff) appears on every page (Mine
      and Shared are hidden for viewers with no sections); admins also get
      the impersonation controls (view-as, "back to me") there

- [x] A "?" in the navbar opens a help overlay explaining Mine vs. Shared and
      the Learn / Review / Browse modes, with device-appropriate instructions
      (tap/swipe vs. keys); closed by its ×, clicking the backdrop, or Escape

- [x] Home page is a menu with three choices: "Learn students' names" (the
      class face grids, at `?learn`), "See shared students" (`?shared`), and
      "Learn staff names" (`?staff`), plus a QR code to the app URL for
      opening it on a phone

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

- [x] `?shared` shows an overview: a table of every teacher the current
      teacher shares students with — a large staff photo (or initials) linking
      to their `?shared-with=` page, beside their name, the courses they
      teach, and the shared-student count. The same table on all devices

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

- [x] **Learn** mode: spaced-repetition engine (per-card forgetting curve;
      see `TUNING.md`); missed cards come back quickly, at stretching gaps

- [x] **Review** mode: the Learn engine with an optimistic prior — a single
      pass if nothing is missed ("Perfect run!"), with missed cards falling
      into the Learn schedule until relearned

- [x] **Browse** mode: the students one at a time with everything visible — the
      photo, name, grade/gender, and a table of the student's full schedule
      (period, class, teacher, across all their teachers) — swiping or arrow
      keys to move between students

- [x] Study scope is one class, all of the teacher's students, a custom list,
      or the staff directory

- [x] A progress bar (retired cards / total) sits at the bottom of Learn and
      Review sessions, with a Start over button that discards the deck's
      saved progress

- [x] Learn/Review progress is saved per deck (in the browser), so a session
      can be left and resumed later — cards already retired stay retired

## Custom lists

- [x] Custom lists (owner-only): the app owner can upload a text file of
      student numbers (one per line, any students in the roster) — or a TSV
      with the student number first and extra columns shown on the back of
      the card — as a named list on the Mine page with its own face grid and
      Learn / Review / Browse; saving under an existing name replaces that
      list, and each list has a Delete button (behind an in-page confirm
      dialog)

- [x] Lines that aren't roster student numbers don't block a save — they're
      reported inline after saving

## Staff directory

- [x] The Staff page shows the BHS staff directory (scraped from the public
      site into a `staff` tab) as a face grid with Learn / Review / Browse
      and a name/role filter that narrows both the grid and the study decks;
      photos come from the directory's public image URLs (initials box where
      the directory has only its placeholder)

- [x] Staff cards show the courses each member teaches (joined from the
      roster by email)

- [x] The viewer's own card is left out of their staff study decks

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

- [x] The staff directory is (re)built by running `refreshStaffDirectory`;
      when the site's firewall blocks Google's fetch, an admin can upload the
      page's saved HTML from the Staff view, or scrape locally with
      `scripts/scrape-staff.mjs`

- [x] Staff corrections live in a `staff overrides` sheet tab (per-field:
      name, role, email, photo, opt-out), merged over the scraped rows so a
      re-scrape never clobbers an edit; an opted-out member appears nowhere
      in the app

- [x] An `aliases` sheet tab maps a staff member's Workspace alias email to
      their roster/login address, so either address works everywhere
      (course joins, overrides, `?as=`)

## Planned

- [ ] Per-section volunteer access: a teacher can assign a volunteer to a
      specific section, and that volunteer gets a page scoped to just that
      section's grid and learn/review (v2 — see `done/appscript-conversion.md`)
