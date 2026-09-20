import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

/// Ревізія дзеркала пінується тут, у коді, а не береться з `main`: інакше та сама команда
/// завтра дає інший корпус і жоден тест нічого не доводить (див. Р19 і «Ризики й межі» O16).
export const MIRROR_REPOSITORY = "5etools-mirror-3/5etools-src";
export const MIRROR_REVISION = "e5f3e77b303a92df10487207857200245e71957c";

export const RAW_CACHE_DIR = join(process.cwd(), "data", "5etools", "raw");
export const SOURCE_LOCK_PATH = join(process.cwd(), "data", "5etools", "source-lock.json");

export const MIRRORED_CLASSES = [
  "artificer",
  "barbarian",
  "bard",
  "cleric",
  "druid",
  "fighter",
  "monk",
  "paladin",
  "ranger",
  "rogue",
  "sorcerer",
  "warlock",
  "wizard",
];

/// Файли, які не перелічені в жодному індексі. Решта корпусу — книги з
/// `bestiary/index.json` і `spells/index.json`, їх додає качалка.
export const STANDALONE_FILES = [
  "items.json",
  "items-base.json",
  "magicvariants.json",
  "bastions.json",
  /// Списки класів заклинання лежать не в самому записі, а тут: `SOURCE → назва → class[]`.
  "spells/sources.json",
  /// Дії лігва й регіональні ефекти лежать не в статблоці, а тут: запис посилається сюди
  /// полем `legendaryGroup` (`{name, source}`). Без цього файла 52 зі 124 істот, що лишилися
  /// в черзі KR16.3, приїхали б із порожніми `lairActions` і `regionEffects`.
  "bestiary/legendarygroups.json",
  /// Варіантні й необовʼязкові правила поза SRD (Flanking, Rest Variants, Spell Points,
  /// міжчасся XGtE, підручні TCoE) — джерело KR20.5 замість скрейпу wikidot.
  "variantrules.json",
  /// Іменовані пастки й небезпеки поза SRD (DMG, XGtE, TCoE, XDMG, XPHB) — KR23.3. Оглядові
  /// статті «Пастки» самі йдуть зі SRD (`rules-2014.json`/`rules-2024.json`), цей файл додає
  /// конкретні приклади понад ті, що SRD уже друкує дослівно (позначені тут `srd`/`srd52`).
  "trapshazards.json",
  /// Дрібні реєстри поза SRD — KR23.5. Більшість записів уже в довіднику (дії й дії статблока
  /// зі SRD, 14 станів, навички); ці чотири файли додають те, чого SRD не друкує: 6 хвороб
  /// Додатка A PHB, три статті глосарію чуттів PHB (сторінка «Monsters», не рядки правил) і
  /// 17 облогових знарядь DMG/XDMG.
  "actions.json",
  "conditionsdiseases.json",
  "objects.json",
  "senses.json",
  /// DMG 2024 глави 1–3 (The Basics, Running the Game, DM's Toolbox) — KR23.4. Дерево тут
  /// інше, ніж `variantrules.json`: `section` вкладений у `section`, а не пласкі записи.
  "book/book-xdmg.json",
  /// PHB 2014 глави 1 (Step-by-Step Characters) і 4 (Personality and Background) — KR29.1.
  /// Покрокового створення персонажа немає в SRD 5.1 взагалі, тому єдиний шлях — текст книги.
  "book/book-phb.json",
  /// Раси й підраси всіх книг разом із прозою — KR33.5, джерело прози рас 2014 (KR33.6).
  "races.json",
  "fluff-races.json",
  /// Класи й підкласи: механіка і проза лежать у різних файлах — KR33.5. Індекс `class/`
  /// тягнув би ще Mystic і Sidekick, яких у продукті немає, тож файли перелічено поіменно.
  ...MIRRORED_CLASSES.flatMap((name) => [`class/class-${name}.json`, `class/fluff-class-${name}.json`]),
  /// Метамагія, відозви, маневри: класи посилаються на них `{@optfeature}`, а текст лежить тут — KR35.1.
  "optionalfeatures.json",
];

/// `bestiary/fluff-index.json` — лор істот по книгах (KR33.8): вступи до груп («Dragons»,
/// «Demons») і тексти самих істот лежать окремо від статблоків, у `fluff-bestiary-*.json`.
export const INDEX_FILES = ["bestiary/index.json", "bestiary/fluff-index.json", "spells/index.json"] as const;

export type LockedFile = {
  bytes: number;
  sha256: string;
};

export type SourceLock = {
  repository: string;
  revision: string;
  capturedAt: string;
  files: Record<string, LockedFile>;
};

export function buildRawUrl(relativePath: string): string {
  assertPinnedRevision();
  return `https://raw.githubusercontent.com/${MIRROR_REPOSITORY}/${MIRROR_REVISION}/data/${relativePath}`;
}

export function findCachePath(relativePath: string): string {
  return join(RAW_CACHE_DIR, relativePath);
}

export function assertPinnedRevision(): void {
  if (/^[0-9a-f]{40}$/.test(MIRROR_REVISION)) return;

  throw new Error(
    `MIRROR_REVISION має бути повним 40-символьним SHA коміту, а не «${MIRROR_REVISION}». ` +
      "Гілка (`main`) пливе, і корпус разом із нею."
  );
}

export function hashContent(content: Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

export function readSourceLock(): SourceLock | null {
  if (!existsSync(SOURCE_LOCK_PATH)) return null;
  return JSON.parse(readFileSync(SOURCE_LOCK_PATH, "utf-8")) as SourceLock;
}

export function readLockedSourceLock(): SourceLock {
  const lock = readSourceLock();
  if (!lock) {
    throw new Error(
      `Немає ${SOURCE_LOCK_PATH}. Спершу зафіксуйте корпус: npx tsx scripts/5etools/fetch-source.ts --relock`
    );
  }

  if (lock.revision !== MIRROR_REVISION) {
    throw new Error(
      `Замок знято з ревізії ${lock.revision}, а код пінить ${MIRROR_REVISION}. ` +
        "Перезніміть замок явно (--relock) — мовчазна підміна корпусу тут найдорожча помилка."
    );
  }

  return lock;
}

export function readCachedFile(relativePath: string): Buffer {
  const path = findCachePath(relativePath);
  if (!existsSync(path)) {
    throw new Error(
      `Немає ${path}. Спершу стягніть корпус: npx tsx scripts/5etools/fetch-source.ts`
    );
  }
  return readFileSync(path);
}

export function readCachedJson<T>(relativePath: string, readShape: (value: unknown) => T): T {
  return readShape(readCachedValue(relativePath));
}

export function readCachedValue(relativePath: string): unknown {
  const raw = readCachedFile(relativePath);
  const expected = readLockedSourceLock().files[relativePath];

  if (expected && hashContent(raw) !== expected.sha256) {
    throw new Error(
      `${relativePath} не збігається з замком (data/5etools/source-lock.json). ` +
        "Перекачайте корпус або перезніміть замок свідомо."
    );
  }

  return JSON.parse(raw.toString("utf-8"));
}
