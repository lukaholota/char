import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { readDraftArticle } from "@/lib/optimization/draft-reader";
import { hydrateArticleDocument } from "@/lib/optimization/hydration-catalog";
const slugs = ["fighter-2014", "wizard-spells-2014", "bard-2014", "monk-2014", "shadow-touched-2014", "warlock-2014", "druid-2014", "rogue-2014", "artificer-2014", "dwarf-2014", "tortle-2014", "fighter-2024", "monk-2024"];
(async () => {
  const out: Record<string, string> = {};
  let total = 0;
  for (const slug of slugs) {
    const d = await readDraftArticle(slug);
    if (!d) { out[slug] = "missing"; continue; }
    const t = performance.now();
    const h = await hydrateArticleDocument({ article: d.article, translations: [d.revision] });
    const ms = performance.now() - t; total += ms;
    out[slug] = createHash("sha256").update(JSON.stringify(h)).digest("hex").slice(0, 16);
    console.log(slug.padEnd(22), Math.round(ms) + "ms", out[slug]);
  }
  console.log("total", Math.round(total) + "ms");
  writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
})();
