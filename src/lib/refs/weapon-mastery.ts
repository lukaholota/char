/**
 * Назви й описи властивостей майстерності зброї 2024 — одне місце на весь застосунок.
 *
 * Назви — ратифіковані значення `DND_DICTIONARY.rules2024.weaponMasteryProperties` зі словника
 * (`dictionary.json`); тут вони лежать типізовано під enum `WeaponMastery`. Англійська поруч
 * навмисно: назва властивості коінована, і читач звіряє її з книгою.
 * Описи стисло переказують SRD 5.2 «Mastery Properties».
 */

import type { WeaponMastery } from "@prisma/client";

export const weaponMasteryNames: Record<WeaponMastery, string> = {
  CLEAVE: "Розмах",
  GRAZE: "Черкання",
  NICK: "Кидок",
  PUSH: "Поштовх",
  SAP: "Виснаження",
  SLOW: "Уповільнення",
  TOPPLE: "Повалення",
  VEX: "Знервування",
};

export const weaponMasteryEngNames: Record<WeaponMastery, string> = {
  CLEAVE: "Cleave",
  GRAZE: "Graze",
  NICK: "Nick",
  PUSH: "Push",
  SAP: "Sap",
  SLOW: "Slow",
  TOPPLE: "Topple",
  VEX: "Vex",
};

export const weaponMasteryDescriptions: Record<WeaponMastery, string> = {
  CLEAVE:
    "Якщо ви влучили по істоті рукопашною атакою, ви можете здійснити ще одну атаку по іншій істоті в межах 5 фт від неї.",
  GRAZE:
    "Якщо ви промахнулися рукопашною атакою цією зброєю, ви все одно завдаєте шкоди, рівної модифікатору характеристики атаки.",
  NICK:
    "Ви можете здійснити додаткову атаку другою легкою зброєю в межах основної дії Атака замість використання бонусної дії.",
  PUSH: "При влученні по істоті розміру не більше за Велику ви можете відштовхнути її на відстань до 10 футів.",
  SAP: "При влученні ціль отримує перешкоду (Disadvantage) на наступний кидок атаки до початку вашого наступного ходу.",
  SLOW: "При влученні швидкість істоти зменшується на 10 футів до початку вашого наступного ходу.",
  TOPPLE:
    "При влученні ціль повинна пройти рятівний кидок Статури (СК 8 + бонус майстерності + мод. атаки) або бути збитою з ніг (Prone).",
  VEX: "При влученні ви отримуєте перевагу (Advantage) на наступний кидок атаки по цій істоті до кінця вашого наступного ходу.",
};

export function isWeaponMastery(value: unknown): value is WeaponMastery {
  return typeof value === "string" && value in weaponMasteryNames;
}

export function findWeaponMasteryName(value: unknown): string | null {
  return isWeaponMastery(value) ? weaponMasteryNames[value] : null;
}

/** «Розмах (Cleave)» — так властивість підписана всюди: у каталозі, фільтрі й листі персонажа. */
export function formatWeaponMasteryLabel(value: unknown): string | null {
  return isWeaponMastery(value) ? `${weaponMasteryNames[value]} (${weaponMasteryEngNames[value]})` : null;
}

export function findWeaponMasteryDescription(value: unknown): string | null {
  return isWeaponMastery(value) ? weaponMasteryDescriptions[value] : null;
}
