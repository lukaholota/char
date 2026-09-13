/**
 * KR31.3 — числа використань і тип дії рис персонажа 2024, виведені з джерела.
 *
 * Носій тут інший, ніж у класів, підкласів і видів. Риса — рядок `feat`, а колонок використань
 * у ній немає й не буде: лічильник живе на `feature`, яку риса дає через `Feat.grantsFeature`.
 * Тим самим шляхом уже їдуть бойові стилі й числові надання KR31.4
 * (`Alert: Initiative Proficiency (2024)`), тож нового каналу тут не заводиться, а назва носія
 * тримає ту саму форму: `<Риса>: <Перевага> (2024)`.
 *
 * Через це витяг читає **переваги поодинці**, а не тіло риси цілком: носій зветься за перевагою,
 * що несе лічильник, і його український текст береться з тієї ж переваги у файлі.
 *
 * Форми речень спільні з рештою й лежать у `feature-uses-from-text.ts`. Тут — те, чого інші носії
 * не мають: безкоштовне застосування кількох названих заклинань.
 */

import {
  findDisplayTypes,
  findRecoveryRest,
  findUsesInText,
  type DisplayTypeName,
  type FeatureUses2024,
  type UsesCounts,
} from "./feature-uses-from-text";
import type { BoldHeadingBlock } from "./parse-class-features";
import type { FeatSource } from "./parse-feats";

export type FeatMechanics2024 = {
  featEngName: string;
  benefitName: string;
  displayType: DisplayTypeName[];
  uses: FeatureUses2024;
};

/**
 * Риси, яким книга дає число, а прохід його свідомо не записує, і чому. Перелік вичерпний:
 * риса, що дістала лічильник і не стоїть тут, приходить у файл — гейт червоніє на обох
 * напрямках.
 */
export const FEATS_WITHOUT_A_COUNTER: Record<string, string> = {
  "Magic Initiate|Level 1 Spell":
    "лічильник уже стоїть на трьох фічах списків «Magic Initiate: X list (2024)» ([Р38], KR27.5) — другий носій показав би те саме двічі",
};

/**
 * Рівень тут завжди перший: риса діє з моменту, коли її взяли, і власного рівня видачі не має.
 * Число потрібне лише формам зростання за рівнем, яких у рисах немає.
 */
const FEAT_LEVEL = 1;

export function extractFeatMechanics2024(feats: FeatSource[]): FeatMechanics2024[] {
  return feats.flatMap((feat) => {
    const counted = feat.benefits.flatMap((benefit) => collectBenefitMechanics(feat.engName, benefit));
    guardAgainstCounterOutsideBenefits(feat, counted.length);

    return counted.filter(({ benefitName }) => !(`${feat.engName}|${benefitName}` in FEATS_WITHOUT_A_COUNTER));
  });
}

function collectBenefitMechanics(featEngName: string, benefit: BoldHeadingBlock): FeatMechanics2024[] {
  const counts = findFreeCastsOfNamedSpells(benefit.descriptionEng) ?? findUsesInText(benefit.name, FEAT_LEVEL, benefit.descriptionEng);
  if (!counts) return [];

  const limitedUsesPer = findRecoveryRest(benefit.descriptionEng);
  if (!limitedUsesPer) {
    throw new Error(`${featEngName}: «${benefit.name}» — число використань є, а відпочинку, що їх повертає, немає.`);
  }

  return [
    {
      featEngName,
      benefitName: benefit.name,
      displayType: findDisplayTypes(benefit.descriptionEng, true),
      uses: { limitedUsesPer, ...counts },
    },
  ];
}

/**
 * «You always have that spell and the Misty Step spell prepared. You can cast each of these
 * spells without expending a spell slot» — Фейський дотик і Дотик тіні: два заклинання, кожне
 * раз на довгий відпочинок.
 *
 * Рішення власника 2026-09-08: носій показує **скільки безкоштовних застосувань є насправді**,
 * а не одне. Лист — трекер, а не рушій ([Р26](../../docs/DECISIONS.md#р26)): він не стежить,
 * котре саме із двох заклинань витрачено, зате не бреше про стелю.
 *
 * Число береться з тексту, а не з памʼяті: обране заклинання плюс кожне назване поіменно.
 */
const TWO_NAMED_SPELLS = /You always have that spell and the [\w' ]+ spell prepared/;

function findFreeCastsOfNamedSpells(body: string): UsesCounts | null {
  return TWO_NAMED_SPELLS.test(body) ? { usesCount: 2 } : null;
}

/**
 * Форма книги, що трапилася поза названою перевагою, лишилася б непоміченою: носія в такої риси
 * немає — зватися нема за чим. Це не гіпотеза, а межа моделі, тож вона зупиняє витяг.
 */
function guardAgainstCounterOutsideBenefits(feat: FeatSource, foundInBenefits: number) {
  if (foundInBenefits > 0) return;
  if (!findUsesInText(feat.engName, FEAT_LEVEL, feat.descriptionEng)) return;

  throw new Error(
    `${feat.engName}: число використань стоїть поза названою перевагою — носієві нема за чим зватися.`,
  );
}
