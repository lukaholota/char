-- KR22.3 — активна звірина форма й хіти звіра. Owner apply only. Ніякого prisma migrate / db push (Р2).
-- Агент застосував це лише до spells_test через ./scripts/apply-db-change.sh.
-- Спека: docs/o22-content-static-user-live/kr22.3-wildshape.md
--
-- Доповнює db/changes/2026-08-29-kr22.2-pers-wildshape.sql. Дві колонки:
--
--   current_hp — хіти звіра в цій формі. Дика форма 2014 дає формі власні хіти, і персонаж,
--                який закрив вкладку посеред бою, мусить знайти їх на місці. NULL = форма
--                зараз не активна й хітів не має.
--   is_active  — персонаж просто зараз у цій формі.
--
-- Чому is_active тут, а не pers.active_wildshape_id: колонка на pers дала б круговий FK
-- (pers → pers_wildshape → pers), а з ним ускладнюється і видалення персонажа, і клонування
-- у снепшотах. Частковий унікальний індекс тримає інваріант «форма щонайбільше одна» так само
-- надійно, і робить це в базі, а не в коді.
--
-- Рішення власника 2026-08-29: на листі показуються ОБИДВА стоси хітів — і звіра, і персонажа.
-- Тому хіти персонажа лишаються там, де були (pers.current_hp), і ця зміна їх не чіпає.
--
-- Що це НЕ чіпає: жодної іншої таблиці, жодного наявного стовпця, жодного enum.

ALTER TABLE public.pers_wildshape
    ADD COLUMN current_hp integer,
    ADD COLUMN is_active boolean DEFAULT false NOT NULL;

-- Персонаж може бути щонайбільше в одній формі одночасно.
CREATE UNIQUE INDEX pers_wildshape_one_active_per_pers
    ON public.pers_wildshape USING btree (pers_id)
    WHERE is_active;

-- Після застосування власником:
--   1. bun run db:pull
--   2. bun run test:integration tests/db/wildshape-forms.test.ts
