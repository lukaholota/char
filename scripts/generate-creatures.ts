/**
 * Форма одного запису бестіарію. Каталог 2014 збирає `build-creatures-2014.ts`, каталог 2024 —
 * `build-creatures-2024.ts`; обидва пишуть у `src/lib/generated/`.
 *
 * Тут колись жив ще й генератор із бази, і він був зарядженою міною: писав у той самий шлях, що
 * `build-creatures-2014.ts`, але брав дані з таблиці `creature`, у якій 7 рядків проти 1 183 у
 * каталозі, а збій підключення ловив у `catch { console.warn }` і записував порожній масив із
 * кодом виходу 0. Врятувало лише те, що його не було в жодному npm-скрипті. Прибрано 2026-08-28
 * (STATE.md, дефект №5); імʼя модуля лишилося, бо тип звідси імпортують 20 файлів.
 */

import { Ruleset } from '@prisma/client';

export type GeneratedCreature = {
  creatureId: number;
  name: string;
  nameEng: string;
  size: string;
  type: string;
  alignment: string;
  source: string;
  ac: string;
  hp: string;
  speed: string;
  strength: string;
  dexterity: string;
  constitution: string;
  intelligence: string;
  wisdom: string;
  charisma: string;
  skills: string;
  senses: string;
  languages: string;
  challenge: string;
  damageImmunity: string;
  damageResistance: string;
  conditionImmunity: string;
  savingThrows: string;
  specialAbilities: string;
  actions: string;
  reactions: string;
  legendaryActions: string;
  proficiencyBonus: string;
  description: string;
  lairActions: string;
  lairInfo: string;
  regionEffects: string;
  xp: string;
  ruleset: Ruleset;
  /// Added for the 2024 import (KR12.1), applied to the DB by
  /// db/changes/2026-08-17-kr12.1-creature-2024-columns.sql. Optional because the inherited
  /// 2014 catalog predates them and rows leave them null.
  initiative?: string;
  gear?: string;
  bonusActions?: string;
  damageVulnerability?: string;
  xpInLair?: string;
  imageUrl?: string;
  /// Розміри локального webp (KR12.4) — картка резервує місце під картинку до завантаження.
  imageWidth?: number;
  imageHeight?: number;
  /// Міфічні дії (KR16.3, партія 16). Опційні: у корпусі 2014 їх несе один запис із 935.
  mythicInfo?: string;
  mythicActions?: string;
};
