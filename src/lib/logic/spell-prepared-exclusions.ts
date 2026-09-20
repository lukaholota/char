import { raceTranslations, subraceTranslations, subclassTranslations } from "@/lib/refs/translation";

const AUTO_EXCLUDE_BADGE_STATIC_TOKENS = ["архетип", "підклас", "раса", "підраса"] as const;

export function normalizePreparedCountBadgeToken(value: unknown): string {
	return String(value ?? "")
		.normalize("NFKC")
		.trim()
		.toLocaleLowerCase("uk")
		.replace(/\s+/g, " ");
}

function pushTranslatedValue(
	rawValues: string[],
	raw: unknown,
	translations?: Record<string, string>
) {
	const value = String(raw ?? "").trim();
	if (!value) return;
	rawValues.push(value);
	if (translations) {
		rawValues.push(translations[value] || value);
	}
}

export function collectPreparedCountAutoExcludeMatchers(pers: any): string[] {
	const rawValues: string[] = [];

	pushTranslatedValue(rawValues, pers?.subclass?.name, subclassTranslations as Record<string, string>);
	for (const mc of (pers?.multiclasses ?? []) as any[]) {
		pushTranslatedValue(rawValues, mc?.subclass?.name, subclassTranslations as Record<string, string>);
	}

	pushTranslatedValue(rawValues, pers?.race?.name, raceTranslations as Record<string, string>);
	pushTranslatedValue(rawValues, pers?.subrace?.name, subraceTranslations as Record<string, string>);

	const seen = new Set<string>();
	return rawValues
		.map((item) => normalizePreparedCountBadgeToken(item))
		.filter((item) => item.length > 0)
		.filter((item) => {
			if (seen.has(item)) return false;
			seen.add(item);
			return true;
		});
}

export function shouldAutoExcludeFromPreparedCountBadge(badgeText: unknown, matchers: string[]): boolean {
	const normalized = normalizePreparedCountBadgeToken(badgeText);
	if (!normalized) return false;

	for (const token of AUTO_EXCLUDE_BADGE_STATIC_TOKENS) {
		const staticToken = normalizePreparedCountBadgeToken(token);
		if (normalized.includes(staticToken)) return true;
	}

	for (const matcher of matchers) {
		if (!matcher) continue;
		if (normalized.includes(matcher)) return true;
	}

	return false;
}

export function getEffectiveExcludeFromPreparedCount(persSpell: any, matchers: string[]): boolean {
	return Boolean(persSpell?.excludeFromPreparedCount) || shouldAutoExcludeFromPreparedCountBadge(persSpell?.badgeText, matchers);
}

export function getEffectiveExcludeFromKnownCount(persSpell: any): boolean {
	return Boolean(persSpell?.excludeFromKnownCount);
}
