-- KR12.3 — owner apply only. Do not run through Prisma migrate/db push.
-- ЗАСТОСОВАНО власником, звірено 2026-08-21: усі сім значень стоять у Source-enum
-- (prisma/schema.prisma), схему спулено. Файл лишається журналом того, що зроблено.
--
-- Аудит усіх 934 сторінок 2014 (`bun run scripts/aidedd/scan-batch.ts --audit`) показав 12 рядків
-- джерела, яких `findSourceKey2014` не знав. Шість із них уже мали значення в enum і потребували
-- лише регексу. Решта — сім нових значень нижче, разом 31 запис бестіарію.
--
-- ADD VALUE не переписує наявних рядків і не блокує таблицю — застосування безпечне на живій базі.
-- IF NOT EXISTS робить повторний запуск ідемпотентним.
--
-- Чотири реальні книги, які aidedd цитує, а enum не мав:
--   ESSENTIALS_KIT — «Rules (Essentials Kit)», 18 істот: масштабовані NPC (warrior-lvl-6,
--                    spellcaster-lvl-2 тощо), єдине джерело цих статблоків
--   WDH            — «Adventures (Dragon Heist)», Waterdeep: Dragon Heist, 1 істота
--   TOD            — «Adventures (Tyranny of Dragons)», 1 істота (tiamat)
--   VEOR           — «Adventures (Vecna: Eve of Ruin)», 1 істота (alustriel-silverhand)
--
-- Три джерела, які не є книгами, але є офіційним чи ліцензованим матеріалом:
--   DDB            — «Extra (D&D Beyond)», 5 істот (minor-*-elemental тощо)
--   AL             — «Extra (Adventurers League)», 4 істоти
--   DRAGON_MAG     — «Extra (Dragon Mag)», 1 істота (belaphoss)
--
-- Свідомо НЕ додається: «Extra (AideDD)» (5 істот) — власний homebrew сайту, поза каноном.
-- Ці записи лишаються `pending` назавжди, як і 327 істот із дефектом джерела.
--
-- Після застосування: `bun run db:pull` і коміт згенерованих артефактів.

ALTER TYPE public."Source" ADD VALUE IF NOT EXISTS 'ESSENTIALS_KIT';
ALTER TYPE public."Source" ADD VALUE IF NOT EXISTS 'WDH';
ALTER TYPE public."Source" ADD VALUE IF NOT EXISTS 'TOD';
ALTER TYPE public."Source" ADD VALUE IF NOT EXISTS 'VEOR';
ALTER TYPE public."Source" ADD VALUE IF NOT EXISTS 'DDB';
ALTER TYPE public."Source" ADD VALUE IF NOT EXISTS 'AL';
ALTER TYPE public."Source" ADD VALUE IF NOT EXISTS 'DRAGON_MAG';
