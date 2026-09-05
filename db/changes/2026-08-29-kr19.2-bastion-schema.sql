-- KR19.2 — схема бастіону (O19). Owner apply only. Ніякого prisma migrate / db push (Р2).
-- Агент застосував це лише до spells_test через ./scripts/apply-db-change.sh.
-- Спека: docs/o19-bastions/kr19.2-bastion-foundation.md
--
-- Бастіон у цьому продукті — трекер стану бази персонажа, а не рушій (Р26). Тому в базі лежить
-- рівно те, чого не знає статичний каталог: чий бастіон, як зветься, які приміщення обрані і
-- що гравець про них записав. Правила, тексти, дозволені накази, передумови й розміри
-- лишаються в каталозі KR19.1 (src/lib/generated/bastions.json).
--
-- Дві таблиці, два enum-и. Попередня редакція цього файла мала п'ять таблиць — найманці, ходи
-- й накази ходу окремими сутностями; вона не застосовувалася ніде, крім клона, і замінена
-- цією після перегляду scope власником.
--
-- Що це НЕ чіпає: жодної наявної таблиці, стовпця чи enum — тільки CREATE. Персонаж без
-- бастіону просто не має рядка.
--
-- Посилання на каталог — slug, а не зовнішній ключ: контент статичний і в базі його немає (Р25).

-- ============================================================================
-- Enum-и. Значення = ключі ратифікованих мап у src/lib/refs/translation.ts
-- (bastionSpaceTranslations, bastionOrderTranslations), щоб база й словник не розходилися.
-- ============================================================================

CREATE TYPE public."BastionSpace" AS ENUM ('CRAMPED', 'ROOMY', 'VAST');

-- MAINTAIN немає в полі orders жодного з 61 приміщення каталогу: за джерелом він видається
-- бастіону в цілому («as if you had issued the Maintain order to your Bastion»). У переліку
-- він є, бо гравець його бачить і записує.
CREATE TYPE public."BastionOrder" AS ENUM (
  'CRAFT', 'EMPOWER', 'HARVEST', 'MAINTAIN', 'RECRUIT', 'RESEARCH', 'TRADE'
);

-- ============================================================================
-- Бастіон — один на персонажа
-- ============================================================================

-- description — антураж (вежа, замок, храм, таверна, лігво…) вільним текстом: за §9 референсу
-- форма бастіону майже повністю fluff, enum тут був би вигадкою без механічного значення.
-- notes — робочий блокнот гравця; description показується під назвою, notes живуть окремо.
CREATE TABLE public.pers_bastion (
    pers_bastion_id serial PRIMARY KEY,
    pers_id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text DEFAULT '' NOT NULL,
    notes text DEFAULT '' NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE ONLY public.pers_bastion
    ADD CONSTRAINT pers_bastion_pers_id_fkey FOREIGN KEY (pers_id)
    REFERENCES public.pers(pers_id) ON UPDATE CASCADE ON DELETE CASCADE;

CREATE UNIQUE INDEX pers_bastion_pers_id_key ON public.pers_bastion USING btree (pers_id);

-- ============================================================================
-- Приміщення бастіону
-- ============================================================================

-- facility_slug — ключ каталогу KR19.1. FK неможливий і не потрібен: каталог статичний, у базі
-- його немає (Р25). Зникле з каталогу приміщення має дати «недоступне», а не мовчки випасти.
--
-- space — не копія каталогу, а вибір гравця: усі 6 базових приміщень каталог дозволяє зробити
-- тісними, просторими або розлогими, а 9 спеціальних (archive, barrack, infirmary, workshop,
-- stable, pub, garden, museum, cult-of-the-dragon-archive) можна збільшити до розлогого за
-- 2 000 зл, і це міняє механіку (розлога казарма — 25 захисників замість 12). Для решти 46
-- каталог дає рівно один варіант, і пікер проставляє його мовчки.
--
-- current_order / defenders / hirelings — стан трекера. Пише в них KR19.4; колонки заведені
-- одразу свідомо, щоб власник не застосовував DDL двічі заради трьох полів, форма яких уже
-- визначена правилами.
--
-- Унікальності (pers_bastion_id, facility_slug) немає: «A Bastion can have more than one
-- Barrack», і базових приміщень одного типу теж може бути кілька.
--
-- Ліміт спеціальних приміщень (2/4/5/6 за рівнем персонажа) у базі НЕ форсується: за Р26
-- правила тут — підказка, а не заборона; UI показує «3 / 2 ⚠» і дозволяє операцію.
CREATE TABLE public.pers_bastion_facility (
    pers_bastion_facility_id serial PRIMARY KEY,
    pers_bastion_id integer NOT NULL,
    facility_slug text NOT NULL,
    space public."BastionSpace" NOT NULL,
    current_order public."BastionOrder",
    defenders integer DEFAULT 0 NOT NULL,
    hirelings text DEFAULT '' NOT NULL,
    notes text DEFAULT '' NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pers_bastion_facility_defenders_check CHECK (defenders >= 0)
);

ALTER TABLE ONLY public.pers_bastion_facility
    ADD CONSTRAINT pers_bastion_facility_pers_bastion_id_fkey FOREIGN KEY (pers_bastion_id)
    REFERENCES public.pers_bastion(pers_bastion_id) ON UPDATE CASCADE ON DELETE CASCADE;

CREATE INDEX pers_bastion_facility_pers_bastion_id_idx
    ON public.pers_bastion_facility USING btree (pers_bastion_id);
