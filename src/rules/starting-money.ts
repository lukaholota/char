import { GOLD_ITEM_NAME, type StartingItem } from "./background-equipment";

/**
 * Сіди пишуть гроші всередині списку майна — рядком «зм x75» поруч зі «Спис x1». Розкласти
 * такий список на гаманець і речі треба однаково для майна походження і для класової опції,
 * тому розбір живе тут, а не гілкою всередині створення персонажа.
 */

export type Purse = { cp: number; sp: number; ep: number; gp: number; pp: number };

/** Скорочення монет, якими послуговуються сіди: зм=gp, см=sp, мм=cp, ем=ep, пм=pp. */
const PURSE_KEY_BY_COIN: Record<string, keyof Purse> = {
  мм: "cp",
  см: "sp",
  ем: "ep",
  [GOLD_ITEM_NAME]: "gp",
  пм: "pp",
};

export const emptyPurse = (): Purse => ({ cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 });

export const findCoinKind = (name: string): keyof Purse | null =>
  PURSE_KEY_BY_COIN[String(name ?? "").trim().toLowerCase()] ?? null;

export const splitStartingItems = (
  items: StartingItem[]
): { purse: Purse; belongings: StartingItem[] } => {
  const purse = emptyPurse();
  const belongings: StartingItem[] = [];

  for (const item of items) {
    const amount = toWholeAmount(item.quantity);
    const coin = amount > 0 ? findCoinKind(item.name) : null;

    if (coin) purse[coin] += amount;
    else belongings.push(item);
  }

  return { purse, belongings };
};

export const addToPurse = (into: Purse, added: Purse): Purse => ({
  cp: into.cp + added.cp,
  sp: into.sp + added.sp,
  ep: into.ep + added.ep,
  gp: into.gp + added.gp,
  pp: into.pp + added.pp,
});

/// Нуль і відʼємне монетою не вважаються: «зм x0» — це не гроші, і зникати з майна воно теж
/// не має права, інакше рядок просто губиться.
const toWholeAmount = (quantity: number): number =>
  Number.isFinite(quantity) ? Math.max(0, Math.trunc(quantity)) : 0;
