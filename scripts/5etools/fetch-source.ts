import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname } from "path";
import {
  buildRawUrl,
  findCachePath,
  hashContent,
  INDEX_FILES,
  MIRROR_REPOSITORY,
  MIRROR_REVISION,
  readLockedSourceLock,
  SOURCE_LOCK_PATH,
  SourceLock,
  STANDALONE_FILES,
  assertPinnedRevision,
} from "./mirror";

const PREFLIGHT_FILE = "bestiary/index.json";

async function fetchPinnedCorpus(): Promise<void> {
  const isRelocking = process.argv.includes("--relock");

  assertPinnedRevision();
  await assertRevisionReachable();

  const lock = isRelocking ? null : readLockedSourceLock();
  const { targets, prefetched } = await collectTargets();

  console.log(
    `📦 ${MIRROR_REPOSITORY}@${MIRROR_REVISION.slice(0, 12)} — ${targets.length} файлів` +
      (isRelocking ? " (перезнімаємо замок)" : "")
  );

  const captured: Record<string, { bytes: number; sha256: string }> = {};
  let downloaded = 0;
  let cached = 0;

  for (const relativePath of targets) {
    const fromCache = prefetched.has(relativePath) ? null : readCachedIfPresent(relativePath);
    const content = fromCache ?? prefetched.get(relativePath) ?? (await downloadFile(relativePath));

    if (fromCache) cached += 1;
    else downloaded += 1;

    const digest = hashContent(content);
    if (lock) assertMatchesLock(lock, relativePath, content, digest);
    if (!fromCache && !prefetched.has(relativePath)) writeCacheFile(relativePath, content);

    captured[relativePath] = { bytes: content.length, sha256: digest };
  }

  if (isRelocking) writeSourceLock(captured);

  console.log(`✅ ${downloaded} стягнуто, ${cached} уже було в кеші → ${findCachePath("")}`);
}

async function assertRevisionReachable(): Promise<void> {
  const url = buildRawUrl(PREFLIGHT_FILE);
  const response = await fetch(url, { method: "HEAD" });

  if (response.ok) return;

  throw new Error(
    `Ревізія ${MIRROR_REVISION} недоступна: ${response.status} ${response.statusText} на ${url}. ` +
      "Качалка зупиняється — тихо взяти свіжий `main` замість пінутої ревізії вона не має права."
  );
}

/// Індекси потрібні до основного циклу — саме вони перелічують книги. Ті з них, що довелося
/// стягнути тут, повертаються окремо, щоб цикл не порахував їх за «уже було в кеші».
async function collectTargets(): Promise<{ targets: string[]; prefetched: Map<string, Buffer> }> {
  const indexed: string[] = [];
  const prefetched = new Map<string, Buffer>();

  for (const indexPath of INDEX_FILES) {
    const cached = readCachedIfPresent(indexPath);
    const content = cached ?? (await downloadAndCache(indexPath));
    if (!cached) prefetched.set(indexPath, content);

    const books = readBookIndex(indexPath, content);
    const directory = dirname(indexPath);
    indexed.push(...books.map((file) => `${directory}/${file}`));
  }

  return { targets: [...INDEX_FILES, ...STANDALONE_FILES, ...indexed], prefetched };
}

function readBookIndex(indexPath: string, content: Buffer): string[] {
  const parsed: unknown = JSON.parse(content.toString("utf-8"));

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${indexPath}: очікували мапу «книга → файл», отримали інше`);
  }

  const files = Object.values(parsed as Record<string, unknown>);
  const broken = files.filter((file) => typeof file !== "string");
  if (broken.length > 0) throw new Error(`${indexPath}: у мапі не-рядкові значення`);

  return files as string[];
}

async function downloadAndCache(relativePath: string): Promise<Buffer> {
  const content = await downloadFile(relativePath);
  writeCacheFile(relativePath, content);
  return content;
}

async function downloadFile(relativePath: string): Promise<Buffer> {
  const url = buildRawUrl(relativePath);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} на ${url}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

function readCachedIfPresent(relativePath: string): Buffer | null {
  const path = findCachePath(relativePath);
  return existsSync(path) ? readFileSync(path) : null;
}

function writeCacheFile(relativePath: string, content: Buffer): void {
  const path = findCachePath(relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function assertMatchesLock(
  lock: SourceLock,
  relativePath: string,
  content: Buffer,
  digest: string
): void {
  const expected = lock.files[relativePath];

  if (!expected) {
    throw new Error(
      `${relativePath} немає в замку. Корпус змінився — перезніміть замок свідомо (--relock).`
    );
  }

  if (expected.sha256 === digest && expected.bytes === content.length) return;

  throw new Error(
    `${relativePath} не збігається з замком: очікували ${expected.bytes} Б / ${expected.sha256}, ` +
      `маємо ${content.length} Б / ${digest}.`
  );
}

function writeSourceLock(files: Record<string, { bytes: number; sha256: string }>): void {
  const lock: SourceLock = {
    repository: MIRROR_REPOSITORY,
    revision: MIRROR_REVISION,
    capturedAt: new Date().toISOString().slice(0, 10),
    files: Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b))),
  };

  mkdirSync(dirname(SOURCE_LOCK_PATH), { recursive: true });
  writeFileSync(SOURCE_LOCK_PATH, `${JSON.stringify(lock, null, 2)}\n`, "utf-8");
  console.log(`🔒 Замок знято: ${Object.keys(files).length} файлів → ${SOURCE_LOCK_PATH}`);
}

fetchPinnedCorpus().catch((error) => {
  console.error(`❌ ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
