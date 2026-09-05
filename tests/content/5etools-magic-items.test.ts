import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { readMagicItemBaseline } from "../../prisma/seed/magicItemBaseline";
import { MagicItemBatchRow } from "../../prisma/seed/magicItemBatches";
import {
  ItemBatchRow,
  buildItemSeedRows,
  findPinnedVariants,
  readItemCorpus,
  readItemPlan,
  readItemTranslations,
} from "../../scripts/5etools/item-batches";
import { MIRROR_REVISION } from "../../scripts/5etools/mirror";
import dictionary from "../../src/lib/refs/dictionary.json";
import { stripGlossaryMarkers } from "../../src/lib/refs/glossary-marker";
import { getDescriptionSnippet } from "../../src/lib/seo-utils";

/// Гейт партій KR16.4. Дивиться на **зібрану** сід-партію, а не на файл перекладу: між ними
/// стоїть збирач, і саме там переклад зустрічається з машинними полями. Перевірка на вході
/// сказала б лише те, що перекладач написав, а не те, що доїде в базу.
const plan = readItemPlan();
const corpus = readItemCorpus();
const manifest = JSON.parse(
  readFileSync(join(process.cwd(), "data/aidedd/magic-items-manifest.json"), "utf-8")
) as Array<{ nameEng: string; slug: string; status: string; magicItemId: number; isNewToCatalog: boolean }>;

const planRows = plan.batches.flatMap((batch) => batch.items);
const baselineEngNames = new Set(readMagicItemBaseline().map((item) => item.engName));

/// Збірка лінива навмисно. Вона падає на дефекті плану — не тій книзі, рідкості без причини —
/// і якби її рахували на рівні модуля, цей виняток забирав би з собою **весь** файл, зокрема
/// й ті перевірки плану, які саме цей дефект і називають.
let builtCache: Array<{ batch: number; items: MagicItemBatchRow[] }> | null = null;

function readBuilt(): MagicItemBatchRow[] {
  builtCache ??= plan.batches
    .filter((batch) => readItemTranslations(batch.batch).length > 0)
    .map((batch) => ({ batch: batch.batch, items: buildItemSeedRows(batch.batch, corpus) }));
  return builtCache.flatMap((entry) => entry.items);
}

function readStartedBatches(): Set<number> {
  readBuilt();
  return new Set(builtCache!.map((entry) => entry.batch));
}

/// Правки налаштування з питання 11 O14. Джерело закрило його 2026-08-23, але доти жоден
/// рядок каталогу не рухався — виправляє їх аж цей KR. `Ersatz Eye` стоїть тут навмисно:
/// там помилялося саме aidedd, і значення каталогу мусить лишитися колишнім.
const ATTUNEMENT_DECIDED_BY_SOURCE: Record<string, boolean> = {
  "Boots of False Tracks": false,
  "Prosthetic Limb": false,
  "Ersatz Eye": false,
  "Instrument of Illusions": true,
  "Instrument of Scribing": true,
  "Nature's Mantle": true,
};

/// Англійські рядки, які маркер [Р20](../../docs/DECISIONS.md#р20) має право називати, не
/// зустрічаючись дослівно в тексті джерела. Перелік ведеться руками: у KR16.3 маркер, який
/// назвав чужу рису, не спіймав жоден гейт, бо маркери знімаються перед пошуком латиниці.
const MARKERS_OUTSIDE_SOURCE_TEXT: readonly string[] = [];

/// Квадратні дужки в описі предмета — це формат «Українська [English]». Здебільшого це
/// заклинання з `dictionary.json → SPELLS`, і тоді назва мусить стояти рівно в тій формі,
/// яку ратифіковано. Решта — не заклинання, і кожен такий рядок названо тут поіменно разом
/// із тим, звідки він: інакше в дужки поїде будь-що, і перевірка перестане щось означати.
const BRACKETS_OUTSIDE_SPELL_REGISTRY: Record<string, string> = {
  "Channel Divinity": "риса класу, prisma/seed/classFeatureSeed.ts",
  "Arcane Recovery": "риса класу, prisma/seed/classFeatureSeed.ts",
  "Bardic Inspiration": "риса класу, prisma/seed/classFeatureSeed.ts",
  Knight: "статблок бестіарію, src/lib/generated/creatures.json",
  "Potion of Greater Healing": "магічний предмет каталогу",
  "Broom of Flying": "магічний предмет каталогу",
  "Wand of Polymorph": "магічний предмет каталогу",
  "Flame Tongue": "магічний предмет каталогу",
  "Frost Brand": "магічний предмет каталогу",
  "Spray of Cards": "заклинання KR17.3, ще не в SPELLS (data/2014/new-spells/batch-02.json)",
  Antagonize: "заклинання KR17.3, ще не в SPELLS (data/2014/new-spells/batch-01.json)",
  "Spirit of Death": "заклинання KR17.3, ще не в SPELLS (data/2014/new-spells/batch-02.json)",
};

const RATIFIED_SPELL_NAMES = new Map(
  (dictionary.SPELLS as Array<{ eng_name: string; name: string }>).map((spell) => [
    spell.eng_name.toLowerCase(),
    spell.name,
  ])
);

describe("KR16.4 — план партій магічних предметів", () => {
  it("покриває рівно відкладені рядки маніфесту, по одному разу", () => {
    const deferred = manifest.filter((row) => row.status === "deferred").map((row) => row.slug).sort();
    expect(planRows.map((row) => row.slug).sort()).toEqual(deferred);
  });

  /// Новий рядок бере id, який видав маніфест; наявний — той, що вже стоїть у каталозі. Друге
  /// важливіше за перше: `Perfume of Bwitching` маніфесту — це `Perfume of Bewitching` каталогу
  /// (id 1120), і взявши маніфестний 1303, партія створила б другий предмет замість перекладу.
  it("тримає `magicItemId` каталогу незмінним — це публічна адреса", () => {
    const byManifestSlug = new Map(manifest.map((row) => [row.slug, row.magicItemId]));
    const byCatalogueName = new Map(
      readMagicItemBaseline().map((item) => [item.engName, item.magicItemId])
    );

    const moved = planRows
      .filter((row) => {
        const expected = byCatalogueName.get(row.nameEng) ?? byManifestSlug.get(row.slug);
        return expected !== row.magicItemId;
      })
      .map((row) => `${row.slug}: ${row.magicItemId}`);
    expect(moved).toEqual([]);
  });

  it("пінує ревізію корпусу, а не гілку", () => {
    expect(plan.revision).toBe(MIRROR_REVISION);
  });

  it("кожен рядок пінує рівно один запис корпусу на кожне джерело", () => {
    const broken = planRows.flatMap((row) => {
      try {
        findPinnedVariants(row, corpus);
        return [];
      } catch (error) {
        return [`${row.nameEng}: ${error instanceof Error ? error.message : error}`];
      }
    });
    expect(broken).toEqual([]);
  });

  it("відкладений рядок називає blocker, готовий — не називає", () => {
    const wrong = planRows
      .filter((row) => (row.status === "ready") === (row.blocker.trim() !== ""))
      .map((row) => `${row.nameEng}: ${row.status}/${row.blocker}`);
    expect(wrong).toEqual([]);
  });

  it("рідкість, задана планом, завжди має причину", () => {
    const silent = planRows
      .filter((row) => row.rarity !== "" && row.rarityReason.trim() === "")
      .map((row) => row.nameEng);
    expect(silent).toEqual([]);
  });

  /// `engName` — ключ `upsert`. Розбіжність в один регістр («Moon-touched» проти
  /// «Moon-Touched») створила б у каталозі другий рядок замість оновлення наявного, і
  /// каталог мовчки виріс би на дублікат із чужою адресою.
  it("`isNewToCatalog` збігається з тим, чи `engName` уже є в базовому корпусі", () => {
    const wrong = planRows
      .filter((row) => row.isNewToCatalog === baselineEngNames.has(row.nameEng))
      .map((row) => `${row.nameEng}: isNewToCatalog=${row.isNewToCatalog}`);
    expect(wrong).toEqual([]);
  });
});

describe("KR16.4 — зібрані партії перекладу", () => {
  it("кожен готовий рядок партії, яку почали, має переклад", () => {
    const startedBatches = readStartedBatches();
    const expected = plan.batches
      .filter((batch) => startedBatches.has(batch.batch))
      .flatMap((batch) => batch.items.filter((row) => row.status === "ready").map((row) => row.slug));

    expect(readBuilt().map((row) => row.slug).sort()).toEqual(expected.sort());
  });

  /// Звірка йде проти **записів корпусу**, а не проти `findItemFacts`: інакше перевірка й
  /// збирач читали б ту саму функцію, і зламаний збирач посунув би обидва боки разом.
  it("машинні поля беруться з джерела, а не з перекладу", () => {
    const wrong = readBuilt().flatMap((row) => {
      const planned = findPlanRow(row.slug);
      const variants = findPinnedVariants(planned, corpus);
      const rarities = new Set(variants.map((variant) => variant.rarity));
      const problems: string[] = [];

      if (row.itemType !== variants[0].itemType) {
        problems.push(`тип ${row.itemType} проти ${variants[0].itemType}`);
      }
      if (row.requiresAttunement !== variants[0].requiresAttunement) problems.push("налаштування");
      if (!rarities.has(row.rarity) && !rarities.has(null)) {
        problems.push(`рідкість ${row.rarity} проти ${[...rarities].join("/")}`);
      }
      return problems.map((problem) => `${row.engName}: ${problem}`);
    });
    expect(wrong).toEqual([]);
  });

  it("закриває шість правок налаштування з питання 11 O14", () => {
    const decided = readBuilt().filter((row) => row.engName in ATTUNEMENT_DECIDED_BY_SOURCE);
    const wrong = decided
      .filter((row) => row.requiresAttunement !== ATTUNEMENT_DECIDED_BY_SOURCE[row.engName])
      .map((row) => `${row.engName}: ${row.requiresAttunement}`);
    expect(wrong).toEqual([]);
  });

  it("назва тримає формат «Українська [English]» і не несе маркерів", () => {
    const wrong = readBuilt().flatMap((row) => {
      if (!/^[^[]+\[[^\]]+\]$/.test(row.name)) return [`${row.slug}: формат «${row.name}»`];
      if (row.name.includes("{{")) return [`${row.slug}: маркер у назві`];
      return [];
    });
    expect(wrong).toEqual([]);
  });

  /// Маркер Р20 розгортається лише в `description` — його малює `FormattedDescription`.
  /// У підписі каталогу той самий рядок поїхав би сирими дужками, як `name` у <title>.
  it("маркери Р20 стоять тільки в описі", () => {
    const wrong = readBuilt()
      .filter((row) => row.shortDescription.includes("{{"))
      .map((row) => row.slug);
    expect(wrong).toEqual([]);
  });

  it("кожен маркер називає англійський рядок, який є в тексті джерела", () => {
    expect(findMarkersOutsideSource()).toEqual([]);
  });

  it("у перекладеному тексті не лишилося латиниці", () => {
    expect(findLatinLeaks()).toEqual([]);
  });

  it("опис не губить і не вигадує чисел проти джерела", () => {
    expect(findNumberDrift()).toEqual([]);
  });

  /// Повторний переклад назви заклинання — це те, від чого в O14 51 із 248 записів каталогу
  /// дістали англійський підпис. Назва або стоїть рівно так, як її ратифіковано, або вона
  /// взагалі не заклинання — і тоді названа поіменно.
  it("назви в квадратних дужках або ратифіковані, або поіменно не заклинання", () => {
    expect(findUnratifiedBrackets()).toEqual([]);
  });

  it("тримає ратифіковану термінологію 2014", () => {
    expect(findTerminologyProblems()).toEqual([]);
  });

  /// `<meta name="description">` і Open Graph беруть текст через `getDescriptionSnippet`, а
  /// не через `FormattedDescription`, — тобто повз розгортання маркера. Доти цей рядок їхав
  /// у пошук і в превʼю посилання сирими дужками: «магією Механуса{{Mechanus}}».
  it("SEO-опис сторінки не несе сирих маркерів Р20", () => {
    const raw = readBuilt()
      .filter((row) => getDescriptionSnippet(`${row.name}. ${row.description}`).includes("{{"))
      .map((row) => row.slug);
    expect(raw).toEqual([]);
  });

  it("підпис і опис непорожні", () => {
    const empty = readBuilt()
      .filter((row) => row.shortDescription.trim() === "" || row.description.trim().length < 10)
      .map((row) => row.slug);
    expect(empty).toEqual([]);
  });
});

function findUnratifiedBrackets(): string[] {
  return readBuilt().flatMap((row) => {
    const text = `${row.shortDescription}\n${row.description}`;
    return [...text.matchAll(/\[([^\]]+)\]/g)].flatMap((match) => {
      const english = match[1].trim();
      const ratified = RATIFIED_SPELL_NAMES.get(english.toLowerCase());

      if (ratified === undefined) {
        return BRACKETS_OUTSIDE_SPELL_REGISTRY[english] === undefined
          ? [`${row.slug}: «[${english}]» — ні заклинання, ні названий виняток`]
          : [];
      }
      return text.includes(ratified) ? [] : [`${row.slug}: «[${english}]» не у формі «${ratified}»`];
    });
  });
}

function findPlanRow(slug: string): ItemBatchRow {
  const found = planRows.find((row) => row.slug === slug);
  if (!found) throw new Error(`Немає рядка плану «${slug}»`);
  return found;
}

function readSourceText(row: MagicItemBatchRow): string {
  const planned = findPlanRow(row.slug);
  return findPinnedVariants(planned, corpus)
    .map((variant) => `${variant.nameEng} ${variant.typeLineEng} ${variant.descriptionEng}`)
    .join(" ");
}

function findMarkersOutsideSource(): string[] {
  return readBuilt().flatMap((row) => {
    const english = readSourceText(row).toLowerCase();
    return [...row.description.matchAll(/\{\{([^{}]+)\}\}/g)]
      .map((match) => match[1].trim())
      .filter(
        (original) =>
          !english.includes(original.toLowerCase()) && !MARKERS_OUTSIDE_SOURCE_TEXT.includes(original)
      )
      .map((original) => `${row.slug}: «${original}»`);
  });
}

/// Латиниця в перекладеному полі — англійський залишок. Винятків два, і обидва ратифіковані
/// формати, а не послаблення: англійська назва в квадратних дужках («Маскування [Disguise
/// Self]», «Обладунок блиску [Armor of Gleaming]») і маркер оригіналу «термін{{English}}»
/// ([Р20](../../docs/DECISIONS.md#р20)). Маркер знімається **тим самим** кодом, яким його
/// розгортає рендерер, — інакше гейт і сторінка розійшлися б.
function findLatinLeaks(): string[] {
  return readBuilt().flatMap((row) => {
    const text = stripGlossaryMarkers(
      [row.name, row.shortDescription, row.description].join(" ")
    ).replace(/\[[^\]]*\]/g, "");
    if (!/[A-Za-z]/.test(text)) return [];
    return [`${row.slug}: ${/[A-Za-z][A-Za-z' ]*/.exec(text)?.[0]}`];
  });
}

/// Числа — єдине, що звіряється машинно між англійським джерелом і українським текстом.
/// Зниклий рядок таблиці, «30 фт» замість «60 фт» і загублений заряд ловляться саме тут.
///
/// Родина (`+1/+2/+3`, татуювання за рівнем) звіряється **множиною**, а не мультимножиною:
/// джерело повторює той самий абзац тричі з різним бонусом, а книга друкує його раз із
/// таблицею, тож рахунок повторів у перекладі свідомо інший. Зникле чи вигадане число
/// перевірка ловить і так.
function findNumberDrift(): string[] {
  return readBuilt().flatMap((row) => {
    const isFamily = findPlanRow(row.slug).pinned.length > 1;
    const english = readNumbers(readSourceText(row), isFamily);
    const ukrainian = readNumbers(row.description, isFamily);
    return english === ukrainian ? [] : [`${row.slug}: ${english} проти ${ukrainian}`];
  });
}

function readNumbers(text: string, unique: boolean): string {
  const found = (text.match(/\d+/g) ?? []).map(Number);
  return (unique ? [...new Set(found)] : found).sort((left, right) => left - right).join(",");
}

/// Форми 2014, не 2024: «Ряткидок», «ХП», «шкода». `урон` і «хіт поїнт» — саме ті дефекти,
/// заради яких O14 переписав корпус із джерела, і партія не має права їх повернути.
const FORBIDDEN_TERMS: Array<[RegExp, string]> = [
  [/урон/i, "«урон» замість «шкода»"],
  [/хіт[\s-]?по[іи]нт/i, "розгорнуті хіт-поїнти замість «ХП»"],
  [/спасброс/i, "«спасбросок» замість «Ряткидок»"],
  [/рятівний кидок/i, "форма 2024 «Рятівний кидок» у каталозі 2014"],
  [/чарунк/i, "«чарунка» замість «слот заклинань»"],
];

function findTerminologyProblems(): string[] {
  return readBuilt().flatMap((row) => {
    const text = `${row.name} ${row.shortDescription} ${row.description}`;
    return FORBIDDEN_TERMS.filter(([pattern]) => pattern.test(text)).map(
      ([, label]) => `${row.slug}: ${label}`
    );
  });
}
