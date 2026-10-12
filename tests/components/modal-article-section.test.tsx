// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ModalArticle } from "@/components/optimization/ModalArticle";
import { parseArticleDocument } from "@/lib/optimization/document";

const document = parseArticleDocument(JSON.parse(readFileSync(join(process.cwd(), "data/rpgbot/uk/rpgbot-monk-subclasses-2014.json"), "utf8")));

beforeEach(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(() => cleanup());

describe("розділ статті в модалці підкласу", () => {
  it("показує лише розділ цього підкласу, а не всю статтю", () => {
    render(<ModalArticle document={document} sectionId="section-shadow" />);
    expect(screen.getByRole("heading", { name: "Шлях тіні (PHB)" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Шлях милосердя (TCoE)" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Вступ про Монаха" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Видавці третіх сторін" })).toBeNull();
  });

  it("підписує, з якої статті взято розділ, і лишає шкалу оцінок", () => {
    render(<ModalArticle document={document} sectionId="section-shadow" />);
    expect(screen.getByText(`Розділ зі статті «${document.article.titleUk}»`)).toBeTruthy();
    expect(screen.getAllByText(/Шкала RPGbot|Добре|Погано/).length).toBeGreaterThan(0);
  });

  it("зберігає прокрутку сторінки та не позначає публічний 2014 приватним", () => {
    render(<ModalArticle document={document} sectionId="section-shadow" />);
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
    expect(screen.queryByText("Приватна чернетка")).toBeNull();
  });
});
