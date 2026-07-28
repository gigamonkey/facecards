# Tuning the Learn scheduler

The Learn engine (`js-learn.html`) models each card with a forgetting curve.
A card's *stability* `s` is a half-life measured in cards asked: `t` trials
after a card was last shown, the predicted chance you still recall it is
`R = 2^(-t/s)`, and its *urgency* — the chance you've forgotten it — is
`w = 1 - R`. The next card is drawn at random with probability proportional
to urgency. Answering resets `t`; a correct answer grows `s`; a miss resets
`s`. All the knobs live at the top of `js-learn.html`.

Review mode (`js-review.html`) is this same engine with one override: unseen
cards enter play with stability already at the graduation bar (`priorS`),
an optimistic prior that a correct first answer confirms — the card
graduates on the spot, so a perfect run is a single shuffled pass. A miss
resets stability to `LEARN_START_S` like any other miss, so a missed card
falls into the normal Learn schedule below. All the knobs therefore apply
to Review too, and only to its missed cards.

## LEARN_START_S (currently 1)

The stability of a brand-new card, and what a miss resets stability to. With
`s = 1`, a card is 50% forgotten one trial later and 75% two trials later,
which is why missed cards reappear within about 2–3 cards.

Raising it makes new and missed cards come back more lazily and (see below)
lowers the introduction threshold, so the active pool runs more urgent
overall. There is little reason to move this; it is effectively the unit
that the other stabilities are measured in.

## LEARN_GROWTH (currently 3)

How much a correct answer grows stability: `s` is multiplied by
`1 + LEARN_GROWTH * (1 - R)`, where `R` is the predicted recall at the
moment the card was asked. A card answered while nearly forgotten grows by
up to `1 + LEARN_GROWTH` (4x); a card answered while still fresh barely
grows at all. This is what forces cards to earn graduation by surviving
real gaps rather than back-to-back easy reviews.

Raising it stretches gaps faster and shortens sessions; lowering it makes
the schedule more conservative (more asks per card at shorter spacing).

A first exposure is treated as maximally informative (`R = 0`), so a card
you already know jumps straight from `s = 1` to `s = 1 + LEARN_GROWTH` and
fast-tracks out. If first-exposure corrects should count for less (a lucky
guess vs. already knowing the student), seed `askedW` below 1 for unseen
cards in `deal()` — that adds roughly one ask to every card.

## LEARN_GRADUATED_S (currently 16)

The stability at which a card graduates (leaves the session). Together with
`LEARN_GROWTH` this sets session length:

- Perfect run, 30 cards: most cards graduate in 3 asks (mean ~3.4,
  ~100 asks total). The floor is 3 because the first correct reaches
  `s = 4` and no single ask can multiply by the full 4x needed to reach 16.

- Simulated fallible learner, 30 cards: ~8 asks per card, ~240 total.

Doubling it to 32 adds roughly one ask per card on a perfect run and makes
graduation demand retention across longer gaps; halving it to 8 makes
sessions much shorter but graduates cards on thin evidence.

Small decks can't produce long gaps, so the effective bar is capped per
session at `max(2 * LEARN_START_S, 2 * (deckSize - 1))` — this only kicks
in below 9 cards and is why a 2-card deck doesn't demand an 8-card gap it
can never have.

## LEARN_INTRODUCE_BELOW (derived — do not set directly)

The introduction threshold: a new card (or, once the deck is empty, an
already-graduated card as a spacer) is dealt only when no active card's
urgency reaches this value. It is *defined* as the urgency a just-missed
card has one trial after the miss (`1 - 2^(-1/LEARN_START_S)`, i.e. 0.5
today) so that a fresh miss always blocks new material: after any miss the
next card is existing material and the missed card follows close behind.

If you want to change introduction pacing, don't replace the formula with a
bare number — you'll silently lose that guarantee. Change the inputs
(`LEARN_START_S`) or add an explicit multiplier and re-verify the
no-new-card-after-a-miss property.

## Properties worth preserving

Any retuning should keep these (all verified by simulation on 1–60 card
decks):

- Sessions terminate, at a reasonable length (~6–8 asks per card for an
  imperfect learner).

- A missed card is re-asked within a few cards.

- No card is dealt twice in a row (except a 1-card deck, where it's
  unavoidable).

- No new card immediately after a miss (except the session's second card,
  when the missed first card is the only thing in play).

- Per-card gaps stretch as a card accumulates correct answers.

## Checking a change

There's no test harness in the repo, but the engine simulates easily: strip
the `<script>` tags from `js-learn.html`, provide a `shuffled()`, drive
`next()`/`correct()`/`incorrect()` with a fake learner (e.g. "always miss
first exposure, then recall with probability rising per exposure, with a
few percent slip rate"), and check the properties above — termination,
asks per card, re-ask gap after a miss, back-to-back repeats, and
new-card-after-miss counts across deck sizes from 1 to 60.
