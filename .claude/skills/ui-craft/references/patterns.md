# UX patterns by surface

Read only the section for the surface you touch. Hard technical rules for gestures, modal
history and WebKit are in `docs/WORKFLOWS.md#ui-and-browser-checks`. Read that section whenever
you touch sheet slides, dialogs or `history`.

## Everywhere

- **One clear primary action per view.** Secondary actions are quieter: ghost or outline, or a
  menu.
- **Show the consequence where the choice is made.** For example, what a feat grants, or what
  changes on the sheet. Do not send the player elsewhere to find out.
- **Design every state, not only the happy one:**
  - empty states say what to do next;
  - loads longer than ~300ms get a skeleton shaped like the final layout;
  - errors say what happened and how to fix it, and keep the user's input;
  - offline uses `NetworkRequiredNotice`;
  - signed-out users get a path to sign in.
- **Destructive actions.** If the action can be undone, prefer a sonner toast with «Скасувати»
  over a confirmation dialog. Confirm only what cannot be undone.
- **Long Ukrainian words.** Use `min-w-0` on flex children, plus `break-words`/`hyphens-auto`,
  and truncate or line-clamp only when the full text is reachable elsewhere.
- **Numbers.** Bonuses, HP and counters use `tabular-nums`. Signed values look like `+2`.
- **Performance.** Do not import catalog data (`spellsData`) into client components; use
  `spell-link.ts`-style lightweight helpers. Lazy-load heavy dialogs.

## Character sheet (Swiper slides)

- It is used during play, one-handed. Frequent actions (rolls, counters, rests) should be
  reachable in the lower half and work with a single tap.
- Inside slides, never put `swiper-no-swiping` or `stopPropagation` on
  `pointerdown`/`touchstart`. Radix menus open by click, like `CastSpellMenu`.
- Counters go through `useLatestMutation`. Taps update the screen instantly and saves happen in
  the background.
- Density is good here, but each slide still needs one obvious reading order.
- Rare choices (for example tools or Truesight) may stay as text on the sheet by owner decision.
  Real mechanics get proper UI.

## Creator and level-up wizards

- Keep one decision per step and show what is already chosen.
- Show the next required action with `NextStepButton` and the step hints.
- For up to ~8 options with descriptions, use choice cards that show the gist inline rather than
  a dropdown. For long lists, use search plus a list.
- Show prerequisites and conflicts at the option itself, before the user picks it.
- End with a summary in human names before saving. Never show raw ids or keys.
- Keep each edition's own rules and option sets. Never offer a 2014-only option in a 2024 flow,
  or the reverse.

## Catalogs and reading

- Use `ContentListPage` with filters in `CatalogFilterDialog`. Filter state lives in the URL, so
  reload and sharing reproduce the view.
- Read data through the existing GET flow, not a new server action. A URL change can drop an
  in-flight action's result.
- For long rules text:
  - keep line length near 65–70 characters;
  - use one clear heading per level group;
  - make feature names larger than body text;
  - leave more space between features than between paragraphs;
  - offer «Розгорнути всі» for reading straight through.
- On phones, details open in a modal and a sub-item replaces the modal content, with a visible
  way back. On desktop, use the list with a detail panel or a reading modal.
- A search result lands on the exact target: open it, expand it and scroll it into view.

## Modals and history

- Use a modal only when the task needs focus or protection. Otherwise use inline UI or a page.
- One open modal adds exactly one history entry. A modal that manages its own URL sets
  `enableBackButtonClose={false}`. Never replace `history.state` with `{}`.
- To close one dialog and open another in the same tap, go through `src/lib/history-back.ts`.
- On phones, a dialog is effectively a sheet: give it a sticky header with title and close, a
  scrollable body, and `overscroll-behavior: contain`.

## Forms

- Use `react-hook-form` with `zod`.
- Validate on blur and on submit. Put the error message next to the field and make it say how to
  fix the input.
- Use `inputMode` for numbers and the right `type`/`autocomplete`. No autofocus on phones, and
  never block paste.
- Disable the submit button only while saving. The user can always see why a submit did nothing.
