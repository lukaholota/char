-- 2026-10-17, BUG-035 (Тифлінг, Маммон), частина BUG-037 (Людина, Мітка Переходу) і BUG-039
-- (риса, яку варіант заміщує, лишається на персонажі).
-- Правило: MToF (2014) с. 21 — Літаючий диск Тензера відновлюється коротким або тривалим відпочинком,
-- Арканний замок — лише тривалим; ERLW с. 46 — Мітка Переходу дає швидкість ходьби 35 футів;
-- PHB с. 31 — Варіант людини замінює «Покращення характеристик» людини.
-- Сід уже виправлено: prisma/seed/raceFeatureSeed.ts, prisma/seed/raceVariantSeed.ts,
-- prisma/seed/raceTraits2014.ts, src/lib/generated/creator-content-2014.json.
-- Схема не змінюється, `bun run db:pull` не потрібен.
--
-- Чому SQL, а не сід: `seedRaceFeatures` переписує всі расові фічі з файлу, а `seedRaceVariants`
-- перескладає риси всіх варіантів і стирає три риси Варіанта людини, які веде `seed:race-traits`.
-- Жоден із них на прод не годиться. Тут лише дані Маммона, Мітки Переходу й Варіанта людини.
--
-- Персонажі в проді 2026-10-17 (без користувачів 5 і 967): Маммон 19 (7 гравців), Мітка Переходу 16 (5 гравців).
-- Створення досі не клало рис варіанта на персонажа, тож у жодного з них немає рядка цих рис;
-- блок 5 їх додає з повним запасом (uses_remaining = NULL), блок 6 прибирає з цих персонажів риси,
-- які варіант заміщує (у всіх 19 Маммонів — PHB «Інфернальна спадщина»).
-- Інші спадщини тифлінгів (663 рядки PHB «Інфернальної спадщини») і Варіант людини (1663 рядки
-- «Покращення характеристик» людини) блок 6 не чіпає: у цих персонажів ще немає рис свого варіанта,
-- і без них картка зникла б зовсім. Розширюючи ремонт, міняй список варіантів у блоках 5 і 6 разом.
-- Повторний запуск нічого не змінює.
--
-- Тести гілки читають ці дані з бази. Після злиття застосуй файл і до локальної `spells_test`:
-- `./scripts/apply-db-change.sh docs/night-2026-10-15-rules/mammon-passage-counters-owner-applies.sql`.
-- Якщо `spells_test` переклоновано з проду до того, як власник застосував файл, — застосуй його знову.

BEGIN;

-- 1. Описова картка спадщини більше не тримає лічильник і не обіцяє тривалий відпочинок для обох заклинань.
UPDATE feature
   SET limited_uses_per = NULL,
       description = E'Ви знаєте замовляння <a href="/spells/mage-hand">Магічна рука [Mage Hand]</a>.\n\nЗ 3-го рівня можете один раз накласти <a href="/spells/tensers-floating-disk">Літаючий диск Тензера [Tenser''s Floating Disk]</a> цією здібністю; відновлюєте це використання після завершення короткого або тривалого відпочинку.\n\nЗ 5-го рівня також можете один раз накласти <a href="/spells/arcane-lock">Арканний замок [Arcane Lock]</a> без матеріального компонента цією здібністю; його окреме використання відновлюється після тривалого відпочинку.\n\nХаризма є характеристикою чаротворення для цих заклинань.',
       updated_at = now()
 WHERE eng_name = 'Infernal Legacy (Mammon)' AND ruleset = 'RULES_2014'
   AND (limited_uses_per IS NOT NULL OR description IS DISTINCT FROM E'Ви знаєте замовляння <a href="/spells/mage-hand">Магічна рука [Mage Hand]</a>.\n\nЗ 3-го рівня можете один раз накласти <a href="/spells/tensers-floating-disk">Літаючий диск Тензера [Tenser''s Floating Disk]</a> цією здібністю; відновлюєте це використання після завершення короткого або тривалого відпочинку.\n\nЗ 5-го рівня також можете один раз накласти <a href="/spells/arcane-lock">Арканний замок [Arcane Lock]</a> без матеріального компонента цією здібністю; його окреме використання відновлюється після тривалого відпочинку.\n\nХаризма є характеристикою чаротворення для цих заклинань.');

-- 2. Дві картки-лічильники, по одній на заклинання.
INSERT INTO feature (name, eng_name, description, short_description, display_type,
                     limited_uses_per, uses_count_special, ruleset, updated_at)
VALUES
  (E'Літаючий диск Тензера', E'Infernal Legacy (Mammon): Tenser''s Floating Disk',
   E'З 3-го рівня можете один раз накласти <a href="/spells/tensers-floating-disk">Літаючий диск Тензера [Tenser''s Floating Disk]</a> Пекельною спадщиною (Маммон); відновлюєте це використання після завершення короткого або тривалого відпочинку.\n\nХаризма є характеристикою чаротворення для цього заклинання.',
   E'Один раз з 3-го рівня; відновлюється коротким або тривалим відпочинком.',
   ARRAY['PASSIVE']::"FeatureDisplayType"[], 'SHORT_REST'::"RestType", '[{"lvl":3,"uses":1}]'::jsonb, 'RULES_2014', now()),
  (E'Арканний замок', E'Infernal Legacy (Mammon): Arcane Lock',
   E'З 5-го рівня можете один раз накласти <a href="/spells/arcane-lock">Арканний замок [Arcane Lock]</a> Пекельною спадщиною (Маммон) без матеріального компонента; відновлюєте це використання після завершення тривалого відпочинку.\n\nХаризма є характеристикою чаротворення для цього заклинання.',
   E'Один раз з 5-го рівня, без матеріального компонента; відновлюється тривалим відпочинком.',
   ARRAY['PASSIVE']::"FeatureDisplayType"[], 'LONG_REST'::"RestType", '[{"lvl":5,"uses":1}]'::jsonb, 'RULES_2014', now())
ON CONFLICT (eng_name) DO NOTHING;

INSERT INTO race_variant_trait (race_variant_id, feature_id, ruleset)
SELECT rv.race_variant_id, f.feature_id, 'RULES_2014'
  FROM race_variant rv
  JOIN feature f ON f.eng_name IN ('Infernal Legacy (Mammon): Tenser''s Floating Disk',
                                   'Infernal Legacy (Mammon): Arcane Lock')
 WHERE rv.name::text = 'TIEFLING_MAMMON' AND rv.ruleset = 'RULES_2014'
ON CONFLICT (race_variant_id, feature_id) DO NOTHING;

-- 3. Швидкість Мітки Переходу.
UPDATE race_variant
   SET overrides_race_speed = 35
 WHERE name::text = 'HUMAN_MARK_OF_PASSAGE_EBERRON' AND ruleset = 'RULES_2014'
   AND overrides_race_speed IS DISTINCT FROM 35;

-- 4. Варіант людини заміщує «Покращення характеристик» людини (як спадщини тифлінгів — PHB «Інфернальну спадщину»).
INSERT INTO "_RaceVariantReplacingFeature" ("A", "B")
SELECT f.feature_id, rv.race_variant_id
  FROM race_variant rv
  JOIN feature f ON f.eng_name = 'Human: Ability Score Increase'
 WHERE rv.name::text = 'HUMAN_VARIANT' AND rv.ruleset = 'RULES_2014'
ON CONFLICT DO NOTHING;

-- 5. Наявні персонажі отримують риси свого варіанта — так, як тепер робить створення.
INSERT INTO pers_feature (pers_id, feature_id, uses_remaining)
SELECT link."A", trait.feature_id, NULL
  FROM "_PersToRaceVariant" link
  JOIN race_variant rv ON rv.race_variant_id = link."B"
  JOIN race_variant_trait trait ON trait.race_variant_id = rv.race_variant_id
 WHERE rv.name::text IN ('TIEFLING_MAMMON', 'HUMAN_MARK_OF_PASSAGE_EBERRON') AND rv.ruleset = 'RULES_2014'
ON CONFLICT (pers_id, feature_id) DO NOTHING;

-- 6. І втрачають рису, яку варіант заміщує, — створення й підвищення рівня її більше не дають.
DELETE FROM pers_feature pf
 USING "_PersToRaceVariant" link, race_variant rv, "_RaceVariantReplacingFeature" replaced
 WHERE rv.race_variant_id = link."B" AND replaced."B" = rv.race_variant_id
   AND pf.pers_id = link."A" AND pf.feature_id = replaced."A"
   AND rv.name::text IN ('TIEFLING_MAMMON', 'HUMAN_MARK_OF_PASSAGE_EBERRON') AND rv.ruleset = 'RULES_2014';

COMMIT;

-- Перевірка: у Маммона три риси (описова без відпочинку, диск SHORT_REST, замок LONG_REST),
-- у Мітки Переходу швидкість 35; у кожного персонажа цих варіантів — рядки всіх рис варіанта
-- і жодного рядка заміщеної риси; Варіант людини заміщує «Human: Ability Score Increase».
SELECT rv.name::text AS variant, rv.overrides_race_speed, f.eng_name, f.limited_uses_per::text, f.uses_count_special
  FROM race_variant rv
  JOIN race_variant_trait trait ON trait.race_variant_id = rv.race_variant_id
  JOIN feature f ON f.feature_id = trait.feature_id
 WHERE rv.name::text IN ('TIEFLING_MAMMON', 'HUMAN_MARK_OF_PASSAGE_EBERRON')
 ORDER BY rv.name, trait.race_variant_trait_id;

SELECT rv.name::text AS variant, count(DISTINCT link."A") AS pers, count(pf.pers_feature_id) AS trait_rows
  FROM "_PersToRaceVariant" link
  JOIN race_variant rv ON rv.race_variant_id = link."B"
  JOIN race_variant_trait trait ON trait.race_variant_id = rv.race_variant_id
  LEFT JOIN pers_feature pf ON pf.pers_id = link."A" AND pf.feature_id = trait.feature_id
 WHERE rv.name::text IN ('TIEFLING_MAMMON', 'HUMAN_MARK_OF_PASSAGE_EBERRON')
 GROUP BY rv.name;

SELECT rv.name::text AS variant, f.eng_name AS replaced, count(pf.pers_feature_id) AS still_owned
  FROM race_variant rv
  JOIN "_RaceVariantReplacingFeature" replaced ON replaced."B" = rv.race_variant_id
  JOIN feature f ON f.feature_id = replaced."A"
  LEFT JOIN "_PersToRaceVariant" link ON link."B" = rv.race_variant_id
  LEFT JOIN pers_feature pf ON pf.pers_id = link."A" AND pf.feature_id = replaced."A"
 WHERE rv.name::text IN ('TIEFLING_MAMMON', 'HUMAN_VARIANT') AND rv.ruleset = 'RULES_2014'
 GROUP BY rv.name, f.eng_name;
