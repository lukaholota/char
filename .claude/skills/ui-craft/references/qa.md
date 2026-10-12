# QA commands

Both scripts print a short summary. Full output and images go to `tmp/ui-qa/` (git-ignored).
Paste only failures into the conversation.

## Lite: static check of changed lines

```bash
node .claude/skills/ui-craft/scripts/ui-check.mjs [paths…]
```

The script scans lines that were added in `src` relative to `HEAD`, plus untracked files. It
flags:

- text smaller than 12px
- `outline-none` with no `focus-visible` style
- raw hex colours
- `100vh` or `h-screen`
- `transition-all`
- new motion
- icon buttons without `aria-label`
- `<img>` without dimensions
- imports of the unused UI duplicates
- `swiper-no-swiping`
- new dependencies
- edits to identity files (fonts, palette, accent)

The working tree is shared, so pass your own paths to leave out other sessions' changes. An
identity flag means you stop and ask the owner. Every other flag is a fix or a deliberate,
stated exception.

## Standard: probe pages in real engines

```bash
node .claude/skills/ui-craft/scripts/ui-probe.mjs --base http://localhost:3200 /spells "/classes?class=bard"
```

- **Engines:** phone is WebKit at 375×812 with touch; desktop is Chromium at 1280×800.
- **Phone checks:** horizontal overflow (with the widest offenders), tap targets smaller than
  40px, text smaller than 12px, images without `alt`, console and page errors.
- **Output:** one `composite.png` with every shot. Read that one image.
- **Signed-in pages:** pass `--cookie authjs.session-token=<jwt>`.
- **Tall pages:** add `--full`.

## Which server

- **Never touch the owner's server** on `:3000` (`bun dev:owner`, `.next-owner`).
- **Pages that only read** (catalogs, rules, reading, the creator's first steps): if a dev server
  of yours is already running, reuse it. Otherwise start
  `NEXT_DEV_DIST_DIR=.next-ui-craft bun dev --port 3200` in the background. It reads the
  configured database. Production `https://char.holota.family` is fine for read-only probing of
  shipped pages.
- **Anything that writes** (creating a character, sheet edits, level-up): use a tree copy on
  `spells_test` with a forged session cookie. The recipe is in the shared memory notes
  `forged-session-cookie-for-browser-audit` and `browser-check-needs-own-next-dist-dir`. Never
  write through a server pointed at production.

## Deep: interaction pass

Write a throwaway Playwright script in the session scratchpad, modelled on
`tests/e2e/adam-mobile-catalog.spec.ts`. Use WebKit with `hasTouch` at 375px and drive the real
path:

- tap with `.tap()`, not `.click()`;
- open and close each modal with the browser back button, then check `history.length`;
- swipe sheet slides;
- tab through with the keyboard on desktop;
- reload a deep link.

Measure performance on a production build (`bunx next build` in a tree copy), not on dev.
Promote the script to `tests/e2e/` only when the flow deserves a permanent guard.
