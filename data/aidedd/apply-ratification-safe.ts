/// Переписує назви рис бестіарію 2024 на затверджені в `dictionary.json → statblockFeatures`,
/// але ТІЛЬКИ для 24 назв «купи 1» зі звірки 2026-08-21 (`ratification-diff-2024.md`).
/// Колізійні назви (`Spellcasting`, `Claw`, `Pounce`, `Charge`, `Talons`, `Claws`, `Slam`,
/// `Constrict`, `Swallow`, `Javelin`) свідомо НЕ чіпає — вони чекають на рішення власника.
///
///   npx tsx data/aidedd/apply-ratification-safe.ts            # сухий прогін, нічого не пише
///   npx tsx data/aidedd/apply-ratification-safe.ts --apply    # запис у партії
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
import { parseMonster2024 } from "../../scripts/aidedd/parse-monster-2024";
import { cutSuffix } from "../../scripts/aidedd/ratify-glossary";
import dictionaryFile from "../../src/lib/refs/dictionary.json";
import { findGlossaryMarkers, stripGlossaryMarkers } from "../../src/lib/refs/glossary-marker";

const RATIFIED: Record<string, string> = dictionaryFile.DND_DICTIONARY.statblockFeatures;
const TRANSLATIONS = join(process.cwd(), "data/aidedd/translations/monsters-2024");
const RAW = join(process.cwd(), "data/aidedd/raw/monsters-2024");
const SECTIONS = ["traits", "actions", "bonusActions", "reactions", "legendaryActions"] as const;

/// Назви, ратифіковані власником у бланку 2026-09-07: купа 1 цілком (позначка або вписана
/// форма — рядок без жодного з двох там лише один, `Touch`, і його власник заперечив, тож
/// словник тепер тримає корпусну «Дотик»), механічна частина купи 2, купи 3а і 3б.
/// `Claw`, `Claws`, `Talons` сюди НЕ входять: власник закрив їх контекстним правилом
/// («кіготь/пазур» для кігтеподібних кінцівок, «клішня» для членистоногих), а це вибір на
/// кожну істоту, не заміна за англійською назвою.
const SAFE_ENGLISH = [
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

/// Проза Мультиатаки називає дію на імʼя, тож перейменування треба донести й туди — з
/// відмінком, а не заміною токена: «використанням Рику» стає «використанням Реву», «дві атаки
/// Ляпасом» — «дві атаки Ударом». Кожен рядок прочитано реченням; сторож нижче падає, якщо
/// стара назва лишилась у прозі, тож пропущений випадок тут не проїде мовчки.
const PROSE_FIXES: Record<string, [string, string][]> = {
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
  colossus: [
    ["використовуючи Ляпас або", "використовуючи Удар або"],
    ["одну атаку Ляпасом", "одну атаку Ударом"],
  ],
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
  const parsed = parseMonster2024(readFileSync(join(RAW, `${row.slug}.html`), "utf-8"), row.slug);
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

      const target = RATIFIED[key];
      if (!target) throw new Error(`«${key}» немає в statblockFeatures — словник змінився, перевір перелік`);

      const current = cutSuffix(ukrainian[index].name);
      const currentTerm = stripGlossaryMarkers(current.base);
      const marked = markName(target, key);
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

/// Звичайний маркер підкреслює стільки українських слів, скільки їх в оригіналі, і зупиняється
/// на розділовому знаку — тож «Обліт (без принагідної атаки){{Flyby}}» не підкреслює нічого.
/// Там, де він не накриває всю назву, Р20 вимагає парної форми. Скільки саме він накриває,
/// питаємо в того самого `findGlossaryMarkers`, що й гейт: правило одне на проєкт.
function markName(target: string, key: string): string {
  const plain = `${target}{{${key}}}`;
  return findGlossaryMarkers(plain)[0]?.term === target ? plain : `{{${target}|${key}}}`;
}

function rewriteProse(row: Row): void {
  for (const [from, to] of PROSE_FIXES[row.slug] ?? []) {
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
