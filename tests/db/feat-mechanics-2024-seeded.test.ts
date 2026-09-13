import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { FIGHTING_STYLE_MECHANICS_2024 } from "../../prisma/seed/fightingStyle2024";
import { disconnectDatabase } from "../user-data";

afterAll(disconnectDatabase);

const RULESET = "RULES_2024" as const;

/**
 * KR31.4 — гейт «файл → база»: числа рис 2024 у клоні збігаються з таблицями сіду. Червоне тут
 * означає одне з двох — сід не прогнаний або хтось поправив базу проходом повз файл-джерело (Р33).
 */
describe("KR31.4 — механіка рис 2024 у базі", () => {
  it.each(Object.entries(FIGHTING_STYLE_MECHANICS_2024))(
    "бойовий стиль %s несе числа книги",
    async (engName, expected) => {
      const feature = await prisma.feature.findUniqueOrThrow({
        where: { engName: `Fighting Style: ${engName} (2024)` },
        select: {
          bonusToRangedAttackRoll: true,
          givesAC: true,
          requiresArmorForACBonus: true,
          bonusToMeleeOneHandedWeaponDamage: true,
          bonusToThrownDamage: true,
          unarmedDamage: true,
          modifiesUnarmed: true,
        },
      });

      for (const [column, value] of Object.entries(expected)) {
        expect({ [column]: feature[column as keyof typeof feature] }).toEqual({ [column]: value });
      }
    },
  );

  it.each([
    ["Lightly Armored", { grantedArmorProficiencies: ["LIGHT", "SHIELD"] }],
    ["Moderately Armored", { grantedArmorProficiencies: ["MEDIUM"] }],
    ["Heavily Armored", { grantedArmorProficiencies: ["HEAVY"] }],
    ["Martial Weapon Training", { grantedWeaponProficiencies: { type: ["MARTIAL_WEAPON"] } }],
    ["Chef", { grantedToolProficiencies: ["COOKS_UTENSILS"] }],
    ["Poisoner", { grantedToolProficiencies: ["POISONERS_KIT"] }],
  ] as const)("риса %s видає володіння в даних, а не в тексті", async (engName, expected) => {
    const feat = await findFeat2024(engName);
    expect(feat).toMatchObject(expected);
  });

  it("Експерт у навичках дає володіння навичкою й експертизу", async () => {
    const feat = await findFeat2024("Skill Expert");
    expect(feat.grantedSkillCount).toBe(1);
    expect(countOptionsInGroup(feat, "Володіння", "SKILL_PROFICIENCY")).toBe(18);
    expect(countOptionsInGroup(feat, "Експертиза", "SKILL_EXPERTISE")).toBe(18);
  });

  it("Адепт стихій має групу типу шкоди, якою обмежується повтор", async () => {
    const feat = await findFeat2024("Elemental Adept");
    expect(feat.isRepeatable).toBe(true);
    expect(countOptionsInGroup(feat, "Тип шкоди")).toBe(5);
  });

  it.each([
    ["Speedy", { speedBonus: 10 }],
    ["Boon Of Speed", { speedBonus: 30 }],
    ["Alert", { initiativeProficiency: true }],
    ["Boon Of Fortitude", { bonusHitPoints: 40 }],
  ] as const)("риса %s дає фічу з числом, яке читає лист", async (engName, expected) => {
    const feat = await findFeat2024(engName);
    expect(feat.grantsFeature).toContainEqual(expect.objectContaining(expected));
  });

  it("Дар умілості дає всі 18 навичок і експертизу на вибір", async () => {
    const feat = await findFeat2024("Boon Of Skill");
    expect(feat.grantedSkills).toHaveLength(18);
    expect(countOptionsInGroup(feat, "Експертиза", "SKILL_EXPERTISE")).toBe(18);
  });

  it("риси «Ability Score Improvement» у переліку 2024 немає", async () => {
    const feat = await prisma.feat.findFirst({
      where: { ruleset: RULESET, name: "ABILITY_SCORE_IMPROVEMENT" },
      select: { featId: true },
    });
    expect(feat).toBeNull();
  });

  it("Weapon Master лишається без власної фічі — слот дає правило, а не дані", async () => {
    const feat = await findFeat2024("Weapon Master");
    expect(feat.grantsFeature).toEqual([]);
  });
});

async function findFeat2024(engName: string) {
  const feat = await prisma.feat.findFirst({
    where: { ruleset: RULESET, engName },
    include: {
      grantsFeature: true,
      featChoiceOptions: { include: { choiceOption: true } },
    },
  });
  if (!feat) throw new Error(`Риси "${engName}" (2024) немає в базі — прогони seed:feat-mechanics-2024:test`);
  return feat;
}

type FeatWithOptions = Awaited<ReturnType<typeof findFeat2024>>;

function countOptionsInGroup(feat: FeatWithOptions, groupName: string, effectKind?: string): number {
  return feat.featChoiceOptions.filter(
    (link) =>
      link.choiceOption.groupName === groupName &&
      (effectKind === undefined || link.choiceOption.effectKind === effectKind),
  ).length;
}
