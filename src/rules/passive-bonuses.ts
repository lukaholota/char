export type PassiveBonuses = Record<string, number>;

/** Нульовий бонус прибирає ключ, а порожня мапа — `null`, щоб у базі лишався NULL, а не `{}`. */
export function buildNextPassiveBonuses(current: unknown, skill: string, value: number): PassiveBonuses | null {
  const next: PassiveBonuses = current && typeof current === "object" && !Array.isArray(current) ? { ...(current as PassiveBonuses) } : {};
  if (value === 0) delete next[skill];
  else next[skill] = value;
  return Object.keys(next).length > 0 ? next : null;
}
