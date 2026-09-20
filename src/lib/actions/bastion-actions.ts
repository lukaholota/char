"use server";

import { revalidatePath } from "next/cache";
import { canEditPers } from "@/lib/actions/pers";
import { auth } from "@/lib/auth";
import { type BastionSpace, getBastionFacilityBySlug } from "@/lib/bastionsData";
import { BASTION_WIDE_ORDER_CODE, findAllowedOrderCodes, toBastionSpace } from "@/lib/bastion-facility";
import { bastionOrderTranslations } from "@/lib/refs/translation";
import { FIRST_BASTION_TURN_NUMBER, findReplacementState } from "@/rules/bastions";
import {
  type BastionFacilityRecord,
  type BastionOrderCode,
  type BastionPicker,
  type BastionStanding,
  type SharedBastionView,
  addBastionFacility,
  addBastionTurn,
  createBastion,
  deleteBastion,
  findBastionPicker,
  findBastionStanding,
  findSharedBastionView,
  removeBastionFacility,
  replaceBastionFacility,
  removeBastionTurn,
  updateBastionDetails,
  updateBastionFacilityState,
  updateBastionMaintaining,
  updateBastionTurn,
} from "@/server/db/bastions";
import { findUserIdByEmail } from "@/server/db/users";

type Failure = { ok: false; error: string };
type StandingResult = { ok: true; standing: BastionStanding } | Failure;

/// Колонка `name` — VARCHAR(100); межа тут, щоб форма сказала це людською мовою, а не впала
/// помилкою Postgres.
const MAX_BASTION_NAME_LENGTH = 100;

export async function loadBastion(persId: number): Promise<StandingResult> {
  return findAccessibleStanding(persId);
}

/// Редакція — межа, рівень — ні: 2014 бастіону не має взагалі, а 4-й рівень його створює з
/// попередженням ([Р26](../../../docs/DECISIONS.md#р26)).
export async function createBastionForPers(input: {
  persId: number;
  name: string;
  description?: string;
}): Promise<StandingResult> {
  const current = await findAccessibleStanding(input.persId);
  if (!current.ok) return current;
  if (!current.standing.access.isOffered) {
    return { ok: false, error: "Бастіони — механіка правил 2024" };
  }
  if (current.standing.bastion) {
    return { ok: false, error: "У персонажа вже є бастіон" };
  }

  const name = readBastionName(input.name);
  if (!name.ok) return name;

  await createBastion({
    persId: input.persId,
    name: name.value,
    description: (input.description ?? "").trim(),
  });

  return respondWithFreshStanding(input.persId);
}

export async function saveBastionDetails(input: {
  persId: number;
  name: string;
  description: string;
  notes: string;
}): Promise<StandingResult> {
  const current = await findAccessibleStanding(input.persId);
  if (!current.ok) return current;

  const bastion = current.standing.bastion;
  if (!bastion) return { ok: false, error: "У персонажа немає бастіону" };

  const name = readBastionName(input.name);
  if (!name.ok) return name;

  await updateBastionDetails({
    bastionId: bastion.bastionId,
    name: name.value,
    description: input.description.trim(),
    notes: input.notes.trim(),
  });

  return respondWithFreshStanding(input.persId);
}

/// DMG 2024: «Утримання» віддається всьому бастіону й забороняє інші накази цього ходу. Накази
/// приміщень при цьому не стираються — сторінка лише попереджає (Р26).
export async function saveBastionMaintaining(input: {
  persId: number;
  isMaintaining: boolean;
}): Promise<StandingResult> {
  const current = await findAccessibleStanding(input.persId);
  if (!current.ok) return current;

  const bastion = current.standing.bastion;
  if (!bastion) return { ok: false, error: "У персонажа немає бастіону" };

  await updateBastionMaintaining({ bastionId: bastion.bastionId, isMaintaining: input.isMaintaining });

  return respondWithFreshStanding(input.persId);
}

/// Пікер отримує профіль персонажа, а не готові вердикти: каталог у нього вже є, а відповідність
/// рахують чисті правила — та сама функція, що й на сторінці бастіону.
export async function loadBastionPicker(
  persId: number
): Promise<({ ok: true; picker: BastionPicker }) | Failure> {
  const access = await findAccessibleStanding(persId);
  if (!access.ok) return access;
  if (!access.standing.access.isOffered) {
    return { ok: false, error: "Бастіони — механіка правил 2024" };
  }

  const picker = await findBastionPicker(persId);
  if (!picker) return { ok: false, error: "Персонажа не знайдено" };

  return { ok: true, picker };
}

/// Ні передумова, ні ліміт приміщення не блокують ([Р26](../../../docs/DECISIONS.md#р26)) —
/// перевіряється лише те, без чого рядок був би сміттям: приміщення є в каталозі, а розмір
/// каталог для нього дозволяє.
export async function addFacility(input: {
  persId: number;
  slug: string;
  space?: BastionSpace;
}): Promise<StandingResult> {
  const current = await findAccessibleStanding(input.persId);
  if (!current.ok) return current;

  const bastion = current.standing.bastion;
  if (!bastion) return { ok: false, error: "У персонажа немає бастіону" };

  const facility = getBastionFacilityBySlug(input.slug);
  if (!facility) return { ok: false, error: "Такого приміщення немає в каталозі" };

  const space = readFacilitySpace(facility.space, input.space);
  if (!space.ok) return space;

  await addBastionFacility({ bastionId: bastion.bastionId, facility, space: space.value });

  return respondWithFreshStanding(input.persId);
}

export async function removeFacility(input: {
  persId: number;
  facilityId: number;
}): Promise<StandingResult> {
  const current = await findAccessibleStanding(input.persId);
  if (!current.ok) return current;

  const owns = current.standing.bastion?.facilities.some(
    (facility) => facility.facilityId === input.facilityId
  );
  if (!owns) return { ok: false, error: "Це приміщення не належить бастіону персонажа" };

  await removeBastionFacility(input.facilityId);

  return respondWithFreshStanding(input.persId);
}

/// DMG 2024: «Each time a character gains a level, that character can replace one of their Bastion's
/// special facilities with another». Застосунок не рахує, скільки замін уже було за рівень, і не
/// звіряє передумову (Р26) — лише не пускає базове: заміна в книзі стосується спеціальних.
export async function replaceFacility(input: {
  persId: number;
  facilityId: number;
  slug: string;
}): Promise<StandingResult> {
  const current = await findAccessibleStanding(input.persId);
  if (!current.ok) return current;

  const owned = current.standing.bastion?.facilities.find(
    (facility) => facility.facilityId === input.facilityId
  );
  if (!owned) return { ok: false, error: "Це приміщення не належить бастіону персонажа" };

  const replacement = getBastionFacilityBySlug(input.slug);
  if (!replacement) return { ok: false, error: "Такого приміщення немає в каталозі" };
  if (replacement.facilityType !== "special") {
    return { ok: false, error: "Замінити можна лише на спеціальне приміщення" };
  }

  const kept = findReplacementState({
    currentSpace: toBastionSpace(owned.space),
    currentOrder: owned.currentOrder,
    allowedSpaces: replacement.space,
    allowedOrders: findAllowedOrderCodes(replacement),
  });
  await replaceBastionFacility({
    facilityId: owned.facilityId,
    facility: replacement,
    space: kept.space,
    currentOrder: kept.keepsOrder ? owned.currentOrder : null,
  });

  return respondWithFreshStanding(input.persId);
}

/// Поширений лист відкривають без входу — доступ дає сам токен, як і до решти листа.
export async function loadSharedBastion(token: string): Promise<SharedBastionView | null> {
  return findSharedBastionView(token);
}

/// Наказ поза переліком каталогу приймається як завжди ([Р26](../../../docs/DECISIONS.md#р26)) —
/// це попереджає лише UI. Тут перевіряється валідність значення, а не відповідність приміщенню.
export async function saveFacilityState(input: {
  persId: number;
  facilityId: number;
  space?: BastionSpace;
  currentOrder: BastionOrderCode | null;
  defenders: number;
  hirelings: string;
  notes: string;
}): Promise<StandingResult> {
  const current = await findAccessibleStanding(input.persId);
  if (!current.ok) return current;

  const owned = current.standing.bastion?.facilities.find(
    (facility) => facility.facilityId === input.facilityId
  );
  if (!owned) return { ok: false, error: "Це приміщення не належить бастіону персонажа" };

  const space = readResizedSpace(owned, input.space);
  if (!space.ok) return space;

  const order = readCurrentOrder(input.currentOrder);
  if (!order.ok) return order;

  const defenders = readFacilityDefenders(input.defenders);
  if (!defenders.ok) return defenders;

  await updateBastionFacilityState({
    facilityId: input.facilityId,
    space: space.value,
    currentOrder: order.value,
    defenders: defenders.value,
    hirelings: input.hirelings.trim(),
    notes: input.notes.trim(),
  });

  return respondWithFreshStanding(input.persId);
}

/// Журнал — лог, а не симуляція: дія кладе те, що написав гравець, і нічого не розвʼязує. Номер
/// ходу підказує `findNextTurnNumber`, але приходить сюди з форми й може бути будь-яким
/// ([Р26](../../../docs/DECISIONS.md#р26)).
export async function addTurn(input: {
  persId: number;
  turnNumber: number;
  entry: string;
}): Promise<StandingResult> {
  const current = await findAccessibleStanding(input.persId);
  if (!current.ok) return current;

  const bastion = current.standing.bastion;
  if (!bastion) return { ok: false, error: "У персонажа немає бастіону" };

  const turn = readTurnInput(input);
  if (!turn.ok) return turn;

  await addBastionTurn({
    bastionId: bastion.bastionId,
    turnNumber: turn.value.turnNumber,
    entry: turn.value.entry,
  });

  return respondWithFreshStanding(input.persId);
}

export async function saveTurn(input: {
  persId: number;
  turnId: number;
  turnNumber: number;
  entry: string;
}): Promise<StandingResult> {
  const current = await findAccessibleStanding(input.persId);
  if (!current.ok) return current;

  const owns = current.standing.bastion?.turns.some((turn) => turn.turnId === input.turnId);
  if (!owns) return { ok: false, error: "Цей запис не належить журналу персонажа" };

  const turn = readTurnInput(input);
  if (!turn.ok) return turn;

  await updateBastionTurn({
    turnId: input.turnId,
    turnNumber: turn.value.turnNumber,
    entry: turn.value.entry,
  });

  return respondWithFreshStanding(input.persId);
}

export async function removeTurn(input: {
  persId: number;
  turnId: number;
}): Promise<StandingResult> {
  const current = await findAccessibleStanding(input.persId);
  if (!current.ok) return current;

  const owns = current.standing.bastion?.turns.some((turn) => turn.turnId === input.turnId);
  if (!owns) return { ok: false, error: "Цей запис не належить журналу персонажа" };

  await removeBastionTurn(input.turnId);

  return respondWithFreshStanding(input.persId);
}

export async function removeBastion(persId: number): Promise<{ ok: true } | Failure> {
  const current = await findAccessibleStanding(persId);
  if (!current.ok) return current;

  const bastion = current.standing.bastion;
  if (!bastion) return { ok: false, error: "У персонажа немає бастіону" };

  await deleteBastion(bastion.bastionId);
  revalidateBastionPaths(persId);

  return { ok: true };
}

async function findAccessibleStanding(persId: number): Promise<StandingResult> {
  const session = await auth();
  if (!session?.user?.email) return { ok: false, error: "Не авторизовано" };

  const userId = await findUserIdByEmail(session.user.email);
  if (!userId) return { ok: false, error: "Користувача не знайдено" };

  const canEdit = await canEditPers(persId, userId);
  if (!canEdit) return { ok: false, error: "Немає доступу до персонажа" };

  const standing = await findBastionStanding(persId);
  if (!standing) return { ok: false, error: "Персонажа не знайдено" };

  return { ok: true, standing };
}

async function respondWithFreshStanding(persId: number): Promise<StandingResult> {
  revalidateBastionPaths(persId);

  const standing = await findBastionStanding(persId);
  if (!standing) return { ok: false, error: "Персонажа не знайдено" };

  return { ok: true, standing };
}

function readBastionName(raw: string): { ok: true; value: string } | Failure {
  const name = raw.trim();
  if (!name) return { ok: false, error: "Назва бастіону не може бути порожньою" };
  if (name.length > MAX_BASTION_NAME_LENGTH) {
    return { ok: false, error: `Назва бастіону — не довша за ${MAX_BASTION_NAME_LENGTH} символів` };
  }

  return { ok: true, value: name };
}

function readCurrentOrder(
  raw: BastionOrderCode | null
): { ok: true; value: BastionOrderCode | null } | Failure {
  if (raw === null) return { ok: true, value: null };
  if (!(raw in bastionOrderTranslations)) return { ok: false, error: "Такого наказу не існує" };
  if (raw === BASTION_WIDE_ORDER_CODE) {
    return { ok: false, error: "«Утримання» віддається всьому бастіону, а не приміщенню" };
  }

  return { ok: true, value: raw };
}

/// Колонка `defenders` має CHECK `>= 0`; межа тут, щоб форма сказала це людською мовою, а не
/// впала помилкою Postgres.
function readFacilityDefenders(raw: number): { ok: true; value: number } | Failure {
  if (!Number.isInteger(raw) || raw < 0) {
    return { ok: false, error: "Захисників не може бути менше нуля" };
  }

  return { ok: true, value: raw };
}

/// Колонка `turn_number` має CHECK `>= 1`; межа тут — щоб форма сказала це людською мовою, а не
/// впала помилкою Postgres. Порожній запис теж відхиляється: журнал без тексту нічого не памʼятає.
function readTurnInput(input: {
  turnNumber: number;
  entry: string;
}): { ok: true; value: { turnNumber: number; entry: string } } | Failure {
  if (!Number.isInteger(input.turnNumber) || input.turnNumber < FIRST_BASTION_TURN_NUMBER) {
    return { ok: false, error: `Номер ходу — ціле число, не менше ${FIRST_BASTION_TURN_NUMBER}` };
  }

  const entry = input.entry.trim();
  if (!entry) return { ok: false, error: "Запис ходу не може бути порожнім" };

  return { ok: true, value: { turnNumber: input.turnNumber, entry } };
}

/// Каталог дає більше одного розміру лише в 15 приміщень із 61; для решти вибір проставляється
/// мовчки, і форма про нього не питає.
/// Розмір міняється на місці, щоб збільшення за столом не стирало наказ, захисників і нотатки.
/// Приміщення, якого вже немає в каталозі, лишає свій розмір — звіряти нема з чим.
function readResizedSpace(
  facility: BastionFacilityRecord,
  chosen: BastionSpace | undefined
): { ok: true; value: BastionSpace } | Failure {
  const current = toBastionSpace(facility.space);
  const catalogFacility = getBastionFacilityBySlug(facility.facilitySlug);
  if (!chosen || chosen === current || !catalogFacility) return { ok: true, value: current };

  return readFacilitySpace(catalogFacility.space, chosen);
}

function readFacilitySpace(
  allowed: readonly BastionSpace[],
  chosen: BastionSpace | undefined
): { ok: true; value: BastionSpace } | Failure {
  if (!chosen) {
    if (allowed.length === 1) return { ok: true, value: allowed[0] };
    return { ok: false, error: "Для цього приміщення треба обрати розмір" };
  }

  if (!allowed.includes(chosen)) {
    return { ok: false, error: "Каталог не дозволяє цьому приміщенню такий розмір" };
  }

  return { ok: true, value: chosen };
}

function revalidateBastionPaths(persId: number) {
  revalidatePath(`/char/${persId}/bastion`);
  revalidatePath(`/char/${persId}`);
}
