# Design identity and reusable parts

Facts from the code. If something here disagrees with the code, the code wins.

## Type

- Body text renders in the browser's serif on purpose: the `next/font` variables sit on `<body>`.
  Never "fix" this. Leave fonts in `src/app/layout.tsx`, `src/app/globals.css` and
  `tailwind.config.ts` untouched unless the owner asks for a font change.
- `font-rpg-display` (Forum, falling back to Cinzel) is for display headings and names.
- `font-sans` (Inter) is used for dense controls; `font-mono` (JetBrains Mono) only where it
  already appears.
- Phone text is at least 12px. The sheet, spell cards and the level-up wizard still contain
  `text-[9px]`–`text-[11px]`; do not copy that into new code, and raise it when you touch it.

## Colour

- `slate-*` is the retuned OBSIDIAN neutral scale from `src/styles/palette.ts`. Use it for
  surfaces, text and borders.
- `arcane-*` is the platform accent. The 2024 edition uses `prism-*` plus the iridescent sheen.
  Choose between them with `findAccentVariant(is2024, { arcane, prism })` or
  `findEditionAccent(edition)`, and pass class names as string literals so Tailwind sees them.
- Amber has its own roles: homebrew, dice, magic schools, bastion warnings. Teal carries meaning
  in `catalog-visuals.ts` and `creation-visuals.ts`. Do not use either as a generic accent.
- No raw hex in TSX. New colours go into `palette.ts`, and only with the owner.

## Material and shape

- `.glass-card` is for cards. Its box-shadow hides Tailwind `ring-*`, so highlight it with
  `outline outline-1 -outline-offset-1`.
- `.glass-panel` is for inset panels and `.glass-active` for the selected state.
- `.sheen-text`, `.sheen-ring` and `.sheen-glow` mark edition titles and frames.
  `SHEEN_MOTION` stays `"off"`.
- `.accent-strong` and `.accent-link` style lead-ins and links inside descriptions.
- Radii in use: `Card` `rounded-xl`, `Button` and `Badge` `rounded-md`, `FilterChip`
  `rounded-lg`. Match the neighbouring component rather than inventing a new radius.
- Spacing that dominates the code: `gap-2`, `p-3`, `p-4`, `px-3`, `gap-3`. Stay on the Tailwind
  scale and avoid arbitrary `[Npx]` values.
- Motion is off by default. Only a short colour or opacity change in response to the user's own
  action is acceptable. Any other motion needs the owner and a `prefers-reduced-motion` path.

## Layout facts

- The phone bottom navigation is `fixed bottom-0 z-[70]` and pads itself with
  `env(safe-area-inset-bottom)`. Fixed bars and the last content must clear it.
- Use `dvh`/`svh`, not `100vh`/`h-screen`.
- `sm:` is the main breakpoint. Desktop layouts (`lg:`) are thin, so check 1280px when the
  surface matters on a laptop.
- Shell components: `src/components/ui/App.tsx`, `RootGrid.tsx`, `Navigation.tsx` and
  `PlatformBackdrop.tsx`, which supplies the raster grain.

## Reusable parts

- **Primitives (`@/components/ui/*`):**
  - `Button` has variants default, destructive, outline, secondary, ghost and link. Its sizes
    keep a 40px minimum on phones.
  - `Dialog` takes `enableBackButtonClose` and `keepUrlOnClose`. Its close button is 40px on
    phones.
  - Also available: `DropdownMenu`, `Select`, `Tabs`, `Switch`, `Checkbox`, `RadioGroup`,
    `ScrollArea`, `Collapsible`, `Badge`, `Alert`, `Input`, `Label`, and sonner toasts.
- **Domain pieces:** `OrnateFrame`, `FramedIllustration`, `StarDivider`, `EditionAccent`,
  `HoverHint`, `GlossaryTerm`, `LinkedPreview`, `SpellAnchor`, `RuleTermAnchor`,
  `CreatureAnchor`, `NetworkRequiredNotice`.
- **Catalogs (`src/components/catalogs/`):** `ContentListPage`, `CatalogHeader`,
  `CatalogFilterDialog`, `FilterChip`, `SourceFilterSection`, `CatalogIllustrationCard`,
  `CatalogProse`, plus `reading/` for the long-text reader: `BranchReader`, `ReadingSectionTabs`
  and `useReadingNavigation`.
- **Creator wizard:** `src/lib/components/wizard/` (`NextStepButton`, step hints).
- **Unused duplicates:** `src/lib/components/ui/dialog.tsx` and `card.tsx` are not imported
  anywhere. Do not import them.

## Copy

- Ukrainian, sentence case, addressing the player as «ви», «ялинки» quotes, apostrophe `ʼ`
  (U+02BC).
- Dice use «к» (`1к6`). Both editions say «раса» (Р54).
- Terms come from `src/lib/refs/dictionary.json`. Visible text never shows raw keys, option ids
  or untranslated English.
- New D&D terms go through the `dnd-ua-translation` skill.
