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
import { loadCatchUpSpellOffers, type CatchUpSpellOffer } from "@/server/db/catch-up-spell-choices-2014";

export type LevelUpClassTarget = { classId: number; subclassId: number | null };

/** KR48.7: вибір, який персонаж 2014 пропустив до KR48.6. */
export async function loadLevelUpCatchUpSpellOffers(persId: number): Promise<CatchUpSpellOffer[]> {
  return (await canCurrentUserEdit(persId)) ? loadCatchUpSpellOffers(prisma, persId) : [];
}

export async function loadLevelUpClassOptionSpellOffer(
  persId: number,
  newlyChosenOptionIds: readonly number[],
  target: LevelUpClassTarget | null,
): Promise<ClassOptionSpellOffer | null> {
  if (!(await canCurrentUserEdit(persId))) return null;

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

async function canCurrentUserEdit(persId: number): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.email) return false;
  const userId = await findUserIdByEmail(session.user.email);
  return userId !== null && (await canEditPers(persId, userId));
}

async function findOwnedSpellIds(persId: number): Promise<number[]> {
  const rows = await prisma.persSpell.findMany({ where: { persId }, select: { spellId: true } });
  return rows.map((row) => row.spellId);
}
