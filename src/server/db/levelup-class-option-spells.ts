/** Книга тіней Pact of the Tome, узятого на підвищенні, і Магічні відкриття на 6-му рівні Колегії знань: пропозиція для майстра й перевірка перед записом. */

import { auth } from "@/lib/auth";
import { canEditPers } from "@/lib/actions/pers";
import { prisma } from "@/lib/prisma";
import {
  findClassOptionSpellProblem,
  findSubclassAtNextLevel,
  loadClassOptionSpellOffer,
  type ClassOptionSpellOffer,
  type SubclassAtLevel,
} from "@/server/db/class-option-spell-choices";
import { findUserIdByEmail } from "@/server/db/users";

export type LevelUpClassTarget = { classId: number; subclassId: number | null };

export async function loadLevelUpClassOptionSpellOffer(
  persId: number,
  newlyChosenOptionIds: readonly number[],
  target: LevelUpClassTarget | null,
): Promise<ClassOptionSpellOffer | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  const userId = await findUserIdByEmail(session.user.email);
  if (userId === null || !(await canEditPers(persId, userId))) return null;

  return loadClassOptionSpellOffer(prisma, {
    newlyChosenOptionIds,
    subclassAtLevel: target ? await findSubclassAtNextLevel(prisma, { persId, ...target }) : null,
    unavailableSpellIds: await findOwnedSpellIds(persId),
  });
}

export async function findLevelUpClassOptionSpellProblem(input: {
  persId: number;
  newlyChosenOptionIds: readonly number[];
  subclassAtLevel: SubclassAtLevel | null;
  alsoChosenSpellIds: readonly number[];
  selectedSpellIds: readonly number[];
}) {
  return findClassOptionSpellProblem(prisma, {
    newlyChosenOptionIds: input.newlyChosenOptionIds,
    subclassAtLevel: input.subclassAtLevel,
    unavailableSpellIds: [...(await findOwnedSpellIds(input.persId)), ...input.alsoChosenSpellIds],
    selectedSpellIds: input.selectedSpellIds,
  });
}

async function findOwnedSpellIds(persId: number): Promise<number[]> {
  const rows = await prisma.persSpell.findMany({ where: { persId }, select: { spellId: true } });
  return rows.map((row) => row.spellId);
}
