-- KR31.5 — «завжди підготовлені» заклинання підкласів 2024.
--
-- Книга дає їх таблицею «рівень класу → перелік заклинань» усередині однієї фічі (Домен життя:
-- 3 → Aid, Bless, Cure Wounds, Lesser Restoration; 5 → Mass Healing Word, Revivify; …). Рівень —
-- властивість пари «підклас + заклинання», тому неявний m2m `_SubclassExpandedSpells` (без колонок)
-- і `_FeatureToSpell` її не несуть: одна фіча «Life Domain Spells» відповідає за чотири рівні.
--
-- Форма повторює наявну `race_choice_option_spell`, яка вже несе `character_level` для заклинань
-- родоводу: та сама трійка «носій + заклинання + рівень», той самий `ruleset`, ті самі правила
-- видалення — підклас зникає разом зі своїми рядками, заклинання видалити не можна, поки на нього
-- посилаються ([Р28](docs/DECISIONS.md#р28)).
--
-- Порядок кроків:
--   1) власник застосовує цей файл до робочої бази;
--   2) bun run db:pull  → оновлює prisma/schema.prisma, клієнт і db/schema.sql;
--   3) bun run seed:subclass-spells-2024:prod  → заповнює 34 підкласи з
--      data/2024/normalized/subclasses.json.
-- Клон spells_test синкає агент через ./scripts/apply-db-change.sh.

CREATE TABLE IF NOT EXISTS "subclass_spell" (
    "subclass_spell_id" SERIAL PRIMARY KEY,
    "subclass_id" INTEGER NOT NULL,
    "spell_id" INTEGER NOT NULL,
    "class_level" INTEGER NOT NULL,
    "ruleset" public."Ruleset" DEFAULT 'RULES_2014'::public."Ruleset" NOT NULL
);

ALTER TABLE "subclass_spell"
    DROP CONSTRAINT IF EXISTS "subclass_spell_subclass_id_spell_id_key";
ALTER TABLE "subclass_spell"
    ADD CONSTRAINT "subclass_spell_subclass_id_spell_id_key" UNIQUE ("subclass_id", "spell_id");

ALTER TABLE "subclass_spell"
    DROP CONSTRAINT IF EXISTS "subclass_spell_subclass_id_fkey";
ALTER TABLE "subclass_spell"
    ADD CONSTRAINT "subclass_spell_subclass_id_fkey" FOREIGN KEY ("subclass_id")
    REFERENCES "subclass"("subclass_id") ON DELETE CASCADE;

ALTER TABLE "subclass_spell"
    DROP CONSTRAINT IF EXISTS "subclass_spell_spell_id_fkey";
ALTER TABLE "subclass_spell"
    ADD CONSTRAINT "subclass_spell_spell_id_fkey" FOREIGN KEY ("spell_id")
    REFERENCES "spell"("spell_id") ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS "subclass_spell_subclass_id_idx" ON "subclass_spell" ("subclass_id");
