/// The one place platform colour is defined (KR15.1).
///
/// Two of these scales are handed to Tailwind under the names `slate` and `arcane`
/// (see tailwind.config.ts). `slate` is **retuned, not renamed**: 1 758 of the 3 698 colour
/// classes in `src/` are `*-slate-*`, and they are all neutral surface / text / border roles —
/// never one hue out of a set. Retuning the scale moves every one of them to the new palette in
/// a single reviewable edit, with lightness held constant so no contrast pair changes. Renaming
/// would have meant 1 758 hand edits against production with no staging.
///
/// `teal` was deliberately **left alone**: it carries meaning in
/// `src/components/catalogs/catalog-visuals.ts` and `src/components/characterCreator/creation-visuals.ts`,
/// where it is one hue out of a set (conjuration, fey, ranged weapons…). Chrome that merely used
/// teal as "the accent" was moved to `arcane` instead.

/// Near-black graphite with a violet cast — the backdrop's own neutral, at slate's lightness.
export const OBSIDIAN = {
  50: "#faf9fb",
  100: "#f4f2f7",
  200: "#e7e3ed",
  300: "#d4cfdd",
  400: "#a49cb4",
  500: "#766d88",
  600: "#585167",
  700: "#443c53",
  800: "#2b2438",
  900: "#1a1424",
  950: "#0c0910",
} as const;

/// The accent the backdrop actually radiates: violet leaning blue. Replaces the uniform teal
/// the owner rejected.
export const ARCANE = {
  50: "#f4f0ff",
  100: "#e3d8fd",
  200: "#c8b2fa",
  300: "#aa89f5",
  400: "#8d63ee",
  500: "#7547e1",
  600: "#602dcd",
  700: "#522ba1",
  800: "#412574",
  900: "#311d53",
  950: "#1e0f33",
} as const;

/// Black base, violet glow overhead, a far weaker ember glow underfoot. Lifted out of the home
/// screen so every route shares it.
export const PLATFORM_BACKDROP = {
  base: "#09080d",
  glow: [
    "radial-gradient(90% 55% at 50% -10%, rgba(124, 96, 180, 0.26), transparent 65%)",
    "radial-gradient(70% 45% at 50% 112%, rgba(150, 92, 70, 0.16), transparent 70%)",
  ].join(", "),
  vignette:
    "radial-gradient(120% 120% at 50% 50%, transparent 45%, rgba(0, 0, 0, 0.55) 100%)",
} as const;
