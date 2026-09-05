/**
 * Дрібні реєстри поза SRD — з пінованого дзеркала 5etools (Р19, KR23.5).
 * `actions.json`, `conditionsdiseases.json`, `senses.json`: майже все в них уже в довіднику зі
 * SRD (дії й дії статблока, 14 станів, «Generic Object»-подібне) або в раніше імпортованому
 * поза-SRD корпусі (варіант «Action Options» DMG уже несе шість із восьми дій DMG цього файла,
 * дослівно). Реальне нове — три записи, звірені вручну заголовком і текстом проти
 * `rules-2014.json`/`rules-2024.json`/`rules-beyond-srd.json` (журнал KR23.5).
 */

import { readFileSync } from "fs";

import { findCachePath } from "./mirror";
import { renderEntries } from "./source-item";
import { BeyondSrdSource, ParsedBeyondSrdArticle } from "./variant-rules";
import { buildSummary, claimSlug, kebabCase, ParsedRuleCategoryKey } from "../srd/rules-markdown";

type RawRecord = { name: string; source: string; page?: number; entries?: unknown[] };

/// XGtE, «Identify a Spell» — не дублює нічого наявного (звірено заголовком проти всього
/// корпусу): реагувати на чуже закляття чи розпізнавати його після ефекту довідник досі не
/// описував.
const NEW_ACTIONS: { name: string; category: ParsedRuleCategoryKey }[] = [
  { name: "Identify a Spell", category: "spellcasting" },
];

/// PHB Додаток A «Diseases» — SRD 5.1 його не передруковує (`srd` не стоїть на жодному з
/// шести), і в довіднику досі немає жодної статті про конкретну хворобу. DMG/XDMG-хвороби
/// цього самого файла (Cackle Fever, Sewer Plague, Sight Rot) сюди не входять: вони позначені
/// `srd`/`srd52` і дослівно вже в SRD-корпусі обох редакцій.
const NEW_DISEASES = ["Blinding Sickness", "Filth Fever", "Flesh Rot", "Mindfire", "Seizure", "Slimy Doom"];

/// PHB, сторінка 183 — глосарій чуттів у главі «Monsters», не в главі правил: SRD 5.1 його не
/// передруковує (`srd` стоїть, але жодна стаття довідника 2014 не описує ці терміни — на
/// відміну від 2024, де SRD 5.2.1 дає їх окремими статтями глосарію). XPHB-версії тих самих
/// термінів сюди не входять — вони вже в `rules-2024.json` дослівно.
const NEW_SENSES = ["Blindsight", "Darkvision", "Truesight"];

export function parseSmallRegistries(options: { reservedSlugs?: string[] } = {}): ParsedBeyondSrdArticle[] {
  const takenSlugs = new Set(options.reservedSlugs ?? []);

  const actions = readRegistry("actions.json", "action").filter((record) =>
    NEW_ACTIONS.some((wanted) => wanted.name === record.name)
  );
  const diseases = readRegistry("conditionsdiseases.json", "disease").filter(
    (record) => record.source === "PHB" && NEW_DISEASES.includes(record.name)
  );
  const senses = readRegistry("senses.json", "sense").filter(
    (record) => record.source === "PHB" && NEW_SENSES.includes(record.name)
  );

  return [
    ...actions.map((record) =>
      buildArticle(record, NEW_ACTIONS.find((wanted) => wanted.name === record.name)!.category, takenSlugs)
    ),
    ...diseases.map((record) => buildArticle(record, "gamemaster", takenSlugs)),
    ...senses.map((record) => buildArticle(record, "adventuring", takenSlugs)),
  ];
}

function readRegistry(fileName: string, key: string): RawRecord[] {
  const raw = JSON.parse(readFileSync(findCachePath(fileName), "utf-8")) as Record<string, RawRecord[]>;
  return raw[key] ?? [];
}

function buildArticle(
  record: RawRecord,
  category: ParsedRuleCategoryKey,
  takenSlugs: Set<string>
): ParsedBeyondSrdArticle {
  const bookSource = record.source as BeyondSrdSource;
  const slug = claimSlug(kebabCase(record.name), "registry", takenSlugs);
  const content = renderEntries(record.entries ?? [], record as unknown as Record<string, unknown>, record.name);

  return {
    id: `beyond-${slug}`,
    slug,
    category,
    engTitle: record.name,
    engSummary: buildSummary(content),
    engTags: [record.name, bookSource],
    bookSource,
    page: record.page ?? 0,
    order: 0,
    subsections: [{ id: `${slug}--${slug}`, engTitle: record.name, engContent: content }],
  };
}
