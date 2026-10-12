# Mechanical references audit — 2014, 2026-10-07

The unresolved-marker inventory at `/private/tmp/o49-release-hydration-final.json` was reviewed for official spell, feat, equipment and magic-item references. Editorial jargon, book titles, fictional people and deliberately preserved markers inside existing editorial links are not missing rule descriptions.

## Restored routes

`mechanical-reference-aliases.ts` connects short or alternate English labels to existing complete native rules: Bigby's Hand and its named forms; Maximilian's Earthen Grasp; Guardian of Nature forms; Ceremony rites; Lucky feat luck points; the source's Martial Initiate label for Fighting Initiate; alternate weapon and armor spellings; Walloping Ammunition; bonus variants of Fate Dealer's Deck and Wraps of Unarmed Prowess; complete generic Figurine of Wondrous Power and Prehistoric Figurines rules; named bard instruments; paired good/evil talismans.

Lucky is selected by feat kind, so the Halfling Lucky trait cannot substitute for luck-point rules. Shortened figurine variants route to the complete generic parent, not summarized native child records. Paired talismans expose both complete native descriptions as separate alternatives.

## Complete item rules

Armblade (ERLW p. 276), Wand Sheath (ERLW p. 279) and Battering Shield (EGW p. 266) now have full Ukrainian rules in `data/rpgbot/feature-descriptions-2014.json`, regenerated into `src/lib/generated/optimization-feature-descriptions-2014.json` by the existing generator without database access. Formal names remain English pending ratification. The attunement race uses the approved Воєнокований name.

These items have real static reading pages under `/magic-items?reference=…`. They introduce no database item IDs or add-to-character controls. The 2024 catalog uses its separate page and receives none of these supplements.

Doss Lute's seed and delivered description now contain all DMG p. 176 rules: attunement by a bard, DC 15 Wisdom save and 2d4 psychic damage for playing without attunement, individual dawn spell reuse, the actual somatic/material restriction on charm-save disadvantage, four common spells and three Doss spells including fire-only Protection From Energy. The old common Anstruth description's focus-only wording was checked against the original and was not copied into Doss.

## Known limits

The initial local-only lookup did not contain an ordinary Boomerang. A subsequent primary-source check found the explicit [D&D Beyond Boomerang +1 variant](https://www.dndbeyond.com/magic-items/535335-boomerang-1): +1 attack/damage, ranged weapon, javelin proficiency also applies, and return on a miss. Its complete rule is now a reading supplement, attributed separately to D&D Beyond's variant and the DMG 2014 p. 213 +1 Weapon template. Verification facts and URLs are preserved in `data/2014/source-extracts/boomerang-plus-one-ddb.json`. No Storm Boomerang thunder/stun property, weight, cost, or disputed thrown property was inferred.

Giant Fly now uses the exact abbreviated DMG 2014 p. 169 statblock from local raw data: AC 11, HP 19 (3d10 + 3), walk 30/fly 60, all six scores, darkvision 60 and passive Perception 10. The original has no CR, experience, proficiency bonus or actions; these fields remain empty in the source and native reading catalog. The generator accepts legitimate empty challenge/action fields and supports DMG provenance. It preserves the eight existing creature supplements and adds only Giant Fly.

Source labels such as Silver Steed and Noble Steed are editorial names around the Obsidian Steed discussion, so they were not silently converted into new canonical entities.

Great Weapon Master, Polearm Master and Sharpshooter markers reported from already linked editorial comparisons remain inside those links intentionally; creating nested anchors would invalidate the reader's navigation.

## Validation

Content tests verify actual hydrated URLs, complete bodies and variant alternatives, source/delivery Doss parity, item restrictions and 2024 isolation. Page tests cover all three exact reference queries and unknown/array/absent queries. Changed production files passed the clean-code guard: static data, no new dependency, no DB calls or invented IDs, explicit edition scope, and native rule reuse. See the final release audit for final test counts and browser verification.
