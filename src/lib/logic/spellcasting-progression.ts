import { Ability, Classes, Subclasses } from "@/lib/prisma-enums";
import { calculateFinalModifier } from "@/lib/logic/bonus-calculator";
import { classTranslations, subclassTranslations } from "@/lib/refs/translation";
import type { PersWithRelations } from "@/lib/actions/pers";
import { SPELL_KNOWLEDGE_2014, THIRD_CASTER_KNOWLEDGE_2014 } from "@/rules/spell-knowledge-2014";
import { findSpellCounts2024 } from "@/rules/spell-preparation-2024";

export type SpellCountValue =
	| { kind: "fixed"; value: number }
	| { kind: "formula"; formula: string; value?: number };

export type SpellcastingCountsLine = {
	key: string;
	name: string;
	level: number;
	cantrips: number;
	spellsLabel: string;
	spells: SpellCountValue;
	/** Optional display note appended after the numeric spells count (UI). */
	spellsNote?: string;
};

function clampLevel(value: unknown): number {
	const n = typeof value === "number" ? value : Number(value);
	if (!Number.isFinite(n)) return 1;
	return Math.max(1, Math.min(20, Math.trunc(n)));
}

function isClass2024(className: Classes | string | null): className is string {
	return typeof className === "string" && className.endsWith("_2024");
}

// KR27.7: у 2024 підготовлені заклинання — фіксована колонка таблиці класу, тому рядок — «fixed»,
// а не формула. Мітка «можна підготувати» — та сама, що й у чарівника 2014: за нею лист рахує ліміт.
function buildLine2024(className: string, level: number, subclassName: string | null): SpellcastingCountsLine | null {
	const counts = findSpellCounts2024(className, level, subclassName);
	if (!counts) return null;

	const isThirdCaster = !hasOwnSpellcasting(className);
	const name = isThirdCaster
		? ((subclassTranslations as Partial<Record<string, string>>)[subclassName ?? ""] ?? String(subclassName))
		: ((classTranslations as Partial<Record<string, string>>)[className] ?? className);

	return {
		key: isThirdCaster ? `subclass:${subclassName}:${level}` : `class:${className}:${level}`,
		name,
		level,
		cantrips: counts.cantrips,
		spellsLabel: "Заклинань (можна підготувати)",
		spells: fixed(counts.prepared),
		...(className === "WIZARD_2024" ? { spellsNote: "+ книга заклинань" } : {}),
	};
}

function hasOwnSpellcasting(className: string): boolean {
	return findSpellCounts2024(className, 1, null) !== null;
}

function tableAtLevel(table: readonly number[], level: number): number {
	const idx = clampLevel(level) - 1;
	const v = table[idx];
	return Number.isFinite(v) ? Math.max(0, Math.trunc(v)) : 0;
}

function fixed(value: number): SpellCountValue {
	return { kind: "fixed", value: Math.max(0, Math.trunc(value)) };
}

function preparedCount({
	level,
	abilityMod,
	levelDivisor,
	minLevel,
	minPrepared,
}: {
	level: number;
	abilityMod: number;
	levelDivisor?: number;
	minLevel?: number;
	minPrepared?: number;
}): number {
	const lvl = clampLevel(level);
	if (typeof minLevel === "number" && lvl < minLevel) return 0;

	const div = typeof levelDivisor === "number" ? levelDivisor : 1;
	const base = Math.floor(lvl / div);
	const raw = base + abilityMod;
	const min = typeof minPrepared === "number" ? minPrepared : 1;
	return Math.max(min, raw);
}

const BARD_CANTRIPS = SPELL_KNOWLEDGE_2014.BARD_2014.cantrips;
const BARD_SPELLS_KNOWN = SPELL_KNOWLEDGE_2014.BARD_2014.known!;
const SORCERER_CANTRIPS = SPELL_KNOWLEDGE_2014.SORCERER_2014.cantrips;
const SORCERER_SPELLS_KNOWN = SPELL_KNOWLEDGE_2014.SORCERER_2014.known!;
const WARLOCK_CANTRIPS = SPELL_KNOWLEDGE_2014.WARLOCK_2014.cantrips;
const WARLOCK_SPELLS_KNOWN = SPELL_KNOWLEDGE_2014.WARLOCK_2014.known!;
const RANGER_CANTRIPS = SPELL_KNOWLEDGE_2014.RANGER_2014.cantrips;
const RANGER_SPELLS_KNOWN = SPELL_KNOWLEDGE_2014.RANGER_2014.known!;
const CLERIC_CANTRIPS = SPELL_KNOWLEDGE_2014.CLERIC_2014.cantrips;
const DRUID_CANTRIPS = SPELL_KNOWLEDGE_2014.DRUID_2014.cantrips;
const WIZARD_CANTRIPS = SPELL_KNOWLEDGE_2014.WIZARD_2014.cantrips;
const ARTIFICER_CANTRIPS = SPELL_KNOWLEDGE_2014.ARTIFICER_2014.cantrips;
const THIRD_CASTER_CANTRIPS = THIRD_CASTER_KNOWLEDGE_2014.cantrips;
const THIRD_CASTER_SPELLS_KNOWN = THIRD_CASTER_KNOWLEDGE_2014.known!;

export function formatSpellCountValue(
	v: SpellCountValue,
	options?: {
		/** When true, show "{value} ({formula})" for computed values. Default: false. */
		showFormula?: boolean;
	}
): string {
	if (v.kind === "fixed") return String(v.value);

	if (typeof v.value === "number") {
		return options?.showFormula ? `${v.value} (${v.formula})` : String(v.value);
	}

	return v.formula;
}

/**
 * Returns per-class / per-subclass spell counts that depend on that class level.
 * - Includes multiclasses.
 * - Includes third-caster subclasses (Eldritch Knight, Arcane Trickster) only if present on the character.
 */
export function getSpellcastingCountsLines(pers: PersWithRelations): SpellcastingCountsLine[] {
	if (!pers) return [];

	const multiclasses = Array.isArray(pers.multiclasses) ? pers.multiclasses : [];
	const multiclassLevels = multiclasses.reduce((acc, m) => acc + (Number(m?.classLevel) || 0), 0);
	const mainLevel = Math.max(1, (Number(pers.level) || 1) - multiclassLevels);

	const entries: Array<{
		level: number;
		className?: Classes | string | null;
		classCastingStat?: Ability | null;
		subclassName?: Subclasses | string | null;
		subclassCastingStat?: Ability | null;
	}> = [
		{
			level: mainLevel,
			className: pers?.class?.name ?? null,
			classCastingStat: pers?.class?.primaryCastingStat ?? null,
			subclassName: pers?.subclass?.name ?? null,
			subclassCastingStat: pers?.subclass?.primaryCastingStat ?? null,
		},
		...multiclasses.map((m) => ({
			level: clampLevel(m?.classLevel ?? 1),
			className: m?.class?.name ?? null,
			classCastingStat: m?.class?.primaryCastingStat ?? null,
			subclassName: m?.subclass?.name ?? null,
			subclassCastingStat: m?.subclass?.primaryCastingStat ?? null,
		})),
	];

	const lines: SpellcastingCountsLine[] = [];

	for (const entry of entries) {
		const level = clampLevel(entry.level);
		const cls = entry.className as Classes | string | null;

		if (isClass2024(cls)) {
			const line = buildLine2024(cls, level, entry.subclassName ?? null);
			if (line) lines.push(line);
			continue;
		}

		if (cls === Classes.BARD_2014) {
			lines.push({
				key: `class:${cls}:${level}`,
				name: classTranslations.BARD_2014,
				level,
				cantrips: tableAtLevel(BARD_CANTRIPS, level),
				spellsLabel: "Заклинань",
				spells: fixed(tableAtLevel(BARD_SPELLS_KNOWN, level)),
			});
			continue;
		}

		if (cls === Classes.SORCERER_2014) {
			lines.push({
				key: `class:${cls}:${level}`,
				name: classTranslations.SORCERER_2014,
				level,
				cantrips: tableAtLevel(SORCERER_CANTRIPS, level),
				spellsLabel: "Заклинань",
				spells: fixed(tableAtLevel(SORCERER_SPELLS_KNOWN, level)),
			});
			continue;
		}

		if (cls === Classes.WARLOCK_2014) {
			lines.push({
				key: `class:${cls}:${level}`,
				name: classTranslations.WARLOCK_2014,
				level,
				cantrips: tableAtLevel(WARLOCK_CANTRIPS, level),
				spellsLabel: "Заклинань",
				spells: fixed(tableAtLevel(WARLOCK_SPELLS_KNOWN, level)),
			});
			continue;
		}

		if (cls === Classes.RANGER_2014) {
			lines.push({
				key: `class:${cls}:${level}`,
				name: classTranslations.RANGER_2014,
				level,
				cantrips: tableAtLevel(RANGER_CANTRIPS, level),
				spellsLabel: "Заклинань",
				spells: fixed(tableAtLevel(RANGER_SPELLS_KNOWN, level)),
			});
			continue;
		}

		if (cls === Classes.CLERIC_2014) {
			const ability = (entry.classCastingStat ?? Ability.WIS) as Ability;
			const mod = calculateFinalModifier(pers, ability);
			const prepared = preparedCount({ level, abilityMod: mod, minPrepared: 1 });
			lines.push({
				key: `class:${cls}:${level}`,
				name: classTranslations.CLERIC_2014,
				level,
				cantrips: tableAtLevel(CLERIC_CANTRIPS, level),
				spellsLabel: "Заклинань (знає всі — можна підготувати)",
				spells: { kind: "formula", formula: `Рівень + модифікатор`, value: prepared },
			});
			continue;
		}

		if (cls === Classes.DRUID_2014) {
			const ability = (entry.classCastingStat ?? Ability.WIS) as Ability;
			const mod = calculateFinalModifier(pers, ability);
			const prepared = preparedCount({ level, abilityMod: mod, minPrepared: 1 });
			lines.push({
				key: `class:${cls}:${level}`,
				name: classTranslations.DRUID_2014,
				level,
				cantrips: tableAtLevel(DRUID_CANTRIPS, level),
				spellsLabel: "Заклинань (знає всі — можна підготувати)",
				spells: { kind: "formula", formula: `Рівень + модифікатор`, value: prepared },
			});
			continue;
		}

		if (cls === Classes.PALADIN_2014) {
			const ability = (entry.classCastingStat ?? Ability.CHA) as Ability;
			const mod = calculateFinalModifier(pers, ability);
			const prepared = preparedCount({ level, abilityMod: mod, levelDivisor: 2, minLevel: 2, minPrepared: 1 });
			lines.push({
				key: `class:${cls}:${level}`,
				name: classTranslations.PALADIN_2014,
				level,
				cantrips: 0,
				spellsLabel: "Заклинань (знає всі — можна підготувати)",
				spells: {
					kind: "formula",
					formula: "1/2 рівня + модифікатор (з 2-го рівня)",
					value: prepared,
				},
			});
			continue;
		}

		if (cls === Classes.ARTIFICER_2014) {
			const ability = (entry.classCastingStat ?? Ability.INT) as Ability;
			const mod = calculateFinalModifier(pers, ability);
			const prepared = preparedCount({ level, abilityMod: mod, levelDivisor: 2, minPrepared: 1 });
			lines.push({
				key: `class:${cls}:${level}`,
				name: classTranslations.ARTIFICER_2014,
				level,
				cantrips: tableAtLevel(ARTIFICER_CANTRIPS, level),
				spellsLabel: "Заклинань (знає всі — можна підготувати)",
				spells: { kind: "formula", formula: "1/2 рівня + модифікатор", value: prepared },
			});
			continue;
		}

		if (cls === Classes.WIZARD_2014) {
			const ability = (entry.classCastingStat ?? Ability.INT) as Ability;
			const mod = calculateFinalModifier(pers, ability);
			const prepared = preparedCount({ level, abilityMod: mod, minPrepared: 1 });

			lines.push({
				key: `class:${cls}:prepared:${level}`,
				name: classTranslations.WIZARD_2014,
				level,
				cantrips: tableAtLevel(WIZARD_CANTRIPS, level),
				spellsLabel: "Заклинань (можна підготувати)",
				spellsNote: "+ книга заклинань",
				spells: {
					kind: "formula",
					formula: "Рівень + модифікатор (книга: 6 на 1-му, +2 за рівень)",
					value: prepared,
				},
			});
			continue;
		}

		const sub = entry.subclassName as Subclasses | string | null;
		if (sub === Subclasses.ELDRITCH_KNIGHT || sub === Subclasses.ARCANE_TRICKSTER) {
			const subLabel =
				(subclassTranslations as Partial<Record<Subclasses, string>>)[sub as Subclasses] ?? String(sub);
			lines.push({
				key: `subclass:${sub}:${level}`,
				name: subLabel,
				level,
				cantrips: tableAtLevel(THIRD_CASTER_CANTRIPS, level),
				spellsLabel: "Заклинань",
				spells: fixed(tableAtLevel(THIRD_CASTER_SPELLS_KNOWN, level)),
			});
			continue;
		}
	}

	const seen = new Set<string>();
	return lines.filter((l) => {
		if (seen.has(l.key)) return false;
		seen.add(l.key);
		return true;
	});
}