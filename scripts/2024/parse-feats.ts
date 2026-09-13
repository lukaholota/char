/**
 * KR31.3 — англійський текст рис персонажа 2024 із локальних сторінок
 * `data/2024/source/raw/feat/*.html`.
 *
 * Джерело те саме, що в підкласів і видів, і з тієї ж причини: SRD 5.2 описує 17 рис із 75,
 * а `data/2024/normalized/feats.json` — мета проходу, а не його джерело
 * ([Р19](../../docs/DECISIONS.md#р19), [Р27](../../docs/DECISIONS.md#р27)).
 *
 * Тіло риси береться цілим. Книга ставить число використань у якусь одну з іменованих переваг
 * («**Guarded Mind.** … can't use it again until you finish a Short or Long Rest»), а риси
 * бойових стилів названих переваг не мають узагалі — тож ділити текст на переваги витягові нема
 * потреби, і поділ лишається у файлі, де він потрібен для показу.
 */

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderBodyAsMarkdown, splitByBoldHeadings, type BoldHeadingBlock } from "./parse-class-features";

const RAW_FEAT_DIR = "data/2024/source/raw/feat";

export type FeatSource = { engName: string; descriptionEng: string; benefits: BoldHeadingBlock[] };

/// Сторінка зветься за назвою риси; усі 75 назв зі `feats.json` лягають на файл без винятків.
function findFeatPageName(engName: string): string {
  return engName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function readFeatSource(engName: string): FeatSource {
  const path = join(process.cwd(), RAW_FEAT_DIR, `${findFeatPageName(engName)}.html`);
  const descriptionEng = parseFeatBody(readFileSync(path, "utf-8"), engName);
  return { engName, descriptionEng, benefits: splitByBoldHeadings(descriptionEng) };
}

export function readFeatSources(): FeatSource[] {
  const feats: Array<{ engName: string }> = JSON.parse(
    readFileSync(join(process.cwd(), "data/2024/normalized/feats.json"), "utf-8"),
  );
  return feats.map((feat) => readFeatSource(feat.engName));
}

/// Службові рядки сторінки: книга-джерело й вимога. Механіки в них немає, а «Rest» трапляється.
const PAGE_PREAMBLE = /^(?:\*?Source:|\*Prerequisite:)/;

function parseFeatBody(pageHtml: string, engName: string): string {
  const contentStart = pageHtml.indexOf('id="page-content"');
  if (contentStart === -1) throw new Error(`${engName}: не знайдено page-content.`);

  const content = pageHtml.slice(contentStart).split(/<script|<!-- mobile bottom|<div class="page-tags"/)[0];
  const body = renderBodyAsMarkdown(content)
    .split("\n\n")
    .filter((block) => !PAGE_PREAMBLE.test(block))
    .join("\n\n")
    .trim();

  if (!body) throw new Error(`${engName}: порожнє тіло риси.`);
  return body;
}

function main() {
  for (const feat of readFeatSources()) {
    console.log(`  ${feat.engName.padEnd(28)} ${String(feat.benefits.length).padStart(2)} переваг`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
