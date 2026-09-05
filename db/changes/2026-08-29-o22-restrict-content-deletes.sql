-- KR22.1 — owner apply only. Do not run through Prisma migrate/db push.
-- Підготовлено агентом 2026-08-29. Застосовано до spells_test тим самим агентом.
--
-- Чому. Персонаж посилається на контент 15 явними зовнішніми ключами, і ВСІ вони
-- ON DELETE CASCADE. Тобто:
--
--   DELETE FROM class WHERE class_id = 3;   -- зносить УСІХ персонажів цього класу
--   DELETE FROM spell WHERE spell_id = …;   -- виймає заклинання з 24 942 списків
--
-- Це робить будь-який перезасів контенту потенційним знищенням даних користувачів,
-- і саме тому міна 472/248 у магічних предметах була такою страшною: не «каталог
-- схлопнеться», а «персонажі можуть поїхати разом із ним».
--
-- Чому це безпечно. Єдине місце в усьому коді, яке видаляє контентний рядок, —
-- prisma/seed/spellDuplicateMerge2014.ts:51 (`prisma.spell.delete`). Воно вже
-- перепризначає pers_spell і join-рядки ДО видалення, тобто не спирається на каскад.
-- RESTRICT його не ламає — RESTRICT його підтверджує. Перевірено грепом по
-- prisma/, scripts/ і src/: інших видалень контентних батьків немає.
--
-- Що НЕ чіпаємо. П'ять неявних m2m-таблиць Prisma (_PersToSpell, _ChoiceOptionToPers,
-- _ClassOptionalFeatureToPers, _PersToRaceChoiceOption, _PersToRaceVariant) лишаються
-- на CASCADE. Їхні констрейнти генерує Prisma, у schema.prisma їх не можна виразити,
-- і `db pull` розбіжність не покаже — тобто зміна там дрейфувала б мовчки. Втрата
-- рядка в join-таблиці до того ж не видаляє персонажа.
--
-- Що це змінює для сідів. Нічого сьогодні. Завтра — видалення контентного рядка
-- падає з 23503 замість того, щоб тихо забрати персонажів із собою. Це і є мета.

BEGIN;

-- 1. Персонаж цілком: ці п'ять каскадів видаляють рядок `pers`.

ALTER TABLE public.pers DROP CONSTRAINT pers_background_id_fkey;
ALTER TABLE public.pers ADD CONSTRAINT pers_background_id_fkey
  FOREIGN KEY (background_id) REFERENCES public.background(background_id)
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.pers DROP CONSTRAINT pers_class_id_fkey;
ALTER TABLE public.pers ADD CONSTRAINT pers_class_id_fkey
  FOREIGN KEY (class_id) REFERENCES public.class(class_id)
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.pers DROP CONSTRAINT pers_race_id_fkey;
ALTER TABLE public.pers ADD CONSTRAINT pers_race_id_fkey
  FOREIGN KEY (race_id) REFERENCES public.race(race_id)
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.pers DROP CONSTRAINT pers_subclass_id_fkey;
ALTER TABLE public.pers ADD CONSTRAINT pers_subclass_id_fkey
  FOREIGN KEY (subclass_id) REFERENCES public.subclass(subclass_id)
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.pers DROP CONSTRAINT pers_subrace_id_fkey;
ALTER TABLE public.pers ADD CONSTRAINT pers_subrace_id_fkey
  FOREIGN KEY (subrace_id) REFERENCES public.subrace(subrace_id)
  ON UPDATE CASCADE ON DELETE RESTRICT;

-- 2. Рядок у списку персонажа: заклинання, риси, предмети, спорядження.

ALTER TABLE public.pers_armor DROP CONSTRAINT pers_armor_armor_id_fkey;
ALTER TABLE public.pers_armor ADD CONSTRAINT pers_armor_armor_id_fkey
  FOREIGN KEY (armor_id) REFERENCES public.armor(armor_id)
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.pers_feat DROP CONSTRAINT pers_feat_feat_id_fkey;
ALTER TABLE public.pers_feat ADD CONSTRAINT pers_feat_feat_id_fkey
  FOREIGN KEY (feat_id) REFERENCES public.feat(feat_id)
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.pers_feat_choice DROP CONSTRAINT pers_feat_choice_choice_option_id_fkey;
ALTER TABLE public.pers_feat_choice ADD CONSTRAINT pers_feat_choice_choice_option_id_fkey
  FOREIGN KEY (choice_option_id) REFERENCES public.choice_option(option_id)
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.pers_feature DROP CONSTRAINT pers_feature_feature_id_fkey;
ALTER TABLE public.pers_feature ADD CONSTRAINT pers_feature_feature_id_fkey
  FOREIGN KEY (feature_id) REFERENCES public.feature(feature_id)
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.pers_infusion DROP CONSTRAINT pers_infusion_infusion_id_fkey;
ALTER TABLE public.pers_infusion ADD CONSTRAINT pers_infusion_infusion_id_fkey
  FOREIGN KEY (infusion_id) REFERENCES public.infusion(infusion_id)
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.pers_magic_item DROP CONSTRAINT pers_magic_item_magic_item_id_fkey;
ALTER TABLE public.pers_magic_item ADD CONSTRAINT pers_magic_item_magic_item_id_fkey
  FOREIGN KEY (magic_item_id) REFERENCES public.magic_item(magic_item_id)
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.pers_multiclass DROP CONSTRAINT pers_multiclass_class_id_fkey;
ALTER TABLE public.pers_multiclass ADD CONSTRAINT pers_multiclass_class_id_fkey
  FOREIGN KEY (class_id) REFERENCES public.class(class_id)
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.pers_multiclass DROP CONSTRAINT pers_multiclass_subclass_id_fkey;
ALTER TABLE public.pers_multiclass ADD CONSTRAINT pers_multiclass_subclass_id_fkey
  FOREIGN KEY (subclass_id) REFERENCES public.subclass(subclass_id)
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.pers_spell DROP CONSTRAINT pers_spell_spell_id_fkey;
ALTER TABLE public.pers_spell ADD CONSTRAINT pers_spell_spell_id_fkey
  FOREIGN KEY (spell_id) REFERENCES public.spell(spell_id)
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.pers_weapon DROP CONSTRAINT pers_weapon_weapon_id_fkey;
ALTER TABLE public.pers_weapon ADD CONSTRAINT pers_weapon_weapon_id_fkey
  FOREIGN KEY (weapon_id) REFERENCES public.weapon(weapon_id)
  ON UPDATE CASCADE ON DELETE RESTRICT;

COMMIT;

-- Після застосування власником:
--   1. bun run db:pull
--   2. у prisma/schema.prisma 15 звʼязків мають стати onDelete: Restrict
--   3. bun run test tests/integration/content-delete-restricted.test.ts
