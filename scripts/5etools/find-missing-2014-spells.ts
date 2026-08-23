/// KR17.3 — заклинання 2014, що є в пінованому корпусі 5etools і яких немає в жодному нашому
/// каталозі. Жодне з них не Unearthed Arcana: усі 26 — із виданих супліментів (AI, SCC, BMT,
/// LLK, AAG, IDRotF, SatO, AitFR-AVT, GGR), тобто це контент, який має бути в бібліотеці.

import { readFileSync } from "fs";
import { findLooseNameKey, readSpells } from "./schema";

const ours = new Set(
  (JSON.parse(readFileSync("src/lib/generated/spells.json", "utf8")) as { engName: string }[])
    .map((r) => findLooseNameKey(r.engName))
);
const ours2024 = new Set(
  (JSON.parse(readFileSync("data/2024/normalized/spells.json", "utf8")) as { engName: string }[])
    .map((r) => findLooseNameKey(r.engName))
);

const bySource = new Map<string, string[]>();
const seen = new Set<string>();

for (const s of readSpells()) {
  if (s.edition !== "RULES_2014") continue;
  const k = findLooseNameKey(s.nameEng);
  if (ours.has(k) || ours2024.has(k) || seen.has(k)) continue;
  seen.add(k);
  if (!bySource.has(s.source)) bySource.set(s.source, []);
  bySource.get(s.source)!.push(s.nameEng);
}

const rows = [...bySource].sort((a, b) => b[1].length - a[1].length);
console.log(`Заклинань 2014 у корпусі, яких немає в жодному нашому каталозі: ${seen.size}\n`);
for (const [source, names] of rows) {
  console.log(`${String(names.length).padStart(4)}  ${source}   ${names.slice(0, 5).join(", ")}${names.length > 5 ? " …" : ""}`);
}
