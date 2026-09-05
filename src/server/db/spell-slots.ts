import type { Classes, Ruleset, SpellcastingType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type SpellSlotOwnership = {
  persId: number;
  userId: number;
  currentSpellSlots: number[];
  currentPactSlots: number;
};

type SpellcastingClass = {
  name: Classes | null;
  spellcastingType: SpellcastingType | null;
};

type SpellcastingSubclass = {
  spellcastingType: SpellcastingType | null;
};

export type SpellcastingSlotState = {
  ruleset: Ruleset;
  level: number;
  currentSpellSlots: number[];
  currentPactSlots: number;
  class: SpellcastingClass;
  subclass: SpellcastingSubclass | null;
  multiclasses: Array<{
    classLevel: number;
    class: SpellcastingClass;
    subclass: SpellcastingSubclass | null;
  }>;
};

export async function findSpellSlotOwnership(persId: number): Promise<SpellSlotOwnership | null> {
  return prisma.pers.findUnique({
    where: { persId },
    select: { persId: true, userId: true, currentSpellSlots: true, currentPactSlots: true },
  });
}

export async function findSpellcastingSlotState(persId: number): Promise<SpellcastingSlotState | null> {
  return prisma.pers.findUnique({
    where: { persId },
    select: {
      ruleset: true,
      level: true,
      currentSpellSlots: true,
      currentPactSlots: true,
      class: { select: { name: true, spellcastingType: true } },
      subclass: { select: { spellcastingType: true } },
      multiclasses: {
        select: {
          classLevel: true,
          class: { select: { name: true, spellcastingType: true } },
          subclass: { select: { spellcastingType: true } },
        },
      },
    },
  });
}

export async function updateCurrentSpellSlots(persId: number, currentSpellSlots: number[]): Promise<number[]> {
  const pers = await prisma.pers.update({
    where: { persId },
    data: { currentSpellSlots },
    select: { currentSpellSlots: true },
  });
  return pers.currentSpellSlots;
}

export async function updateCurrentPactSlots(persId: number, currentPactSlots: number): Promise<number> {
  const pers = await prisma.pers.update({
    where: { persId },
    data: { currentPactSlots },
    select: { currentPactSlots: true },
  });
  return pers.currentPactSlots;
}
