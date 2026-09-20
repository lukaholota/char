import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildIconFileName } from "../src/lib/refs/icon-prompt";

const OUT_DIR = "data/spell-icons/raw";
const API = "https://bg3.wiki/w/api.php";
const AGENT = "char.holota.family spell icon fetcher (unofficial fan project)";

type ImageInfo = { query?: { pages?: Record<string, { title: string; imageinfo?: { url: string }[] }> } };

async function findFileUrls(wikiFiles: string[]): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  for (let i = 0; i < wikiFiles.length; i += 45) {
    const chunk = wikiFiles.slice(i, i + 45);
    const params = new URLSearchParams({
      action: "query",
      titles: chunk.map((file) => `File:${file} Unfaded Icon.webp`).join("|"),
      prop: "imageinfo",
      iiprop: "url",
      format: "json",
    });
    const body = (await (await fetch(`${API}?${params}`, { headers: { "User-Agent": AGENT } })).json()) as ImageInfo;
    for (const page of Object.values(body.query?.pages ?? {})) {
      const url = page.imageinfo?.[0]?.url;
      if (url) urls.set(page.title.replace(/^File:/, "").replace(/ Unfaded Icon\.webp$/, ""), url);
    }
  }
  return urls;
}

async function fetchEveryIcon(): Promise<void> {
  const map = JSON.parse(readFileSync("data/spell-icons/bg3-map.json", "utf8")) as Record<string, string>;
  mkdirSync(OUT_DIR, { recursive: true });

  const urls = await findFileUrls([...new Set(Object.values(map))]);
  let downloaded = 0;
  let skipped = 0;
  const missing: string[] = [];

  for (const [engName, wikiFile] of Object.entries(map)) {
    const target = join(OUT_DIR, `${buildIconFileName(engName)}.webp`);
    if (existsSync(target)) {
      skipped += 1;
      continue;
    }
    const url = urls.get(wikiFile);
    if (!url) {
      missing.push(`${engName} → ${wikiFile}`);
      continue;
    }
    const response = await fetch(url, { headers: { "User-Agent": AGENT } });
    if (!response.ok) {
      missing.push(`${engName} → ${wikiFile} (HTTP ${response.status})`);
      continue;
    }
    writeFileSync(target, Buffer.from(await response.arrayBuffer()));
    downloaded += 1;
  }

  console.log(`завантажено ${downloaded}, вже було ${skipped}, у мапі ${Object.keys(map).length}`);
  if (missing.length) {
    console.log(`\nне знайдено на вікі — ${missing.length}:`);
    for (const line of missing) console.log(`  ${line}`);
    process.exitCode = 1;
  }
}

void fetchEveryIcon();
