import type { RollModifier, StateEffects, StatePart } from "./state-effects";

export type FeatureStateContext = {
  activeFeatureEngNames: readonly string[];
  ownedFeatureEngNames: readonly string[];
  barbarianLevel: number;
  intelligenceModifier: number;
};

type FeatureState = {
  engNames: readonly string[];
  requiresActive?: readonly string[];
  endsConcentration?: boolean;
  findEffects: (context: FeatureStateContext, sourceKey: string) => Partial<StateEffects>;
};

const RAGE_ENG_NAMES = ["Rage", "Barbarian: Rage (2024)"] as const;
const PRIMAL_KNOWLEDGE_2024 = "Barbarian: Primal Knowledge (2024)";
const PRIMAL_KNOWLEDGE_SKILLS = ["ACROBATICS", "INTIMIDATION", "PERCEPTION", "STEALTH", "SURVIVAL"] as const;
const FRENZY_2024 = "Path of the Berserker: Frenzy (2024)";

const advantage = (scope: RollModifier["scope"], sourceKey: string): RollModifier => ({ mode: "ADVANTAGE", scope, sourceKey });

const RAGE: FeatureState = {
  engNames: RAGE_ENG_NAMES,
  endsConcentration: true,
  findEffects: (context, sourceKey) => {
    const rageDamage = findRageDamageBonus(context.barbarianLevel);
    const owns = (engName: string) => context.ownedFeatureEngNames.includes(engName);
    return {
      damageResistances: ["BLUDGEONING", "PIERCING", "SLASHING"],
      strengthAttackDamageBonus: rageDamage,
      rollModifiers: [advantage("STR_CHECK", sourceKey), advantage("STR_SAVE", sourceKey)],
      marks: [
        { kind: "NO_SPELLCASTING" },
        ...(owns(FRENZY_2024) ? [{ kind: "FRENZY_DAMAGE" as const, dice: rageDamage }] : []),
      ],
      skillAbilityOptions: owns(PRIMAL_KNOWLEDGE_2024)
        ? Object.fromEntries(PRIMAL_KNOWLEDGE_SKILLS.map((skill) => [skill, "STR" as const]))
        : {},
    };
  },
};

/// Шаленство 2014 — вибір «коли ви впадаєте в лють», тож без Люті воно нічого не дає.
const FRENZY_2014: FeatureState = {
  engNames: ["Frenzy"],
  requiresActive: RAGE_ENG_NAMES,
  findEffects: () => ({ marks: [{ kind: "FRENZY_ATTACK" }, { kind: "FRENZY_EXHAUSTION" }] }),
};

const LARGE_FORM: FeatureState = {
  engNames: ["Goliath: Large Form (2024)"],
  findEffects: (_context, sourceKey) => ({
    size: "LARGE",
    speedBonus: 10,
    rollModifiers: [advantage("STR_CHECK", sourceKey)],
  }),
};

const GIANTS_MIGHT: FeatureState = {
  engNames: ["Giant's Might"],
  findEffects: (context, sourceKey) => ({
    size: context.ownedFeatureEngNames.includes("Runic Juggernaut") ? "LARGE_OR_HUGE" : "LARGE",
    rollModifiers: [advantage("STR_CHECK", sourceKey), advantage("STR_SAVE", sourceKey)],
    marks: [{ kind: "GIANTS_MIGHT_DAMAGE", die: findGiantsMightDie(context.ownedFeatureEngNames) }],
  }),
};

const BLADESONG_2014: FeatureState = {
  engNames: ["Bladesong"],
  findEffects: (context, sourceKey) => {
    const bonus = Math.max(1, context.intelligenceModifier);
    return {
      armorClassBonus: bonus,
      speedBonus: 10,
      concentrationSaveBonus: bonus,
      rollModifiers: [advantage("ACROBATICS_CHECK", sourceKey)],
      marks: [{ kind: "BLADESONG_ARMOR_LIMIT", allowsLightArmor: true }],
    };
  },
};

/// 2024 дає «щонайменше +1» лише КЗ; бонус до Концентрації — чистий модифікатор Інтелекту.
const BLADESONG_2024: FeatureState = {
  engNames: ["Bladesinger: Bladesong (2024)"],
  findEffects: (context, sourceKey) => ({
    armorClassBonus: Math.max(1, context.intelligenceModifier),
    speedBonus: 10,
    weaponAbilityOption: "INT",
    concentrationSaveBonus: Math.max(0, context.intelligenceModifier),
    rollModifiers: [advantage("ACROBATICS_CHECK", sourceKey)],
    marks: [{ kind: "BLADESONG_ARMOR_LIMIT", allowsLightArmor: false }],
  }),
};

const FEATURE_STATES: readonly FeatureState[] = [RAGE, FRENZY_2014, LARGE_FORM, GIANTS_MIGHT, BLADESONG_2014, BLADESONG_2024];

export function isToggleableFeature(engName: string | null | undefined): boolean {
  return Boolean(findState(engName));
}

/// Стан, що живе лише всередині іншого (Шаленство в Люті), без нього не вмикається.
export function canActivateFeatureState(engName: string, activeFeatureEngNames: readonly string[]): boolean {
  const required = findState(engName)?.requiresActive;
  return !required || required.some((name) => activeFeatureEngNames.includes(name));
}

/// Разом із Люттю закінчується й Шаленство.
export function listStatesEndingWith(engName: string): string[] {
  return FEATURE_STATES.filter((state) => state.requiresActive?.includes(engName)).flatMap((state) => [...state.engNames]);
}

/// Лють забороняє заклинання й концентрацію — увімкнення її зриває.
export function doesFeatureStateEndConcentration(engName: string): boolean {
  return Boolean(findState(engName)?.endsConcentration);
}

export function collectFeatureStateParts(context: FeatureStateContext): StatePart[] {
  const isOn = (engName: string) =>
    context.activeFeatureEngNames.includes(engName) && context.ownedFeatureEngNames.includes(engName);

  return FEATURE_STATES.flatMap((state) => {
    const sourceKey = state.engNames.find(isOn);
    const isAvailable = !state.requiresActive || state.requiresActive.some(isOn);
    return sourceKey && isAvailable ? [{ sourceKey, part: state.findEffects(context, sourceKey) }] : [];
  });
}

/// 2014 і 2024 мають ту саму колонку Rage Damage: +2 до 8-го рівня варвара, +3 до 15-го, далі +4.
export function findRageDamageBonus(barbarianLevel: number): number {
  if (barbarianLevel >= 16) return 4;
  if (barbarianLevel >= 9) return 3;
  return 2;
}

/// Велика статура (10-й рівень) і Рунічний джагернаут (18-й) самі кажуть, до якого кубика росте шкода.
function findGiantsMightDie(ownedFeatureEngNames: readonly string[]): "d6" | "d8" | "d10" {
  if (ownedFeatureEngNames.includes("Runic Juggernaut")) return "d10";
  if (ownedFeatureEngNames.includes("Great Stature")) return "d8";
  return "d6";
}

function findState(engName: string | null | undefined): FeatureState | undefined {
  if (!engName) return undefined;
  return FEATURE_STATES.find((state) => state.engNames.includes(engName));
}
