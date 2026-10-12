---
name: ui-craft
description: Design-engineer workflow for user-facing UI in this repo — use when building or reworking screens, components, flows, navigation, modals, forms, catalog/sheet/creator/level-up views, layout or visual polish. Skip for copy-only fixes, seed/data work and non-visual logic.
---

# ui-craft

The owner describes what a feature must do; you own the UX pattern, composition, hierarchy, mobile
behaviour and states. Ship a strong first version without asking when the change is reversible;
the owner judges the running product. Ask only before changing product identity (below) or doing
something hard to undo.

In this repo this skill replaces generic frontend-design advice: do not propose new palettes,
typefaces or an "aesthetic direction" — the direction exists.

## Identity vs decisions

**Identity — keep; change only with the owner:** typefaces and root font setup, the palette in
`src/styles/palette.ts`, edition accent via `src/styles/edition-accent.ts`, the glass material and
ornate frames, the dark theme, no motion by default, Ukrainian game terminology.

**Decisions — improve freely when you can name the gain** (fewer taps, faster scanning, fewer
mistakes, clearer next step): layout, hierarchy, step count, where actions sit, which primitive,
density, text size, spacing, removing clutter. Existing screens are precedent, not law. If a
familiar behaviour moves (gesture, button position), say so in one line of the report.

Facts about the design system and reusable parts: [references/identity.md](references/identity.md).

## Workflow

1. **Brief yourself** in a few lines: who uses it and when (often mid-game, on a phone), the one
   main action, every state (empty, loading, error, offline, signed out, long Ukrainian text,
   2014 vs 2024), phone layout first, which existing parts to reuse.
2. **Pick the pattern** from the section of [references/patterns.md](references/patterns.md) for
   the surface you touch. If there is a real product trade-off, build the option you judge best and
   name the alternative in one line — do not stop to ask.
3. **Build inside the identity**, reusing `src/components/ui`, catalog widgets and accent helpers.
   Search before creating a component.
4. **Run the QA tier** that fits the risk (below) and fix what it finds.
5. **Review it as a senior product designer would**, not as a compiler: a passing typecheck says
   nothing about the UI. For Standard and Deep, walk
   [references/checklist.md](references/checklist.md) against the screenshot. Then remove one
   thing that does not earn its place.
6. **Report**: the decisions that matter and why (1–3 lines), the screenshot path, what was not
   verified.

## QA tiers

| Tier | When | Run |
|---|---|---|
| Lite | copy, or a style tweak inside one component with no layout or interaction change | `node .claude/skills/ui-craft/scripts/ui-check.mjs <changed paths>` |
| Standard | new or changed component, layout or state; anything that looks different on a phone | Lite + `ui-probe.mjs` on 1–3 affected routes, then look at the one composite image |
| Deep | new screen or flow; modals and history; Swiper or gestures; creator, level-up or sheet core flows; offline; bundle weight | Standard + a scripted interaction pass (back button, tap, keyboard) |

When unsure, take the higher tier. An independent review subagent is for Deep only, and only for
a new screen or flow or after two failed iterations. Commands, servers and auth:
[references/qa.md](references/qa.md).

## Default looks to avoid

These are what generated UI falls back to; none belongs here unless the content demands it:
small-caps or ALL-CAPS eyebrow labels above headings; 01/02/03 numbering without a real sequence;
grids of equal-weight icon + title + blurb cards; cards nested in cards; gradient text outside the
edition sheen; decorative glow, blur or ornament that carries no meaning; pill-shaped buttons
everywhere; "→" on every button; emoji as icons; a big-number stat hero; filler sentences that
restate the heading.
