/**
 * Рішення по перетинах, які лишилися після зведення дублів (KR20.4).
 *
 * Звіт `duplicates-report.md` генерується, тому рішення не можна тримати в ньому: наступний
 * прогін затирає стовпчик. Ключ — `<редакція>|<слаг рукописної>|<слаг статті SRD>`.
 */

export const RULE_OVERLAP_DECISIONS: Record<string, string> = {
  "RULES_2014|rules-of-magic|what-is-a-spell":
    "лишається — оглядова стаття зводить рівні, слоти, час накладання й ритуали в один конспект",
  "RULES_2014|rules-of-magic|cantrips": "лишається — те саме зведення, замовляння тут один абзац",
  "RULES_2014|rules-of-magic|rituals": "лишається — те саме зведення, ритуали тут один абзац",
  "RULES_2014|components-and-concentration|casting-a-spell":
    "лишається — компоненти, концентрація й області дії зібрані окремо, у SRD вони підрозділи «Накладання заклинання»",
  "RULES_2014|ability-scores-and-checks|using-ability-scores":
    "лишається — таблиця модифікаторів і таблиця СЛ поруч, SRD розносить їх по пʼяти статтях",
  "RULES_2014|conditions-guide|conditions":
    "лишається — шапка сторінки станів над картками; повний текст станів дає стаття SRD «Стани»",
  "RULES_2014|travel-and-rest|the-environment":
    "лишається — зводить довкілля, переміщення й відпочинок, тобто три статті SRD",
  "RULES_2014|magic-items-rules|magic-items":
    "лишається — ідентифікація предмета є тільки тут, SRD 5.1 її не має",
  "RULES_2024|order-of-combat|the-order-of-combat":
    "лишається — єдина рукописна 2024 з callout «Зміна правил 2024», цього тексту в SRD немає",
  "RULES_2024|ability-scores-and-checks|ability-modifiers":
    "лишається — зводить перевірку к20, рятівні кидки й модифікатори, SRD 5.2.1 розкидає їх по главі й глосарію",
  "RULES_2024|ability-scores-and-checks|d20-tests": "лишається — те саме зведення",
  "RULES_2024|ability-scores-and-checks|saving-throws": "лишається — те саме зведення",
  "RULES_2024|ability-scores-and-checks|ability-score-and-modifier": "лишається — те саме зведення",
  "RULES_2024|ability-scores-and-checks|d20-test": "лишається — те саме зведення",
  "RULES_2024|ability-scores-and-checks|saving-throw": "лишається — те саме зведення",
};

export function buildOverlapKey(ruleset: string, handwrittenSlug: string, importedSlug: string): string {
  return `${ruleset}|${handwrittenSlug}|${importedSlug}`;
}

export function findOverlapDecision(ruleset: string, handwrittenSlug: string, importedSlug: string): string | null {
  return RULE_OVERLAP_DECISIONS[buildOverlapKey(ruleset, handwrittenSlug, importedSlug)] ?? null;
}
