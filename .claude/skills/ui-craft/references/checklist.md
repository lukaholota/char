# Design self-review

Look at the composite screenshot as a demanding product designer seeing it for the first time.
Fix what fails, then remove one thing that does not earn its place.

## First glance (5 seconds on the phone shot)

- Is it obvious what this screen is for and what to do next?
- Does the most important thing look the most important, by size, weight, position and contrast?
- Is there a single primary action? Is anything competing with it?
- Can a player who has not read the docs use it mid-game?

## Composition

- Spacing is consistent, and related items sit closer together than unrelated ones.
- Edges and baselines line up.
- No orphaned single elements, and no ragged columns of text.
- Density fits the surface: a sheet may be dense, a reader needs air.
- Every border, frame, divider and icon does a job. Remove decoration that carries no meaning.
- Nothing listed under "Default looks to avoid" in SKILL.md is present.

## Type and colour

- Phone text is at least 12px and labels do not shrink below body text.
- Headings are visibly different from body text, without needing caps.
- Body lines stay under ~75 characters. Use `text-wrap: balance` on short headings.
- Accent colour marks meaning (edition, selection, the primary action) rather than decorating.
- Contrast is readable on the dark glass, including muted text and disabled states.

## Touch and layout

- Tap targets are at least 40×40px and have room between neighbours.
- At 375px nothing scrolls horizontally, nothing is clipped, and nothing hides under the bottom
  navigation or the home indicator.
- Sticky and fixed parts do not eat the viewport on a short phone (667px tall).
- Modals and drawers use `overscroll-behavior: contain`. Use `touch-action: manipulation` where
  double-tap zoom would get in the way.
- Gestures always have a visible alternative.

## Access

- Interactive elements are `button` or `a` elements, not `div` elements with `onClick`.
- Icon-only buttons carry an `aria-label`.
- Focus is visible (`focus-visible`), and `outline-none` is always replaced by something.
- Inputs have labels.
- Heading levels follow each other in order.
- Images have `alt` text and set dimensions.
- The flow works with the keyboard on desktop.

## Content

- Ukrainian, sentence case, «ялинки», `…`, apostrophe `ʼ`.
- Terminology matches the dictionary and the current edition.
- Buttons name the action (`Зберегти зміни`, not `OK`).
- Errors do not apologise; they tell the user what to do.
- No raw keys, ids or English leaking into visible text. No filler sentences.

## States

- Empty, loading, error, offline, signed-out, very long text and 2014 vs 2024 have each been
  seen or deliberately reasoned through.
- State the ones you did not render in the report.
