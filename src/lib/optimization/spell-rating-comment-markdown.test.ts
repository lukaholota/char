import { expect, it } from "vitest";
import { buildCommentMarkdown } from "./spell-rating-comment-markdown";

it("starts the comment with a capital letter and keeps links as markdown", () => {
  const markdown = buildCommentMarkdown([
    { type: "text", text: "найближче до " },
    { type: "link", text: "Вогнекуля", href: "/spells?spell=fireball" },
    { type: "text", text: ", що ви матимете." },
  ]);

  expect(markdown).toBe("Найближче до [Вогнекуля](/spells?spell=fireball), що ви матимете.");
});

it("capitalizes a comment that starts with a link", () => {
  expect(buildCommentMarkdown([{ type: "link", text: "вогнекуль", href: "/spells?spell=fireball" }, { type: "text", text: " краще." }]))
    .toBe("[Вогнекуль](/spells?spell=fireball) краще.");
});

it("keeps glossary markers for the renderer and collapses whitespace", () => {
  expect(buildCommentMarkdown([{ type: "text", text: "  шкода  променевої{{radiant}}\n дії. " }])).toBe("Шкода променевої{{radiant}} дії.");
});

it("keeps emphasis and strong text", () => {
  expect(buildCommentMarkdown([{ type: "strong", text: "Важливо" }, { type: "text", text: " " }, { type: "emphasis", text: "дуже" }]))
    .toBe("**Важливо** *дуже*");
});

it("gives an empty comment for no nodes", () => {
  expect(buildCommentMarkdown([])).toBe("");
});

it("turns RPGbot source markers into plain text instead of links to the abbreviations page", () => {
  expect(buildCommentMarkdown([{ type: "text", text: "добре " }, { type: "link", text: "XGtE", href: "https://rpgbot.net/dnd5/abbreviations/" }]))
    .toBe("Добре XGtE");
});
