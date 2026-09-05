// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  WildshapeAddFormButton,
  WildshapeFilterSection,
  WildshapeUnavailableBadge,
} from "@/components/bestiary/BestiaryWildshapePicking";
import type { WildshapeCharacter, WildshapeStanding } from "@/server/db/wildshape";
import { findWildshapeEligibility, type WildshapeCandidate } from "@/rules/wildshape";

/// KR24.3. Непридатний звір із вимкненим фільтром лишається в списку з позначкою причини й
/// додається з попередженням ([Р-3]). Текст причини пише модуль правил — UI не має права
/// складати його зі шматків, інакше пороги 4 і 8 знову розійдуться між списком і сервером.

afterEach(cleanup);

const beast = (overrides: Partial<WildshapeCandidate> = {}): WildshapeCandidate => ({
  nameEng: "Giant Eagle",
  type: "Звір",
  challenge: "1",
  flySpeed: null,
  swimSpeed: null,
  climbSpeed: null,
  hasConditionalSpeed: false,
  ...overrides,
});

const moonDruid = (druidLevel: number) =>
  ({ druidLevel, isMoonCircle: true, ruleset: "RULES_2014" }) as const;

describe("позначка непридатної форми", () => {
  it("називає причину словами правил, а не самим «недоступна»", () => {
    const eligibility = findWildshapeEligibility(beast({ flySpeed: 80 }), moonDruid(2));

    const { container } = render(<WildshapeUnavailableBadge eligibility={eligibility} />);

    expect(container.textContent).toContain("Недоступна");
    expect(container.textContent).toContain("Швидкість польоту відкривається з 8 рівня друїда");
  });

  it("дві причини одразу — обидві на очах", () => {
    const eligibility = findWildshapeEligibility(beast({ challenge: "1", swimSpeed: 40 }), {
      druidLevel: 2,
      isMoonCircle: false,
      ruleset: "RULES_2014",
    });

    const { container } = render(<WildshapeUnavailableBadge eligibility={eligibility} />);

    expect(container.textContent).toContain("Показник небезпеки 1 вищий за дозволений 1/4");
    expect(container.textContent).toContain("Швидкість плавання відкривається з 4 рівня друїда");
  });

  it("придатна форма позначки не отримує", () => {
    const eligibility = findWildshapeEligibility(beast(), moonDruid(2));

    const { container } = render(<WildshapeUnavailableBadge eligibility={eligibility} />);

    expect(container.textContent).toBe("");
  });
});

describe("кнопка «додати як звірину форму»", () => {
  function renderButton(overrides: {
    eligibility?: ReturnType<typeof findWildshapeEligibility>;
    isAttached?: boolean;
    onAdd?: () => void;
  }) {
    const onAdd = overrides.onAdd ?? vi.fn();
    render(
      <WildshapeAddFormButton
        eligibility={overrides.eligibility ?? findWildshapeEligibility(beast(), moonDruid(2))}
        isAttached={overrides.isAttached ?? false}
        isPending={false}
        onAdd={onAdd}
      />
    );
    return onAdd;
  }

  it("непридатну форму додати можна — відмовляє тільки вхід у неї", () => {
    const onAdd = renderButton({
      eligibility: findWildshapeEligibility(beast({ flySpeed: 80 }), moonDruid(2)),
    });

    const button = screen.getByRole("button", { name: /Додати як звірину форму/ });
    expect(button.hasAttribute("disabled")).toBe(false);
    fireEvent.click(button);

    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it("уже прикріплена форма вдруге не додається", () => {
    const onAdd = renderButton({ isAttached: true });

    fireEvent.click(screen.getByRole("button", { name: /Уже прикріплена/ }));

    expect(onAdd).not.toHaveBeenCalled();
  });

  it("пояснювальна причина показується, але нічого не блокує", () => {
    renderButton({
      eligibility: findWildshapeEligibility(beast({ climbSpeed: 30 }), moonDruid(2)),
    });

    expect(screen.getByText("Швидкість лазіння Дика форма не обмежує на жодному рівні")).toBeTruthy();
    expect(screen.queryByText("Недоступна")).toBeNull();
  });
});

describe("секція «Дика форма» серед фільтрів бестіарію", () => {
  const character = (overrides: Partial<WildshapeCharacter> = {}): WildshapeCharacter => ({
    persId: 7,
    name: "Мирон",
    druidLevel: 4,
    isMoonCircle: false,
    ruleset: "RULES_2014",
    limits: { maxChallengeRating: 0.5, allowsFlySpeed: false, allowsSwimSpeed: true },
    limitNotes: ["КР до 1/2", "лазіння без обмежень"],
    ...overrides,
  });

  function renderSection(props: Partial<Parameters<typeof WildshapeFilterSection>[0]> = {}) {
    const onSelectPers = vi.fn();
    const onShowOnlyEligible = vi.fn();
    render(
      <WildshapeFilterSection
        characters={[character()]}
        standing={null}
        persId={null}
        onlyEligible={false}
        onSelectPers={onSelectPers}
        onShowOnlyEligible={onShowOnlyEligible}
        {...props}
      />
    );
    return { onSelectPers, onShowOnlyEligible };
  }

  it("гравцеві без друїда секції не показує зовсім", () => {
    const { container } = render(
      <WildshapeFilterSection
        characters={[]}
        standing={null}
        persId={null}
        onlyEligible={false}
        onSelectPers={vi.fn()}
        onShowOnlyEligible={vi.fn()}
      />
    );

    expect(container.textContent).toBe("");
  });

  it("персонаж підписаний рівнем друїда з реєстру, а не літералом", () => {
    renderSection({ characters: [character({ isMoonCircle: true })] });

    expect(screen.getByText("Друїд 4 · Коло місяця")).toBeTruthy();
  });

  it("повторне натискання на обраного персонажа знімає контекст", () => {
    const { onSelectPers } = renderSection({ persId: 7 });

    fireEvent.click(screen.getByText("Мирон"));

    expect(onSelectPers).toHaveBeenCalledWith(null);
  });

  it("межі персонажа показуються готовим рядком із правил", () => {
    const standing: WildshapeStanding = character();
    renderSection({ persId: 7, standing });

    expect(screen.getByText("КР до 1/2 · лазіння без обмежень")).toBeTruthy();
  });
});
