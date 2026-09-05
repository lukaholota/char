-- KR18.6 — Weapon Mastery. Owner apply only. Ніякого prisma migrate / db push (Р2).
-- Агент застосовує цей файл лише до spells_test через ./scripts/apply-db-change.sh.
-- Спека: docs/o18-2024-character-parity/kr18.6-weapon-mastery.md
--
-- Capacity — контент класу: масив має по одному значенню на кожен рівень класу 1–20.
-- Вибрані види зброї — живі дані персонажа: окрема relation-table з FK на Pers і Weapon.
-- Сам capacity у Pers не дублюється, а щоразу виводиться з class data.

ALTER TABLE public.class
  ADD COLUMN IF NOT EXISTS weapon_mastery_progression integer[] DEFAULT ARRAY[]::integer[] NOT NULL;

COMMENT ON COLUMN public.class.weapon_mastery_progression IS
  'Weapon Mastery capacity за рівнем КЛАСУ: індекс 1 відповідає рівню 1, індекс 20 — рівню 20. Порожній масив означає, що клас не дає майстерності.';

CREATE TABLE IF NOT EXISTS public.pers_weapon_mastery (
    pers_weapon_mastery_id serial PRIMARY KEY,
    pers_id integer NOT NULL,
    weapon_id integer NOT NULL
);

ALTER TABLE ONLY public.pers_weapon_mastery
    DROP CONSTRAINT IF EXISTS pers_weapon_mastery_pers_id_weapon_id_key;
ALTER TABLE ONLY public.pers_weapon_mastery
    ADD CONSTRAINT pers_weapon_mastery_pers_id_weapon_id_key UNIQUE (pers_id, weapon_id);

-- Дочірні живі дані зникають разом із персонажем.
ALTER TABLE ONLY public.pers_weapon_mastery
    DROP CONSTRAINT IF EXISTS pers_weapon_mastery_pers_id_fkey;
ALTER TABLE ONLY public.pers_weapon_mastery
    ADD CONSTRAINT pers_weapon_mastery_pers_id_fkey FOREIGN KEY (pers_id)
    REFERENCES public.pers(pers_id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Weapon — контент, на який уже посилається персонаж. Видалення контенту не має мовчки
-- забирати живий вибір; той самий напрямок RESTRICT за Р25 і KR22.1.
ALTER TABLE ONLY public.pers_weapon_mastery
    DROP CONSTRAINT IF EXISTS pers_weapon_mastery_weapon_id_fkey;
ALTER TABLE ONLY public.pers_weapon_mastery
    ADD CONSTRAINT pers_weapon_mastery_weapon_id_fkey FOREIGN KEY (weapon_id)
    REFERENCES public.weapon(weapon_id) ON UPDATE CASCADE ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS pers_weapon_mastery_weapon_id_idx
    ON public.pers_weapon_mastery USING btree (weapon_id);

COMMENT ON TABLE public.pers_weapon_mastery IS
  'Види зброї, для яких персонаж 2024 може використовувати mastery property. Ліміт береться з class.weapon_mastery_progression, а не з цієї таблиці.';

-- ЗАСТОСОВАНО власником до робочої бази 2026-08-30, bun run db:pull зроблено.
-- Інтроспекція лишила snake_case (як у pers_wildshape / pers_bastion): модель
-- pers_weapon_mastery і колонка class.weapon_mastery_progression. Це навмисно — schema.prisma
-- генерована, руками її не правлять.
--
-- Лишилося на робочій базі:
--   1. bun run seed:2024:prod            -- прогресії класів + виправлені володіння Шахрая й Монаха
--   2. bun run generate:creator-content  -- без нього конструктор не побачить прогресії й не покаже крок
--
-- spells_test синхронізовано агентом 2026-08-30 (DDL + seed:2024:test).
