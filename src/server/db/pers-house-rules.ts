import { prisma } from "@/lib/prisma";
import { parsePersHouseRules } from "@/rules/house-rules";

export async function savePersHouseRules(persId: number, raw: unknown): Promise<void> {
  await prisma.pers.update({ where: { persId }, data: { houseRules: parsePersHouseRules(raw) }, select: { persId: true } });
}
