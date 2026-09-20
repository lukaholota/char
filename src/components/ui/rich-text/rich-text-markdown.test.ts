import { describe, expect, it } from "vitest";
import { MarkdownManager } from "@tiptap/markdown";
import { restoreTypedCharacters, RICH_TEXT_EXTENSIONS } from "./rich-text-markdown";

const markdown = new MarkdownManager({ extensions: RICH_TEXT_EXTENSIONS });

function passThroughEditor(text: string): string {
  return restoreTypedCharacters(markdown.serialize(markdown.parse(text)));
}

describe("текст проходить через редактор без втрат", () => {
  it.each([
    ["жирна назва дії з переносом рядка", "**Укус.** Рукопашна атака: +5.\nВлучання: 8 (1к10 + 3) колючої шкоди."],
    ["маркер оригіналу, курсив і обидва списки", "Завдає променевої{{radiant}} шкоди.\n\n- пункт один\n- пункт *два*\n\n1. раз\n2. два"],
    ["посилання на стан", "<a href=\"/rules/conditions#condition-paralyzed\">паралізованою</a> істота"],
    ["знаки, які редактор кодує як HTML", "Шкода < 10 & ціль > 5 футів"],
    ["посилання в розмітці", "Див. [правила](/rules/conditions)"],
    ["розмітка без кнопок у панелі", "### Заголовок\n\n> цитата\n\n~~закреслено~~ і `код`\n\n---\n\nкінець"],
  ])("%s", (_case, text) => {
    expect(passThroughEditor(text)).toBe(text);
  });

  it("таблицю лише вирівнює, не губить жодної клітинки", () => {
    const table = "Вступ\n\n| Рівень | Кубик |\n|---|---|\n| 1 | к6 |\n| 5 | к8 |\n\nПісля";
    const passed = passThroughEditor(table);
    expect(passed).toMatch(/\|\s*5\s*\|\s*к8\s*\|/);
    expect(markdown.parse(passed)).toEqual(markdown.parse(table));
  });

  it("набрані зірочки й кутові дужки зберігає як текст, а не як розмітку", () => {
    const typed = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "2*3 і 4*5, <b>" }] }] };
    expect(restoreTypedCharacters(markdown.serialize(typed))).toBe("2\\*3 і 4\\*5, <b>");
  });
});
