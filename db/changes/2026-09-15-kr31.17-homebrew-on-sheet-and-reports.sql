-- KR31.17 — хоумбрю на листі, будь-яка редакція, обговорення будь-якого запису й скарги.
-- Рішення власника 2026-09-15.
--
-- 1. homebrew_entry.ruleset стає необовʼязковим: NULL — запис для обох редакцій, показується в
--    каталогах 2014 і 2024.
-- 2. pers_homebrew_spell — заклинання спільноти, додане персонажу. Окремо від pers_spell: той
--    посилається на каталог spell, де назви унікальні в межах редакції й звіряються з
--    data/2014/spells.json, тож запис спільноти туди класти не можна. Підготовка, мітка й прапорці
--    підрахунку — ті самі, що в pers_spell, щоб на листі воно поводилось як звичайне заклинання.
--    Лист показує поточний текст запису навіть після того, як автор його видалив (deleted_at).
-- 3. Голоси й коментарі — на будь-якому записі каталогу, не лише на хоумбрю: content_vote,
--    content_comment (відповіді), content_comment_vote. Ціль — рядок-ключ, не зовнішній ключ
--    (Р25: істоти живуть у JSON, посилання на контент — ключем):
--      HOMEBREW:<homebrew_entry_id> · SPELL:RULES_2014:<слаг> · CREATURE:RULES_2024:<слаг>
--    Вони замінюють homebrew_vote і homebrew_comment з KR31.16 — код із ними ще не деплоївся, на
--    робочій базі обидві таблиці порожні (перевірено 2026-09-15).
-- 4. content_report — скарга на запис хоумбрю або на коментар; модератори
--    (HOMEBREW_MODERATOR_EMAILS) закривають її видаленням цілі або відхиленням.
--
-- Порядок: власник застосовує файл до робочої бази ДО деплою коду, потім bun run db:pull.

ALTER TABLE "homebrew_entry" ALTER COLUMN "ruleset" DROP NOT NULL;

DROP TABLE IF EXISTS "homebrew_vote";
DROP TABLE IF EXISTS "homebrew_comment";

CREATE TABLE IF NOT EXISTS "pers_homebrew_spell" (
  "pers_homebrew_spell_id" SERIAL PRIMARY KEY,
  "pers_id" INTEGER NOT NULL REFERENCES "pers" ("pers_id") ON DELETE CASCADE,
  "homebrew_entry_id" INTEGER NOT NULL REFERENCES "homebrew_entry" ("homebrew_entry_id") ON DELETE CASCADE,
  "is_prepared" BOOLEAN NOT NULL DEFAULT false,
  "badge_text" TEXT,
  "badge_color" TEXT,
  "exclude_from_prepared_count" BOOLEAN NOT NULL DEFAULT false,
  "exclude_from_known_count" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("pers_id", "homebrew_entry_id")
);

CREATE TABLE IF NOT EXISTS "content_vote" (
  "target" VARCHAR(300) NOT NULL,
  "user_id" INTEGER NOT NULL REFERENCES "user" ("user_id") ON DELETE CASCADE,
  "value" SMALLINT NOT NULL CHECK ("value" IN (-1, 1)),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("target", "user_id")
);

CREATE TABLE IF NOT EXISTS "content_comment" (
  "content_comment_id" SERIAL PRIMARY KEY,
  "target" VARCHAR(300) NOT NULL,
  "user_id" INTEGER NOT NULL REFERENCES "user" ("user_id") ON DELETE CASCADE,
  "parent_comment_id" INTEGER REFERENCES "content_comment" ("content_comment_id") ON DELETE CASCADE,
  "body" TEXT NOT NULL CHECK (char_length("body") BETWEEN 1 AND 5000),
  "score" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3)
);
CREATE INDEX IF NOT EXISTS "content_comment_target_idx" ON "content_comment" ("target", "created_at");
CREATE INDEX IF NOT EXISTS "content_comment_user_idx" ON "content_comment" ("user_id", "created_at");

CREATE TABLE IF NOT EXISTS "content_comment_vote" (
  "content_comment_id" INTEGER NOT NULL REFERENCES "content_comment" ("content_comment_id") ON DELETE CASCADE,
  "user_id" INTEGER NOT NULL REFERENCES "user" ("user_id") ON DELETE CASCADE,
  "value" SMALLINT NOT NULL CHECK ("value" IN (-1, 1)),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("content_comment_id", "user_id")
);

CREATE TABLE IF NOT EXISTS "content_report" (
  "content_report_id" SERIAL PRIMARY KEY,
  "target" VARCHAR(300) NOT NULL,
  "content_comment_id" INTEGER REFERENCES "content_comment" ("content_comment_id") ON DELETE CASCADE,
  "reporter_user_id" INTEGER NOT NULL REFERENCES "user" ("user_id") ON DELETE CASCADE,
  "reason" VARCHAR(16) NOT NULL CHECK ("reason" IN ('SPAM', 'OFFENSIVE', 'COPYRIGHT', 'OTHER')),
  "details" TEXT CHECK (char_length("details") <= 1000),
  "status" VARCHAR(16) NOT NULL DEFAULT 'OPEN' CHECK ("status" IN ('OPEN', 'RESOLVED', 'DISMISSED')),
  "resolved_by_user_id" INTEGER REFERENCES "user" ("user_id") ON DELETE SET NULL,
  "resolved_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "content_report_one_per_target_idx"
  ON "content_report" ("reporter_user_id", "target", COALESCE("content_comment_id", 0));
CREATE INDEX IF NOT EXISTS "content_report_open_idx" ON "content_report" ("created_at") WHERE "status" = 'OPEN';
