import type { Prisma, PrismaClient, Ruleset } from "@prisma/client";
import { hasUnarmedStrikeFromStart } from "@/rules/martial-arts";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

export async function grantStartingUnarmedStrike(
  client: DatabaseClient,
  persId: number,
  input: { className: string; ruleset: Ruleset },
): Promise<void> {
  if (!hasUnarmedStrikeFromStart(input.className)) return;

  const unarmedStrike = await client.weapon.findUnique({
    where: { name_ruleset: { name: "UNARMED_STRIKE", ruleset: input.ruleset } },
    select: { weaponId: true },
  });
  if (!unarmedStrike) return;

  const alreadyOwned = await client.persWeapon.count({ where: { persId, weaponId: unarmedStrike.weaponId } });
  if (alreadyOwned > 0) return;

  await client.persWeapon.create({ data: { persId, weaponId: unarmedStrike.weaponId } });
}
