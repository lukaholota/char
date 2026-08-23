import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

/// Ревізія дзеркала пінується тут, у коді, а не береться з `main`: інакше та сама команда
/// завтра дає інший корпус і жоден тест нічого не доводить (див. Р19 і «Ризики й межі» O16).
export const MIRROR_REPOSITORY = "5etools-mirror-3/5etools-src";
export const MIRROR_REVISION = "e5f3e77b303a92df10487207857200245e71957c";

export const RAW_CACHE_DIR = join(process.cwd(), "data", "5etools", "raw");
export const SOURCE_LOCK_PATH = join(process.cwd(), "data", "5etools", "source-lock.json");

/// Файли, які не перелічені в жодному індексі. Решта корпусу — книги з
/// `bestiary/index.json` і `spells/index.json`, їх додає качалка.
export const STANDALONE_FILES = [
  "items.json",
  "items-base.json",
  "magicvariants.json",
  "bastions.json",
  /// Списки класів заклинання лежать не в самому записі, а тут: `SOURCE → назва → class[]`.
  "spells/sources.json",
] as const;

export const INDEX_FILES = ["bestiary/index.json", "spells/index.json"] as const;

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
