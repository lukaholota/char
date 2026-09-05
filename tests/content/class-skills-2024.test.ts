import { readFileSync } from "node:fs";
import { Skills } from "@prisma/client";
import { expect, it } from "vitest";

const srd = readFileSync("data/2024/srd/classes.md", "utf8");
const artificer = readFileSync("data/2024/source/raw/class/artificer-main.html", "utf8");

function readSkillChoice(text: string) {
  const row = /<td>(?:<strong>)?Skill Proficiencies(?:<\/strong>)?<\/td>\s*<td>(.*?)<\/td>/s.exec(text)?.[1];
  if (!row) throw new Error("Source has no Skill Proficiencies row");
  const count = /Choose (?:any )?(\d+)/.exec(row)?.[1];
  if (!count) throw new Error(`Unknown skill choice: ${row}`);
  const options = row.includes("Choose any")
    ? Object.values(Skills)
    : row.split(":")[1].split(/,\s*(?:or\s+)?/).map(name => name.trim().toUpperCase().replaceAll(" ", "_"));
  return { choiceCount: Number(count), options: [...options].sort() };
}

it("KR31.2 — навички всіх класів 2024 відповідають таблицям джерела", () => {
  const expected = [...srd.matchAll(/^## (\w+)\n([\s\S]*?)(?=^## |$(?![\s\S]))/gm)]
    .map(([, name, text]) => ({ name, ...readSkillChoice(text) }));
  expected.push({ name: "Artificer", ...readSkillChoice(artificer) });
  const classes: Array<{ engName: string; skillProficiencies?: { choiceCount: number; options: string[] } }> =
    JSON.parse(readFileSync("data/2024/normalized/classes.json", "utf8"));

  expect(classes.map(cls => cls.engName).sort()).toEqual(expected.map(cls => cls.name).sort());
  expect(classes.map(cls => ({
    name: cls.engName,
    choiceCount: cls.skillProficiencies?.choiceCount,
    options: cls.skillProficiencies?.options.toSorted(),
  }))).toEqual(expected);
});
