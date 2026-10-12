# Remaining reference classification — official 2014, 2026-10-08

This is a classification of the **414 distinct originals** recorded in `hydration-audit-2014-2026-10-08.json` (`unresolvedAfterRecheck`). It is a stale measurement followed by a code/source review, **not** a fresh unresolved-count measurement. The snapshot precedes the rare aliases and three creature additions. No empty description does not prove that every mechanical mention is linked.

Latest verification is recorded separately in [the release audit](release-audit-2026-10-07.md) and [the machine proof](hydration-proof-2014-2026-10-08.json). This table retains its original 414-name scope; it must not be used as the current remaining count.

Only existing complete 2014 bodies were used for aliases. No dictionary terms, guessed descriptions, 2024 rules, or new production mappings are introduced by this document.

## Confirmed actions and precise article context

| Original | Article slug | Classification and evidence |
| --- | --- | --- |
| Enhanced Spell | wizard-2014 | Closed: Heightened Spell. Context imposes disadvantage on the first saving throw; it is not Empowered Spell's damage reroll. Complete native metamagic body. |
| Shroud of Shadow | warlock-undead-2014 | Closed: Shrouded in Shadow. Native invocation casts Invisibility at will; exact native spelling confirmed. |
| Signature Spell | wizard-2014 | Closed: Signature Spells. Context describes level-20 wizard's two prepared spells and free casts. |
| Far Traveller | bard-glamour-2014 | Closed: Far Traveler. Full background rules include access to people and places through foreigners' notoriety. |
| Warpriest | cleric-war-domain-2014 | Closed: class War Priest only. Context is bonus-action weapon attack after Attack; creature of similar name is explicitly excluded. |
| Unarmed Strikes | druid-2014 | Closed: full native Unarmed Strike rule card, including damage and Strength. |
| Critical Hits | Not present in this snapshot | Explicit plural alias added to the actual native Critical Hit card; verified double dice rule. |
| Fleet of Foot | rogue-phantom-2014 | Closed after this snapshot: an independent PHB Wood Elf Fleet of Foot native reading target now provides the 35-foot speed rule. Article explicitly chooses Wood Elf, then retains Perception, 35-foot speed and Mask of the Wild. Original `data/5etools/raw/races.json`, PHB p.24, `subrace` Wood / parent Elf: “Your base walking speed increases to 35 feet.” Existing reviewed supplemental parent is Half-Elf (Wood Elf Descent), SCAG p.116; that different race must not replace Wood Elf. |
| Chaotic Flares | planescape-backgrounds-feats-2014 | **Missing local native feat/source.** Exact section is Cohort of Chaos (Спільник хаосу). Paragraph discusses ASI and brief unpredictable flare effects, recommends Wild Magic Barbarian. No native Cohort of Chaos feat found and no raw feats JSON in local raw corpus. Do not substitute Tides of Chaos or Minions of Chaos. |
| Galvan Magen; Demos Magen | wizard-necromancy-2014 | Closed after snapshot by creature agent: full original statblocks, `bestiary-idrotf.json`, IDRotF pp.301/300. Context: Create Magen, maximum-HP cost, guards and lightning. |
| Jabberwock | cleric-grave-2014 | Closed after snapshot by creature agent: `bestiary-wbtw.json`, WBtW p.236. |
| Nyxborn Lynx | polymorph-2014 | **Original unavailable locally.** Exact monster absent from raw bestiary files. Article table labels it MM, requiring attribution review; do not invent a Cat or Nyxborn-template statblock. |
| Death Attack | rogue-assassin-2014 | **Ambiguous author terminology.** Multiclass paragraph discusses three Assassin levels, Fighter attacks and secrecy. Assassinate and Death Strike have different level requirements; neither is safely substituted without resolving author's intended rule. |
| Natural 1 | sorcerer-wild-magic-2014; warlock-celestial-2014 | **Context-dependent rule concept.** Attack natural-one rules differ from ability checks/saves; do not route globally to automatic failure or Critical Hit. |
| From Dust | wizard-necromancy-2014 | Editorial wording about Animate Dead/Signature Spells; no verified named 2014 ability. |
| Dwarven Urgosh | cleric-life-domain-2014 | Explicit history lesson says D&D 3.5 exotic weapon, absent in 5e. Later Spiritual Weapon flavour is the same historical reference; no invented 2014 weapon card. |
| Forewarned is Four-Armed | wizard-divination-2014 | Thri-kreen Diviner build-name joke; no feature. |
| Stature | barbarian-path-of-the-giant-2014 | Cassie Lang superhero reference; not Giant Stature ability. |

## Remaining scoped mapping opportunities

Subclass shorthand in the appendix may map to existing complete native class/subclass bodies after context review. Examples: Battlemaster → Battle Master, Battlesmith → Battle Smith, Bladesigner → Bladesinger, Eldritch Knights → Eldritch Knight, Swarm Keeper → Swarmkeeper. These are proposals, not implemented aliases; preserve exact source/edition and avoid interpreting nicknames as new abilities.

Summoned subtypes Beholderkin/Star Spawn/Slaad and Demon/Devil/Yugoloth have complete native Aberrant Spirit and Fiendish Spirit parent statblocks. Their use in `summoning-2014` is actionable; a globally generic creature-type alias would obscure other actual monsters. Air/Earth/Fire/Water appear in both `summoning-2014` and `artificer-races-2014`, so spirit and Genasi targets must remain distinct.

Race shorthand (High, Wood, Fallen, Deep, Draconblood, Ravenite and dragonmarked branches) needs the exact native branch, original source and edition. Human/Half-Elf/Halfling dragonmarks can name several different branches. No blanket race replacement is justified by shared words.

Gear categories and plural tools listed below need exact native equipment bodies/card review. A marker alone or a parent name is insufficient evidence of a full description.

## Snapshot originals, explicit triage status

`Closed after snapshot` reflects reviewed code, not a rerun count. `Context review required` deliberately records uncertainty; it does not classify an unreviewed real rule as jargon. Article slugs are preserved to make follow-up exact. Very long shared article lists are preserved in the JSON source rather than repeated here.

| Original | Status | Article context |
| --- | --- | --- |
| (Half-)High Elf | Context review required | rogue-swashbuckler-2014 |
| 1/2 caster | Editorial / book / historic mention; no new rule entity | artificer-alchemist-2014 |
| 13th-Level | Editorial / book / historic mention; no new rule entity | paladin-oath-of-glory-2014, paladin-oath-of-redemption-2014, paladin-oath-of-the-ancients-2014, paladin-oath-of-the-crown-2014, paladin-oath-of-vengeance-2014, paladin-oathbreaker-2014, paladin-subclasses-2014 |
| 17th-Level | Editorial / book / historic mention; no new rule entity | paladin-oath-of-glory-2014, paladin-oath-of-redemption-2014, paladin-oath-of-the-ancients-2014, paladin-oath-of-the-crown-2014, paladin-oath-of-vengeance-2014, paladin-oathbreaker-2014, paladin-subclasses-2014 |
| 1st-Level Spells | Editorial / book / historic mention; no new rule entity | paladin-oath-of-conquest-2014 |
| 2nd-Level Spells | Editorial / book / historic mention; no new rule entity | paladin-oath-of-conquest-2014 |
| 3rd-Level Spells | Editorial / book / historic mention; no new rule entity | paladin-oath-of-conquest-2014 |
| 4th-Level Spells | Editorial / book / historic mention; no new rule entity | paladin-oath-of-conquest-2014 |
| 5th-Level Spells | Editorial / book / historic mention; no new rule entity | paladin-oath-of-conquest-2014 |
| A Crap Guide to D&D | Editorial / book / historic mention; no new rule entity | wizard-war-magic-2014 |
| Abjurer Wizards | Existing native subclass candidate; scope review | bard-eloquence-2014 |
| Abyssal | Context review required | bard-spirits-2014 |
| Acquisitions Incorporated | Editorial / book / historic mention; no new rule entity | artificer-2014, bard-spells-2014, cleric-trickery-domain-2014, wizard-spells-2014 |
| action economy | Editorial / book / historic mention; no new rule entity | artificer-alchemist-2014 |
| Adventurer’s League | Editorial / book / historic mention; no new rule entity | artificer-subclasses-2014, barbarian-subclasses-2014, bard-subclasses-2014; +9 slugs (JSON source) |
| Adventuring Day | Context review required | cleric-2014, ranger-2014, wizard-bladesinging-2014 |
| Aereni Elves | Context review required | fighter-rune-knight-2014 |
| Air | Ambiguous/category; context-specific target needed | artificer-races-2014, summoning-2014 |
| airbend (закреслено в оригіналі) | Editorial / book / historic mention; no new rule entity | monk-four-elements-2014 |
| Amalae | Context review required | bard-2014 |
| Amon | Context review required | paladin-oathbreaker-2014 |
| Another Gish for the Pile | Context review required | bard-valor-2014 |
| AoE | Editorial / book / historic mention; no new rule entity | monk-sun-soul-2014 |
| Aquatic Half-Elf | Context review required | artificer-races-2014 |
| Artisan’s Tools | Equipment/card target review | artificer-2014 |
| Astral Sea | Context review required | paladin-oath-of-the-watchers-2014 |
| Athasian | Context review required | paladin-oath-of-glory-2014 |
| Aura Improvement | Context review required | paladin-oath-of-the-ancients-2014 |
| Aureon | Context review required | cleric-knowledge-domain-2014 |
| Average Best One Punch | Context review required | cleric-grave-2014 |
| Avernus | Context review required | cleric-order-2014 |
| away | Context review required | monk-open-hand-2014 |
| Azorius | Context review required | cleric-order-2014, ravnica-backgrounds-2014 |
| Balinor | Context review required | paladin-oath-of-the-ancients-2014 |
| bandits (закреслено в оригіналі) | Editorial / book / historic mention; no new rule entity | fighter-samurai-2014 |
| Bardic College | Context review required | sorcerer-2014 |
| Basic Inspiration | Context review required | bard-eloquence-2014 |
| Basic Rules | Editorial / book / historic mention; no new rule entity | artificer-alchemist-2014 |
| Battlemaster | Existing native subclass candidate; scope review | bard-swords-2014, paladin-oath-of-conquest-2014 |
| Battlesmith | Existing native subclass candidate; scope review | wizard-2014 |
| BBEG | Editorial / book / historic mention; no new rule entity | bard-spells-2014, fighter-battle-master-2014, fighter-subclasses-2014, paladin-subclasses-2014, warlock-spells-2014, wizard-spells-2014 |
| Beholderkin | Existing summon parent candidate; scope review | summoning-2014, wizard-abjuration-2014 |
| Best Fighter Armor | Context review required | fighter-2014 |
| Best Fighter Feats | Context review required | fighter-2014 |
| Best Fighter Races | Context review required | fighter-2014 |
| Best Fighter Skills | Context review required | fighter-2014 |
| Best Fighting Styles for Fighters | Context review required | fighter-2014 |
| Bigby Presents: Glory of the Giants | Editorial / book / historic mention; no new rule entity | barbarian-path-of-the-giant-2014 |
| Blade Warlock | Context review required | warlock-pact-boons-2014 |
| bladelock | Context review required | warlock-pact-boons-2014 |
| Bladesigner | Existing native subclass candidate; scope review | bard-subclasses-2014, bard-valor-2014 |
| Bladesingers | Existing native subclass candidate; scope review | bard-valor-2014, wizard-war-magic-2014 |
| Boccob | Context review required | cleric-knowledge-domain-2014 |
| Bone Buddies | Context review required | paladin-oathbreaker-2014 |
| Bone Buddy | Context review required | animating-the-dead-2014 |
| Bone Zone | Context review required | paladin-oathbreaker-2014 |
| Bone-us damage | Context review required | paladin-oathbreaker-2014 |
| Bones Malone and the Spooky Boys | Context review required | paladin-oathbreaker-2014 |
| Bonus bonk | Context review required | paladin-oath-of-vengeance-2014 |
| Boros | Context review required | ravnica-backgrounds-2014 |
| Brass | Context review required | artificer-races-2014 |
| Break Enchantment | Context review required | cleric-spells-2014 |
| breath (закреслено в оригіналі) | Editorial / book / historic mention; no new rule entity | sorcerer-shadow-magic-2014 |
| Brewer’s Tools | Equipment/card target review | artificer-2014 |
| Bronzewood | Context review required | druid-2014 |
| Bug Game Hunter | Context review required | fighter-battle-master-2014 |
| Caps Lock button | Editorial / book / historic mention; no new rule entity | druid-circle-of-spores-2014 |
| Caster Supremacy | Editorial / book / historic mention; no new rule entity | sorcerer-lunar-sorcery-2014, wizard-enchantment-2014 |
| Celestia | Context review required | cleric-spells-2014, druid-spells-2014, warlock-spells-2014 |
| cerulean sign | Context review required | paladin-oath-of-the-watchers-2014 |
| Chalice | Context review required | druid-circle-of-stars-2014 |
| Chaotic Flares | Missing local Cohort of Chaos body/original | planescape-backgrounds-feats-2014 |
| chassis | Context review required | bard-glamour-2014, bard-valor-2014 |
| cheese grater | Context review required | druid-circle-of-the-land-2014, warlock-celestial-2014 |
| Chromatic | Context review required | artificer-races-2014 |
| Chromatic Dragonborn | Context review required | cleric-war-domain-2014 |
| Circle | Context review required | druid-moon-2014 |
| Clay | Closed after snapshot | summoning-2014 |
| Cleric Tax | Editorial / book / historic mention; no new rule entity | cleric-grave-2014, cleric-life-domain-2014, cleric-spells-2014, cleric-subclasses-2014 |
| Cloud | Context review required | sorcerer-lunar-sorcery-2014 |
| component pouch | Equipment/card target review | ranger-spells-2014 |
| Conjure X | Context review required | druid-circle-of-the-shepherd-2014, druid-subclasses-2014 |
| Construct | Context review required | bard-creation-2014 |
| Creative Commons Attribution 4.0 International License | Editorial / book / historic mention; no new rule entity | bard-2014 |
| crimes (закреслено в оригіналі) | Editorial / book / historic mention; no new rule entity | wizard-war-magic-2014 |
| Crit Fishing | Editorial / book / historic mention; no new rule entity | rogue-assassin-2014 |
| Crown of the Wrathbringer | Context review required | barbarian-2014 |
| Curse of Strahd | Editorial / book / historic mention; no new rule entity | paladin-subclasses-2014 |
| Curseedge | Context review required | paladin-oath-of-devotion-2014 |
| Custom Origin Wood Elf | Context review required | fighter-arcane-archer-2014 |
| Damage Per Round, DPR | Context review required | fighter-2014 |
| danger noodles | Context review required | cleric-nature-2014 |
| Dark Sun | Context review required | races-2014 |
| Dark Urge | Context review required | paladin-oath-of-devotion-2014 |
| dead reckoning | Context review required | wizard-necromancy-2014 |
| Death Attack | Ambiguous/category; context-specific target needed | rogue-assassin-2014 |
| Death Ward Stacking | Context review required | cleric-war-domain-2014 |
| Deep | Context review required | artificer-races-2014 |
| Deep Dwarf | Context review required | paladin-oath-of-redemption-2014 |
| Deep Speech | Context review required | bard-spirits-2014 |
| Default Human | Context review required | artificer-races-2014 |
| Demon | Existing summon parent candidate; scope review | summoning-2014 |
| Demos Magen | Closed after snapshot | wizard-necromancy-2014 |
| Descent into Avernus | Editorial / book / historic mention; no new rule entity | paladin-subclasses-2014 |
| Despair | Closed after snapshot | summoning-2014 |
| Destructive Smite | Context review required | paladin-spells-2014 |
| Devil | Existing summon parent candidate; scope review | summoning-2014 |
| Die Kriegerin der Zerstörung | Context review required | cleric-war-domain-2014 |
| Dimir | Context review required | ravnica-backgrounds-2014 |
| DIO | Editorial / book / historic mention; no new rule entity | monk-astral-self-2014 |
| Disguise Kits | Equipment/card target review | warlock-great-old-one-2014 |
| Dismissal | Context review required | cleric-spells-2014 |
| DMG | Editorial / book / historic mention; no new rule entity | cleric-2014, cleric-peace-domain-2014, druid-circle-of-the-shepherd-2014, ranger-2014 |
| downtime | Context review required | artificer-2014 |
| Dr. Terry MacMullin | Context review required | paladin-oathbreaker-2014 |
| Draconblood | Context review required | artificer-races-2014, warlock-hexblade-2014 |
| Draconic (закреслено в оригіналі) | Editorial / book / historic mention; no new rule entity | sorcerer-shadow-magic-2014 |
| Dragon Ancestor | Context review required | sorcerer-2014 |
| Dragon Chess | Closed after snapshot | rogue-mastermind-2014, warlock-fiend-2014 |
| Dragonchess Set | Closed after snapshot | bard-glamour-2014 |
| Dragonmark | Ambiguous/category; context-specific target needed | cleric-life-domain-2014 |
| Dragonmarked Dwarf | Context review required | warlock-hexblade-2014 |
| Dragonmarked Elf | Context review required | warlock-hexblade-2014 |
| Dragonmarked Gnome | Context review required | warlock-hexblade-2014 |
| Dragonmarked Half-Elf | Ambiguous/category; context-specific target needed | warlock-hexblade-2014 |
| Dragonmarked Half-Orc | Context review required | druid-circle-of-spores-2014, warlock-hexblade-2014 |
| Dragonmarked Halfling | Ambiguous/category; context-specific target needed | druid-circle-of-spores-2014, warlock-hexblade-2014 |
| Dragonmarked Human | Ambiguous/category; context-specific target needed | druid-circle-of-spores-2014, warlock-hexblade-2014 |
| Dragonmarked Races | Ambiguous/category; context-specific target needed | rogue-soulknife-2014, warlock-genie-2014 |
| Dragonmarks | Ambiguous/category; context-specific target needed | druid-circle-of-spores-2014, sorcerer-storm-sorcery-2014 |
| dragonmarks | Ambiguous/category; context-specific target needed | warlock-hexblade-2014, wizard-scribes-2014 |
| Dreamer | Context review required | druid-circle-of-dreams-2014 |
| Drow Half-Elf | Context review required | artificer-races-2014, warlock-genie-2014 |
| Druidic Focus | Equipment/card target review | druid-circle-of-the-land-2014 |
| Dude Stop | Context review required | warlock-hexblade-2014 |
| Dunamancy | Context review required | bard-spirits-2014, classes-2014, dunamancy-2014, wizard-2014, wizard-chronurgy-magic-2014, wizard-scribes-2014, wizard-subclasses-2014 |
| Dungeon Master’s Guide | Editorial / book / historic mention; no new rule entity | cleric-2014, cleric-death-2014, cleric-subclasses-2014 |
| Dungeons and Dragons | Context review required | artificer-2014, paladin-spells-2014 |
| Dwarven Urgosh | Editorial / book / historic mention; no new rule entity | cleric-life-domain-2014 |
| Dwarves | Context review required | cleric-war-domain-2014 |
| Earth | Ambiguous/category; context-specific target needed | artificer-races-2014, summoning-2014 |
| Eberron | Context review required | artificer-2014, artificer-infusions-2014, shifter-2014, warlock-celestial-2014 |
| Eberron: Rising from the Last War | Editorial / book / historic mention; no new rule entity | artificer-2014, druid-2014 |
| Eldritch Knights | Existing native subclass candidate; scope review | bard-valor-2014 |
| Elemental Disciplines | Context review required | monk-four-elements-2014 |
| Elk, Tiger, or Wolf Attunement | Context review required | barbarian-totem-warrior-2014 |
| Elves | Context review required | fighter-samurai-2014, warlock-genie-2014 |
| Emanation | Context review required | area-of-effect-rules-2014 |
| Enchanter | Existing native subclass candidate; scope review | wizard-evoker-2014 |
| Enhanced Spell | Closed after snapshot | wizard-2014 |
| Environment | Context review required | barbarian-2014 |
| errata | Editorial / book / historic mention; no new rule entity | artificer-2014, artificer-infusions-2014 |
| Evil | Context review required | paladin-oathbreaker-2014 |
| Explorer’s Guide to Wildemount | Editorial / book / historic mention; no new rule entity | wizard-chronurgy-magic-2014 |
| Explorer’s Pack | Equipment/card target review | druid-circle-of-the-land-2014 |
| extraplanar | Context review required | paladin-oath-of-the-watchers-2014 |
| Falcon Punch | Context review required | cleric-grave-2014 |
| Fallen | Context review required | artificer-races-2014 |
| Far Realm | Context review required | hexadin-2014, sorcerer-aberrant-mind-2014 |
| Far Traveller | Closed after snapshot | bard-glamour-2014 |
| Fencing | Context review required | rogue-2014 |
| Feral | Context review required | artificer-races-2014, warlock-hexblade-2014 |
| Fey Warlock | Existing native subclass candidate; scope review | warlock-great-old-one-2014, warlock-subclasses-2014 |
| Feywild | Context review required | bard-eloquence-2014, eladrin-2014, harengon-2014, hobgoblin-2014, ranger-horizon-walker-2014 |
| FFXIV: Endwalker | Editorial / book / historic mention; no new rule entity | paladin-oathbreaker-2014 |
| Final Form | Context review required | monk-astral-self-2014 |
| Fire | Ambiguous/category; context-specific target needed | artificer-races-2014, summoning-2014 |
| Firearm Proficiency | Context review required | monk-astral-self-2014 |
| five minute day | Editorial / book / historic mention; no new rule entity | wizard-2014 |
| Fizban’s Dragonborn | Context review required | cleric-war-domain-2014, fighter-echo-knight-2014, monk-ascendant-dragon-2014, sorcerer-draconic-bloodline-2014 |
| Fizban’s Dragonborn Variants | Context review required | monk-astral-self-2014 |
| Fizban’s Treasury of Dragons | Editorial / book / historic mention; no new rule entity | barbarian-storm-herald-2014, sorcerer-draconic-bloodline-2014 |
| Flame Spirit | Context review required | druid-circle-of-wildfire-2014 |
| Fleet of Foot | Confirmed native Wood Elf reading target gap | rogue-phantom-2014 |
| Flourishes | Context review required | bard-2014 |
| Flute | Equipment/card target review | wizard-evoker-2014 |
| force multiplier | Editorial / book / historic mention; no new rule entity | cleric-subclasses-2014, monk-open-hand-2014 |
| Forewarned is Four-Armed | Editorial / book / historic mention; no new rule entity | wizard-divination-2014 |
| Forgery Kits | Equipment/card target review | warlock-great-old-one-2014 |
| Forgotten Realms | Context review required | ranger-subclasses-2014 |
| From Dust | Editorial / book / historic mention; no new rule entity | wizard-necromancy-2014 |
| Frost | Context review required | sorcerer-lunar-sorcery-2014 |
| full caster | Editorial / book / historic mention; no new rule entity | paladin-oath-of-redemption-2014 |
| Full Moon | Closed after snapshot | sorcerer-lunar-sorcery-2014 |
| Fundamental Math | Editorial / book / historic mention; no new rule entity | bard-swords-2014, monk-open-hand-2014, paladin-oath-of-the-ancients-2014; +8 slugs (JSON source) |
| Fury | Closed after snapshot | summoning-2014 |
| Galvan Magen | Closed after snapshot | wizard-necromancy-2014 |
| Gamera | Context review required | druid-circle-of-wildfire-2014 |
| Gem | Context review required | artificer-races-2014 |
| Gem Dragonborn | Context review required | bard-spirits-2014, fighter-purple-dragon-knight-2014 |
| Genasi | Context review required | artificer-races-2014, warlock-genie-2014 |
| Genielock | Existing native subclass candidate; scope review | warlock-genie-2014 |
| Ghostly | Closed after snapshot | summoning-2014 |
| Ghosts of Saltmarsh | Editorial / book / historic mention; no new rule entity | warlock-subclasses-2014 |
| Ghostwise | Context review required | artificer-races-2014 |
| Giant Vermin | Context review required | druid-spells-2014 |
| Gilean | Context review required | cleric-knowledge-domain-2014 |
| Girallon’s Blessing | Context review required | wizard-bladesinging-2014 |
| gish | Context review required | artificer-races-2014, bard-swords-2014, bard-valor-2014; +8 slugs (JSON source) |
| Gith | Context review required | barbarian-totem-warrior-2014, druid-circle-of-spores-2014 |
| gives all Slivers “Tap: Target creature takes 2 damage and becomes tapped (закреслено в оригіналі) | Editorial / book / historic mention; no new rule entity | sorcerer-shadow-magic-2014 |
| glass cannon | Context review required | paladin-oath-of-the-crown-2014, warlock-pact-boons-2014 |
| Goku | Context review required | monk-sun-soul-2014 |
| Good | Context review required | paladin-oathbreaker-2014 |
| GooLock | Existing native subclass candidate; scope review | warlock-great-old-one-2014, warlock-subclasses-2014 |
| GOOLock | Existing native subclass candidate; scope review | sorcerer-subclasses-2014 |
| Grapple+Shove combo | Context review required | paladin-subclasses-2014 |
| Graviturgist | Existing native subclass candidate; scope review | wizard-graviturgy-magic-2014 |
| grue | Context review required | druid-circle-of-the-land-2014 |
| Hag | Context review required | races-2014 |
| half caster | Context review required | paladin-oath-of-conquest-2014 |
| half feat | Context review required | monk-sun-soul-2014 |
| Half High Elf | Context review required | warlock-hexblade-2014 |
| half-wood elf | Context review required | monk-way-of-mercy-2014 |
| Half-wood elf | Context review required | monk-way-of-mercy-2014 |
| hat (закреслено в оригіналі) | Editorial / book / historic mention; no new rule entity | cleric-knowledge-domain-2014 |
| healbot | Context review required | cleric-2014 |
| Hellish Knight | Context review required | paladin-oathbreaker-2014 |
| Hexadin | Context review required | hexadin-2014 |
| Hexblade Warlocks | Existing native subclass candidate; scope review | paladin-oath-of-conquest-2014 |
| High (Half-)Elf | Context review required | bard-lore-2014 |
| High Half-Elf | Context review required | bard-swords-2014, bard-valor-2014 |
| High-Elf Descent | Context review required | rogue-swashbuckler-2014 |
| High/Moon/Sun | Context review required | druid-circle-of-spores-2014, warlock-hexblade-2014 |
| Hill | Context review required | artificer-races-2014, druid-circle-of-spores-2014, sorcerer-lunar-sorcery-2014 |
| hit point ping-pong | Context review required | ranger-2014 |
| Hit Points | Context review required | monk-2014 |
| Holy Hand Grenade of Antioch | Context review required | cleric-death-2014 |
| Holy Smite | Context review required | paladin-spells-2014 |
| Hostile/Indifferent/Friendly | Context review required | bard-spells-2014, cleric-spells-2014 |
| Hound (закреслено в оригіналі) | Editorial / book / historic mention; no new rule entity | sorcerer-shadow-magic-2014 |
| Hunter’s Quarry | Context review required | paladin-2014 |
| Infusion | Closed after snapshot | artificer-infusions-2014, plasmoid-2014 |
| Infusions | Closed after snapshot | wizard-abjuration-2014 |
| Inspiration Dice | Context review required | bard-glamour-2014 |
| Izzet | Context review required | ravnica-backgrounds-2014 |
| Jabberwock | Closed after snapshot | cleric-grave-2014 |
| Jonathan Young | Context review required | paladin-oath-of-vengeance-2014 |
| kaiju | Context review required | druid-circle-of-wildfire-2014 |
| Kender Curiosity | Context review required | races-2014 |
| King | Context review required | sorcerer-lunar-sorcery-2014 |
| kite | Context review required | monk-way-of-mercy-2014 |
| Krynn | Context review required | kender-2014, races-2014, sorcerer-2014, sorcerer-subclasses-2014 |
| Land Druids | Existing native subclass candidate; scope review | druid-circle-of-the-land-2014, druid-subclasses-2014 |
| Leafweave | Context review required | druid-2014 |
| Librarian | Context review required | fighter-2014, wizard-2014 |
| Lightfoot | Context review required | artificer-races-2014 |
| Limbo | Context review required | druid-circle-of-dreams-2014 |
| Lineage | Context review required | artificer-races-2014 |
| lineages | Context review required | wizard-enchantment-2014 |
| Lotusden | Context review required | artificer-races-2014, druid-circle-of-spores-2014 |
| Lunitari | Context review required | dragonlance-backgrounds-and-feats-2014 |
| MAD | Context review required | paladin-2014, ranger-2014, ranger-monster-slayer-2014 |
| Maglubiyet | Context review required | hobgoblin-2014 |
| make it everyone else’s problem, too (закреслено в оригіналі) | Editorial / book / historic mention; no new rule entity | sorcerer-wild-magic-2014 |
| Mantle | Context review required | bard-glamour-2014 |
| Mark of Travel Human | Context review required | super-mario-jump-2014 |
| metagame shenanigans | Context review required | paladin-oath-of-the-crown-2014 |
| Metal | Closed after snapshot | summoning-2014 |
| Metallic | Context review required | artificer-races-2014 |
| Mind Flayers | Context review required | races-2014 |
| Miniatures Handbook | Context review required | bard-glamour-2014 |
| Minor Wish | Context review required | rogue-arcane-trickster-2014 |
| Monster Hunter’s Pack | Equipment/card target review | ranger-gloom-stalker-2014 |
| Monster Manual | Context review required | bard-spells-2014, cleric-arcana-domain-2014, cleric-spells-2014; +11 slugs (JSON source) |
| Monsters of the Multiverse | Context review required | artificer-2014, barbarian-path-of-the-beast-2014, cleric-nature-2014; +12 slugs (JSON source) |
| Monsters of the Multiverse Orc | Context review required | paladin-oath-of-the-crown-2014 |
| Moradin | Context review required | cleric-2014 |
| Mordenkainen Presents: Monsters of the Multiverse | Context review required | paladin-oathbreaker-2014, ranger-horizon-walker-2014 |
| murder-hoboing | Context review required | warlock-invocations-2014 |
| Muscle Wizard | Context review required | wizard-graviturgy-magic-2014 |
| Mysterio | Context review required | artificer-infusions-2014 |
| Natural 1 | Ambiguous/category; context-specific target needed | sorcerer-wild-magic-2014, warlock-celestial-2014 |
| Natural Weapons | Ambiguous/category; context-specific target needed | monk-astral-self-2014 |
| Noble Steed | Context review required | fighter-2014 |
| NPC | Context review required | artificer-infusions-2014, artificer-races-2014, bard-subclasses-2014; +14 slugs (JSON source) |
| Nuitari | Context review required | dragonlance-backgrounds-and-feats-2014 |
| Nyxborn Lynx | Original unavailable; attribution review | polymorph-2014 |
| Oath of Conquest Paladins | Context review required | paladin-oath-of-conquest-2014 |
| Oghma | Context review required | cleric-knowledge-domain-2014 |
| one-shot | Context review required | sorcerer-divine-soul-2014 |
| one-trick pony | Context review required | monk-drunken-master-2014, monk-subclasses-2014 |
| oneshot | Context review required | cleric-order-2014, wizard-necromancy-2014 |
| Open Gaming License | Context review required | artificer-subclasses-2014, barbarian-subclasses-2014, bard-subclasses-2014; +6 slugs (JSON source) |
| Opportunity Attacks | Closed after snapshot | paladin-oath-of-vengeance-2-2014 |
| Optional Class Feature | Context review required | cleric-forge-2014, cleric-trickery-domain-2014, cleric-twilight-2014; +6 slugs (JSON source) |
| optional class feature | Context review required | cleric-order-2014 |
| Orzhov | Context review required | ravnica-backgrounds-2014, wizard-chronurgy-magic-2014, wizard-subclasses-2014 |
| Out of the Abyss | Context review required | cleric-twilight-2014, paladin-subclasses-2014 |
| Pact Boon Option: Pact of the Talisman (Addition) | Closed after snapshot | warlock-2014 |
| patriot (закреслено в оригіналі) | Editorial / book / historic mention; no new rule entity | fighter-psi-warrior-2014 |
| Patron | Context review required | classes-2014 |
| PKE meter | Context review required | druid-circle-of-wildfire-2014 |
| plague doctor | Context review required | monk-subclasses-2014 |
| Player’s Handbook | Context review required | ranger-2014, ranger-hunter-2014, ranger-subclasses-2014 |
| power creep | Context review required | cleric-twilight-2014, sorcerer-aberrant-mind-2014, sorcerer-subclasses-2014 |
| Practical Guide to Wild Shape | Context review required | druid-moon-2014 |
| punch ghost | Context review required | monk-astral-self-2014, monk-subclasses-2014 |
| Putrid | Closed after snapshot | summoning-2014 |
| Quantumania | Context review required | barbarian-path-of-the-giant-2014 |
| RAI | Context review required | bard-spirits-2014, druid-spells-2014, sorcerer-metamagic-2014 |
| Raven Queen | Context review required | rogue-phantom-2014 |
| Ravenite | Context review required | artificer-races-2014 |
| Ravnica | Context review required | centaur-2014, paladin-oath-of-conquest-2014, ravnica-backgrounds-2014 |
| RAW | Context review required | artificer-infusions-2014, bard-spells-2014, bard-spirits-2014; +18 slugs (JSON source) |
| Ray of Stupidity | Context review required | sorcerer-aberrant-mind-2014 |
| Rebuke Undead | Context review required | cleric-death-2014 |
| Revivify tax | Context review required | cleric-life-domain-2014 |
| ribbon | Context review required | cleric-nature-2014, warlock-fathomless-2014 |
| Ritual | Context review required | dunamancy-2014 |
| ronin (закреслено в оригіналі) | Editorial / book / historic mention; no new rule entity | fighter-samurai-2014 |
| Sage Advice | Context review required | cleric-spells-2014, druid-spells-2014, sorcerer-aberrant-mind-2014, sorcerer-subclasses-2014 |
| Savant | Context review required | wizard-2014 |
| save-or-suck | Context review required | artificer-spells-2014, artificer-subclasses-2014, bard-eloquence-2014; +50 slugs (JSON source) |
| Scholar | Context review required | cleric-2014, cleric-arcana-domain-2014, druid-circle-of-stars-2014 |
| Scribes | Existing native subclass candidate; scope review | wizard-war-magic-2014 |
| session zero | Context review required | wizard-necromancy-2014 |
| Seth Skorkowsky | Context review required | paladin-oathbreaker-2014 |
| Shadow of the Dragon Queen | Context review required | sorcerer-lunar-sorcery-2014 |
| Shadowfell | Context review required | shadar-kai-2014 |
| shenanigans | Context review required | paladin-oath-of-vengeance-2-2014 |
| Shroud of Shadow | Closed after snapshot | warlock-undead-2014 |
| Signature Spell | Closed after snapshot | wizard-2014 |
| Silver Steed | Context review required | fighter-2014 |
| Skelebros | Context review required | cleric-war-domain-2014 |
| Skelecorp | Context review required | cleric-war-domain-2014 |
| Skelemen | Context review required | animating-the-dead-2014, paladin-oathbreaker-2014 |
| Skelesoldiers | Context review required | cleric-war-domain-2014 |
| Skeletal | Closed after snapshot | summoning-2014 |
| Skeletal Squires | Context review required | paladin-oathbreaker-2014 |
| sky-hook | Context review required | druid-circle-of-wildfire-2014 |
| Slaad | Existing summon parent candidate; scope review | summoning-2014 |
| Smite spells | Context review required | paladin-spells-2014 |
| Solinari | Context review required | dragonlance-backgrounds-and-feats-2014 |
| sonic | Context review required | rogue-2014 |
| Sorcadins | Context review required | bard-valor-2014 |
| Soul Knife | Existing native subclass candidate; scope review | sorcerer-subclasses-2014 |
| spellcasting focuses | Equipment/card target review | ranger-spells-2014 |
| Spelljammer | Context review required | artificer-spells-2014, bard-spells-2014, cleric-spells-2014, druid-spells-2014, paladin-oath-of-the-watchers-2014, sorcerer-spells-2014, wizard-spells-2014 |
| Spooky Boys | Context review required | paladin-oathbreaker-2014 |
| sprites | Context review required | warlock-spells-2014 |
| SRD | Editorial / book / historic mention; no new rule entity | artificer-alchemist-2014 |
| Standard Half-Elf | Context review required | artificer-races-2014 |
| Standard Human | Context review required | artificer-races-2014 |
| Staple Build | Editorial / book / historic mention; no new rule entity | artificer-2014, barbarian-2014, cleric-2014; +8 slugs (JSON source) |
| Staple Builds | Editorial / book / historic mention; no new rule entity | ranger-2014 |
| Star Spawn | Existing summon parent candidate; scope review | summoning-2014 |
| Stature | Editorial / book / historic mention; no new rule entity | barbarian-path-of-the-giant-2014 |
| stickiness | Editorial / book / historic mention; no new rule entity | cleric-nature-2014 |
| Stone | Closed after snapshot | summoning-2014 |
| Stone Lethargy | Closed after snapshot | summoning-2014 |
| Stone to Flesh | Context review required | wizard-spells-2014 |
| Storm King’s Thunder | Editorial / book / historic mention; no new rule entity | ranger-hunter-2014, ranger-subclasses-2014 |
| Stout | Context review required | artificer-races-2014 |
| Strike of the Cloud Giant | Context review required | barbarian-path-of-the-giant-2014 |
| Strixhaven | Editorial / book / historic mention; no new rule entity | bard-lore-2014 |
| stun-lock | Editorial / book / historic mention; no new rule entity | druid-circle-of-spores-2014, druid-subclasses-2014 |
| Summon X | Context review required | druid-circle-of-the-shepherd-2014, druid-subclasses-2014 |
| Super Advantage | Editorial / book / historic mention; no new rule entity | bard-valor-2014 |
| Swarm Keeper | Existing native subclass candidate; scope review | ranger-2014 |
| Sword Coast Adventurer’s Guide | Editorial / book / historic mention; no new rule entity | artificer-races-2014, barbarian-subclasses-2014, barbarian-totem-warrior-2014, wizard-scribes-2014, wizard-subclasses-2014 |
| System Reference Document 5.1 | Editorial / book / historic mention; no new rule entity | bard-2014 |
| T-Rex | Context review required | warlock-undead-2014 |
| T-rex | Context review required | druid-circle-of-dreams-2014 |
| Tank Fallacy | Editorial / book / historic mention; no new rule entity | artificer-races-2014, barbarian-2014, barbarian-path-of-the-beast-2014, barbarian-subclasses-2014, cleric-forge-2014, paladin-2014 |
| Tashaʼs Cauldron of Everything | Editorial / book / historic mention; no new rule entity | bard-2014 |
| Tasha’s Cauldron of Everything | Editorial / book / historic mention; no new rule entity | artificer-2014, artificer-infusions-2014, artificer-races-2014; +31 slugs (JSON source) |
| the Dredge | Context review required | barbarian-path-of-wild-magic-2014 |
| the Magical Gravity People’s Elbow | Context review required | monk-open-hand-2014 |
| The Prince of All Hadozee | Context review required | monk-sun-soul-2014 |
| The Wild Beyond the Witchlight | Editorial / book / historic mention; no new rule entity | ranger-fey-wanderer-2014 |
| Thoth | Context review required | cleric-knowledge-domain-2014 |
| Thunderbird | Context review required | sorcerer-storm-sorcery-2014 |
| Tieflings | Context review required | bard-eloquence-2014 |
| Toril | Context review required | hexadin-2014 |
| Total Cover | Closed after snapshot | kobold-2014 |
| Totem | Context review required | druid-moon-2014 |
| Town Portal | Context review required | druid-circle-of-dreams-2014, druid-subclasses-2014 |
| Tri-Lamb | Context review required | druid-circle-of-the-shepherd-2014 |
| Turn Whatever | Context review required | paladin-oathbreaker-2014, paladin-subclasses-2014 |
| two greatswords | Context review required | paladin-oath-of-devotion-2014 |
| Tyranny of Dragons | Editorial / book / historic mention; no new rule entity | paladin-subclasses-2014 |
| Unarmed | Ambiguous/category; context-specific target needed | monk-2014 |
| Unarmed Attacks | Ambiguous/category; context-specific target needed | druid-moon-2014 |
| Unarmed Strikes | Closed after snapshot | druid-2014 |
| Undercommon | Context review required | bard-lore-2014 |
| Unearthed Arcana | Editorial / book / historic mention; no new rule entity | aarakocra-2014, aasimar-2014, aberrant-dragonmark-2014; +249 slugs (JSON source) |
| Utility Caster | Editorial / book / historic mention; no new rule entity | cleric-arcana-domain-2014, druid-2014, ranger-2014, sorcerer-2014, wizard-2014 |
| Vaal (закреслено в оригіналі) | Editorial / book / historic mention; no new rule entity | wizard-necromancy-2014 |
| Van Richten’s Guide to Ravenloft | Editorial / book / historic mention; no new rule entity | artificer-alchemist-2014, artificer-races-2014, paladin-oath-of-conquest-2014, wizard-enchantment-2014 |
| Vegeta | Editorial / book / historic mention; no new rule entity | monk-sun-soul-2014 |
| Vehicles (Land) | Closed after snapshot | tools-2014 |
| Vehicles (Water) | Closed after snapshot | tools-2014 |
| Vermin | Context review required | druid-spells-2014 |
| Vermin Growth | Context review required | druid-spells-2014 |
| Volo’s Guide to Monsters | Editorial / book / historic mention; no new rule entity | warlock-undead-2014 |
| War Wizard | Existing native subclass candidate; scope review | barbarian-totem-warrior-2014 |
| Warlock Handbook | Context review required | warlock-celestial-2014 |
| Warpriest | Closed after snapshot | cleric-war-domain-2014 |
| Water | Ambiguous/category; context-specific target needed | artificer-races-2014, summoning-2014 |
| Water Vehicles | Closed after snapshot | wizard-war-magic-2014 |
| wave dashing | Editorial / book / historic mention; no new rule entity | barbarian-path-of-the-beast-2014 |
| Wildemount | Context review required | bard-spirits-2014, druid-circle-of-spores-2014 |
| Wildhunt Shifter | Context review required | monk-astral-self-2014 |
| Wildspace | Context review required | paladin-oath-of-the-watchers-2014 |
| Witch-Knight | Context review required | hexadin-2014 |
| Wood Half-Elf | Context review required | artificer-races-2014 |
| X Savant | Context review required | wizard-subclasses-2014 |
| X-Men | Editorial / book / historic mention; no new rule entity | cleric-tempest-domain-2014 |
| Xanathar’s Guide to Everything | Editorial / book / historic mention; no new rule entity | druid-circle-of-stars-2014, druid-subclasses-2014, paladin-oath-of-conquest-2014; +6 slugs (JSON source) |
| Yugoloth | Existing summon parent candidate; scope review | summoning-2014 |
| Zapdos | Editorial / book / historic mention; no new rule entity | sorcerer-storm-sorcery-2014 |
| Zhentarim | Context review required | sorcerer-aberrant-mind-2014 |
| zoning | Editorial / book / historic mention; no new rule entity | warlock-fathomless-2014 |

## Verification

`tests/content/rpgbot-rare-reference-aliases-2014.test.ts`: **42 tests passed**, one worker. This includes exact full-body assertions, marker-to-native routing, creature/class ambiguity exclusions and 2024 exclusions. Production helper additions were reviewed against the clean-code guard; the helper remains a finite explicit registry with source-scoped exceptions. A final corpus rerun is required to replace this historical unresolved snapshot.

## Final alias checks after the classification snapshot

| Original | Actual article | Confirmed native destination |
| --- | --- | --- |
| T-Rex / T-rex | warlock-undead-2014 / druid-circle-of-dreams-2014 | Tyrannosaurus Rex statblock; Polymorph forms in both passages. |
| Flame Spirit | druid-circle-of-wildfire-2014 | Wildfire Spirit statblock; article spends Wild Shape to summon it. |
| Unarmed Attacks | druid-moon-2014 | Full 2014 Unarmed Strike rule card, including 1 + Strength damage; creature Bite/Claw actions explicitly contrasted in the source. |
| Inspiration Dice | bard-glamour-2014 | Bardic Inspiration; passage discusses the dice bard colleges spend. |
| Hexblade Warlocks | paladin-oath-of-conquest-2014 | Hexblade subclass; scoped to subclass targets, not an unrelated feature. |
| Resistance | monk-ascendant-dragon-2014 / monk-subclasses-2014 | Aspect of the Wyrm's 10-foot aura; alias requires the native feature's section and 2014 class route. Ordinary resistance and 2024 targets are excluded. |

The first six article cases passed in the full hydration-catalog test file (37/37); the aura additions passed separately (3/3), including a negative edition/unscoped-target check. These checks do not classify every remaining marker.

`Strike of the Cloud Giant` in barbarian-path-of-the-giant-2014 describes resistance to an incoming attack and reaction teleportation: the mechanics of Guile of the Cloud Giant / Cloudy Escape, not Cloud Strike from Strike of the Giants. It remains unresolved pending a narrowly contextual editorial correction; a global alias would hide the source naming error.
