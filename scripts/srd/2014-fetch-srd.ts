import { existsSync, mkdirSync, statSync, writeFileSync } from "fs";
import { dirname } from "path";
import { DEFAULT_PAUSE_MS, fetchTextPolitely, pause } from "../lib/polite-http";
import {
  SRD_2014_COMMIT,
  SRD_2014_DIR,
  SRD_2014_FILES,
  buildSrd2014FileUrl,
  findSrd2014FilePath,
} from "./2014-srd-source";

async function downloadSrd2014Snapshot(): Promise<void> {
  const force = process.argv.includes("--force");

  console.log(`📖 SRD 5.1 @ ${SRD_2014_COMMIT.slice(0, 8)} → ${SRD_2014_DIR}`);
  mkdirSync(SRD_2014_DIR, { recursive: true });

  let downloaded = 0;
  let cached = 0;

  for (const file of SRD_2014_FILES) {
    if (!force && hasSrd2014File(file)) {
      cached += 1;
      continue;
    }

    if (downloaded > 0) await pause(DEFAULT_PAUSE_MS);
    const markdown = await fetchTextPolitely(buildSrd2014FileUrl(file));
    const path = findSrd2014FilePath(file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, markdown, "utf-8");
    downloaded += 1;
    console.log(`  ↓ ${file} — ${Math.round(markdown.length / 1024)} КБ`);
  }

  console.log(`✅ ${SRD_2014_FILES.length} файлів: ${downloaded} завантажено, ${cached} уже було`);
}

function hasSrd2014File(file: string): boolean {
  const path = findSrd2014FilePath(file);
  return existsSync(path) && statSync(path).size > 0;
}

downloadSrd2014Snapshot().catch((error) => {
  console.error("❌ Не вдалося завантажити SRD 5.1:", error);
  process.exit(1);
});
