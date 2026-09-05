-- KR18.7: походження 2024 Acolyte, Sage і Scribe дають володіння каліграфічним набором.
-- ToolCategory такого значення не мала, тому імпорт 2024 лишив цим трьом порожній список.

ALTER TYPE public."ToolCategory" ADD VALUE IF NOT EXISTS 'CALLIGRAPHERS_SUPPLIES';
