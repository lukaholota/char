import { Ability } from "@/lib/prisma-enums";

export const attributes = [
  { eng: Ability.STR, ukr: "Сила" },
  { eng: Ability.DEX, ukr: "Спритність" },
  { eng: Ability.CON, ukr: "Статура" },
  { eng: Ability.INT, ukr: "Інтелект" },
  { eng: Ability.WIS, ukr: "Мудрість" },
  { eng: Ability.CHA, ukr: "Харизма" },
];

export const attributesUrkShort = [
  { eng: Ability.STR, ukr: "СИЛ" },
  { eng: Ability.DEX, ukr: "СПР" },
  { eng: Ability.CON, ukr: "СТА" },
  { eng: Ability.INT, ukr: "ІНТ" },
  { eng: Ability.WIS, ukr: "МУД" },
  { eng: Ability.CHA, ukr: "ХАР" },
];

export const asiSystems = {
  POINT_BUY: "POINT_BUY",
  SIMPLE: "SIMPLE",
  CUSTOM: "CUSTOM",
};

export const asiSystemCopy: Record<string, string> = {
  [asiSystems.POINT_BUY]: "Розподіляйте бюджет очок і отримайте контроль над кожною характеристикою.",
  [asiSystems.SIMPLE]: "Швидкий старт — пересувайте значення вгору та вниз без калькулятора.",
  [asiSystems.CUSTOM]: "Повна свобода: введіть будь-які значення вручну, якщо ви знаєте що робите.",
};
