-- Очки чар (варіант ДМГ): витрачені очки героя; запас рахується з комірок класу, довгий відпочинок обнуляє.
ALTER TABLE pers ADD COLUMN spell_points_spent integer DEFAULT 0 NOT NULL;
