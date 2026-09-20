-- Публічний нік гравця: показується замість імені з Google у коментарях,
-- хоумбрю-записах і черзі скарг. NULL = нік ще не обрано.
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS display_name varchar(24);
