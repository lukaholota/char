import type { PersWithRelations } from "@/lib/actions/pers";

type ItemDraft = {
  magicItemId?: number;
  name?: string;
  engName?: string;
  ruleset?: string;
  itemType?: string;
  requiresAttunement?: boolean;
  bonusToAC?: number | null;
  noArmorOrShieldForACBonus?: boolean;
  bonusToSavingThrows?: unknown;
  isEquipped?: boolean;
  isAttuned?: boolean;
  description?: string;
  persWeaponId?: number | null;
  isMundane?: boolean;
  weaponProfile?: unknown;
};

export function buildPersWithItems(items: ItemDraft[], overrides: Record<string, unknown> = {}): PersWithRelations {
  return {
    persId: 1,
    level: 5,
    ruleset: "RULES_2014",
    str: 10, dex: 14, con: 12, int: 10, wis: 10, cha: 10,
    maxHp: 30,
    additionalSaveProficiencies: [],
    raceStaticAcBonus: 0,
    overrideBaseAC: null,
    wearsShield: false,
    additionalShieldBonus: 0,
    armors: [],
    skills: [],
    features: [],
    race: { speed: 30, traits: [] },
    subrace: null,
    raceVariants: [],
    raceChoiceOptions: [],
    class: { name: "WIZARD_2014", features: [] },
    subclass: null,
    multiclasses: [],
    classOptionalFeatures: [],
    choiceOptions: [],
    feats: [],
    magicItems: items.map(({ magicItemId = 0, isEquipped = true, isAttuned = true, persWeaponId = null, ...magicItem }, index) => ({
      persMagicItemId: 100 + index,
      magicItemId,
      isEquipped,
      isAttuned,
      persWeaponId,
      magicItem: { name: magicItem.engName ?? "Предмет", ruleset: "RULES_2014", requiresAttunement: true, ...magicItem },
    })),
    ...overrides,
  } as unknown as PersWithRelations;
}
