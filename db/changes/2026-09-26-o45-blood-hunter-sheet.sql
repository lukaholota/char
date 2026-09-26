-- O45 — Мисливець за кровʼю: механіка листа й левелапу (KR45.4, KR45.6).
-- Лише нові nullable-колонки: наявні рядки не змінюються.
-- Застосовує власник до робочої бази; клон — scripts/apply-db-change.sh.

-- KR45.4: заміна відомого варіанта з будь-якої групи вибору на підвищенні рівня
-- («Кожного разу, коли ви вивчаєте нове криваве прокляття, можете замінити одне з відомих»).
-- Досі заміну вміли лише три групи, кожна своїм прапорцем (replaces_invocation тощо).
ALTER TABLE public.class_optional_feature
    ADD COLUMN IF NOT EXISTS replaces_choice_group varchar(100);

-- KR45.6: активний Багряний обряд на конкретній зброї персонажа (зокрема на Хижих ударах
-- лікантропа — одному рядку «Кулак»). Посилається на рису обряду: і вивчені обряди, і Обряд
-- світанку мисливця на привидів — рядки feature.
ALTER TABLE public.pers_weapon
    ADD COLUMN IF NOT EXISTS crimson_rite_feature_id integer;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pers_weapon_crimson_rite_feature_id_fkey') THEN
        ALTER TABLE public.pers_weapon
            ADD CONSTRAINT pers_weapon_crimson_rite_feature_id_fkey
            FOREIGN KEY (crimson_rite_feature_id) REFERENCES public.feature(feature_id)
            ON UPDATE CASCADE ON DELETE SET NULL;
    END IF;
END $$;
