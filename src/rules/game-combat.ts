import type { MapCreatureView } from "@/rules/game-map-creatures";
import { parseAbilityScore } from "@/rules/wildshape";

export const INITIATIVE_LIMITS = { min: -99, max: 99 } as const;

export type CombatState = { round: number | null; turn: number | null; currentCombatantId: number | null };

export type CombatantRow = {
  id: number;
  persId: number | null;
  gameMapCreatureId: number | null;
  initiative: number;
  initiativeBonus: number;
  sortTiebreak: number;
};

export type CombatPresence = { persIds: ReadonlySet<number>; creatureIds: ReadonlySet<number> };

export type CombatHeroView = { userId: number; name: string; avatarUrl: string | null };

/// Бонус ініціативи гравцям не віддається: за ним можна вирахувати Спритність прихованої істоти.
export type CombatantView = { id: number; initiative: number; hero: CombatHeroView | null; creature: MapCreatureView | null };
export type CombatView = { round: number; currentId: number | null; combatants: CombatantView[] };

export type TurnPosition = { round: number; index: number };

export function rollD20(random: () => number = Math.random): number {
  return 1 + Math.floor(random() * 20);
}

export function rollInitiative(bonus: number, random?: () => number): number {
  return rollD20(random) + bonus;
}

/// Бонус істоти — модифікатор Спритності зі статблока: «16 (+3)» дає +3, відсутня Спритність — 0.
export function findCreatureInitiativeBonus(dexterityText: string | undefined): number {
  const score = parseAbilityScore(dexterityText ?? "");
  return score === null ? 0 : Math.floor((score - 10) / 2);
}

export function parseInitiative(raw: unknown): number | null {
  if (!Number.isInteger(raw)) return null;
  const value = raw as number;
  return value >= INITIATIVE_LIMITS.min && value <= INITIATIVE_LIMITS.max ? value : null;
}

export function parseTurnStep(raw: unknown): 1 | -1 | null {
  return raw === 1 || raw === -1 ? raw : null;
}

/// Вища ініціатива, за рівності — вищий бонус, далі збережений жереб; id робить порядок стабільним.
export function sortCombatants<Row extends Pick<CombatantRow, "id" | "initiative" | "initiativeBonus" | "sortTiebreak">>(rows: readonly Row[]): Row[] {
  return [...rows].sort((a, b) => b.initiative - a.initiative || b.initiativeBonus - a.initiativeBonus || b.sortTiebreak - a.sortTiebreak || a.id - b.id);
}

/// У бою лишаються герої, чий персонаж ще у кімнаті, і істоти, що ще є на мапі.
export function findCombatOrder(rows: readonly CombatantRow[], presence: CombatPresence): CombatantRow[] {
  const isPresent = (row: CombatantRow) =>
    row.persId !== null ? presence.persIds.has(row.persId) : row.gameMapCreatureId !== null && presence.creatureIds.has(row.gameMapCreatureId);
  return sortCombatants(rows.filter(isPresent));
}

/// Поки поточний учасник у списку, хід тримається за ним. Якщо його прибрали з мапи, список зсунувся
/// і збережений номер уже вказує на наступного.
export function findTurnIndex(orderedIds: readonly number[], currentId: number | null, savedIndex: number): number {
  const index = currentId === null ? -1 : orderedIds.indexOf(currentId);
  if (index >= 0) return index;
  return savedIndex < orderedIds.length ? savedIndex : 0;
}

export function moveTurn(position: TurnPosition, combatantCount: number, step: 1 | -1): TurnPosition {
  if (combatantCount === 0) return position;
  if (step === 1) return position.index + 1 < combatantCount ? { round: position.round, index: position.index + 1 } : { round: position.round + 1, index: 0 };
  if (position.index > 0) return { round: position.round, index: position.index - 1 };
  return position.round > 1 ? { round: position.round - 1, index: combatantCount - 1 } : position;
}

type CombatViewInput = {
  state: CombatState;
  rows: readonly CombatantRow[];
  heroesByPersId: ReadonlyMap<number, CombatHeroView>;
  creatures: readonly MapCreatureView[];
};

/// Істоти беруться з уже відфільтрованих для глядача видів: прихована майстром істота лишається прихованою.
export function buildCombatView({ state, rows, heroesByPersId, creatures }: CombatViewInput): CombatView | null {
  if (state.round === null) return null;
  const creaturesById = new Map(creatures.map((creature) => [creature.id, creature]));
  const order = findCombatOrder(rows, { persIds: new Set(heroesByPersId.keys()), creatureIds: new Set(creaturesById.keys()) });
  const currentIndex = findTurnIndex(order.map((row) => row.id), state.currentCombatantId, state.turn ?? 0);
  const combatants = order.map((row) => ({
    id: row.id,
    initiative: row.initiative,
    hero: row.persId === null ? null : (heroesByPersId.get(row.persId) ?? null),
    creature: row.gameMapCreatureId === null ? null : (creaturesById.get(row.gameMapCreatureId) ?? null),
  }));
  return { round: state.round, currentId: order[currentIndex]?.id ?? null, combatants };
}

type CombatCandidates = { heroes: readonly { userId: number; name: string }[]; creatures: readonly MapCreatureView[] | null };

/// Кого додасть «Додати в бій»: героїв із листом і поставлених на мапу істот, яких ще немає в черзі.
/// Без істот активної сцени (майстер дивиться іншу) відповідь невідома — null.
export function findCombatNewcomers(combat: CombatView, { heroes, creatures }: CombatCandidates): string[] | null {
  if (creatures === null) return null;
  const heroIds = new Set(combat.combatants.flatMap((combatant) => (combatant.hero ? [combatant.hero.userId] : [])));
  const creatureIds = new Set(combat.combatants.flatMap((combatant) => (combatant.creature ? [combatant.creature.id] : [])));
  return [
    ...heroes.filter((hero) => !heroIds.has(hero.userId)).map((hero) => hero.name),
    ...creatures.filter((creature) => creature.token !== null && !creatureIds.has(creature.id)).map((creature) => creature.label),
  ];
}
