/**
 * KR31.5 — заклинання, які персонаж тримає підготовленими від риси 2024, і рядки, якими вони лягають.
 *
 * Що заслужено — у [`src/rules/feat-spells.ts`](../../rules/feat-spells.ts). Звʼязки риси читаються
 * з бази, а не з каталогу конструктора: каталог — знімок робочої бази, а рядок пишеться в ту базу,
 * з якою працює процес.
 */

import { type Prisma, type PrismaClient, SpellOrigin } from "@prisma/client";

import { featTranslations } from "@/lib/refs/translation";
import { findEarnedFeatSpells, type SpellGrantingFeat } from "@/rules/feat-spells";
import type { GrantedSpell } from "@/rules/spell-sources";
import type { AbilityKey } from "@/rules/types";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

/** «Violet» з пресетів MagicSlide — не збігається з кольорами класу, підкласу й виду. */
const FEAT_SPELL_BADGE_COLOR = "#a78bfa";

export async function findMissingFeatSpells(client: DatabaseClient, persId: number): Promise<GrantedSpell[]> {
  const pers = await client.pers.findUnique({
    where: { persId },
    select: {
      persSpells: { select: { spellId: true } },
      feats: {
        select: {
          feat: {
            select: {
              name: true,
              grantsFeature: { select: { engName: true, name: true, givesSpells: { select: { spellId: true } } } },
            },
          },
          choices: { select: { choiceOption: { select: { effectKind: true, effectAbility: true } } } },
        },
      },
    },
  });
  if (!pers) return [];

  const feats = pers.feats.map((persFeat): SpellGrantingFeat => ({
    featName: persFeat.feat.name,
    featLabel: featTranslations[persFeat.feat.name] ?? persFeat.feat.name,
    features: persFeat.feat.grantsFeature.map((feature) => ({
      engName: feature.engName,
      name: feature.name,
      spellIds: feature.givesSpells.map((spell) => spell.spellId),
    })),
    increasedAbility: findIncreasedAbility(persFeat.choices),
  }));

  return findEarnedFeatSpells(feats, pers.persSpells.map((spell) => spell.spellId));
}

function findIncreasedAbility(
  choices: ReadonlyArray<{ choiceOption: { effectKind: string | null; effectAbility: string | null } | null }>,
): AbilityKey | null {
  const increase = choices.find((choice) => choice.choiceOption?.effectKind === "ASI" && choice.choiceOption.effectAbility);
  return (increase?.choiceOption?.effectAbility ?? null) as AbilityKey | null;
}

/** «You always have that spell prepared» — понад ліміт підготовки, окремим рядком із джерелом-рисою. */
export function buildFeatPersSpellRows(persId: number, spells: readonly GrantedSpell[], learnedAtLevel: number) {
  return spells.map((spell) => ({
    persId,
    spellId: spell.spellId,
    learnedAtLevel,
    origin: SpellOrigin.FEAT,
    sourceName: spell.sourceKey,
    isPrepared: true,
    badgeText: spell.sourceName.slice(0, 24),
    badgeColor: FEAT_SPELL_BADGE_COLOR,
    excludeFromPreparedCount: true,
    excludeFromKnownCount: true,
  }));
}
