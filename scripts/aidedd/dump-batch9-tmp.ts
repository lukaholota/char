import { readFileSync } from "fs";
import { join } from "path";
import { findRawDir } from "./aidedd-catalogs";
import { parseMonster2014 } from "./parse-monster-2014";

const slugs = ["ancient-shadow","animated-armor","bag-jelly","brass-dragon-wyrmling","brown-bear","bugbear","choker","copper-dragon-wyrmling","death-dog","deep-dragon-wyrmling","dire-wolf","dryad","duergar","duergar-soulblade","faerie-dragon","female-steeder","fire-snake","firenewt-warlock-of-imix","ghoul","giant-eagle","giant-hyena","giant-octopus","giant-ram","giant-spider","giant-strider","giant-toad","giant-vulture","gnoll-flesh-gnawer","goblin-boss","grinning-cat"];

const dir = findRawDir("monsters-2014");
const results: any[] = [];
for (const slug of slugs) {
  const path = join(dir, `${slug}.html`);
  const html = readFileSync(path, "utf-8");
  const parsed = parseMonster2014(html, slug);
  const emptySections = ["traits","actions","bonusActions","reactions","legendaryActions"].every(
    (k) => (parsed as any)[k].length === 0
  );
  results.push({ slug, source: parsed.source, empty: emptySections, parsed });
}
console.log(JSON.stringify(results, null, 2));
