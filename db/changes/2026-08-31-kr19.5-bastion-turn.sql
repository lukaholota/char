-- KR19.5 — журнал ходів бастіону (O19). Owner apply only. Ніякого prisma migrate / db push (Р2).
-- Агент застосував це лише до spells_test через ./scripts/apply-db-change.sh.
-- Спека: docs/o19-bastions/kr19.5-bastion-journal.md
--
-- Третя й остання таблиця бастіону. KR19.2 свідомо викинула `pers_bastion_turn` разом із
-- `pers_bastion_turn_order`, бо та пара обслуговувала рушій: хід мав накази-рядки, які система
-- сама розвʼязувала. Тут повертається не рушій, а лог: один рядок — один запис гравця, і
-- застосунок його лише зберігає (Р26).
--
-- Чому таблиця, а не текстова колонка на pers_bastion: спека вимагає редагувати й видаляти
-- ОКРЕМИЙ запис. Блоб у тексті довелося б розбирати, вигадувати йому ідентифікатор усередині
-- рядка й переписувати цілком на кожну правку — це саморобний ORM у колонці. Рядок з ключем
-- дає identity, дату створення дефолтом і видалення одним DELETE.
--
-- Що це НЕ чіпає: жодної наявної таблиці, стовпця чи enum — тільки CREATE.

-- ============================================================================
-- Запис журналу ходів
-- ============================================================================

-- turn_number — номер ходу РУКАМИ гравця. Унікальності на (pers_bastion_id, turn_number) немає
-- свідомо: за Р26 правила підказують, а не забороняють, і два записи про один хід — це
-- нормальний спосіб вести журнал, а не помилка. Наступний номер підказує застосунок, гравець
-- його переписує.
--
-- CHECK (turn_number >= 1) — не правило D&D, а межа осмисленого значення, як defenders >= 0:
-- нульового й відʼємного ходу не буває в жодному домашньому правилі. Форма про це каже
-- людською мовою, у базі чек лишається останнім рубежем.
--
-- entry — текст запису вільною формою («бібліотека дослідила руїни, кузня закінчила лати»).
-- Без верхньої межі: це щоденник, а не назва.
CREATE TABLE public.pers_bastion_turn (
    pers_bastion_turn_id serial PRIMARY KEY,
    pers_bastion_id integer NOT NULL,
    turn_number integer NOT NULL,
    entry text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pers_bastion_turn_turn_number_check CHECK (turn_number >= 1)
);

ALTER TABLE ONLY public.pers_bastion_turn
    ADD CONSTRAINT pers_bastion_turn_pers_bastion_id_fkey FOREIGN KEY (pers_bastion_id)
    REFERENCES public.pers_bastion(pers_bastion_id) ON UPDATE CASCADE ON DELETE CASCADE;

CREATE INDEX pers_bastion_turn_pers_bastion_id_idx
    ON public.pers_bastion_turn USING btree (pers_bastion_id);
