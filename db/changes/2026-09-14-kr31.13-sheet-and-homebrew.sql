-- KR31.13 — налаштовність листа й хоумбрю. Рішення власника 2026-09-14.
--
-- 1. pers_feat.grants — що саме дала риса при набутті, щоб видалення риси могло це відкотити.
--    NULL у 4 526 наявних рядків: для них відкат рахується з обраних опцій.
-- 2. pers_feature_description — власний опис гравця поверх будь-якої фічі на листі.
--    kind: FEATURE (feature_id), FEAT (feat_id), INFUSION (pers_infusion_id).
-- 3. pers.portrait_key — ключ WebP у Cloudflare R2 (бакет char-media); картинка істоти хоумбрю —
--    stat_block.imageUrl, як у creatures.json. Самі файли в базі не лежать: інакше кожен погодинний
--    дамп ріс би на весь обсяг картинок.
-- 4. homebrew_* — власні заклинання й істоти користувачів, голоси й коментарі.
--
-- Порядок: власник застосовує файл до робочої бази ДО деплою коду, потім bun run db:pull.
-- Лише нові таблиці й nullable-стовпці: старий код їх не помічає, вікна немає.

ALTER TABLE "pers_feat" ADD COLUMN IF NOT EXISTS "grants" JSONB;

CREATE TABLE IF NOT EXISTS "pers_feature_description" (
  "pers_feature_description_id" SERIAL PRIMARY KEY,
  "pers_id" INTEGER NOT NULL REFERENCES "pers" ("pers_id") ON DELETE CASCADE,
  "kind" VARCHAR(16) NOT NULL CHECK ("kind" IN ('FEATURE', 'FEAT', 'INFUSION')),
  "ref_id" INTEGER NOT NULL,
  "description" TEXT NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("pers_id", "kind", "ref_id")
);

ALTER TABLE "pers" ADD COLUMN IF NOT EXISTS "portrait_key" VARCHAR(255);

CREATE TABLE IF NOT EXISTS "homebrew_entry" (
  "homebrew_entry_id" SERIAL PRIMARY KEY,
  "kind" VARCHAR(16) NOT NULL CHECK ("kind" IN ('SPELL', 'CREATURE')),
  "author_user_id" INTEGER NOT NULL REFERENCES "user" ("user_id") ON DELETE CASCADE,
  "ruleset" "Ruleset" NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "score" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3)
);
CREATE INDEX IF NOT EXISTS "homebrew_entry_kind_ruleset_idx" ON "homebrew_entry" ("kind", "ruleset") WHERE "deleted_at" IS NULL;
CREATE INDEX IF NOT EXISTS "homebrew_entry_author_idx" ON "homebrew_entry" ("author_user_id");

CREATE TABLE IF NOT EXISTS "homebrew_spell" (
  "homebrew_entry_id" INTEGER PRIMARY KEY REFERENCES "homebrew_entry" ("homebrew_entry_id") ON DELETE CASCADE,
  "eng_name" VARCHAR(255),
  "level" INTEGER NOT NULL CHECK ("level" BETWEEN 0 AND 9),
  "school" VARCHAR(255) NOT NULL,
  "casting_time" VARCHAR(255) NOT NULL,
  "range" VARCHAR(255) NOT NULL,
  "components" VARCHAR(500) NOT NULL,
  "duration" VARCHAR(255) NOT NULL,
  "is_ritual" BOOLEAN NOT NULL DEFAULT false,
  "is_concentration" BOOLEAN NOT NULL DEFAULT false,
  "classes" "Classes"[] NOT NULL DEFAULT '{}',
  "description" TEXT NOT NULL
);

-- Статблок — той самий обʼєкт, що елемент src/lib/generated/creatures.json, щоб каталог малював
-- його тим самим компонентом; окремими стовпцями лише те, за чим фільтрує каталог.
CREATE TABLE IF NOT EXISTS "homebrew_creature" (
  "homebrew_entry_id" INTEGER PRIMARY KEY REFERENCES "homebrew_entry" ("homebrew_entry_id") ON DELETE CASCADE,
  "eng_name" VARCHAR(255),
  "size" VARCHAR(64) NOT NULL,
  "type" VARCHAR(128) NOT NULL,
  "challenge" VARCHAR(32) NOT NULL,
  "stat_block" JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS "homebrew_vote" (
  "homebrew_entry_id" INTEGER NOT NULL REFERENCES "homebrew_entry" ("homebrew_entry_id") ON DELETE CASCADE,
  "user_id" INTEGER NOT NULL REFERENCES "user" ("user_id") ON DELETE CASCADE,
  "value" SMALLINT NOT NULL CHECK ("value" IN (-1, 1)),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("homebrew_entry_id", "user_id")
);

CREATE TABLE IF NOT EXISTS "homebrew_comment" (
  "homebrew_comment_id" SERIAL PRIMARY KEY,
  "homebrew_entry_id" INTEGER NOT NULL REFERENCES "homebrew_entry" ("homebrew_entry_id") ON DELETE CASCADE,
  "user_id" INTEGER NOT NULL REFERENCES "user" ("user_id") ON DELETE CASCADE,
  "parent_comment_id" INTEGER REFERENCES "homebrew_comment" ("homebrew_comment_id") ON DELETE CASCADE,
  "body" TEXT NOT NULL CHECK (char_length("body") BETWEEN 1 AND 5000),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3)
);
CREATE INDEX IF NOT EXISTS "homebrew_comment_entry_idx" ON "homebrew_comment" ("homebrew_entry_id", "created_at");
