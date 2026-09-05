-- KR22.6 — журнал ідемпотентності офлайн-операцій. Owner apply only.
-- Агент застосовує цей файл лише до spells_test через ./scripts/apply-db-change.sh.
-- Спека: docs/o22-content-static-user-live/kr22.6-offline-pers.md
--
-- Клієнт ставить operation_id один раз, до першої спроби відправлення. Сервер вставляє
-- цей рядок у тій самій транзакції, що й зміну персонажа. Повторний POST з тим самим id
-- бачить конфлікт primary key і не застосовує зміну вдруге.

CREATE TABLE public.pers_offline_operation (
    operation_id character varying(64) PRIMARY KEY,
    pers_id integer NOT NULL,
    user_id integer NOT NULL,
    operation_kind character varying(64) NOT NULL,
    applied_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE ONLY public.pers_offline_operation
    ADD CONSTRAINT pers_offline_operation_pers_id_fkey FOREIGN KEY (pers_id)
    REFERENCES public.pers(pers_id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.pers_offline_operation
    ADD CONSTRAINT pers_offline_operation_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES public."user"(user_id) ON UPDATE CASCADE ON DELETE CASCADE;

CREATE INDEX pers_offline_operation_pers_id_idx
    ON public.pers_offline_operation USING btree (pers_id);

CREATE INDEX pers_offline_operation_user_id_idx
    ON public.pers_offline_operation USING btree (user_id);

-- Після застосування власником:
--   1. bun run db:pull
--   2. bun run test:integration tests/actions/offline-sync.test.ts
