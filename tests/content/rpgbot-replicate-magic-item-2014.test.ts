import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import descriptions from "@/lib/generated/optimization-feature-descriptions-2014.json";
import items from "@/lib/generated/magicItems.json";
import { parseArticleDocument } from "@/lib/optimization/document";
import { hydrateArticleDocument } from "@/lib/optimization/hydration-catalog";

const replicated = descriptions.find((entry) => entry.engName === "Replicate Magic Item")!;

it("2014 replication retains repeat learning and excludes potions and scrolls", () => {
  expect(replicated.name).toBe("Репліка магічного предмета");
  expect(replicated.description).toContain("вивчати це Вливання кілька разів");
  expect(replicated.description).toContain("будь-який Звичайний магічний предмет");
  expect(replicated.description).toContain("крім зіль і сувоїв");
  expect(replicated.description).toContain("тип предмета, необхідний для його створення");
});

it("all four original TCE tables retain every item, level, native link and attunement", () => {
  const raw = JSON.parse(readFileSync("tests/fixtures/5etools/raw-slices/optionalfeatures.json", "utf8"));
  const original = raw.optionalfeature.find((entry: { name: string; source: string }) => entry.name === "Replicate Magic Item" && entry.source === "TCE");
  const levels = [2, 6, 10, 14];
  const sections = replicated.description.split("### ").slice(1);
  expect(sections).toHaveLength(4);
  let count = 0;
  for (const [index, table] of original.entries.slice(2).entries()) {
    expect(sections[index]).toContain(`Винахідник ${levels[index]}-го рівня`);
    for (const [tag, attunement] of table.rows as [string, string][]) {
      const english = tag.match(/\{@item ([^|}]+)/)![1];
      const native = items.find((item) => item.engName.toLowerCase() === english.toLowerCase())!;
      expect(native, english).toBeDefined();
      expect(sections[index], english).toContain(`<a href="/magic-items/${native.magicItemId}">${native.name}</a>`);
      const row = sections[index].split("\n").find((line) => line.includes(`/magic-items/${native.magicItemId}"`));
      expect(row, english).toMatch(new RegExp(`\\| ${attunement === "Yes" ? "Так" : "Ні"} \\|$`));
      count++;
    }
  }
  expect(count).toBe(51);
});

it("the infusion guide opens the complete 2014 replication rule", async () => {
  const document = parseArticleDocument(JSON.parse(readFileSync("data/rpgbot/uk/rpgbot-artificer-infusions-2014.json", "utf8")));
  const article = await hydrateArticleDocument(document);
  const reference = article.contentReferences.flatMap((entry) => entry.options ?? [entry]).find((entry) => entry.engName === "Replicate Magic Item");
  expect(reference?.name).toBe("Репліка магічного предмета");
  expect(reference?.description).toContain("Винахідник 14-го рівня");
  expect(reference?.description).toContain("крім зіль і сувоїв");
});

it("SCAG half-elf variants retain one replacement, spellcasting abilities and rest limits", () => {
  const high = descriptions.find((entry) => entry.engName === "Half-Elf (Moon Elf or Sun Elf Descent)")!;
  expect(high.name).toBe("Високий Напівельф");
  expect(high.description).toContain("одне замовляння зі списку Чарівника");
  expect(high.description).toContain("Інтелект є характеристикою чаротворення");
  expect(high.description).toContain("Обирається одна заміна");
  expect(high.description).toContain("довгим мечем, коротким мечем, коротким луком і довгим луком");
  const drow = descriptions.find((entry) => entry.engName === "Half-Elf (Drow Descent)")!;
  expect(drow.name).toBe("Напівельф-дроу");
  for (const spell of ["Dancing Lights", "Faerie Fire", "Darkness"]) expect(drow.description).toContain(spell);
  expect(drow.description).toContain("З 3-го рівня");
  expect(drow.description).toContain("З 5-го рівня");
  expect(drow.description).toContain("тривалий відпочинок");
  expect(drow.description).toContain("Харизма є характеристикою чаротворення");
});
