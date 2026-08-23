-- KR12.1 — owner apply only. Do not run through Prisma migrate/db push.
-- Prepared, NOT applied by the agent. See docs/o12-srd-2024-import/README.md, журнал KR12.1.
--
-- Шість колонок для статблоків 2024. Усі NULLABLE і без DEFAULT — жоден наявний рядок
-- не змінюється, застосування безпечне на живій базі й не потребує вікна простою.
--
-- Чому саме ці шість:
--   initiative           — 2024 друкує ініціативу в шапці статблока, 2014 не друкує взагалі
--   gear                 — нове поле 2024: спорядження, яким істота озброєна
--   bonus_actions        — у 2024 з'явилася окрема секція «Bonus actions»
--   damage_vulnerability — існувало й у 2014, але колонки не було ніколи; через це
--                          `createCreature` мовчки губив поле (баг знайдено в KR11.4)
--   xp_in_lair           — 2024 пише «XP 5,900, or 7,200 in lair»; друге число ніде не зберігалося
--   image_url            — картинка істоти; заповнюється в KR12.4
--
-- Типи навмисно VARCHAR, як і решта колонок `creature`: увесь статблок там зберігається
-- як текст/HTML, окремої структури немає і в цьому KR вона не заводиться.
--
-- Поза цим файлом свідомо лишилися:
--   - `habitat` і `treasure` зі сторінок aidedd. Вони є в даних, але жодне місце застосунку
--     їх поки не читає; заводити колонку під невживане поле — зайвий борг. Повернутися, якщо
--     KR12.2 вирішить показувати середовище у фільтрах бестіарію.
--   - Будь-яка нормалізація дій/рис в окремі таблиці. Це рефакторинг, а не імпорт.
--
-- Після застосування: `bun run db:pull` і коміт згенерованих артефактів.

ALTER TABLE public.creature ADD COLUMN IF NOT EXISTS initiative           VARCHAR;
ALTER TABLE public.creature ADD COLUMN IF NOT EXISTS gear                 VARCHAR;
ALTER TABLE public.creature ADD COLUMN IF NOT EXISTS bonus_actions        VARCHAR;
ALTER TABLE public.creature ADD COLUMN IF NOT EXISTS damage_vulnerability VARCHAR;
ALTER TABLE public.creature ADD COLUMN IF NOT EXISTS xp_in_lair           VARCHAR;
ALTER TABLE public.creature ADD COLUMN IF NOT EXISTS image_url            VARCHAR;

COMMENT ON COLUMN public.creature.initiative           IS 'Статблок 2024: «+7 (17)». У 2014 порожнє.';
COMMENT ON COLUMN public.creature.gear                 IS 'Статблок 2024: спорядження істоти. У 2014 порожнє.';
COMMENT ON COLUMN public.creature.bonus_actions        IS 'Статблок 2024: секція «Бонусні дії», HTML як і решта секцій.';
COMMENT ON COLUMN public.creature.damage_vulnerability IS 'Вразливість до ушкоджень. Є в обох редакціях, колонки бракувало з самого початку.';
COMMENT ON COLUMN public.creature.xp_in_lair           IS 'Друге число CR 2024: «or 7,200 in lair».';
COMMENT ON COLUMN public.creature.image_url            IS 'Картинка істоти. Заповнюється в KR12.4.';
