-- O49, 2026-10-10: кобольд MPMM, «Драконяча винахідливість» не давала вибору навички (BUG-015): skill_proficiencies порожнє.
-- Правило MPMM: Arcana, Investigation, Medicine, Sleight of Hand або Survival. Також виправлено тексти (Спритність рук замість Історії; список чаклуна замість чарівника).
-- Сід (prisma/seed/raceChoiceOptionSeed.ts, raceFeatureSeed.ts) уже виправлено в робочому дереві. Після застосування: `bun run db:pull`.
BEGIN;
UPDATE race_choice_option o
   SET skill_proficiencies = '{"choiceCount":1,"options":["ARCANA","INVESTIGATION","MEDICINE","SLEIGHT_OF_HAND","SURVIVAL"]}'::jsonb,
       description = $d$Ви отримуєте володіння однією з навичок: Магія, Розслідування, Медицина, Спритність рук або Виживання.$d$
  FROM race r
 WHERE o.race_id = r.race_id AND r.name::text = 'KOBOLD_MPMM' AND r.ruleset = 'RULES_2014'
   AND o.option_name = 'Драконяча винахідливість' AND o.ruleset = 'RULES_2014';
UPDATE race_choice_option o
   SET description = $d$Ви знаєте одне замовляння на ваш вибір зі списку заклинань чаклуна.$d$
  FROM race r
 WHERE o.race_id = r.race_id AND r.name::text = 'KOBOLD_MPMM' AND r.ruleset = 'RULES_2014'
   AND o.option_name = 'Драконяче чаклунство' AND o.ruleset = 'RULES_2014';
UPDATE feature
   SET description = $d$Ви успадкували частину драконячої магії. Оберіть один із наступних варіантів:

• Драконяча винахідливість (Craftiness): Ви отримуєте володіння однією з навичок: Магія, Розслідування, Медицина, Спритність рук або Виживання.

• Непокора (Defiance): Ви маєте <a href="/rules/abilities#advantage-and-disadvantage--advantage-and-disadvantage">перевагу</a> на ряткидки для уникнення або завершення стану Переляканості на собі.

• Драконяче чаклунство (Draconic Sorcery): Ви знаєте одне замовляння на ваш вибір зі списку заклинань Чародія. Інтелект, Мудрість або Харизма є вашою характеристикою для нього (оберіть при виборі раси).$d$
 WHERE eng_name = 'Kobold Legacy' AND ruleset = 'RULES_2014';
COMMIT;
