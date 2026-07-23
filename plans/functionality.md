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

- [x] Home page shows the teacher's classes as grids of student photo cards

- [x] Classes are grouped by room + period (per teacher); the class name
      concatenates the distinct course names sharing that slot
      (e.g. `Biology / Biology H Period 2`)

- [x] Clicking a card flips it between the photo and the student's info
      (name, nickname, grade/gender, course/period, student number)

- [x] Per-class "learn" / "review" links, plus "learn all" / "review all"
      across all of the teacher's students

- [x] Student photos shown via Google Drive thumbnails; missing photos degrade
      to a blank card

- [x] On phones the photo grid is hidden and study mode is used instead

- [x] Shareable deep links open a specific study session directly
      (`?mode=learn|review&scope=class&id=<slug>`)

- [x] `?shared-with=<teacher>` shows a table of students the current teacher
      shares with the named teacher — photo, flashcard info, your class(es), and
      their class(es) — sorted by your period, then theirs, then last then first
      name (the teacher is matched by last name, username, or full email)

- [x] `?shared` shows an overview: every teacher the current teacher shares
      students with, each as a face grid (plus the other teacher's distinct
      classes for those students), with the teacher's name linking to their
      `?shared-with=` page

## Study modes

- [x] One card shown at a time; press a key or tap to reveal the back, then
      right arrow / swipe right = got it, left arrow / swipe left = missed

- [x] Keyboard (arrow keys) and touch-swipe input

- [x] **Learn** mode: spaced-repetition engine (Leitner boxes sized by the
      Fibonacci sequence); wrong answers recycle to the deck

- [x] **Review** mode: one pass through the deck, then re-runs only the missed
      cards until none remain ("Perfect run!" when nothing was missed)

- [x] Study scope is one class or all of the teacher's students

## Administration

- [x] Student roster and section assignments come from a Google Sheet

- [x] Admins (listed in an `admins` sheet tab, editable without redeploying) can
      impersonate any user via `?as=` or a "view as" box, with a banner and a
      "back to my view" link

- [x] Bare usernames are accepted anywhere an email is expected (admins tab and
      "view as"); `@berkeley.net` is appended automatically

- [x] Photo lookup is (re)built from the Drive folder into a `photos` sheet tab
      by running `refreshPhotoMap` after uploading new images

## Planned

- [ ] Per-section volunteer access: a teacher can assign a volunteer to a
      specific section, and that volunteer gets a page scoped to just that
      section's grid and learn/review (v2 — see `done/appscript-conversion.md`)
