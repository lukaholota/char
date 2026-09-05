-- KR18.4 — owner apply only. Do not run through Prisma migrate/db push.
-- Підготовлено агентом, НЕ застосовано до робочої бази. Чекає на рішення власника.
--
-- Навіщо. Вибори видів 2024 (родовід ельфа, родовід гнома, спадщина тифлінга, драконячий
-- предок, велетенське походження, риса походження Людини) лягають у наявну таблицю
-- `race_choice_option` — та сама, якою 2014 обслуговує Дракононародженого. Бракує рівно
-- трьох речей, яких у ній немає й вивести нізвідки:
--
--   1. Характеристика замовляння. PHB 2024 змушує обрати Інтелект, Мудрість або Харизму
--      для заклинань родоводу (Ельф, Гном, Тифлінг). Це вибір гравця, і його треба
--      зберегти. Зіставляти опцію з характеристикою за українською назвою («Інтелект» →
--      INT) — це те саме зіставлення за назвою, від якого KR18.3 свідомо відмовився.
--
--   2. Англійський ключ опції. `choice_option` має `option_name_eng`, `race_choice_option`
--      не має нічого, крім української назви. Через це ані фікстура приймання, ані майбутній
--      імпорт із SRD не можуть послатися на конкретну опцію інакше, ніж рядком українською.
--
--   3. Зв'язок групи вибору з рисою, якій вона належить. «Ельфійський родовід» — це вибір
--      усередині риси `Elf: Elven Lineage (2024)`. Саме риса, а не група, є джерелом
--      заклинань, і саме її треба назвати в `pers_spell.source_name`, щоб заклинання
--      родоводу не злилися з книгою заклинань класу (§15.3 референсу).
--
-- Усі три стовпці nullable. Жоден із 49 наявних рядків RULES_2014 не змінюється: після
-- застосування вони мають NULL у всіх трьох, і код 2014 їх не читає.
--
-- Чого тут НЕМАЄ і чому. Критерій приймання К16 зараз перевіряє наявність стовпця з
-- характеристикою замовляння на `pers_spell`. Такий стовпець не потрібен: характеристика
-- джерела виводиться з класу (`class.primary_casting_stat`), з обраної опції родоводу
-- (стовпець нижче) або зі списку заклинань риси. Дублювати її в кожному рядку
-- `pers_spell` означало б тримати той самий факт у двох місцях і дати йому розійтися.
-- Якщо власник вирішить інакше, у файл додається четвертий ALTER на `pers_spell`.

BEGIN;

ALTER TABLE public.race_choice_option
  ADD COLUMN IF NOT EXISTS option_name_eng varchar(100),
  ADD COLUMN IF NOT EXISTS spellcasting_ability "Ability",
  ADD COLUMN IF NOT EXISTS trait_feature_id integer;

ALTER TABLE public.race_choice_option
  DROP CONSTRAINT IF EXISTS race_choice_option_trait_feature_id_fkey;

ALTER TABLE public.race_choice_option
  ADD CONSTRAINT race_choice_option_trait_feature_id_fkey
  FOREIGN KEY (trait_feature_id) REFERENCES public.feature(feature_id) ON DELETE SET NULL;

COMMENT ON COLUMN public.race_choice_option.option_name_eng IS
  'Англійський ключ опції (Red, High Elf, Stone''s Endurance). NULL — опція без англійського ключа (усі дані 2014).';

COMMENT ON COLUMN public.race_choice_option.spellcasting_ability IS
  'Характеристика замовляння, яку дає ця опція (вибір Інтелект/Мудрість/Харизма для родоводу 2024). NULL — опція характеристики не задає.';

COMMENT ON COLUMN public.race_choice_option.trait_feature_id IS
  'Риса виду, всередині якої стоїть цей вибір. NULL — вибір не належить жодній рисі.';

COMMIT;

-- Після застосування власником:
--   1. bun run db:pull
--   2. перевірити в prisma/schema.prisma: `optionNameEng String? @map("option_name_eng")`,
--      `spellcastingAbility Ability? @map("spellcasting_ability")`,
--      `traitFeature Feature? @relation(...)`. Інтроспекція привозить нові стовпці сирими —
--      якщо ім'я лишилося в snake_case, додати @map і повторити db:pull (перевірено в KR18.3).
--   3. bun run seed:2024:prod --only raceChoices  — засіває вибори видів 2024.
--
-- `spells_test` синкає агент сам: ./scripts/apply-db-change.sh db/changes/2026-08-29-kr18.4-species-choices.sql
