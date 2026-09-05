// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { CreatureMedallion } from "@/components/bestiary/CreatureMedallion";
import { CreaturePortrait } from "@/components/bestiary/CreaturePortrait";
import { getCreatureVisual } from "@/components/catalogs/catalog-visuals";
import { CreatureData } from "@/lib/bestiaryData";

afterEach(cleanup);

function buildCreature(overrides: Partial<CreatureData> = {}): CreatureData {
  return {
    creatureId: 1,
    name: "Аболет",
    nameEng: "Aboleth",
    ruleset: "RULES_2014",
    imageUrl: "/images/creatures/2014/aboleth.webp",
    imageWidth: 640,
    imageHeight: 760,
    ...overrides,
  } as CreatureData;
}

describe("KR12.4 — портрет істоти", () => {
  it("бере пропорції самої ілюстрації, а не спільне співвідношення", () => {
    const { container } = render(<CreaturePortrait creature={buildCreature()} />);
    const box = container.querySelector("[style*='aspect-ratio']") as HTMLElement;

    expect(box.style.aspectRatio.startsWith(String(640 / 760))).toBe(true);
    expect(box.style.width).toContain("var(--creature-portrait-h)");
  });

  it("істота без картинки не малює порожню рамку", () => {
    const { container } = render(
      <CreaturePortrait creature={buildCreature({ imageUrl: undefined })} />
    );

    expect(container.firstChild).toBeNull();
  });

  it("підписує ілюстрацію українською назвою істоти", () => {
    render(<CreaturePortrait creature={buildCreature()} />);
    expect(screen.getByAltText("Аболет")).toBeTruthy();
  });
});

describe("KR12.4 — медальйон у рядку каталогу", () => {
  const visual = getCreatureVisual("Дракон");

  it("показує ілюстрацію, коли вона є", () => {
    render(<CreatureMedallion creature={buildCreature()} visual={visual} />);
    expect(screen.getByAltText("Аболет")).toBeTruthy();
  });

  it("падає на значок типу істоти, коли картинки немає", () => {
    const { container } = render(
      <CreatureMedallion creature={buildCreature({ imageUrl: undefined })} visual={visual} />
    );

    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("кадрує квадратом — у корпусі немає спільної орієнтації артів", () => {
    const { container } = render(<CreatureMedallion creature={buildCreature()} visual={visual} />);
    const box = container.firstChild as HTMLElement;

    expect(box.className).toContain("h-[88px]");
    expect(box.className).toContain("w-[88px]");
    expect(container.querySelector("img")?.className).toContain("object-cover");
  });
});
