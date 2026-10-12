-- O49, 2026-10-10: передісторія «Детектив» (VRGR, Investigator), крок 2 з 2: сам рядок. Потребує кроку 1.
-- Застосовувати лише ПІСЛЯ деплою коду, зібраного з оновленою схемою (крок 1 → db:pull → деплой): задеплоєний Prisma-клієнт
-- не знає 'INVESTIGATOR_VRGTR' і падає на будь-якому читанні каталогу передісторій, що поверне цей рядок.
-- Правила (5etools backgrounds.json, VRGR с. 35): дві навички на вибір з Аналізу поведінки, Розслідування й Уважності; інструменти — набір для маскування й інструменти злодія;
-- спорядження — збільшувальне скло, доказ зі справи, звичайний одяг, 10 зм; особливість «Official Inquiry» (назва лишається англійською, доки власник не погодить український відповідник).
-- Після застосування: `bun run db:pull`; далі в коді додаються переклад ключа INVESTIGATOR_VRGTR, рядок сіду й оновлення каталогу (див. docs/o49-rpgbot-analysis/detective-background-vrgr-followup.md).
BEGIN;
INSERT INTO background (name, source, tool_proficiencies, languages_to_choose_count, items, description, "specialAbilityName", skill_proficiencies, ruleset)
SELECT 'INVESTIGATOR_VRGTR', 'VRGTR', ARRAY['DISGUISE_KIT', 'THIEVES_TOOLS']::"ToolCategory"[], 0,
       '[{"name": "Збільшувальне скло", "quantity": 1}, {"name": "Доказ зі справи, яку ви розслідували раніше", "quantity": 1}, {"name": "Звичайний одяг", "quantity": 1}, {"name": "зм", "quantity": 10}]'::jsonb,
       $d$Ви вмієте отримувати доступ до людей і місць, щоб дізнатися потрібне. Поєднавши швидку мову, наполегливість і офіційно виглядаючі документи, ви можете потрапити до місця чи до людини, повʼязаних зі злочином, який розслідуєте. Ті, хто не причетний до вашого розслідування, не стають на заваді або передають ваші прохання далі. Крім того, місцева поліція має про вас чітку думку: вважає вас або набридливою перешкодою, або своїм.$d$,
       'Official Inquiry', '{"choices": ["INSIGHT", "INVESTIGATION", "PERCEPTION"], "choiceCount": 2}'::jsonb, 'RULES_2014'
WHERE NOT EXISTS (SELECT 1 FROM background WHERE name::text = 'INVESTIGATOR_VRGTR' AND ruleset = 'RULES_2014');
COMMIT;
