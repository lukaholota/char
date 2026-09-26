"use server";

import { revalidatePath } from "next/cache";
import type { Ruleset } from "@prisma/client";
import { canEditPers } from "@/lib/actions/pers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  applyDamageInBeastForm,
  applyHealingInBeastForm,
  describeKnownFormsOverflow,
  findWildshapeEligibility,
  findWildshapeTemporaryHitPoints,
  listBlockingReasons,
  parseCreatureHitPoints,
  usesSeparateBeastHitPoints,
} from "@/rules/wildshape";
import {
  type ActiveBeastForm,
  type AttachedForm,
  type WildshapeCharacter,
  type WildshapeStanding,
  attachForm,
  countAttachedForms,
  detachForm,
  enterBeastForm,
  findActiveForm,
  findAttachedForms,
  findWildshapeCharacters,
  findWildshapeStanding,
  grantTemporaryHitPoints,
  leaveBeastForm,
  setBeastHitPoints,
} from "@/server/db/wildshape";
import { type WildshapeUses, findWildshapeUses, spendWildshapeUse } from "@/server/db/wildshape-uses";
import { findWildshapeCreature } from "@/server/db/wildshape-creatures";

type Failure = { ok: false; error: string };

async function findSessionUserId(): Promise<number | null> {
  const session = await auth();
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  return user?.id ?? null;
}

/// Шкода й зцілення у формі — механіка 2014: там окремий стос хітів звіра. У 2024 персонаж
/// лишається у своїх хітах, тож писати їх треба звичайним блоком хітів, а не сюди — інакше
/// два записи того самого удару розійшлися б.
function assertSeparateBeastHitPoints(ruleset: Ruleset): { ok: true } | Failure {
  if (usesSeparateBeastHitPoints(ruleset)) return { ok: true };

  return { ok: false, error: "У формі 2024 хіти лишаються вашими — записуйте їх у блоці хітів персонажа" };
}

async function assertCanEditPers(persId: number): Promise<{ ok: true } | Failure> {
  const userId = await findSessionUserId();
  if (userId === null) return { ok: false, error: "Не авторизовано" };

  const canEdit = await canEditPers(persId, userId);
  if (!canEdit) return { ok: false, error: "Немає доступу до персонажа" };

  return { ok: true };
}

export async function loadWildshapeForms(persId: number): Promise<
  | {
      ok: true;
      forms: AttachedForm[];
      standing: WildshapeStanding;
      active: ActiveBeastForm | null;
      uses: WildshapeUses | null;
    }
  | Failure
> {
  const access = await assertCanEditPers(persId);
  if (!access.ok) return access;

  const [forms, standing, active] = await Promise.all([
    findAttachedForms(persId),
    findWildshapeStanding(persId),
    findActiveForm(persId),
  ]);

  // Лічильник питаємо лише в того, хто Дику форму має: картка ховається без неї, тож усім
  // іншим персонажам це були б два зайві запити на кожне відкриття листа.
  const uses = standing.limits ? await findWildshapeUses({ persId }) : null;

  return { ok: true, forms, standing, active, uses };
}

/// Контекст секції «Дика форма» в бестіарії: межі персонажа й те, що вже прикріплено. Придатність
/// каталог рахує сам тим самим правилом (`findEntryEligibility`) — сюди їде лише те, чого браузер
/// знати не може.
export async function loadWildshapePicker(
  persId: number
): Promise<({ ok: true; standing: WildshapeStanding; attachedKeys: string[] }) | Failure> {
  const access = await assertCanEditPers(persId);
  if (!access.ok) return access;

  const [standing, forms] = await Promise.all([
    findWildshapeStanding(persId),
    findAttachedForms(persId),
  ]);

  return { ok: true, standing, attachedKeys: forms.map((form) => form.key) };
}

/// Персонажі, чию Дику форму бестіарій може взяти в контекст, коли гравець відкрив каталог сам.
/// Порожній список — не помилка: без друїда секція просто не показується.
export async function loadWildshapeCharacters(): Promise<WildshapeCharacter[]> {
  const userId = await findSessionUserId();
  if (userId === null) return [];

  return findWildshapeCharacters(userId);
}

/// Прикріпити можна лише те, що персонажу дозволене просто зараз: перевірку робить сервер, бо
/// на клієнті рівень і коло — це те, що прийшло з попереднього рендеру.
export async function attachWildshapeForm(input: {
  persId: number;
  creatureKey: string;
  ruleset: Ruleset;
}): Promise<({ ok: true; form: AttachedForm; warnings: string[] }) | Failure> {
  const access = await assertCanEditPers(input.persId);
  if (!access.ok) return access;

  const creature = await findWildshapeCreature({ key: input.creatureKey, ruleset: input.ruleset });
  if (!creature) return { ok: false, error: "Такої істоти немає в каталозі" };

  const standing = await findWildshapeStanding(input.persId);
  if (!standing.limits) return { ok: false, error: "Персонаж не має Дикої форми" };

  // Непридатна форма прикріплюється з попередженням, а не відхиляється ([Р-3]): друїд 6 рівня
  // має право заздалегідь причепити орла, у якого перетвориться з 8-го. Забороняє тільки вхід
  // у форму. Так само й межа відомих форм 2024 — попереджає, а не блокує ([Р26]).
  const form = await attachForm({
    persId: input.persId,
    creature,
    ruleset: input.ruleset,
    sortOrder: await countAttachedForms(input.persId),
  });

  const overflow = describeKnownFormsOverflow({
    attached: await countAttachedForms(input.persId),
    limit: standing.knownFormsLimit,
  });

  revalidatePath(`/char/${input.persId}`);
  return {
    ok: true,
    form,
    warnings: [...listBlockingReasons(findWildshapeEligibility(creature, standing)), ...(overflow ? [overflow] : [])],
  };
}

export async function detachWildshapeForm(input: {
  persId: number;
  wildshapeId: number;
}): Promise<{ ok: true } | Failure> {
  const access = await assertCanEditPers(input.persId);
  if (!access.ok) return access;

  const forms = await findAttachedForms(input.persId);
  if (!forms.some((form) => form.wildshapeId === input.wildshapeId)) {
    return { ok: false, error: "Ця форма не належить персонажу" };
  }

  await detachForm(input.wildshapeId);

  revalidatePath(`/char/${input.persId}`);
  return { ok: true };
}

/// Перетворення 2014: хіти звіра починаються з максимуму зі статблока, а хіти персонажа не
/// чіпаються — саме тому вони окремий стос (рішення власника 2026-08-29: показуємо обидва).
/// Перетворення 2024: стосу немає взагалі, персонаж лишається у своїх хітах і отримує тимчасові
/// (рівень друїда, у Колі місяця — потроєний).
///
/// Вхід — одна дія разом із витратою використання ([KR24.5](../../../docs/o24-wildshape-second-layer/kr24.5-uses-and-form.md)):
/// ціна береться з фічі, чиєю формою став персонаж, а порожній пул дає попередження, не відмову.
export async function enterWildshapeForm(input: {
  persId: number;
  wildshapeId: number;
}): Promise<({ ok: true; active: ActiveBeastForm; warnings: string[] }) | Failure> {
  const access = await assertCanEditPers(input.persId);
  if (!access.ok) return access;

  const form = (await findAttachedForms(input.persId)).find(
    (candidate) => candidate.wildshapeId === input.wildshapeId
  );
  if (!form) return { ok: false, error: "Ця форма не належить персонажу" };
  if (!form.creature) return { ok: false, error: "Цієї істоти більше немає в каталозі" };
  if (form.eligibility && !form.eligibility.eligible) {
    return { ok: false, error: listBlockingReasons(form.eligibility).join("; ") };
  }

  const standing = await findWildshapeStanding(input.persId);
  if (usesSeparateBeastHitPoints(standing.ruleset)) {
    const beastMaxHp = parseCreatureHitPoints(form.creature.hp);
    if (beastMaxHp === null) return { ok: false, error: "У статблоці немає хітів" };

    await enterBeastForm(input.wildshapeId, beastMaxHp);
  } else {
    await enterBeastForm(input.wildshapeId, null);
    await grantTemporaryHitPoints(input.persId, findWildshapeTemporaryHitPoints(standing));
  }

  const shortfall = await spendWildshapeUse({
    persId: input.persId,
    creatureType: form.creature.type,
  });

  const active = await findActiveForm(input.persId);
  if (!active) return { ok: false, error: "Не вдалося увійти у форму" };

  revalidatePath(`/char/${input.persId}`);
  return { ok: true, active, warnings: shortfall ? [shortfall] : [] };
}

/// Добровільний вихід хітів персонажа не змінює — на відміну від виходу через 0 хітів звіра.
/// Використань він теж не чіпає: за правилами 2014 вихід безкоштовний, а повернути використання
/// може лише відпочинок або ручний лічильник на слайді Рис.
export async function leaveWildshapeForm(persId: number): Promise<{ ok: true } | Failure> {
  const access = await assertCanEditPers(persId);
  if (!access.ok) return access;

  await leaveBeastForm(persId);

  revalidatePath(`/char/${persId}`);
  return { ok: true };
}

/// `persCurrentHp` віддається завжди, а не лише при переливі: лист мусить показати, у що
/// перетворилися власні хіти, тим самим рухом, яким показує падіння форми.
export async function damageBeastForm(input: {
  persId: number;
  damage: number;
}): Promise<
  | { ok: true; reverted: boolean; carriedOver: number; beastCurrentHp: number; persCurrentHp: number }
  | Failure
> {
  const access = await assertCanEditPers(input.persId);
  if (!access.ok) return access;

  const active = await findActiveForm(input.persId);
  if (!active) return { ok: false, error: "Персонаж не у звіриній формі" };
  const separateStack = assertSeparateBeastHitPoints(active.ruleset);
  if (!separateStack.ok) return separateStack;

  const pers = await prisma.pers.findUnique({
    where: { persId: input.persId },
    select: { currentHp: true },
  });
  if (!pers) return { ok: false, error: "Немає доступу до персонажа" };

  const outcome = applyDamageInBeastForm(
    { beastCurrent: active.beastCurrentHp, beastMax: active.beastMaxHp, persCurrent: pers.currentHp },
    input.damage
  );

  if (outcome.reverted) {
    await prisma.pers.update({
      where: { persId: input.persId },
      data: { currentHp: outcome.persCurrent },
    });
    await leaveBeastForm(input.persId);
  } else {
    await setBeastHitPoints(active.wildshapeId, outcome.beastCurrent);
  }

  revalidatePath(`/char/${input.persId}`);
  return {
    ok: true,
    reverted: outcome.reverted,
    carriedOver: outcome.carriedOver,
    beastCurrentHp: outcome.beastCurrent,
    persCurrentHp: outcome.persCurrent,
  };
}

export async function healBeastForm(input: {
  persId: number;
  healing: number;
}): Promise<({ ok: true; beastCurrentHp: number }) | Failure> {
  const access = await assertCanEditPers(input.persId);
  if (!access.ok) return access;

  const active = await findActiveForm(input.persId);
  if (!active) return { ok: false, error: "Персонаж не у звіриній формі" };
  const separateStack = assertSeparateBeastHitPoints(active.ruleset);
  if (!separateStack.ok) return separateStack;

  const beastCurrentHp = applyHealingInBeastForm(
    { beastCurrent: active.beastCurrentHp, beastMax: active.beastMaxHp, persCurrent: 0 },
    input.healing
  );
  await setBeastHitPoints(active.wildshapeId, beastCurrentHp);

  revalidatePath(`/char/${input.persId}`);
  return { ok: true, beastCurrentHp };
}
