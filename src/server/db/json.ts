import { z } from "zod";
import { Ability, WeaponCategory, WeaponType } from "@prisma/client";
import type { WeaponProficiencies, WeaponProficienciesSpecial } from "@/lib/types/model-types";
import type { MulticlassAbilityRequirement } from "@/rules/multiclass-entry";

const stringArraySchema = z.array(z.string());
const numberArraySchema = z.array(z.number());
const recordSchema = z.record(z.string(), z.unknown());

export type JsonRecord = Record<string, unknown>;

export function parseJsonRecord(value: unknown): JsonRecord | null {
  const parsed = recordSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function parseStringArray(value: unknown): string[] {
  const parsed = stringArraySchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}

export function parseEnumArray<T extends Record<string, string>>(
  value: unknown,
  enumValues: T,
): Array<T[keyof T]> {
  const parsed = z.array(z.nativeEnum(enumValues)).safeParse(value);
  return parsed.success ? parsed.data : [];
}

export function parseNumberArray(value: unknown): number[] {
  const parsed = numberArraySchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}

export function parseOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function parseOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function parseOptionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

export function readJsonField(value: unknown, field: string): unknown {
  return parseJsonRecord(value)?.[field];
}

export function parseWeaponProficiencies(
  value: unknown,
): WeaponProficiencies | WeaponCategory[] | WeaponType[] | null {
  const categories = parseEnumArray(value, WeaponCategory);
  if (categories.length) return categories;
  const types = parseEnumArray(value, WeaponType);
  if (types.length) return types;
  const record = parseJsonRecord(value);
  if (!record) return null;
  const category = parseEnumArray(record.category, WeaponCategory);
  const type = parseEnumArray(record.type, WeaponType);
  return category.length || type.length ? { category, type } : null;
}

export function parseWeaponProficienciesSpecial(value: unknown): WeaponProficienciesSpecial | null {
  const specific = parseEnumArray(parseJsonRecord(value)?.specific, WeaponCategory);
  return specific.length ? { specific } : null;
}

export function parseMulticlassReqs(value: unknown): MulticlassAbilityRequirement | null {
  const record = parseJsonRecord(value);
  if (!record) return null;

  return {
    score: parseOptionalNumber(record.score) ?? null,
    required: parseEnumArray(record.required, Ability),
    and: parseEnumArray(record.and, Ability),
    choice: parseEnumArray(record.choice, Ability),
  };
}
