// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NoAiModeProvider } from "@/components/no-ai/NoAiModeProvider";
import { OmniSearchItemRow } from "@/components/search/OmniSearchItemRow";
import type { OmniSearchItem } from "@/lib/omniSearchData";
import sprite from "@/lib/generated/spell-icon-sprite.json";

afterEach(cleanup);

function renderRow(item: Partial<OmniSearchItem>) {
  const full: OmniSearchItem = {
    id: "x",
    title: "Назва",
    category: "spells",
    categoryLabel: "Заклинання",
    href: "/spells",
    ...item,
  } as OmniSearchItem;

  render(
    <NoAiModeProvider>
      <OmniSearchItemRow item={full} isSelected={false} onSelect={() => undefined} />
    </NoAiModeProvider>
  );
  return screen.getByRole("button");
}

describe("картинка в рядку омні-пошуку", () => {
  it("заклинання зі спрайта малює свою клітинку, а не іконку школи", () => {
    const engName = sprite.names[0];
    const row = renderRow({
      title: "Заклинання",
      art: { kind: "spell", engName },
      visualKey: "EVOCATION",
    });

    const plate = row.querySelector<HTMLElement>('[style*="background-image"]')!;
    expect(plate.style.backgroundImage).toContain(sprite.file);
  });

  it("заклинання без клітинки лишається з плиткою школи", () => {
    const row = renderRow({
      title: "Без іконки",
      art: { kind: "spell", engName: "Заклинання, якого немає у спрайті" },
      visualKey: "EVOCATION",
    });

    expect(row.querySelector('[style*="background-image"]')).toBeNull();
  });

  it("істота малює свій токен", () => {
    const row = renderRow({
      title: "Кіт",
      category: "bestiary",
      categoryLabel: "Бестіарій",
      art: { kind: "creature", imageUrl: "/images/creatures/2014/mm-cat-token.webp", imageShape: "round" },
      visualKey: "beast",
    });

    const image = row.querySelector("img")!;
    expect(image.getAttribute("src")).toContain("mm-cat-token.webp");
  });

  it("категорія без картинки лишається з іконкою", () => {
    const row = renderRow({ title: "Правило", category: "rules", categoryLabel: "Правила" });

    expect(row.querySelector("img")).toBeNull();
    expect(row.querySelector("svg")).toBeTruthy();
  });
});
