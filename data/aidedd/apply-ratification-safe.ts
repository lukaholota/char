/// Переписує назви рис бестіарію 2024 на затверджені в `dictionary.json → statblockFeatures`,
/// але ТІЛЬКИ для 24 назв «купи 1» зі звірки 2026-08-21 (`ratification-diff-2024.md`).
/// Колізійні назви (`Spellcasting`, `Claw`, `Pounce`, `Charge`, `Talons`, `Claws`, `Slam`,
/// `Constrict`, `Swallow`, `Javelin`) свідомо НЕ чіпає — вони чекають на рішення власника.
///
///   npx tsx data/aidedd/apply-ratification-safe.ts                        # сухий прогін 2024
///   npx tsx data/aidedd/apply-ratification-safe.ts --apply                # запис у партії 2024
///   npx tsx data/aidedd/apply-ratification-safe.ts --edition 2014 --apply # те саме для 2014
///
/// Ідемпотентний: повторний прогін після --apply дає 0 змін. Падає, якщо правка створила б
/// у записі дві риси з однаковою назвою або якщо стару назву згадано в прозі того ж запису.
///
/// Ратифікована назва несе маркер оригіналу — «Тактика зграї{{Pack Tactics}}». Скрипт написано
/// 2026-08-22, до рішення власника 2026-09-02 «ратифікація маркера не знімає» ([Р20]), і перший
/// прогін 2026-09-07 зняв маркер зі 123 назв — `section-name-markers.test.ts` спіймав рівно їх.
/// Файл лежить у data/aidedd/ навмисно — межі сесії звірки не дозволяли писати в scripts/.
/// Після підпису власника йому місце у scripts/aidedd/.

import { readFileSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { parseMonster2014 } from "../../scripts/aidedd/parse-monster-2014";
import { parseMonster2024 } from "../../scripts/aidedd/parse-monster-2024";
import { cutSuffix } from "../../scripts/aidedd/ratify-glossary";
import { buildMarkedName } from "../../scripts/terms/section-name-markers";
import { findContextualFeatureName } from "../../scripts/terms/contextual-feature-names";
import dictionaryFile from "../../src/lib/refs/dictionary.json";
import { findGlossaryMarkers, stripGlossaryMarkers } from "../../src/lib/refs/glossary-marker";

const RATIFIED: Record<string, string> = dictionaryFile.DND_DICTIONARY.statblockFeatures;
/// Редакція — аргумент, а не друга копія скрипта: словник один на обидві, тож і прохід
/// мусить бути один. Форма партій і вихід парсера в них однакові, різняться лише каталоги
/// і сам парсер.
/// Третій носій — корпус 5etools: та сама форма запису, але сирої сторінки під нього немає,
/// бо дані приходять JSON-ом. Англійська назва там і так стоїть у маркері оригіналу
/// («Опір магії{{Magic Resistance}}»), тож її беремо звідти, а не з парсера.
const EDITIONS = {
  "2024": { root: "data/aidedd", dir: "monsters-2024", parse: parseMonster2024 },
  "2014": { root: "data/aidedd", dir: "monsters-2014", parse: parseMonster2014 },
  "2014-5etools": { root: "data/5etools", dir: "monsters-2014", parse: null },
  "2024-5etools": { root: "data/5etools", dir: "monsters-2024", parse: null },
} as const;

const editionKey = readEdition();
const EDITION = EDITIONS[editionKey];
const TRANSLATIONS = join(process.cwd(), `${EDITION.root}/translations/${EDITION.dir}`);
const RAW = join(process.cwd(), `${EDITION.root}/raw/${EDITION.dir}`);

function readEdition(): keyof typeof EDITIONS {
  const at = process.argv.indexOf("--edition");
  const value = at === -1 ? "2024" : process.argv[at + 1];
  if (!(value in EDITIONS)) throw new Error(`--edition приймає ${Object.keys(EDITIONS).join(", ")}, не «${value}»`);
  return value as keyof typeof EDITIONS;
}
const SECTIONS = ["traits", "actions", "bonusActions", "reactions", "legendaryActions"] as const;

/// Назви, ратифіковані власником у бланку 2026-09-07: купа 1 цілком (позначка або вписана
/// форма — рядок без жодного з двох там лише один, `Touch`, і його власник заперечив, тож
/// словник тепер тримає корпусну «Дотик»), механічна частина купи 2, купи 3а і 3б.
/// `Claw`, `Claws`, `Talons` сюди НЕ входять: власник закрив їх контекстним правилом
/// («кіготь/пазур» для кігтеподібних кінцівок, «клішня» для членистоногих), а це вибір на
/// кожну істоту, не заміна за англійською назвою.
/// Перелік один на всі редакції, бо словник один: `5etools-creatures.test.ts` вимагає
/// ратифіковану назву скрізь, де вона є в реєстрі, тож щойно назва потрапляє у словник,
/// бестіарій 2014 зобовʼязаний нею так само, як 2024.
/// Рішення власника 2026-09-09: ратифікована форма діє в **обох** редакціях. Те, що не
/// піддається термінізації, живе не тут, а в `contextual-feature-names.ts` — цілою назвою на
/// істоту («Удар бивнями» слонові, «Клішня» крабові). Тобто 2014 бере той самий перелік, що
/// й 2024; попереднє звуження до дванадцяти назв цим скасовано.
/// `Claw` проходить лише заради краба зі скорпіоном: самої термінізації для нього немає —
/// «кіготь/пазур» власник лишив як два законні написання, і зводити 33 «Пазур» до «Кіготь»
/// він не вирішував.
const CONTEXTUAL_ONLY = ["Claw"];

const SAFE_BY_EDITION: Record<string, string[]> = { "2024": [] };

const SAFE_2024 = [
  "Amphibious", "Pack Tactics", "Fire Breath", "Flyby", "Acid Breath", "Cold Breath",
  "Lightning Breath", "Web Walker", "Water Breathing", "Hold Breath", "Magic Resistance",
  "Amorphous", "Sleep Breath", "Ram", "Standing Leap", "Blood Frenzy", "Spider Climb",
  "Repulsion Breath", "Superior Invisibility", "Arcane Burst", "Illumination", "Mimicry",
  "Telepathic Shroud", "Touch",
  "Slam", "Constrict", "Javelin", "Pounce", "Charge", "Jump", "Swallow", "Spellcasting",
  "Gore", "Divine Aid", "Undead Restoration", "Siege Monster", "Fiendish Restoration",
  "Poison Breath", "Scratch", "Bloodied Fury", "Paralyzing Breath", "Weakening Breath",
  "Guiding Light", "Limited Amphibiousness", "Abduct", "Tunneler", "Pact Blade",
  "Earth Glide", "Inscrutable",
  "Coven Magic", "Hurl Flame", "Eye Rays", "Hellish Restoration", "Faerie Dust",
  "Steam Breath", "Corrosive Form", "Uncanny Dodge", "Euphoria Breath", "Roar", "Reel",
  "Object Slam", "Petrifying Gaze", "Paralyzing Ray", "Deathless Agility", "Ice Throw",
  "Chilling Gaze", "Poison Burst", "Earthen Maul", "Charm", "Marshal Undead", "Dread Blade",
  "Hellfire Orb", "Sickening Ray", "Tail Swipe",
];
for (const edition of Object.keys(EDITIONS)) {
  SAFE_BY_EDITION[edition] = [...SAFE_2024, ...CONTEXTUAL_ONLY];
}
const SAFE_ENGLISH = SAFE_BY_EDITION[editionKey];

/// Проза Мультиатаки називає дію на імʼя, тож перейменування треба донести й туди — з
/// відмінком, а не заміною токена: «використанням Рику» стає «використанням Реву», «дві атаки
/// Ляпасом» — «дві атаки Ударом». Кожен рядок прочитано реченням; сторож нижче падає, якщо
/// стара назва лишилась у прозі, тож пропущений випадок тут не проїде мовчки.
const PROSE_FIXES: Record<string, Record<string, [string, string][]>> = {
  "2024": {
  lion: [["використанням Рику", "використанням Реву"]],
  "giant-constrictor-snake": [["використовує Стиснення", "використовує Здавлювання"]],
  yeti: [["Пазур або Крижаний кидок", "Пазур або Кидок льоду"]],
  "guard-captain": [["використовуючи Спис або", "використовуючи Метальний спис або"]],
  succubus: [["використовує Чарування або", "використовує Причарування або"]],
  wereboar: [["використовуючи Спис або", "використовуючи Метальний спис або"]],
  "beholder-zombie": [["використовує Промені ока", "використовує Очні промені"]],
  "earth-elemental": [["використовуючи Ляпас або", "використовуючи Удар або"]],
  revenant: [["дві атаки Ляпасом", "дві атаки Ударом"]],
  "water-elemental": [["дві атаки Ляпасом", "дві атаки Ударом"]],
  drider: [["чи Отруйний розряд", "чи Отруйний вибух"]],
  "abominable-yeti": [["свій Крижаний погляд", "свій Морозний погляд"]],
  efreeti: [["або Кидок полумʼя", "або Метання полумʼя"]],
  "horned-devil": [["або Кидок полумʼя", "або Метання полумʼя"]],
  "death-tyrant": [["використовує Промені очей", "використовує Очні промені"]],
  marilith: [["використовує Здушення", "використовує Здавлювання"]],
  mammoth: [["дві атаки Буцанням", "дві атаки Ударом бивнями"]],
  colossus: [
    ["використовуючи Ляпас або", "використовуючи Удар або"],
    ["одну атаку Ляпасом", "одну атаку Ударом"],
  ],
  },
  "2024-5etools": {
    beholder: [["застосовує Промені очей", "застосовує Очні промені"]],
  },
  "2014-5etools": {
    "mud-hulk": [["особливістю «Безформність»", "особливістю «Аморфність»"]],
    "yuan-ti-nightmare-speaker": [["одну атаку Здушенням", "одну атаку Здавлюванням"]],
    "young-sea-serpent": [["одну атаку Здушенням", "одну атаку Здавлюванням"]],
    "ancient-sea-serpent": [["одну атаку Здушенням", "одну атаку Здавлюванням"]],
    mammon: [["Ударом хвоста, Здушенням", "Ударом хвоста, Здавлюванням"]],
    "ancient-dragon-turtle": [["перезаряджається її Парове дихання", "перезаряджається її Паровий подих"]],
  },
  "2014": {
    "fire-elemental": [["дві атаки Доторком", "дві атаки Дотиком"]],
    "yuan-ti-abomination": [["Укусом і Здушенням", "Укусом і Здавлюванням"]],
    behir: [["одну Здушенням", "одну Здавлюванням"]],
    tarrasque: [
      ["може використати Проковтування", "може використати Ковтання"],
      ["використовує Проковтування", "використовує Ковтання"],
    ],
    "yuan-ti-malison": [["але Здушенням може скористатися", "але Здавлюванням може скористатися"]],
    succubus: [["імунітет до Чарування цієї почвари", "імунітет до Причарування цієї почвари"]],
    triceratops: [["атакою Удар рогами", "атакою Буцання"]],
    yeti: [["свій Крижаний погляд", "свій Морозний погляд"]],
  },
};

/// Іменні винятки власника: конкретизація, яку він лишив свідомо.
const KEPT_BY_SLUG: Record<string, Record<string, true>> = {
  "awakened-tree": { Slam: true },
};

type Entry = { name: string; text: string };
type Row = { slug: string; name: string } & Partial<Record<(typeof SECTIONS)[number], Entry[]>>;
type Change = { batch: string; slug: string; section: string; english: string; from: string; to: string };

function applyRatification(): void {
  const shouldWrite = process.argv.includes("--apply");
  const changes: Change[] = [];
  let touchedFiles = 0;

  for (const batch of readdirSync(TRANSLATIONS).filter((file) => file.endsWith(".json")).sort()) {
    const path = join(TRANSLATIONS, batch);
    const source = readFileSync(path, "utf-8");
    const rows = JSON.parse(source) as Row[];
    const before = JSON.stringify(rows);

    for (const row of rows) changes.push(...rewriteRow(batch, row));

    if (before === JSON.stringify(rows)) continue;
    touchedFiles += 1;
    if (shouldWrite) writeFileSync(path, serializeLikeSource(rows, source), "utf-8");
  }

  printChanges(changes);
  console.log(
    `\n${changes.length} назв у ${new Set(changes.map((c) => c.slug)).size} істот, файлів: ${touchedFiles}` +
      (shouldWrite ? " — записано" : " — сухий прогін, нічого не записано (--apply, щоб застосувати)")
  );
}

/// Партії 12–14 записані з відступом в один пробіл, решта — у два. Повне пересеріалізування
/// «за замовчуванням» дало б діф на 5 400 рядків замість 160, тому відступ читаємо з файлу.
function serializeLikeSource(rows: Row[], source: string): string {
  const indent = /^\[\r?\n( +)\{/.exec(source)?.[1].length ?? 2;
  const text = JSON.stringify(rows, null, indent);
  return source.endsWith("\n") ? `${text}\n` : text;
}

function rewriteRow(batch: string, row: Row): Change[] {
  const parsed = EDITION.parse
    ? EDITION.parse(readFileSync(join(RAW, `${row.slug}.html`), "utf-8"), row.slug)
    : readEnglishFromMarkers(row);
  rewriteProse(row);
  const prose = collectProse(row);
  const changes: Change[] = [];

  for (const section of SECTIONS) {
    const english = parsed[section];
    const ukrainian = row[section] ?? [];

    for (let index = 0; index < Math.min(english.length, ukrainian.length); index += 1) {
      const key = cutSuffix(english[index].name).base;
      if (!SAFE_ENGLISH.includes(key)) continue;
      if (KEPT_BY_SLUG[row.slug]?.[key]) continue;

      const ratified = RATIFIED[key];
      if (!ratified) throw new Error(`«${key}» немає в statblockFeatures — словник змінився, перевір перелік`);

      /// Слон і краб не беруть ратифіковану форму — вони беруть свою цілу назву.
      const contextual = findContextualFeatureName(key, row.slug);
      if (contextual === undefined && CONTEXTUAL_ONLY.includes(key)) continue;
      const target = contextual ?? ratified;

      const current = cutSuffix(ukrainian[index].name);
      const currentTerm = stripGlossaryMarkers(current.base);
      const marked = buildMarkedName(target, key);
      if (current.base === marked) continue;

      /// Проза розсинхронізується тільки тоді, коли міняється видимий текст. Дописування
      /// маркера його не міняє, тож сторож питає про це лише при справжньому перейменуванні.
      /// Раніше він звіряв назву разом із маркером проти прози без нього — і не спрацьовував
      /// ніколи: `chimera` уже мав дію «Удар рогами» при прозі «атаку Тараном».
      if (currentTerm !== target) assertProseIsClean(row.slug, currentTerm, prose);
      const renamed = current.suffix === "" ? marked : `${marked} (${current.suffix})`;
      assertNoDuplicate(row, renamed, section, index);

      changes.push({ batch, slug: row.slug, section, english: key, from: ukrainian[index].name, to: renamed });
      ukrainian[index].name = renamed;
    }
  }

  return changes;
}

/// Назва вже несе оригінал — «Опір магії{{Magic Resistance}}». Віддаємо його у формі, якої
/// чекає прохід, щоб решта логіки не знала, звідки взялася англійська назва.
function readEnglishFromMarkers(row: Row): Record<string, { name: string }[]> {
  const read = (section: (typeof SECTIONS)[number]) =>
    (row[section] ?? []).map((entry) => ({
      name: findGlossaryMarkers(entry.name)[0]?.original ?? "",
    }));
  return Object.fromEntries(SECTIONS.map((section) => [section, read(section)]));
}

function rewriteProse(row: Row): void {
  for (const [from, to] of PROSE_FIXES[editionKey][row.slug] ?? []) {
    for (const section of SECTIONS) {
      for (const entry of row[section] ?? []) entry.text = entry.text.split(from).join(to);
    }
  }
}

function collectProse(row: Row): string {
  return SECTIONS.flatMap((section) => (row[section] ?? []).map((entry) => entry.text)).join("\n");
}

function assertProseIsClean(slug: string, oldName: string, prose: string): void {
  if (prose.includes(oldName)) {
    throw new Error(
      `${slug}: стару назву «${oldName}» згадано в прозі запису — перейменування розсинхронізує текст, правити вручну`
    );
  }
}

function assertNoDuplicate(row: Row, renamed: string, section: string, index: number): void {
  const clash = SECTIONS.some((other) =>
    (row[other] ?? []).some((entry, at) => !(other === section && at === index) && entry.name === renamed)
  );
  if (clash) throw new Error(`${row.slug}: назва «${renamed}» уже зайнята в цьому записі`);
}

function printChanges(changes: Change[]): void {
  const grouped = new Map<string, Change[]>();
  for (const change of changes) {
    grouped.set(change.english, [...(grouped.get(change.english) ?? []), change]);
  }
  for (const [english, list] of [...grouped.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n${english} → «${RATIFIED[english]}» (${list.length})`);
    for (const change of list) console.log(`  ${change.batch} ${change.slug}: «${change.from}» → «${change.to}»`);
  }
}

applyRatification();
