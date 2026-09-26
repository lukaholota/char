-- O45 — Мисливець за кровʼю (Blood Hunter, Метт Мерсер, 2020) в обох редакціях.
-- Лише нові значення enum: нічого не видаляє й не змінює наявні рядки.
-- Застосовує власник до робочої бази; клон — scripts/apply-db-change.sh.

ALTER TYPE public."Classes" ADD VALUE IF NOT EXISTS 'BLOOD_HUNTER_2014';
ALTER TYPE public."Classes" ADD VALUE IF NOT EXISTS 'BLOOD_HUNTER_2024';

ALTER TYPE public."Subclasses" ADD VALUE IF NOT EXISTS 'ORDER_OF_THE_GHOSTSLAYER';
ALTER TYPE public."Subclasses" ADD VALUE IF NOT EXISTS 'ORDER_OF_THE_LYCAN';
ALTER TYPE public."Subclasses" ADD VALUE IF NOT EXISTS 'ORDER_OF_THE_MUTANT';
ALTER TYPE public."Subclasses" ADD VALUE IF NOT EXISTS 'ORDER_OF_THE_PROFANE_SOUL';
