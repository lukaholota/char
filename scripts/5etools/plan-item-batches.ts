import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { readMagicItemBaseline } from "../../prisma/seed/magicItemBaseline";
import { MagicItemRarity } from "../aidedd/magic-item-schema";
import { ITEM_PLAN_PATH, ItemBatchPlan, ItemBatchRow, readItemCorpus } from "./item-batches";
import { MIRROR_REVISION } from "./mirror";
import { SourceItem, findLooseNameKey } from "./schema";

/// Планувальник партій KR16.4. Черга скінченна й відома наперед — 191 відкладений рядок
/// `magic-items-manifest.json`, — тому план будується цілим, а не по партії за раз: так його
/// видно одним diff-ом, і перекладач ніколи не питає «а що далі».
const MANIFEST_PATH = join(process.cwd(), "data/aidedd/magic-items-manifest.json");
const BATCH_SIZE = 25;
const FIRST_BATCH = 11;

type ManifestRow = {
  nameEng: string;
  slug: string;
  status: string;
  magicItemId: number;
  isNewToCatalog: boolean;
};

/// Назва каталогу проти назви маніфесту. `engName` — ключ, за яким сідер робить `upsert`, тож
/// розбіжність в один регістр створила б у каталозі другий рядок замість оновлення наявного.
/// Перші три рядки — виправлення назв, яких у каталозі ще немає (нові записи, публічної адреси
/// не мають); `Moon-Touched Sword` навпаки бере назву каталогу, бо рядок там уже стоїть.
const CATALOG_NAME_BY_MANIFEST_NAME: Record<string, string> = {
  "Perfume of Bwitching": "Perfume of Bewitching",
  "Ring of the Winter": "Ring of Winter",
  "Figurine of Wondrous Power, Gold Canary": "Figurine of Wondrous Power (Gold Canary)",
  "Moon-touched Sword": "Moon-Touched Sword",
};

/// Родини: книга друкує один запис із таблицею рідкості, 5etools розписує його на варіанти.
/// Перелік заданий поіменно, а не виведений маскою `+N …`: мовчазне розгортання за маскою
/// колись притягне в родину чужий предмет, і жоден гейт цього не побачить.
const SOURCE_NAMES_BY_CATALOG_NAME: Record<string, string[]> = {
  "All-Purpose Tool": ["+1 All-Purpose Tool", "+2 All-Purpose Tool", "+3 All-Purpose Tool"],
  "Amulet of the Devout": [
    "+1 Amulet of the Devout",
    "+2 Amulet of the Devout",
    "+3 Amulet of the Devout",
  ],
  "Arcane Grimoire": ["+1 Arcane Grimoire", "+2 Arcane Grimoire", "+3 Arcane Grimoire"],
  "Bloodwell Vial": ["+1 Bloodwell Vial", "+2 Bloodwell Vial", "+3 Bloodwell Vial"],
  "Dragonhide Belt": ["+1 Dragonhide Belt", "+2 Dragonhide Belt", "+3 Dragonhide Belt"],
  "Moon Sickle": ["+1 Moon Sickle", "+2 Moon Sickle", "+3 Moon Sickle"],
  "Rhythm-Maker's Drum": [
    "+1 Rhythm-Maker's Drum",
    "+2 Rhythm-Maker's Drum",
    "+3 Rhythm-Maker's Drum",
  ],
  "Fate Dealer's Deck": [
    "+1 Fate Dealer's Deck",
    "+2 Fate Dealer's Deck",
    "+3 Fate Dealer's Deck",
  ],
  "Wraps of Unarmed Prowess": [
    "+1 Wraps of Unarmed Prowess",
    "+2 Wraps of Unarmed Prowess",
    "+3 Wraps of Unarmed Prowess",
  ],
  "Barrier Tattoo": ["Barrier Tattoo (Small)", "Barrier Tattoo (Medium)", "Barrier Tattoo (Large)"],
  "Spellwrought Tattoo": [
    "Spellwrought Tattoo (Cantrip)",
    "Spellwrought Tattoo (1st Level)",
    "Spellwrought Tattoo (2nd Level)",
    "Spellwrought Tattoo (3rd Level)",
    "Spellwrought Tattoo (4th Level)",
    "Spellwrought Tattoo (5th Level)",
  ],
  "Figurine of Wondrous Power (Gold Canary)": ["Gold Canary Figurine of Wondrous Power"],
  "Prehistoric Figurines of Wondrous Power": [
    "Prehistoric Figurine of Wondrous Power, Pyrite Plesiosaurus",
    "Prehistoric Figurine of Wondrous Power, Kyanite Pteranodon",
    "Prehistoric Figurine of Wondrous Power, Carnelian Triceratops",
    "Prehistoric Figurine of Wondrous Power, Jasper Tyrannosaurus Rex",
  ],
};

/// Рідкість рядка, який зібраний із кількох записів або підписаний «varies». Книга друкує таку
/// рідкість таблицею всередині опису, а колонка каталогу тримає одну — беремо найнижчу, бо саме
/// вона відповідає першому рядку тієї таблиці й тому, з чого предмет починається.
const RARITY_BY_CATALOG_NAME: Record<string, { rarity: MagicItemRarity; reason: string }> = {
  "All-Purpose Tool": { rarity: "UNCOMMON", reason: "родина +1/+2/+3, рідкість таблицею в описі" },
  "Amulet of the Devout": { rarity: "UNCOMMON", reason: "родина +1/+2/+3, рідкість таблицею в описі" },
  "Arcane Grimoire": { rarity: "UNCOMMON", reason: "родина +1/+2/+3, рідкість таблицею в описі" },
  "Bloodwell Vial": { rarity: "UNCOMMON", reason: "родина +1/+2/+3, рідкість таблицею в описі" },
  "Dragonhide Belt": { rarity: "UNCOMMON", reason: "родина +1/+2/+3, рідкість таблицею в описі" },
  "Moon Sickle": { rarity: "UNCOMMON", reason: "родина +1/+2/+3, рідкість таблицею в описі" },
  "Rhythm-Maker's Drum": { rarity: "UNCOMMON", reason: "родина +1/+2/+3, рідкість таблицею в описі" },
  "Fate Dealer's Deck": { rarity: "RARE", reason: "родина +1/+2/+3, рідкість таблицею в описі" },
  "Wraps of Unarmed Prowess": { rarity: "UNCOMMON", reason: "родина +1/+2/+3, рідкість таблицею в описі" },
  "Barrier Tattoo": { rarity: "UNCOMMON", reason: "родина Small/Medium/Large, рідкість таблицею в описі" },
  "Spellwrought Tattoo": { rarity: "COMMON", reason: "родина за рівнем заклинання, рідкість таблицею в описі" },
  "Prehistoric Figurines of Wondrous Power": {
    rarity: "UNCOMMON",
    reason: "родина з чотирьох фігурок, рідкість таблицею в описі",
  },
  "Sage's Signet": { rarity: "RARE", reason: "джерело каже «rarity varies»: рідкість задає таблиця сигнетів" },
};

function planBatches(): void {
  const corpus = readItemCorpus();
  const catalogue = new Map<string, number>(
    readMagicItemBaseline().flatMap((item) =>
      item.magicItemId === undefined ? [] : [[item.engName, item.magicItemId] as [string, number]]
    )
  );
  const rows = readManifest()
    .filter((row) => row.status === "deferred")
    .map((row) => buildRow(row, corpus, catalogue));

  const plan: ItemBatchPlan = {
    batchSize: BATCH_SIZE,
    revision: MIRROR_REVISION,
    batches: splitIntoBatches(rows),
  };

  writeFileSync(ITEM_PLAN_PATH, `${JSON.stringify(plan, null, 2)}\n`, "utf-8");
  console.log(`✅ ${rows.length} предметів у ${plan.batches.length} партіях → ${ITEM_PLAN_PATH}`);
  for (const batch of plan.batches) {
    const added = batch.items.filter((row) => row.isNewToCatalog).length;
    console.log(`   партія ${batch.batch}: ${batch.items.length} рядків, нових для каталогу ${added}`);
  }
}

function splitIntoBatches(rows: ItemBatchRow[]): ItemBatchPlan["batches"] {
  const batches: ItemBatchPlan["batches"] = [];
  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    batches.push({
      batch: FIRST_BATCH + batches.length,
      items: rows.slice(start, start + BATCH_SIZE),
    });
  }
  return batches;
}

/// Виправлена назва може збігтися з рядком, який у каталозі вже стоїть: `Perfume of Bwitching`
/// маніфесту — це той самий предмет, що `Perfume of Bewitching` (id 1120), просто aidedd
/// друкує його з друкарською помилкою. Тоді рядок бере **id каталогу**, а не той, який
/// маніфест видав під нову назву, інакше в каталозі зʼявиться другий предмет.
function buildRow(
  row: ManifestRow,
  corpus: SourceItem[],
  catalogue: Map<string, number>
): ItemBatchRow {
  const nameEng = CATALOG_NAME_BY_MANIFEST_NAME[row.nameEng] ?? row.nameEng;
  const sourceNames = SOURCE_NAMES_BY_CATALOG_NAME[nameEng] ?? [nameEng];
  const pinnedRarity = RARITY_BY_CATALOG_NAME[nameEng];
  const inCatalogue = catalogue.get(nameEng);

  return {
    nameEng,
    slug: row.slug,
    magicItemId: inCatalogue ?? row.magicItemId,
    isNewToCatalog: inCatalogue === undefined,
    pinned: sourceNames.map((name) => findPinned(name, nameEng, corpus)),
    rarity: pinnedRarity?.rarity ?? "",
    rarityReason: pinnedRarity?.reason ?? "",
    status: "ready",
    blocker: "",
  };
}

function findPinned(
  sourceName: string,
  catalogName: string,
  corpus: SourceItem[]
): { nameEng: string; source: string } {
  const key = findLooseNameKey(sourceName);
  const found = corpus.filter((item) => findLooseNameKey(item.nameEng) === key && item.hasFullText);

  if (found.length !== 1) {
    throw new Error(
      `${catalogName} › ${sourceName}: у корпусі 2014 знайдено ${found.length} записів із текстом замість одного`
    );
  }
  return { nameEng: found[0].nameEng, source: found[0].source };
}

function readManifest(): ManifestRow[] {
  return JSON.parse(readFileSync(MANIFEST_PATH, "utf-8")) as ManifestRow[];
}

try {
  planBatches();
} catch (error) {
  console.error(`❌ ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
