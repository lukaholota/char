-- Група «Бойові маневри»: 16 опцій 2014 з англійськими назвами, яких немає в жодному сіді.
-- Маневри 2014 живуть у групі «Маневри майстра бою» (prisma/seed/subclassChoiceOptionSeed.ts).
-- На ці рядки не посилається ні персонаж, ні клас, ні підклас, ні риса — звірено на робочій
-- базі 2026-09-26. Скрипт падає, якщо посилання зʼявилося.

BEGIN;

DO $$
DECLARE
    referenced integer;
BEGIN
    SELECT (SELECT count(*) FROM "_ChoiceOptionToPers" WHERE "A" IN (SELECT option_id FROM choice_option WHERE group_name = 'Бойові маневри'))
         + (SELECT count(*) FROM subclass_choice_option WHERE option_id IN (SELECT option_id FROM choice_option WHERE group_name = 'Бойові маневри'))
         + (SELECT count(*) FROM class_choice_option WHERE option_id IN (SELECT option_id FROM choice_option WHERE group_name = 'Бойові маневри'))
         + (SELECT count(*) FROM feat_choice_option WHERE option_id IN (SELECT option_id FROM choice_option WHERE group_name = 'Бойові маневри'))
         + (SELECT count(*) FROM pers_feat_choice WHERE choice_option_id IN (SELECT option_id FROM choice_option WHERE group_name = 'Бойові маневри'))
         + (SELECT count(*) FROM choice_option_feature WHERE option_id IN (SELECT option_id FROM choice_option WHERE group_name = 'Бойові маневри'))
         + (SELECT count(*) FROM "_ChoiceOptionToClassOptionalFeature" WHERE "A" IN (SELECT option_id FROM choice_option WHERE group_name = 'Бойові маневри'))
      INTO referenced;
    IF referenced > 0 THEN
        RAISE EXCEPTION 'На групу «Бойові маневри» є % посилань — не видаляю', referenced;
    END IF;
END $$;

DELETE FROM choice_option WHERE group_name = 'Бойові маневри' AND ruleset = 'RULES_2014';

COMMIT;
