import { existsSync, mkdirSync, statSync, writeFileSync } from "fs";
import { DEFAULT_PAUSE_MS, fetchTextPolitely, pause } from "../lib/polite-http";
import { SRD_COMMIT, SRD_DIR, SRD_FILES, buildSrdFileUrl, findSrdFilePath } from "./srd-source";

async function downloadSrdSnapshot(): Promise<void> {
  const force = process.argv.includes("--force");

  console.log(`📖 SRD 5.2.1 @ ${SRD_COMMIT.slice(0, 8)} → ${SRD_DIR}`);
  mkdirSync(SRD_DIR, { recursive: true });

  let downloaded = 0;
  let cached = 0;

  for (const file of SRD_FILES) {
    if (!force && hasSrdFile(file)) {
      cached += 1;
      continue;
    }

    if (downloaded > 0) await pause(DEFAULT_PAUSE_MS);
    const markdown = await fetchTextPolitely(buildSrdFileUrl(file));
    writeFileSync(findSrdFilePath(file), markdown, "utf-8");
    downloaded += 1;
    console.log(`  ↓ ${file} — ${Math.round(markdown.length / 1024)} КБ`);
  }

  console.log(`✅ ${SRD_FILES.length} файлів: ${downloaded} завантажено, ${cached} уже було`);
}

function hasSrdFile(file: string): boolean {
  const path = findSrdFilePath(file);
  return existsSync(path) && statSync(path).size > 0;
}

downloadSrdSnapshot().catch((error) => {
  console.error("❌ Не вдалося завантажити SRD:", error);
  process.exit(1);
});
