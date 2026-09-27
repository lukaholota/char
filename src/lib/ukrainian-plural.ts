const ukrainianPluralRules = new Intl.PluralRules("uk");

export type UkrainianWordForms = { one: string; few: string; many: string };

export function pluralizeUk(count: number, forms: UkrainianWordForms): string {
  const category = ukrainianPluralRules.select(count);
  if (category === "one") return forms.one;
  if (category === "few") return forms.few;
  return forms.many;
}

export function countWithWordUk(count: number, forms: UkrainianWordForms): string {
  return `${count} ${pluralizeUk(count, forms)}`;
}
