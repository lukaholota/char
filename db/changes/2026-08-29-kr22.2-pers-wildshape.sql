-- KR22.2 — прикріплені форми перевтілення. Owner apply only. Ніякого prisma migrate / db push (Р2).
-- Агент застосував це лише до spells_test через ./scripts/apply-db-change.sh.
-- Спека: docs/o22-content-static-user-live/kr22.2-content-references.md
--
-- Це перша сутність, яка посилається на істоту, — тобто рівно те, що Р15 називав критерієм
-- переїзду істот у базу. Критерій уточнено в Р25: питання не «чи посилаємось», а «чи потрібна
-- референційна цілісність із каскадом». Тут не потрібна:
--
--   * статблок другої форми малюється з src/lib/generated/creatures.json — він у git (Р23) і
--     бази для рендеру не потребує;
--   * прикріплених форм у друїда 3–10, а істот у каталозі 1 489 — переливати каталог у базу
--     заради цього списку дорожче за все, що воно дає;
--   * каскад тут ШКІДЛИВИЙ по суті: якщо істота випаде з каталогу, друїд має побачити «форма
--     недоступна», а не мовчки її втратити.
--
-- Тому creature_key — текст без FK, за тим самим патерном, що facility_slug у pers_bastion_facility
-- (KR19.2). Звірку робить код, не база.
--
-- Ключ — це toEntitySlug(nameEng) з src/lib/slug-utils.ts, той самий, яким уже адресуються
-- сторінки бестіарію (/2024/bestiary/<slug>). Він довговічний: creatureId пінить
-- data/aidedd/import-manifest.json, а не автоінкремент на кожній збірці.
--
-- Що це НЕ чіпає: жодної наявної таблиці, жодного стовпця, жодного enum. Тільки CREATE.

CREATE TABLE public.pers_wildshape (
    pers_wildshape_id serial PRIMARY KEY,
    pers_id integer NOT NULL,
    creature_key character varying(200) NOT NULL,
    ruleset public."Ruleset" DEFAULT 'RULES_2014'::public."Ruleset" NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    notes text DEFAULT '' NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Каскад на pers правильний і лишається: це дані користувача, вони належать персонажу.
ALTER TABLE ONLY public.pers_wildshape
    ADD CONSTRAINT pers_wildshape_pers_id_fkey FOREIGN KEY (pers_id)
    REFERENCES public.pers(pers_id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Одна істота прикріплюється до персонажа один раз. Редакція входить у ключ, бо та сама
-- назва існує у двох каталогах двома різними записами (Р17).
CREATE UNIQUE INDEX pers_wildshape_pers_id_creature_key_ruleset_key
    ON public.pers_wildshape USING btree (pers_id, creature_key, ruleset);

-- Листинг завжди йде за персонажем.
CREATE INDEX pers_wildshape_pers_id_idx ON public.pers_wildshape USING btree (pers_id);

-- Після застосування власником:
--   1. bun run db:pull
--   2. bun run test:integration tests/db/wildshape-forms.test.ts
