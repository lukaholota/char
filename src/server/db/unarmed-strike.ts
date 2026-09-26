import type { Prisma, PrismaClient, Ruleset } from "@prisma/client";
import { hasUnarmedStrikeFromStart, hasUnarmedStrikeFromSubclass } from "@/rules/martial-arts";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

export async function grantStartingUnarmedStrike(
  client: DatabaseClient,
  persId: number,
  input: { className: string; ruleset: Ruleset },
): Promise<void> {
  if (!hasUnarmedStrikeFromStart(input.className)) return;
  await grantUnarmedStrike(client, persId, input.ruleset);
}

/// Орден лікантропів: Хижі удари гібридної форми — це удар кулаком, тож на листі він має бути рядком зброї
/// з 3-го рівня, щоб на нього можна було накласти Багряний обряд (BH-004).
export async function grantSubclassUnarmedStrike(
  client: DatabaseClient,
  persId: number,
  input: { subclassName: string | null | undefined; ruleset: Ruleset },
): Promise<void> {
  if (!hasUnarmedStrikeFromSubclass(input.subclassName)) return;
  await grantUnarmedStrike(client, persId, input.ruleset);
}

async function grantUnarmedStrike(client: DatabaseClient, persId: number, ruleset: Ruleset): Promise<void> {
  const unarmedStrike = await client.weapon.findUnique({
    where: { name_ruleset: { name: "UNARMED_STRIKE", ruleset } },
    select: { weaponId: true },
  });
  if (!unarmedStrike) return;

  const alreadyOwned = await client.persWeapon.count({ where: { persId, weaponId: unarmedStrike.weaponId } });
  if (alreadyOwned > 0) return;

  await client.persWeapon.create({ data: { persId, weaponId: unarmedStrike.weaponId } });
}
