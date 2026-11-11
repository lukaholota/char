import { SkillProficiencyType, Skills, type Prisma } from "@prisma/client";

const ALL_SKILLS = Object.values(Skills);

export async function grantSkillProficiencies(tx: Prisma.TransactionClient, persId: number, skills: readonly Skills[]): Promise<void> {
  if (!skills.length) return;
  await tx.persSkill.createMany({
    data: skills.map((name) => ({ persId, name, skillId: ALL_SKILLS.indexOf(name) + 1, proficiencyType: SkillProficiencyType.PROFICIENT })),
    skipDuplicates: true,
  });
  await tx.persSkill.updateMany({
    where: { persId, name: { in: [...skills] }, proficiencyType: { in: [SkillProficiencyType.NONE, SkillProficiencyType.HALF] } },
    data: { proficiencyType: SkillProficiencyType.PROFICIENT },
  });
}
