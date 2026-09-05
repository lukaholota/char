-- Кнопка "Повідомити про проблему" в меню навігації. Owner apply only.
-- Агент застосовує цей файл лише до spells_test через ./scripts/apply-db-change.sh.
--
-- user_id — nullable: кнопка доступна і без входу, анонімний звіт кращий за відсутній.
-- ON DELETE SET NULL, а не CASCADE (як у pers_offline_operation) — звіт про баг цінний
-- для розбору й після видалення акаунту, каскад його б безповоротно стер.
--
-- Решта полів — контекст, зібраний найкраще, що вдалось: сторінка, user agent,
-- viewport/screen, мова, часовий пояс. Жодне не обов'язкове, крім самого повідомлення.

CREATE TABLE public.problem_report (
    problem_report_id serial PRIMARY KEY,
    user_id integer,
    message text NOT NULL,
    page_path character varying(2048) NOT NULL,
    page_url text,
    referrer text,
    user_agent text,
    ip_address character varying(64),
    viewport_width integer,
    viewport_height integer,
    screen_width integer,
    screen_height integer,
    language character varying(32),
    timezone character varying(64),
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE ONLY public.problem_report
    ADD CONSTRAINT problem_report_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES public."user"(user_id) ON UPDATE CASCADE ON DELETE SET NULL;

CREATE INDEX problem_report_user_id_idx ON public.problem_report USING btree (user_id);

CREATE INDEX problem_report_created_at_idx ON public.problem_report USING btree (created_at);

-- Після застосування власником:
--   1. bun run db:pull
