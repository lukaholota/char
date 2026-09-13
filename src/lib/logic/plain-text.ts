import { stripGlossaryMarkers } from "@/lib/refs/glossary-marker";

/// Проза контенту несе посилання на заклинання, маркери оригіналу й markdown. Два місця
/// потребують із неї звичайний текст: картка вибору (посилання всередині клікабельної картки
/// повело б гравця геть із конструктора замість вибору — повний опис відкриває кнопка «?») і
/// колонка `choice_option.option_name`, куди сід кладе UI-підпис і в якій лежить VarChar(100).
export function stripToPlainText(value: string) {
  return stripGlossaryMarkers(value)
    .replace(/\r\n/g, "\n")
    .replace(/<a\s+[^>]*>(.*?)<\/a>/gi, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/`{1,3}([^`]+)`{1,3}/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}
