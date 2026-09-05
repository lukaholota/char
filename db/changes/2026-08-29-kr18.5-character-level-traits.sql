-- KR18.5 — owner apply only. Do not run through Prisma migrate/db push. наклав щойно 19:35 29.08.26
-- Узгоджено власником 2026-08-29 (обидва рішення нижче). ЩЕ НЕ ЗАСТОСОВАНО до робочої бази:
-- перевірено 2026-08-29 по свіжому `db/schema.sql` — `race_trait` там без `level`, а таблиці
-- `race_choice_option_spell` немає взагалі, при тому що `pers_bastion` із KR19.2 у дампі є.
-- `spells_test` синхронізований агентом і DDL там на місці.
--
-- Навіщо. Риси видів 2024 відкриваються за **рівнем персонажа**, а не за рівнем класу
-- (референс §4). Записати цю умову зараз нема куди: у `race_trait` рівня немає, і всі шість
-- рівневих рис лежать у ньому як безумовні, тобто персонаж отримує їх на 1-му рівні.
--
-- Заміряно на spells_test 2026-08-29:
--
--   race_trait                 232 рядки RULES_2014 · 41 рядок RULES_2024 · стовпця рівня немає
--   race_choice_option_trait    69 рядків RULES_2014 · 34 рядки RULES_2024 · стовпця рівня немає
--
-- Шість рис, які зараз видаються на 1-му рівні, а мають на своєму:
--
--   Dragonborn: Draconic Flight (2024)     → рівень персонажа 5
--   Goliath: Large Form (2024)             → 5
--   Aasimar: Celestial Revelation (2024)   → 3
--   Aasimar: Heavenly Wings (2024)         → 3
--   Aasimar: Necrotic Shroud (2024)        → 3
--   Aasimar: Inner Radiance (2024)         → 3
--
-- Три форми прояву аазимара беруться разом із самим Проявом і **не** є вибором під час
-- створення: опис риси прямо каже «ви обираєте варіант під час кожної трансформації».
-- Тому їм потрібен рівень, а не група вибору.


-- ── 1. Рівень на безумовній рисі виду ─────────────────────────────────────────────────────

ALTER TABLE public.race_trait
  ADD COLUMN IF NOT EXISTS level integer DEFAULT 1 NOT NULL;

COMMENT ON COLUMN public.race_trait.level IS
  'Рівень ПЕРСОНАЖА, з якого риса виду доступна (2024: Драконячий політ 5, Прояв небожителя 3). 1 — риса з першого рівня, усі дані 2014.';

-- DEFAULT 1 означає, що всі 232 наявні рядки 2014 і 35 рядків 2024 без рівня лишаються
-- рисами першого рівня. Жоден наявний персонаж не змінюється: рівень читає лише гілка
-- RULES_2024, і для рівня 1 вона поводиться так само, як код до цієї зміни.


-- ── 2. Рівневі заклинання родоводу ────────────────────────────────────────────────────────
--
-- Ось те, чого документ KR18.5 не врахував. Заклинання родоводу висять НЕ на `race_trait`,
-- а на опції вибору: `race_choice_option` → `race_choice_option_trait` → `feature` →
-- `_FeatureToSpell`. Рівня немає в жодній ланці цього ланцюга, і додати його на
-- `race_choice_option_trait` замало: зв'язок «фіча ↔ заклинання» — неявний m2m Prisma
-- (`_FeatureToSpell`), у ньому немає й не може бути власного стовпця.
--
-- Книга описує це таблицею: у рядку родоводу три колонки — Level 1, Level 3, Level 5, і в
-- двох останніх стоїть просто назва заклинання, без окремої риси. Ця таблиця й переноситься
-- у базу один в один.
--
--   High Elf      → Detect Magic @3,  Misty Step @5
--   Drow          → Faerie Fire  @3,  Darkness @5
--   Wood Elf      → Longstrider  @3,  Pass without Trace @5
--   Chthonic      → False Life   @3,  Ray of Enfeeblement @5
--   Abyssal       → Ray of Sickness @3, Hold Person @5
--   Infernal      → Hellish Rebuke @3, Darkness @5
--
-- Заклинання 1-го рівня сюди НЕ переїжджають: у книзі вони не назви в таблиці, а частина
-- прози «Level 1 benefit», і в базі вони вже лежать на фічі опції (`Elven Lineage: High Elf
-- (2024)` → Штукарство). KR18.4 їх туди поклав, і вони працюють. Тобто ця таблиця відповідає
-- рівно на колонки Level 3 і Level 5, звідси `character_level` без значення за замовчуванням.

CREATE TABLE IF NOT EXISTS public.race_choice_option_spell (
    race_choice_option_spell_id integer NOT NULL,
    option_id integer NOT NULL,
    spell_id integer NOT NULL,
    character_level integer NOT NULL,
    ruleset public."Ruleset" DEFAULT 'RULES_2014'::public."Ruleset" NOT NULL
);

CREATE SEQUENCE IF NOT EXISTS public.race_choice_option_spell_race_choice_option_spell_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.race_choice_option_spell_race_choice_option_spell_id_seq
    OWNED BY public.race_choice_option_spell.race_choice_option_spell_id;

ALTER TABLE ONLY public.race_choice_option_spell
    ALTER COLUMN race_choice_option_spell_id
    SET DEFAULT nextval('public.race_choice_option_spell_race_choice_option_spell_id_seq'::regclass);

ALTER TABLE ONLY public.race_choice_option_spell
    DROP CONSTRAINT IF EXISTS race_choice_option_spell_pkey;
ALTER TABLE ONLY public.race_choice_option_spell
    ADD CONSTRAINT race_choice_option_spell_pkey PRIMARY KEY (race_choice_option_spell_id);

ALTER TABLE ONLY public.race_choice_option_spell
    DROP CONSTRAINT IF EXISTS race_choice_option_spell_option_id_spell_id_key;
ALTER TABLE ONLY public.race_choice_option_spell
    ADD CONSTRAINT race_choice_option_spell_option_id_spell_id_key UNIQUE (option_id, spell_id);

-- Опція — контент, і видалення опції має забирати її заклинання: це не дані персонажа.
ALTER TABLE ONLY public.race_choice_option_spell
    DROP CONSTRAINT IF EXISTS race_choice_option_spell_option_id_fkey;
ALTER TABLE ONLY public.race_choice_option_spell
    ADD CONSTRAINT race_choice_option_spell_option_id_fkey
    FOREIGN KEY (option_id) REFERENCES public.race_choice_option(option_id) ON DELETE CASCADE;

-- Заклинання — теж контент, але посилання на нього не має дозволяти тихо стерти правило:
-- RESTRICT, як 15 каскадів «контент → персонаж» після KR22.1.
ALTER TABLE ONLY public.race_choice_option_spell
    DROP CONSTRAINT IF EXISTS race_choice_option_spell_spell_id_fkey;
ALTER TABLE ONLY public.race_choice_option_spell
    ADD CONSTRAINT race_choice_option_spell_spell_id_fkey
    FOREIGN KEY (spell_id) REFERENCES public.spell(spell_id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS race_choice_option_spell_option_id_idx
    ON public.race_choice_option_spell USING btree (option_id);

COMMENT ON TABLE public.race_choice_option_spell IS
  'Колонки Level 3 і Level 5 таблиці родоводів PHB 2024: заклинання, яке опція виду дає на рівні персонажа вище першого. Заклинання 1-го рівня лежать на фічі опції.';

COMMENT ON COLUMN public.race_choice_option_spell.character_level IS
  'Рівень ПЕРСОНАЖА, з якого заклинання доступне. Значень лише два — 3 і 5.';

-- pers_spell не чіпається. Рівневі заклинання лягають у нього тими самими рядками, що й
-- заклинання 1-го рівня після KR18.4: origin = RACE, source_name = engName риси-джерела,
-- is_prepared = true, обидва exclude_from_*. Обмеження @@unique([pers_id, spell_id]) на
-- 24 942 рядках лишається як є — рівневі заклинання беруться зі skipDuplicates, як і решта.


-- Після застосування власником:
--   1. bun run db:pull
--   2. перевірити в prisma/schema.prisma, що інтроспекція не лишила сирий snake_case:
--      `level Int @default(1)` на RaceTrait, а на новій моделі —
--      `raceChoiceOptionSpellId Int @map("race_choice_option_spell_id")`,
--      `optionId Int @map("option_id")`, `spellId Int @map("spell_id")`,
--      `characterLevel Int @map("character_level")`.
--      Нові стовпці приїжджають сирими; перейменування з @map інтроспекція зберігає
--      (перевірено в KR18.3 і KR18.4). Ці @map уже вписані агентом, тож db:pull має лишити їх
--      як є. УВАГА: інтроспекція клона тягне ще й pers_bastion* із KR19.2, якого в робочій базі
--      немає — тому робити db:pull саме з робочої бази, а не з spells_test.
--   3. bun run seed:species-levels-2024:prod — проставляє рівні й засіває рівневі заклинання.
--
-- `spells_test` синкає агент сам:
--   ./scripts/apply-db-change.sh db/changes/2026-08-29-kr18.5-character-level-traits.sql
