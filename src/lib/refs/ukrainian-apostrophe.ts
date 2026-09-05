/// Рішення власника 2026-08-30: український апостроф — ʼ (U+02BC), «соловʼїна».
/// Зводиться лише апостроф усередині слова, між кирилицею та я/ю/є/ї: «Mordenkainen's»,
/// лапки й код лишаються як є.
export const UKRAINIAN_APOSTROPHE = "ʼ";

export const NONCANONICAL_APOSTROPHE_IN_WORD = /(?<=\p{Script=Cyrillic})['’‘`´](?=[яюєїЯЮЄЇ])/u;

export function normalizeUkrainianApostrophes(text: string): string {
  return text.replace(new RegExp(NONCANONICAL_APOSTROPHE_IN_WORD.source, "gu"), UKRAINIAN_APOSTROPHE);
}
