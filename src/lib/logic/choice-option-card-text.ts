import { stripToPlainText } from "@/lib/logic/plain-text";

/// Підпис картки вибору. Пастка тут у тому, що `ChoiceOption.optionName` — це **UI-підпис**
/// («+ХАР до шкоди кожного променя»), а не назва сутності: назва лежить у звʼязаній фічі
/// ([Р13](../../../docs/DECISIONS.md#р13)). Виклики через це показувалися описом двічі поспіль,
/// а назви «Мучливий вибух [Agonizing Blast]» не було на екрані взагалі.
///
/// Але брати назву з фічі завжди не можна: у групі «Дракон-предок» усі десять опцій вішають
/// **одну** фічу, тож заголовком стало б те саме слово на всіх картках. Тому назва з фічі йде в
/// заголовок лише тоді, коли вона в групі одна на опцію.

type FeatureLike = {
  name?: string | null;
  engName?: string | null;
  shortDescription?: string | null;
  description?: string | null;
};

export type ChoiceOptionLike = {
  optionName?: string | null;
  features?: ReadonlyArray<{ feature?: FeatureLike | null } | null> | null;
};

/// Дизамбігуатор редакції в `Feature.engName` («Agonizing Blast (2024)») — службовий суфікс
/// ключа, який гравцеві не показують (KR18.8).
const EDITION_SUFFIX = / \(2024\)$/;

/// Ключ фічі 2024 називає ще й власника — «Fighting Style: Blind Fighting», «Class Choice
/// Feature: Divine Order: Protector». Гравцеві потрібна книжкова назва, а групу вже названо
/// над картками, тож службові ланки в дужки не йдуть.
const KEY_OWNER_PREFIX = /^.*:\s*/;

export function findChoiceOptionCardText(option: ChoiceOptionLike, groupOptions: ReadonlyArray<ChoiceOptionLike>) {
  const title = findTitle(option, groupOptions);
  const { preview, previewMarkup } = findPreview(option, title);
  return { title, preview, previewMarkup };
}

function findTitle(option: ChoiceOptionLike, groupOptions: ReadonlyArray<ChoiceOptionLike>) {
  const uiLabel = (option.optionName ?? "").trim();
  const name = findSoleFeatureName(option);
  if (!name || isNameSharedInGroup(name, groupOptions)) return uiLabel;
  return addEnglishMarker(name, findSoleFeatureEngName(option));
}

function findPreview(option: ChoiceOptionLike, title: string) {
  const alreadyShown = new Set([title, findSoleFeatureName(option) ?? ""]);
  const candidates = listFeatures(option)
    .flatMap((feature) => [feature.shortDescription, feature.description])
    .concat(option.optionName ?? "")
    .map((markup) => ({ preview: stripToPlainText(markup ?? ""), previewMarkup: markup ?? "" }))
    .filter((candidate) => candidate.preview);
  return candidates.find((candidate) => !alreadyShown.has(candidate.preview)) ?? { preview: "", previewMarkup: "" };
}

function listFeatures(option: ChoiceOptionLike): FeatureLike[] {
  return (option.features ?? []).map((link) => link?.feature).filter(Boolean) as FeatureLike[];
}

function findSoleFeatureName(option: ChoiceOptionLike) {
  const names = listFeatures(option)
    .map((feature) => (feature.name ?? "").trim())
    .filter(Boolean);
  return names.length === 1 ? names[0] : null;
}

function findSoleFeatureEngName(option: ChoiceOptionLike) {
  const features = listFeatures(option).filter((feature) => (feature.name ?? "").trim());
  return features.length === 1 ? (features[0].engName ?? "").trim() : "";
}

function isNameSharedInGroup(name: string, groupOptions: ReadonlyArray<ChoiceOptionLike>) {
  return groupOptions.filter((sibling) => findSoleFeatureName(sibling) === name).length > 1;
}

function addEnglishMarker(name: string, engName: string) {
  const original = engName.replace(EDITION_SUFFIX, "").replace(KEY_OWNER_PREFIX, "").trim();
  if (!original || name.includes("[")) return name;
  return `${name} [${original}]`;
}
