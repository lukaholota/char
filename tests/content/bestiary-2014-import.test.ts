import { describe, it, expect } from "vitest";
import { getAllCreatures, CreatureData } from "@/lib/bestiaryData";
import manifest from "../../data/aidedd/import-manifest.json";
import { findSourceKey2014 } from "../../scripts/aidedd/build-creature-record";
import dictionary from "@/lib/refs/dictionary.json";
import { subclassTranslations, LanguageTranslations } from "@/lib/refs/translation";
import { readFileSync } from "node:fs";
import { parseMonster2014 } from "../../scripts/aidedd/parse-monster-2014";
import batchOne from "../../data/aidedd/translations/monsters-2014/batch-01.json";
import batchTwo from "../../data/aidedd/translations/monsters-2014/batch-02.json";
import batchThree from "../../data/aidedd/translations/monsters-2014/batch-03.json";
import batchFour from "../../data/aidedd/translations/monsters-2014/batch-04.json";
import batchFive from "../../data/aidedd/translations/monsters-2014/batch-05.json";
import batchSix from "../../data/aidedd/translations/monsters-2014/batch-06.json";
import batchSeven from "../../data/aidedd/translations/monsters-2014/batch-07.json";
import batchEight from "../../data/aidedd/translations/monsters-2014/batch-08.json";
import batchNine from "../../data/aidedd/translations/monsters-2014/batch-09.json";
import batchTen from "../../data/aidedd/translations/monsters-2014/batch-10.json";
import batchEleven from "../../data/aidedd/translations/monsters-2014/batch-11.json";
import batchTwelve from "../../data/aidedd/translations/monsters-2014/batch-12.json";
import batchThirteen from "../../data/aidedd/translations/monsters-2014/batch-13.json";
import batchFourteen from "../../data/aidedd/translations/monsters-2014/batch-14.json";
import batchFifteen from "../../data/aidedd/translations/monsters-2014/batch-15.json";
import batchSixteen from "../../data/aidedd/translations/monsters-2014/batch-16.json";
import batchSeventeen from "../../data/aidedd/translations/monsters-2014/batch-17.json";
import batchEighteen from "../../data/aidedd/translations/monsters-2014/batch-18.json";
import batchNineteen from "../../data/aidedd/translations/monsters-2014/batch-19.json";
import batchTwenty from "../../data/aidedd/translations/monsters-2014/batch-20.json";
import batchTwentyOne from "../../data/aidedd/translations/monsters-2014/batch-21.json";
import batchTwentyTwo from "../../data/aidedd/translations/monsters-2014/batch-22.json";
import batchTwentyThree from "../../data/aidedd/translations/monsters-2014/batch-23.json";
import batchTwentyFour from "../../data/aidedd/translations/monsters-2014/batch-24.json";
import batchTwentyFive from "../../data/aidedd/translations/monsters-2014/batch-25.json";
import batchTwentySix from "../../data/aidedd/translations/monsters-2014/batch-26.json";
import batchTwentySeven from "../../data/aidedd/translations/monsters-2014/batch-27.json";
import batchTwentyEight from "../../data/aidedd/translations/monsters-2014/batch-28.json";
import batchTwentyNine from "../../data/aidedd/translations/monsters-2014/batch-29.json";
import batchThirty from "../../data/aidedd/translations/monsters-2014/batch-30.json";
import batchThirtyOne from "../../data/aidedd/translations/monsters-2014/batch-31.json";
import batchThirtyTwo from "../../data/aidedd/translations/monsters-2014/batch-32.json";
import batchThirtyThree from "../../data/aidedd/translations/monsters-2014/batch-33.json";
import batchThirtyFour from "../../data/aidedd/translations/monsters-2014/batch-34.json";

const manifest2014 = manifest.filter((row) => row.edition === "RULES_2014");
const FIRST_IMPORT_ID = 565;

/// The "bare action name" source defect (KR12.3 journal, 2026-08-19): aidedd's own page renders
/// the trait/action names with no mechanical text for roughly a third of the 2014 corpus,
/// concentrated in Monsters of the Multiverse / Fizban's Treasury / Glory of the Giants. Owner
/// decision: defer these rather than invent text; they stay "pending" indefinitely.
const BATCH_ONE_DEFERRED_SLUGS = new Set([
  "adult-kruthik",
  "crystal-dragon-wyrmling",
  "amethyst-dragon-wyrmling",
  "adult-oblex",
  "kruthik-hive-lord",
  "air-elemental-myrmidon",
  "korred",
  "shadar-kai-shadow-dancer",
  "ulitharid",
  "alhoon",
  "autumn-eladrin",
  "elder-oblex",
  "adult-deep-dragon",
  "alkilith",
]);

/// Same source defect, batch 2 (KR12.3 journal, 2026-08-19): all ten are Fizban's Treasury gem
/// dragons plus one Monsters of the Multiverse devil and one Tomb of Annihilation adventure entry —
/// verified empty on the live aidedd page, not a parser bug.
const BATCH_TWO_DEFERRED_SLUGS = new Set([
  "adult-crystal-dragon",
  "adult-topaz-dragon",
  "adult-emerald-dragon",
  "adult-moonstone-dragon",
  "adult-sapphire-dragon",
  "adult-amethyst-dragon",
  "amnizu",
  "ancient-topaz-dragon",
  "acererak",
  "ancient-amethyst-dragon",
]);

/// Two more batch-2 rows stay pending, but not from the source defect above — both are pipeline
/// gaps this session isn't authorized to close: `alustriel-silverhand`'s source ("Adventures (Vecna:
/// Eve of Ruin)") has no matching key in the Prisma `Source` enum or `sourceTranslations` (adding one
/// needs a schema change, forbidden this session); `aberrant-spirit` is a Summon Aberration spell
/// stat block with CR "-" and level-scaling HP/AC, which `formatExperience` has no override for.
const BATCH_TWO_BLOCKED_SLUGS = new Set(["alustriel-silverhand", "aberrant-spirit"]);

/// Same source defect, batch 3 (KR12.3, 2026-08-19): all four are "Adventures (Rime of the
/// Frostmaiden)" tiny beasts — trait/action names present, mechanical text missing on the live
/// aidedd page itself, verified against the raw cached HTML before deferring.
const BATCH_THREE_DEFERRED_SLUGS = new Set(["fox", "hare", "knucklehead-trout", "seal"]);

/// Same source defect, batch 4 (KR12.3, 2026-08-19): one Fizban's Treasury entry and one plain
/// Monster Manual entry (not the SRD variant) alongside a second "Adventures (Rime of the
/// Frostmaiden)" hit — all three verified empty on the raw cached HTML, not a parser bug.
const BATCH_FOUR_DEFERRED_SLUGS = new Set(["hoard-scarab", "monodrone", "mountain-goat"]);

/// Same source defect, batch 5 (KR12.3, 2026-08-19): four hits, one of them the second-ever fully
/// empty plain "Monster Manual" (not SRD) page after batch 4's `monodrone` — verified empty on the
/// raw cached HTML, not a parser bug.
const BATCH_FIVE_DEFERRED_SLUGS = new Set([
  "young-kruthik",
  "deep-rothe",
  "duodrone",
  "gnoll-witherling",
]);

/// One batch-5 row stays pending, but not from the source defect above — the statblock is complete
/// (1 trait, 1 action), yet its source ("Extra (Adventurers League)") has no matching key in the
/// Prisma `Source` enum or `sourceTranslations`, same pipeline-gap class as `alustriel-silverhand`
/// in batch 2. Owner confirmed 2026-08-19: leave pending, do not invent an enum value.
const BATCH_FIVE_BLOCKED_SLUGS = new Set(["wild-dog"]);

/// Same source defect, batch 6 (KR12.3, 2026-08-19): six hits — two more "Adventures (...)" entries
/// (Shadow of the Dragon Queen, Descent into Avernus, Tomb of Annihilation) and three Monsters of
/// the Multiverse entries, all verified empty against the live aidedd page (not a caching bug).
const BATCH_SIX_DEFERRED_SLUGS = new Set([
  "kender-skirmisher",
  "night-blade",
  "oblex-spawn",
  "ox",
  "star-spawn-grue",
  "tabaxi-minstrel",
]);

/// Three batch-6 rows stay pending, but not from the source defect above — all three have complete
/// statblocks whose source has no matching key in the Prisma `Source` enum or `sourceTranslations`,
/// same pipeline-gap class as `alustriel-silverhand` (batch 2) and `wild-dog` (batch 5). `rothe` even
/// shares wild-dog's exact source string ("Extra (Adventurers League)"); `minor-air-elemental`
/// ("Extra (D&D Beyond)") and `mummified-warrior` ("Extra (AideDD)") are new source strings, same
/// class. Owner confirmed 2026-08-19: leave all three pending, do not invent enum values.
const BATCH_SIX_BLOCKED_SLUGS = new Set(["minor-air-elemental", "mummified-warrior", "rothe"]);

/// Same source defect, batch 7 (KR12.3, 2026-08-19): seven hits — a sixth consecutive empty
/// "Adventures (Rime of the Frostmaiden)" record (`walrus`), a third "Glory of the Giants" entry
/// (`giant-lynx`), a third-source draconian pair (Shadow of the Dragon Queen, Fizban's Treasury of
/// Dragons), one more Monsters of the Multiverse and one more Tomb of Annihilation/Descent into
/// Avernus adventure hit, all verified empty against the live aidedd page, not a caching bug.
const BATCH_SEVEN_DEFERRED_SLUGS = new Set([
  "walrus",
  "wretched-sorrowsworn",
  "yellow-musk-zombie",
  "baaz-draconian",
  "draconian-foot-soldier",
  "fist-of-bane",
  "giant-lynx",
]);

/// One batch-7 row stays pending, but not from the source defect above — the statblock is complete
/// (2 traits, 2 actions), yet its source ("Extra (Adventurers League)") has no matching key in the
/// Prisma `Source` enum, same pipeline-gap class as `wild-dog` (batch 5) and `rothe` (batch 6) — all
/// three share the exact same source string. Owner confirmed 2026-08-19: leave pending, do not
/// invent an enum value.
const BATCH_SEVEN_BLOCKED_SLUGS = new Set(["giant-two-headed-goat"]);

/// Same source defect, batch 8 (KR12.3, 2026-08-19): five hits — a seventh consecutive empty
/// "Adventures (Rime of the Frostmaiden)" record was NOT among them (that source gave nothing this
/// batch); instead two new "Adventures (...)" sources (Descent into Avernus, Candlekeep Mysteries),
/// two Monsters of the Multiverse entries, and `tridrone` — a third consecutive fully empty plain
/// "Monster Manual" (not SRD) page after `monodrone` (batch 4) and `duodrone` (batch 5), all three
/// from the same drone/modron article family, strengthening the theory that this is specific to that
/// aidedd article rather than Monster Manual entries generally. All five verified empty against the
/// live aidedd page, not a caching bug.
const BATCH_EIGHT_DEFERRED_SLUGS = new Set([
  "necromite-of-myrkul",
  "sage",
  "stench-kow",
  "swarm-of-rot-grubs",
  "tridrone",
]);

/// Two batch-8 rows stay pending, but not from the source defect above — both have complete
/// statblocks whose source has no matching key in the Prisma `Source` enum, same pipeline-gap class
/// as `alustriel-silverhand` (batch 2) onward. `reef-manta-ray` repeats `mummified-warrior`'s exact
/// source string ("Extra (AideDD)", batch 6); `minor-water-elemental` repeats
/// `minor-air-elemental`'s exact source string ("Extra (D&D Beyond)", batch 6). Owner confirmed
/// 2026-08-19: same approach, leave both pending, do not invent enum values.
const BATCH_EIGHT_BLOCKED_SLUGS = new Set(["reef-manta-ray", "minor-water-elemental"]);

/// Same source defect, batch 9 (KR12.3, 2026-08-19): six hits, all from the three sources already
/// established as concentrated — three more "Glory of the Giants" (`bag-jelly`, `giant-ram`,
/// `grinning-cat`), one more Fizban's Treasury (`deep-dragon-wyrmling`), two more Monsters of the
/// Multiverse (`duergar-soulblade`, `gnoll-flesh-gnawer`). No plain "Monster Manual" (not SRD) hit
/// this batch, so the drone/modron streak from batches 4/5/8 (`monodrone`/`duodrone`/`tridrone`)
/// stays at three — unextended, not contradicted. All six verified empty against both the raw
/// cached HTML and the live aidedd page, not a caching bug.
const BATCH_NINE_DEFERRED_SLUGS = new Set([
  "bag-jelly",
  "deep-dragon-wyrmling",
  "duergar-soulblade",
  "gnoll-flesh-gnawer",
  "giant-ram",
  "grinning-cat",
]);

/// One batch-9 row stays pending, but not from the source defect above — the statblock is complete
/// (3 traits, 1 action), yet its source ("Extra (AideDD)") repeats `mummified-warrior`'s exact
/// source string (batch 6, also seen in `reef-manta-ray`, batch 8), same pipeline-gap class as
/// `alustriel-silverhand` (batch 2) onward. Owner confirmed 2026-08-19: same approach, leave
/// pending, do not invent an enum value.
const BATCH_NINE_BLOCKED_SLUGS = new Set(["ancient-shadow"]);

/// Same source defect, batch 10 (KR12.3, 2026-08-19): nine hits — six Monsters of the Multiverse
/// (`maw-demon`, `meazel`, `sea-spawn`, `stone-cursed`, `thorny-vegepygmy`,
/// `xvart-warlock-of-raxivort`), two adventure entries (`skull-lasher-of-myrkul`,
/// `tabaxi-hunter`) and `quadrone` — the fourth plain "Monster Manual" (not SRD) hit, and the
/// fourth member of the drone/modron family after `monodrone`/`duodrone`/`tridrone`
/// (batches 4/5/8), which is what the batch-8 journal named as the deciding case. All nine
/// verified empty against both the raw cached HTML and the live aidedd page, not a parser bug.
const BATCH_TEN_DEFERRED_SLUGS = new Set([
  "maw-demon",
  "meazel",
  "quadrone",
  "sea-spawn",
  "skull-lasher-of-myrkul",
  "stone-cursed",
  "tabaxi-hunter",
  "thorny-vegepygmy",
  "xvart-warlock-of-raxivort",
]);

/// Two batch-10 rows stay pending, but not from the source defect above — both statblocks are
/// complete, and both repeat source strings already blocked in earlier batches:
/// `minor-earth-elemental` ("Extra (D&D Beyond)", as `minor-air-elemental`/`minor-water-elemental`)
/// and `wild-dog-alpha` ("Extra (Adventurers League)", as `wild-dog`/`rothe`/`giant-two-headed-goat`).
/// Owner confirmed 2026-08-19: same approach, leave pending, do not invent an enum value.
const BATCH_TEN_BLOCKED_SLUGS = new Set(["minor-earth-elemental", "wild-dog-alpha"]);

/// Batch 11 hits the same "bare action name" defect in its densest form yet: six Monsters of the
/// Multiverse rows (`aurochs`, `berbalang`, `darkling-elder` and three duergar), four Fizban's
/// Treasury rows and `bozak-draconian` ("Adventures (Shadow of the Dragon Queen)", a source string
/// the corpus had not shown before). All eleven verified empty against the raw cached HTML and the
/// live aidedd page; `duergar-xarrorn` is the same-source, same-batch non-empty control.
const BATCH_ELEVEN_DEFERRED_SLUGS = new Set([
  "aurochs",
  "berbalang",
  "bozak-draconian",
  "darkling-elder",
  "draconian-mage",
  "dragon-speaker",
  "dragonnel",
  "duergar-kavalrachni",
  "duergar-mind-master",
  "duergar-stone-guard",
  "emerald-dragon-wyrmling",
]);

/// Batch 11 produced no block outside the source defect — every complete statblock in it cites a
/// book the Prisma Source enum already knows. Kept as an explicit empty set so the batch states
/// that outcome instead of leaving it unsaid.
const BATCH_ELEVEN_BLOCKED_SLUGS = new Set<string>([]);

/// Same source defect, batch 12 (KR12.3, 2026-08-19): its thinnest showing yet — two Monsters of the
/// Multiverse ogres (`ogre-bolt-launcher`, `ogre-howdah`), one Fizban's Treasury gem wyrmling
/// (`moonstone-dragon-wyrmling`) and a fourth "Adventures (Descent into Avernus)" record
/// (`iron-consul`). All four verified empty against both the raw cached HTML and the live aidedd
/// page; `meenlock`, `grung-elite-warrior` and `guard-drake` are the same-source, same-batch
/// non-empty controls for Monsters of the Multiverse.
const BATCH_TWELVE_DEFERRED_SLUGS = new Set([
  "iron-consul",
  "moonstone-dragon-wyrmling",
  "ogre-bolt-launcher",
  "ogre-howdah",
]);

/// Batch 12 produced no block outside the source defect, and it is the first batch to prove that
/// end of the corpus audit: `minor-fire-elemental` ("Extra (D&D Beyond)") and the two Volo's orcs
/// would all have been blocked before it. Kept as an explicit empty set so the batch states that
/// outcome instead of leaving it unsaid.
const BATCH_TWELVE_BLOCKED_SLUGS = new Set<string>([]);

/// Same source defect, batch 13 (KR12.3, 2026-08-20): eight bare-name statblocks, verified empty
/// against both the raw cached HTML and the live aidedd page. Two Monsters of the Multiverse
/// (`rutterkin`, `shadow-mastiff`), one Fizban's Treasury gem wyrmling (`topaz-dragon-wyrmling`),
/// one plain Monster Manual (`pentadrone`) and four adventure records. `quetzalcoatlus`,
/// `tortle-druid` and `vegepygmy-chief` are the same-source, same-batch non-empty controls for
/// Monsters of the Multiverse.
const BATCH_THIRTEEN_DEFERRED_SLUGS = new Set([
  "pentadrone",
  "reaper-of-bhaal",
  "rutterkin",
  "shadow-mastiff",
  "topaz-dragon-wyrmling",
  "uthgardt-shaman",
  "were-bat",
  "yellow-musk-creeper",
]);

/// The single block outside the source defect is the one the corpus audit deliberately left open:
/// `venerable-shadow` cites "Extra (AideDD)", the site's own homebrew, which the owner decided not
/// to add to the Source enum. It stays pending permanently, like the four other AideDD records.
const BATCH_THIRTEEN_BLOCKED_SLUGS = new Set(["venerable-shadow"]);

/// Same source defect, batch 14 (KR12.3, 2026-08-20): fourteen bare-name statblocks, verified empty
/// against both the raw cached HTML and the live aidedd page — the densest share of the whole goal
/// so far. Seven Monsters of the Multiverse, three Fizban's Treasury, three Glory of the Giants and
/// one adventure record. `archer`, `derro-savant`, `giff` and `yuan-ti-broodguard` are the
/// same-source, same-batch non-empty controls for Monsters of the Multiverse; Fizban's Treasury and
/// Glory of the Giants have no non-empty record in this batch at all.
const BATCH_FOURTEEN_DEFERRED_SLUGS = new Set([
  "assassin-vine",
  "bulezau",
  "cave-fisher",
  "choldrith",
  "deathlock-wight",
  "deep-scion",
  "dolphin-delighter",
  "draconian-infiltrator",
  "dragon-chosen",
  "dragonflesh-grafter",
  "flail-snail",
  "giant-goose",
  "giant-ox",
  "goliath-giant-kin",
]);

/// Batch 14 has no block outside the source defect. `assassin-vine` cites the unknown source
/// "Adventures (Tomb of Annihilation)" (open in questions.md), but that record is already deferred
/// by the bare-name defect, so it never blocked the batch.
const BATCH_FOURTEEN_BLOCKED_SLUGS = new Set<string>([]);

/// Same source defect, batch 15 (KR12.3, 2026-08-20): seven bare-name statblocks, verified empty
/// against both the raw cached HTML and the live aidedd page. Four Monsters of the Multiverse, one
/// Fizban's Treasury, one Glory of the Giants and one Shadow of the Dragon Queen record.
/// `illusionist-wizard`, `leucrotta`, `merrenoloth`, `ogre-chain-brute`, `redcap`, `swashbuckler`
/// and `trapper` are the same-source, same-batch non-empty controls for Monsters of the Multiverse.
const BATCH_FIFTEEN_DEFERRED_SLUGS = new Set([
  "kapak-draconian",
  "mud-hulk",
  "sapphire-dragon-wyrmling",
  "shadow-mastiff-alpha",
  "slithering-tracker",
  "spotted-lion",
  "sword-wraith-warrior",
]);

/// `grell` is the first block of the whole goal that actually cost a batch a full statblock: its
/// page is complete, but the creature speaks its own language "Grell", which no controlled
/// dictionary carries. Every creature-named language before it (Hook Horror, Thri-kreen, Gith,
/// Umber Hulk, Otyugh) went through the owner's term gate, so this one is queued in questions.md
/// instead of being invented here.
const BATCH_FIFTEEN_BLOCKED_SLUGS = new Set(["grell"]);

/// Same source defect, batch 16 (KR12.3, 2026-08-20): eight bare-name statblocks, verified empty
/// against both the raw cached HTML and the live aidedd page. Four Monsters of the Multiverse, two
/// Fizban's Treasury, one Glory of the Giants and one Rime of the Frostmaiden record. `babau`,
/// `barghest`, `deathlock` and `girallon` are the same-source, same-batch non-empty controls for
/// Monsters of the Multiverse.
const BATCH_SIXTEEN_DEFERRED_SLUGS = new Set([
  "clockwork-iron-cobra",
  "draconian-dreadnought",
  "dragon-turtle-wyrmling",
  "dybbuk",
  "firbolg-primeval-warden",
  "giant-walrus",
  "hobgoblin-devastator",
  "vampiric-mist",
]);

/// Two blocks outside the source defect, each of a different kind. `winter-wolf` speaks its own
/// language "Winter Wolf", which no controlled dictionary carries — the same gate that stopped
/// `grell` in batch 15, queued in questions.md instead of invented here. `yuan-ti-malison` is a new
/// class: its page prints three alternative Actions blocks ("For Type 1/2/3") and the parser keeps
/// only the last, so importing it would silently publish Type 3 as the whole statblock.
const BATCH_SIXTEEN_BLOCKED_SLUGS = new Set(["winter-wolf", "yuan-ti-malison"]);

/// Same source defect, batch 17 (KR12.3, 2026-08-20): ten bare-name statblocks, verified empty
/// against both the raw cached HTML and the live aidedd page. Three Monsters of the Multiverse,
/// two Fizban's Treasury, two Descent into Avernus, and one each from Shadow of the Dragon Queen,
/// Rime of the Frostmaiden and Glory of the Giants. `merregon`, `neogi-master`, `banderhobb`,
/// `catoblepas`, `warlock-of-the-archfey` and `yeth-hound` are the same-source, same-batch
/// non-empty controls for Monsters of the Multiverse.
const BATCH_SEVENTEEN_DEFERRED_SLUGS = new Set([
  "master-of-souls",
  "ogre-battering-ram",
  "sivak-draconian",
  "vellynne-harpell",
  "yuan-ti-mind-whisperer",
  "yuan-ti-nightmare-speaker",
  "death-s-head-of-bhaal",
  "dragon-blessed",
  "dragonblood-ooze",
  "dust-hulk",
]);

/// Nothing outside the source defect blocked batch 17 — no unknown source, no missing dictionary
/// term, no parser class like batch 16's three alternative Actions blocks. Kept as an explicit
/// empty set so the batch states that, rather than leaving it unsaid.
const BATCH_SEVENTEEN_BLOCKED_SLUGS = new Set<string>([]);

/// Same source defect, batch 18 (KR12.3, 2026-08-20): nine bare-name statblocks, verified empty
/// against both the raw cached HTML and the live aidedd page. Three Monsters of the Multiverse,
/// two Glory of the Giants, and one each from Fizban's Treasury, Rime of the Frostmaiden, Descent
/// into Avernus and Candlekeep Mysteries. `enchanter-wizard`, `kraken-priest` and `master-thief`
/// are the same-source, same-batch non-empty controls for Monsters of the Multiverse; the whole
/// Monster Manual half of the batch — eighteen rows — is non-empty.
const BATCH_EIGHTEEN_DEFERRED_SLUGS = new Set([
  "firbolg-wanderer",
  "frost-druid",
  "gem-stalker",
  "hellwasp",
  "master-sage",
  "mindwitness",
  "rime-hulk",
  "spawn-of-kyuss",
  "star-spawn-mangler",
]);

/// Nothing outside the source defect blocked batch 18. `master-sage` does cite a source with no
/// key in the Prisma `Source` enum ("Adventures (Candlekeep Mysteries)"), but its statblock is
/// empty anyway, so the unknown source cost the batch nothing — same shape as `yellow-musk-creeper`
/// in batch 13. The question is queued in questions.md. Kept as an explicit empty set.
const BATCH_EIGHTEEN_BLOCKED_SLUGS = new Set<string>([]);

/// Same source defect, batch 19 (KR12.3 journal, 2026-08-20): ten empty statblocks over five books,
/// verified empty on the live aidedd page. Two of them also trip a dictionary gate that the defect
/// hides — `swarm-of-cranium-rats` cites the creature type "Swarm of Tiny aberrations" and
/// `young-crystal-dragon` the type tag "Gem" — so both questions are queued in questions.md while
/// the rows stay deferred by the defect, exactly as `master-sage` in batch 18.
const BATCH_NINETEEN_DEFERRED_SLUGS = new Set([
  "animated-breath",
  "aurak-draconian",
  "black-gauntlet-of-bane",
  "draconian-mastermind",
  "dragonborn-of-sardior",
  "swarm-of-cranium-rats",
  "titanothere",
  "tlincalli",
  "young-crystal-dragon",
  "young-deep-dragon",
]);

/// Nothing outside the source defect blocked batch 19 — third such batch in a row. Kept as an
/// explicit empty set.
const BATCH_NINETEEN_BLOCKED_SLUGS = new Set<string>([]);

/// Same source defect, batch 20 (KR12.3 journal, 2026-08-20): eleven empty statblocks over four
/// books, verified empty on the live aidedd page. `bheur-hag` also trips the movement-mode gate
/// ("Graystaff") and `dhergoloth` the damage-type gate, both hidden behind the defect.
const BATCH_TWENTY_DEFERRED_SLUGS = new Set([
  "dragonflesh-abomination",
  "echo-of-demogorgon",
  "fensir-skirmisher",
  "mist-hulk",
  "mouth-of-grolantor",
  "armanite",
  "barrowghast",
  "bheur-hag",
  "cinder-hulk",
  "dhergoloth",
  "draegloth",
]);

/// The single block outside the source defect is the standing "Extra (AideDD)" decision: `devilroot`
/// cites the site's own homebrew, which the owner decided not to add to the Source enum. It stays
/// pending permanently, like `venerable-shadow` in batch 13. Its statblock is otherwise full.
const BATCH_TWENTY_BLOCKED_SLUGS = new Set(["devilroot"]);

/// Same source defect, batch 21 (KR12.3 journal, 2026-08-20): fifteen empty statblocks over five
/// books — the densest share of the whole goal — verified empty on the live aidedd page.
/// `young-topaz-dragon` also trips the standing "Gem" type-tag gate, hidden behind the defect.
const BATCH_TWENTY_ONE_DEFERRED_SLUGS = new Set([
  "dragonborn-of-tiamat",
  "earth-elemental-myrmidon",
  "fire-elemental-myrmidon",
  "liondrake",
  "lost-sorrowsworn",
  "maurezhi",
  "skeletal-knight",
  "troll-mutate",
  "venom-troll",
  "water-elemental-myrmidon",
  "young-topaz-dragon",
  "canoloth",
  "corpse-flower",
  "deathlock-mastermind",
  "dragonborn-of-bahamut",
]);

/// Nothing outside the source defect blocked batch 21 — no unknown source, no dictionary gate on a
/// creature whose statblock is otherwise full.
const BATCH_TWENTY_ONE_BLOCKED_SLUGS = new Set<string>([]);

/// Same source defect, batch 22 (KR12.3 journal, 2026-08-20): eleven empty statblocks over four
/// books, verified empty on the live aidedd page. `young-emerald-dragon` also trips the standing
/// "Gem" type-tag gate, hidden behind the defect exactly as `young-topaz-dragon` in batch 21.
const BATCH_TWENTY_TWO_DEFERRED_SLUGS = new Set([
  "ettin-ceremorph",
  "eyedrake",
  "fensir-devourer",
  "hoard-mimic",
  "howler",
  "sperm-whale",
  "sword-wraith-commander",
  "young-emerald-dragon",
  "young-moonstone-dragon",
  "young-sea-serpent",
  "cairnwight",
]);

/// Nothing outside the source defect blocked batch 22 — no unknown source, no dictionary gate on a
/// creature whose statblock is otherwise full.
const BATCH_TWENTY_TWO_BLOCKED_SLUGS = new Set<string>([]);

/// Same source defect, batch 23 (KR12.3 journal, 2026-08-20): seventeen empty statblocks over four
/// books — the widest share of the goal so far. `young-amethyst-dragon` and `young-sapphire-dragon`
/// also trip the standing "Gem" type-tag gate, hidden behind the defect exactly as
/// `young-topaz-dragon` in batch 21 and `young-emerald-dragon` in batch 22.
const BATCH_TWENTY_THREE_DEFERRED_SLUGS = new Set([
  "hydroloth",
  "lightning-hulk",
  "lonely-sorrowsworn",
  "rot-troll",
  "shadar-kai-gloom-weaver",
  "stone-giant-of-evil-earth",
  "young-amethyst-dragon",
  "young-sapphire-dragon",
  "death-kiss",
  "fire-giant-of-evil-fire",
  "fomorian-deep-crawler",
  "frostmourn",
  "githyanki-gish",
  "githzerai-enlightened",
  "maw-of-yeenoghu",
  "orthon",
  "spring-eladrin",
]);

/// Nothing outside the source defect blocked batch 23 — no unknown source, no dictionary gate on a
/// creature whose statblock is otherwise full.
const BATCH_TWENTY_THREE_BLOCKED_SLUGS = new Set<string>([]);

/// Same source defect, batch 24 (KR12.3 journal, 2026-08-20): fourteen empty statblocks over four
/// books, verified empty on the live aidedd page.
const BATCH_TWENTY_FOUR_DEFERRED_SLUGS = new Set([
  "star-spawn-hulk",
  "stone-giant-dreamwalker",
  "young-dragon-turtle",
  "balhannoth",
  "cloud-giant-smiling-one",
  "dracohydra",
  "dragonbone-golem",
  "fire-hellion",
  "firegaunt",
  "frost-giant-of-evil-water",
  "hungry-sorrowsworn",
  "morkoth",
  "shadar-kai-soul-monger",
  "spirit-troll",
]);

/// `gynosphinx` has a full statblock but cites the creature language "Sphinx", which
/// `LanguageTranslations` does not carry. A language name is a controlled term, so the batch filed
/// the question instead of inventing it — the same class as `grell` in batch 15 and `winter-wolf`
/// in batch 16.
const BATCH_TWENTY_FOUR_BLOCKED_SLUGS = new Set<string>(["gynosphinx"]);

/// Same source defect, batch 25 (KR12.3 journal, 2026-08-20): fifteen empty statblocks over four
/// books, verified empty on the live aidedd page. `muiral` also cites an unknown source
/// ("Adventures (Dungeon of the Mad Mage)"), but the empty statblock already defers it.
const BATCH_TWENTY_FIVE_DEFERRED_SLUGS = new Set([
  "storm-crab",
  "cloud-giant-of-evil-air",
  "death-giant-reaper",
  "duergar-despot",
  "fomorian-warlock-of-the-dark",
  "frost-giant-everlasting-one",
  "githyanki-kith-rak",
  "hill-giant-avalancher",
  "oinoloth",
  "stalker-of-baphomet",
  "yuan-ti-anathema",
  "angry-sorrowsworn",
  "dire-troll",
  "manshoon",
  "muiral",
]);

/// Nothing outside the source defect blocked batch 25 — no unknown source and no dictionary gate on
/// a creature whose statblock is otherwise full.
const BATCH_TWENTY_FIVE_BLOCKED_SLUGS = new Set<string>([]);

/// Same source defect, batch 26 (KR12.3 journal, 2026-08-21): seventeen empty statblocks over six
/// books, verified empty on the live aidedd page. `elder-brain` also cites the unknown type tag
/// "Mind Flayer", but the empty statblock already defers it, so no new question was filed.
const BATCH_TWENTY_SIX_DEFERRED_SLUGS = new Set([
  "neothelid",
  "spectral-cloud",
  "star-spawn-seer",
  "vajra-safahr",
  "wastrilith",
  "ancient-sea-serpent",
  "cadaver-collector",
  "crokek-toeck",
  "elder-brain",
  "fire-giant-dreadnought",
  "fury-of-kostchtchie",
  "githyanki-supreme-commander",
  "regisaur",
  "wersten-kern",
  "death-giant-shrouded-one",
  "fomorian-noble",
  "jarlaxle-baenre",
]);

/// Nothing outside the source defect blocked batch 26 — no unknown source and no dictionary gate on
/// a creature whose statblock is otherwise full.
const BATCH_TWENTY_SIX_BLOCKED_SLUGS = new Set<string>([]);

/// Same source defect, batch 27 (KR12.3 journal, 2026-08-21): eighteen empty statblocks over six
/// books, verified empty on the live aidedd page. `zargon-the-returner` also cites the unknown
/// source "Quests from the Infinite Staircase", but the empty statblock already defers it.
const BATCH_TWENTY_SEVEN_DEFERRED_SLUGS = new Set([
  "strahd-von-zarovich",
  "tempest-spirit",
  "githzerai-anarch",
  "hellfire-engine",
  "phoenix",
  "star-spawn-larva-mage",
  "steel-predator",
  "stone-giant-rockspeaker",
  "storm-giant-quintessent",
  "titivilus",
  "draconic-shard",
  "frost-giant-ice-shaper",
  "ghost-dragon",
  "storm-herald",
  "troll-amalgam",
  "zargon-the-returner",
  "ancient-deep-dragon",
  "fire-giant-forgecaller",
]);

/// `androsphinx` has a full statblock but cites the language "Sphinx", which `LanguageTranslations`
/// does not carry. The dictionary gate stays closed until the owner answers questions.md, so the
/// record costs batch 27 an entry — the same class as `grell` (15), `winter-wolf` (16) and its own
/// sibling `gynosphinx` (24).
const BATCH_TWENTY_SEVEN_BLOCKED_SLUGS = new Set<string>(["androsphinx"]);

/// Same source defect, batch 28 (KR12.3 journal, 2026-08-21): nineteen empty statblocks over five
/// books, verified empty on the live aidedd page. Four of them cite the unknown source "Princes of
/// the Apocalypse" and one the unknown type tag "Bard"; the empty statblock already defers all five.
const BATCH_TWENTY_EIGHT_DEFERRED_SLUGS = new Set([
  "hollow-dragon",
  "olhydra",
  "yan-c-bin",
  "ancient-crystal-dragon",
  "bael",
  "cloud-giant-destiny-gambler",
  "imix",
  "lord-soth",
  "flesh-colossus",
  "gigant",
  "iggwilv-the-witch-queen",
  "leviathan",
  "ogremoch",
  "storm-giant-tempest-caller",
  "ancient-emerald-dragon",
  "ancient-moonstone-dragon",
  "gargantua",
  "hutijin",
  "moloch",
]);

/// `sibriex` has a full statblock, but aidedd breaks the legendary-actions preamble across two
/// paragraphs and bolds its tail, so the parser reads "time and only at the end of another
/// creature's turn" as a fourth legendary action the creature does not have. Section lengths must
/// align, and the batch may not touch the parser, so filling the slot would mean inventing an
/// action — the record stays pending instead. A scan of all 934 cached pages finds this defect
/// exactly once.
const BATCH_TWENTY_EIGHT_BLOCKED_SLUGS = new Set<string>(["sibriex"]);

/// Same source defect, batch 29 (KR12.3 journal, 2026-08-21): twenty-one empty statblocks over five
/// books, verified empty on the live aidedd page. Three of them also carry a gate the batch cannot
/// close — the "Gem" type tag (`ancient-sapphire-dragon`) and the unknown sources "Candlekeep
/// Mysteries" (`miirym`) and "Dungeon of the Mad Mage" (`halaster-blackcloak`) — but the empty
/// statblock already defers all three, so none of them costs the batch a record.
const BATCH_TWENTY_NINE_DEFERRED_SLUGS = new Set([
  "molydeus",
  "runic-colossus",
  "ancient-sapphire-dragon",
  "cradle-of-the-hill-scion",
  "elder-brain-dragon",
  "geryon",
  "miirym",
  "scion-of-grolantor",
  "zaratan",
  "baphomet",
  "cradle-of-the-stone-scion",
  "elder-tempest",
  "fraz-urb-luu",
  "halaster-blackcloak",
  "scion-of-skoraeus",
  "zuggtmoy",
  "ancient-dragon-turtle",
  "cradle-of-the-frost-scion",
  "graz-zt",
  "scion-of-thrym",
  "yeenoghu",
]);

/// Nothing outside the source defect blocked batch 29 — every gate it met sat on a statblock the
/// defect already deferred.
const BATCH_TWENTY_NINE_BLOCKED_SLUGS = new Set<string>([]);

/// Same source defect, batch 30 (KR12.3 journal, 2026-08-21): twenty empty statblocks, verified
/// empty on the live aidedd page. Twelve of them also carry a gate the batch cannot close — the
/// unknown source "Extra (Chains of Asmodeus)" (ten archdevils) and the type tags "Inevitable"
/// (`marut`) and "Gem" (`gem-greatwyrm`) — but the empty statblock already defers all twelve, so
/// none of them costs the batch a record.
const BATCH_THIRTY_DEFERRED_SLUGS = new Set([
  "bel",
  "belial",
  "cradle-of-the-fire-scion",
  "fierna",
  "glasya",
  "marut",
  "scion-of-surtur",
  "baalzebul",
  "cradle-of-the-cloud-scion",
  "gem-greatwyrm",
  "levistus",
  "mammon",
  "scion-of-memnor",
  "chromatic-greatwyrm",
  "cradle-of-the-storm-scion",
  "dispater",
  "mephistopheles",
  "scion-of-stronmaus",
  "metallic-greatwyrm",
  "asmodeus",
]);

/// Nothing outside the source defect blocked batch 30 — every gate it met sat on a statblock the
/// defect already deferred.
const BATCH_THIRTY_BLOCKED_SLUGS = new Set<string>([]);

/// Batch 31 is the first of the whole goal with no "bare action name" source defect at all: every
/// one of its thirty pages carries a full statblock, because the queue reached the Tasha's summon
/// spirits, the Essentials Kit sidekicks and the class companions rather than a supplement bestiary.
const BATCH_THIRTY_ONE_DEFERRED_SLUGS = new Set<string>([]);

/// One row stays pending, and unlike every earlier "Gem" stumble it costs a full statblock:
/// `draconic-spirit` names the three dragon families inside its resistance line, and the third of
/// them is exactly the `creatureTypeTags` entry still queued in questions.md. Two are in the
/// dictionary (`chromatic`, `metallic`), the third is not, and writing it into the hand-authored
/// `fields.damageResistance` prose would answer the owner's open question on the batch's own
/// authority.
const BATCH_THIRTY_ONE_BLOCKED_SLUGS = new Set(["draconic-spirit"]);

/// Batch 32 is the tail of the queue — four rows, 934 = 31 × 30 + 4 — and, like batch 31, meets no
/// "bare action name" source defect: three Essentials Kit sidekicks and one Tasha's summon, all
/// with full statblocks.
const BATCH_THIRTY_TWO_DEFERRED_SLUGS = new Set<string>([]);

/// Nothing outside the source defect blocked batch 32 either: every field it had to write by hand
/// composes from terms the dictionary and the corpus already hold.
const BATCH_THIRTY_TWO_BLOCKED_SLUGS = new Set<string>([]);

/// Черга партій одноразова: рядок, який його партія лишила pending, назад у неї не повертається,
/// навіть коли причина відпала. Партії 33–34 — добірка: вони забрали всі 21 такий рядок після того,
/// як власник закрив словникові гейти (`gem`, `bard`, `inevitable`, мови `Grell`/`Winter Wolf`/
/// `Sphinx`), завів `HOMEBREW` і дозволив правку парсера для `sibriex`.
const GLEANED_BY_BATCHES_33_34 = new Set(
  [...batchThirtyThree, ...batchThirtyFour].map((entry) => entry.slug)
);

/// Тому в старих партіях тепер співіснують обидва стани: відкладене дефектом джерела лишається
/// pending, а те, що тримав словниковий гейт, уже translated.
/// Третій вихід із `pending`, відкритий партією 20: рядок закривається не перекладом і не
/// добіркою, а **іншим конвеєром**. По цих трьох слагах aidedd публікує лише збірну сторінку
/// без статблока, а 15 поіменних прадраконів приїхали з корпусу 5etools (книга FTD).
const COLLECTIVE_PAGES_COVERED_BY_5ETOOLS = new Set([
  "gem-greatwyrm",
  "chromatic-greatwyrm",
  "metallic-greatwyrm",
]);

const expectedStatusAfterGleaning = (slug: string) => {
  if (GLEANED_BY_BATCHES_33_34.has(slug)) return "translated";
  if (COLLECTIVE_PAGES_COVERED_BY_5ETOOLS.has(slug)) return "existing";
  return "pending";
};

const byNameEng = (list: CreatureData[]) =>
  new Map(list.map((creature) => [creature.nameEng, creature]));

describe("KR12.3 — маніфест партій імпорту 2014", () => {
  it("тримає рядок на кожну з 934 істот 2014, ID не перетинає діапазон 2024", () => {
    expect(manifest2014.length).toBe(934);
    expect(new Set(manifest2014.map((row) => row.slug)).size).toBe(manifest2014.length);
    expect(manifest2014.every((row) => row.edition === "RULES_2014")).toBe(true);
    expect(manifest2014.every((row) => row.creatureId < 20001)).toBe(true);
  });

  it("перевикористовує id наявного каталогу для 360 істот, що вже там були", () => {
    const reused = manifest2014.filter((row) => row.creatureId < FIRST_IMPORT_ID);
    const fresh = manifest2014.filter((row) => row.creatureId >= FIRST_IMPORT_ID);
    expect(reused.length).toBe(360);
    expect(fresh.length).toBe(574);
  });

  it("партія 1: 30 рядків у черзі, 14 відкладені дефектом джерела, 16 перекладені", () => {
    const batch1Rows = manifest2014.filter((row) => row.batch === 1);
    expect(batch1Rows.length).toBe(30);

    const deferred = batch1Rows.filter((row) => BATCH_ONE_DEFERRED_SLUGS.has(row.slug));
    const translated = batch1Rows.filter((row) => !BATCH_ONE_DEFERRED_SLUGS.has(row.slug));
    expect(deferred.length).toBe(14);
    expect(deferred.every((row) => row.status === expectedStatusAfterGleaning(row.slug))).toBe(true);
    expect(translated.length).toBe(16);
    expect(translated.every((row) => row.status === "translated")).toBe(true);
    expect(batchOne.length).toBe(16);
  });

  it("партія 2: 30 рядків у черзі, 12 відкладені (10 дефектом джерела, 2 прогалиною конвеєра), 18 перекладені", () => {
    const batch2Rows = manifest2014.filter((row) => row.batch === 2);
    expect(batch2Rows.length).toBe(30);

    const pending = new Set([...BATCH_TWO_DEFERRED_SLUGS, ...BATCH_TWO_BLOCKED_SLUGS]);
    const deferred = batch2Rows.filter((row) => pending.has(row.slug));
    const translated = batch2Rows.filter((row) => !pending.has(row.slug));
    expect(deferred.length).toBe(12);
    expect(deferred.every((row) => row.status === expectedStatusAfterGleaning(row.slug))).toBe(true);
    expect(translated.length).toBe(18);
    expect(translated.every((row) => row.status === "translated")).toBe(true);
    expect(batchTwo.length).toBe(18);
  });

  it("партія 3: 30 рядків у черзі, 4 відкладені дефектом джерела, 26 перекладені", () => {
    const batch3Rows = manifest2014.filter((row) => row.batch === 3);
    expect(batch3Rows.length).toBe(30);

    const deferred = batch3Rows.filter((row) => BATCH_THREE_DEFERRED_SLUGS.has(row.slug));
    const translated = batch3Rows.filter((row) => !BATCH_THREE_DEFERRED_SLUGS.has(row.slug));
    expect(deferred.length).toBe(4);
    expect(deferred.every((row) => row.status === expectedStatusAfterGleaning(row.slug))).toBe(true);
    expect(translated.length).toBe(26);
    expect(translated.every((row) => row.status === "translated")).toBe(true);
    expect(batchThree.length).toBe(26);
  });

  it("партія 4: 30 рядків у черзі, 3 відкладені дефектом джерела, 27 перекладені", () => {
    const batch4Rows = manifest2014.filter((row) => row.batch === 4);
    expect(batch4Rows.length).toBe(30);

    const deferred = batch4Rows.filter((row) => BATCH_FOUR_DEFERRED_SLUGS.has(row.slug));
    const translated = batch4Rows.filter((row) => !BATCH_FOUR_DEFERRED_SLUGS.has(row.slug));
    expect(deferred.length).toBe(3);
    expect(deferred.every((row) => row.status === expectedStatusAfterGleaning(row.slug))).toBe(true);
    expect(translated.length).toBe(27);
    expect(translated.every((row) => row.status === "translated")).toBe(true);
    expect(batchFour.length).toBe(27);
  });

  it("партія 5: 30 рядків у черзі, 5 відкладені (4 дефектом джерела, 1 прогалиною конвеєра), 25 перекладені", () => {
    const batch5Rows = manifest2014.filter((row) => row.batch === 5);
    expect(batch5Rows.length).toBe(30);

    const pending = new Set([...BATCH_FIVE_DEFERRED_SLUGS, ...BATCH_FIVE_BLOCKED_SLUGS]);
    const deferred = batch5Rows.filter((row) => pending.has(row.slug));
    const translated = batch5Rows.filter((row) => !pending.has(row.slug));
    expect(deferred.length).toBe(5);
    expect(deferred.every((row) => row.status === expectedStatusAfterGleaning(row.slug))).toBe(true);
    expect(translated.length).toBe(25);
    expect(translated.every((row) => row.status === "translated")).toBe(true);
    expect(batchFive.length).toBe(25);
  });

  it("партія 6: 30 рядків у черзі, 9 відкладені (6 дефектом джерела, 3 прогалиною конвеєра), 21 перекладені", () => {
    const batch6Rows = manifest2014.filter((row) => row.batch === 6);
    expect(batch6Rows.length).toBe(30);

    const pending = new Set([...BATCH_SIX_DEFERRED_SLUGS, ...BATCH_SIX_BLOCKED_SLUGS]);
    const deferred = batch6Rows.filter((row) => pending.has(row.slug));
    const translated = batch6Rows.filter((row) => !pending.has(row.slug));
    expect(deferred.length).toBe(9);
    expect(deferred.every((row) => row.status === expectedStatusAfterGleaning(row.slug))).toBe(true);
    expect(translated.length).toBe(21);
    expect(translated.every((row) => row.status === "translated")).toBe(true);
    expect(batchSix.length).toBe(21);
  });

  it("партія 7: 30 рядків у черзі, 8 відкладені (7 дефектом джерела, 1 прогалиною конвеєра), 22 перекладені", () => {
    const batch7Rows = manifest2014.filter((row) => row.batch === 7);
    expect(batch7Rows.length).toBe(30);

    const pending = new Set([...BATCH_SEVEN_DEFERRED_SLUGS, ...BATCH_SEVEN_BLOCKED_SLUGS]);
    const deferred = batch7Rows.filter((row) => pending.has(row.slug));
    const translated = batch7Rows.filter((row) => !pending.has(row.slug));
    expect(deferred.length).toBe(8);
    expect(deferred.every((row) => row.status === expectedStatusAfterGleaning(row.slug))).toBe(true);
    expect(translated.length).toBe(22);
    expect(translated.every((row) => row.status === "translated")).toBe(true);
    expect(batchSeven.length).toBe(22);
  });

  it("партія 8: 30 рядків у черзі, 7 відкладені (5 дефектом джерела, 2 прогалиною конвеєра), 23 перекладені", () => {
    const batch8Rows = manifest2014.filter((row) => row.batch === 8);
    expect(batch8Rows.length).toBe(30);

    const pending = new Set([...BATCH_EIGHT_DEFERRED_SLUGS, ...BATCH_EIGHT_BLOCKED_SLUGS]);
    const deferred = batch8Rows.filter((row) => pending.has(row.slug));
    const translated = batch8Rows.filter((row) => !pending.has(row.slug));
    expect(deferred.length).toBe(7);
    expect(deferred.every((row) => row.status === expectedStatusAfterGleaning(row.slug))).toBe(true);
    expect(translated.length).toBe(23);
    expect(translated.every((row) => row.status === "translated")).toBe(true);
    expect(batchEight.length).toBe(23);
  });

  it("партія 9: 30 рядків у черзі, 7 відкладені (6 дефектом джерела, 1 прогалиною конвеєра), 23 перекладені", () => {
    const batch9Rows = manifest2014.filter((row) => row.batch === 9);
    expect(batch9Rows.length).toBe(30);

    const pending = new Set([...BATCH_NINE_DEFERRED_SLUGS, ...BATCH_NINE_BLOCKED_SLUGS]);
    const deferred = batch9Rows.filter((row) => pending.has(row.slug));
    const translated = batch9Rows.filter((row) => !pending.has(row.slug));
    expect(deferred.length).toBe(7);
    expect(deferred.every((row) => row.status === expectedStatusAfterGleaning(row.slug))).toBe(true);
    expect(translated.length).toBe(23);
    expect(translated.every((row) => row.status === "translated")).toBe(true);
    expect(batchNine.length).toBe(23);
  });

  it("партія 10: 30 рядків у черзі, 11 відкладені (9 дефектом джерела, 2 прогалиною конвеєра), 19 перекладені", () => {
    const batch10Rows = manifest2014.filter((row) => row.batch === 10);
    expect(batch10Rows.length).toBe(30);

    const pending = new Set([...BATCH_TEN_DEFERRED_SLUGS, ...BATCH_TEN_BLOCKED_SLUGS]);
    const deferred = batch10Rows.filter((row) => pending.has(row.slug));
    const translated = batch10Rows.filter((row) => !pending.has(row.slug));
    expect(deferred.length).toBe(11);
    expect(deferred.every((row) => row.status === expectedStatusAfterGleaning(row.slug))).toBe(true);
    expect(translated.length).toBe(19);
    expect(translated.every((row) => row.status === "translated")).toBe(true);
    expect(batchTen.length).toBe(19);
  });

  it("партія 11: 30 рядків у черзі, 11 відкладені дефектом джерела, 19 перекладені", () => {
    const batch11Rows = manifest2014.filter((row) => row.batch === 11);
    expect(batch11Rows.length).toBe(30);

    const pending = new Set([...BATCH_ELEVEN_DEFERRED_SLUGS, ...BATCH_ELEVEN_BLOCKED_SLUGS]);
    const deferred = batch11Rows.filter((row) => pending.has(row.slug));
    const translated = batch11Rows.filter((row) => !pending.has(row.slug));
    expect(deferred.length).toBe(11);
    expect(deferred.every((row) => row.status === expectedStatusAfterGleaning(row.slug))).toBe(true);
    expect(translated.length).toBe(19);
    expect(translated.every((row) => row.status === "translated")).toBe(true);
    expect(batchEleven.length).toBe(19);
  });

  it("партія 12: 30 рядків у черзі, 4 відкладені дефектом джерела, 26 перекладені", () => {
    const batch12Rows = manifest2014.filter((row) => row.batch === 12);
    expect(batch12Rows.length).toBe(30);

    const pending = new Set([...BATCH_TWELVE_DEFERRED_SLUGS, ...BATCH_TWELVE_BLOCKED_SLUGS]);
    const deferred = batch12Rows.filter((row) => pending.has(row.slug));
    const translated = batch12Rows.filter((row) => !pending.has(row.slug));
    expect(deferred.length).toBe(4);
    expect(deferred.every((row) => row.status === expectedStatusAfterGleaning(row.slug))).toBe(true);
    expect(translated.length).toBe(26);
    expect(translated.every((row) => row.status === "translated")).toBe(true);
    expect(batchTwelve.length).toBe(26);
  });

  it("партія 13: 30 рядків у черзі, 9 відкладені (8 дефектом джерела, 1 джерелом поза enum), 21 перекладена", () => {
    const batch13Rows = manifest2014.filter((row) => row.batch === 13);
    expect(batch13Rows.length).toBe(30);

    const pending = new Set([...BATCH_THIRTEEN_DEFERRED_SLUGS, ...BATCH_THIRTEEN_BLOCKED_SLUGS]);
    const deferred = batch13Rows.filter((row) => pending.has(row.slug));
    const translated = batch13Rows.filter((row) => !pending.has(row.slug));
    expect(deferred.length).toBe(9);
    expect(deferred.every((row) => row.status === expectedStatusAfterGleaning(row.slug))).toBe(true);
    expect(translated.length).toBe(21);
    expect(translated.every((row) => row.status === "translated")).toBe(true);
    expect(batchThirteen.length).toBe(21);
  });

  it("партія 14: 30 рядків у черзі, 14 відкладені дефектом джерела, 16 перекладені", () => {
    const batch14Rows = manifest2014.filter((row) => row.batch === 14);
    expect(batch14Rows.length).toBe(30);

    const pending = new Set([...BATCH_FOURTEEN_DEFERRED_SLUGS, ...BATCH_FOURTEEN_BLOCKED_SLUGS]);
    const deferred = batch14Rows.filter((row) => pending.has(row.slug));
    const translated = batch14Rows.filter((row) => !pending.has(row.slug));
    expect(deferred.length).toBe(14);
    expect(deferred.every((row) => row.status === expectedStatusAfterGleaning(row.slug))).toBe(true);
    expect(translated.length).toBe(16);
    expect(translated.every((row) => row.status === "translated")).toBe(true);
    expect(batchFourteen.length).toBe(16);
  });

  it("партія 15: 30 рядків у черзі, 8 відкладені (7 дефектом джерела, 1 словниковим гейтом), 22 перекладені", () => {
    const batch15Rows = manifest2014.filter((row) => row.batch === 15);
    expect(batch15Rows.length).toBe(30);

    const pending = new Set([...BATCH_FIFTEEN_DEFERRED_SLUGS, ...BATCH_FIFTEEN_BLOCKED_SLUGS]);
    const deferred = batch15Rows.filter((row) => pending.has(row.slug));
    const translated = batch15Rows.filter((row) => !pending.has(row.slug));
    expect(deferred.length).toBe(8);
    expect(deferred.every((row) => row.status === expectedStatusAfterGleaning(row.slug))).toBe(true);
    expect(translated.length).toBe(22);
    expect(translated.every((row) => row.status === "translated")).toBe(true);
    expect(batchFifteen.length).toBe(22);
  });

  it("партія 16: 30 рядків у черзі, 10 відкладені (8 дефектом джерела, 1 словниковим гейтом, 1 прогалиною конвеєра), 20 перекладені", () => {
    const batch16Rows = manifest2014.filter((row) => row.batch === 16);
    expect(batch16Rows.length).toBe(30);

    const pending = new Set([...BATCH_SIXTEEN_DEFERRED_SLUGS, ...BATCH_SIXTEEN_BLOCKED_SLUGS]);
    const deferred = batch16Rows.filter((row) => pending.has(row.slug));
    const translated = batch16Rows.filter((row) => !pending.has(row.slug));
    expect(deferred.length).toBe(10);
    expect(deferred.every((row) => row.status === expectedStatusAfterGleaning(row.slug))).toBe(true);
    expect(translated.length).toBe(20);
    expect(translated.every((row) => row.status === "translated")).toBe(true);
    expect(batchSixteen.length).toBe(20);
  });

  it("партія 17: 30 рядків у черзі, 10 відкладені дефектом джерела, 20 перекладені", () => {
    const batch17Rows = manifest2014.filter((row) => row.batch === 17);
    expect(batch17Rows.length).toBe(30);

    const pending = new Set([...BATCH_SEVENTEEN_DEFERRED_SLUGS, ...BATCH_SEVENTEEN_BLOCKED_SLUGS]);
    const deferred = batch17Rows.filter((row) => pending.has(row.slug));
    const translated = batch17Rows.filter((row) => !pending.has(row.slug));
    expect(deferred.length).toBe(10);
    expect(deferred.every((row) => row.status === expectedStatusAfterGleaning(row.slug))).toBe(true);
    expect(translated.length).toBe(20);
    expect(translated.every((row) => row.status === "translated")).toBe(true);
    expect(batchSeventeen.length).toBe(20);
  });

  it("партія 18: 30 рядків у черзі, 9 відкладені дефектом джерела, 21 перекладена", () => {
    const batch18Rows = manifest2014.filter((row) => row.batch === 18);
    expect(batch18Rows.length).toBe(30);

    const pending = new Set([...BATCH_EIGHTEEN_DEFERRED_SLUGS, ...BATCH_EIGHTEEN_BLOCKED_SLUGS]);
    const deferred = batch18Rows.filter((row) => pending.has(row.slug));
    const translated = batch18Rows.filter((row) => !pending.has(row.slug));
    expect(deferred.length).toBe(9);
    expect(deferred.every((row) => row.status === expectedStatusAfterGleaning(row.slug))).toBe(true);
    expect(translated.length).toBe(21);
    expect(translated.every((row) => row.status === "translated")).toBe(true);
    expect(batchEighteen.length).toBe(21);
  });

  it("партія 19: 30 рядків у черзі, 10 відкладені дефектом джерела, 20 перекладені", () => {
    const batch19Rows = manifest2014.filter((row) => row.batch === 19);
    expect(batch19Rows.length).toBe(30);

    const pending = new Set([...BATCH_NINETEEN_DEFERRED_SLUGS, ...BATCH_NINETEEN_BLOCKED_SLUGS]);
    const deferred = batch19Rows.filter((row) => pending.has(row.slug));
    const translated = batch19Rows.filter((row) => !pending.has(row.slug));
    expect(deferred.length).toBe(10);
    expect(deferred.every((row) => row.status === expectedStatusAfterGleaning(row.slug))).toBe(true);
    expect(translated.length).toBe(20);
    expect(translated.every((row) => row.status === "translated")).toBe(true);
    expect(batchNineteen.length).toBe(20);
  });

  it("партія 20: 30 рядків у черзі, 12 відкладені (11 дефектом джерела, 1 джерелом поза enum), 18 перекладені", () => {
    const batch20Rows = manifest2014.filter((row) => row.batch === 20);
    expect(batch20Rows.length).toBe(30);

    const pending = new Set([...BATCH_TWENTY_DEFERRED_SLUGS, ...BATCH_TWENTY_BLOCKED_SLUGS]);
    const deferred = batch20Rows.filter((row) => pending.has(row.slug));
    const translated = batch20Rows.filter((row) => !pending.has(row.slug));
    expect(deferred.length).toBe(12);
    expect(deferred.every((row) => row.status === expectedStatusAfterGleaning(row.slug))).toBe(true);
    expect(translated.length).toBe(18);
    expect(translated.every((row) => row.status === "translated")).toBe(true);
    expect(batchTwenty.length).toBe(18);
  });

  it("партія 21: 30 рядків у черзі, 15 відкладені дефектом джерела, 15 перекладені", () => {
    const batch21Rows = manifest2014.filter((row) => row.batch === 21);
    expect(batch21Rows.length).toBe(30);

    const pending = new Set([
      ...BATCH_TWENTY_ONE_DEFERRED_SLUGS,
      ...BATCH_TWENTY_ONE_BLOCKED_SLUGS,
    ]);
    const deferred = batch21Rows.filter((row) => pending.has(row.slug));
    const translated = batch21Rows.filter((row) => !pending.has(row.slug));
    expect(deferred.length).toBe(15);
    expect(deferred.every((row) => row.status === expectedStatusAfterGleaning(row.slug))).toBe(true);
    expect(translated.length).toBe(15);
    expect(translated.every((row) => row.status === "translated")).toBe(true);
    expect(batchTwentyOne.length).toBe(15);
  });

  it("партія 22: 30 рядків у черзі, 11 відкладені дефектом джерела, 19 перекладені", () => {
    const batch22Rows = manifest2014.filter((row) => row.batch === 22);
    expect(batch22Rows.length).toBe(30);

    const pending = new Set([
      ...BATCH_TWENTY_TWO_DEFERRED_SLUGS,
      ...BATCH_TWENTY_TWO_BLOCKED_SLUGS,
    ]);
    const deferred = batch22Rows.filter((row) => pending.has(row.slug));
    const translated = batch22Rows.filter((row) => !pending.has(row.slug));
    expect(deferred.length).toBe(11);
    expect(deferred.every((row) => row.status === expectedStatusAfterGleaning(row.slug))).toBe(true);
    expect(translated.length).toBe(19);
    expect(translated.every((row) => row.status === "translated")).toBe(true);
    expect(batchTwentyTwo.length).toBe(19);
  });

  it("партія 23: 30 рядків у черзі, 17 відкладені дефектом джерела, 13 перекладені", () => {
    const batch23Rows = manifest2014.filter((row) => row.batch === 23);
    expect(batch23Rows.length).toBe(30);

    const pending = new Set([
      ...BATCH_TWENTY_THREE_DEFERRED_SLUGS,
      ...BATCH_TWENTY_THREE_BLOCKED_SLUGS,
    ]);
    const deferred = batch23Rows.filter((row) => pending.has(row.slug));
    const translated = batch23Rows.filter((row) => !pending.has(row.slug));
    expect(deferred.length).toBe(17);
    expect(deferred.every((row) => row.status === expectedStatusAfterGleaning(row.slug))).toBe(true);
    expect(translated.length).toBe(13);
    expect(translated.every((row) => row.status === "translated")).toBe(true);
    expect(batchTwentyThree.length).toBe(13);
  });

  it("партія 24: 30 рядків у черзі, 15 відкладені (14 дефектом джерела, 1 словниковим гейтом), 15 перекладені", () => {
    const batch24Rows = manifest2014.filter((row) => row.batch === 24);
    expect(batch24Rows.length).toBe(30);

    const pending = new Set([
      ...BATCH_TWENTY_FOUR_DEFERRED_SLUGS,
      ...BATCH_TWENTY_FOUR_BLOCKED_SLUGS,
    ]);
    const deferred = batch24Rows.filter((row) => pending.has(row.slug));
    const translated = batch24Rows.filter((row) => !pending.has(row.slug));
    expect(deferred.length).toBe(15);
    expect(deferred.every((row) => row.status === expectedStatusAfterGleaning(row.slug))).toBe(true);
    expect(translated.length).toBe(15);
    expect(translated.every((row) => row.status === "translated")).toBe(true);
    expect(batchTwentyFour.length).toBe(15);
  });

  it("партія 25: 30 рядків у черзі, 15 відкладені дефектом джерела, 15 перекладені", () => {
    const batch25Rows = manifest2014.filter((row) => row.batch === 25);
    expect(batch25Rows.length).toBe(30);

    const pending = new Set([
      ...BATCH_TWENTY_FIVE_DEFERRED_SLUGS,
      ...BATCH_TWENTY_FIVE_BLOCKED_SLUGS,
    ]);
    const deferred = batch25Rows.filter((row) => pending.has(row.slug));
    const translated = batch25Rows.filter((row) => !pending.has(row.slug));
    expect(deferred.length).toBe(15);
    expect(deferred.every((row) => row.status === expectedStatusAfterGleaning(row.slug))).toBe(true);
    expect(translated.length).toBe(15);
    expect(translated.every((row) => row.status === "translated")).toBe(true);
    expect(batchTwentyFive.length).toBe(15);
  });

  it("партія 26: 30 рядків у черзі, 17 відкладені дефектом джерела, 13 перекладені", () => {
    const batch26Rows = manifest2014.filter((row) => row.batch === 26);
    expect(batch26Rows.length).toBe(30);

    const pending = new Set([
      ...BATCH_TWENTY_SIX_DEFERRED_SLUGS,
      ...BATCH_TWENTY_SIX_BLOCKED_SLUGS,
    ]);
    const deferred = batch26Rows.filter((row) => pending.has(row.slug));
    const translated = batch26Rows.filter((row) => !pending.has(row.slug));
    expect(deferred.length).toBe(17);
    expect(deferred.every((row) => row.status === expectedStatusAfterGleaning(row.slug))).toBe(true);
    expect(translated.length).toBe(13);
    expect(translated.every((row) => row.status === "translated")).toBe(true);
    expect(batchTwentySix.length).toBe(13);
  });

  it("партія 27: 30 рядків у черзі, 19 відкладені (18 дефектом джерела, 1 словниковим гейтом), 11 перекладені", () => {
    const batch27Rows = manifest2014.filter((row) => row.batch === 27);
    expect(batch27Rows.length).toBe(30);

    const pending = new Set([
      ...BATCH_TWENTY_SEVEN_DEFERRED_SLUGS,
      ...BATCH_TWENTY_SEVEN_BLOCKED_SLUGS,
    ]);
    const deferred = batch27Rows.filter((row) => pending.has(row.slug));
    const translated = batch27Rows.filter((row) => !pending.has(row.slug));
    expect(deferred.length).toBe(19);
    expect(deferred.every((row) => row.status === expectedStatusAfterGleaning(row.slug))).toBe(true);
    expect(translated.length).toBe(11);
    expect(translated.every((row) => row.status === "translated")).toBe(true);
    expect(batchTwentySeven.length).toBe(11);
  });

  it("партія 28: 30 рядків у черзі, 20 відкладені (19 дефектом джерела, 1 дефектом преамбули), 10 перекладені", () => {
    const batch28Rows = manifest2014.filter((row) => row.batch === 28);
    expect(batch28Rows.length).toBe(30);

    const pending = new Set([
      ...BATCH_TWENTY_EIGHT_DEFERRED_SLUGS,
      ...BATCH_TWENTY_EIGHT_BLOCKED_SLUGS,
    ]);
    const deferred = batch28Rows.filter((row) => pending.has(row.slug));
    const translated = batch28Rows.filter((row) => !pending.has(row.slug));
    expect(deferred.length).toBe(20);
    expect(deferred.every((row) => row.status === expectedStatusAfterGleaning(row.slug))).toBe(true);
    expect(translated.length).toBe(10);
    expect(translated.every((row) => row.status === "translated")).toBe(true);
    expect(batchTwentyEight.length).toBe(10);
  });

  it("партія 29: 30 рядків у черзі, 21 відкладений дефектом джерела, 9 перекладені", () => {
    const batch29Rows = manifest2014.filter((row) => row.batch === 29);
    expect(batch29Rows.length).toBe(30);

    const pending = new Set([
      ...BATCH_TWENTY_NINE_DEFERRED_SLUGS,
      ...BATCH_TWENTY_NINE_BLOCKED_SLUGS,
    ]);
    const deferred = batch29Rows.filter((row) => pending.has(row.slug));
    const translated = batch29Rows.filter((row) => !pending.has(row.slug));
    expect(deferred.length).toBe(21);
    expect(deferred.every((row) => row.status === expectedStatusAfterGleaning(row.slug))).toBe(true);
    expect(translated.length).toBe(9);
    expect(translated.every((row) => row.status === "translated")).toBe(true);
    expect(batchTwentyNine.length).toBe(9);
  });

  it("партія 30: 30 рядків у черзі, 20 відкладені дефектом джерела, 10 перекладені", () => {
    const batch30Rows = manifest2014.filter((row) => row.batch === 30);
    expect(batch30Rows.length).toBe(30);

    const pending = new Set([...BATCH_THIRTY_DEFERRED_SLUGS, ...BATCH_THIRTY_BLOCKED_SLUGS]);
    const deferred = batch30Rows.filter((row) => pending.has(row.slug));
    const translated = batch30Rows.filter((row) => !pending.has(row.slug));
    expect(deferred.length).toBe(20);
    expect(deferred.every((row) => row.status === expectedStatusAfterGleaning(row.slug))).toBe(true);
    expect(translated.length).toBe(10);
    expect(translated.every((row) => row.status === "translated")).toBe(true);
    expect(batchThirty.length).toBe(10);
  });

  it("партія 31: 30 рядків у черзі, 1 заблокований словниковим гейтом, 29 перекладені", () => {
    const batch31Rows = manifest2014.filter((row) => row.batch === 31);
    expect(batch31Rows.length).toBe(30);

    const pending = new Set([
      ...BATCH_THIRTY_ONE_DEFERRED_SLUGS,
      ...BATCH_THIRTY_ONE_BLOCKED_SLUGS,
    ]);
    const deferred = batch31Rows.filter((row) => pending.has(row.slug));
    const translated = batch31Rows.filter((row) => !pending.has(row.slug));
    expect(deferred.length).toBe(1);
    expect(deferred.every((row) => row.status === expectedStatusAfterGleaning(row.slug))).toBe(true);
    expect(translated.length).toBe(29);
    expect(translated.every((row) => row.status === "translated")).toBe(true);
    expect(batchThirtyOne.length).toBe(29);
  });

  it("партія 32: 4 рядки — хвіст черги, жодного відкладеного, всі перекладені", () => {
    const batch32Rows = manifest2014.filter((row) => row.batch === 32);
    expect(batch32Rows.length).toBe(4);

    const pending = new Set([
      ...BATCH_THIRTY_TWO_DEFERRED_SLUGS,
      ...BATCH_THIRTY_TWO_BLOCKED_SLUGS,
    ]);
    const translated = batch32Rows.filter((row) => !pending.has(row.slug));
    expect(translated.length).toBe(4);
    expect(translated.every((row) => row.status === "translated")).toBe(true);
    expect(batchThirtyTwo.length).toBe(4);
    expect(Math.max(...manifest2014.map((row) => row.batch))).toBe(32);
  });
});

describe("KR12.3 — добірка партій 33–34 у зібраному каталозі 2014", () => {
  const catalog = byNameEng(getAllCreatures("RULES_2014"));
  const gleaned = [...batchThirtyThree, ...batchThirtyFour];
  const readParsed = (slug: string) =>
    parseMonster2014(
      readFileSync(`data/aidedd/raw/monsters-2014/${slug}.html`, "utf-8"),
      slug
    );

  it("закриває рівно те, що блокували старі партії: множини збігаються, 21 слаг", () => {
    const blockedByEarlierBatches = new Set([
      ...BATCH_TWO_BLOCKED_SLUGS,
      ...BATCH_FIVE_BLOCKED_SLUGS,
      ...BATCH_SIX_BLOCKED_SLUGS,
      ...BATCH_SEVEN_BLOCKED_SLUGS,
      ...BATCH_EIGHT_BLOCKED_SLUGS,
      ...BATCH_NINE_BLOCKED_SLUGS,
      ...BATCH_TEN_BLOCKED_SLUGS,
      ...BATCH_ELEVEN_BLOCKED_SLUGS,
      ...BATCH_TWELVE_BLOCKED_SLUGS,
      ...BATCH_THIRTEEN_BLOCKED_SLUGS,
      ...BATCH_FOURTEEN_BLOCKED_SLUGS,
      ...BATCH_FIFTEEN_BLOCKED_SLUGS,
      ...BATCH_SIXTEEN_BLOCKED_SLUGS,
      ...BATCH_SEVENTEEN_BLOCKED_SLUGS,
      ...BATCH_EIGHTEEN_BLOCKED_SLUGS,
      ...BATCH_NINETEEN_BLOCKED_SLUGS,
      ...BATCH_TWENTY_BLOCKED_SLUGS,
      ...BATCH_TWENTY_ONE_BLOCKED_SLUGS,
      ...BATCH_TWENTY_TWO_BLOCKED_SLUGS,
      ...BATCH_TWENTY_THREE_BLOCKED_SLUGS,
      ...BATCH_TWENTY_FOUR_BLOCKED_SLUGS,
      ...BATCH_TWENTY_FIVE_BLOCKED_SLUGS,
      ...BATCH_TWENTY_SIX_BLOCKED_SLUGS,
      ...BATCH_TWENTY_SEVEN_BLOCKED_SLUGS,
      ...BATCH_TWENTY_EIGHT_BLOCKED_SLUGS,
      ...BATCH_TWENTY_NINE_BLOCKED_SLUGS,
      ...BATCH_THIRTY_BLOCKED_SLUGS,
      ...BATCH_THIRTY_ONE_BLOCKED_SLUGS,
      ...BATCH_THIRTY_TWO_BLOCKED_SLUGS,
    ]);
    expect(GLEANED_BY_BATCHES_33_34).toEqual(blockedByEarlierBatches);
    expect(GLEANED_BY_BATCHES_33_34.size).toBe(21);
    expect(batchThirtyThree.length).toBe(16);
    expect(batchThirtyFour.length).toBe(5);
  });

  it("кожна істота добірки має українську назву, дії й id зі свого рядка маніфесту", () => {
    for (const entry of gleaned) {
      const row = manifest2014.find((r) => r.slug === entry.slug);
      expect(row?.status).toBe("translated");
      const creature = catalog.get(row!.nameEng);
      expect(creature, `${row!.nameEng} відсутня в каталозі`).toBeDefined();
      expect(creature!.creatureId).toBe(row!.creatureId);
      expect(creature!.ruleset).toBe("RULES_2014");
      expect(creature!.name).toMatch(/[Ѐ-ӿ]/);
      expect(creature!.actions).toMatch(/[Ѐ-ӿ]/);
    }
  });

  it("жоден рядок добірки не має порожнього статблока — дефекту джерела в ній немає", () => {
    for (const entry of gleaned) {
      const parsed = readParsed(entry.slug);
      const entries =
        parsed.traits.length +
        parsed.actions.length +
        parsed.bonusActions.length +
        parsed.reactions.length +
        parsed.legendaryActions.length;
      expect(entries, `${entry.slug} має порожній статблок`).toBeGreaterThan(0);
    }
  });

  it("тримає fields-обходи мов: три стихійні мови й французьке «Commun» джерела", () => {
    expect(catalog.get("Minor Air Elemental")?.languages).toBe(
      "розуміє Авранську, але не може говорити"
    );
    expect(catalog.get("Minor Water Elemental")?.languages).toBe(
      "розуміє Акванську, але не може говорити"
    );
    expect(catalog.get("Minor Earth Elemental")?.languages).toBe(
      "розуміє Терранську, але не може говорити"
    );
    expect(readParsed("mummified-warrior").languages).toBe("understands Commun but can't speak");
    expect(catalog.get("Mummified Warrior")?.languages).toBe(
      "розуміє Загальну, але не може говорити"
    );
    expect(LanguageTranslations.AURAN).toBe("Авранська");
    expect(LanguageTranslations.GRELL).toBe("Ґреллівська");
    expect(LanguageTranslations.SPHINX).toBe("Сфінксова");
    expect(LanguageTranslations.WINTER_WOLF).toBe("Мова зимових вовків");
  });

  it("тримає fields-обходи КЗ там, де джерело друкує одрук і британське написання", () => {
    expect(readParsed("minor-earth-elemental").ac).toBe("15 (natural qrmor)");
    expect(readParsed("devilroot").ac).toBe("15 (natural armour)");
    expect(catalog.get("Minor Earth Elemental")?.ac).toBe("15 (природний обладунок)");
    expect(catalog.get("Devilroot")?.ac).toBe("15 (природний обладунок)");
  });

  it("тримає fields-обходи чуття, навичок і швидкості, які конвертер лишав англійськими", () => {
    for (const nameEng of ["Grell", "Devilroot"]) {
      expect(catalog.get(nameEng)?.senses).toContain("сліпий за межами цього радіусу");
      expect(catalog.get(nameEng)?.senses).not.toMatch(/[A-Za-z]{3}/);
    }
    for (const nameEng of ["Ancient Shadow", "Venerable Shadow"]) {
      expect(catalog.get(nameEng)?.skills).toBe("Непомітність +5 (+7 у тьмяному світлі чи темряві)");
    }
    expect(catalog.get("Minor Earth Elemental")?.speed).toBe(
      "10 фт. (30 фт., коли рухається вниз схилом), риття 30 фт."
    );
  });

  it("тримає fields-обходи духів: КЗ, хіти з Кубиками Здоровʼя і три родини драконів у резисті", () => {
    expect(catalog.get("Aberrant Spirit")?.ac).toBe("11 + рівень заклинання (природний обладунок)");
    expect(catalog.get("Draconic Spirit")?.hp).toBe(
      "50 + 10 за кожен рівень заклинання, вищий за 5 (дракон має стільки Кубиків Здоровʼя [к10], скільки рівень заклинання)"
    );
    expect(catalog.get("Draconic Spirit")?.damageResistance).toContain(
      "(тільки Хроматичний і Металевий)"
    );
    expect(catalog.get("Draconic Spirit")?.damageResistance).toContain("(тільки Самоцвітний)");
    expect(catalog.get("Draconic Spirit")?.damageResistance).not.toMatch(/[A-Za-z]{3}/);
  });

  it("дописує пʼять списків заклинань, яких не бачить парсер", () => {
    expect(catalog.get("Yuan-ti Malison")?.specialAbilities).toContain(
      "Дружба з тваринами [Animal friendship] (лише на зміях)"
    );
    expect(catalog.get("Gynosphinx")?.specialAbilities).toContain(
      "5 рівень (1 слот): Знання легенд [Legend Lore]"
    );
    expect(catalog.get("Androsphinx")?.specialAbilities).toContain(
      "6 рівень (1 слот): Бенкет героїв [Heroes' Feast]"
    );
    expect(catalog.get("Sibriex")?.actions).toContain("1 раз на день: Слабоумство [Feeblemind]");
    expect(catalog.get("Alustriel Silverhand")?.actions).toContain(
      "Зупинка часу [Time Stop]"
    );
  });

  it("правка парсера: три секції Actions малісона дають 11 дій замість останніх 5", () => {
    const actions = catalog.get("Yuan-ti Malison")?.actions ?? "";
    expect((actions.match(/<b>/g) ?? []).length).toBe(11);
    for (const type of [1, 2, 3]) {
      expect(actions).toContain(`<b>Мультиатака{{Multiattack}} (Тип ${type}, лише в подобі юань-ті).</b>`);
    }
    expect(actions).toContain("<b>Здавлювання{{Constrict}} (Тип 3).</b>");
    expect(catalog.get("Yuan-ti Malison")?.specialAbilities).toContain(
      "Тип 1: людське тіло зі зміїною головою"
    );
  });

  it("правка парсера зачіпає рівно одну сторінку корпусу 2014", () => {
    const repeated = manifest2014.filter((row) => {
      const html = readFileSync(`data/aidedd/raw/monsters-2014/${row.slug}.html`, "utf-8");
      const titles = [...html.matchAll(/<div class='rub'>([\s\S]*?)<\/div>/gi)].map((match) =>
        match[1].replace(/<[^>]*>/g, "").trim().toLowerCase()
      );
      return new Set(titles).size !== titles.length;
    });
    expect(repeated.map((row) => row.slug)).toEqual(["yuan-ti-malison"]);
  });

  it("словник розводить двійників: `Aberrant Spirit` — Абераційний дух, а не спадковий Дух аберації", () => {
    expect(catalog.get("Aberrant Spirit")?.name).toBe("Абераційний дух");
    expect(catalog.get("Aberration Spirit")?.name).toBe("Дух аберації");
    const list = getAllCreatures("RULES_2014");
    expect(new Set(list.map((creature) => creature.name)).size).toBe(list.length);
  });

  it("бере джерела добірки з наявних значень enum, зокрема HOMEBREW для «Extra (AideDD)»", () => {
    expect(findSourceKey2014("Extra (AideDD)")).toBe("HOMEBREW");
    expect(catalog.get("Devilroot")?.source).toBe("HOMEBREW");
    expect(catalog.get("Minor Air Elemental")?.source).toBe("DDB");
    expect(catalog.get("Rothé")?.source).toBe("AL");
    expect(catalog.get("Alustriel Silverhand")?.source).toBe("VEOR");
    expect(catalog.get("Draconic Spirit")?.source).toBe("FTOD");
    expect(catalog.get("Sibriex")?.source).toBe("MPMM");
  });

  it("три перевикористані id замінюють спадкові записи, а не додаються до них", () => {
    const list = getAllCreatures("RULES_2014");
    // Партія 1 KR16.3 додала 17 істот із 5etools і заступила три спадкові записи
    // (Gnoll Witherling, Oblex Spawn, Young Kruthik), тобто 687 → 704.
    // Партія 2 додала 18 і заступила два (Gnoll Flesh Gnawer, Maw Demon), тобто 704 → 722.
    // Партія 3 додала 16 і заступила чотири (Adult Kruthik, Crystal Dragon Wyrmling,
    // Dragonnel, Emerald Dragon Wyrmling), тобто 722 → 738.
    // Партія 4 додала 18 і заступила два (Shadow Mastiff, Topaz Dragon Wyrmling), тобто
    // 738 → 756. Двадцятий рядок партії — `Uthgardt Shaman` — спершу було відкладено з
    // названим словниковим blocker-ом (мова `Bothii`); власник ратифікував «Ботійську» того
    // ж дня (питання 26), і запис поїхав у каталог разом із партією.
    // 756 → 773: партія 5 привела 17 нових і заступила три спадкові записи
    // (Hobgoblin Devastator, Sapphire Dragon Wyrmling, Amethyst Dragon Wyrmling).
    // 773 → 787: партія 6 привела 14 нових і заступила шість спадкових записів — найбільше з
    // усіх партій (Yuan-ti Mind Whisperer, Yuan-ti Nightmare Speaker, Adult Oblex,
    // Kruthik Hive Lord, Mindwitness, Spawn of Kyuss).
    // 787 → 804: партія 7 привела 17 нових і заступила один спадковий запис
    // (`Young Crystal Dragon` — ПС 6 і 2 300 XP замість 5 і 1 800). Два рядки партії
    // відкладено з названими словниковими blocker-ами: `Tlincalli` (мова) і
    // `Mouth of Grolantor` (тег типу «hill giant») — питання 28 і 29.
    // 804 → 821: партія 8 привела 17 нових і заступила три спадкові записи
    // (`Korred`, `Shadar-kai Shadow Dancer`, `Young Topaz Dragon`). Blocker-ів партія 8 не
    // мала — усі реєстри, яких вона торкнулася, виявилися заповненими.
    // 821 → 823: власник ратифікував обидва терміни, на яких стояла партія 7
    // (питання 28 і 29), і `Tlincalli` (847) та `Mouth of Grolantor` (873) доїхали в каталог.
    // `EXPECTED_BLOCKERS` знову порожній.
    // 823 → 835: партія 9 привела 12 нових і заступила шість спадкових записів
    // (`Eyedrake`, `Hoard Mimic`, `Young Emerald Dragon`, `Young Sapphire Dragon`,
    // `Young Amethyst Dragon`, `Shadar-kai Gloom Weaver`). Два рядки партії відкладено з
    // названим blocker-ом: `Ulitharid` і `Alhoon` несуть тег типу «mind flayer» — питання 30.
    // 835 → 851: партія 10 привела 16 нових і заступила чотири спадкові записи
    // (`Autumn Eladrin`, `Elder Oblex`, `Githyanki Gish`, `Githzerai Enlightened`).
    // Blocker-ів партія 10 не мала — усі реєстри, яких вона торкнулася, виявилися заповненими.
    // 851 → 866: партія 11 привела 15 нових і заступила пʼять спадкових записів
    // (`Shadar-kai Soul Monger`, `Adult Crystal Dragon`, `Githyanki Kith'rak`,
    // `Yuan-ti Anathema`, `Adult Topaz Dragon`). Приріст 15, а не 20, бо `Githyanki Kith'rak`
    // прийшов у маніфесті під id 967, тоді як каталог тримав його під 549; рядок плану
    // перепіновано на 549, інакше в каталозі стояли б два записи з однією назвою.
    // Blocker-ів партія 11 не мала.
    // Партія 12 KR16.3: +17 нових і 2 заступлені спадкові записи (`Adult Emerald Dragon`
    // 491, `Githyanki Supreme Commander` 550). `Wersten Kern` (998) відкладено з названим
    // blocker-ом — мова `Solamnic` поза реєстром `LanguageTranslations`.
    // Партія 13 KR16.3: +17 нових і 3 заступлені спадкові записи (`Adult Sapphire Dragon` 495,
    // `Adult Amethyst Dragon` 499, `Githzerai Anarch` 553). У двох перших спадковий запис ніс
    // показник небезпеки й досвід, зсунуті рівно на один щабель униз (14/11 500 замість
    // 15/13 000 і 15/13 000 замість 16/15 000) — узгоджено між собою, тож перевірка [7] їх
    // не бачила. Blocker-ів партія 13 не мала.
    // 900 → 918: партія 14 KR16.3 привела 17 нових і заступила три спадкові записи
    // (`Ancient Crystal Dragon` 484, `Ancient Topaz Dragon` 488, `Ancient Emerald Dragon` 492),
    // плюс `Wersten Kern` 998 — рядок партії 12, розблокований ратифікацією «Соламнійської»
    // (питання 34). В `Ancient Emerald Dragon` спадковий запис ніс показник небезпеки й досвід,
    // зсунуті на два щаблі вгору (23/50 000 замість 21/33 000) — узгоджено між собою, тож
    // перевірка [7] його не бачила. Blocker-ів партія 14 не мала.
    // 918 → 935: партія 15 KR16.3 привела 17 нових і заступила три спадкові записи
    // (`Ancient Sapphire Dragon` 496, `Ancient Amethyst Dragon` 500, `Elder Brain Dragon` 504).
    // Blocker-ів партія 15 не мала — жодного терміна закритого реєстру в ній не бракує.
    // 935 → 955: партія 16 KR16.3 привела 20 нових записів і **не заступила жодного** —
    // перша партія без заступлених за всі шістнадцять. Позаписний diff проти зрізу, знятого
    // до партії: додано 20, видалено 0, змінено 0. Blocker-ів партія 16 не мала.
    // 955 → 959: партія 17 KR16.3 — хвіст черги 2014. Записів чотири, а не двадцять, бо
    // pending-рядків із повним статблоком у корпусі стільки й лишалося: три «Greatwyrm»
    // маніфесту 5etools розписує по кольорах, а `Ranimated Companion` — помилка назви.
    // Заступлених знову жодного. Позаписний diff проти зрізу, знятого до партії: додано 4,
    // видалено 0, змінено 0. Blocker-ів партія 17 не мала — усі шість закритих реєстрів,
    // яких вона торкнулася, заповнені.
    // 959 → 974: партія 20 KR16.3 — 15 поіменних прадраконів книги FTD. Це перша партія, чиї
    // рядки не походять із маніфесту aidedd: він дає три збірні сторінки `*-greatwyrm` без
    // статблоків, а корпус 5etools тримає всі пʼятнадцять. Заступлених жодного; позаписний
    // diff проти зрізу, знятого до партії: додано 15, видалено 0, змінено 0.
    expect(list.length).toBe(974);
    for (const [creatureId, nameEng] of [
      [159, "Winter Wolf"],
      [292, "Gynosphinx"],
      [372, "Yuan-ti Malison"],
    ] as Array<[number, string]>) {
      expect(list.filter((creature) => creature.creatureId === creatureId).length).toBe(1);
      expect(catalog.get(nameEng)?.creatureId).toBe(creatureId);
    }
  });

  it("після добірки 2014 має 607 перекладених, 324 pending і 3 закриті 5etools", () => {
    expect(manifest2014.filter((row) => row.status === "translated").length).toBe(607);
    const pending = manifest2014.filter((row) => row.status === "pending");
    expect(pending.length).toBe(324);
    expect(pending.some((row) => GLEANED_BY_BATCHES_33_34.has(row.slug))).toBe(false);

    /// 327 → 324: партія 20 закрила три збірні сторінки `*-greatwyrm`. Вони не перекладені й
    /// ніколи не будуть — aidedd не має по них статблока, — тож `existing` тут означає рівно
    /// «покрито іншим джерелом», а не «переклад зроблено».
    const closedElsewhere = manifest2014.filter((row) => row.status === "existing");
    expect(closedElsewhere.map((row) => row.slug).sort()).toEqual(
      [...COLLECTIVE_PAGES_COVERED_BY_5ETOOLS].sort()
    );
  });
});

/// Витік знайдено скануванням каталогу в партії 20 і жодною партією не полагоджено: партії
/// одноразові, а три записи належать партіям 6 і 8. Дужку «blind beyond this radius» ковтає
/// `translateDistance` — вона міняє лише `ft.`, а решту віддає дослівно. Структурні вади
/// конвертора не чіпаються без команди власника (правило KR12.1), тож обхід — `fields.senses`.
describe("KR12.3 — чуття 2014 без латиниці", () => {
  const catalog = getAllCreatures("RULES_2014");
  const byName = byNameEng(catalog);

  it("жоден запис каталогу 2014 не тримає латиниці в чуттях", () => {
    const leaking = catalog.filter((creature) => /[A-Za-z]{3,}/.test(creature.senses ?? ""));
    expect(leaking.map((creature) => creature.nameEng)).toEqual([]);
  });

  it("три записи з дужкою «blind beyond this radius» читаються як решта корпусу", () => {
    expect(byName.get("Needle Blight")?.senses).toBe(
      "Сліпозір 60 фт. (сліпий за межами цього радіусу), Пасивна уважність 9"
    );
    expect(byName.get("Vine Blight")?.senses).toBe(
      "Сліпозір 60 фт. (сліпий за межами цього радіусу), Пасивна уважність 10"
    );
    expect(byName.get("Nupperibo")?.senses).toBe(
      "Сліпозір 20 фт. (сліпий за межами цього радіусу), Пасивна уважність 11"
    );
  });

  it("needle-blight і twig-blight мають однакове джерело, тож і однаковий рядок чуттів", () => {
    const readSenses = (slug: string) =>
      parseMonster2014(readFileSync(`data/aidedd/raw/monsters-2014/${slug}.html`, "utf-8"), slug)
        .senses;
    expect(readSenses("needle-blight")).toBe(readSenses("twig-blight"));
    expect(byName.get("Needle Blight")?.senses).toBe(byName.get("Twig Blight")?.senses);
  });

  it("дужка стоїть у 29 записах — три нові приєднуються до наявних 26", () => {
    const withParenthetical = catalog.filter((creature) =>
      (creature.senses ?? "").includes("(сліпий за межами цього радіусу)")
    );
    expect(withParenthetical.length).toBe(29);
  });

  /// Не дрейф: aidedd друкує цим двом «blind beyond this distance», а не «...radius», тож
  /// успадкований рядок перекладає своє джерело точно. Третій облекс має в джерелі «radius» —
  /// і читається як решта корпусу. Тест стоїть, щоб наступна сесія не «уніфікувала» правильне.
  it("два облекси кажуть «цієї відстані» слідом за джерелом, третій — «цього радіусу»", () => {
    const readSourceSenses = (slug: string) =>
      parseMonster2014(readFileSync(`data/aidedd/raw/monsters-2014/${slug}.html`, "utf-8"), slug)
        .senses;
    for (const [slug, nameEng] of [
      ["adult-oblex", "Adult Oblex"],
      ["elder-oblex", "Elder Oblex"],
    ] as Array<[string, string]>) {
      expect(readSourceSenses(slug)).toContain("blind beyond this distance");
      expect(byName.get(nameEng)?.senses).toContain("(сліпий за межами цієї відстані)");
    }
    expect(readSourceSenses("oblex-spawn")).toContain("blind beyond this radius");
    expect(byName.get("Oblex Spawn")?.senses).toContain("(сліпий за межами цього радіусу)");
  });
});

describe("KR12.3 — партія 32 у зібраному каталозі 2014", () => {
  const catalog = byNameEng(getAllCreatures("RULES_2014"));

  it("кожна перекладена істота партії 32 має українську назву, опис дій і коректний ruleset", () => {
    for (const row of manifest.filter((r) => r.edition === "RULES_2014" && r.batch === 32)) {
      const creature = catalog.get(row.nameEng);
      expect(creature, `${row.nameEng} відсутня в каталозі`).toBeDefined();
      expect(creature!.creatureId).toBe(row.creatureId);
      expect(creature!.ruleset).toBe("RULES_2014");
      expect(creature!.name).toMatch(/[Ѐ-ӿ]/);
      expect(creature!.actions).toMatch(/[Ѐ-ӿ]/);
    }
  });

  it("тримає чотири fields-обходи мов: «на ваш вибір» і «ваші мови» поза реєстром термінів", () => {
    for (let level = 4; level <= 6; level += 1) {
      expect(catalog.get(`Warrior (lvl ${level})`)?.languages).toBe(
        "Загальна та ще одна мова на ваш вибір"
      );
    }
    expect(catalog.get("Wildfire Spirit")?.languages).toBe("розуміє ваші мови");
    for (const nameEng of [
      "Warrior (lvl 4)",
      "Warrior (lvl 5)",
      "Warrior (lvl 6)",
      "Wildfire Spirit",
    ]) {
      expect(catalog.get(nameEng)?.languages).not.toMatch(/[A-Za-z]{2}/);
    }
  });

  it("тримає fields-обхід хітів духа: формула прозою за моделлю звірів партії 30", () => {
    expect(catalog.get("Wildfire Spirit")?.hp).toBe("5 + 5 × рівень друїда");
    expect(catalog.get("Wildfire Spirit")?.hp).not.toMatch(/[A-Za-z]{3}/);
  });

  it("відновлює дві альтернативи Бойової ролі й у воїнів 4–6 рівня", () => {
    for (let level = 4; level <= 6; level += 1) {
      const entry = catalog.get(`Warrior (lvl ${level})`)?.specialAbilities ?? "";
      expect(entry).toContain("Нападник. Воїн отримує бонус +2 до кидків атаки.");
      expect(entry).toContain("Захисник. Воїн отримує реакцію Захист, наведену нижче.");
    }
  });

  it("додає чотири нові записи, добудовуючи родину воїнів до шести рівнів", () => {
    for (let level = 1; level <= 6; level += 1) {
      expect(catalog.get(`Warrior (lvl ${level})`)?.name).toBe(`Воїн (${level} рівень)`);
    }
    expect(catalog.get("Warrior (lvl 6)")?.specialAbilities).toContain("<b>Додаткова атака{{Extra Attack}}.</b>");
    expect(catalog.get("Warrior (lvl 4)")?.reactions).toContain("<b>Захист{{Protection}} (тільки Захисник).</b>");
  });

  it("словник бʼє сід: `Wildfire Spirit` — дух дикого вогню за `CIRCLE_OF_WILDFIRE`", () => {
    expect(subclassTranslations.CIRCLE_OF_WILDFIRE).toBe("Коло дикого вогню");
    expect(catalog.get("Wildfire Spirit")?.name).toBe("Дух дикого вогню");
    expect(catalog.get("Wildfire Spirit")?.name).not.toContain("полум");
    expect(catalog.get("Wildfire Spirit")?.description).toContain(
      "Див. підклас друїда Коло дикого вогню [Circle of Wildfire]."
    );
  });

  it("складає дві нові назви дій духа з уже затвердженого корпусу", () => {
    expect(catalog.get("Wildfire Spirit")?.actions).toContain("<b>Полумʼяне насіння{{Flame Seed}}.</b>");
    expect(catalog.get("Wildfire Spirit")?.actions).toContain("<b>Вогняна телепортація{{Fiery Teleportation}}.</b>");
    expect(catalog.get("Wildfire Spirit")?.actions).toContain("1к6 + БМ вогняних ушкоджень");
  });

  it("бере джерела хвоста черги з наявних значень enum", () => {
    expect(catalog.get("Warrior (lvl 4)")?.source).toBe("ESSENTIALS_KIT");
    expect(catalog.get("Wildfire Spirit")?.source).toBe("TCOE");
  });

  it("жодного відкладеного й жодного заблокованого запису", () => {
    expect(BATCH_THIRTY_TWO_DEFERRED_SLUGS.size).toBe(0);
    expect(BATCH_THIRTY_TWO_BLOCKED_SLUGS.size).toBe(0);
    expect(
      manifest2014.filter((row) => row.batch === 32 && row.status === "pending").length
    ).toBe(0);
  });
});

describe("KR12.3 — партія 31 у зібраному каталозі 2014", () => {
  const catalog = byNameEng(getAllCreatures("RULES_2014"));
  const pending = new Set([
    ...BATCH_THIRTY_ONE_DEFERRED_SLUGS,
    ...BATCH_THIRTY_ONE_BLOCKED_SLUGS,
  ]);

  it("кожна перекладена істота партії 31 має українську назву, опис дій і коректний ruleset", () => {
    for (const row of manifest.filter((r) => r.edition === "RULES_2014" && r.batch === 31)) {
      if (pending.has(row.slug)) continue;
      const creature = catalog.get(row.nameEng);
      expect(creature, `${row.nameEng} відсутня в каталозі`).toBeDefined();
      expect(creature!.creatureId).toBe(row.creatureId);
      expect(creature!.ruleset).toBe("RULES_2014");
      expect(creature!.name).toMatch(/[Ѐ-ӿ]/);
      expect(creature!.actions).toMatch(/[Ѐ-ӿ]/);
    }
  });

  it("тримає сім fields-обходів КЗ: рівень заклинання і БМ замість числа", () => {
    expect(catalog.get("Bestial Spirit")?.ac).toBe("11 + рівень заклинання (природний обладунок)");
    expect(catalog.get("Celestial Spirit")?.ac).toBe(
      "11 + рівень заклинання (природний обладунок) + 2 (тільки Захисник)"
    );
    expect(catalog.get("Construct Spirit")?.ac).toBe("13 + рівень заклинання (природний обладунок)");
    expect(catalog.get("Fey Spirit")?.ac).toBe("12 + рівень заклинання (природний обладунок)");
    expect(catalog.get("Fiendish Spirit")?.ac).toBe("12 + рівень заклинання (природний обладунок)");
    expect(catalog.get("Undead Spirit")?.ac).toBe("11 + рівень заклинання (природний обладунок)");
    expect(catalog.get("Drake Companion")?.ac).toBe("14 + БМ (природний обладунок)");
    for (const nameEng of [
      "Bestial Spirit",
      "Celestial Spirit",
      "Construct Spirit",
      "Fey Spirit",
      "Fiendish Spirit",
      "Undead Spirit",
      "Drake Companion",
    ]) {
      expect(catalog.get(nameEng)?.ac).not.toMatch(/[A-Za-z]{2}/);
    }
  });

  it("тримає одинадцять fields-обходів хітів — формула прозою замість кубиків", () => {
    expect(catalog.get("Bestial Spirit")?.hp).toBe(
      "20 (тільки Повітряний) або 30 (тільки Наземний і Водний) + 5 за кожен рівень заклинання, вищий за 2"
    );
    expect(catalog.get("Celestial Spirit")?.hp).toBe(
      "40 + 10 за кожен рівень заклинання, вищий за 5"
    );
    expect(catalog.get("Fiendish Spirit")?.hp).toBe(
      "50 (тільки Демон) або 40 (тільки Диявол) або 60 (тільки Юголот) + 15 за кожен рівень заклинання, вищий за 6"
    );
    expect(catalog.get("Dancing Item")?.hp).toBe("10 + 5 × рівень барда");
    expect(catalog.get("Drake Companion")?.hp).toBe(
      "5 + 5 × рівень слідопита (драк має стільки Кубиків Здоровʼя [к10], скільки у вас рівнів слідопита)"
    );
    expect(catalog.get("Steel Defender")?.hp).toBe(
      "2 + ваш модифікатор Інтелекту + 5 × ваш рівень винахідника (захисник має стільки Кубиків Здоровʼя [к8], скільки у вас рівнів винахідника)"
    );
    expect(catalog.get("Homunculus Servant")?.hp).toBe(
      "1 + ваш модифікатор Інтелекту + ваш рівень винахідника (гомункул має стільки Кубиків Здоровʼя [к4], скільки у вас рівнів винахідника)"
    );
    for (const nameEng of [
      "Bestial Spirit",
      "Celestial Spirit",
      "Construct Spirit",
      "Elemental Spirit",
      "Fey Spirit",
      "Fiendish Spirit",
      "Shadow Spirit",
      "Undead Spirit",
      "Dancing Item",
      "Drake Companion",
      "Steel Defender",
      "Homunculus Servant",
    ]) {
      expect(catalog.get(nameEng)?.hp).not.toMatch(/[A-Za-z]{3}/);
    }
  });

  it("тримає чотири fields-обходи швидкості, де джерело розділяє режими крапкою з комою", () => {
    expect(catalog.get("Bestial Spirit")?.speed).toBe(
      "30 фт.; лазіння 30 фт. (тільки Наземний); політ 60 фт. (тільки Повітряний); плавання 30 фт. (тільки Водний)"
    );
    expect(catalog.get("Elemental Spirit")?.speed).toBe(
      "40 фт.; риття 40 фт. (тільки Земляний); політ 40 фт. (паріння) (тільки Повітряний); плавання 40 фт. (тільки Водний)"
    );
    expect(catalog.get("Fiendish Spirit")?.speed).toBe(
      "40 фт.; лазіння 40 фт. (тільки Демон); політ 60 фт. (тільки Диявол)"
    );
    expect(catalog.get("Undead Spirit")?.speed).toBe(
      "30 фт.; політ 40 фт. (паріння) (тільки Примарний)"
    );
    for (const nameEng of ["Bestial Spirit", "Elemental Spirit", "Fiendish Spirit", "Undead Spirit"]) {
      expect(catalog.get(nameEng)?.speed).not.toMatch(/[A-Za-z]{2}/);
    }
  });

  it("тримає двадцять шість fields-обходів мов у трьох формах", () => {
    for (const nameEng of [
      "Bestial Spirit",
      "Construct Spirit",
      "Dancing Item",
      "Shadow Spirit",
      "Undead Spirit",
      "Homunculus Servant",
      "Steel Defender",
    ]) {
      expect(catalog.get(nameEng)?.languages).toBe("розуміє ваші мови");
    }
    expect(catalog.get("Celestial Spirit")?.languages).toBe("Небесна, розуміє ваші мови");
    expect(catalog.get("Elemental Spirit")?.languages).toBe("Первинна, розуміє ваші мови");
    expect(catalog.get("Fey Spirit")?.languages).toBe("Сільван, розуміє ваші мови");
    expect(catalog.get("Mighty Servant of Leuk-O")?.languages).toBe(
      "розуміє мови істот, налаштованих на нього, але не може говорити"
    );
    for (const nameEng of [
      "Expert (lvl 1)",
      "Expert (lvl 6)",
      "Spellcaster (lvl 1)",
      "Spellcaster (lvl 6)",
      "Warrior (lvl 1)",
      "Warrior (lvl 3)",
    ]) {
      expect(catalog.get(nameEng)?.languages).toBe("Загальна та ще одна мова на ваш вибір");
    }
    for (const row of manifest.filter((r) => r.edition === "RULES_2014" && r.batch === 31)) {
      if (pending.has(row.slug)) continue;
      expect(catalog.get(row.nameEng)?.languages).not.toMatch(/[A-Za-z]{3}/);
    }
  });

  it("тримає чотири fields-обходи чуттів, зокрема друкарську помилку джерела «dark vision»", () => {
    expect(catalog.get("Celestial Spirit")?.senses).toBe("Темнозір 60 фт., Пасивна уважність 12");
    expect(catalog.get("Homunculus Servant")?.senses).toBe(
      "Темнозір 60 фт., Пасивна уважність 10 + (БМ × 2)"
    );
    expect(catalog.get("Steel Defender")?.senses).toBe(
      "Темнозір 60 фт., Пасивна уважність 10 + (БМ × 2)"
    );
    expect(catalog.get("Tiny Servant")?.senses).toBe(
      "Сліпозір 60 фт. (сліпий за межами цього радіусу), Пасивна уважність 10"
    );
    for (const nameEng of [
      "Celestial Spirit",
      "Homunculus Servant",
      "Steel Defender",
      "Tiny Servant",
    ]) {
      expect(catalog.get(nameEng)?.senses).not.toMatch(/[A-Za-z]{2}/);
    }
  });

  it("тримає два fields-обходи навичок, де бонус залежить від БМ", () => {
    expect(catalog.get("Homunculus Servant")?.skills).toBe(
      "Уважність +0 плюс БМ × 2, Непомітність +2 плюс БМ"
    );
    expect(catalog.get("Steel Defender")?.skills).toBe(
      "Атлетика +2 плюс БМ, Уважність +0 плюс БМ × 2"
    );
    for (const nameEng of ["Homunculus Servant", "Steel Defender"]) {
      expect(catalog.get(nameEng)?.skills).not.toMatch(/[A-Za-z]{2}/);
    }
  });

  it("тримає три fields-обходи резисту, імунітету й станів, яких словник не бере списком", () => {
    expect(catalog.get("Elemental Spirit")?.damageResistance).toBe(
      "Кислотна (тільки Водний); Блискавична і Громова (тільки Повітряний); Колюча і Рубляча (тільки Земляний)"
    );
    expect(catalog.get("Elemental Spirit")?.damageImmunity).toBe(
      "Отруйна; Вогняна (тільки Вогняний)"
    );
    expect(catalog.get("Drake Companion")?.damageImmunity).toBe(
      "визначається рисою Драконяча сутність"
    );
    expect(catalog.get("Mighty Servant of Leuk-O")?.conditionImmunity).toBe(
      "усі стани, крім Невидимого й Поваленого"
    );
    for (const nameEng of ["Elemental Spirit", "Drake Companion", "Mighty Servant of Leuk-O"]) {
      expect(catalog.get(nameEng)?.damageImmunity).not.toMatch(/[A-Za-z]{3}/);
      expect(catalog.get(nameEng)?.conditionImmunity).not.toMatch(/[A-Za-z]{3}/);
    }
  });

  it("дописує дванадцять списків заклинань соратників, які губить парсер", () => {
    expect(catalog.get("Spellcaster (lvl 1)")?.specialAbilities).toContain(
      "Замовляння (необмежено): Настанова [Guidance], Священне полумʼя [Sacred Flame]"
    );
    expect(catalog.get("Spellcaster (lvl 1)")?.specialAbilities).toContain(
      "1 рівень (2 слоти): Лікування ран [Cure Wounds]"
    );
    expect(catalog.get("Spellcaster (lvl 1)")?.specialAbilities).toContain(
      "Замовляння (необмежено): Вогняний заряд [Fire Bolt], Світло [Light]"
    );
    expect(catalog.get("Spellcaster (lvl 2)")?.specialAbilities).toContain(
      "1 рівень (2 слоти): Палючі долоні [Burning Hands], Сон [Sleep]"
    );
    expect(catalog.get("Spellcaster (lvl 3)")?.specialAbilities).toContain(
      "1 рівень (3 слоти): Благословення [Bless], Лікування ран [Cure Wounds], Щит віри [Shield of Faith]"
    );
    expect(catalog.get("Spellcaster (lvl 4)")?.specialAbilities).toContain(
      "Замовляння (необмежено): Вогняний заряд [Fire Bolt], Світло [Light], Магічна рука [Mage Hand]"
    );
    expect(catalog.get("Spellcaster (lvl 5)")?.specialAbilities).toContain(
      "2 рівень (2 слоти): Підтримка [Aid]"
    );
    expect(catalog.get("Spellcaster (lvl 6)")?.specialAbilities).toContain(
      "2 рівень (2 слоти): Невидимість [Invisibility]"
    );
    for (let level = 1; level <= 6; level += 1) {
      const entry = catalog.get(`Spellcaster (lvl ${level})`)?.specialAbilities ?? "";
      expect(entry).toContain("<b>Чаротворення{{Spellcasting}} (Цілитель).</b>");
      expect(entry).toContain("<b>Чаротворення{{Spellcasting}} (Маг).</b>");
      expect(entry).toContain("Замовляння (необмежено):");
    }
  });

  it("відновлює дві альтернативи Бойової ролі, які парсер відкидає разом з абзацом", () => {
    for (const nameEng of ["Warrior (lvl 1)", "Warrior (lvl 2)", "Warrior (lvl 3)"]) {
      const entry = catalog.get(nameEng)?.specialAbilities ?? "";
      expect(entry).toContain("Нападник. Воїн отримує бонус +2 до кидків атаки.");
      expect(entry).toContain("Захисник. Воїн отримує реакцію Захист, наведену нижче.");
    }
  });

  it("перевикористовує пʼять id духів, замінюючи, а не додаючи до успадкованого каталогу", () => {
    const list = getAllCreatures("RULES_2014");
    expect(new Set(list.map((c) => c.creatureId)).size).toBe(list.length);
    for (const [nameEng, creatureId, name] of [
      ["Celestial Spirit", 1, "Дух небесного створіння"],
      ["Construct Spirit", 2, "Дух конструкта"],
      ["Shadow Spirit", 4, "Дух тіні"],
      ["Fey Spirit", 5, "Дух феї"],
      ["Elemental Spirit", 7, "Дух елементаля"],
    ] as Array<[string, number, string]>) {
      expect(list.filter((c) => c.creatureId === creatureId).length).toBe(1);
      expect(catalog.get(nameEng)?.creatureId).toBe(creatureId);
      expect(catalog.get(nameEng)?.name).toBe(name);
    }
  });

  it("перетирає легасі-конспект духів, заради чого KR12.3 і існує", () => {
    expect(catalog.get("Celestial Spirit")?.ac).not.toContain("натуральний обладунок");
    expect(catalog.get("Celestial Spirit")?.senses).not.toContain("темне бачення");
    expect(catalog.get("Fey Spirit")?.languages).not.toContain("розуміє мову, якою спілкується власник");
    expect(catalog.get("Elemental Spirit")?.languages).not.toContain("первісна мова");
    expect(catalog.get("Shadow Spirit")?.type).toBe("Чудовисько");
  });

  it("додає двадцять чотири нові записи партії 31", () => {
    expect(catalog.get("Bestial Spirit")?.name).toBe("Дух звіра");
    expect(catalog.get("Undead Spirit")?.name).toBe("Дух немертвого");
    expect(catalog.get("Dancing Item")?.name).toBe("Танцюючий предмет");
    expect(catalog.get("Homunculus Servant")?.name).toBe("Слуга-гомункул");
    expect(catalog.get("Steel Defender")?.name).toBe("Сталевий захисник");
    expect(catalog.get("Tiny Servant")?.name).toBe("Крихітний слуга");
    expect(catalog.get("Mighty Servant of Leuk-O")?.name).toBe("Могутній слуга Леук-О");
    for (let level = 1; level <= 6; level += 1) {
      expect(catalog.get(`Expert (lvl ${level})`)?.name).toBe(`Експерт (${level} рівень)`);
      expect(catalog.get(`Spellcaster (lvl ${level})`)?.name).toBe(`Заклинач (${level} рівень)`);
    }
    for (let level = 1; level <= 3; level += 1) {
      expect(catalog.get(`Warrior (lvl ${level})`)?.name).toBe(`Воїн (${level} рівень)`);
    }
  });

  it("словник бʼє 2024-двійника: `Fiendish Spirit` — дух почвари, а не дух бестії", () => {
    expect(catalog.get("Fiendish Spirit")?.name).toBe("Дух почвари");
    expect(catalog.get("Fiendish Spirit")?.name).not.toContain("бестії");
    expect(catalog.get("Fiendish Spirit")?.type).toBe("Почвара");
  });

  it("корпус бʼє інтуїцію: `Drake Companion` — драк за прецедентом Драка-охоронця", () => {
    expect(catalog.get("Drake Companion")?.name).toBe("Драк-супутник");
    expect(catalog.get("Drake Companion")?.name).not.toContain("Дрейк");
    expect(catalog.get("Guard Drake")?.name).toBe("Драк-охоронець");
  });

  it("бере назви рис зі словника, ратифікованого глосарію, сідів гравця й корпусу 2014", () => {
    expect(catalog.get("Bestial Spirit")?.specialAbilities).toContain(
      "<b>Обліт{{Flyby}} (тільки Повітряний).</b>"
    );
    expect(catalog.get("Bestial Spirit")?.actions).toContain("<b>Дворучний молот{{Maul}}.</b>");
    expect(catalog.get("Construct Spirit")?.specialAbilities).toContain(
      "<b>Розпечене тіло{{Heated Body}} (тільки Метал).</b>"
    );
    expect(catalog.get("Spellcaster (lvl 1)")?.actions).toContain("<b>Палиця{{Quarterstaff}}.</b>");
    expect(catalog.get("Expert (lvl 3)")?.specialAbilities).toContain("<b>Експертиза{{Expertise}}.</b>");
    expect(catalog.get("Expert (lvl 2)")?.specialAbilities).toContain("<b>Хитра дія{{Cunning Action}}.</b>");
    expect(catalog.get("Expert (lvl 6)")?.specialAbilities).toContain("<b>Додаткова атака{{Extra Attack}}.</b>");
    expect(catalog.get("Warrior (lvl 2)")?.specialAbilities).toContain("<b>Друге дихання{{Second Wind}}.</b>");
    expect(catalog.get("Warrior (lvl 3)")?.specialAbilities).toContain(
      "<b>Покращений критичний удар{{Improved Critical}}.</b>"
    );
    expect(catalog.get("Warrior (lvl 1)")?.reactions).toContain("<b>Захист{{Protection}} (тільки Захисник).</b>");
    expect(catalog.get("Homunculus Servant")?.specialAbilities).toContain("<b>Ухилення{{Evasion}}.</b>");
    expect(catalog.get("Fey Spirit")?.bonusActions).toContain("<b>Фейський крок{{Fey Step}}.</b>");
    expect(catalog.get("Fiendish Spirit")?.specialAbilities).toContain(
      "<b>Передсмертні корчі{{Death Throes}} (тільки Демон).</b>"
    );
    expect(catalog.get("Fiendish Spirit")?.actions).toContain(
      "<b>Метання полумʼя{{Hurl Flame}} (тільки Диявол).</b>"
    );
    expect(catalog.get("Shadow Spirit")?.bonusActions).toContain(
      "<b>Тіньова непомітність{{Shadow Stealth}} (тільки Страх).</b>"
    );
    expect(catalog.get("Undead Spirit")?.actions).toContain(
      "<b>Могильний заряд{{Grave Bolt}} (тільки Скелетний).</b>"
    );
    expect(catalog.get("Mighty Servant of Leuk-O")?.specialAbilities).toContain(
      "<b>Стрибок з місця{{Standing Leap}}.</b>"
    );
  });

  it("розводить `Force` і `Force-Empowered`: прямий силовий удар проти удару силовим полем", () => {
    expect(catalog.get("Homunculus Servant")?.actions).toContain("<b>Силовий удар{{Force Strike}}.</b>");
    expect(catalog.get("Dancing Item")?.actions).toContain("<b>Удар силовим полем{{Force-Empowered Slam}}.</b>");
    expect(catalog.get("Steel Defender")?.actions).toContain("<b>Роздирання силовим полем{{Force-Empowered Rend}}.</b>");
    expect(catalog.get("Dancing Item")?.actions).not.toContain("<b>Силовий удар.</b>");
  });

  it("розводить `Crushing` і `Destructive` у могутнього слуги", () => {
    expect(catalog.get("Mighty Servant of Leuk-O")?.actions).toContain("<b>Руйнівний кулак{{Destructive Fist}}.</b>");
    expect(catalog.get("Mighty Servant of Leuk-O")?.actions).toContain("<b>Нищівний стрибок{{Crushing Leap}}.</b>");
    expect(catalog.get("Mighty Servant of Leuk-O")?.actions).not.toContain("Нищівний кулак");
  });

  it("розводить `Rotting` і `Putrid`: гниючий кіготь при трупному вигляді духа", () => {
    expect(catalog.get("Undead Spirit")?.actions).toContain("<b>Гниючий кіготь{{Rotting Claw}} (тільки Трупний).</b>");
    expect(catalog.get("Undead Spirit")?.specialAbilities).toContain(
      "<b>Гнійна аура{{Festering Aura}} (тільки Трупний).</b>"
    );
  });

  it("`draconic-spirit` чекав на тег «Gem»; власник його завів, і добірка 34 закрила рядок", () => {
    for (const slug of [
      ...BATCH_THIRTY_ONE_DEFERRED_SLUGS,
      ...BATCH_THIRTY_ONE_BLOCKED_SLUGS,
    ]) {
      const row = manifest.find((r) => r.edition === "RULES_2014" && r.slug === slug);
      expect(row?.status).toBe(expectedStatusAfterGleaning(slug));
      expect(row?.batch).toBe(31);
    }
    expect(BATCH_THIRTY_ONE_DEFERRED_SLUGS.size).toBe(0);
    expect(BATCH_THIRTY_ONE_BLOCKED_SLUGS.size).toBe(1);
    expect(catalog.get("Draconic Spirit")?.name).toBe("Дух дракона");
    expect(GLEANED_BY_BATCHES_33_34.has("draconic-spirit")).toBe(true);
    expect(dictionary.DND_DICTIONARY.creatureTypeTags.gem).toBe("Самоцвітний");
    expect(dictionary.DND_DICTIONARY.creatureTypeTags).toHaveProperty("chromatic");
    expect(dictionary.DND_DICTIONARY.creatureTypeTags).toHaveProperty("metallic");
  });

  it("бере джерела партії з наявних значень enum, зокрема ESSENTIALS_KIT для соратників", () => {
    expect(findSourceKey2014("Rules (Essentials Kit)")).toBe("ESSENTIALS_KIT");
    expect(findSourceKey2014("Rules (Tasha´s Cauldron of Everything)")).toBe("TCOE");
    expect(findSourceKey2014("Rules (Xanathar´s Guide to Everything)")).toBe("XGTE");
    expect(catalog.get("Warrior (lvl 1)")?.source).toBe("ESSENTIALS_KIT");
    expect(catalog.get("Bestial Spirit")?.source).toBe("TCOE");
    expect(catalog.get("Tiny Servant")?.source).toBe("XGTE");
  });
});

describe("KR12.3 — партія 30 у зібраному каталозі 2014", () => {
  const catalog = byNameEng(getAllCreatures("RULES_2014"));
  const pending = new Set([...BATCH_THIRTY_DEFERRED_SLUGS, ...BATCH_THIRTY_BLOCKED_SLUGS]);

  it("кожна перекладена істота партії 30 має українську назву, опис дій і коректний ruleset", () => {
    for (const row of manifest.filter((r) => r.edition === "RULES_2014" && r.batch === 30)) {
      if (pending.has(row.slug)) continue;
      const creature = catalog.get(row.nameEng);
      expect(creature, `${row.nameEng} відсутня в каталозі`).toBeDefined();
      expect(creature!.creatureId).toBe(row.creatureId);
      expect(creature!.ruleset).toBe("RULES_2014");
      expect(creature!.name).toMatch(/[Ѐ-ӿ]/);
      expect(creature!.actions).toMatch(/[Ѐ-ӿ]/);
    }
  });

  it("тримає пʼять fields-обходів імунітету, де «nonmagical» ламає список типів ушкоджень", () => {
    expect(catalog.get("Demogorgon")?.damageImmunity).toBe(
      "Отруйна; Дробляча, Колюча, Рубляча від немагічної зброї"
    );
    expect(catalog.get("Vecna the Archlich")?.damageImmunity).toBe(
      "Отруйна; Дробляча, Колюча, Рубляча від немагічної зброї"
    );
    expect(catalog.get("Orcus")?.damageImmunity).toBe(
      "Некротична, Отруйна; Дробляча, Колюча, Рубляча від немагічної зброї"
    );
    expect(catalog.get("Tarrasque")?.damageImmunity).toBe(
      "Вогняна, Отруйна; Дробляча, Колюча, Рубляча від немагічної зброї"
    );
    expect(catalog.get("Tiamat")?.damageImmunity).toBe(
      "Кислотна, Холодна, Вогняна, Блискавична, Отруйна; Дробляча, Колюча, Рубляча від немагічної зброї"
    );
    for (const nameEng of ["Demogorgon", "Vecna the Archlich", "Orcus", "Tarrasque", "Tiamat"]) {
      expect(catalog.get(nameEng)?.damageImmunity).not.toMatch(/[A-Za-z]{3}/);
    }
  });

  it("тримає fields-обхід резисту Заріель із Променевою і не посрібленою зброєю", () => {
    expect(catalog.get("Zariel")?.damageResistance).toBe(
      "Холодна, Вогняна, Променева; Дробляча, Колюча, Рубляча від немагічної, не посрібленої зброї"
    );
    expect(catalog.get("Zariel")?.damageResistance).not.toMatch(/[A-Za-z]{3}/);
  });

  it("тримає чотири fields-обходи КЗ, які конвертер лишав англійськими", () => {
    expect(catalog.get("Orcus")?.ac).toBe("17 (природний обладунок), 20 з Паличкою Оркуса");
    for (const nameEng of ["Beast of the Land", "Beast of the Sea", "Beast of the Sky"]) {
      expect(catalog.get(nameEng)?.ac).toBe("13 + БМ (природний обладунок)");
      expect(catalog.get(nameEng)?.ac).not.toMatch(/[A-Za-z]{2}/);
    }
    expect(catalog.get("Orcus")?.ac).not.toMatch(/[A-Za-z]{2}/);
  });

  it("тримає чотири fields-обходи мов, яких немає в реєстрі", () => {
    expect(catalog.get("Avatar of Death")?.languages).toBe(
      "усі мови, які знає той, хто його викликав"
    );
    for (const nameEng of ["Beast of the Land", "Beast of the Sea", "Beast of the Sky"]) {
      expect(catalog.get(nameEng)?.languages).toBe("розуміє ваші мови");
    }
    for (const nameEng of [
      "Avatar of Death",
      "Beast of the Land",
      "Beast of the Sea",
      "Beast of the Sky",
    ]) {
      expect(catalog.get(nameEng)?.languages).not.toMatch(/[A-Za-z]{3}/);
    }
  });

  it("тримає чотири fields-обходи хітів — новий слот `hp` у `TranslatedFields`", () => {
    expect(catalog.get("Avatar of Death")?.hp).toBe("половина максимуму хітів того, хто його викликав");
    expect(catalog.get("Beast of the Land")?.hp).toBe(
      "5 + 5 × рівень слідопита (звір має стільки Кубиків Здоровʼя [к8], скільки у вас рівнів слідопита)"
    );
    expect(catalog.get("Beast of the Sea")?.hp).toBe(
      "5 + 5 × рівень слідопита (звір має стільки Кубиків Здоровʼя [к8], скільки у вас рівнів слідопита)"
    );
    expect(catalog.get("Beast of the Sky")?.hp).toBe(
      "4 + 4 × рівень слідопита (звір має стільки Кубиків Здоровʼя [к6], скільки у вас рівнів слідопита)"
    );
    for (const nameEng of [
      "Avatar of Death",
      "Beast of the Land",
      "Beast of the Sea",
      "Beast of the Sky",
    ]) {
      expect(catalog.get(nameEng)?.hp).not.toMatch(/[A-Za-z]{3}/);
    }
  });

  it("гасить OCR-помилку джерела «6O ft.» у чуттях звіра неба", () => {
    expect(catalog.get("Beast of the Sky")?.senses).toBe("Темнозір 60 фт., Пасивна уважність 12");
    expect(catalog.get("Beast of the Sky")?.senses).toBe(catalog.get("Beast of the Land")?.senses);
  });

  it("дописує чотири списки заклинань, які губить парсер", () => {
    expect(catalog.get("Demogorgon")?.actions).toContain("Слабоумство [Feeblemind]");
    expect(catalog.get("Orcus")?.actions).toContain("Зупинка часу [Time Stop]");
    expect(catalog.get("Orcus")?.actions).toContain("Слово сили: Смерть [Power Word Kill]");
    expect(catalog.get("Vecna the Archlich")?.actions).toContain(
      "Планарний перехід [Plane Shift] (лише на себе)"
    );
    expect(catalog.get("Zariel")?.actions).toContain("Клинковий барʼєр [Blade Barrier]");
  });

  it("перевикористовує id тараска, замінюючи, а не додаючи до успадкованого каталогу", () => {
    const list = getAllCreatures("RULES_2014");
    expect(new Set(list.map((c) => c.creatureId)).size).toBe(list.length);
    expect(list.filter((c) => c.creatureId === 247).length).toBe(1);
    expect(catalog.get("Tarrasque")?.creatureId).toBe(247);
    expect(catalog.get("Tarrasque")?.name).toBe("Тараск (Tarrasque)");
  });

  it("додає девʼять нових записів партії 30", () => {
    expect(catalog.get("Demogorgon")?.name).toBe("Демогоргон");
    expect(catalog.get("Orcus")?.name).toBe("Оркус");
    expect(catalog.get("Vecna the Archlich")?.name).toBe("Векна Архіліч");
    expect(catalog.get("Zariel")?.name).toBe("Заріель");
    expect(catalog.get("Tiamat")?.name).toBe("Тіамат");
    expect(catalog.get("Avatar of Death")?.name).toBe("Аватар Смерті");
    expect(catalog.get("Beast of the Land")?.name).toBe("Звір землі");
    expect(catalog.get("Beast of the Sea")?.name).toBe("Звір моря");
    expect(catalog.get("Beast of the Sky")?.name).toBe("Звір неба");
  });

  it("бере назви рис зі словника, ратифікованого глосарію й корпусу 2014", () => {
    expect(catalog.get("Orcus")?.actions).toContain("<b>Паличка Оркуса{{Wand of Orcus}}.</b>");
    expect(catalog.get("Zariel")?.actions).toContain("<b>Бойовий ціп{{Flail}}.</b>");
    expect(catalog.get("Beast of the Land")?.actions).toContain("<b>Дворучний молот{{Maul}}.</b>");
    expect(catalog.get("Demogorgon")?.actions).toContain("<b>3-4: Спантеличливий погляд{{3-4: Confusing Gaze}}.</b>");
    expect(catalog.get("Demogorgon")?.actions).toContain("<b>5-6: Гіпнотичний погляд{{5-6: Hypnotic Gaze}}.</b>");
    expect(catalog.get("Tarrasque")?.specialAbilities).toContain("<b>Облогове чудовисько{{Siege Monster}}.</b>");
    expect(catalog.get("Avatar of Death")?.specialAbilities).toContain("<b>Імунітет до вигнання{{Turning Immunity}}.</b>");
    expect(catalog.get("Tiamat")?.legendaryActions).toContain(
      "<b>Голова зеленого дракона: Отруйний подих{{Green Dragon Head: Poison Breath}} (коштує 2 дії).</b>"
    );
  });

  it("розводить `Shred` і `Rend`: звір неба дістає шматування, а не роздирання", () => {
    expect(catalog.get("Beast of the Sky")?.actions).toContain("<b>Шматування{{Shred}}.</b>");
    expect(catalog.get("Beast of the Sky")?.actions).not.toContain("Роздирання");
  });

  it("розводить `Conjure` і `Summon`: Оркус прикликає нежить, а не викликає її", () => {
    expect(catalog.get("Orcus")?.actions).toContain("<b>Прикликання нежиті{{Conjure Undead}} (1 раз на день).</b>");
    expect(catalog.get("Orcus")?.actions).not.toContain("Виклик нежиті");
  });

  it("гасить OCR-помилку джерела «bO (I6d6)» у Проковтуванні тараска", () => {
    expect(catalog.get("Tarrasque")?.actions).toContain("60 (16к6) кислотних ушкоджень");
    expect(catalog.get("Tarrasque")?.actions).not.toMatch(/bO|I6/);
  });

  it("перетирає легасі-конспект тараска, заради чого KR12.3 і існує", () => {
    expect(catalog.get("Tarrasque")?.specialAbilities).not.toContain("Облоговий монстр");
    expect(catalog.get("Tarrasque")?.specialAbilities).toContain(
      "<b>Легендарний опір{{Legendary Resistance}} (3 рази на день).</b>"
    );
    expect(catalog.get("Tarrasque")?.specialAbilities).not.toContain("Легендарний опір (3/день)");
    expect(catalog.get("Tarrasque")?.actions).toContain("<b>Кіготь{{Claw}}.</b>");
    expect(catalog.get("Tarrasque")?.actions).not.toContain("<b>Кігті.</b>");
    expect(catalog.get("Tarrasque")?.actions).toContain("<b>Жахлива присутність{{Frightful Presence}}.</b>");
    expect(catalog.get("Tarrasque")?.actions).toContain("<b>Ковтання{{Swallow}}.</b>");
    expect(catalog.get("Tarrasque")?.legendaryActions).toContain("<b>Хрускіт щелеп{{Chomp}} (коштує 2 дії).</b>");
  });

  it("двадцять відкладених записів лишається pending, блокувань поза дефектом немає", () => {
    for (const slug of [...BATCH_THIRTY_DEFERRED_SLUGS, ...BATCH_THIRTY_BLOCKED_SLUGS]) {
      const row = manifest.find((r) => r.edition === "RULES_2014" && r.slug === slug);
      expect(row?.status).toBe(expectedStatusAfterGleaning(slug));
      expect(row?.batch).toBe(30);
    }
    expect(BATCH_THIRTY_BLOCKED_SLUGS.size).toBe(0);
  });

  it("«Chains of Asmodeus» і теги «Inevitable» та «Gem» закриті рішенням 2026-08-21", () => {
    expect(findSourceKey2014("Extra (Chains of Asmodeus)")).toBe("CHAINS_OF_ASMODEUS");
    expect(dictionary.DND_DICTIONARY.creatureTypeTags.inevitable).toBe("Невідворотний");
    expect(dictionary.DND_DICTIONARY.creatureTypeTags.gem).toBe("Самоцвітний");
  });
});

describe("KR12.3 — партія 29 у зібраному каталозі 2014", () => {
  const catalog = byNameEng(getAllCreatures("RULES_2014"));
  const pending = new Set([
    ...BATCH_TWENTY_NINE_DEFERRED_SLUGS,
    ...BATCH_TWENTY_NINE_BLOCKED_SLUGS,
  ]);

  it("кожна перекладена істота партії 29 має українську назву, опис дій і коректний ruleset", () => {
    for (const row of manifest.filter((r) => r.edition === "RULES_2014" && r.batch === 29)) {
      if (pending.has(row.slug)) continue;
      const creature = catalog.get(row.nameEng);
      expect(creature, `${row.nameEng} відсутня в каталозі`).toBeDefined();
      expect(creature!.creatureId).toBe(row.creatureId);
      expect(creature!.ruleset).toBe("RULES_2014");
      expect(creature!.name).toMatch(/[Ѐ-ӿ]/);
      expect(creature!.actions).toMatch(/[Ѐ-ӿ]/);
    }
  });

  it("тримає fields-обхід резисту солара — той самий рядок, що в деви й планетара", () => {
    expect(catalog.get("Solar")?.damageResistance).toBe(
      "Променева; Дробляча, Колюча, Рубляча від немагічної зброї"
    );
    expect(catalog.get("Solar")?.damageResistance).not.toMatch(/[A-Za-z]{3}/);
  });

  it("тримає три fields-обходи імунітету — емпірея, Джублекса й кракена", () => {
    expect(catalog.get("Empyrean")?.damageImmunity).toBe(
      "Дробляча, Колюча, Рубляча від немагічної зброї"
    );
    expect(catalog.get("Juiblex")?.damageImmunity).toBe(
      "Кислотна, Отруйна; Дробляча, Колюча, Рубляча від немагічної зброї"
    );
    expect(catalog.get("Kraken")?.damageImmunity).toBe(
      "Блискавична; Дробляча, Колюча, Рубляча від немагічної зброї"
    );
    for (const nameEng of ["Empyrean", "Juiblex", "Kraken"]) {
      expect(catalog.get(nameEng)?.damageImmunity).not.toMatch(/[A-Za-z]{3}/);
    }
  });

  it("тримає fields-обхід мов кракена за формою 2024-двійника", () => {
    expect(catalog.get("Kraken")?.languages).toBe(
      "розуміє Мову безодні, Небесну, Пекельну та Первинну, але не може ними говорити, телепатія 120 фт."
    );
    expect(catalog.get("Kraken")?.languages).not.toMatch(/[A-Za-z]{3}/);
  });

  it("дописує три списки заклинань, які губить парсер", () => {
    expect(catalog.get("Solar")?.specialAbilities).toContain("Клинковий барʼєр [Blade Barrier]");
    expect(catalog.get("Solar")?.specialAbilities).toContain("Контроль погоди [Control Weather]");
    expect(catalog.get("Empyrean")?.specialAbilities).toContain("Вогняний шторм [Fire Storm]");
    expect(catalog.get("Empyrean")?.specialAbilities).toContain(
      "Планарний перехід [Plane Shift] (лише на себе)"
    );
    expect(catalog.get("Juiblex")?.actions).toContain("Газоподібна форма [Gaseous Form]");
  });

  it("перевикористовує id трьох записів партії 29, замінюючи, а не додаючи до успадкованого каталогу", () => {
    const list = getAllCreatures("RULES_2014");
    expect(new Set(list.map((c) => c.creatureId)).size).toBe(list.length);
    expect(list.filter((c) => c.creatureId === 243).length).toBe(1);
    expect(catalog.get("Solar")?.creatureId).toBe(243);
    expect(catalog.get("Kraken")?.creatureId).toBe(246);
    expect(catalog.get("Ancient Red Dragon")?.creatureId).toBe(229);
    expect(catalog.get("Solar")?.name).toBe("Солар (Верховний серафим)");
    expect(catalog.get("Kraken")?.name).toBe("Кракен");
    expect(catalog.get("Ancient Red Dragon")?.name).toBe("Стародавній червоний дракон");
  });

  it("додає шість нових записів партії 29", () => {
    expect(catalog.get("Ancient Bronze Dragon")?.name).toBe("Стародавній бронзовий дракон");
    expect(catalog.get("Ancient Green Dragon")?.name).toBe("Стародавній зелений дракон");
    expect(catalog.get("Ancient Silver Dragon")?.name).toBe("Стародавній срібний дракон");
    expect(catalog.get("Ancient Gold Dragon")?.name).toBe("Стародавній золотий дракон");
    expect(catalog.get("Empyrean")?.name).toBe("Емпірей");
    expect(catalog.get("Juiblex")?.name).toBe("Джублекс");
  });

  it("бере назви рис зі словника, ратифікованого глосарію й 2024-двійника", () => {
    expect(catalog.get("Solar")?.actions).toContain("<b>Дворучний меч{{Greatsword}}.</b>");
    expect(catalog.get("Solar")?.actions).toContain("<b>Летючий меч{{Flying Sword}}.</b>");
    expect(catalog.get("Solar")?.actions).toContain("<b>Смертоносний довгий лук{{Slaying Longbow}}.</b>");
    expect(catalog.get("Solar")?.legendaryActions).toContain(
      "<b>Засліплювальний погляд{{Blinding Gaze}} (коштує 3 дії).</b>"
    );
    expect(catalog.get("Empyrean")?.actions).toContain("<b>Дворучний молот{{Maul}}.</b>");
    expect(catalog.get("Empyrean")?.legendaryActions).toContain("<b>Зміцнення{{Bolster}}.</b>");
    expect(catalog.get("Kraken")?.legendaryActions).toContain(
      "<b>Чорнильна хмара{{Ink Cloud}} (коштує 3 дії).</b>"
    );
    expect(catalog.get("Ancient Silver Dragon")?.actions).toContain("<b>Паралітичний подих{{Paralyzing Breath}}.</b>");
  });

  it("розводить `Lash` і `Whip`: Джублекс дістає хльост, а не батіг", () => {
    expect(catalog.get("Juiblex")?.actions).toContain("<b>Кислотний хльост{{Acid Lash}}.</b>");
    expect(catalog.get("Juiblex")?.actions).not.toContain("Кислотний батіг");
  });

  it("перетирає легасі-конспекти партії 29, заради чого KR12.3 і існує", () => {
    expect(catalog.get("Solar")?.actions).not.toContain("Великий меч");
    expect(catalog.get("Solar")?.actions).not.toContain("Лук знищення");
    expect(catalog.get("Solar")?.legendaryActions).not.toContain("Промінь світла");
    expect(catalog.get("Kraken")?.specialAbilities).not.toContain("Руйнівник кораблів");
    expect(catalog.get("Kraken")?.specialAbilities).toContain("<b>Облогове чудовисько{{Siege Monster}}.</b>");
    expect(catalog.get("Kraken")?.legendaryActions).not.toContain("Скриня чорнил");
    expect(catalog.get("Ancient Red Dragon")?.actions).not.toContain("Вогняне дихання");
    expect(catalog.get("Ancient Red Dragon")?.actions).toContain(
      "<b>Вогняний подих{{Fire Breath}} (перезарядка 5–6).</b>"
    );
  });

  it("двадцять один відкладений запис лишається pending, блокувань поза дефектом немає", () => {
    for (const slug of [
      ...BATCH_TWENTY_NINE_DEFERRED_SLUGS,
      ...BATCH_TWENTY_NINE_BLOCKED_SLUGS,
    ]) {
      const row = manifest.find((r) => r.edition === "RULES_2014" && r.slug === slug);
      expect(row?.status).toBe(expectedStatusAfterGleaning(slug));
      expect(row?.batch).toBe(29);
    }
    expect(BATCH_TWENTY_NINE_BLOCKED_SLUGS.size).toBe(0);
  });

  it("тег «Gem» і дві пригодницькі книги закриті рішенням 2026-08-21", () => {
    expect(dictionary.DND_DICTIONARY.creatureTypeTags.gem).toBe("Самоцвітний");
    expect(findSourceKey2014("Adventures (Candlekeep Mysteries)")).toBe("CM");
    expect(findSourceKey2014("Adventures (Dungeon of the Mad Mage)")).toBe("WDMM");
  });
});

describe("KR12.3 — партія 28 у зібраному каталозі 2014", () => {
  const catalog = byNameEng(getAllCreatures("RULES_2014"));
  const pending = new Set([
    ...BATCH_TWENTY_EIGHT_DEFERRED_SLUGS,
    ...BATCH_TWENTY_EIGHT_BLOCKED_SLUGS,
  ]);

  it("кожна перекладена істота партії 28 має українську назву, опис дій і коректний ruleset", () => {
    for (const row of manifest.filter((r) => r.edition === "RULES_2014" && r.batch === 28)) {
      if (pending.has(row.slug)) continue;
      const creature = catalog.get(row.nameEng);
      expect(creature, `${row.nameEng} відсутня в каталозі`).toBeDefined();
      expect(creature!.creatureId).toBe(row.creatureId);
      expect(creature!.ruleset).toBe("RULES_2014");
      expect(creature!.name).toMatch(/[Ѐ-ӿ]/);
      expect(creature!.actions).toMatch(/[Ѐ-ӿ]/);
    }
  });

  it("тримає шість fields-обходів резисту, де «nonmagical attacks» ламає список", () => {
    for (const nameEng of ["Balor", "Belaphoss"]) {
      expect(catalog.get(nameEng)?.damageResistance).toBe(
        "Холодна, Блискавична; Дробляча, Колюча, Рубляча від немагічної зброї"
      );
    }
    for (const nameEng of ["Red Abishai", "Pit Fiend"]) {
      expect(catalog.get(nameEng)?.damageResistance).toBe(
        "Холодна; Дробляча, Колюча, Рубляча від немагічної, не посрібленої зброї"
      );
    }
    expect(catalog.get("Nightwalker")?.damageResistance).toBe(
      "Кислотна, Холодна, Вогняна, Блискавична, Громова; Дробляча, Колюча, Рубляча від немагічної зброї"
    );
    expect(catalog.get("Astral Dreadnought")?.damageResistance).toBe(
      "Дробляча, Колюча, Рубляча від немагічної зброї"
    );
    for (const nameEng of [
      "Balor",
      "Belaphoss",
      "Red Abishai",
      "Pit Fiend",
      "Nightwalker",
      "Astral Dreadnought",
    ]) {
      expect(catalog.get(nameEng)?.damageResistance).not.toMatch(/[A-Za-z]{3}/);
    }
  });

  it("тримає два fields-обходи ліча — імунітет і мови", () => {
    expect(catalog.get("Lich")?.damageImmunity).toBe(
      "Отруйна; Дробляча, Колюча, Рубляча від немагічної зброї"
    );
    expect(catalog.get("Lich")?.languages).toBe("Загальна плюс до пʼяти інших мов");
    expect(catalog.get("Lich")?.damageImmunity).not.toMatch(/[A-Za-z]{3}/);
    expect(catalog.get("Lich")?.languages).not.toMatch(/[A-Za-z]{3}/);
  });

  it("двадцять девʼятий запис дефекту «список заклинань поза <p>-абзацом» — три списки за spells.json", () => {
    expect(catalog.get("Pit Fiend")?.specialAbilities).toContain("Стіна вогню [Wall of Fire]");
    expect(catalog.get("Lich")?.specialAbilities).toContain("Слово сили: Смерть [Power Word Kill]");
    expect(catalog.get("Drow Matron Mother")?.actions).toContain("Брама [Gate]");
  });

  it("десята прогалина findSpellNames — новий підклас: рядок «At will» дроу без <em> і без <a>", () => {
    const actions = catalog.get("Drow Matron Mother")?.actions ?? "";
    expect(actions).toContain("Наказ [Command]");
    expect(actions).toContain("Мерехтливі вогники [Dancing Lights]");
    expect(actions).toContain("Виявлення магії [Detect Magic]");
    expect(actions).toContain("Дивотворство [Thaumaturgy]");
  });

  it("перевикористовує id трьох записів партії 28, замінюючи, а не додаючи до успадкованого каталогу", () => {
    const list = getAllCreatures("RULES_2014");
    expect(new Set(list.map((c) => c.creatureId)).size).toBe(list.length);
    expect(list.filter((c) => c.creatureId === 156).length).toBe(1);
    expect(catalog.get("Lich")?.creatureId).toBe(156);
    expect(catalog.get("Balor")?.creatureId).toBe(217);
    expect(catalog.get("Pit Fiend")?.creatureId).toBe(219);
    expect(catalog.get("Lich")?.name).toBe("Ліч");
    expect(catalog.get("Balor")?.name).toBe("Балор (Лорд демонів)");
    expect(catalog.get("Pit Fiend")?.name).toBe("Піт Фінд (Пекельний генерал)");
  });

  it("додає сім нових записів партії 28", () => {
    expect(catalog.get("Red Abishai")?.name).toBe("Червоний абішай");
    expect(catalog.get("Ancient White Dragon")?.name).toBe("Стародавній білий дракон");
    expect(catalog.get("Belaphoss")?.name).toBe("Белафос");
    expect(catalog.get("Drow Matron Mother")?.name).toBe("Дроу-матрона-мати");
    expect(catalog.get("Nightwalker")?.name).toBe("Нічний блукач");
    expect(catalog.get("Ancient Copper Dragon")?.name).toBe("Стародавній мідний дракон");
    expect(catalog.get("Astral Dreadnought")?.name).toBe("Астральний дредноут");
  });

  it("бере назви рис зі словника, ратифікованого глосарію й 2024-двійника", () => {
    expect(catalog.get("Balor")?.actions).toContain("<b>Довгий меч{{Longsword}}.</b>");
    expect(catalog.get("Belaphoss")?.actions).toContain("<b>Велика сокира{{Greataxe}}.</b>");
    expect(catalog.get("Drow Matron Mother")?.actions).toContain("<b>Жезл щупалець{{Tentacle Rod}}.</b>");
    expect(catalog.get("Balor")?.specialAbilities).toContain("<b>Передсмертні корчі{{Death Throes}}.</b>");
    expect(catalog.get("Lich")?.legendaryActions).toContain("<b>Жахливий погляд{{Frightening Gaze}} (коштує 2 дії).</b>");
    expect(catalog.get("Lich")?.legendaryActions).toContain("<b>Порушення життя{{Disrupt Life}} (коштує 3 дії).</b>");
    expect(catalog.get("Ancient Copper Dragon")?.actions).toContain("<b>Зміна подоби{{Change Shape}}.</b>");
  });

  it("тримає «Аура страху» піт фінда за 2014-корпусом, а не «Аура жаху» 2024-двійника", () => {
    expect(catalog.get("Pit Fiend")?.specialAbilities).toContain("<b>Аура страху{{Fear Aura}}.</b>");
    expect(catalog.get("Pit Fiend")?.specialAbilities).not.toContain("Аура жаху");
  });

  it("тримає «Паралізуючий дотик» ліча за 2014-корпусом, а не «Паралізувальний» 2024-двійника", () => {
    expect(catalog.get("Lich")?.actions).toContain("<b>Паралізуючий дотик{{Paralyzing Touch}}.</b>");
    expect(catalog.get("Lich")?.actions).not.toContain("Паралізувальний");
    expect(catalog.get("Lich")?.legendaryActions).not.toContain("Паралізувальний");
  });

  it("перетирає легасі-назви рис, заради чого KR12.3 і існує", () => {
    expect(catalog.get("Balor")?.actions).not.toContain("Меч блискавки");
    expect(catalog.get("Balor")?.actions).not.toContain("Вогняний батіг");
    expect(catalog.get("Balor")?.specialAbilities).not.toContain("Передсмертний вибух");
    expect(catalog.get("Pit Fiend")?.actions).toContain("<b>Хвіст{{Tail}}.</b>");
    expect(catalog.get("Lich")?.specialAbilities).not.toContain("Філактерія");
    expect(catalog.get("Lich")?.specialAbilities).toContain("<b>Відродження{{Rejuvenation}}.</b>");
    expect(catalog.get("Lich")?.specialAbilities).not.toContain("Легендарний опір (3/день)");
  });

  it("девʼятнадцять відкладених лишаються pending, а блокований закрила добірка", () => {
    for (const slug of [
      ...BATCH_TWENTY_EIGHT_DEFERRED_SLUGS,
      ...BATCH_TWENTY_EIGHT_BLOCKED_SLUGS,
    ]) {
      const row = manifest.find((r) => r.edition === "RULES_2014" && r.slug === slug);
      expect(row?.status).toBe(expectedStatusAfterGleaning(slug));
      expect(row?.batch).toBe(28);
    }
    expect(BATCH_TWENTY_EIGHT_BLOCKED_SLUGS.size).toBe(1);
  });

  it("«Princes of the Apocalypse» і тег «Bard» закриті рішенням 2026-08-21", () => {
    expect(findSourceKey2014("Adventures (Princes of the Apocalypse)")).toBe("POTA");
    expect(dictionary.DND_DICTIONARY.creatureTypeTags.bard).toBe("Бард");
  });
});

describe("KR12.3 — партія 27 у зібраному каталозі 2014", () => {
  const catalog = byNameEng(getAllCreatures("RULES_2014"));
  const pending = new Set([
    ...BATCH_TWENTY_SEVEN_DEFERRED_SLUGS,
    ...BATCH_TWENTY_SEVEN_BLOCKED_SLUGS,
  ]);

  it("кожна перекладена істота партії 27 має українську назву, опис дій і коректний ruleset", () => {
    for (const row of manifest.filter((r) => r.edition === "RULES_2014" && r.batch === 27)) {
      if (pending.has(row.slug)) continue;
      const creature = catalog.get(row.nameEng);
      expect(creature, `${row.nameEng} відсутня в каталозі`).toBeDefined();
      expect(creature!.creatureId).toBe(row.creatureId);
      expect(creature!.ruleset).toBe("RULES_2014");
      expect(creature!.name).toMatch(/[Ѐ-ӿ]/);
      expect(creature!.actions).toMatch(/[Ѐ-ӿ]/);
    }
  });

  it("тримає два fields-обходи мов партії 27", () => {
    expect(catalog.get("Iron Golem")?.languages).toBe(
      "розуміє мови свого творця, але не може говорити"
    );
    expect(catalog.get("Nagpa")?.languages).toBe("Загальна плюс до пʼяти інших мов");
    for (const nameEng of ["Iron Golem", "Nagpa"]) {
      expect(catalog.get(nameEng)?.languages).not.toMatch(/[A-Za-z]{3}/);
    }
  });

  it("тримає чотири fields-обходи резисту, де «nonmagical attacks» ламає список", () => {
    for (const nameEng of ["Marilith", "Goristro"]) {
      expect(catalog.get(nameEng)?.damageResistance).toBe(
        "Холодна, Вогняна, Блискавична; Дробляча, Колюча, Рубляча від немагічної зброї"
      );
    }
    expect(catalog.get("Planetar")?.damageResistance).toBe(
      "Променева; Дробляча, Колюча, Рубляча від немагічної зброї"
    );
    expect(catalog.get("Blue Abishai")?.damageResistance).toBe(
      "Холодна; Дробляча, Колюча, Рубляча від немагічної, не посрібленої зброї"
    );
    for (const nameEng of ["Marilith", "Goristro", "Planetar", "Blue Abishai"]) {
      expect(catalog.get(nameEng)?.damageResistance).not.toMatch(/[A-Za-z]{3}/);
    }
  });

  it("тримає перший за ціль резист «від магічної зброї» — напівліч", () => {
    expect(catalog.get("Demilich")?.damageResistance).toBe(
      "Дробляча, Колюча, Рубляча від магічної зброї"
    );
    expect(catalog.get("Demilich")?.damageResistance).not.toMatch(/[A-Za-z]{3}/);
  });

  it("тримає два fields-обходи імунітету партії 27", () => {
    expect(catalog.get("Iron Golem")?.damageImmunity).toBe(
      "Вогняна, Отруйна, Психічна; Дробляча, Колюча, Рубляча від немагічної, не адамантинової зброї"
    );
    expect(catalog.get("Demilich")?.damageImmunity).toBe(
      "Некротична, Отруйна, Психічна; Дробляча, Колюча, Рубляча від немагічної зброї"
    );
    for (const nameEng of ["Iron Golem", "Demilich"]) {
      expect(catalog.get(nameEng)?.damageImmunity).not.toMatch(/[A-Za-z]{3}/);
    }
  });

  it("тримає перший за ціль fields-обхід КЗ на магічному предметі — Лаерал", () => {
    expect(catalog.get("Laeral Silverhand")?.ac).toBe("18 (мантія архімага)");
    expect(catalog.get("Laeral Silverhand")?.ac).not.toMatch(/[A-Za-z]{3}/);
  });

  it("двадцять восьмий запис дефекту «список заклинань поза <p>-абзацом» — шість списків за spells.json", () => {
    expect(catalog.get("Planetar")?.specialAbilities).toContain("Клинковий барʼєр [Blade Barrier]");
    expect(catalog.get("Blue Abishai")?.actions).toContain("Стіна енергії [Wall of Force]");
    expect(catalog.get("Death Knight")?.specialAbilities).toContain("Паляча кара [Searing Smite]");
    expect(catalog.get("Laeral Silverhand")?.specialAbilities).toContain("Зупинка часу [Time Stop]");
    expect(catalog.get("Nagpa")?.actions).toContain("Етерність [Etherealness]");
    expect(catalog.get("Drow Favored Consort")?.actions).toContain("Вогники фей [Faerie fire]");
  });

  it("восьма прогалина findSpellNames: «raise dead» планетара надруковано без <a>-посилання", () => {
    expect(catalog.get("Planetar")?.specialAbilities).toContain("Оживлення мерців [Raise Dead]");
  });

  it("девʼята прогалина findSpellNames — новий підклас: порожній <a> Лаерал", () => {
    expect(catalog.get("Laeral Silverhand")?.specialAbilities).toContain(
      "Штукарство [Prestidigitation]"
    );
    expect(catalog.get("Laeral Silverhand")?.specialAbilities).not.toContain(", ,");
  });

  it("склеєне джерелом «15d 6» драконячої черепахи зібрано назад у 15к6", () => {
    expect(catalog.get("Dragon Turtle")?.actions).toContain("52 (15к6) вогняних ушкоджень");
    expect(catalog.get("Dragon Turtle")?.actions).not.toContain("15к 6");
  });

  it("повертає загублені парсером пункти Чаклунського вогню в текст самої дії", () => {
    const actions = catalog.get("Laeral Silverhand")?.actions ?? "";
    expect(actions).toContain("Чаклунський вогонь{{Spellfire}} (перезаряджається після тривалого відпочинку)");
    expect(actions).toContain("• Вона може дихати під водою.");
    expect(actions).toContain("Відродження [Revivify]");
    expect(actions).toContain("Лікування ран [Cure Wounds]");
  });

  it("перевикористовує id чотирьох записів партії 27, замінюючи, а не додаючи до успадкованого каталогу", () => {
    const list = getAllCreatures("RULES_2014");
    expect(new Set(list.map((c) => c.creatureId)).size).toBe(list.length);
    expect(list.filter((c) => c.creatureId === 193).length).toBe(1);
    expect(catalog.get("Iron Golem")?.creatureId).toBe(193);
    expect(catalog.get("Marilith")?.creatureId).toBe(290);
    expect(catalog.get("Planetar")?.creatureId).toBe(242);
    expect(catalog.get("Dragon Turtle")?.creatureId).toBe(291);
    expect(catalog.get("Iron Golem")?.name).toBe("Залізний голем");
    expect(catalog.get("Marilith")?.name).toBe("Маріліт (Шестирука демониця)");
    expect(catalog.get("Planetar")?.name).toBe("Планетар (Вищий ангел)");
    expect(catalog.get("Dragon Turtle")?.name).toBe("Драконяча черепаха (Драгон Тьортл)");
  });

  it("додає сім нових записів партії 27", () => {
    expect(catalog.get("Blue Abishai")?.name).toBe("Синій абішай");
    expect(catalog.get("Death Knight")?.name).toBe("Лицар смерті");
    expect(catalog.get("Goristro")?.name).toBe("Гористро");
    expect(catalog.get("Laeral Silverhand")?.name).toBe("Лаерал Сілверхенд");
    expect(catalog.get("Nagpa")?.name).toBe("Нагпа");
    expect(catalog.get("Demilich")?.name).toBe("Напівліч");
    expect(catalog.get("Drow Favored Consort")?.name).toBe("Дроу-улюблений консорт");
  });

  it("бере назви рис зі словника, ратифікованого глосарію й 2024-двійника", () => {
    expect(catalog.get("Planetar")?.actions).toContain("<b>Дворучний меч{{Greatsword}}.</b>");
    expect(catalog.get("Planetar")?.specialAbilities).toContain("<b>Божественна обізнаність{{Divine Awareness}}.</b>");
    expect(catalog.get("Marilith")?.specialAbilities).toContain("<b>Реактивна майстерність{{Reactive}}.</b>");
    expect(catalog.get("Marilith")?.reactions).toContain("<b>Парирування{{Parry}}.</b>");
    expect(catalog.get("Death Knight")?.specialAbilities).toContain("<b>Шикування нежиті{{Marshal Undead}}.</b>");
    expect(catalog.get("Death Knight")?.actions).toContain("Сфера пекельного вогню{{Hellfire Orb}} (1 раз на день)");
    expect(catalog.get("Demilich")?.legendaryActions).toContain("Виснаження енергії{{Energy Drain}} (коштує 2 дії)");
    expect(catalog.get("Drow Favored Consort")?.actions).toContain("<b>Шабля{{Scimitar}}.</b>");
    expect(catalog.get("Goristro")?.actions).toContain("<b>Копито{{Hoof}}.</b>");
    expect(catalog.get("Goristro")?.actions).toContain("<b>Удар рогами{{Gore}}.</b>");
  });

  it("тримає «подих» замість «дихання» для обох подихів партії", () => {
    expect(catalog.get("Iron Golem")?.actions).toContain("Отруйний подих{{Poison Breath}} (перезарядка 6)");
    expect(catalog.get("Iron Golem")?.actions).not.toContain("Отруйне дихання");
    expect(catalog.get("Dragon Turtle")?.actions).toContain("Паровий подих{{Steam Breath}} (перезарядка 5–6)");
  });

  it("розводить Avoidance і Evasion, що обидва читаються як ухилення", () => {
    expect(catalog.get("Demilich")?.specialAbilities).toContain("<b>Ухиляння{{Avoidance}}.</b>");
    expect(catalog.get("Demilich")?.specialAbilities).not.toContain("Ухилення");
  });

  it("перетирає легасі-назви рис, заради чого KR12.3 і існує", () => {
    expect(catalog.get("Dragon Turtle")?.specialAbilities).toContain("<b>Амфібія{{Amphibious}}.</b>");
    expect(catalog.get("Dragon Turtle")?.specialAbilities).not.toContain("Земноводність");
    expect(catalog.get("Dragon Turtle")?.actions).toContain("<b>Кіготь{{Claw}}.</b>");
    expect(catalog.get("Dragon Turtle")?.actions).not.toContain("<b>Кігті.</b>");
    expect(catalog.get("Planetar")?.actions).not.toContain("Великий меч");
    expect(catalog.get("Planetar")?.actions).toContain("Цілющий доторк{{Healing Touch}} (4 рази на день)");
    expect(catalog.get("Planetar")?.specialAbilities).not.toContain("Божественне усвідомлення");
    expect(catalog.get("Marilith")?.reactions).not.toContain("Парування");
    expect(catalog.get("Iron Golem")?.actions).not.toContain("(перезарядка 5-6)");
  });

  it("вісімнадцять відкладених лишаються pending, а блокований закрила добірка", () => {
    for (const slug of [
      ...BATCH_TWENTY_SEVEN_DEFERRED_SLUGS,
      ...BATCH_TWENTY_SEVEN_BLOCKED_SLUGS,
    ]) {
      const row = manifest.find((r) => r.edition === "RULES_2014" && r.slug === slug);
      expect(row?.status).toBe(expectedStatusAfterGleaning(slug));
      expect(row?.batch).toBe(27);
    }
    expect(BATCH_TWENTY_SEVEN_BLOCKED_SLUGS.size).toBe(1);
  });

  it("«Curse of Strahd» більше не невідоме джерело — enum уже мав COS", () => {
    expect(findSourceKey2014("Adventures (Curse of Strahd)")).toBe("COS");
    expect(findSourceKey2014("Adventures (Quests from the Infinite Staircase)")).toBe("QFTIS");
  });
});

describe("KR12.3 — партія 26 у зібраному каталозі 2014", () => {
  const catalog = byNameEng(getAllCreatures("RULES_2014"));
  const pending = new Set([
    ...BATCH_TWENTY_SIX_DEFERRED_SLUGS,
    ...BATCH_TWENTY_SIX_BLOCKED_SLUGS,
  ]);

  it("кожна перекладена істота партії 26 має українську назву, опис дій і коректний ruleset", () => {
    for (const row of manifest.filter((r) => r.edition === "RULES_2014" && r.batch === 26)) {
      if (pending.has(row.slug)) continue;
      const creature = catalog.get(row.nameEng);
      expect(creature, `${row.nameEng} відсутня в каталозі`).toBeDefined();
      expect(creature!.creatureId).toBe(row.creatureId);
      expect(creature!.ruleset).toBe("RULES_2014");
      expect(creature!.name).toMatch(/[Ѐ-ӿ]/);
      expect(creature!.actions).toMatch(/[Ѐ-ӿ]/);
    }
  });

  it("тримає три fields-обходи мов партії 26", () => {
    expect(catalog.get("Vampire")?.languages).toBe("мови, які знав за життя");
    expect(catalog.get("Skull Lord")?.languages).toBe("усі мови, які знав за життя");
    expect(catalog.get("Retriever")?.languages).toBe(
      "розуміє Мову безодні, Ельфійську та Підземну, але не може ними говорити"
    );
    for (const nameEng of ["Vampire", "Skull Lord", "Retriever"]) {
      expect(catalog.get(nameEng)?.languages).not.toMatch(/[A-Za-z]{3}/);
    }
  });

  it("тримає пʼять fields-обходів резисту, де «nonmagical attacks» ламає список", () => {
    for (const nameEng of ["Ultroloth", "Nabassu"]) {
      expect(catalog.get(nameEng)?.damageResistance).toBe(
        "Холодна, Вогняна, Блискавична; Дробляча, Колюча, Рубляча від немагічної зброї"
      );
    }
    expect(catalog.get("Vampire")?.damageResistance).toBe(
      "Некротична; Дробляча, Колюча, Рубляча від немагічної зброї"
    );
    expect(catalog.get("Ice Devil")?.damageResistance).toBe(
      "Дробляча, Колюча, Рубляча від немагічної, не посрібленої зброї"
    );
    expect(catalog.get("Green Abishai")?.damageResistance).toBe(
      "Холодна; Дробляча, Колюча, Рубляча від немагічної, не посрібленої зброї"
    );
    expect(catalog.get("Skull Lord")?.damageResistance).toBe(
      "Холодна, Некротична; Дробляча, Колюча, Рубляча від немагічної зброї"
    );
    for (const nameEng of ["Ultroloth", "Nabassu", "Vampire", "Ice Devil", "Green Abishai", "Skull Lord"]) {
      expect(catalog.get(nameEng)?.damageResistance).not.toMatch(/[A-Za-z]{3}/);
    }
  });

  it("тримає два fields-обходи імунітету партії 26", () => {
    expect(catalog.get("Rakshasa")?.damageImmunity).toBe(
      "Дробляча, Колюча, Рубляча від немагічної зброї"
    );
    expect(catalog.get("Retriever")?.damageImmunity).toBe(
      "Некротична, Отруйна, Психічна; Дробляча, Колюча, Рубляча від немагічної, не адамантинової зброї"
    );
    for (const nameEng of ["Rakshasa", "Retriever"]) {
      expect(catalog.get(nameEng)?.damageImmunity).not.toMatch(/[A-Za-z]{3}/);
    }
  });

  it("тримає перший за ціль fields-обхід вразливості — ракшаса", () => {
    expect(catalog.get("Rakshasa")?.damageVulnerability).toBe(
      "Колюча від магічної зброї в руках добрих істот"
    );
    expect(catalog.get("Rakshasa")?.damageVulnerability).not.toMatch(/[A-Za-z]{3}/);
  });

  it("двадцять сьомий запис дефекту «список заклинань поза <p>-абзацом» — сім списків за spells.json", () => {
    expect(catalog.get("Rakshasa")?.specialAbilities).toContain("Істинний зір [True Seeing]");
    expect(catalog.get("Storm Giant")?.specialAbilities).toContain("Контроль погоди [Control Weather]");
    expect(catalog.get("Ultroloth")?.specialAbilities).toContain("Вогняний шторм [Fire Storm]");
    expect(catalog.get("Drow Inquisitor")?.actions).toContain("Дивотворство [Thaumaturgy]");
    expect(catalog.get("Retriever")?.actions).toContain("Павутиння [Web]");
    expect(catalog.get("Green Abishai")?.actions).toContain("Масове навіювання [Mass Suggestion]");
    expect(catalog.get("Skull Lord")?.actions).toContain("Вбивча хмара [Cloudkill]");
  });

  it("сьома прогалина findSpellNames: «light» штормового велетня надруковано без <a>-посилання", () => {
    expect(catalog.get("Storm Giant")?.specialAbilities).toContain("Світло [Light]");
  });

  it("склеєне джерелом число «1 50-foot» тирана смерті зібрано назад у 150 футів", () => {
    expect(catalog.get("Death Tyrant")?.specialAbilities).toContain("завдовжки 150 футів");
    expect(catalog.get("Death Tyrant")?.specialAbilities).not.toContain("1 50");
  });

  it("розводить Paralyzing Ray і Paralyzing Beam, що стали в одній партії", () => {
    expect(catalog.get("Death Tyrant")?.actions).toContain("2- Паралізуючий промінь");
    expect(catalog.get("Retriever")?.actions).toContain("Паралітичний промінь{{Paralyzing Beam}} (перезарядка 5–6)");
    expect(catalog.get("Retriever")?.actions).not.toContain("Паралізуючий промінь");
  });

  it("перевикористовує id трьох записів партії 26, замінюючи, а не додаючи до успадкованого каталогу", () => {
    const list = getAllCreatures("RULES_2014");
    expect(new Set(list.map((c) => c.creatureId)).size).toBe(list.length);
    expect(list.filter((c) => c.creatureId === 155).length).toBe(1);
    expect(catalog.get("Vampire")?.creatureId).toBe(155);
    expect(catalog.get("Storm Giant")?.creatureId).toBe(225);
    expect(catalog.get("Ice Devil")?.creatureId).toBe(314);
    expect(catalog.get("Vampire")?.name).toBe("Вампір (Лорд ночі)");
    expect(catalog.get("Storm Giant")?.name).toBe("Штормовий велетень (Сторм Джайент)");
    expect(catalog.get("Ice Devil")?.name).toBe("Крижаний диявол (Гелугон)");
  });

  it("додає десять нових записів партії 26", () => {
    expect(catalog.get("Rakshasa")?.name).toBe("Ракшаса");
    expect(catalog.get("Ultroloth")?.name).toBe("Ультролот");
    expect(catalog.get("Young Red Shadow Dragon")?.name).toBe("Молодий червоний тіньовий дракон");
    expect(catalog.get("Death Tyrant")?.name).toBe("Тиран смерті");
    expect(catalog.get("Drow Inquisitor")?.name).toBe("Дроу-інквізитор");
    expect(catalog.get("Retriever")?.name).toBe("Добувач");
    expect(catalog.get("Green Abishai")?.name).toBe("Зелений абішай");
    expect(catalog.get("Nabassu")?.name).toBe("Набасу");
    expect(catalog.get("Purple Worm")?.name).toBe("Пурпуровий хробак");
    expect(catalog.get("Skull Lord")?.name).toBe("Лорд черепів");
  });

  it("бере назви рис зі словника, ратифікованого глосарію й 2024-двійника", () => {
    expect(catalog.get("Storm Giant")?.actions).toContain("<b>Дворучний меч{{Greatsword}}.</b>");
    expect(catalog.get("Storm Giant")?.actions).toContain("Блискавичний удар{{Lightning Strike}} (перезарядка 5–6)");
    expect(catalog.get("Ultroloth")?.actions).toContain("<b>Довгий меч{{Longsword}}.</b>");
    expect(catalog.get("Ultroloth")?.actions).toContain("<b>Гіпнотичний погляд{{Hypnotic Gaze}}.</b>");
    expect(catalog.get("Vampire")?.specialAbilities).toContain("<b>Туманна втеча{{Misty Escape}}.</b>");
    expect(catalog.get("Young Red Shadow Dragon")?.specialAbilities).toContain("<b>Жива тінь{{Living Shadow}}.</b>");
    expect(catalog.get("Death Tyrant")?.specialAbilities).toContain("<b>Конус негативної енергії{{Negative Energy Cone}}.</b>");
    expect(catalog.get("Retriever")?.actions).toContain("<b>Передня лапа{{Foreleg}}.</b>");
    expect(catalog.get("Skull Lord")?.actions).toContain("<b>Смертоносний промінь{{Deathly Ray}}.</b>");
    expect(catalog.get("Purple Worm")?.actions).toContain("<b>Жало хвоста{{Tail Stinger}}.</b>");
  });

  it("тримає «подих» для тіньового дракона всупереч «диханню» 2024-двійника", () => {
    expect(catalog.get("Young Red Shadow Dragon")?.actions).toContain(
      "Тіньовий подих{{Shadow Breath}} (перезарядка 5–6)"
    );
    expect(catalog.get("Young Red Shadow Dragon")?.actions).not.toContain("Тіньове дихання");
  });

  it("тримає обмеження за подобою в назвах дій вампіра", () => {
    const actions = catalog.get("Vampire")?.actions ?? "";
    expect(actions).toContain("Мультиатака{{Multiattack}} (лише в подобі вампіра)");
    expect(actions).toContain("Беззбройний удар{{Unarmed Strike}} (лише в подобі вампіра)");
    expect(actions).toContain("Укус{{Bite}} (лише в подобі кажана чи вампіра)");
    expect(actions).toContain("Діти ночі{{Children of the Night}} (1 раз на день)");
    expect(catalog.get("Vampire")?.legendaryActions).toContain("Укус{{Bite}} (коштує 2 дії)");
  });

  it("перетирає легасі-назви рис, заради чого KR12.3 і існує", () => {
    expect(catalog.get("Vampire")?.specialAbilities).toContain("<b>Зміна подоби{{Shapechanger}}.</b>");
    expect(catalog.get("Vampire")?.specialAbilities).not.toContain("Зміна форми");
    expect(catalog.get("Vampire")?.specialAbilities).toContain("Легендарний опір{{Legendary Resistance}} (3 рази на день)");
    expect(catalog.get("Vampire")?.specialAbilities).not.toContain("(3/день)");
    expect(catalog.get("Vampire")?.actions).not.toContain("Зачарування");
    expect(catalog.get("Storm Giant")?.specialAbilities).toContain("<b>Амфібія{{Amphibious}}.</b>");
    expect(catalog.get("Storm Giant")?.specialAbilities).not.toContain("Земноводність");
    expect(catalog.get("Storm Giant")?.actions).not.toContain("Розряд блискавки");
    expect(catalog.get("Storm Giant")?.actions).not.toContain("Великий меч");
    expect(catalog.get("Ice Devil")?.specialAbilities).toContain("<b>Диявольський зір{{Devil's Sight}}.</b>");
    expect(catalog.get("Ice Devil")?.actions).toContain("<b>Кігті{{Claws}}.</b>");
    expect(catalog.get("Ice Devil")?.actions).not.toContain("спис льоду");
  });

  it("сімнадцять відкладених записів лишаються pending, блокувань поза дефектом немає", () => {
    for (const slug of [
      ...BATCH_TWENTY_SIX_DEFERRED_SLUGS,
      ...BATCH_TWENTY_SIX_BLOCKED_SLUGS,
    ]) {
      const row = manifest.find((r) => r.edition === "RULES_2014" && r.slug === slug);
      expect(row?.status).toBe(expectedStatusAfterGleaning(slug));
      expect(row?.batch).toBe(26);
    }
    expect(BATCH_TWENTY_SIX_BLOCKED_SLUGS.size).toBe(0);
  });
});

describe("KR12.3 — партія 25 у зібраному каталозі 2014", () => {
  const catalog = byNameEng(getAllCreatures("RULES_2014"));
  const pending = new Set([
    ...BATCH_TWENTY_FIVE_DEFERRED_SLUGS,
    ...BATCH_TWENTY_FIVE_BLOCKED_SLUGS,
  ]);

  it("кожна перекладена істота партії 25 має українську назву, опис дій і коректний ruleset", () => {
    for (const row of manifest.filter((r) => r.edition === "RULES_2014" && r.batch === 25)) {
      if (pending.has(row.slug)) continue;
      const creature = catalog.get(row.nameEng);
      expect(creature, `${row.nameEng} відсутня в каталозі`).toBeDefined();
      expect(creature!.creatureId).toBe(row.creatureId);
      expect(creature!.ruleset).toBe("RULES_2014");
      expect(creature!.name).toMatch(/[Ѐ-ӿ]/);
      expect(creature!.actions).toMatch(/[Ѐ-ӿ]/);
    }
  });

  it("тримає чотири fields-обходи мов партії 25", () => {
    expect(catalog.get("Archdruid")?.languages).toBe("Друїдська та будь-які дві мови");
    expect(catalog.get("Archmage")?.languages).toBe("будь-які шість мов");
    expect(catalog.get("Warlord")?.languages).toBe("будь-які дві мови");
    expect(catalog.get("Eidolon")?.languages).toBe("мови, які знав за життя");
    expect(catalog.get("Boneclaw")?.languages).toBe(
      "Загальна плюс одна мова, якою говорить його господар"
    );
    expect(catalog.get("Drow Arachnomancer")?.languages).toBe(
      "Ельфійська, Підземна, може говорити з павуками"
    );
    for (const nameEng of ["Archdruid", "Warlord", "Eidolon", "Boneclaw", "Drow Arachnomancer"]) {
      expect(catalog.get(nameEng)?.languages).not.toMatch(/[A-Za-z]{3}/);
    }
  });

  it("тримає шість fields-обходів резисту, де «nonmagical attacks» ламає список", () => {
    for (const nameEng of ["Yagnoloth", "Arcanaloth", "Nalfeshnee"]) {
      expect(catalog.get(nameEng)?.damageResistance).toBe(
        "Холодна, Вогняна, Блискавична; Дробляча, Колюча, Рубляча від немагічної зброї"
      );
    }
    expect(catalog.get("Eidolon")?.damageResistance).toBe(
      "Кислотна, Вогняна, Блискавична, Громова; Дробляча, Колюча, Рубляча від немагічної зброї"
    );
    expect(catalog.get("Erinyes")?.damageResistance).toBe(
      "Холодна; Дробляча, Колюча, Рубляча від немагічної, не посрібленої зброї"
    );
    expect(catalog.get("Narzugon")?.damageResistance).toBe(
      "Кислотна, Холодна; Дробляча, Колюча, Рубляча від немагічної, не посрібленої зброї"
    );
    for (const nameEng of ["Yagnoloth", "Arcanaloth", "Nalfeshnee", "Eidolon", "Erinyes", "Narzugon"]) {
      expect(catalog.get(nameEng)?.damageResistance).not.toMatch(/[A-Za-z]{3}/);
    }
  });

  it("тримає резист архімага, єдиний за ціль «damage from spells»", () => {
    expect(catalog.get("Archmage")?.damageResistance).toBe(
      "Ушкодження від заклинань; Дробляча, Колюча, Рубляча від немагічної зброї (від Камʼяної шкіри [Stoneskin])"
    );
  });

  it("двадцять шостий запис дефекту «список заклинань поза <p>-абзацом» — шість списків за spells.json", () => {
    expect(catalog.get("Yagnoloth")?.actions).toContain("Заряд блискавки [Lightning Bolt]");
    expect(catalog.get("Arcanaloth")?.specialAbilities).toContain(
      "Літаючий диск Тензера [Tenser's Floating Disk]"
    );
    expect(catalog.get("Archdruid")?.actions).toContain("Деревний шлях [Tree Stride]");
    expect(catalog.get("Archmage")?.specialAbilities).toContain("Зупинка часу [Time Stop]");
    expect(catalog.get("Ki-rin")?.actions).toContain("Прогулянка з вітром [Wind Walk]");
    expect(catalog.get("Drow Arachnomancer")?.actions).toContain("Нашестя комах [Insect Plague]");
  });

  it("шоста прогалина findSpellNames: «fly» архімага надруковано без <a>-посилання", () => {
    expect(catalog.get("Archmage")?.specialAbilities).toContain("Політ [Fly]");
  });

  it("розкриває друкарську помилку джерела «counterspeiiJear» у два заклинання арканалота", () => {
    expect(catalog.get("Arcanaloth")?.specialAbilities).toContain(
      "Контрчари [Counterspell], Страх [Fear], Вогнекуля [Fireball]"
    );
    expect(catalog.get("Arcanaloth")?.specialAbilities).not.toContain("counterspeiiJear");
  });

  it("перевикористовує id пʼяти записів партії 25, замінюючи, а не додаючи до успадкованого каталогу", () => {
    const list = getAllCreatures("RULES_2014");
    expect(new Set(list.map((c) => c.creatureId)).size).toBe(list.length);
    expect(list.filter((c) => c.creatureId === 133).length).toBe(1);
    expect(catalog.get("Archmage")?.creatureId).toBe(133);
    expect(catalog.get("Boneclaw")?.creatureId).toBe(431);
    expect(catalog.get("Ki-rin")?.creatureId).toBe(428);
    expect(catalog.get("Beholder")?.creatureId).toBe(208);
    expect(catalog.get("Nalfeshnee")?.creatureId).toBe(318);
    expect(catalog.get("Beholder")?.name).toBe("Спостерігач (Бехолдер)");
    expect(catalog.get("Nalfeshnee")?.name).toBe("Нальфешні (Кабанодемон)");
    expect(catalog.get("Boneclaw")?.name).toBe("Кістяний кіготь");
  });

  it("додає десять нових записів партії 25", () => {
    expect(catalog.get("Yagnoloth")?.name).toBe("Ягнолот");
    expect(catalog.get("Arcanaloth")?.name).toBe("Арканалот");
    expect(catalog.get("Archdruid")?.name).toBe("Архідруїд");
    expect(catalog.get("Eidolon")?.name).toBe("Ейдолон");
    expect(catalog.get("Erinyes")?.name).toBe("Ерінія");
    expect(catalog.get("Gray Render")?.name).toBe("Сірий роздирач");
    expect(catalog.get("Warlord")?.name).toBe("Воєначальник");
    expect(catalog.get("Devourer")?.name).toBe("Пожирач");
    expect(catalog.get("Drow Arachnomancer")?.name).toBe("Дроу-арахномант");
    expect(catalog.get("Narzugon")?.name).toBe("Нарзугон");
  });

  it("бере назви рис зі словника, ратифікованого глосарію й 2024-двійника", () => {
    expect(catalog.get("Archdruid")?.actions).toContain("<b>Посох{{Staff}}.</b>");
    expect(catalog.get("Archdruid")?.actions).toContain("<b>Дикий вогонь{{Wildfire}}.</b>");
    expect(catalog.get("Warlord")?.actions).toContain("<b>Дворучний меч{{Greatsword}}.</b>");
    expect(catalog.get("Warlord")?.actions).not.toContain("Великий меч");
    expect(catalog.get("Nalfeshnee")?.actions).toContain("Аура жаху{{Horror Nimbus}} (перезарядка 5–6)");
    expect(catalog.get("Ki-rin")?.legendaryActions).toContain("<b>Кара{{Smite}}.</b>");
    expect(catalog.get("Boneclaw")?.bonusActions).toContain("Тіньова непомітність");
  });

  it("тримає ратифіковані обмеження за подобою дроу-арахноманта разом із перезарядкою", () => {
    expect(catalog.get("Drow Arachnomancer")?.actions).toContain("Укус{{Bite}} (лише в подобі павука)");
    expect(catalog.get("Drow Arachnomancer")?.actions).toContain(
      "Отруйний дотик{{Poisonous Touch}} (лише в подобі гуманоїда)"
    );
    expect(catalog.get("Drow Arachnomancer")?.actions).toContain(
      "Павутина{{Web}} (лише в подобі павука; перезарядка 5–6)"
    );
    expect(catalog.get("Drow Arachnomancer")?.bonusActions).toContain(
      "Зміна подоби{{Change Shape}} (перезаряджається після короткого чи тривалого відпочинку)"
    );
  });

  it("тримає повний ряд очних променів спостерігача за корпусним глосарієм", () => {
    const actions = catalog.get("Beholder")?.actions ?? "";
    for (const ray of [
      "1- Промінь чарування",
      "2- Паралізуючий промінь",
      "3- Промінь страху",
      "4- Промінь уповільнення",
      "5- Промінь виснаження",
      "6- Телекінетичний промінь",
      "7- Сонний промінь",
      "8- Промінь окамʼяніння",
      "9- Промінь дезінтеграції",
      "10- Промінь смерті",
    ]) {
      expect(actions).toContain(ray);
    }
    expect(catalog.get("Beholder")?.legendaryActions).toContain("<b>Очний промінь{{Eye Ray}}.</b>");
  });

  it("перетирає легасі-назви рис, заради чого KR12.3 і існує", () => {
    expect(catalog.get("Archmage")?.specialAbilities).not.toContain("Чаклування (Чарівник 18 рівня)");
    expect(catalog.get("Ki-rin")?.specialAbilities).toContain("Опір магії");
    expect(catalog.get("Ki-rin")?.specialAbilities).not.toContain("Магічний опір");
    expect(catalog.get("Ki-rin")?.actions).toContain("<b>Копито{{Hoof}}.</b>");
    expect(catalog.get("Ki-rin")?.actions).not.toContain("Небесна кара");
    expect(catalog.get("Boneclaw")?.actions).toContain("<b>Колючий кіготь{{Piercing Claw}}.</b>");
    expect(catalog.get("Boneclaw")?.actions).not.toContain("Тіньовий кіготь");
    expect(catalog.get("Boneclaw")?.specialAbilities).not.toContain("Пасивна невидимість");
    expect(catalog.get("Nalfeshnee")?.actions).toContain("<b>Кіготь{{Claw}}.</b>");
    expect(catalog.get("Nalfeshnee")?.actions).not.toContain("Сяйво жаху");
    expect(catalog.get("Beholder")?.actions).toContain("<b>Очні промені{{Eye Rays}}.</b>");
    expect(catalog.get("Beholder")?.actions).not.toContain("Промінь чарування, паралічу");
  });

  it("пʼятнадцять відкладених записів лишаються pending, блокувань поза дефектом немає", () => {
    for (const slug of [
      ...BATCH_TWENTY_FIVE_DEFERRED_SLUGS,
      ...BATCH_TWENTY_FIVE_BLOCKED_SLUGS,
    ]) {
      const row = manifest.find((r) => r.edition === "RULES_2014" && r.slug === slug);
      expect(row?.status).toBe(expectedStatusAfterGleaning(slug));
      expect(row?.batch).toBe(25);
    }
    expect(BATCH_TWENTY_FIVE_BLOCKED_SLUGS.size).toBe(0);
  });
});

describe("KR12.3 — партія 24 у зібраному каталозі 2014", () => {
  const catalog = byNameEng(getAllCreatures("RULES_2014"));
  const pending = new Set([
    ...BATCH_TWENTY_FOUR_DEFERRED_SLUGS,
    ...BATCH_TWENTY_FOUR_BLOCKED_SLUGS,
  ]);

  it("кожна перекладена істота партії 24 має українську назву, опис дій і коректний ruleset", () => {
    for (const row of manifest.filter((r) => r.edition === "RULES_2014" && r.batch === 24)) {
      if (pending.has(row.slug)) continue;
      const creature = catalog.get(row.nameEng);
      expect(creature, `${row.nameEng} відсутня в каталозі`).toBeDefined();
      expect(creature!.creatureId).toBe(row.creatureId);
      expect(creature!.ruleset).toBe("RULES_2014");
      expect(creature!.name).toMatch(/[Ѐ-ӿ]/);
      expect(creature!.actions).toMatch(/[Ѐ-ӿ]/);
    }
  });

  it("тримає fields-обхід мов камʼяного голема", () => {
    expect(catalog.get("Stone Golem")?.languages).toBe(
      "розуміє мови свого творця, але не може говорити"
    );
    expect(catalog.get("Stone Golem")?.languages).not.toMatch(/[A-Za-z]{3}/);
  });

  it("тримає fields-обхід імунітету й резисту, де «nonmagical attacks» ламає список", () => {
    expect(catalog.get("Stone Golem")?.damageImmunity).toBe(
      "Отруйна, Психічна; Дробляча, Колюча, Рубляча від немагічної, не адамантинової зброї"
    );
    expect(catalog.get("Yochlol")?.damageResistance).toBe(
      "Холодна, Вогняна, Блискавична; Дробляча, Колюча, Рубляча від немагічної зброї"
    );
    expect(catalog.get("Horned Devil")?.damageResistance).toBe(
      "Холодна; Дробляча, Колюча, Рубляча від немагічної, не посрібленої зброї"
    );
    expect(catalog.get("Stone Golem")?.damageImmunity).not.toMatch(/[A-Za-z]{3}/);
    for (const nameEng of ["Yochlol", "Horned Devil"]) {
      expect(catalog.get(nameEng)?.damageResistance).not.toMatch(/[A-Za-z]{3}/);
    }
  });

  it("двадцять пʼятий запис дефекту «список заклинань поза <p>-абзацом» — сім списків за spells.json", () => {
    expect(catalog.get("Winter Eladrin")?.actions).toContain("Завірюха [Sleet Storm]");
    expect(catalog.get("Yochlol")?.specialAbilities).toContain(
      "Підкорення особистості [Dominate Person]"
    );
    expect(catalog.get("Dao")?.specialAbilities).toContain("Фантомний вбивця [Phantasmal Killer]");
    expect(catalog.get("Djinni")?.specialAbilities).toContain("Прогулянка з вітром [Wind Walk]");
    expect(catalog.get("Efreeti")?.specialAbilities).toContain("Стіна вогню [Wall of Fire]");
    expect(catalog.get("Marid")?.specialAbilities).toContain("Контроль води [Control Water]");
    expect(catalog.get("Drow Shadowblade")?.actions).toContain("Вогники фей [Faerie fire]");
  });

  it("тримає уточнювачі стихійників за дужками назви заклинання", () => {
    expect(catalog.get("Dao")?.specialAbilities).toContain(
      "Зʼява стихійника [Conjure Elemental] (лише земляний елементаль)"
    );
    expect(catalog.get("Djinni")?.specialAbilities).toContain(
      "Зʼява стихійника [Conjure Elemental] (лише повітряний елементаль)"
    );
    expect(catalog.get("Efreeti")?.specialAbilities).toContain(
      "Зʼява стихійника [Conjure Elemental] (лише вогняний елементаль)"
    );
    expect(catalog.get("Marid")?.specialAbilities).toContain(
      "Зʼява стихійника [Conjure Elemental] (лише водяний елементаль)"
    );
    expect(catalog.get("Drow Shadowblade")?.actions).toContain(
      "Левітація [Levitate] (лише на себе)"
    );
  });

  it("перевикористовує id восьми записів партії 24, замінюючи, а не додаючи до успадкованого каталогу", () => {
    const list = getAllCreatures("RULES_2014");
    expect(new Set(list.map((c) => c.creatureId)).size).toBe(list.length);
    expect(list.filter((c) => c.creatureId === 192).length).toBe(1);
    expect(catalog.get("Stone Golem")?.creatureId).toBe(192);
    expect(catalog.get("Young Gold Dragon")?.creatureId).toBe(238);
    expect(catalog.get("Young Red Dragon")?.creatureId).toBe(227);
    expect(catalog.get("Djinni")?.creatureId).toBe(244);
    expect(catalog.get("Efreeti")?.creatureId).toBe(245);
    expect(catalog.get("Horned Devil")?.creatureId).toBe(313);
    expect(catalog.get("Remorhaz")?.creatureId).toBe(249);
    expect(catalog.get("Roc")?.creatureId).toBe(248);
    expect(catalog.get("Efreeti")?.name).toBe("Іфрит (Ефріті)");
    expect(catalog.get("Horned Devil")?.name).toBe("Рогатий диявол (Корнугон)");
    expect(catalog.get("Roc")?.name).toBe("Птах Рок");
  });

  it("додає сім нових записів партії 24", () => {
    expect(catalog.get("Summer Eladrin")?.name).toBe("Літній еладрин");
    expect(catalog.get("Winter Eladrin")?.name).toBe("Зимовий еладрин");
    expect(catalog.get("Yochlol")?.name).toBe("Йохлол");
    expect(catalog.get("Behir")?.name).toBe("Бехір");
    expect(catalog.get("Dao")?.name).toBe("Дао");
    expect(catalog.get("Drow Shadowblade")?.name).toBe("Дроу-тіньовий клинок");
    expect(catalog.get("Marid")?.name).toBe("Марід");
  });

  it("бере назви рис зі словника, ратифікованого глосарію, 2024-двійника й сідів фіч гравця", () => {
    expect(catalog.get("Stone Golem")?.actions).toContain("Уповільнення{{Slow}} (перезарядка 5–6)");
    expect(catalog.get("Djinni")?.actions).toContain("Створення вихору");
    expect(catalog.get("Marid")?.actions).toContain("Водяний струмінь");
    expect(catalog.get("Dao")?.specialAbilities).toContain("Земляне ковзання");
    expect(catalog.get("Young Gold Dragon")?.actions).toContain("Послаблюючий подих");
    expect(catalog.get("Efreeti")?.actions).toContain("Метання полумʼя");
    expect(catalog.get("Horned Devil")?.actions).toContain("Метання полумʼя");
    for (const nameEng of ["Summer Eladrin", "Winter Eladrin"]) {
      expect(catalog.get(nameEng)?.bonusActions).toContain("Фейський крок{{Fey Step}} (перезарядка 4–6)");
    }
  });

  it("дає чотирьом джинам спільну назву «Загибель елементаля»", () => {
    for (const nameEng of ["Dao", "Djinni", "Efreeti", "Marid"]) {
      expect(catalog.get(nameEng)?.specialAbilities).toContain("Загибель елементаля");
    }
  });

  it("розводить присутність еладринів за англійським прикметником", () => {
    expect(catalog.get("Summer Eladrin")?.specialAbilities).toContain("Моторошна присутність");
    expect(catalog.get("Winter Eladrin")?.specialAbilities).toContain("Скорботна присутність");
    expect(catalog.get("Summer Eladrin")?.specialAbilities).not.toContain("Скорботна присутність");
  });

  it("перетирає легасі-назви рис, заради чого KR12.3 і існує", () => {
    expect(catalog.get("Stone Golem")?.specialAbilities).toContain("Незмінна форма");
    expect(catalog.get("Stone Golem")?.specialAbilities).toContain("Магічна зброя");
    expect(catalog.get("Djinni")?.actions).toContain("<b>Шабля{{Scimitar}}.</b>");
    expect(catalog.get("Djinni")?.actions).not.toContain("Сцимітар");
    expect(catalog.get("Efreeti")?.actions).not.toContain("Сцимітар");
    expect(catalog.get("Efreeti")?.actions).not.toContain("Удар полумʼям");
    expect(catalog.get("Horned Devil")?.actions).not.toContain("Вогняна куля");
    expect(catalog.get("Remorhaz")?.actions).toContain("<b>Ковтання{{Swallow}}.</b>");
    expect(catalog.get("Young Red Dragon")?.actions).toContain("<b>Кіготь{{Claw}}.</b>");
    expect(catalog.get("Young Red Dragon")?.actions).not.toContain("Вогняне дихання");
    expect(catalog.get("Young Gold Dragon")?.actions).toContain("Вогняний подих");
    expect(catalog.get("Young Gold Dragon")?.actions).not.toContain("Послаблююче дихання");
  });

  it("чотирнадцять відкладених лишаються pending, а блокований закрила добірка", () => {
    for (const slug of [
      ...BATCH_TWENTY_FOUR_DEFERRED_SLUGS,
      ...BATCH_TWENTY_FOUR_BLOCKED_SLUGS,
    ]) {
      const row = manifest.find((r) => r.edition === "RULES_2014" && r.slug === slug);
      expect(row?.status).toBe(expectedStatusAfterGleaning(slug));
      expect(row?.batch).toBe(24);
    }
    expect(BATCH_TWENTY_FOUR_BLOCKED_SLUGS.size).toBe(1);
  });
});

describe("KR12.3 — партія 23 у зібраному каталозі 2014", () => {
  const catalog = byNameEng(getAllCreatures("RULES_2014"));
  const pending = new Set([
    ...BATCH_TWENTY_THREE_DEFERRED_SLUGS,
    ...BATCH_TWENTY_THREE_BLOCKED_SLUGS,
  ]);

  it("кожна перекладена істота партії 23 має українську назву, опис дій і коректний ruleset", () => {
    for (const row of manifest.filter((r) => r.edition === "RULES_2014" && r.batch === 23)) {
      if (pending.has(row.slug)) continue;
      const creature = catalog.get(row.nameEng);
      expect(creature, `${row.nameEng} відсутня в каталозі`).toBeDefined();
      expect(creature!.creatureId).toBe(row.creatureId);
      expect(creature!.ruleset).toBe("RULES_2014");
      expect(creature!.name).toMatch(/[Ѐ-ӿ]/);
      expect(creature!.actions).toMatch(/[Ѐ-ӿ]/);
    }
  });

  it("тримає fields-обхід мов для двох рядків, що виходять за просте перелічення", () => {
    expect(catalog.get("Necromancer Wizard")?.languages).toBe("будь-які чотири мови");
    expect(catalog.get("War Priest")?.languages).toBe("будь-які дві мови");
    for (const nameEng of ["Necromancer Wizard", "War Priest"]) {
      expect(catalog.get(nameEng)?.languages).not.toMatch(/[A-Za-z]{3}/);
    }
  });

  it("тримає fields-обхід резисту, де «nonmagical attacks» ламає список", () => {
    expect(catalog.get("Glabrezu")?.damageResistance).toBe(
      "Холодна, Вогняна, Блискавична; Дробляча, Колюча, Рубляча від немагічної зброї"
    );
    expect(catalog.get("Nycaloth")?.damageResistance).toBe(
      "Холодна, Вогняна, Блискавична; Дробляча, Колюча, Рубляча від немагічної зброї"
    );
    expect(catalog.get("Deva")?.damageResistance).toBe(
      "Променева; Дробляча, Колюча, Рубляча від немагічної зброї"
    );
    for (const nameEng of ["Glabrezu", "Nycaloth", "Deva"]) {
      expect(catalog.get(nameEng)?.damageResistance).not.toMatch(/[A-Za-z]{3}/);
    }
  });

  it("двадцять четвертий запис дефекту «список заклинань поза <p>-абзацом» — вісім списків за spells.json", () => {
    expect(catalog.get("Glabrezu")?.specialAbilities).toContain(
      "Слово сили: Приголомшення [Power Word Stun]"
    );
    expect(catalog.get("Gray Slaad")?.specialAbilities).toContain(
      "Планарний перехід [Plane Shift] (лише на себе)"
    );
    expect(catalog.get("Nycaloth")?.specialAbilities).toContain("Віддзеркалення [Mirror Image]");
    expect(catalog.get("Death Slaad")?.specialAbilities).toContain("Вбивча хмара [Cloudkill]");
    expect(catalog.get("Deva")?.specialAbilities).toContain("Звернення [Commune]");
    expect(catalog.get("Guardian Naga")?.specialAbilities).toContain("Істинний зір [True Seeing]");
    expect(catalog.get("Necromancer Wizard")?.actions).toContain("Коло смерті [Circle of Death]");
    expect(catalog.get("War Priest")?.actions).toContain("Вартовий віри [Guardian of Faith]");
  });

  it("дописує дві назви, які губить findSpellNames — четверте й пʼяте спрацювання прогалини", () => {
    expect(catalog.get("War Priest")?.actions).toContain(
      "Мале відновлення [Lesser Restoration], Відродження [Revivify]"
    );
    expect(catalog.get("Deva")?.specialAbilities).toContain(
      "Звернення [Commune], Оживлення мерців [Raise Dead]"
    );
  });

  it("перевикористовує id шести записів партії 23, замінюючи, а не додаючи до успадкованого каталогу", () => {
    const list = getAllCreatures("RULES_2014");
    expect(new Set(list.map((c) => c.creatureId)).size).toBe(list.length);
    expect(list.filter((c) => c.creatureId === 272).length).toBe(1);
    expect(catalog.get("Glabrezu")?.creatureId).toBe(289);
    expect(catalog.get("Treant")?.creatureId).toBe(272);
    expect(catalog.get("Young Blue Dragon")?.creatureId).toBe(232);
    expect(catalog.get("Deva")?.creatureId).toBe(241);
    expect(catalog.get("Froghemoth")?.creatureId).toBe(433);
    expect(catalog.get("Guardian Naga")?.creatureId).toBe(375);
    expect(catalog.get("Glabrezu")?.name).toBe("Глабрезу (Чотирирукий демон)");
    expect(catalog.get("Treant")?.name).toBe("Ент (Треант)");
    expect(catalog.get("Guardian Naga")?.name).toBe("Нага-охоронниця (Гардіан Нага)");
  });

  it("додає сім нових записів партії 23", () => {
    expect(catalog.get("Frost Salamander")?.name).toBe("Морозна саламандра");
    expect(catalog.get("Gray Slaad")?.name).toBe("Сірий слаад");
    expect(catalog.get("Necromancer Wizard")?.name).toBe("Чарівник-некромант");
    expect(catalog.get("Nycaloth")?.name).toBe("Никалот");
    expect(catalog.get("War Priest")?.name).toBe("Жрець війни");
    expect(catalog.get("Young Silver Dragon")?.name).toBe("Молодий срібний дракон");
    expect(catalog.get("Death Slaad")?.name).toBe("Слаад смерті");
  });

  it("бере назви рис зі словника, ратифікованого глосарію й 2024-двійника", () => {
    expect(catalog.get("Deva")?.actions).toContain("Булава");
    expect(catalog.get("War Priest")?.actions).toContain("Дворучний молот");
    expect(catalog.get("Gray Slaad")?.actions).toContain("Дворучний меч");
    expect(catalog.get("Nycaloth")?.actions).toContain("Велика сокира");
    expect(catalog.get("Treant")?.actions).toContain("Оживлення дерев{{Animate Trees}} (1 раз на день)");
    expect(catalog.get("Deva")?.specialAbilities).toContain("Ангельська зброя");
    expect(catalog.get("Young Silver Dragon")?.actions).toContain("Паралітичний подих");
    expect(catalog.get("Necromancer Wizard")?.reactions).toContain("Похмурі жнива{{Grim Harvest}} (1 раз на хід)");
  });

  it("розводить морозний подих саламандри й крижаний подих срібного дракона за англійським коренем", () => {
    expect(catalog.get("Frost Salamander")?.actions).toContain("Морозний подих{{Freezing Breath}} (перезарядка 6)");
    expect(catalog.get("Young Silver Dragon")?.actions).toContain("Крижаний подих");
    expect(catalog.get("Frost Salamander")?.actions).not.toContain("Крижаний подих");
  });

  it("перетирає легасі-назви рис, заради чого KR12.3 і існує", () => {
    expect(catalog.get("Treant")?.specialAbilities).toContain("Хибна подоба");
    expect(catalog.get("Treant")?.specialAbilities).not.toContain("Оманлива зовнішність");
    expect(catalog.get("Treant")?.specialAbilities).toContain("Облогове чудовисько");
    expect(catalog.get("Treant")?.specialAbilities).not.toContain("Облоговий монстр");
    expect(catalog.get("Treant")?.actions).not.toContain("Удар стовбуром");
    expect(catalog.get("Glabrezu")?.actions).toContain("<b>Кліщі{{Pincer}}.</b>");
    expect(catalog.get("Glabrezu")?.actions).not.toContain("Клішня");
    expect(catalog.get("Guardian Naga")?.specialAbilities).toContain("<b>Відродження{{Rejuvenation}}.</b>");
    expect(catalog.get("Guardian Naga")?.specialAbilities).not.toContain("Безсмертне відродження");
    expect(catalog.get("Froghemoth")?.specialAbilities).toContain("Амфібія");
    expect(catalog.get("Froghemoth")?.specialAbilities).not.toContain("Земноводність");
    expect(catalog.get("Young Blue Dragon")?.actions).toContain(
      "Блискавичний подих{{Lightning Breath}} (перезарядка 5–6)"
    );
    expect(catalog.get("Young Blue Dragon")?.actions).not.toContain("Дихання блискавки");
    expect(catalog.get("Deva")?.actions).toContain("Цілющий доторк{{Healing Touch}} (3 рази на день)");
  });

  it("тримає обмеження за подобою в назвах дій обох слаадів", () => {
    for (const nameEng of ["Gray Slaad", "Death Slaad"]) {
      expect(catalog.get(nameEng)?.actions).toContain("Укус{{Bite}} (лише в подобі слаада)");
      expect(catalog.get(nameEng)?.actions).toContain("Кігті{{Claws}} (лише в подобі слаада)");
    }
  });

  it("сімнадцять відкладених записів лишаються pending, блокувань поза дефектом немає", () => {
    for (const slug of BATCH_TWENTY_THREE_DEFERRED_SLUGS) {
      const row = manifest.find((r) => r.edition === "RULES_2014" && r.slug === slug);
      expect(row?.status).toBe(expectedStatusAfterGleaning(slug));
      expect(row?.batch).toBe(23);
    }
    expect(BATCH_TWENTY_THREE_BLOCKED_SLUGS.size).toBe(0);
  });
});

describe("KR12.3 — партія 22 у зібраному каталозі 2014", () => {
  const catalog = byNameEng(getAllCreatures("RULES_2014"));
  const pending = new Set([
    ...BATCH_TWENTY_TWO_DEFERRED_SLUGS,
    ...BATCH_TWENTY_TWO_BLOCKED_SLUGS,
  ]);

  it("кожна перекладена істота партії 22 має українську назву, опис дій і коректний ruleset", () => {
    for (const row of manifest.filter((r) => r.edition === "RULES_2014" && r.batch === 22)) {
      if (pending.has(row.slug)) continue;
      const creature = catalog.get(row.nameEng);
      expect(creature, `${row.nameEng} відсутня в каталозі`).toBeDefined();
      expect(creature!.creatureId).toBe(row.creatureId);
      expect(creature!.ruleset).toBe("RULES_2014");
      expect(creature!.name).toMatch(/[Ѐ-ӿ]/);
      expect(creature!.actions).toMatch(/[Ѐ-ӿ]/);
    }
  });

  it("тримає fields-обхід мов для двох рядків, що виходять за просте перелічення", () => {
    expect(catalog.get("Champion")?.languages).toBe("будь-яка одна мова (зазвичай Загальна)");
    expect(catalog.get("Evoker Wizard")?.languages).toBe("будь-які чотири мови");
    expect(catalog.get("Clay Golem")?.languages).toBe(
      "розуміє мови свого творця, але не може говорити"
    );
    for (const nameEng of ["Champion", "Evoker Wizard", "Clay Golem"]) {
      expect(catalog.get(nameEng)?.languages).not.toMatch(/[A-Za-z]{3}/);
    }
  });

  it("тримає fields-обхід резисту й імунітету, де «nonmagical attacks» ламає список", () => {
    expect(catalog.get("Hezrou")?.damageResistance).toBe(
      "Холодна, Вогняна, Блискавична; Дробляча, Колюча, Рубляча від немагічної зброї"
    );
    expect(catalog.get("Bone Devil")?.damageResistance).toBe(
      "Холодна; Дробляча, Колюча, Рубляча від немагічної, не посрібленої зброї"
    );
    expect(catalog.get("Clay Golem")?.damageImmunity).toBe(
      "Кислотна, Отруйна, Психічна; Дробляча, Колюча, Рубляча від немагічної, не адамантинової зброї"
    );
  });

  it("тримає fields-обхід КЗ морозного велетня, перетираючи легасі-«латні пластини»", () => {
    expect(catalog.get("Frost Giant")?.ac).toBe("15 (латаний обладунок)");
    expect(catalog.get("Frost Giant")?.ac).not.toContain("латні пластини");
  });

  it("двадцять третій запис дефекту «список заклинань поза <p>-абзацом» — вісім списків за spells.json", () => {
    expect(catalog.get("Drow Priestess of Lolth")?.specialAbilities).toContain(
      "Мерехтливі вогники [Dancing Lights]"
    );
    expect(catalog.get("Drow Priestess of Lolth")?.specialAbilities).toContain(
      "Масове лікування ран [Mass Cure Wounds]"
    );
    expect(catalog.get("Githyanki Knight")?.specialAbilities).toContain(
      "Планарний перехід [Plane Shift]"
    );
    expect(catalog.get("Green Slaad")?.specialAbilities).toContain("Вогнекуля [Fireball]");
    expect(catalog.get("Spirit Naga")?.specialAbilities).toContain(
      "Підкорення особистості [Dominate Person]"
    );
    expect(catalog.get("Cloud Giant")?.specialAbilities).toContain(
      "Контроль погоди [Control Weather]"
    );
    expect(catalog.get("Drow House Captain")?.actions).toContain("Вогники фей [Faerie fire]");
    expect(catalog.get("Evoker Wizard")?.actions).toContain("Стіна льоду [Wall of Ice]");
  });

  it("дописує «Світло [Light]» хмарному велетню — третє спрацювання прогалини findSpellNames", () => {
    expect(catalog.get("Cloud Giant")?.specialAbilities).toContain(
      "Туманна хмара [Fog Cloud], Світло [Light]"
    );
  });

  it("бере назви заклинань, яких парсер не знайшов у spells.json, за їхніми записами", () => {
    expect(catalog.get("Drow Priestess of Lolth")?.specialAbilities).toContain(
      "Мале відновлення [Lesser Restoration]"
    );
    expect(catalog.get("Drow Priestess of Lolth")?.specialAbilities).toContain(
      "Зʼява тварин [Conjure Animals] (2 гігантські павуки)"
    );
  });

  it("перевикористовує id тринадцяти записів партії 22, замінюючи, а не додаючи до успадкованого каталогу", () => {
    const list = getAllCreatures("RULES_2014");
    expect(new Set(list.map((c) => c.creatureId)).size).toBe(list.length);
    expect(list.filter((c) => c.creatureId === 222).length).toBe(1);
    expect(catalog.get("Drow Priestess of Lolth")?.creatureId).toBe(398);
    expect(catalog.get("Frost Giant")?.creatureId).toBe(222);
    expect(catalog.get("Hezrou")?.creatureId).toBe(317);
    expect(catalog.get("Hydra")?.creatureId).toBe(201);
    expect(catalog.get("Shoosuva")?.creatureId).toBe(417);
    expect(catalog.get("Spirit Naga")?.creatureId).toBe(374);
    expect(catalog.get("Tyrannosaurus Rex")?.creatureId).toBe(173);
    expect(catalog.get("Young Bronze Dragon")?.creatureId).toBe(322);
    expect(catalog.get("Young Green Dragon")?.creatureId).toBe(230);
    expect(catalog.get("Bone Devil")?.creatureId).toBe(285);
    expect(catalog.get("Clay Golem")?.creatureId).toBe(190);
    expect(catalog.get("Cloud Giant")?.creatureId).toBe(224);
    expect(catalog.get("Fire Giant")?.creatureId).toBe(223);
    expect(catalog.get("Hezrou")?.name).toBe("Хезроу (Жабодемон)");
  });

  it("додає шість нових записів партії 22", () => {
    expect(catalog.get("Fomorian")?.name).toBe("Фомор");
    expect(catalog.get("Githyanki Knight")?.name).toBe("Ґітьянкі-лицар");
    expect(catalog.get("Green Slaad")?.name).toBe("Зелений слаад");
    expect(catalog.get("Champion")?.name).toBe("Чемпіон");
    expect(catalog.get("Drow House Captain")?.name).toBe("Дроу-капітан дому");
    expect(catalog.get("Evoker Wizard")?.name).toBe("Чарівник-заклинач стихій");
  });

  it("бере назви рис зі словника, ратифікованого глосарію й 2024-двійника", () => {
    expect(catalog.get("Green Slaad")?.actions).toContain("Посох");
    expect(catalog.get("Drow House Captain")?.actions).toContain("Шабля");
    expect(catalog.get("Drow House Captain")?.actions).toContain("Батіг");
    expect(catalog.get("Fire Giant")?.actions).toContain("Дворучний меч");
    expect(catalog.get("Fomorian")?.actions).toContain("Велика дубинка");
    expect(catalog.get("Hydra")?.specialAbilities).toContain("Множинні голови");
    expect(catalog.get("Hydra")?.specialAbilities).toContain("Реактивні голови");
    expect(catalog.get("Shoosuva")?.actions).toContain("Жало хвоста");
    expect(catalog.get("Clay Golem")?.specialAbilities).toContain("Поглинання кислоти");
    expect(catalog.get("Clay Golem")?.actions).toContain("Прискорення{{Haste}} (перезарядка 5–6)");
  });

  it("бере назви фіч гравця зі спадкових сідів класів", () => {
    expect(catalog.get("Champion")?.specialAbilities).toContain("Непохитність{{Indomitable}} (2 рази на день)");
    expect(catalog.get("Champion")?.bonusActions).toContain(
      "Друге дихання{{Second Wind}} (перезаряджається після короткого чи тривалого відпочинку)"
    );
  });

  it("розводить бич жриці й батіг капітана, перетираючи легасі-«Батіг із живими зміями»", () => {
    expect(catalog.get("Drow Priestess of Lolth")?.actions).toContain("<b>Бич{{Scourge}}.</b>");
    expect(catalog.get("Drow Priestess of Lolth")?.actions).not.toContain("Батіг із живими зміями");
    expect(catalog.get("Drow House Captain")?.actions).toContain("<b>Батіг{{Whip}}.</b>");
  });

  it("тримає обмеження за подобою в назвах дій зеленого слаада", () => {
    expect(catalog.get("Green Slaad")?.actions).toContain("Укус{{Bite}} (лише в подобі слаада)");
    expect(catalog.get("Green Slaad")?.actions).toContain("Кіготь{{Claw}} (лише в подобі слаада)");
  });

  it("одинадцять відкладених записів лишаються pending, блокувань поза дефектом немає", () => {
    for (const slug of BATCH_TWENTY_TWO_DEFERRED_SLUGS) {
      const row = manifest.find((r) => r.edition === "RULES_2014" && r.slug === slug);
      expect(row?.status).toBe(expectedStatusAfterGleaning(slug));
      expect(row?.batch).toBe(22);
    }
    expect(BATCH_TWENTY_TWO_BLOCKED_SLUGS.size).toBe(0);
  });
});

describe("KR12.3 — партія 21 у зібраному каталозі 2014", () => {
  const catalog = byNameEng(getAllCreatures("RULES_2014"));
  const pending = new Set([
    ...BATCH_TWENTY_ONE_DEFERRED_SLUGS,
    ...BATCH_TWENTY_ONE_BLOCKED_SLUGS,
  ]);

  it("кожна перекладена істота партії 21 має українську назву, опис дій і коректний ruleset", () => {
    for (const row of manifest.filter((r) => r.edition === "RULES_2014" && r.batch === 21)) {
      if (pending.has(row.slug)) continue;
      const creature = catalog.get(row.nameEng);
      expect(creature, `${row.nameEng} відсутня в каталозі`).toBeDefined();
      expect(creature!.creatureId).toBe(row.creatureId);
      expect(creature!.ruleset).toBe("RULES_2014");
      expect(creature!.name).toMatch(/[Ѐ-ӿ]/);
      expect(creature!.actions).toMatch(/[Ѐ-ӿ]/);
    }
  });

  it("тримає fields-обхід мов для пʼяти рядків, що виходять за просте перелічення", () => {
    expect(catalog.get("Shield Guardian")?.languages).toBe(
      "розуміє накази, віддані будь-якою мовою, але не може говорити"
    );
    expect(catalog.get("Warlock of the Fiend")?.languages).toBe(
      "будь-які дві мови (зазвичай Мова безодні чи Пекельна)"
    );
    expect(catalog.get("Assassin")?.languages).toBe("Злодійський жаргон плюс будь-які дві мови");
    expect(catalog.get("Blackguard")?.languages).toBe("будь-яка одна мова (зазвичай Загальна)");
    expect(catalog.get("Diviner Wizard")?.languages).toBe("будь-які чотири мови");
    for (const nameEng of ["Shield Guardian", "Warlock of the Fiend", "Assassin", "Blackguard"]) {
      expect(catalog.get(nameEng)?.languages).not.toMatch(/[A-Za-z]{3}/);
    }
  });

  it("тримає fields-обхід резисту для двох рядків, де «nonmagical attacks» ламає список", () => {
    expect(catalog.get("Grick alpha")?.damageResistance).toBe(
      "Дробляча, Колюча, Рубляча від немагічної зброї"
    );
    expect(catalog.get("Chain Devil")?.damageResistance).toBe(
      "Холодна; Дробляча, Колюча, Рубляча від немагічної, не посрібленої зброї"
    );
  });

  it("двадцять другий запис дефекту «список заклинань поза <p>-абзацом» — вісім списків за spells.json", () => {
    expect(catalog.get("Drow Mage")?.specialAbilities).toContain("Вогники фей [Faerie fire]");
    expect(catalog.get("Drow Mage")?.specialAbilities).toContain("Вбивча хмара [Cloudkill]");
    expect(catalog.get("Mind Flayer")?.specialAbilities).toContain(
      "Підкорення монстра [Dominate Monster]"
    );
    expect(catalog.get("Oni")?.specialAbilities).toContain("Конус холоду [Cone of Cold]");
    expect(catalog.get("Yuan-ti Abomination")?.specialAbilities).toContain("Страх [Fear]");
    expect(catalog.get("Warlock of the Fiend")?.actions).toContain("Вигнання [Banishment]");
    expect(catalog.get("Blackguard")?.actions).toContain("Пошук скакуна [Find Steed]");
    expect(catalog.get("Diviner Wizard")?.actions).toContain(
      "Телепатичний звʼязок Рері [Rary's Telepathic Bond]"
    );
  });

  it("перевикористовує id десяти записів партії 21, замінюючи, а не додаючи до успадкованого каталогу", () => {
    const list = getAllCreatures("RULES_2014");
    expect(new Set(list.map((c) => c.creatureId)).size).toBe(list.length);
    expect(list.filter((c) => c.creatureId === 209).length).toBe(1);
    expect(catalog.get("Giant Ape")?.creatureId).toBe(171);
    expect(catalog.get("Mind Flayer")?.creatureId).toBe(209);
    expect(catalog.get("Shield Guardian")?.creatureId).toBe(194);
    expect(catalog.get("Warlock of the Fiend")?.creatureId).toBe(382);
    expect(catalog.get("Young Black Dragon")?.creatureId).toBe(234);
    expect(catalog.get("Young Copper Dragon")?.creatureId).toBe(324);
    expect(catalog.get("Yuan-ti Abomination")?.creatureId).toBe(373);
    expect(catalog.get("Assassin")?.creatureId).toBe(130);
    expect(catalog.get("Chain Devil")?.creatureId).toBe(286);
    expect(catalog.get("Cloaker")?.creatureId).toBe(297);
    expect(catalog.get("Mind Flayer")?.name).toBe("Мізкожер (Іллітід / Майнд Флаєр)");
  });

  it("додає пʼять нових записів партії 21", () => {
    expect(catalog.get("Drow Mage")?.name).toBe("Дроу-маг");
    expect(catalog.get("Grick alpha")?.name).toBe("Грік-альфа");
    expect(catalog.get("Oni")?.name).toBe("Оні");
    expect(catalog.get("Blackguard")?.name).toBe("Чорний лицар");
    expect(catalog.get("Diviner Wizard")?.name).toBe("Чарівник-провидець");
  });

  it("бере назви рис зі словника, ратифікованого глосарію й 2024-двійника", () => {
    expect(catalog.get("Drow Mage")?.actions).toContain("Посох");
    expect(catalog.get("Warlock of the Fiend")?.actions).toContain("Шабля");
    expect(catalog.get("Yuan-ti Abomination")?.actions).toContain("Довгий лук");
    expect(catalog.get("Blackguard")?.bonusActions).toContain("Штовхання");
    expect(catalog.get("Shield Guardian")?.specialAbilities).toContain("Привʼязаність");
    expect(catalog.get("Shield Guardian")?.specialAbilities).toContain("Зберігання заклинання");
    expect(catalog.get("Mind Flayer")?.actions).toContain("Видобування мозку");
    expect(catalog.get("Chain Devil")?.actions).toContain("Ланцюг");
    expect(catalog.get("Cloaker")?.actions).toContain("Стогін");
    expect(catalog.get("Young Black Dragon")?.specialAbilities).toContain("Амфібія");
    expect(catalog.get("Young Black Dragon")?.specialAbilities).not.toContain("Земноводність");
  });

  it("бере назви фіч гравця зі спадкових сідів, а не з легасі-статблока асасина", () => {
    expect(catalog.get("Assassin")?.specialAbilities).toContain("Підступна атака");
    expect(catalog.get("Assassin")?.specialAbilities).not.toContain("Потайний удар");
    expect(catalog.get("Assassin")?.specialAbilities).toContain("Вбивство");
    expect(catalog.get("Assassin")?.specialAbilities).toContain("Ухилення");
    expect(catalog.get("Diviner Wizard")?.reactions).toContain("Провіщення{{Portent}} (3 рази на день)");
    expect(catalog.get("Warlock of the Fiend")?.specialAbilities).toContain("Власна удача бісів");
    expect(catalog.get("Blackguard")?.actions).toContain("Жахливий вигляд");
  });

  it("тримає обмеження за подобою в назвах дій оні та юань-ті", () => {
    expect(catalog.get("Oni")?.actions).toContain("Кіготь{{Claw}} (лише в подобі оні)");
    expect(catalog.get("Yuan-ti Abomination")?.actions).toContain(
      "Мультиатака{{Multiattack}} (лише в подобі абомінації)"
    );
    expect(catalog.get("Yuan-ti Abomination")?.specialAbilities).toContain(
      "Вроджене чаклування{{Innate Spellcasting}} (лише в подобі абомінації)"
    );
  });

  it("пʼятнадцять відкладених записів лишаються pending, блокувань поза дефектом немає", () => {
    for (const slug of BATCH_TWENTY_ONE_DEFERRED_SLUGS) {
      const row = manifest.find((r) => r.edition === "RULES_2014" && r.slug === slug);
      expect(row?.status).toBe(expectedStatusAfterGleaning(slug));
      expect(row?.batch).toBe(21);
    }
    expect(BATCH_TWENTY_ONE_BLOCKED_SLUGS.size).toBe(0);
  });
});

describe("KR12.3 — партія 20 у зібраному каталозі 2014", () => {
  const catalog = byNameEng(getAllCreatures("RULES_2014"));
  const pending = new Set([...BATCH_TWENTY_DEFERRED_SLUGS, ...BATCH_TWENTY_BLOCKED_SLUGS]);

  it("кожна перекладена істота партії 20 має українську назву, опис дій і коректний ruleset", () => {
    for (const row of manifest.filter((r) => r.edition === "RULES_2014" && r.batch === 20)) {
      if (pending.has(row.slug)) continue;
      const creature = catalog.get(row.nameEng);
      expect(creature, `${row.nameEng} відсутня в каталозі`).toBeDefined();
      expect(creature!.creatureId).toBe(row.creatureId);
      expect(creature!.ruleset).toBe("RULES_2014");
      expect(creature!.name).toMatch(/[Ѐ-ӿ]/);
      expect(creature!.actions).toMatch(/[Ѐ-ӿ]/);
    }
  });

  it("тримає fields-обхід мов для трьох рядків, що виходять за просте перелічення", () => {
    expect(catalog.get("Mage")?.languages).toBe("будь-які чотири мови");
    expect(catalog.get("Warlock of the Great Old One")?.languages).toBe(
      "будь-які дві мови, телепатія 30 фт."
    );
    expect(catalog.get("Invisible Stalker")?.languages).toBe(
      "Авранська, розуміє Загальну, але не може нею говорити"
    );
    expect(catalog.get("Invisible Stalker")?.languages).not.toMatch(/[A-Za-z]{3}/);
  });

  it("тримає fields-обхід резисту для пʼяти рядків, де «nonmagical attacks» ламає список", () => {
    expect(catalog.get("Galeb Duhr")?.damageResistance).toBe(
      "Дробляча, Колюча, Рубляча від немагічної зброї"
    );
    expect(catalog.get("Invisible Stalker")?.damageResistance).toBe(
      "Дробляча, Колюча, Рубляча від немагічної зброї"
    );
    expect(catalog.get("Vrock")?.damageResistance).toBe(
      "Холодна, Вогняна, Блискавична; Дробляча, Колюча, Рубляча від немагічної зброї"
    );
    expect(catalog.get("White Abishai")?.damageResistance).toBe(
      "Дробляча, Колюча, Рубляча від немагічної, не посрібленої зброї"
    );
    expect(catalog.get("Black Abishai")?.damageResistance).toBe(
      "Холодна; Дробляча, Колюча, Рубляча від немагічної, не посрібленої зброї"
    );
  });

  it("тримає обхід швидкості ґалеб дура, чуттів чорного абішая й навички синього слаада", () => {
    expect(catalog.get("Galeb Duhr")?.speed).toBe(
      "15 фт. (30 фт. під час котіння, 60 фт. під час котіння з гори)"
    );
    expect(catalog.get("Galeb Duhr")?.speed).not.toMatch(/[A-Za-z]{3}/);
    expect(catalog.get("Black Abishai")?.senses).toBe("Темнозір 120 фт., Пасивна уважність 16");
    expect(catalog.get("Black Abishai")?.senses).not.toMatch(/dadivision/i);
    expect(catalog.get("Blue Slaad")?.skills).toBe("Уважність +1");
  });

  it("двадцять перший запис дефекту «список заклинань поза <p>-абзацом» — пʼять списків за spells.json", () => {
    expect(catalog.get("Drider")?.specialAbilities).toContain("Вогники фей [Faerie fire]");
    expect(catalog.get("Githzerai Zerth")?.specialAbilities).toContain(
      "Фантомний вбивця [Phantasmal Killer]"
    );
    expect(catalog.get("Kuo-toa Archpriest")?.specialAbilities).toContain(
      "Масове лікування ран [Mass Cure Wounds]"
    );
    expect(catalog.get("Mage")?.specialAbilities).toContain("Конус холоду [Cone of Cold]");
    /// `fly` is the one name aidedd prints without an <a> link, so `findSpellNames` drops it — the
    /// batch-16 gap firing again. Counted against the raw HTML, not taken from the briefing.
    expect(catalog.get("Mage")?.specialAbilities).toContain("Політ [Fly]");
    expect(catalog.get("Warlock of the Great Old One")?.actions).toContain(
      "Арканна брама [Arcane Gate]"
    );
  });

  it("перевикористовує id девʼяти записів партії 20, замінюючи, а не додаючи до успадкованого каталогу", () => {
    const list = getAllCreatures("RULES_2014");
    expect(new Set(list.map((c) => c.creatureId)).size).toBe(list.length);
    expect(list.filter((c) => c.creatureId === 132).length).toBe(1);
    expect(catalog.get("Mage")?.creatureId).toBe(132);
    expect(catalog.get("Hobgoblin Warlord")?.creatureId).toBe(105);
    expect(catalog.get("Mammoth")?.creatureId).toBe(172);
    expect(catalog.get("Medusa")?.creatureId).toBe(199);
    expect(catalog.get("Wyvern")?.creatureId).toBe(250);
    expect(catalog.get("Vrock")?.creatureId).toBe(288);
    expect(catalog.get("Young Brass Dragon")?.creatureId).toBe(326);
    expect(catalog.get("Warlock of the Great Old One")?.creatureId).toBe(420);
    expect(catalog.get("Githzerai Zerth")?.creatureId).toBe(551);
    expect(catalog.get("Vrock")?.name).toBe("Врок (Гриф-демон)");
  });

  it("додає девʼять нових записів партії 20", () => {
    expect(catalog.get("Drider")?.name).toBe("Дридер");
    expect(catalog.get("Galeb Duhr")?.name).toBe("Ґалеб Дур");
    expect(catalog.get("Invisible Stalker")?.name).toBe("Невидимий мисливець");
    expect(catalog.get("Kuo-toa Archpriest")?.name).toBe("Куо-тоа-архіжрець");
    expect(catalog.get("Blue Slaad")?.name).toBe("Синій слаад");
    expect(catalog.get("Duergar Warlord")?.name).toBe("Дуергар-воєначальник");
    expect(catalog.get("Gauth")?.name).toBe("Ґаут");
    expect(catalog.get("White Abishai")?.name).toBe("Білий абішай");
    expect(catalog.get("Black Abishai")?.name).toBe("Чорний абішай");
  });

  it("бере назви рис зі словника, ратифікованого глосарію й 2024-двійника", () => {
    expect(catalog.get("Drider")?.actions).toContain("Довгий меч");
    expect(catalog.get("Drider")?.specialAbilities).toContain("Павутинохід");
    expect(catalog.get("Drider")?.specialAbilities).not.toContain("Ходіння павутиною");
    expect(catalog.get("Kuo-toa Archpriest")?.specialAbilities).toContain("Амфібія");
    expect(catalog.get("Kuo-toa Archpriest")?.actions).toContain("Скіпетр");
    expect(catalog.get("Medusa")?.actions).toContain("Зміїне волосся");
    expect(catalog.get("Gauth")?.specialAbilities).toContain("Передсмертні корчі");
    expect(catalog.get("Vrock")?.actions).toContain("Приголомшливий вереск{{Stunning Screech}} (1 раз на день)");
    expect(catalog.get("Vrock")?.actions).toContain("Спори{{Spores}} (перезарядка 6)");
    expect(catalog.get("Galeb Duhr")?.actions).toContain("Оживлення валунів{{Animate Boulders}} (1 раз на день)");
    expect(catalog.get("Black Abishai")?.actions).toContain("Шабля");
  });

  it("лишає мамонтові «Удар бивнями» за прецедентом слона, а не «Удар рогами» рогатих", () => {
    expect(catalog.get("Mammoth")?.actions).toContain("Удар бивнями");
    expect(catalog.get("Mammoth")?.actions).not.toContain("Удар рогами");
    expect(catalog.get("Mammoth")?.specialAbilities).toContain("атакою Ударом бивнями");
    expect(catalog.get("Elephant")?.actions).toContain("Удар бивнями");
    expect(catalog.get("Triceratops")?.actions).toContain("Удар рогами");
  });

  it("тримає словниковий «Окамʼянюючий погляд» проти 2024-двійника «Скамʼянювальний»", () => {
    expect(catalog.get("Medusa")?.specialAbilities).toContain("Окамʼянюючий погляд");
    expect(catalog.get("Medusa")?.specialAbilities).not.toContain("Скамʼянювальний");
    expect(catalog.get("Medusa")?.specialAbilities).toContain("стан Окамʼянілий");
  });

  it("розводить «Приголомшливий» ґаута й врока з «Приголомшувальним» ґейзера", () => {
    expect(catalog.get("Gauth")?.specialAbilities).toContain("Приголомшливий погляд");
    expect(catalog.get("Gauth")?.specialAbilities).not.toContain("Приголомшувальний");
    expect(catalog.get("Gazer")?.actions).toContain("Приголомшувальний промінь");
  });

  it("нумерує очні промені ґаута за прецедентом ґейзера й спектатора", () => {
    const actions = catalog.get("Gauth")?.actions ?? "";
    expect(actions).toContain("Очні промені");
    expect(actions).toContain("1- Промінь пожирання магії");
    expect(actions).toContain("2- Промінь виснаження");
    expect(actions).toContain("3- Вогняний промінь");
    expect(actions).toContain("4- Паралізуючий промінь");
    expect(actions).toContain("5- Відштовхуючий промінь");
    expect(actions).toContain("6- Сонний промінь");
    expect(actions).not.toContain("Промені ока");
  });

  it("одинадцять відкладених лишаються pending, а блокування «Extra (AideDD)» закрила добірка", () => {
    for (const slug of BATCH_TWENTY_DEFERRED_SLUGS) {
      const row = manifest.find((r) => r.edition === "RULES_2014" && r.slug === slug);
      expect(row?.status).toBe(expectedStatusAfterGleaning(slug));
      expect(row?.batch).toBe(20);
    }
    expect(BATCH_TWENTY_BLOCKED_SLUGS.size).toBe(1);
    const blocked = manifest.find((r) => r.edition === "RULES_2014" && r.slug === "devilroot");
    expect(blocked?.status).toBe("translated");
    expect(blocked?.batch).toBe(20);
    expect(GLEANED_BY_BATCHES_33_34.has("devilroot")).toBe(true);
  });
});

describe("KR12.3 — партія 19 у зібраному каталозі 2014", () => {
  const catalog = byNameEng(getAllCreatures("RULES_2014"));
  const pending = new Set([...BATCH_NINETEEN_DEFERRED_SLUGS, ...BATCH_NINETEEN_BLOCKED_SLUGS]);

  it("кожна перекладена істота партії 19 має українську назву, опис дій і коректний ruleset", () => {
    for (const row of manifest.filter((r) => r.edition === "RULES_2014" && r.batch === 19)) {
      if (pending.has(row.slug)) continue;
      const creature = catalog.get(row.nameEng);
      expect(creature, `${row.nameEng} відсутня в каталозі`).toBeDefined();
      expect(creature!.creatureId).toBe(row.creatureId);
      expect(creature!.ruleset).toBe("RULES_2014");
      expect(creature!.name).toMatch(/[Ѐ-ӿ]/);
      expect(creature!.actions).toMatch(/[Ѐ-ӿ]/);
    }
  });

  it("тримає fields-обхід мов для всіх шести рядків, що виходять за просте перелічення", () => {
    expect(catalog.get("Tanarukk")?.languages).toBe("Мова безодні, Загальна плюс будь-яка одна мова");
    expect(catalog.get("Transmuter Wizard")?.languages).toBe("будь-які чотири мови");
    expect(catalog.get("Conjurer Wizard")?.languages).toBe("будь-які чотири мови");
    expect(catalog.get("Chimera")?.languages).toBe("розуміє Драконячу, але не може говорити");
    expect(catalog.get("Bodak")?.languages).toBe("Мова безодні, мови, які знав за життя");
    expect(catalog.get("Werebear")?.languages).toBe("Загальна (не може говорити в подобі ведмедя)");
  });

  it("тримає fields-обхід резисту й імунітету там, де «nonmagical attacks» ламає список", () => {
    expect(catalog.get("Vampire Spawn")?.damageResistance).toBe(
      "Некротична; Дробляча, Колюча, Рубляча від немагічної зброї"
    );
    expect(catalog.get("Water Elemental")?.damageResistance).toBe(
      "Кислотна; Дробляча, Колюча, Рубляча від немагічної зброї"
    );
    expect(catalog.get("Bodak")?.damageResistance).toBe(
      "Холодна, Вогняна; Дробляча, Колюча, Рубляча від немагічної зброї"
    );
    expect(catalog.get("Wraith")?.damageResistance).toBe(
      "Кислотна, Холодна, Вогняна, Блискавична, Громова; Дробляча, Колюча, Рубляча від немагічної, не посрібленої зброї"
    );
    expect(catalog.get("Xorn")?.damageResistance).toBe(
      "Колюча, Рубляча від немагічної, не адамантинової зброї"
    );
    expect(catalog.get("Werebear")?.damageImmunity).toBe(
      "Дробляча, Колюча, Рубляча від немагічної, не посрібленої зброї"
    );
  });

  it("тримає КЗ і швидкість ведмедя-перевертня, задані через подобу", () => {
    expect(catalog.get("Werebear")?.ac).toBe(
      "10 у подобі гуманоїда, 11 (природний обладунок) у подобі ведмедя чи гібрида"
    );
    expect(catalog.get("Werebear")?.speed).toBe(
      "30 фт. (40 фт., лазіння 30 фт. у подобі ведмедя чи гібрида)"
    );
    expect(catalog.get("Werebear")?.speed).not.toMatch(/[A-Za-z]{3}/);
  });

  it("двадцятий запис дефекту «список заклинань поза <p>-абзацом» — пʼять списків за spells.json", () => {
    expect(catalog.get("Transmuter Wizard")?.actions).toContain("Телекінез [Telekinesis]");
    expect(catalog.get("Transmuter Wizard")?.actions).toContain("Стукіт [Knock]");
    expect(catalog.get("Conjurer Wizard")?.actions).toContain("Невидимий служник [Unseen Servant]");
    expect(catalog.get("Unicorn")?.specialAbilities).toContain(
      "Розвіювання зла й добра [Dispel Evil and Good]"
    );
    expect(catalog.get("Yuan-ti Pit Master")?.actions).toContain(
      "Дружба з тваринами [Animal friendship] (лише змії)"
    );
    expect(catalog.get("Annis Hag")?.actions).toContain("Туманна хмара [Fog Cloud]");
  });

  it("перевикористовує id одинадцяти записів партії 19, замінюючи, а не додаючи до успадкованого каталогу", () => {
    const list = getAllCreatures("RULES_2014");
    expect(new Set(list.map((c) => c.creatureId)).size).toBe(list.length);
    expect(list.filter((c) => c.creatureId === 112).length).toBe(1);
    expect(catalog.get("Troll")?.creatureId).toBe(112);
    expect(catalog.get("Vampire Spawn")?.creatureId).toBe(154);
    expect(catalog.get("Water Elemental")?.creatureId).toBe(212);
    expect(catalog.get("Yuan-ti Pit Master")?.creatureId).toBe(423);
    expect(catalog.get("Xorn")?.name).toBe("Ксорн (Камʼяний пожирач)");
    expect(catalog.get("Werebear")?.name).toBe("Перевертень: Ведмідь-перевертень (Вербер)");
  });

  it("додає девʼять нових записів партії 19", () => {
    expect(catalog.get("Transmuter Wizard")?.creatureId).toBe(848);
    expect(catalog.get("Cyclops")?.creatureId).toBe(860);
    expect(catalog.get("Umber Hulk")?.name).toBe("Амбер-халк");
    expect(catalog.get("Wraith")?.name).toBe("Мара");
    expect(catalog.get("Chasme")?.name).toBe("Часме");
    expect(catalog.get("Young Remorhaz")?.name).toBe("Молодий ремораз");
    expect(catalog.get("Transmuter Wizard")?.name).toBe("Чарівник-перетворювач");
    expect(catalog.get("Conjurer Wizard")?.name).toBe("Чарівник-викликач");
    expect(catalog.get("Annis Hag")?.name).toBe("Анніс-відьма");
    expect(catalog.get("Wood Woad")?.name).toBe("Лісовий воуд");
    expect(catalog.get("Cyclops")?.name).toBe("Циклоп");
  });

  it("тримає обмеження за подобою в назвах дій ведмедя-перевертня, як партія 17", () => {
    expect(catalog.get("Werebear")?.actions).toContain("Укус{{Bite}} (лише в подобі ведмедя чи гібрида)");
    expect(catalog.get("Werebear")?.actions).toContain("Кіготь{{Claw}} (лише в подобі ведмедя чи гібрида)");
    expect(catalog.get("Werebear")?.actions).toContain(
      "Велика сокира{{Greataxe}} (лише в подобі гуманоїда чи гібрида)"
    );
    expect(catalog.get("Yuan-ti Pit Master")?.actions).toContain(
      "Чаротворення{{Spellcasting}} (лише в подобі юань-ті)"
    );
  });

  it("бере назви рис зі словника й 2024-двійника там, де ратифікований глосарій мовчить", () => {
    expect(catalog.get("Tanarukk")?.actions).toContain("Дворучний меч");
    expect(catalog.get("Cyclops")?.actions).toContain("Велика дубинка");
    expect(catalog.get("Umber Hulk")?.specialAbilities).toContain("Тунельник");
    expect(catalog.get("Vampire Spawn")?.specialAbilities).toContain("Кілок у серце");
    expect(catalog.get("Water Elemental")?.specialAbilities).toContain("Замерзання");
    expect(catalog.get("Wraith")?.actions).toContain("Створення привида");
    expect(catalog.get("Xorn")?.specialAbilities).toContain("Чуття скарбів");
    expect(catalog.get("Chasme")?.specialAbilities).toContain("Дзижчання");
    expect(catalog.get("Chasme")?.actions).toContain("Хоботок");
  });

  it("розводить «Погляд смерті» бодака й «Смертельний погляд» морської відьми", () => {
    expect(catalog.get("Bodak")?.specialAbilities).toContain("Погляд смерті");
    expect(catalog.get("Bodak")?.specialAbilities).not.toContain("Смертельний погляд");
    expect(catalog.get("Sea Hag")?.actions).toContain("Смертельний погляд");
  });

  /// Партія 2 KR17.5, 2026-08-28: проза бестіарію 2014 зведена до ратифікованої
  /// «променевої шкоди». Обидві зняті форми заборонені тут поіменно, бо саме на цих
  /// двох записах вони трималися найдовше.
  it("тримає «променеву шкоду» замість обох знятих форм", () => {
    expect(catalog.get("Vampire Spawn")?.specialAbilities).toContain("променевої шкоди");
    expect(catalog.get("Vampire Spawn")?.specialAbilities).not.toContain("Світлом");
    expect(catalog.get("Vampire Spawn")?.specialAbilities).not.toContain("променист");
    expect(catalog.get("Bodak")?.specialAbilities).toContain("променевої шкоди");
    expect(catalog.get("Bodak")?.specialAbilities).not.toContain("Світлом");
  });

  it("лишає «Удар рогами» рогатому трицератопсу, а «Ріг» — єдинорогові", () => {
    expect(catalog.get("Triceratops")?.actions).toContain("Удар рогами");
    expect(catalog.get("Triceratops")?.actions).not.toContain("Удар бивнями");
    expect(catalog.get("Unicorn")?.actions).toContain("Ріг");
    expect(catalog.get("Chimera")?.actions).toContain("Роги");
  });

  it("складає назву риси амбер-халка попри одруковану «Caze» в джерелі", () => {
    expect(catalog.get("Umber Hulk")?.specialAbilities).toContain("Спантеличливий погляд");
    expect(catalog.get("Umber Hulk")?.specialAbilities).not.toMatch(/Caze|Кейз/);
  });

  it("десять відкладених записів лишаються pending, блокувань поза дефектом джерела немає", () => {
    for (const slug of BATCH_NINETEEN_DEFERRED_SLUGS) {
      const row = manifest.find((r) => r.edition === "RULES_2014" && r.slug === slug);
      expect(row?.status).toBe(expectedStatusAfterGleaning(slug));
      expect(row?.batch).toBe(19);
    }
    expect(BATCH_NINETEEN_BLOCKED_SLUGS.size).toBe(0);
  });
});

describe("KR12.3 — партія 18 у зібраному каталозі 2014", () => {
  const catalog = byNameEng(getAllCreatures("RULES_2014"));
  const pending = new Set([...BATCH_EIGHTEEN_DEFERRED_SLUGS, ...BATCH_EIGHTEEN_BLOCKED_SLUGS]);

  it("кожна перекладена істота партії 18 має українську назву, опис дій і коректний ruleset", () => {
    for (const row of manifest.filter((r) => r.edition === "RULES_2014" && r.batch === 18)) {
      if (pending.has(row.slug)) continue;
      const creature = catalog.get(row.nameEng);
      expect(creature, `${row.nameEng} відсутня в каталозі`).toBeDefined();
      expect(creature!.creatureId).toBe(row.creatureId);
      expect(creature!.ruleset).toBe("RULES_2014");
      expect(creature!.name).toMatch(/[Ѐ-ӿ]/);
      expect(creature!.actions).toMatch(/[Ѐ-ӿ]/);
    }
  });

  it("тримає fields-обхід мов для всіх шести рядків, що виходять за просте перелічення", () => {
    expect(catalog.get("Enchanter Wizard")?.languages).toBe("будь-які чотири мови");
    expect(catalog.get("Kraken Priest")?.languages).toBe("будь-які дві мови");
    expect(catalog.get("Gladiator")?.languages).toBe("будь-яка одна мова (зазвичай Загальна)");
    expect(catalog.get("Master Thief")?.languages).toBe(
      "будь-яка одна мова (зазвичай Загальна) плюс Злодійський жаргон"
    );
    expect(catalog.get("Flesh Golem")?.languages).toBe(
      "розуміє мови свого творця, але не може говорити"
    );
    expect(catalog.get("Revenant")?.languages).toBe("мови, які знав за життя");
  });

  it("тримає fields-обхід резисту й імунітету там, де «nonmagical attacks» ламає список", () => {
    expect(catalog.get("Earth Elemental")?.damageResistance).toBe(
      "Дробляча, Колюча, Рубляча від немагічної зброї"
    );
    expect(catalog.get("Fire Elemental")?.damageResistance).toBe(
      "Дробляча, Колюча, Рубляча від немагічної зброї"
    );
    expect(catalog.get("Salamander")?.damageResistance).toBe(
      "Дробляча, Колюча, Рубляча від немагічної зброї"
    );
    expect(catalog.get("Mezzoloth")?.damageResistance).toBe(
      "Холодна, Вогняна, Блискавична; Дробляча, Колюча, Рубляча від немагічної зброї"
    );
    expect(catalog.get("Night Hag")?.damageResistance).toBe(
      "Холодна, Вогняна; Дробляча, Колюча, Рубляча від немагічної, не посрібленої зброї"
    );
    expect(catalog.get("Flesh Golem")?.damageImmunity).toBe(
      "Блискавична, Отруйна; Дробляча, Колюча, Рубляча від немагічної, не адамантинової зброї"
    );
  });

  it("тримає перший fields-обхід навички корпусу і дужковий хвіст сліпозору", () => {
    expect(catalog.get("Red Slaad")?.skills).toBe("Уважність +1");
    expect(catalog.get("Shambling Mound")?.senses).toBe(
      "Сліпозір 60 фт. (сліпий за межами цього радіусу), Пасивна уважність 10"
    );
  });

  it("девʼятнадцятий запис дефекту «список заклинань поза <p>-абзацом» — чотири списки за spells.json", () => {
    expect(catalog.get("Enchanter Wizard")?.actions).toContain("Дружба [Friends]");
    expect(catalog.get("Enchanter Wizard")?.actions).toContain("Мови [Tongues]");
    expect(catalog.get("Kraken Priest")?.actions).toContain("Наказ [Command]");
    expect(catalog.get("Kraken Priest")?.actions).toContain(
      "Чорні щупальця Еварда [Evard's Black Tentacles]"
    );
    expect(catalog.get("Mezzoloth")?.specialAbilities).toContain("Вбивча хмара [Cloudkill]");
    expect(catalog.get("Night Hag")?.specialAbilities).toContain(
      "Планарний перехід [Plane Shift] (лише на себе)"
    );
  });

  it("перевикористовує id пʼятнадцяти записів партії 18, замінюючи, а не додаючи до успадкованого каталогу", () => {
    const list = getAllCreatures("RULES_2014");
    expect(new Set(list.map((c) => c.creatureId)).size).toBe(list.length);
    expect(list.filter((c) => c.creatureId === 213).length).toBe(1);
    expect(catalog.get("Earth Elemental")?.creatureId).toBe(213);
    expect(catalog.get("Fire Elemental")?.creatureId).toBe(211);
    expect(catalog.get("Flesh Golem")?.creatureId).toBe(191);
    expect(catalog.get("Master Thief")?.creatureId).toBe(384);
    // Рішення власника 2026-08-25 (питання 29): `hill` — це пагорб, а не гора, і «Гірський»
    // вже зайнятий Mountain Dwarf. Термін ратифіковано як **«Пагорбовий велетень»** і зведено
    // по обох каталогах, аліасах пошуку, сіді рис і прозі магічних предметів.
    expect(catalog.get("Hill Giant")?.name).toBe("Пагорбовий велетень (Хілл Джайент)");
    expect(catalog.get("Giant Shark")?.name).toBe("Гігантська акула (Мегалодон)");
  });

  it("додає шість нових записів партії 18", () => {
    expect(catalog.get("Enchanter Wizard")?.creatureId).toBe(832);
    expect(catalog.get("Revenant")?.creatureId).toBe(842);
    expect(catalog.get("Enchanter Wizard")?.name).toBe("Чарівник-зачаровувач");
    expect(catalog.get("Half-Red Dragon Veteran")?.name).toBe("Червоний напівдракон-ветеран");
    expect(catalog.get("Kraken Priest")?.name).toBe("Жрець кракена");
    expect(catalog.get("Mezzoloth")?.name).toBe("Мезолот");
    expect(catalog.get("Red Slaad")?.name).toBe("Червоний слаад");
    expect(catalog.get("Revenant")?.name).toBe("Ревенант");
  });

  it("складає назву дії, розірвану жирним шрифтом джерела, замість того щоб лишити «Вогонь»", () => {
    expect(catalog.get("Half-Red Dragon Veteran")?.actions).toContain(
      "Вогняний подих{{Fire Breath}} (перезарядка 5–6)"
    );
    expect(catalog.get("Half-Red Dragon Veteran")?.actions).not.toContain("Подих (перезарядка");
  });

  it("бере назви рис зі словника й 2024-двійника там, де ратифікований глосарій мовчить", () => {
    expect(catalog.get("Earth Elemental")?.specialAbilities).toContain("Земляне ковзання");
    expect(catalog.get("Flesh Golem")?.specialAbilities).toContain("Незмінна форма");
    expect(catalog.get("Gladiator")?.actions).toContain("Удар щитом");
    expect(catalog.get("Otyugh")?.actions).toContain("Удар щупальцями");
    expect(catalog.get("Revenant")?.actions).toContain("Мстивий погляд");
    expect(catalog.get("Roper")?.actions).toContain("Змотування");
    expect(catalog.get("Half-Red Dragon Veteran")?.actions).toContain("Важкий арбалет");
    expect(catalog.get("Mezzoloth")?.actions).toContain("Тризуб");
    expect(catalog.get("Hill Giant")?.actions).toContain("Велика дубинка");
  });

  it("тримає варіанти 2014 там, де 2024 перейменував: Ухилення, Ефірність", () => {
    expect(catalog.get("Master Thief")?.specialAbilities).toContain("Ухилення");
    expect(catalog.get("Master Thief")?.specialAbilities).not.toContain("Ухиляння");
    expect(catalog.get("Night Hag")?.actions).toContain("Ефірність");
    expect(catalog.get("Night Hag")?.actions).not.toContain("Етерність");
  });

  it("бере «Надприродне ухилення» з назви класової риси, а не з дрейфу 2024", () => {
    expect(catalog.get("Master Thief")?.reactions).toContain("Надприродне ухилення");
  });

  it("тримає словникові стани проти дрейфу: Скований, Засліплений, Окамʼянілий", () => {
    expect(catalog.get("Roper")?.actions).toContain("стан Скований");
    expect(catalog.get("Roper")?.actions).not.toContain("Знерухомлений");
    expect(catalog.get("Shambling Mound")?.actions).toContain("стани Засліплений і Скований");
    expect(catalog.get("Gorgon")?.actions).toContain("стан Окамʼянілий");
  });

  it("лишає «Удар рогами» рогатій істоті — той самий поділ Gore, що в партії 16", () => {
    expect(catalog.get("Gorgon")?.actions).toContain("Удар рогами");
    expect(catalog.get("Gorgon")?.actions).not.toContain("Удар бивнями");
    expect(catalog.get("Gorgon")?.actions).toContain("Окамʼянюючий подих{{Petrifying Breath}} (перезарядка 5–6)");
  });

  it("девʼять відкладених записів лишаються pending, блокувань поза дефектом джерела немає", () => {
    for (const slug of BATCH_EIGHTEEN_DEFERRED_SLUGS) {
      const row = manifest.find((r) => r.edition === "RULES_2014" && r.slug === slug);
      expect(row?.status).toBe(expectedStatusAfterGleaning(slug));
      expect(row?.batch).toBe(18);
    }
    expect(BATCH_EIGHTEEN_BLOCKED_SLUGS.size).toBe(0);
  });
});

describe("KR12.3 — партія 17 у зібраному каталозі 2014", () => {
  const catalog = byNameEng(getAllCreatures("RULES_2014"));
  const pending = new Set([...BATCH_SEVENTEEN_DEFERRED_SLUGS, ...BATCH_SEVENTEEN_BLOCKED_SLUGS]);

  it("кожна перекладена істота партії 17 має українську назву, опис дій і коректний ruleset", () => {
    for (const row of manifest.filter((r) => r.edition === "RULES_2014" && r.batch === 17)) {
      if (pending.has(row.slug)) continue;
      const creature = catalog.get(row.nameEng);
      expect(creature, `${row.nameEng} відсутня в каталозі`).toBeDefined();
      expect(creature!.creatureId).toBe(row.creatureId);
      expect(creature!.ruleset).toBe("RULES_2014");
      expect(creature!.name).toMatch(/[Ѐ-ӿ]/);
      expect(creature!.actions).toMatch(/[Ѐ-ӿ]/);
    }
  });

  it("тримає fields-обхід мов для всіх семи рядків, що виходять за просте перелічення", () => {
    expect(catalog.get("Merregon")?.languages).toBe(
      "розуміє Пекельну, але не може говорити, телепатія 120 фт."
    );
    expect(catalog.get("Warlock of the Archfey")?.languages).toBe(
      "будь-які дві мови (зазвичай Сільван)"
    );
    expect(catalog.get("Wereboar")?.languages).toBe("Загальна (не може говорити в подобі вепра)");
    expect(catalog.get("Weretiger")?.languages).toBe("Загальна (не може говорити в подобі тигра)");
    expect(catalog.get("Yeth Hound")?.languages).toBe(
      "розуміє Загальну, Ельфійську та Сільван, але не може ними говорити"
    );
    expect(catalog.get("Banderhobb")?.languages).toBe(
      "розуміє Загальну та мови свого творця, але не може говорити"
    );
    expect(catalog.get("Beholder Zombie")?.languages).toBe(
      "розуміє Глибинну мову та Підземну, але не може говорити"
    );
  });

  it("тримає fields-обхід резисту й імунітету там, де «nonmagical attacks» ламає список", () => {
    expect(catalog.get("Merregon")?.damageResistance).toBe(
      "Холодна; Дробляча, Колюча, Рубляча від немагічної, не посрібленої зброї"
    );
    expect(catalog.get("Barbed Devil")?.damageResistance).toBe(
      "Холодна; Дробляча, Колюча, Рубляча від немагічної, не посрібленої зброї"
    );
    expect(catalog.get("Shadow Demon")?.damageResistance).toBe(
      "Кислотна, Вогняна, Некротична, Громова; Дробляча, Колюча, Рубляча від немагічної зброї"
    );
    expect(catalog.get("Succubus")?.damageResistance).toBe(
      "Холодна, Вогняна, Блискавична, Отруйна; Дробляча, Колюча, Рубляча від немагічної зброї"
    );
    expect(catalog.get("Cambion")?.damageResistance).toBe(
      "Холодна, Вогняна, Блискавична, Отруйна; Дробляча, Колюча, Рубляча від немагічної зброї"
    );
    expect(catalog.get("Wereboar")?.damageImmunity).toBe(
      "Дробляча, Колюча, Рубляча від немагічної, не посрібленої зброї"
    );
    expect(catalog.get("Weretiger")?.damageImmunity).toBe(
      "Дробляча, Колюча, Рубляча від немагічної, не посрібленої зброї"
    );
    expect(catalog.get("Yeth Hound")?.damageImmunity).toBe(
      "Дробляча, Колюча, Рубляча від немагічної, не посрібленої зброї"
    );
  });

  it("тримає fields-обхід КЗ і швидкості, заданих через подобу істоти, для обох перевертнів", () => {
    expect(catalog.get("Wereboar")?.ac).toBe(
      "10 у подобі гуманоїда, 11 (природний обладунок) у подобі вепра чи гібрида"
    );
    expect(catalog.get("Wereboar")?.speed).toBe("30 фт. (40 фт. у подобі вепра)");
    expect(catalog.get("Weretiger")?.speed).toBe("30 фт. (40 фт. у подобі тигра)");
  });

  it("вісімнадцятий запис дефекту «список заклинань поза <p>-абзацом» — пʼять списків, дописані вручну за spells.json", () => {
    expect(catalog.get("Neogi Master")?.actions).toContain("Голод Хадара [Hunger of Hadar]");
    expect(catalog.get("Neogi Master")?.actions).toContain("Настанова [Guidance]");
    expect(catalog.get("Warlock of the Archfey")?.actions).toContain(
      "Розмова з тваринами [Speak with Animals]"
    );
    expect(catalog.get("Warlock of the Archfey")?.actions).toContain(
      "Стримування монстра [Hold Monster]"
    );
    expect(catalog.get("Barlgura")?.specialAbilities).toContain("Уявна сила [Phantasmal Force]");
    expect(catalog.get("Cambion")?.specialAbilities).toContain(
      "Планарний перехід [Plane Shift] (лише на себе)"
    );
    expect(catalog.get("Drow Elite Warrior")?.specialAbilities).toContain(
      "Вогники фей [Faerie fire]"
    );
  });

  it("перевикористовує id восьми записів партії 17, замінюючи, а не додаючи до успадкованого каталогу", () => {
    const list = getAllCreatures("RULES_2014");
    expect(new Set(list.map((c) => c.creatureId)).size).toBe(list.length);
    expect(list.filter((c) => c.creatureId === 109).length).toBe(1);
    expect(catalog.get("Orc War Chief")?.creatureId).toBe(109);
    expect(catalog.get("Bulette")?.creatureId).toBe(206);
    expect(catalog.get("Red Dragon Wyrmling")?.creatureId).toBe(226);
    expect(catalog.get("Neogi Master")?.creatureId).toBe(405);
    expect(catalog.get("Wereboar")?.name).toBe("Перевертень: Вепр-перевертень (Вербоар)");
    expect(catalog.get("Weretiger")?.name).toBe("Перевертень: Тигр-перевертень (Вертайгер)");
  });

  it("додає дванадцять нових записів партії 17", () => {
    expect(catalog.get("Lizard King/Queen")?.creatureId).toBe(812);
    expect(catalog.get("Catoblepas")?.creatureId).toBe(827);
    expect(catalog.get("Lizard King/Queen")?.name).toBe("Король/Королева людоящурів");
    expect(catalog.get("Merregon")?.name).toBe("Мерреґон");
    expect(catalog.get("Orc Blade of Ilneval")?.name).toBe("Орк Клинок Ілневала");
    expect(catalog.get("Yeth Hound")?.name).toBe("Єт-гончак");
    expect(catalog.get("Banderhobb")?.name).toBe("Бандергоб");
    expect(catalog.get("Catoblepas")?.name).toBe("Катоблепас");
  });

  it("не плутає нову назву з успадкованим «Король людоящурів»", () => {
    expect(catalog.get("Lizardfolk King")?.name).toBe("Король людоящурів (Лізардфолк Кінг)");
    expect(catalog.get("Lizardfolk King")?.creatureId).not.toBe(812);
  });

  it("тримає обмеження за подобою в назвах дій обох перевертнів, хоч ратифікований глосарій його зрізає", () => {
    expect(catalog.get("Weretiger")?.actions).toContain("Шабля{{Scimitar}} (лише в подобі гуманоїда чи гібрида)");
    expect(catalog.get("Weretiger")?.actions).toContain("Кіготь{{Claw}} (лише в подобі тигра чи гібрида)");
    expect(catalog.get("Wereboar")?.actions).toContain("Ікла{{Tusks}} (лише в подобі вепра чи гібрида)");
    expect(catalog.get("Wereboar")?.specialAbilities).toContain(
      "Наступ{{Charge}} (лише в подобі вепра чи гібрида)"
    );
    expect(catalog.get("Succubus")?.actions).toContain("Кіготь{{Claw}} (лише в подобі почвари)");
  });

  it("бере назви рис зі словника й 2024-двійника там, де ратифікований глосарій мовчить", () => {
    expect(catalog.get("Merregon")?.actions).toContain("Алебарда");
    expect(catalog.get("Lizard King/Queen")?.actions).toContain("Тризуб");
    expect(catalog.get("Wereboar")?.actions).toContain("Дворучний молот");
    expect(catalog.get("Barbed Devil")?.specialAbilities).toContain("Зубчаста шкіра");
    expect(catalog.get("Barbed Devil")?.actions).toContain("Метання полумʼя");
    expect(catalog.get("Bulette")?.actions).toContain("Смертоносний стрибок");
    expect(catalog.get("Succubus")?.actions).toContain("Виснажливий поцілунок");
    expect(catalog.get("Warlock of the Archfey")?.reactions).toContain(
      "Туманна втеча{{Misty Escape}} (перезаряджається після короткого чи тривалого відпочинку)"
    );
  });

  it("тримає корінь «Ефірн-» у сукуба, хоч 2024-двійник пише «Етерн-»", () => {
    expect(catalog.get("Succubus")?.actions).toContain("Ефірність");
    expect(catalog.get("Succubus")?.actions).not.toContain("Етерність");
  });

  it("тримає варіанти 2014 для рис, де 2024 перейменував: Стрибок з розбігу, Нежива витривалість", () => {
    expect(catalog.get("Barlgura")?.specialAbilities).toContain("Стрибок з розбігу");
    expect(catalog.get("Beholder Zombie")?.specialAbilities).toContain("Нежива витривалість");
  });

  it("нумерує очні промені зомбі спостерігача за прецедентом ґейзера й спектатора", () => {
    expect(catalog.get("Beholder Zombie")?.actions).toContain("Очний промінь");
    expect(catalog.get("Beholder Zombie")?.actions).toContain("1- Паралізуючий промінь");
    expect(catalog.get("Beholder Zombie")?.actions).toContain("2- Промінь страху");
    expect(catalog.get("Beholder Zombie")?.actions).toContain("3- Промінь виснаження");
    expect(catalog.get("Beholder Zombie")?.actions).toContain("4- Промінь дезінтеграції");
  });

  it("десять відкладених записів лишаються pending, блокувань поза дефектом джерела немає", () => {
    for (const slug of BATCH_SEVENTEEN_DEFERRED_SLUGS) {
      const row = manifest.find((r) => r.edition === "RULES_2014" && r.slug === slug);
      expect(row?.status).toBe(expectedStatusAfterGleaning(slug));
      expect(row?.batch).toBe(17);
    }
    expect(BATCH_SEVENTEEN_BLOCKED_SLUGS.size).toBe(0);
  });
});

describe("KR12.3 — партія 16 у зібраному каталозі 2014", () => {
  const catalog = byNameEng(getAllCreatures("RULES_2014"));
  const pending = new Set([...BATCH_SIXTEEN_DEFERRED_SLUGS, ...BATCH_SIXTEEN_BLOCKED_SLUGS]);

  it("кожна перекладена істота партії 16 має українську назву, опис дій і коректний ruleset", () => {
    for (const row of manifest.filter((r) => r.edition === "RULES_2014" && r.batch === 16)) {
      if (pending.has(row.slug)) continue;
      const creature = catalog.get(row.nameEng);
      expect(creature, `${row.nameEng} відсутня в каталозі`).toBeDefined();
      expect(creature!.creatureId).toBe(row.creatureId);
      expect(creature!.ruleset).toBe("RULES_2014");
      expect(creature!.name).toMatch(/[Ѐ-ӿ]/);
      expect(creature!.actions).toMatch(/[Ѐ-ӿ]/);
    }
  });

  it("тримає fields-обхід мов для всіх шести рядків, що виходять за просте перелічення", () => {
    expect(catalog.get("Veteran")?.languages).toBe("будь-яка одна мова (зазвичай Загальна)");
    expect(catalog.get("Water Weird")?.languages).toBe("розуміє Акванську, але не може говорити");
    expect(catalog.get("Werewolf")?.languages).toBe("Загальна (не може говорити в подобі вовка)");
    expect(catalog.get("Chuul")?.languages).toBe("розуміє Глибинну мову, але не може говорити");
    expect(catalog.get("Deathlock")?.languages).toBe("мови, які знав за життя");
    expect(catalog.get("Ghost")?.languages).toBe("мови, які знав за життя");
    expect(catalog.get("Helmed Horror")?.languages).toBe(
      "розуміє мови свого творця, але не може говорити"
    );
  });

  it("тримає fields-обхід резисту й імунітету там, де «nonmagical attacks» ламає список", () => {
    expect(catalog.get("Water Weird")?.damageResistance).toBe(
      "Вогняна; Дробляча, Колюча, Рубляча від немагічної зброї"
    );
    expect(catalog.get("Babau")?.damageResistance).toBe(
      "Холодна, Вогняна, Блискавична; Дробляча, Колюча, Рубляча від немагічної зброї"
    );
    expect(catalog.get("Banshee")?.damageResistance).toBe(
      "Кислотна, Вогняна, Блискавична, Громова; Дробляча, Колюча, Рубляча від немагічної зброї"
    );
    expect(catalog.get("Barghest")?.damageResistance).toBe(
      "Холодна, Блискавична; Дробляча, Колюча, Рубляча від немагічної зброї"
    );
    expect(catalog.get("Deathlock")?.damageResistance).toBe(
      "Некротична; Дробляча, Колюча, Рубляча від немагічної, не посрібленої зброї"
    );
    expect(catalog.get("Ghost")?.damageResistance).toBe(
      "Кислотна, Вогняна, Блискавична, Громова; Дробляча, Колюча, Рубляча від немагічної зброї"
    );
    expect(catalog.get("Helmed Horror")?.damageResistance).toBe(
      "Дробляча, Колюча, Рубляча від немагічної, не адамантинової зброї"
    );
    expect(catalog.get("Werewolf")?.damageImmunity).toBe(
      "Дробляча, Колюча, Рубляча від немагічної, не посрібленої зброї"
    );
    expect(catalog.get("Couatl")?.damageImmunity).toBe(
      "Психічна; Дробляча, Колюча, Рубляча від немагічної зброї"
    );
  });

  it("тримає fields-обхід чуттів із дужковим хвостом сліпозору", () => {
    expect(catalog.get("Black Pudding")?.senses).toBe(
      "Сліпозір 60 фт. (сліпий за межами цього радіусу), Пасивна уважність 8"
    );
    expect(catalog.get("Helmed Horror")?.senses).toBe(
      "Сліпозір 60 фт. (сліпий за межами цього радіусу), Пасивна уважність 14"
    );
  });

  it("тримає перший fields-обхід КЗ і швидкості, заданих через подобу істоти", () => {
    expect(catalog.get("Werewolf")?.ac).toBe(
      "11 у подобі гуманоїда, 12 (природний обладунок) у подобі вовка чи гібрида"
    );
    expect(catalog.get("Werewolf")?.speed).toBe("30 фт. (40 фт. у подобі вовка)");
    expect(catalog.get("Barghest")?.speed).toBe("60 фт. (30 фт. у подобі гобліна)");
  });

  it("сімнадцятий запис дефекту «список заклинань поза <p>-абзацом» — сім списків, дописані вручну за spells.json", () => {
    expect(catalog.get("Babau")?.actions).toContain("Розжарення металу [Heat Metal]");
    expect(catalog.get("Barghest")?.actions).toContain("Двері між вимірами [Dimension Door]");
    expect(catalog.get("Bone Naga")?.specialAbilities).toContain("Наділити прокляттям [Bestow Curse]");
    expect(catalog.get("Bone Naga")?.specialAbilities).toContain("Промінь холоду [Ray of Frost]");
    expect(catalog.get("Couatl")?.specialAbilities).toContain("Сновидіння [Dream]");
    expect(catalog.get("Deathlock")?.actions).toContain("Голод Хадара [Hunger of Hadar]");
    expect(catalog.get("Flameskull")?.specialAbilities).toContain("Палюча сфера [Flaming Sphere]");
    expect(catalog.get("Lamia")?.specialAbilities).toContain("Обітниця [Geas]");
  });

  it("дописує заклинання, яке губить сам сканер: нелінковане імʼя серед лінкованих у тому самому <em>", () => {
    expect(catalog.get("Couatl")?.specialAbilities).toContain(
      "Захист від отрути [Protection from Poison]"
    );
  });

  it("перевикористовує id одинадцяти записів партії 16, замінюючи, а не додаючи до успадкованого каталогу", () => {
    const list = getAllCreatures("RULES_2014");
    expect(new Set(list.map((c) => c.creatureId)).size).toBe(list.length);
    expect(list.filter((c) => c.creatureId === 151).length).toBe(1);
    expect(catalog.get("Veteran")?.creatureId).toBe(126);
    expect(catalog.get("Ghost")?.creatureId).toBe(151);
    expect(catalog.get("Black Pudding")?.creatureId).toBe(185);
    expect(catalog.get("Werewolf")?.name).toBe("Перевертень: Вовкулака (Вервульф)");
  });

  it("додає девʼять нових записів партії 16", () => {
    expect(catalog.get("Water Weird")?.creatureId).toBe(797);
    expect(catalog.get("Lamia")?.creatureId).toBe(811);
    expect(catalog.get("Water Weird")?.name).toBe("Водяний дух");
    expect(catalog.get("Banshee")?.name).toBe("Банші");
    expect(catalog.get("Barghest")?.name).toBe("Барґест");
    expect(catalog.get("Bone Naga")?.name).toBe("Кістяна нага");
    expect(catalog.get("Elephant")?.name).toBe("Слон");
    expect(catalog.get("Flameskull")?.name).toBe("Полумʼяний череп");
    expect(catalog.get("Girallon")?.name).toBe("Ґіраллон");
    expect(catalog.get("Helmed Horror")?.name).toBe("Шоломований жах");
  });

  it("бере назви рис зі словника й 2024-двійника там, де ратифікований глосарій мовчить", () => {
    expect(catalog.get("Veteran")?.actions).toContain("Важкий арбалет");
    expect(catalog.get("Ettin")?.actions).toContain("Бойова сокира");
    expect(catalog.get("Chuul")?.actions).toContain("Кліщі");
    expect(catalog.get("Black Pudding")?.specialAbilities).toContain("Їдка форма");
    expect(catalog.get("Ghost")?.actions).toContain("Одержимість{{Possession}} (перезарядка 6)");
    expect(catalog.get("Helmed Horror")?.specialAbilities).toContain("Імунітет до заклинань");
  });

  it("тримає корінь «Ефірн-» у привида, хоч 2024-двійник пише «Етерн-»", () => {
    expect(catalog.get("Ghost")?.specialAbilities).toContain("Ефірний зір");
    expect(catalog.get("Ghost")?.actions).toContain("Ефірність");
  });

  it("розділяє Gore на дві українські назви: слон бʼє бивнями, а не рогами", () => {
    expect(catalog.get("Elephant")?.actions).toContain("Удар бивнями");
    expect(catalog.get("Elephant")?.actions).not.toContain("Удар рогами");
    expect(catalog.get("Rhinoceros")?.actions).toContain("Удар рогами");
  });

  it("вісім відкладених лишаються pending, а два заблоковані закрила добірка", () => {
    for (const slug of [...BATCH_SIXTEEN_DEFERRED_SLUGS, ...BATCH_SIXTEEN_BLOCKED_SLUGS]) {
      const row = manifest.find((r) => r.edition === "RULES_2014" && r.slug === slug);
      expect(row?.status).toBe(expectedStatusAfterGleaning(slug));
      expect(row?.batch).toBe(16);
    }
    expect(BATCH_SIXTEEN_BLOCKED_SLUGS.size).toBe(2);
  });
});

describe("KR12.3 — партія 15 у зібраному каталозі 2014", () => {
  const catalog = byNameEng(getAllCreatures("RULES_2014"));
  const pending = new Set([...BATCH_FIFTEEN_DEFERRED_SLUGS, ...BATCH_FIFTEEN_BLOCKED_SLUGS]);

  it("кожна перекладена істота партії 15 має українську назву, опис дій і коректний ruleset", () => {
    for (const row of manifest.filter((r) => r.edition === "RULES_2014" && r.batch === 15)) {
      if (pending.has(row.slug)) continue;
      const creature = catalog.get(row.nameEng);
      expect(creature, `${row.nameEng} відсутня в каталозі`).toBeDefined();
      expect(creature!.creatureId).toBe(row.creatureId);
      expect(creature!.ruleset).toBe("RULES_2014");
      expect(creature!.name).toMatch(/[Ѐ-ӿ]/);
      expect(creature!.actions).toMatch(/[Ѐ-ӿ]/);
    }
  });

  it("тримає fields-обхід мов для всіх семи рядків, що виходять за просте перелічення", () => {
    expect(catalog.get("Hell Hound")?.languages).toBe("розуміє Пекельну, але не може говорити");
    expect(catalog.get("Illusionist Wizard")?.languages).toBe("будь-які чотири мови");
    expect(catalog.get("Knight")?.languages).toBe("будь-яка одна мова (зазвичай Загальна)");
    expect(catalog.get("Martial Arts Adept")?.languages).toBe("будь-яка одна мова (зазвичай Загальна)");
    expect(catalog.get("Mummy")?.languages).toBe("мови, які знав за життя");
    expect(catalog.get("Nightmare")?.languages).toBe(
      "розуміє Мову безодні, Загальну та Пекельну, але не може ними говорити"
    );
    expect(catalog.get("Swashbuckler")?.languages).toBe("будь-яка одна мова (зазвичай Загальна)");
  });

  it("тримає fields-обхід резисту там, де «nonmagical attacks» ламає список", () => {
    expect(catalog.get("Merrenoloth")?.damageResistance).toBe(
      "Холодна, Вогняна, Блискавична; Дробляча, Колюча, Рубляча від немагічної зброї"
    );
    expect(catalog.get("Mummy")?.damageResistance).toBe(
      "Дробляча, Колюча, Рубляча від немагічної зброї"
    );
  });

  it("тримає fields-обхід КЗ там, де опис броні називає рису, а не обладунок", () => {
    expect(catalog.get("Martial Arts Adept")?.ac).toBe("16 (Захист без обладунків)");
    expect(catalog.get("Swashbuckler")?.ac).toBe("17 (шкіряний обладунок, Галантний захист)");
  });

  it("шістнадцятий запис дефекту «список заклинань поза <p>-абзацом» — три списки, дописані вручну за spells.json", () => {
    expect(catalog.get("Green Hag")?.specialAbilities).toContain(
      "Злісне глузування [Vicious Mockery]"
    );
    expect(catalog.get("Illusionist Wizard")?.actions).toContain(
      "Фантомний скакун [phantom steed]"
    );
    expect(catalog.get("Merrenoloth")?.actions).toContain("Контроль води [Control Water]");
  });

  it("відновлює опис Hell Hound, який джерело друкує поза <p>-абзацом", () => {
    expect(catalog.get("Hell Hound")?.description).toContain("Вогнедишні почвари");
  });

  it("перевикористовує id тринадцяти записів партії 15, замінюючи, а не додаючи до успадкованого каталогу", () => {
    const list = getAllCreatures("RULES_2014");
    expect(new Set(list.map((c) => c.creatureId)).size).toBe(list.length);
    expect(list.filter((c) => c.creatureId === 281).length).toBe(1);
    expect(catalog.get("Green Hag")?.creatureId).toBe(281);
    expect(catalog.get("Killer Whale")?.creatureId).toBe(331);
    expect(catalog.get("Spectator")?.creatureId).toBe(301);
    expect(catalog.get("Martial Arts Adept")?.name).toBe("Адепт бойових мистецтв (Монах)");
  });

  it("додає девʼять нових записів партії 15", () => {
    expect(catalog.get("Hook Horror")?.creatureId).toBe(781);
    expect(catalog.get("Trapper")?.creatureId).toBe(795);
    expect(catalog.get("Illusionist Wizard")?.name).toBe("Чарівник-ілюзіоніст");
    expect(catalog.get("Leucrotta")?.name).toBe("Левкрота");
    expect(catalog.get("Merrenoloth")?.name).toBe("Меренолот");
    expect(catalog.get("Redcap")?.name).toBe("Червоний ковпак");
    expect(catalog.get("Swashbuckler")?.name).toBe("Шибайголова");
    expect(catalog.get("Ogre Chain Brute")?.name).toBe("Огр-громила з ланцюгом");
    expect(catalog.get("Orc Red Fang of Shargaas")?.name).toBe("Орк Червоне Ікло Шаргааса");
  });

  it("бере назви рис зі словника й 2024-двійника там, де ратифікований глосарій мовчить", () => {
    expect(catalog.get("Knight")?.actions).toContain("Дворучний меч");
    expect(catalog.get("Swashbuckler")?.actions).toContain("Рапіра");
    expect(catalog.get("Hook Horror")?.actions).toContain("Гак");
    expect(catalog.get("Manticore")?.actions).toContain("Хвостовий шип");
    expect(catalog.get("Spectator")?.reactions).toContain("Відбиття заклинань");
    expect(catalog.get("Nightmare")?.specialAbilities).toContain("Дарування вогнестійкості");
  });

  it("тримає корінь «Ефірн-» усередині 2014, хоч 2024-двійник пише «Етерн-»", () => {
    expect(catalog.get("Nightmare")?.actions).toContain("Ефірний крок");
    expect(catalog.get("Phase Spider")?.specialAbilities).toContain("Ефірний стрибок");
    expect(catalog.get("Phase Spider")?.description).toContain("Ефірний план");
  });

  it("сім відкладених лишаються pending, а заблокований словниковим гейтом закрила добірка", () => {
    for (const slug of [...BATCH_FIFTEEN_DEFERRED_SLUGS, ...BATCH_FIFTEEN_BLOCKED_SLUGS]) {
      const row = manifest.find((r) => r.edition === "RULES_2014" && r.slug === slug);
      expect(row?.status).toBe(expectedStatusAfterGleaning(slug));
      expect(row?.batch).toBe(15);
    }
    expect(BATCH_FIFTEEN_BLOCKED_SLUGS.size).toBe(1);
  });
});

describe("KR12.3 — партія 14 у зібраному каталозі 2014", () => {
  const catalog = byNameEng(getAllCreatures("RULES_2014"));
  const pending = new Set([...BATCH_FOURTEEN_DEFERRED_SLUGS, ...BATCH_FOURTEEN_BLOCKED_SLUGS]);

  it("кожна перекладена істота партії 14 має українську назву, опис дій і коректний ruleset", () => {
    for (const row of manifest.filter((r) => r.edition === "RULES_2014" && r.batch === 14)) {
      if (pending.has(row.slug)) continue;
      const creature = catalog.get(row.nameEng);
      expect(creature, `${row.nameEng} відсутня в каталозі`).toBeDefined();
      expect(creature!.creatureId).toBe(row.creatureId);
      expect(creature!.ruleset).toBe("RULES_2014");
      expect(creature!.name).toMatch(/[Ѐ-ӿ]/);
      expect(creature!.actions).toMatch(/[Ѐ-ӿ]/);
    }
  });

  it("тримає fields-обхід мов для обох рядків, що виходять за просте перелічення", () => {
    expect(catalog.get("Archer")?.languages).toBe("будь-яка одна мова (зазвичай Загальна)");
    expect(catalog.get("Brain in a Jar")?.languages).toBe("мови, які знав за життя");
  });

  it("тримає fields-обхід резисту там, де «nonmagical attacks» ламає список", () => {
    expect(catalog.get("Bearded Devil")?.damageResistance).toBe(
      "Холодна; Дробляча, Колюча, Рубляча від немагічної, не посрібленої зброї"
    );
  });

  it("тримає fields-обхід чуттів там, де дужковий хвіст сліпозору лишається англійським", () => {
    expect(catalog.get("Brain in a Jar")?.senses).toBe(
      "Сліпозір 120 фт. (сліпий за межами цього радіусу), Пасивна уважність 10"
    );
  });

  it("пʼятнадцятий запис дефекту «список заклинань поза <p>-абзацом» — три списки, дописані вручну за spells.json", () => {
    expect(catalog.get("Brain in a Jar")?.specialAbilities).toContain(
      "Огидний сміх Таші [Tasha's Hideous Laughter]"
    );
    expect(catalog.get("Derro Savant")?.actions).toContain("Павуче лазіння [Spider Climb]");
    expect(catalog.get("Githyanki Warrior")?.specialAbilities).toContain(
      "Невиявлення [Nondetection]"
    );
  });

  it("перевикористовує id чотирьох записів партії 14, замінюючи, а не додаючи до успадкованого каталогу", () => {
    const list = getAllCreatures("RULES_2014");
    expect(new Set(list.map((c) => c.creatureId)).size).toBe(list.length);
    expect(list.filter((c) => c.creatureId === 284).length).toBe(1);
    expect(catalog.get("Ankylosaurus")?.creatureId).toBe(328);
    expect(catalog.get("Basilisk")?.creatureId).toBe(198);
    expect(catalog.get("Giant Scorpion")?.creatureId).toBe(179);
    expect(catalog.get("Bearded Devil")?.name).toBe("Бородатий диявол (Барбазу)");
  });

  it("додає дванадцять нових записів партії 14", () => {
    expect(catalog.get("Archer")?.creatureId).toBe(755);
    expect(catalog.get("Yuan-ti Broodguard")?.creatureId).toBe(754);
    expect(catalog.get("Giff")?.name).toBe("Ґіф");
    expect(catalog.get("Bugbear Chief")?.name).toBe("Ведмебай-вождь");
    expect(catalog.get("Derro Savant")?.name).toBe("Дерро-мудрець");
    expect(catalog.get("Displacer Beast")?.type).toBe("Чудовисько");
  });

  it("бере назви рис зі словника й 2024-двійника там, де ратифікований глосарій мовчить", () => {
    expect(catalog.get("Giant Scorpion")?.actions).toContain("Кіготь");
    expect(catalog.get("Githyanki Warrior")?.actions).toContain("Дворучний меч");
    expect(catalog.get("Derro Savant")?.actions).toContain("Палиця");
    expect(catalog.get("Displacer Beast")?.specialAbilities).toContain("Ухиляння");
    expect(catalog.get("Doppelganger")?.actions).toContain("Читання думок");
    expect(catalog.get("Doppelganger")?.actions).toContain("Аналіз поведінки");
  });

  it("чотирнадцять відкладених записів лишаються pending, блокувань поза дефектом немає", () => {
    for (const slug of BATCH_FOURTEEN_DEFERRED_SLUGS) {
      const row = manifest.find((r) => r.edition === "RULES_2014" && r.slug === slug);
      expect(row?.status).toBe(expectedStatusAfterGleaning(slug));
      expect(row?.batch).toBe(14);
    }
    expect(BATCH_FOURTEEN_BLOCKED_SLUGS.size).toBe(0);
  });
});

describe("KR12.3 — партія 13 у зібраному каталозі 2014", () => {
  const catalog = byNameEng(getAllCreatures("RULES_2014"));
  const pending = new Set([...BATCH_THIRTEEN_DEFERRED_SLUGS, ...BATCH_THIRTEEN_BLOCKED_SLUGS]);

  it("кожна перекладена істота партії 13 має українську назву, опис дій і коректний ruleset", () => {
    for (const row of manifest.filter((r) => r.edition === "RULES_2014" && r.batch === 13)) {
      if (pending.has(row.slug)) continue;
      const creature = catalog.get(row.nameEng);
      expect(creature, `${row.nameEng} відсутня в каталозі`).toBeDefined();
      expect(creature!.creatureId).toBe(row.creatureId);
      expect(creature!.ruleset).toBe("RULES_2014");
      expect(creature!.name).toMatch(/[Ѐ-ӿ]/);
      expect(creature!.actions).toMatch(/[Ѐ-ӿ]/);
    }
  });

  it("тримає fields-обхід мов для всіх пʼяти рядків, що виходять за просте перелічення", () => {
    expect(catalog.get("Pegasus")?.languages).toBe(
      "розуміє Небесну, Загальну, Ельфійську та Сільван, але не може ними говорити"
    );
    expect(catalog.get("Peryton")?.languages).toBe(
      "розуміє Загальну та Ельфійську, але не може говорити"
    );
    expect(catalog.get("Priest")?.languages).toBe("будь-які дві мови");
    expect(catalog.get("Wererat")?.languages).toBe("Загальна (не може говорити в подобі щура)");
    expect(catalog.get("Will-o'-Wisp")?.languages).toBe("мови, які знав за життя");
  });

  it("тримає fields-обхід резисту та імунітету там, де «nonmagical attacks» ламає список", () => {
    expect(catalog.get("Peryton")?.damageResistance).toBe(
      "Дробляча, Колюча, Рубляча від немагічної зброї"
    );
    expect(catalog.get("Spined Devil")?.damageResistance).toBe(
      "Холодна; Дробляча, Колюча, Рубляча від немагічної, не посрібленої зброї"
    );
    expect(catalog.get("Will-o'-Wisp")?.damageResistance).toBe(
      "Кислотна, Холодна, Вогняна, Некротична, Громова; Дробляча, Колюча, Рубляча від немагічної зброї"
    );
    expect(catalog.get("Wererat")?.damageImmunity).toBe(
      "Дробляча, Колюча, Рубляча від немагічної, не посрібленої зброї"
    );
  });

  it("тримає fields-обхід чуттів там, де дужковий хвіст лишається англійським", () => {
    expect(catalog.get("Rug of Smothering")?.senses).toBe(
      "Сліпозір 60 фт. (сліпий за межами цього радіусу), Пасивна уважність 6"
    );
    expect(catalog.get("Wererat")?.senses).toBe(
      "Темнозір 60 фт. (лише в подобі щура), Пасивна уважність 12"
    );
  });

  it("чотирнадцятий запис дефекту «список заклинань поза <p>-абзацом» — три списки, дописані вручну за spells.json", () => {
    expect(catalog.get("Priest")?.specialAbilities).toContain("Духи захисники [Spirit Guardians]");
    expect(catalog.get("Sahuagin Priestess")?.specialAbilities).toContain(
      "Масове цілюще слово [Mass Healing Word]"
    );
    expect(catalog.get("Tortle Druid")?.actions).toContain("Громова хвиля [Thunderwave]");
  });

  it("перевикористовує id дванадцяти записів партії 13, замінюючи, а не додаючи до успадкованого каталогу", () => {
    const list = getAllCreatures("RULES_2014");
    expect(new Set(list.map((c) => c.creatureId)).size).toBe(list.length);
    expect(list.filter((c) => c.creatureId === 215).length).toBe(1);
    expect(catalog.get("Pegasus")?.name).toBe("Пегас");
    expect(catalog.get("Rug of Smothering")?.name).toBe("Килим задушення (Анімований килим)");
  });

  it("додає девʼять нових записів партії 13", () => {
    expect(catalog.get("Orog")?.creatureId).toBe(738);
    expect(catalog.get("Quetzalcoatlus")?.creatureId).toBe(742);
    expect(catalog.get("Will-o'-Wisp")?.creatureId).toBe(752);
    expect(catalog.get("Quaggoth")?.type).toBe("Гуманоїд (Кваґот)");
    expect(catalog.get("Vegepygmy Chief")?.name).toBe("Вегепігмей-вождь");
  });

  it("вісім відкладених лишаються pending, а блокування «Extra (AideDD)» закрила добірка", () => {
    for (const slug of BATCH_THIRTEEN_DEFERRED_SLUGS) {
      const row = manifest.find((r) => r.edition === "RULES_2014" && r.slug === slug);
      expect(row?.status).toBe(expectedStatusAfterGleaning(slug));
      expect(row?.batch).toBe(13);
    }
    expect(BATCH_THIRTEEN_BLOCKED_SLUGS.size).toBe(1);
    const blocked = manifest.find(
      (r) => r.edition === "RULES_2014" && r.slug === "venerable-shadow"
    );
    expect(blocked?.status).toBe("translated");
    expect(blocked?.batch).toBe(13);
    expect(GLEANED_BY_BATCHES_33_34.has("venerable-shadow")).toBe(true);
    expect(catalog.get("Quetzalcoatlus")?.actions).toMatch(/[Ѐ-ӿ]/);
  });
});

describe("KR12.3 — партія 12 у зібраному каталозі 2014", () => {
  const catalog = byNameEng(getAllCreatures("RULES_2014"));
  const pending = new Set([...BATCH_TWELVE_DEFERRED_SLUGS, ...BATCH_TWELVE_BLOCKED_SLUGS]);

  it("кожна перекладена істота партії 12 має українську назву, опис дій і коректний ruleset", () => {
    for (const row of manifest.filter((r) => r.edition === "RULES_2014" && r.batch === 12)) {
      if (pending.has(row.slug)) continue;
      const creature = catalog.get(row.nameEng);
      expect(creature, `${row.nameEng} відсутня в каталозі`).toBeDefined();
      expect(creature!.creatureId).toBe(row.creatureId);
      expect(creature!.ruleset).toBe("RULES_2014");
      expect(creature!.name).toMatch(/[Ѐ-ӿ]/);
      expect(creature!.actions).toMatch(/[Ѐ-ӿ]/);
    }
  });

  it("тримає fields-обхід КЗ там, де джерело називає рису замість обладунку", () => {
    expect(catalog.get("Hobgoblin Iron Shadow")?.ac).toBe("15 (Захист без обладунків)");
  });

  it("тримає fields-обхід мов для всіх шести «understands … but can't speak» цієї партії", () => {
    expect(catalog.get("Giant Elk")?.languages).toBe(
      "гігантський лось розуміє Загальну, Ельфійську та Сільван, але не може говорити ними"
    );
    expect(catalog.get("Guard Drake")?.languages).toBe("розуміє Драконячу, але не може говорити");
    expect(catalog.get("Intellect Devourer")?.languages).toBe(
      "розуміє Глибинну мову, але не може говорити, телепатія 60 фт."
    );
    expect(catalog.get("Minor Fire Elemental")?.languages).toBe(
      "розуміє Ігнанську, але не може говорити"
    );
    expect(catalog.get("Minotaur Skeleton")?.languages).toBe(
      "розуміє Мову безодні, але не може говорити"
    );
    expect(catalog.get("Ogre Zombie")?.languages).toBe(
      "розуміє Загальну та Мову велетнів, але не може говорити"
    );
    expect(catalog.get("Orc Hand of Yurtrus")?.languages).toBe(
      "розуміє Загальну та Оркську, але не може говорити"
    );
  });

  it("тримає fields-обхід чуттів і резисту ушкоджень там, де дужковий хвіст або «nonmagical attacks» ламають список", () => {
    expect(catalog.get("Intellect Devourer")?.senses).toBe(
      "Сліпозір 60 фт. (сліпий за межами цього радіусу), Пасивна уважність 12"
    );
    expect(catalog.get("Ochre Jelly")?.senses).toBe(
      "Сліпозір 60 фт. (сліпий за межами цього радіусу), Пасивна уважність 8"
    );
    for (const nameEng of ["Grick", "Intellect Devourer", "Minor Fire Elemental"]) {
      expect(catalog.get(nameEng)?.damageResistance).toBe(
        "Дробляча, Колюча, Рубляча від немагічної зброї"
      );
    }
  });

  it("тринадцятий запис дефекту «список заклинань поза <p>-абзацом» — пʼять списків, дописаних вручну за spells.json", () => {
    expect(catalog.get("Githzerai Monk")?.specialAbilities).toContain(
      "Бачення невидимого [See Invisibility]"
    );
    expect(catalog.get("Hobgoblin Iron Shadow")?.actions).toContain(
      "Мовчазний образ [Silent Image]"
    );
    expect(catalog.get("Lizardfolk Shaman")?.specialAbilities).toContain(
      "Проростання шипів [Spike Growth]"
    );
    expect(catalog.get("Orc Claw of Luthic")?.specialAbilities).toContain(
      "Охоронний звʼязок [Warding Bond]"
    );
    expect(catalog.get("Orc Hand of Yurtrus")?.specialAbilities).toContain(
      "Сліпота/глухота [Blindness/Deafness]"
    );
  });

  it("той самий дефект поза списками заклинань: обірваний хвіст речення «Aberrant Ground» відновлено", () => {
    expect(catalog.get("Gibbering Mouther")?.specialAbilities).toContain(
      "її швидкість знижується до 0 до початку її наступного ходу"
    );
  });

  it("перевикористовує id сімнадцяти записів партії 12, замінюючи, а не додаючи до успадкованого каталогу", () => {
    const list = getAllCreatures("RULES_2014");
    expect(new Set(list.map((c) => c.creatureId)).size).toBe(list.length);
    expect(list.filter((c) => c.creatureId === 110).length).toBe(1);
    expect(catalog.get("Ogre")?.name).toBe("Огр");
    expect(catalog.get("Ochre Jelly")?.name).toBe("Охристий желе (Охре Джеллі)");
  });

  it("додає девʼять нових записів партії 12, зокрема перший запис на джерелі з непризначеного ще enum", () => {
    expect(catalog.get("Githzerai Monk")?.creatureId).toBe(725);
    expect(catalog.get("Guard Drake")?.creatureId).toBe(728);
    expect(catalog.get("Orc Hand of Yurtrus")?.creatureId).toBe(737);
    expect(catalog.get("Minor Fire Elemental")?.source).toBe("DDB");
    expect(catalog.get("Orc Claw of Luthic")?.source).toBe("VGTM");
  });

  it("чотири відкладені записи лишаються pending з batch 12 закріпленим, і жодного блокування поза дефектом джерела", () => {
    for (const slug of BATCH_TWELVE_DEFERRED_SLUGS) {
      const row = manifest.find((r) => r.edition === "RULES_2014" && r.slug === slug);
      expect(row?.status).toBe(expectedStatusAfterGleaning(slug));
      expect(row?.batch).toBe(12);
    }
    expect(BATCH_TWELVE_BLOCKED_SLUGS.size).toBe(0);
    expect(catalog.get("Meenlock")?.actions).toMatch(/[Ѐ-ӿ]/);
  });
});

describe("KR12.3 — ратифікований глосарій назв рис", () => {
  const features: Record<string, string> = dictionary.DND_DICTIONARY.statblockFeatures;
  /// Only the aidedd batches were rewritten; the hand-written KR11.4 records keep their own
  /// wording until their batch reaches them.
  const importedNames = new Set(
    manifest2014.filter((row) => row.status === "translated").map((row) => row.nameEng)
  );
  const imported = getAllCreatures("RULES_2014").filter((creature) =>
    importedNames.has(creature.nameEng)
  );
  const allSections = imported
    .map((creature) => `${creature.specialAbilities}${creature.actions}${creature.reactions}`)
    .join("");

  it("тримає переможця для кожної назви, що трапилася двічі й більше", () => {
    expect(Object.keys(features).length).toBeGreaterThanOrEqual(119);
    expect(features["Multiattack"]).toBe("Мультиатака");
    expect(features["Amphibious"]).toBe("Амфібія");
    expect(features["Claw"]).toBe("Кіготь");
    expect(features["Claws"]).toBe("Кігті");
    expect(features["Talons"]).toBe("Пазурі");
  });

  it("бере назву зброї зі словника, а не з прецеденту партій", () => {
    expect(features["Scimitar"]).toBe("Шабля");
  });

  it("не лишає в каталозі жодної відкинутої назви як заголовка риси", () => {
    for (const rejected of ["Множинна атака", "Амфібія", "Опір магії", "Сцимітар", "Клішня"]) {
      expect(allSections, `${rejected} мала бути переписана`).not.toContain(`<b>${rejected}.</b>`);
    }
  });

  it("зводить обмеження за використання до одного формату", () => {
    expect(allSections).toContain("(перезарядка 5–6)");
    expect(allSections).toContain("(3 рази на день)");
    for (const oldForm of ["(3/день)", "(1/день)", "(перезарядка 5-6)", "(Перезарядка 5–6)"]) {
      expect(allSections, `${oldForm} мала бути зведена до канонічної`).not.toContain(oldForm);
    }
  });
});

describe("KR12.3 — партія 11 у зібраному каталозі 2014", () => {
  const catalog = byNameEng(getAllCreatures("RULES_2014"));
  const pending = new Set([...BATCH_ELEVEN_DEFERRED_SLUGS, ...BATCH_ELEVEN_BLOCKED_SLUGS]);

  it("кожна перекладена істота партії 11 має українську назву, опис дій і коректний ruleset", () => {
    for (const row of manifest.filter((r) => r.edition === "RULES_2014" && r.batch === 11)) {
      if (pending.has(row.slug)) continue;
      const creature = catalog.get(row.nameEng);
      expect(creature, `${row.nameEng} відсутня в каталозі`).toBeDefined();
      expect(creature!.creatureId).toBe(row.creatureId);
      expect(creature!.ruleset).toBe("RULES_2014");
      expect(creature!.name).toMatch(/[Ѐ-ӿ]/);
      expect(creature!.actions).toMatch(/[Ѐ-ӿ]/);
    }
  });

  it("новий тег типу creatureTypeTags.yuan-ti — копія власної назви істоти тієї ж партії", () => {
    expect(catalog.get("Yuan-ti Pureblood")?.type).toBe("Гуманоїд (Юань-ті)");
    expect(catalog.get("Yuan-ti Pureblood")?.name).toBe("Юань-ті Чистокровний");
  });

  it("тримає fields-обхід КЗ там, де формат джерела виходить за «число (обладунок)»", () => {
    expect(catalog.get("Ankheg")?.ac).toBe("14 (природний обладунок), 11 у поваленому стані");
    expect(catalog.get("Druid")?.ac).toBe("11 (16 із заклинанням «Дубова шкіра»)");
  });

  it("тримає fields-обхід мов там, де джерело подає прозу замість списку мов", () => {
    expect(catalog.get("Bandit Captain")?.languages).toBe("будь-які дві мови");
    expect(catalog.get("Berserker")?.languages).toBe("будь-яка одна мова (зазвичай Загальна)");
    expect(catalog.get("Awakened Tree")?.languages).toBe("розуміє одну мову творця");
    expect(catalog.get("Druid")?.languages).toBe("Друїдська та будь-які дві мови");
  });

  it("тримає fields-обхід чуттів і резисту ушкоджень там, де дужковий хвіст або «adamantine» ламають список", () => {
    expect(catalog.get("Gelatinous Cube")?.senses).toBe(
      "Сліпозір 60 фт. (сліпий за межами цього радіусу), Пасивна уважність 8"
    );
    expect(catalog.get("Gargoyle")?.damageResistance).toBe(
      "Дробляча, Колюча, Рубляча від немагічної, не адамантинової зброї"
    );
  });

  it("дванадцятий структурний дефект джерела — список заклинань поза <p>-абзацом, дописаний вручну за spells.json", () => {
    expect(catalog.get("Yuan-ti Pureblood")?.specialAbilities).toContain(
      "Дружба з тваринами [Animal friendship]"
    );
    expect(catalog.get("Bard")?.actions).toContain("Мерехтливі вогники [Dancing Lights]");
    expect(catalog.get("Cult Fanatic")?.specialAbilities).toContain("Щит віри [Shield of Faith]");
    expect(catalog.get("Druid")?.specialAbilities).toContain("Дубова шкіра [Barkskin]");
  });

  it("перевикористовує id дванадцяти записів партії 11, замінюючи, а не додаючи до успадкованого каталогу", () => {
    const list = getAllCreatures("RULES_2014");
    expect(new Set(list.map((c) => c.creatureId)).size).toBe(list.length);
    expect(list.filter((c) => c.creatureId === 140).length).toBe(1);
    expect(catalog.get("Ghast")?.name).toBe("Ґаст (Вищий упир)");
    expect(catalog.get("Ettercap")?.name).toBe("Еттеркап (Павуколюдина)");
  });

  it("додає сім нових записів партії 11, яких успадкований каталог узагалі не мав", () => {
    expect(catalog.get("Ankheg")?.creatureId).toBe(709);
    expect(catalog.get("Bard")?.creatureId).toBe(712);
    expect(catalog.get("Gargoyle")?.creatureId).toBe(724);
  });

  it("одинадцять відкладених записів лишаються pending з batch 11 закріпленим, і жодного блокування поза дефектом джерела", () => {
    for (const slug of BATCH_ELEVEN_DEFERRED_SLUGS) {
      const row = manifest.find((r) => r.edition === "RULES_2014" && r.slug === slug);
      expect(row?.status).toBe(expectedStatusAfterGleaning(slug));
      expect(row?.batch).toBe(11);
    }
    expect(BATCH_ELEVEN_BLOCKED_SLUGS.size).toBe(0);
    expect(catalog.get("Duergar Xarrorn")?.actions).toMatch(/[Ѐ-ӿ]/);
  });
});

describe("KR12.3 — партія 10 у зібраному каталозі 2014", () => {
  const catalog = byNameEng(getAllCreatures("RULES_2014"));
  const pending = new Set([...BATCH_TEN_DEFERRED_SLUGS, ...BATCH_TEN_BLOCKED_SLUGS]);

  it("кожна перекладена істота партії 10 має українську назву, опис дій і коректний ruleset", () => {
    for (const row of manifest.filter((r) => r.edition === "RULES_2014" && r.batch === 10)) {
      if (pending.has(row.slug)) continue;
      const creature = catalog.get(row.nameEng);
      expect(creature, `${row.nameEng} відсутня в каталозі`).toBeDefined();
      expect(creature!.creatureId).toBe(row.creatureId);
      expect(creature!.ruleset).toBe("RULES_2014");
      expect(creature!.name).toMatch(/[Ѐ-ӿ]/);
      expect(creature!.actions).toMatch(/[Ѐ-ӿ]/);
    }
  });

  it("новий формат світогляду alignments.anyChaoticAlignment — half-ogre", () => {
    expect(catalog.get("Half-Ogre")?.alignment).toBe("Будь-який хаотичний світогляд");
  });

  it("новий тег типу creatureTypeTags.thri-kreen — копія власної назви істоти тієї ж партії", () => {
    expect(catalog.get("Thri-kreen")?.type).toBe("Гуманоїд (Три-крін)");
    expect(catalog.get("Thri-kreen")?.name).toBe("Три-крін");
  });

  it("перекладає уточнення (hover) у швидкості для всього каталогу, не лише для партії 10", () => {
    expect(catalog.get("Specter")?.speed).toBe("0 фт., політ 50 фт. (паріння)");
    expect(catalog.get("Allip")?.speed).toBe("0 фт., політ 40 фт. (паріння)");
    expect(catalog.get("Air Elemental")?.speed).toBe("0 фт., політ 90 фт. (паріння)");

    const stillEnglish = getAllCreatures("RULES_2014").filter((c) => /hover/i.test(c.speed));
    expect(stillEnglish).toEqual([]);
  });

  it("не втягує статблок бічної врізки VARIANTE у дії істоти — kuo-toa-whip має три дії, не шість", () => {
    const actions = catalog.get("Kuo-toa Whip")?.actions ?? "";
    expect(actions).toContain("Патериця-клешня");
    expect(actions).not.toContain("Беззбройний удар");
    expect(actions.match(/<b>/g)?.length).toBe(3);
  });

  it("одинадцятий структурний дефект джерела — список заклинань поза <p>-абзацом, дописаний вручну за spells.json", () => {
    expect(catalog.get("Grung Wildling")?.actions).toContain("Проростання шипів [Spike Growth]");
    expect(catalog.get("Kobold Scale Sorcerer")?.actions).toContain("Левітація [Levitate]");
    expect(catalog.get("Nilbog")?.actions).toContain("Огидний сміх Таші [Tasha's Hideous Laughter]");
    expect(catalog.get("Kuo-toa Whip")?.specialAbilities).toContain("Щит віри [Shield of Faith]");
  });

  it("зберігає fields-обхід резисту ушкоджень там, де крапка з комою або 'not silvered' ламають список", () => {
    expect(catalog.get("Imp")?.damageResistance).toBe(
      "Холодна; Дробляча, Колюча, Рубляча від немагічної, не посрібленої зброї"
    );
    expect(catalog.get("Quasit")?.damageResistance).toBe(
      "Холодна, Вогняна, Блискавична; Дробляча, Колюча, Рубляча від немагічної зброї"
    );
  });

  it("зберігає fields-обхід мов і чуттів там, де формат джерела — проза, а не список термінів", () => {
    expect(catalog.get("Spy")?.languages).toBe("будь-які дві мови");
    expect(catalog.get("Scarecrow")?.languages).toBe("розуміє мови свого творця, але не може говорити");
    expect(catalog.get("Vargouille")?.languages).toBe(
      "розуміє Мову безодні, Пекельну та будь-які мови, які знав до того, як став варґуєм, але не може говорити"
    );
    expect(catalog.get("Quaggoth Spore Servant")?.senses).toBe(
      "Сліпозір 30 фт. (сліпий за межами цього радіусу), Пасивна уважність 8"
    );
  });

  it("перевикористовує id дванадцяти записів партії 10, замінюючи, а не додаючи до успадкованого каталогу", () => {
    const list = getAllCreatures("RULES_2014");
    expect(new Set(list.map((c) => c.creatureId)).size).toBe(list.length);
    expect(list.filter((c) => c.creatureId === 150).length).toBe(1);
    expect(catalog.get("Imp")?.name).toBe("Імп (Бісеня)");
    expect(catalog.get("Specter")?.name).toBe("Привид (Спектр)");
  });

  it("додає нові записи партії 10, яких успадкований каталог узагалі не мав", () => {
    expect(catalog.get("Grung Wildling")?.creatureId).toBe(692);
    expect(catalog.get("Quickling")?.creatureId).toBe(699);
    expect(catalog.get("Thri-kreen")?.creatureId).toBe(706);
  });

  it("девʼять відкладених записів лишаються pending з batch 10 закріпленим, включно з quadrone — четвертим дроуном/модроном поспіль", () => {
    for (const slug of BATCH_TEN_DEFERRED_SLUGS) {
      const row = manifest.find((r) => r.edition === "RULES_2014" && r.slug === slug);
      expect(row?.status).toBe(expectedStatusAfterGleaning(slug));
      expect(row?.batch).toBe(10);
    }
    expect(BATCH_TEN_DEFERRED_SLUGS.has("quadrone")).toBe(true);
  });

  it("два блоковані джерелами поза Source-enum записи закрила добірка партій 33–34", () => {
    for (const slug of BATCH_TEN_BLOCKED_SLUGS) {
      const row = manifest.find((r) => r.edition === "RULES_2014" && r.slug === slug);
      expect(row?.status).toBe(expectedStatusAfterGleaning(slug));
      expect(row?.batch).toBe(10);
      expect(BATCH_TEN_DEFERRED_SLUGS.has(slug)).toBe(false);
    }
  });
});

describe("KR12.3 — партія 8 у зібраному каталозі 2014", () => {
  const catalog = byNameEng(getAllCreatures("RULES_2014"));
  const pending = new Set([...BATCH_EIGHT_DEFERRED_SLUGS, ...BATCH_EIGHT_BLOCKED_SLUGS]);

  it("кожна перекладена істота партії 8 має українську назву, опис дій і коректний ruleset", () => {
    for (const row of manifest.filter((r) => r.edition === "RULES_2014" && r.batch === 8)) {
      if (pending.has(row.slug)) continue;
      const creature = catalog.get(row.nameEng);
      expect(creature, `${row.nameEng} відсутня в каталозі`).toBeDefined();
      expect(creature!.creatureId).toBe(row.creatureId);
      expect(creature!.ruleset).toBe("RULES_2014");
      expect(creature!.name).toMatch(/[Ѐ-ӿ]/);
      expect(creature!.actions).toMatch(/[Ѐ-ӿ]/);
    }
  });

  it("виправляє легасі-помилку Magmin: 'Вогняний мефіт' (плутанина з неіснуючим Fire Mephit) стає 'Магмін', за 2024-прецедентом", () => {
    expect(catalog.get("Magmin")?.name).toBe("Магмін");
    expect(catalog.get("Magma Mephit")?.name).toBe("Магмовий мефіт");
  });

  it("додає новий тег типу creatureTypeTags.shapechanger — owner-затверджений термін «Мінливоформ», окремо від lycanthrope/«Перевертень»", () => {
    expect(catalog.get("Jackalwere")?.type).toBe("Гуманоїд (Мінливоформ)");
  });

  it("тег типу sahuagin — пряма копія власної назви істоти цієї ж партії", () => {
    expect(catalog.get("Sahuagin")?.type).toBe("Гуманоїд (Сахуагін)");
  });

  it("тег типу lizardfolk — пряма копія власної назви істоти цієї ж партії", () => {
    expect(catalog.get("Lizardfolk")?.type).toBe("Гуманоїд (Людоящур)");
  });

  it("девʼятий структурний дефект джерела — список пунктів поза bold-заголовком (не список заклинань): Fallible Invisibility допрацьована вручну з трьома підпунктами", () => {
    const text = catalog.get("Skulk")?.specialAbilities ?? "";
    expect(text).toContain("Поховальні свічки");
    expect(text).toContain("Діти");
    expect(text).toContain("Відбивні поверхні");
  });

  it("зберігає fields-обхід мов для чотирьох прозових фраз поза списком термінів", () => {
    expect(catalog.get("Jackalwere")?.languages).toBe("Загальна (не може говорити в подобі шакала)");
    expect(catalog.get("Nupperibo")?.languages).toBe("розуміє Пекельну, але не може говорити");
    expect(catalog.get("Skulk")?.languages).toBe("розуміє Загальну, але не може говорити");
    expect(catalog.get("Scout")?.languages).toBe("будь-яка одна мова (зазвичай Загальна)");
    expect(catalog.get("Thug")?.languages).toBe("будь-яка одна мова (зазвичай Загальна)");
  });

  it("зберігає fields-обхід резисту ушкоджень там, де кома розриває комбінований список 'X, Y, and Z from nonmagical attacks'", () => {
    expect(catalog.get("Magmin")?.damageResistance).toBe("Дробляча, Колюча, Рубляча від немагічної зброї");
    expect(catalog.get("Shadow")?.damageResistance).toBe(
      "Кислотна, Холодна, Вогняна, Блискавична, Громова; Дробляча, Колюча, Рубляча від немагічної зброї"
    );
  });

  it("зберігає fields-обхід навичок там, де джерело додає дужковий хвіст або зайвий пробіл, що ламає regex navички", () => {
    expect(catalog.get("Shadow")?.skills).toBe("Непомітність +4 (+6 у тьмяному світлі чи темряві)");
    expect(catalog.get("Vine Blight")?.skills).toBe("Непомітність +1");
  });

  it("зберігає fields-обхід КЗ для 'barding scraps' — не покритий існуючим 'armor scraps'-регексом", () => {
    expect(catalog.get("Warhorse Skeleton")?.ac).toBe("13 (обривки кінського обладунку)");
  });

  it("перевикористовує id шістнадцяти записів партії 8, замінюючи, а не додаючи до успадкованого каталогу", () => {
    const list = getAllCreatures("RULES_2014");
    expect(new Set(list.map((c) => c.creatureId)).size).toBe(list.length);
    expect(list.filter((c) => c.creatureId === 103).length).toBe(1);
    expect(catalog.get("Hobgoblin")?.name).toBe("Хобгоблін");
    expect(catalog.get("Worg")?.name).toBe("Ворг (Злий вовк)");
  });

  it("додає нові записи партії 8, яких успадкований каталог узагалі не мав", () => {
    expect(catalog.get("Jackalwere")?.creatureId).toBe(665);
    expect(catalog.get("Vine Blight")?.creatureId).toBe(678);
  });

  it("пʼять відкладених записів лишаються pending з batch 8 закріпленим, включно з третім поспіль порожнім повним Monster Manual (tridrone, після monodrone/duodrone)", () => {
    for (const slug of BATCH_EIGHT_DEFERRED_SLUGS) {
      const row = manifest.find((r) => r.edition === "RULES_2014" && r.slug === slug);
      expect(row?.status).toBe(expectedStatusAfterGleaning(slug));
      expect(row?.batch).toBe(8);
    }
  });

  it("два блоковані записи (ті самі рядки джерела, що в партії 6) закрила добірка партій 33–34", () => {
    for (const slug of BATCH_EIGHT_BLOCKED_SLUGS) {
      const row = manifest.find((r) => r.edition === "RULES_2014" && r.slug === slug);
      expect(row?.status).toBe(expectedStatusAfterGleaning(slug));
      expect(row?.batch).toBe(8);
      expect(BATCH_EIGHT_DEFERRED_SLUGS.has(slug)).toBe(false);
    }
  });
});

describe("KR12.3 — партія 9 у зібраному каталозі 2014", () => {
  const catalog = byNameEng(getAllCreatures("RULES_2014"));
  const pending = new Set([...BATCH_NINE_DEFERRED_SLUGS, ...BATCH_NINE_BLOCKED_SLUGS]);

  it("кожна перекладена істота партії 9 має українську назву, опис дій і коректний ruleset", () => {
    for (const row of manifest.filter((r) => r.edition === "RULES_2014" && r.batch === 9)) {
      if (pending.has(row.slug)) continue;
      const creature = catalog.get(row.nameEng);
      expect(creature, `${row.nameEng} відсутня в каталозі`).toBeDefined();
      expect(creature!.creatureId).toBe(row.creatureId);
      expect(creature!.ruleset).toBe("RULES_2014");
      expect(creature!.name).toMatch(/[Ѐ-ӿ]/);
      expect(creature!.actions).toMatch(/[Ѐ-ӿ]/);
    }
  });

  it("розвʼязує колізію українських імен Giant Frog/Giant Toad: Giant Toad стає 'Гігантська ропуха' за 2024-прецедентом", () => {
    expect(catalog.get("Giant Toad")?.name).toBe("Гігантська ропуха");
    expect(catalog.get("Giant Frog")?.name).toBe("Гігантська жаба (Жаба-бик)");

    const list = getAllCreatures("RULES_2014");
    expect(new Set(list.map((c) => c.name)).size).toBe(list.length);
  });

  it("додає новий тег типу creatureTypeTags.dwarf — копія наявного races.dwarf, той самий клас композиції, що gnome партії 7", () => {
    expect(catalog.get("Duergar")?.type).toBe("Гуманоїд (Дворф)");
  });

  it("виправляє структурний дефект джерела вручну: False Appearance у animated-armor, назва трейту розірвана крапкою на самому aidedd", () => {
    const text = catalog.get("Animated Armor")?.specialAbilities ?? "";
    expect(text).toContain("Хибна подоба");
    expect(text).toContain("неможливо відрізнити від звичайного обладунку");
  });

  it("десятий структурний дефект джерела — список заклинань поза <p>-абзацом: firenewt-warlock-of-imix Spellcasting і dryad/faerie-dragon Innate Spellcasting дописані вручну за spells.json", () => {
    expect(catalog.get("Firenewt Warlock of Imix")?.actions).toContain("Настанова [Guidance]");
    expect(catalog.get("Dryad")?.specialAbilities).toContain("Дубова шкіра [Barkskin]");
    expect(catalog.get("Faerie Dragon")?.specialAbilities).toContain("Перевтілення [Polymorph]");
  });

  it("зберігає fields-обхід КЗ для 'N with barkskin' — не покритий hardcoded 'with mage armor'-гілкою translateAc", () => {
    expect(catalog.get("Dryad")?.ac).toBe("11 (16 із заклинанням «Дубова шкіра»)");
  });

  it("зберігає fields-обхід резисту ушкоджень і мов для fire-snake ('X, Y, and Z from nonmagical attacks' і 'understands X but can't speak')", () => {
    expect(catalog.get("Fire Snake")?.damageResistance).toBe("Дробляча, Колюча, Рубляча від немагічної зброї");
    expect(catalog.get("Fire Snake")?.languages).toBe("розуміє Ігнанську, але не може говорити");
  });

  it("зберігає fields-обхід мов для giant-eagle і giant-vulture — прозові фрази поза списком термінів", () => {
    expect(catalog.get("Giant Eagle")?.languages).toBe(
      "гігантський орел розуміє Загальну та Авранську, але не може говорити ними"
    );
    expect(catalog.get("Giant Vulture")?.languages).toBe("розуміє Загальну, але не може говорити");
  });

  it("перевикористовує id шістнадцяти записів партії 9, замінюючи, а не додаючи до успадкованого каталогу", () => {
    const list = getAllCreatures("RULES_2014");
    expect(new Set(list.map((c) => c.creatureId)).size).toBe(list.length);
    expect(list.filter((c) => c.creatureId === 178).length).toBe(1);
    expect(catalog.get("Bugbear")?.name).toBe("Ведмебай (Баґбер)");
    expect(catalog.get("Duergar")?.name).toBe("Дуергар (Сірий дворф)");
  });

  it("додає нові записи партії 9, яких успадкований каталог узагалі не мав", () => {
    expect(catalog.get("Choker")?.creatureId).toBe(681);
    expect(catalog.get("Giant Vulture")?.creatureId).toBe(690);
  });

  it("шість відкладених записів лишаються pending з batch 9 закріпленим, усі з уже відомих концентрованих джерел (Glory of the Giants/Fizban's/Monsters of the Multiverse)", () => {
    for (const slug of BATCH_NINE_DEFERRED_SLUGS) {
      const row = manifest.find((r) => r.edition === "RULES_2014" && r.slug === slug);
      expect(row?.status).toBe(expectedStatusAfterGleaning(slug));
      expect(row?.batch).toBe(9);
    }
  });

  it("один блокований запис (той самий рядок джерела, що mummified-warrior/reef-manta-ray) закрила добірка партій 33–34", () => {
    for (const slug of BATCH_NINE_BLOCKED_SLUGS) {
      const row = manifest.find((r) => r.edition === "RULES_2014" && r.slug === slug);
      expect(row?.status).toBe(expectedStatusAfterGleaning(slug));
      expect(row?.batch).toBe(9);
      expect(BATCH_NINE_DEFERRED_SLUGS.has(slug)).toBe(false);
    }
  });
});

describe("KR12.3 — партія 7 у зібраному каталозі 2014", () => {
  const catalog = byNameEng(getAllCreatures("RULES_2014"));
  const pending = new Set([...BATCH_SEVEN_DEFERRED_SLUGS, ...BATCH_SEVEN_BLOCKED_SLUGS]);

  it("кожна перекладена істота партії 7 має українську назву, опис дій і коректний ruleset", () => {
    for (const row of manifest.filter((r) => r.edition === "RULES_2014" && r.batch === 7)) {
      if (pending.has(row.slug)) continue;
      const creature = catalog.get(row.nameEng);
      expect(creature, `${row.nameEng} відсутня в каталозі`).toBeDefined();
      expect(creature!.creatureId).toBe(row.creatureId);
      expect(creature!.ruleset).toBe("RULES_2014");
      expect(creature!.name).toMatch(/[Ѐ-ӿ]/);
      expect(creature!.actions).toMatch(/[Ѐ-ӿ]/);
    }
  });

  it("додає новий тег типу creatureTypeTags.gnome для humanoid (Gnome) — пряма копія вже затвердженого races.gnome, не нове рішення", () => {
    expect(catalog.get("Deep Gnome (Svirfneblin)")?.type).toBe("Гуманоїд (Гном)");
  });

  it("gazer перезаписаний партією 7: source виправлено з застарілого VGM на канонічний MPMM (той самий висновок, що bestiary-import.test.ts)", () => {
    expect(catalog.get("Gazer")?.source).toBe("MPMM");
  });

  it("дописує вручну список заклинань Глибинного гнома, що на джерелі йде поза <p> (пʼятий випадок цього класу дефекту в KR12.3)", () => {
    expect(catalog.get("Deep Gnome (Svirfneblin)")?.specialAbilities).toContain(
      "Невиявлення [Nondetection]"
    );
    expect(catalog.get("Deep Gnome (Svirfneblin)")?.specialAbilities).toContain(
      "Маскування [Disguise Self]"
    );
  });

  it("зберігає fields-обхід чуттів там, де за дистанцією йде непереказний хвіст у дужках (той самий клас, що crawling-claw/shrieker партії 3)", () => {
    expect(catalog.get("Violet Fungus")?.senses).toBe(
      "Сліпозір 30 фт. (сліпий за межами цього радіусу), Пасивна уважність 6"
    );
    expect(catalog.get("Gas Spore")?.senses).toBe(
      "Сліпозір 30 фт. (сліпий за межами цього радіусу), Пасивна уважність 5"
    );
    expect(catalog.get("Gray Ooze")?.senses).toBe(
      "Сліпозір 60 фт. (сліпий за межами цього радіусу), Пасивна уважність 8"
    );
  });

  it("зберігає fields-обхід мов для прозової фрази поза списком термінів", () => {
    expect(catalog.get("Zombie")?.languages).toBe(
      "розуміє мови, які знав за життя, але не може говорити"
    );
  });

  it("перевикористовує id шістнадцяти записів партії 7, замінюючи, а не додаючи до успадкованого каталогу", () => {
    const list = getAllCreatures("RULES_2014");
    expect(new Set(list.map((c) => c.creatureId)).size).toBe(list.length);
    expect(list.filter((c) => c.creatureId === 358).length).toBe(1);
    expect(catalog.get("Violet Fungus")?.name).toBe("Фіолетовий гриб (Віолет Фангус)");
    expect(catalog.get("Gnoll")?.name).toBe("Гнол");
  });

  it("додає нові записи партії 7, яких успадкований каталог узагалі не мав", () => {
    expect(catalog.get("Winged Kobold")?.creatureId).toBe(652);
    expect(catalog.get("Giant Goat")?.creatureId).toBe(662);
  });

  it("сім відкладених записів лишаються pending з batch 7 закріпленим", () => {
    for (const slug of BATCH_SEVEN_DEFERRED_SLUGS) {
      const row = manifest.find((r) => r.edition === "RULES_2014" && r.slug === slug);
      expect(row?.status).toBe(expectedStatusAfterGleaning(slug));
      expect(row?.batch).toBe(7);
    }
  });

  it("один блокований запис (той самий рядок джерела, що wild-dog/rothe) закрила добірка партій 33–34", () => {
    for (const slug of BATCH_SEVEN_BLOCKED_SLUGS) {
      const row = manifest.find((r) => r.edition === "RULES_2014" && r.slug === slug);
      expect(row?.status).toBe(expectedStatusAfterGleaning(slug));
      expect(row?.batch).toBe(7);
      expect(BATCH_SEVEN_DEFERRED_SLUGS.has(slug)).toBe(false);
    }
  });
});

describe("KR12.3 — партія 6 у зібраному каталозі 2014", () => {
  const catalog = byNameEng(getAllCreatures("RULES_2014"));
  const pending = new Set([...BATCH_SIX_DEFERRED_SLUGS, ...BATCH_SIX_BLOCKED_SLUGS]);

  it("кожна перекладена істота партії 6 має українську назву, опис дій і коректний ruleset", () => {
    for (const row of manifest.filter((r) => r.edition === "RULES_2014" && r.batch === 6)) {
      if (pending.has(row.slug)) continue;
      const creature = catalog.get(row.nameEng);
      expect(creature, `${row.nameEng} відсутня в каталозі`).toBeDefined();
      expect(creature!.creatureId).toBe(row.creatureId);
      expect(creature!.ruleset).toBe("RULES_2014");
      expect(creature!.name).toMatch(/[Ѐ-ӿ]/);
      expect(creature!.actions).toMatch(/[Ѐ-ӿ]/);
    }
  });

  it("додає три нові теги типу creatureTypeTags для humanoid (Kenku)/(Kuo-toa)/(Troglodyte) — копії назв істот цієї ж партії", () => {
    expect(catalog.get("Kenku")?.type).toBe("Гуманоїд (Кенку)");
    expect(catalog.get("Kuo-toa")?.type).toBe("Гуманоїд (Куо-тоа)");
    expect(catalog.get("Troglodyte")?.type).toBe("Гуманоїд (Троглодит)");
  });

  it("додає нову мову VEGEPYGMY (суфіксний патерн, підтверджений власником)", () => {
    expect(catalog.get("Vegepygmy")?.languages).toBe("Вегепігмейська");
  });

  it("дописує вручну список заклинань Пікси, що на джерелі йде поза <p> (той самий клас дефекту, що mummy-lord партії 2 і drow/apprentice-wizard партії 5)", () => {
    expect(catalog.get("Pixie")?.specialAbilities).toContain("Ремесло друїдів [Druidcraft]");
    expect(catalog.get("Pixie")?.specialAbilities).toContain("Перевтілення [Polymorph]");
  });

  it("зберігає fields-обхід для мов там, де формат джерела — не список", () => {
    expect(catalog.get("Kenku")?.languages).toBe(
      "розуміє Авранську та Загальну, але говорить лише за допомогою своєї риси «Мімікрія»"
    );
    expect(catalog.get("Needle Blight")?.languages).toBe("розуміє Загальну, але не може говорити");
    expect(catalog.get("Pseudodragon")?.languages).toBe(
      "розуміє Загальну та Драконячу, але не може говорити"
    );
  });

  it("перевикористовує id десяти MM-записів партії 6, замінюючи, а не додаючи до успадкованого каталогу", () => {
    const list = getAllCreatures("RULES_2014");
    expect(new Set(list.map((c) => c.creatureId)).size).toBe(list.length);
    expect(list.filter((c) => c.creatureId === 410).length).toBe(1);
    expect(catalog.get("Kobold Inventor")?.name).toBe("Кобольд-винахідник");
  });

  it("додає нові записи партії 6, яких успадкований каталог узагалі не мав", () => {
    expect(catalog.get("Kenku")?.creatureId).toBe(633);
    expect(catalog.get("Velociraptor")?.creatureId).toBe(650);
  });

  it("шість відкладених записів лишаються pending з batch 6 закріпленим", () => {
    for (const slug of BATCH_SIX_DEFERRED_SLUGS) {
      const row = manifest.find((r) => r.edition === "RULES_2014" && r.slug === slug);
      expect(row?.status).toBe(expectedStatusAfterGleaning(slug));
      expect(row?.batch).toBe(6);
    }
  });

  it("три блоковані джерелом поза Source-enum записи закрила добірка партій 33–34", () => {
    for (const slug of BATCH_SIX_BLOCKED_SLUGS) {
      const row = manifest.find((r) => r.edition === "RULES_2014" && r.slug === slug);
      expect(row?.status).toBe(expectedStatusAfterGleaning(slug));
      expect(row?.batch).toBe(6);
      expect(BATCH_SIX_DEFERRED_SLUGS.has(slug)).toBe(false);
    }
  });
});

describe("KR12.3 — партія 5 у зібраному каталозі 2014", () => {
  const catalog = byNameEng(getAllCreatures("RULES_2014"));

  it("кожна перекладена істота партії 5 має українську назву, опис дій і коректний ruleset", () => {
    for (const row of manifest.filter((r) => r.edition === "RULES_2014" && r.batch === 5)) {
      if (BATCH_FIVE_DEFERRED_SLUGS.has(row.slug) || BATCH_FIVE_BLOCKED_SLUGS.has(row.slug)) continue;
      const creature = catalog.get(row.nameEng);
      expect(creature, `${row.nameEng} відсутня в каталозі`).toBeDefined();
      expect(creature!.creatureId).toBe(row.creatureId);
      expect(creature!.ruleset).toBe("RULES_2014");
      expect(creature!.name).toMatch(/[Ѐ-ӿ]/);
      expect(creature!.actions).toMatch(/[Ѐ-ӿ]/);
    }
  });

  it("додає два нові теги типу creatureTypeTags для humanoid (Bullywug)/(Grimlock) — копії назв істот цієї ж партії", () => {
    expect(catalog.get("Bullywug")?.type).toBe("Гуманоїд (Булівуг)");
    expect(catalog.get("Grimlock")?.type).toBe("Гуманоїд (Грімлок)");
  });

  it("дописує вручну списки заклинань, що на джерелі йдуть поза <p> (той самий клас дефекту, що mummy-lord партії 2)", () => {
    expect(catalog.get("Drow")?.specialAbilities).toContain("Мерехтливі вогники [Dancing Lights]");
    expect(catalog.get("Drow")?.specialAbilities).toContain("Вогники фей [Faerie fire]");
    expect(catalog.get("Apprentice Wizard")?.actions).toContain("Магічна рука [Mage Hand]");
    expect(catalog.get("Apprentice Wizard")?.actions).toContain("Обладунок мага [Mage Armor]");
  });

  it("зберігає fields-обхід для мов там, де формат джерела — не список", () => {
    expect(catalog.get("Twig Blight")?.languages).toBe("розуміє Загальну, але не може говорити");
    expect(catalog.get("Blink Dog")?.languages).toBe(
      "Мерехтлива, розуміє Сільван, але не може ним говорити"
    );
    expect(catalog.get("Dretch")?.languages).toBe(
      "Мова безодні, телепатія 60 фт. (працює лише з істотами, що розуміють Мову безодні)"
    );
    expect(catalog.get("Giant Owl")?.languages).toBe(
      "розуміє Загальну, Ельфійську та Сільван, але не може ними говорити"
    );
    expect(catalog.get("Apprentice Wizard")?.languages).toBe("будь-яка одна мова (зазвичай Загальна)");
  });

  it("зберігає fields-обхід для чуттів там, де джерело додає непереказний хвіст у дужках", () => {
    expect(catalog.get("Twig Blight")?.senses).toBe(
      "Сліпозір 60 фт. (сліпий за межами цього радіусу), Пасивна уважність 9"
    );
    expect(catalog.get("Flying Sword")?.senses).toBe(
      "Сліпозір 60 фт. (сліпий за межами цього радіусу), Пасивна уважність 7"
    );
    expect(catalog.get("Grimlock")?.senses).toBe(
      "Сліпозір 30 фт., або 10 фт. поки оглухлий (сліпий за межами цього радіусу), Пасивна уважність 13"
    );
  });

  it("перевикористовує id тринадцяти MM-записів партії 5, замінюючи, а не додаючи до успадкованого каталогу", () => {
    const list = getAllCreatures("RULES_2014");
    expect(new Set(list.map((c) => c.creatureId)).size).toBe(list.length);
    expect(list.filter((c) => c.creatureId === 304).length).toBe(1);
    expect(catalog.get("Grimlock")?.name).toBe("Грімлок");
  });

  it("додає нові записи партії 5, яких успадкований каталог узагалі не мав", () => {
    expect(catalog.get("Twig Blight")?.creatureId).toBe(617);
    expect(catalog.get("Grung")?.creatureId).toBe(631);
  });

  it("розводить назву Giant Frog із наявною Giant Toad — обидві інакше давали б однакове українське імʼя «Гігантська жаба»", () => {
    expect(catalog.get("Giant Frog")?.name).toBe("Гігантська жаба (Жаба-бик)");
    // KR12.3 партія 9 перезаписала цей запис: 2024-каталог розрізняє Giant Frog/«Гігантська жаба»
    // і Giant Toad/«Гігантська ропуха», тож застаріле легасі-імʼя тут більше не вірне.
    expect(catalog.get("Giant Toad")?.name).toBe("Гігантська ропуха");
    expect(catalog.get("Giant Frog")?.name).not.toBe(catalog.get("Giant Toad")?.name);
  });

  it("чотири відкладені записи лишаються pending з batch 5 закріпленим", () => {
    for (const slug of BATCH_FIVE_DEFERRED_SLUGS) {
      const row = manifest.find((r) => r.edition === "RULES_2014" && r.slug === slug);
      expect(row?.status).toBe(expectedStatusAfterGleaning(slug));
      expect(row?.batch).toBe(5);
    }
  });

  it("wild-dog блокувало джерело поза Source-enum, і добірка 33 закрила його через HOMEBREW", () => {
    const wildDog = manifest.find((r) => r.edition === "RULES_2014" && r.slug === "wild-dog");
    expect(wildDog?.status).toBe("translated");
    expect(wildDog?.batch).toBe(5);
    expect(BATCH_FIVE_DEFERRED_SLUGS.has("wild-dog")).toBe(false);
    expect(GLEANED_BY_BATCHES_33_34.has("wild-dog")).toBe(true);
    expect(catalog.get("Wild Dog")?.source).toBe("AL");
  });
});

describe("KR12.3 — партія 4 у зібраному каталозі 2014", () => {
  const catalog = byNameEng(getAllCreatures("RULES_2014"));

  it("кожна перекладена істота партії 4 має українську назву, опис дій і коректний ruleset", () => {
    for (const row of manifest.filter((r) => r.edition === "RULES_2014" && r.batch === 4)) {
      if (BATCH_FOUR_DEFERRED_SLUGS.has(row.slug)) continue;
      const creature = catalog.get(row.nameEng);
      expect(creature, `${row.nameEng} відсутня в каталозі`).toBeDefined();
      expect(creature!.creatureId).toBe(row.creatureId);
      expect(creature!.ruleset).toBe("RULES_2014");
      expect(creature!.name).toMatch(/[Ѐ-ӿ]/);
      expect(creature!.actions).toMatch(/[Ѐ-ӿ]/);
    }
  });

  it("додає два нові ключі світогляду для «any non-lawful/non-good alignment» (нове рішення власника)", () => {
    expect(catalog.get("Bandit")?.alignment).toBe("Будь-який незаконний світогляд");
    expect(catalog.get("Cultist")?.alignment).toBe("Будь-який недобрий світогляд");
  });

  it("додає два нові теги типу для humanoid (Kobold)/(Merfolk) — копії вже перекладених назв істот", () => {
    expect(catalog.get("Kobold")?.type).toBe("Гуманоїд (Кобольд)");
    expect(catalog.get("Merfolk")?.type).toBe("Гуманоїд (Мерфолк)");
  });

  it("зберігає fields-обхід для мов там, де формат джерела — не список", () => {
    expect(catalog.get("Noble")?.languages).toBe("будь-які дві мови");
    expect(catalog.get("Tribal Warrior")?.languages).toBe("будь-яка одна мова");
    expect(catalog.get("Bandit")?.languages).toBe("будь-яка одна мова (зазвичай Загальна)");
    expect(catalog.get("Flumph")?.languages).toBe(
      "розуміє Підземну, але не може говорити, телепатія 60 фт."
    );
    expect(catalog.get("Manes")?.languages).toBe("розуміє Мову безодні, але не може говорити");
    expect(catalog.get("Slaad Tadpole")?.languages).toBe(
      "розуміє Слаадську, але не може говорити"
    );
  });

  it("перевикористовує id девʼятнадцяти MM-записів партії 4, замінюючи, а не додаючи до успадкованого каталогу", () => {
    const list = getAllCreatures("RULES_2014");
    expect(new Set(list.map((c) => c.creatureId)).size).toBe(list.length);
    expect(list.filter((c) => c.creatureId === 111).length).toBe(1);
    expect(catalog.get("Kobold")?.name).toBe("Кобольд");
  });

  it("додає нові записи партії 4, яких успадкований каталог узагалі не мав", () => {
    expect(catalog.get("Spider")?.creatureId).toBe(606);
    expect(catalog.get("Slaad Tadpole")?.creatureId).toBe(616);
  });

  it("три відкладені записи лишаються pending з batch 4 закріпленим", () => {
    for (const slug of BATCH_FOUR_DEFERRED_SLUGS) {
      const row = manifest.find((r) => r.edition === "RULES_2014" && r.slug === slug);
      expect(row?.status).toBe(expectedStatusAfterGleaning(slug));
      expect(row?.batch).toBe(4);
    }
  });
});

describe("KR12.3 — партія 3 у зібраному каталозі 2014", () => {
  const catalog = byNameEng(getAllCreatures("RULES_2014"));

  it("кожна перекладена істота партії 3 має українську назву, опис дій і коректний ruleset", () => {
    for (const row of manifest.filter((r) => r.edition === "RULES_2014" && r.batch === 3)) {
      if (BATCH_THREE_DEFERRED_SLUGS.has(row.slug)) continue;
      const creature = catalog.get(row.nameEng);
      expect(creature, `${row.nameEng} відсутня в каталозі`).toBeDefined();
      expect(creature!.creatureId).toBe(row.creatureId);
      expect(creature!.ruleset).toBe("RULES_2014");
      expect(creature!.name).toMatch(/[Ѐ-ӿ]/);
      // Frog and Sea Horse legitimately have zero actions (no effective attacks) — the trait
      // section is where the translation shows up for those two.
      expect(creature!.actions + creature!.specialAbilities).toMatch(/[Ѐ-ӿ]/);
    }
  });

  it("зберігає fields-обхід для мов там, де формат джерела — не список", () => {
    expect(catalog.get("Commoner")?.languages).toBe("будь-яка одна мова (зазвичай Загальна)");
    expect(catalog.get("Crawling Claw")?.languages).toBe("розуміє Загальну, але не може говорити");
    expect(catalog.get("Homunculus")?.languages).toBe(
      "розуміє мови свого творця, але не може говорити"
    );
    expect(catalog.get("Lemure")?.languages).toBe("розуміє Пекельну, але не може говорити");
  });

  it("зберігає fields-обхід для чуттів там, де джерело додає непереказний хвіст у дужках", () => {
    expect(catalog.get("Crawling Claw")?.senses).toBe(
      "Сліпозір 30 фт. (сліпий за межами цього радіусу), Пасивна уважність 10"
    );
    expect(catalog.get("Shrieker")?.senses).toBe(
      "Сліпозір 30 фт. (сліпий за межами цього радіусу), Пасивна уважність 6"
    );
  });

  it("перевикористовує id девʼяти MM-записів партії 3, замінюючи, а не додаючи до успадкованого каталогу", () => {
    const list = getAllCreatures("RULES_2014");
    expect(new Set(list.map((c) => c.creatureId)).size).toBe(list.length);
    expect(list.filter((c) => c.creatureId === 253).length).toBe(1);
    expect(catalog.get("Bat")?.name).toBe("Кажан");
  });

  it("додає нові записи партії 3, яких успадкований каталог узагалі не мав", () => {
    expect(catalog.get("Cranium Rat")?.creatureId).toBe(586);
    expect(catalog.get("Octopus")?.creatureId).toBe(599);
  });
});

describe("KR12.3 — партія 2 у зібраному каталозі 2014", () => {
  const catalog = byNameEng(getAllCreatures("RULES_2014"));
  const pending = new Set([...BATCH_TWO_DEFERRED_SLUGS, ...BATCH_TWO_BLOCKED_SLUGS]);

  it("кожна перекладена істота партії 2 має українську назву, опис дій і коректний ruleset", () => {
    for (const row of manifest.filter((r) => r.edition === "RULES_2014" && r.batch === 2)) {
      if (pending.has(row.slug)) continue;
      const creature = catalog.get(row.nameEng);
      expect(creature, `${row.nameEng} відсутня в каталозі`).toBeDefined();
      expect(creature!.creatureId).toBe(row.creatureId);
      expect(creature!.ruleset).toBe("RULES_2014");
      expect(creature!.name).toMatch(/[Ѐ-ӿ]/);
      expect(creature!.actions).toMatch(/[Ѐ-ӿ]/);
    }
  });

  it("перезбирає дорослих і стародавніх драконів, яких успадкований каталог узагалі не мав", () => {
    expect(catalog.get("Ancient Black Dragon")?.creatureId).toBe(580);
    expect(catalog.get("Ancient Blue Dragon")?.creatureId).toBe(582);
    expect(catalog.get("Adult Bronze Dragon")?.creatureId).toBe(574);
    expect(catalog.get("Adult Copper Dragon")?.creatureId).toBe(573);
  });

  it("восьмий fields-слот (damageImmunity) обходить крапку з комою у списку імунітетів Лорда мумій", () => {
    expect(catalog.get("Mummy Lord")?.damageImmunity).toBe(
      "Некротична, Отруйна; Дробляча, Колюча, Рубляча від немагічної зброї"
    );
  });

  it("перезаписує статблок дорослого білого дракона новими числами aidedd, зберігаючи трейт із партії 1", () => {
    const dragon = catalog.get("Adult White Dragon");
    expect(dragon?.ac).toBe("18 (природний обладунок)");
    expect(dragon?.specialAbilities).toContain("Крижана хода");
  });

  it("два блоковані рядки закрила добірка партій 33–34, а не партія 2", () => {
    const alustriel = manifest.find((r) => r.edition === "RULES_2014" && r.slug === "alustriel-silverhand");
    const spirit = manifest.find((r) => r.edition === "RULES_2014" && r.slug === "aberrant-spirit");
    expect(alustriel?.status).toBe("translated");
    expect(spirit?.status).toBe("translated");
    expect(GLEANED_BY_BATCHES_33_34.has("alustriel-silverhand")).toBe(true);
    expect(GLEANED_BY_BATCHES_33_34.has("aberrant-spirit")).toBe(true);
    expect(BATCH_TWO_DEFERRED_SLUGS.has("alustriel-silverhand")).toBe(false);
    expect(BATCH_TWO_DEFERRED_SLUGS.has("aberrant-spirit")).toBe(false);
  });

  it("не дублює id: перевикористані рядки партії 2 замінюють, а не додають до успадкованого каталогу", () => {
    const list = getAllCreatures("RULES_2014");
    expect(new Set(list.map((c) => c.creatureId)).size).toBe(list.length);
    expect(list.filter((c) => c.creatureId === 228).length).toBe(1);
  });
});

describe("KR12.3 — партія 1 у зібраному каталозі 2014", () => {
  const catalog = byNameEng(getAllCreatures("RULES_2014"));

  it("кожна перекладена істота партії 1 має українську назву, опис дій і коректний ruleset", () => {
    for (const row of manifest.filter((r) => r.edition === "RULES_2014" && r.batch === 1)) {
      if (BATCH_ONE_DEFERRED_SLUGS.has(row.slug)) continue;
      const creature = catalog.get(row.nameEng);
      expect(creature, `${row.nameEng} відсутня в каталозі`).toBeDefined();
      expect(creature!.creatureId).toBe(row.creatureId);
      expect(creature!.ruleset).toBe("RULES_2014");
      expect(creature!.name).toMatch(/[Ѐ-ӿ]/);
      expect(creature!.actions).toMatch(/[Ѐ-ӿ]/);
    }
  });

  it("виправляє джерело реконструкції: Volo's/Mordenkainen-походження тепер MPMM, не VGM/MMotM", () => {
    expect(catalog.get("Kobold Dragonshield")?.source).toBe("MPMM");
    expect(catalog.get("Neogi")?.source).toBe("MPMM");
    expect(catalog.get("Flind")?.source).toBe("MPMM");
  });

  it("перезаписує статблок Flind новими числами aidedd замість хибних ручних даних KR11.4, і перекладає опис КЗ", () => {
    const flind = catalog.get("Flind");
    expect(flind?.ac).toBe("16 (нагрудник)");
    expect(flind?.dexterity).toBe("14 (+2)");
  });

  it("перекладає опис класу броні всередині КЗ там, де 2014 вкладає його в те саме поле", () => {
    expect(catalog.get("Skeleton")?.ac).toBe("13 (обривки обладунку)");
    expect(catalog.get("Kobold Dragonshield")?.ac).toBe("15 (шкіряний обладунок, щит)");
    expect(catalog.get("Abjurer Wizard")?.ac).toBe("12 (15 із заклинанням «Обладунок мага»)");
  });

  it("не дублює id: перевикористаний рядок партії 1 замінює, а не додає до успадкованого каталогу", () => {
    const list = getAllCreatures("RULES_2014");
    expect(new Set(list.map((c) => c.creatureId)).size).toBe(list.length);
    expect(list.filter((c) => c.creatureId === 406).length).toBe(1);
  });

  it("зберігає fields-обхід для мов і спротивів там, де формат джерела — не список", () => {
    expect(catalog.get("Wight")?.languages).toBe("мови, які знав за життя");
    expect(catalog.get("Kobold Dragonshield")?.damageResistance).toBe(
      "Див. рису «Драконяча стійкість»"
    );
  });
});

describe("KR12.3 — рішення власника 2026-08-21", () => {
  it("вісім нових джерел мапляться, зокрема homebrew самого aidedd", () => {
    expect(findSourceKey2014("Adventures (Tomb of Annihilation)")).toBe("TOA");
    expect(findSourceKey2014("Adventures (Storm King´s Thunder)")).toBe("SKT");
    expect(findSourceKey2014("Adventures (Candlekeep Mysteries)")).toBe("CM");
    expect(findSourceKey2014("Adventures (Dungeon of the Mad Mage)")).toBe("WDMM");
    expect(findSourceKey2014("Adventures (Quests from the Infinite Staircase)")).toBe("QFTIS");
    expect(findSourceKey2014("Adventures (Princes of the Apocalypse)")).toBe("POTA");
    expect(findSourceKey2014("Extra (Chains of Asmodeus)")).toBe("CHAINS_OF_ASMODEUS");
    expect(findSourceKey2014("Extra (AideDD)")).toBe("HOMEBREW");
  });

  it("«Dragon Heist» не переплутано з «Dungeon of the Mad Mage» — обидві ватердіпські", () => {
    expect(findSourceKey2014("Adventures (Dragon Heist)")).toBe("WDH");
    expect(findSourceKey2014("Adventures (Dungeon of the Mad Mage)")).toBe("WDMM");
  });

  it("чотири терміни заведено у словник", () => {
    expect(dictionary.DND_DICTIONARY.creatureTypeTags.gem).toBe("Самоцвітний");
    expect(dictionary.DND_DICTIONARY.creatureTypeTags.bard).toBe("Бард");
    expect(dictionary.DND_DICTIONARY.creatureTypeTags.inevitable).toBe("Невідворотний");
    expect(dictionary.DND_DICTIONARY.creatureTypes.swarmOfTinyAberrations).toBe(
      "Рій дрібних аберацій"
    );
  });

  it("три мови істот заведено у LanguageTranslations", () => {
    expect(LanguageTranslations.GRELL).toBe("Ґреллівська");
    expect(LanguageTranslations.WINTER_WOLF).toBe("Мова зимових вовків");
    expect(LanguageTranslations.SPHINX).toBe("Сфінксова");
  });

  it("хвіст преамбули більше не стає четвертою легендарною дією sibriex", () => {
    const html = readFileSync("data/aidedd/raw/monsters-2014/sibriex.html", "utf-8");
    const parsed = parseMonster2014(html, "sibriex");

    expect(parsed.legendaryActions.map((entry) => entry.name)).toEqual([
      "Cast a Spell",
      "Spray Bile",
      "Warp (Costs 2 Actions)",
    ]);
    expect(parsed.legendaryActions.some((entry) => /regains spent/i.test(entry.text))).toBe(false);
  });

  it("фільтр преамбули не чіпає легендарні дії решти корпусу", () => {
    const withLegendary = ["tarrasque", "lich", "kraken", "beholder", "androsphinx"];
    for (const slug of withLegendary) {
      const html = readFileSync(`data/aidedd/raw/monsters-2014/${slug}.html`, "utf-8");
      const parsed = parseMonster2014(html, slug);
      expect(parsed.legendaryActions.length).toBeGreaterThan(0);
    }
  });
});
