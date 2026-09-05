-- KR27.4 — owner apply only. Не проганяти через Prisma migrate / db push.
-- Застосовувати ДО деплою коміту KR27.4: код більше не пише через `featId_persId`, а повторна
-- риса лягає другим рядком; з унікальністю на місці друге взяття впаде помилкою бази замість
-- зрозумілої відмови. Після застосування — `bun run db:pull`: інтроспекція зніме
-- `@@unique([featId, persId])` і додасть індекс нижче; коду, що посилався на складений ключ,
-- у репозиторії вже немає.
--
-- Рішення власника 2026-09-03 (Р37 у docs/DECISIONS.md): повторювана риса — другий рядок
-- `pers_feat` зі своїми виборами, а не лічильник. `pers_feat_choice` уже висить на
-- `pers_feat_id`, тож вибори двох Magic Initiate розходяться самі.
--
-- Чому індекс повертається тим самим файлом: унікальність була єдиним індексом, крім PK,
-- і слугувала пошуку пари (feat_id, pers_id). Новий індекс веде з pers_id — ним ходить і
-- завантаження листа («риси персонажа»), і перевірка пари.
--
-- Дублів (pers_id, feat_id) у робочій базі 0 (виміряно 2026-09-01), персонажів 2024 — 0,
-- тож жоден рядок не рухається. Повторний запуск ідемпотентний.

BEGIN;

DROP INDEX IF EXISTS public.pers_feat_feat_id_pers_id_key;
CREATE INDEX IF NOT EXISTS pers_feat_pers_id_feat_id_idx ON public.pers_feat USING btree (pers_id, feat_id);

COMMIT;

-- Перевірка: рівно два індекси — PK і новий звичайний.
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'pers_feat' ORDER BY indexname;
