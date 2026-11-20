-- Вхід поштою й паролем без підтвердження пошти. Хеш — scrypt у форматі scrypt$N$r$p$salt$hash.
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS password_hash text;
