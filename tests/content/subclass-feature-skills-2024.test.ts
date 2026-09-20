import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { SkillsEnum } from "@/lib/types/enums";

type SubclassFeatureEng = { name: string; skillProficiencies?: { choiceCount: number; options: string[] } };
type SubclassJson = { engName: string; featuresEng?: SubclassFeatureEng[] };

const subclasses = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/2024/normalized/subclasses.json"), "utf-8")) as SubclassJson[];

describe("навички на вибір від рис підкласів 2024 записані полем", () => {
  it("Додаткові володіння Колегії знань — три будь-які навички (SRD 5.2: «proficiency with three skills of your choice»)", () => {
    const feature = subclasses.find((subclass) => subclass.engName === "College of Lore")?.featuresEng?.find((entry) => entry.name === "Bonus Proficiencies");

    expect(feature?.skillProficiencies?.choiceCount).toBe(3);
    expect([...(feature?.skillProficiencies?.options ?? [])].sort()).toEqual([...SkillsEnum].sort());
  });
});
