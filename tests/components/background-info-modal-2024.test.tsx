// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BackgroundInfoModal } from "@/lib/components/characterCreator/modals/BackgroundInfoModal";
import type { BackgroundI } from "@/lib/types/model-types";

afterEach(cleanup);

const sage2024 = {
  backgroundId: 163,
  name: "SAGE_2024",
  source: "PHB_2024",
  toolProficiencies: ["CALLIGRAPHERS_SUPPLIES"],
  languagesToChooseCount: 0,
  items: [{ name: "Мантія", quantity: 1 }],
  description: "Опис мудреця.",
  specialAbilityName: null,
  skillProficiencies: ["ARCANA", "HISTORY"],
  ruleset: "RULES_2024",
  abilityOptions: ["CON", "INT", "WIS"],
  originFeatId: 3029,
  grantsGoldInstead: 50,
} as unknown as BackgroundI;

const ORIGIN_FEAT = {
  name: "Посвячений у магію",
  description: "**Два Замовляння**\nВи вивчаєте два Замовляння на ваш вибір зі списку заклинань клірика.",
};

describe("KR31.14 — деталі походження 2024 у конструкторі (L02-backgrounds-08)", () => {
  it("показує три характеристики, рису походження й «пакунок або 50 зм», а не порожні мови й особливість", () => {
    render(<BackgroundInfoModal background={sage2024} originFeat={ORIGIN_FEAT} />);
    fireEvent.click(screen.getByRole("button", { name: /Показати деталі/ }));

    expect(screen.getByText("Характеристики на вибір")).toBeTruthy();
    expect(screen.getByText("Статура / Інтелект / Мудрість")).toBeTruthy();
    expect(screen.getAllByText("Посвячений у магію").length).toBeGreaterThan(0);
    expect(screen.getByText("пакунок або 50 зм")).toBeTruthy();
    expect(screen.queryByText("Особливість")).toBeNull();
  });

  /// Назва риси в плашці нічого не пояснює — те, що риса дає, гравець має бачити тут, а не
  /// в каталозі рис окремою вкладкою.
  it("текст риси походження йде одразу під плашками", () => {
    render(<BackgroundInfoModal background={sage2024} originFeat={ORIGIN_FEAT} />);
    fireEvent.click(screen.getByRole("button", { name: /Показати деталі/ }));

    expect(screen.getByText(/Ви вивчаєте два Замовляння/)).toBeTruthy();
  });

  it("без риси блока немає", () => {
    render(<BackgroundInfoModal background={sage2024} />);
    fireEvent.click(screen.getByRole("button", { name: /Показати деталі/ }));

    expect(screen.queryByText(/Ви вивчаєте два Замовляння/)).toBeNull();
  });
});
