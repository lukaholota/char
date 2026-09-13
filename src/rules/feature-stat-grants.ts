/**
 * KR31.4 — числа, які фіча додає персонажу напряму.
 *
 * До цієї цілі швидкість, ініціатива й плоскі хіти могли змінитися лише ручним бонусом у
 * `pers.*Bonuses`, тому риса «Швидкий» чи «Пильність» лишалася самим текстом. Тепер їх несе
 * `Feature`, і збирає їх той самий `collectActiveFeatures`, що вже дає КЗ і шкоду.
 */

export type StatGrantingFeature = {
  speedBonus?: number | null;
  initiativeProficiency?: boolean | null;
  bonusHitPoints?: number | null;
};

export function sumFeatureSpeedBonus(features: readonly StatGrantingFeature[]): number {
  return sumFiniteNumbers(features.map((feature) => feature.speedBonus));
}

export function sumFeatureFlatHitPoints(features: readonly StatGrantingFeature[]): number {
  return sumFiniteNumbers(features.map((feature) => feature.bonusHitPoints));
}

/**
 * «You can add your Proficiency Bonus to the roll» — бонус, а не подвоєння, тож дві такі фічі
 * додають його один раз.
 */
export function findInitiativeProficiencyBonus(
  features: readonly StatGrantingFeature[],
  proficiencyBonus: number,
): number {
  const hasProficiency = features.some((feature) => feature.initiativeProficiency === true);
  return hasProficiency && Number.isFinite(proficiencyBonus) ? proficiencyBonus : 0;
}

function sumFiniteNumbers(values: readonly (number | null | undefined)[]): number {
  return values.reduce<number>(
    (total, value) => (typeof value === "number" && Number.isFinite(value) ? total + value : total),
    0,
  );
}
