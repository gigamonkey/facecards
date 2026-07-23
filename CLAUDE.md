# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Facecards is a flashcard web app for Berkeley (`berkeley.net`) teachers to learn
and review the names and faces of the students in their classes. Teachers sign
in with Google, see their classes as grids of student photo cards, and drill
themselves with two study modes.

## Running

There is no `start` script and no test framework (`npm test` is a stub). Run the
server directly with the required environment variables set:

```bash
node index.js
```

Required env vars (loaded via `dotenv/config`, imported in `google-oauth.js`):

- `PORT` — port to listen on
- `SECRET` — express-session secret
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URL` — Google OAuth

Format code with Prettier (`npx prettier`); `.prettierrc` has a `*.njk` override
(HTML parser, 80 cols).

This is an ESM project (`"type": "module"`) — use `import`, not `require`.

## Required runtime data (not in git)

The app depends on two things that are gitignored and must be provided out of
band (image management and generation were stripped from this branch — see
commit `4be40c6`):

- `students.tsv` — read once at startup by `index.js`. Every class/teacher/auth
  data structure is derived from it, so the server will not start without it.
  Columns referenced in code: `course`, `period`, `teacherName`,
  `teacherEmail`, `firstName`, `lastName`, `nickname`, `grade`, `gender`,
  `studentNumber`.
- `public/images/{studentNumber}.jpg` — one photo per student, served
  statically and referenced by templates.

## Architecture

Single Express server, all routing and startup in `index.js`. No database:
`students.tsv` is loaded once at boot and reduced into in-memory maps.

**Data model (built once at startup in `index.js`):** iterating the TSV rows
produces:

- `classes` — keyed by a `slugify(course-p-period-teacher)` slug; each holds its
  student rows.
- `teachers` — keyed by the local part of the teacher email; each holds its
  classes and students.
- `emails` — the authorization allowlist. Seeded with every `teacherEmail` from
  the TSV; extra individuals (e.g. volunteers) are added by hand in `index.js`
  (see the `emails['...@volunteers.berkeley.net'] = true` line).
- `users` — in-memory session user store (populated by passport
  serialize/deserialize).

**Auth (two gates, both must pass):**

1. `google-oauth.js` — passport Google strategy. Rejects any profile whose
   hosted domain (`hd`) does not end in `berkeley.net`.
2. `requireLogin` middleware in `index.js` — redirects anonymous users to
   `/login`, then checks the authenticated email against the `emails` allowlist,
   returning `403` if absent. Every content route is wrapped in `requireLogin`.

**Views (`nunjucks`, in `views/`):**

- `index.njk` — home page; renders teachers → classes → student photo-card
  grids with "learn"/"review" links.
- `study.njk` — the study screen. It receives a `script` variable and loads
  `/js/{{script}}.js`, so the same template drives both study modes.

**Study routes** share `study.njk` and pick the deck by URL shape. `/learn` and
`/review` each come in three forms — bare (all students), `/p/:slug` (one
class), `/t/:teacher` (all of a teacher's students) — and the leading path
segment (`learn` or `review`) becomes the `script` variable.

**Frontend (`public/js/`, ES modules, no build step):**

- `index.js` — home page; click a card to flip photo ↔ info.
- `learn.js` — "learn" mode. A Leitner-style spaced-repetition engine: cards
  advance through rows sized by the Fibonacci sequence; a wrong answer sends a
  card back to the deck. See the `State`/`Row` classes.
- `review.js` — "review" mode. Simpler: run through the deck once, then re-run
  only the missed cards until none remain ("Perfect run!" if none were missed).
- Both study modes advance with left/right arrow keys or touch swipes (left =
  wrong, right = correct); first keypress/tap reveals the card back.
- `dom.js` — small DOM helper library (`$`, `$$`, element builders).
- `random.js` — `shuffled()` Fisher–Yates.
- `file-utils.js` — TSV/JSON load/dump helpers used server-side.
