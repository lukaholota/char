import { Classes, SpellcastingType } from "@prisma/client";

export type SpellcastingClassLevel = {
  classLevel: number;
  class?: {
    name?: Classes | string | null;
    spellcastingType?: SpellcastingType | null;
  } | null;
  subclass?: {
    spellcastingType?: SpellcastingType | null;
  } | null;
};

export type SpellcastingPersLike = {
  level: number;
  class?: { name?: Classes | string | null; spellcastingType?: SpellcastingType | null } | null;
  subclass?: { spellcastingType?: SpellcastingType | null } | null;
  multiclasses?: Array<{
    classLevel: number;
    class?: { name?: Classes | string | null; spellcastingType?: SpellcastingType | null } | null;
    subclass?: { spellcastingType?: SpellcastingType | null } | null;
  }>;
};

export type CasterLevelResult = {
  casterLevel: number; // for standard multiclass spell slots (FULL table)
  pactLevel: number; // total warlock levels (for PACT)
};

function toInt(value: unknown, fallback: number) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isArtificer(className: unknown) {
  return typeof className === "string" && className.startsWith("ARTIFICER");
}

function effectiveSpellcastingType(entry: SpellcastingClassLevel): SpellcastingType {
  const clsType = entry.class?.spellcastingType ?? SpellcastingType.NONE;
  if (clsType && clsType !== SpellcastingType.NONE) return clsType;

  const subType = entry.subclass?.spellcastingType ?? SpellcastingType.NONE;
  if (subType && subType !== SpellcastingType.NONE) return subType;

  return SpellcastingType.NONE;
}

/**
 * DnD 5e multiclass caster level calculation.
 * - Full: +level
 * - Half: +floor(level/2)
 * - Third: +floor(level/3)
 * - Artificer: +ceil(level/2)
 * - Pact: tracked separately as pactLevel (does not add to casterLevel)
 */
export function calculateCasterLevel(pers: SpellcastingPersLike): CasterLevelResult {
  const multiclasses = Array.isArray(pers.multiclasses) ? pers.multiclasses : [];

  const multiclassLevels = multiclasses.reduce((acc, m) => acc + toInt(m?.classLevel, 0), 0);
  const mainLevel = clamp(toInt(pers.level, 1) - multiclassLevels, 1, 20);

  const entries: SpellcastingClassLevel[] = [
    {
      classLevel: mainLevel,
      class: pers.class ?? null,
      subclass: pers.subclass ?? null,
    },
    ...multiclasses.map((m) => ({
      classLevel: clamp(toInt(m?.classLevel, 1), 1, 20),
      class: m.class ?? null,
      subclass: m.subclass ?? null,
    })),
  ];

  let casterLevel = 0;
  let pactLevel = 0;

  for (const entry of entries) {
    const level = clamp(toInt(entry.classLevel, 1), 1, 20);
    const type = effectiveSpellcastingType(entry);
    const className = entry.class?.name ?? null;

    if (type === SpellcastingType.PACT) {
      pactLevel += level;
      continue;
    }

    if (isArtificer(className)) {
      casterLevel += Math.ceil(level / 2);
      continue;
    }

    switch (type) {
      case SpellcastingType.FULL:
        casterLevel += level;
        break;
      case SpellcastingType.HALF:
        casterLevel += Math.floor(level / 2);
        break;
      case SpellcastingType.THIRD:
        casterLevel += Math.floor(level / 3);
        break;
      default:
        break;
    }
  }

  return {
    casterLevel: clamp(casterLevel, 0, 20),
    pactLevel: clamp(pactLevel, 0, 20),
  };
}
