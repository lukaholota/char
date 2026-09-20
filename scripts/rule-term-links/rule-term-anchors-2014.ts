import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import type { BackgroundCategory, Feats, PrismaClient } from "@prisma/client";
import { readFeatSeedInputs } from "../../prisma/seed/featSeed";
import { stripSpellAnchors } from "../../src/lib/spell-link";
import { stripRuleTermAnchors } from "../../src/lib/term-link";
import { RULE_TERM_CARRIERS } from "./rule-term-mentions";
import { collectProseParts, readProseText } from "./typescript-prose";

/// Якорі на стани, дії (KR34.4) і заклинання (KR25.5) в базу 2014. Повні сідери 2014 у робочу базу
/// не ганяються — вони переписують привʼязки й відкочують ручні правки тексту (див.
/// `sweptTermText2014.ts`). Тому тут пишуться лише `description` і `shortDescription` і лише тоді,
/// коли без якорів текст у базі й у сіді однаковий до символу: формулювання цей прохід не міняє
/// ніколи. Опис, що розійшовся із сідом, пропускається й називається у звіті.
///
/// Заклинань 2014 тут немає: у них свій файл і свій сід (`seed:spells-2014`, KR34.5).

const RULESET = "RULES_2014" as const;

const FEAT_SEED_PATH = "prisma/seed/featSeed.ts";
const BACKGROUND_SEED_PATH = "prisma/seed/backgroundSeed.ts";
const RACE_CHOICE_SEED_PATH = "prisma/seed/raceChoiceOptionSeed.ts";
const NOT_FEATURE_SEED_PATHS = new Set([FEAT_SEED_PATH, BACKGROUND_SEED_PATH, RACE_CHOICE_SEED_PATH]);

const FEATURE_SEED_PATHS = RULE_TERM_CARRIERS.filter(
  (carrier) => carrier.edition === RULESET && carrier.format === "ts" && !NOT_FEATURE_SEED_PATHS.has(carrier.path)
).map((carrier) => carrier.path);

export type AnchoredField = "description" | "shortDescription";

export type AnchorChange =
  | { entity: "feature"; key: string; field: AnchoredField; text: string }
  | { entity: "feat"; key: Feats; field: "description"; text: string }
  | { entity: "background"; key: BackgroundCategory; field: "description"; text: string }
  | { entity: "raceChoiceOption"; key: string; field: "description"; text: string };

export const ANCHORED_ENTITIES = ["feature", "feat", "background", "raceChoiceOption"] as const;

export type AnchorDrift = {
  changes: AnchorChange[];
  textMismatches: Array<{ entity: AnchorChange["entity"]; key: string; field: AnchoredField }>;
};

type SeedFeatureTexts = Partial<Record<AnchoredField, string>>;

const FEATURE_FIELDS: AnchoredField[] = ["description", "shortDescription"];

export async function findContentAnchorDrift(prisma: PrismaClient, root = process.cwd()): Promise<AnchorDrift> {
  const features = await findFeatureDrift(prisma, readSeedFeatureTexts(root));
  const feats = await findFeatDrift(prisma);
  const backgrounds = await findBackgroundDrift(prisma, readSeedBackgroundTexts(root));
  const raceChoices = await findRaceChoiceDrift(prisma, readSeedRaceChoiceTexts(root));
  const drifts = [features, feats, backgrounds, raceChoices];

  return {
    changes: drifts.flatMap((drift) => drift.changes),
    textMismatches: drifts.flatMap((drift) => drift.textMismatches),
  };
}

export async function writeContentAnchors(prisma: PrismaClient, changes: AnchorChange[]): Promise<void> {
  for (const change of changes) {
    if (change.entity === "feature") {
      await prisma.feature.update({ where: { engName: change.key }, data: { [change.field]: change.text } });
    } else if (change.entity === "feat") {
      await prisma.feat.update({ where: { name_ruleset: { name: change.key, ruleset: RULESET } }, data: { description: change.text } });
    } else if (change.entity === "background") {
      await prisma.background.update({ where: { name_ruleset: { name: change.key, ruleset: RULESET } }, data: { description: change.text } });
    } else {
      await prisma.raceChoiceOption.update({ where: { optionId: Number(change.key) }, data: { description: change.text } });
    }
  }
}

/// Сіди фіч 2014 тримають масиви всередині функцій сідування — читаються вони з тексту файлу:
/// обʼєкт із рядковим `engName` і рядковими описами.
export function readSeedFeatureTexts(root = process.cwd()): Map<string, SeedFeatureTexts> {
  const texts = new Map<string, SeedFeatureTexts>();
  for (const path of FEATURE_SEED_PATHS) {
    visitSeedObjects(root, path, (node, file) => {
      const engName = readStringProperty(node, "engName", file);
      const found = readFeatureTexts(node, file);
      if (engName !== null && Object.keys(found).length > 0) texts.set(engName, found);
    });
  }
  return texts;
}

/// Передісторія в сіді названа членом enum: `name: BackgroundCategory.WILDSPACER`.
export function readSeedBackgroundTexts(root = process.cwd()): Map<BackgroundCategory, string> {
  const texts = new Map<BackgroundCategory, string>();
  visitSeedObjects(root, BACKGROUND_SEED_PATH, (node, file) => {
    const name = readEnumMemberProperty(node, "name", "BackgroundCategory");
    const description = readStringProperty(node, "description", file);
    if (name !== null && description !== null) texts.set(name as BackgroundCategory, description);
  });
  return texts;
}

/// Варіант раси не має англійської назви в сіді — ключ `група|варіант`, як у базі.
export function readSeedRaceChoiceTexts(root = process.cwd()): Map<string, string> {
  const texts = new Map<string, string>();
  visitSeedObjects(root, RACE_CHOICE_SEED_PATH, (node, file) => {
    const group = readStringProperty(node, "choiceGroupName", file);
    const option = readStringProperty(node, "optionName", file);
    const description = readStringProperty(node, "description", file);
    if (group !== null && option !== null && description !== null) texts.set(buildRaceChoiceKey(group, option), description);
  });
  return texts;
}

function buildRaceChoiceKey(group: string, option: string): string {
  return `${group}|${option}`;
}

function visitSeedObjects(root: string, path: string, read: (node: ts.ObjectLiteralExpression, file: ts.SourceFile) => void): void {
  const file = ts.createSourceFile(path, readFileSync(join(root, path), "utf-8"), ts.ScriptTarget.Latest, true);
  const visit = (node: ts.Node) => {
    if (ts.isObjectLiteralExpression(node)) read(node, file);
    ts.forEachChild(node, visit);
  };
  visit(file);
}

function readFeatureTexts(node: ts.ObjectLiteralExpression, file: ts.SourceFile): SeedFeatureTexts {
  const found: SeedFeatureTexts = {};
  for (const field of FEATURE_FIELDS) {
    const text = readStringProperty(node, field, file);
    if (text !== null) found[field] = text;
  }
  return found;
}

function readStringProperty(node: ts.ObjectLiteralExpression, name: string, file: ts.SourceFile): string | null {
  const property = findProperty(node, name);
  const parts = property ? collectProseParts(property.initializer, file) : null;
  return parts ? readProseText(parts) : null;
}

function readEnumMemberProperty(node: ts.ObjectLiteralExpression, name: string, enumName: string): string | null {
  const value = findProperty(node, name)?.initializer;
  return value && ts.isPropertyAccessExpression(value) && value.expression.getText() === enumName ? value.name.text : null;
}

function findProperty(node: ts.ObjectLiteralExpression, name: string): ts.PropertyAssignment | undefined {
  return node.properties.find((property): property is ts.PropertyAssignment => ts.isPropertyAssignment(property) && property.name.getText() === name);
}

async function findFeatureDrift(prisma: PrismaClient, seeded: Map<string, SeedFeatureTexts>) {
  const anchoredKeys = [...seeded].filter(([, texts]) => FEATURE_FIELDS.some((field) => hasAnchors(texts[field]))).map(([engName]) => engName);
  const stored = await prisma.feature.findMany({
    where: { engName: { in: anchoredKeys } },
    select: { engName: true, description: true, shortDescription: true },
  });
  const changes: AnchorChange[] = [];
  const textMismatches: AnchorDrift["textMismatches"] = [];

  for (const field of FEATURE_FIELDS) {
    const withAnchors = anchoredKeys
      .map((engName): [string, string | undefined] => [engName, seeded.get(engName)?.[field]])
      .filter((entry): entry is [string, string] => hasAnchors(entry[1]));
    const storedByEngName = new Map(stored.flatMap((row) => (row[field] === null ? [] : [[row.engName, row[field]] as [string, string]])));
    const split = splitAnchorOnlyChanges(withAnchors, storedByEngName);
    changes.push(...split.changed.map(([key, text]): AnchorChange => ({ entity: "feature", key, field, text })));
    textMismatches.push(...split.textMismatches.map((key) => ({ entity: "feature" as const, key, field })));
  }
  return { changes, textMismatches };
}

async function findFeatDrift(prisma: PrismaClient) {
  const withAnchors = readFeatSeedInputs()
    .map((input): [Feats, string] => [input.name, input.description])
    .filter(([, description]) => hasAnchors(description));
  const stored = await prisma.feat.findMany({
    where: { ruleset: RULESET, name: { in: withAnchors.map(([name]) => name) } },
    select: { name: true, description: true },
  });
  const storedByName = new Map(stored.map((row) => [row.name, row.description]));
  const { changed, textMismatches } = splitAnchorOnlyChanges(withAnchors, storedByName);
  return {
    changes: changed.map(([key, text]): AnchorChange => ({ entity: "feat", key, field: "description", text })),
    textMismatches: textMismatches.map((key) => ({ entity: "feat" as const, key, field: "description" as const })),
  };
}

async function findBackgroundDrift(prisma: PrismaClient, seeded: Map<BackgroundCategory, string>) {
  const withAnchors = [...seeded].filter(([, description]) => hasAnchors(description));
  const stored = await prisma.background.findMany({
    where: { ruleset: RULESET, name: { in: withAnchors.map(([name]) => name) } },
    select: { name: true, description: true },
  });
  const storedByName = new Map(stored.flatMap((row) => (row.description === null ? [] : [[row.name, row.description] as [BackgroundCategory, string]])));
  const { changed, textMismatches } = splitAnchorOnlyChanges(withAnchors, storedByName);
  return {
    changes: changed.map(([key, text]): AnchorChange => ({ entity: "background", key, field: "description", text })),
    textMismatches: textMismatches.map((key) => ({ entity: "background" as const, key, field: "description" as const })),
  };
}

/// Один варіант може стояти в кількох расах — кожен рядок бази звіряється окремо, ключ — `optionId`.
async function findRaceChoiceDrift(prisma: PrismaClient, seeded: Map<string, string>) {
  const withAnchors = new Map([...seeded].filter(([, description]) => hasAnchors(description)));
  const stored = await prisma.raceChoiceOption.findMany({
    where: { ruleset: RULESET, optionName: { in: [...withAnchors.keys()].map((key) => key.split("|")[1]) } },
    select: { optionId: true, choiceGroupName: true, optionName: true, description: true },
  });
  const rows = stored.filter((row) => row.description !== null && withAnchors.has(buildRaceChoiceKey(row.choiceGroupName, row.optionName)));
  const seededByRow = rows.map((row): [string, string] => [String(row.optionId), withAnchors.get(buildRaceChoiceKey(row.choiceGroupName, row.optionName))!]);
  const storedByRow = new Map(rows.map((row): [string, string] => [String(row.optionId), row.description!]));
  const { changed, textMismatches } = splitAnchorOnlyChanges(seededByRow, storedByRow);
  return {
    changes: changed.map(([key, text]): AnchorChange => ({ entity: "raceChoiceOption", key, field: "description", text })),
    textMismatches: textMismatches.map((key) => ({ entity: "raceChoiceOption" as const, key, field: "description" as const })),
  };
}

/// Опис із сіду переноситься, лише коли без якорів він дорівнює опису в базі: тоді різниця —
/// самі посилання. Будь-яка інша різниця — чужа правка тексту, і її цей прохід не чіпає.
export function splitAnchorOnlyChanges<Key extends string>(
  seeded: Array<[Key, string]>,
  stored: Map<Key, string>
): { changed: Array<[Key, string]>; textMismatches: Key[] } {
  const changed: Array<[Key, string]> = [];
  const textMismatches: Key[] = [];

  for (const [key, description] of seeded) {
    const current = stored.get(key);
    if (current === undefined || current === description) continue;
    if (stripContentAnchors(current) === stripContentAnchors(description)) changed.push([key, description]);
    else textMismatches.push(key);
  }
  return { changed, textMismatches };
}

function hasAnchors(text: string | undefined): boolean {
  return text !== undefined && stripContentAnchors(text) !== text;
}

function stripContentAnchors(text: string): string {
  return stripSpellAnchors(stripRuleTermAnchors(text));
}
