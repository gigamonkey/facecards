# Custom student lists

Let a teacher upload a plain-text list of student numbers (one per line) and
save it as a named custom list they can then study (Learn / Review / Browse)
like a class. The list may include any student in the roster, not just the
teacher's own students — e.g. "all the computer science students," some of whom
have other teachers. Producing the list is out of scope; the app just accepts
an upload and stores it.

## Storage: one `lists` tab

One new spreadsheet tab, `lists`, holding all teachers' lists together, one row
per list membership:

| teacherEmail | listName | studentNumber |
| --- | --- | --- |
| `frizzle@berkeley.net` | CS students | 123456 |
| `frizzle@berkeley.net` | CS students | 234567 |
| `frizzle@berkeley.net` | Advisory | 345678 |

**Why one tab rather than a tab per teacher:** it reads with the existing
`sheetToObjects` helper in one scan (the same pattern as `rosters` and
`photos`); it needs no dynamic tab creation, enumeration, or naming rules; and
there is no collision risk with the reserved tabs (`rosters`, `photos`,
`missing photos`, `admins`). Per-teacher tabs buy nothing — the server always
filters by `teacherEmail` anyway, and the data volume is trivial.

The tab is created on first save if it doesn't exist (same
`getSheetByName(...) || insertSheet(...)` move as `refreshPhotoMap`).

A list is identified by `(teacherEmail, listName)`. Uploading a file under an
existing name **replaces** that list; a separate control deletes one.

## Server (`Code.js`)

### Reading lists into the model

- `LISTS_SHEET = 'lists'`; `readLists()` — `sheetToObjects` over the tab
  (empty array if the tab doesn't exist yet).

- `buildModelUncached(email)` gains a `lists` field alongside `classes`:
  filter `readLists()` rows to this email, group by `listName`, and map each
  student number through the existing `studentBase(data, num)` +
  `scheduleFor(data, num)` — exactly what classes do, so cards, photos, and
  browse-mode schedules come for free. Model shape:

  ```js
  { teacherLast, classes: {...}, lists: { 'list-cs-students': { slug, name, students: [...] } } }
  ```

  Slugs are `'list-' + slugify(name)` — the prefix can't collide with class
  slugs (`<username>-p<period>`). Since `getData()` holds *all* students, a
  list naturally reaches students the viewer doesn't teach; each carries the
  full `schedule` for browse mode. Numbers not found in the roster are dropped
  at model-build time (they'd render as empty cards).

- The landing-page check in `doGet` becomes "no classes **and** no lists", so
  a list uploaded for a non-teaching staff member still renders. (Note the
  chicken-and-egg: someone with no sections can't reach the upload UI
  themselves; an admin would have to upload for them via `?as=`. Fine for now.)

### Saving and deleting — `google.script.run` endpoints

```js
function saveList(name, text, as) -> { saved: n, unknown: ['123', ...] }
function deleteList(name, as) -> true
```

- **Auth mirrors `doGet`**, re-derived server-side on every call (never trust
  the client): `actual = Session.getActiveUser()`, must pass
  `isBerkeleyStaff`; `effective = (isAdmin && as) ? qualifyEmail(as) : actual`.
  Factor this into a shared helper used by `doGet` and both endpoints. The
  client passes its `?as=` param so admin impersonation carries through
  (there's no other session state to lean on).

- **Parsing**: split the uploaded text on newlines, trim, skip blanks; each
  remaining line must be all digits, else it's reported back as unrecognized.
  Numbers are validated against `getData().students`; known ones are saved,
  unknown ones returned in `unknown` so the client can show "saved 42
  students; 3 numbers not found: …". Saving an empty result (no valid
  numbers) is an error, not an empty list.

- **Writing**: read the whole `lists` tab, drop rows matching
  `(effective, name)`, append the new rows, rewrite the tab. It's a
  read-modify-write, so wrap it in `LockService.getScriptLock()` — two
  teachers saving at once must not clobber each other. `deleteList` is the
  same minus the append.

### Cache invalidation — targeted, not `clearCaches()`

`clearCaches()` bumps the global version and throws away the expensive
normalized-roster blob (~5–7 s cold rebuild) for everyone — far too heavy for
one teacher editing one list. Instead add a targeted invalidation:

```js
function invalidateModel(email) // cache.remove the 'model:<username>' chunk keys + ':n'
```

(read the `:n` chunk count, then `removeAll` the chunk keys). `saveList` /
`deleteList` call it for the effective user. The data blob, other viewers'
models, and the shared-view caches (which don't involve lists) stay warm.

## Client

### Routing and study (`js-app`)

- `studentsFor(scope, id)`: add `scope === 'list'` → `MODEL.lists[id].students`.
- `titleFor`: the list's name.
- Deep links `?mode=learn|review|browse&scope=list&id=list-cs-students` work
  with no `doGet` change — `scope`/`id` already pass through.

### Mine page (`js-home`)

After the classes and the "All students" row, a **My lists** section:

- Each list renders exactly like a class: `classHead(name, onStudy, 'list',
  slug)` with the Learn / Review / Browse buttons, then the face grid of its
  students — plus a small "delete" affordance per list (with a `confirm()`).

- An **"Add a list"** form: a name input and `<input type="file">`. The file
  is read client-side with `FileReader.readAsText` and the text passed to
  `google.script.run.saveList(name, text, as)` — no multipart upload
  machinery, and the server never touches Drive. On success, navigate to
  `appUrl('?learn')` (a full reload; the freshly-invalidated model rebuilds
  with the new list). On `unknown` numbers, show them in the confirmation.
  Disable the submit while the call is in flight.

- Help overlay (`js-app`): one added paragraph under "On the Mine page"
  explaining custom lists.

Phones hide the face grids via CSS; the My lists headings/buttons follow
whatever the class headings do. Uploading from a phone is possible but not a
goal — list-making happens at a desk.

## Implementation order

1. Server read path: `readLists`, `lists` in the model, landing check. Verify
   by hand-entering rows in the tab and deep-linking
   `?mode=browse&scope=list&id=...`.
2. Client: `scope === 'list'` in `studentsFor`/`titleFor`; My lists grids on
   the Mine page.
3. Server write path: shared auth helper, `saveList`/`deleteList` with lock,
   validation, `invalidateModel`.
4. Client upload form + delete control + help text.
5. Manual tests: upload as self; upload while impersonating (`?as=`) lands
   under the impersonated teacher; re-upload same name replaces; unknown
   numbers reported; delete; deep links; other users' cached models unaffected
   (no global cache bump).

## Open questions

1. **Paste as well as upload?** A `<textarea>` to paste numbers into costs
   almost nothing once `saveList(name, text)` exists (same call, no
   FileReader) and is friendlier than making a file just to upload it.
   Recommend: yes — file input *and* textarea feeding the same endpoint.
2. **Replace-on-same-name** semantics OK, or should re-upload merge?
   (Recommend replace — it's predictable and "merge" is achievable by
   re-generating the file.)
3. Should the `unknown` numbers block the save (make the teacher fix the file)
   or just be reported after saving the rest? (Plan says save-and-report.)
4. Any need for admins to see/manage *all* lists, or is per-teacher (plus
   `?as=` impersonation) enough? (Assume the latter.)
