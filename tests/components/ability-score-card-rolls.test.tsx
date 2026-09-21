// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AbilityScoreCard } from "@/lib/components/characterSheet/AbilityScoreCard";

afterEach(cleanup);

function renderCard(overrides: Partial<Parameters<typeof AbilityScoreCard>[0]> = {}) {
  const onEdit = vi.fn();
  const onRoll = vi.fn();
  render(
    <AbilityScoreCard
      shortName="СИЛ"
      fullName="Сила"
      borderClassName="border-red-500/40"
      score={16}
      modifier={3}
      save={5}
      hasSaveProficiency
      hasBonuses={false}
      fromBeast={false}
      canEdit
      onEdit={onEdit}
      onRoll={onRoll}
      {...overrides}
    />,
  );
  return { onEdit, onRoll };
}

describe("картка характеристики — числа кидають, назва редагує", () => {
  it("тап по модифікатору кидає перевірку, по ряткидку — ряткидок", () => {
    const { onRoll, onEdit } = renderCard();
    fireEvent.click(screen.getByRole("button", { name: "Перевірка: Сила +3" }));
    fireEvent.click(screen.getByRole("button", { name: "Ряткидок: Сила +5, з володінням" }));
    expect(onRoll.mock.calls).toEqual([["check"], ["save"]]);
    expect(onEdit).not.toHaveBeenCalled();
  });

  it("назва зі значенням відкриває правку, а без права правити — не є кнопкою", () => {
    const { onEdit } = renderCard();
    fireEvent.click(screen.getByRole("button", { name: "Редагувати: Сила" }));
    expect(onEdit).toHaveBeenCalledTimes(1);

    cleanup();
    renderCard({ canEdit: false });
    expect(screen.queryByRole("button", { name: "Редагувати: Сила" })).toBeNull();
    expect(screen.getByText("16")).toBeTruthy();
  });

  it("володіння ряткидком видно рамкою й чути в назві, без володіння — ні", () => {
    renderCard();
    const proficient = screen.getByRole("button", { name: "Ряткидок: Сила +5, з володінням" });
    expect(proficient.className).toContain("border-indigo-400/60");

    cleanup();
    renderCard({ hasSaveProficiency: false, save: 3 });
    const plain = screen.getByRole("button", { name: "Ряткидок: Сила +3" });
    expect(plain.className).not.toContain("border-indigo-400/60");
  });

  it("Благословення видно на ряткидку «+к4», а перевірка його не отримує", () => {
    const bless = { sides: 4, sign: 1 as const, label: "Благословення" };
    renderCard({ rollStates: { check: { mode: "NORMAL", sources: [], extraDice: [] }, save: { mode: "NORMAL", sources: [], extraDice: [bless] } } });
    const save = screen.getByRole("button", { name: "Ряткидок: Сила +5 +к4 (Благословення), з володінням" });
    expect(save.textContent).toContain("+к4");
    expect(screen.getByRole("button", { name: "Перевірка: Сила +3" }).textContent).not.toContain("к4");
  });

  it("свайп, що почався з кнопки-кубика, дістається каруселі листа", () => {
    renderCard();
    expect(screen.getByRole("button", { name: "Перевірка: Сила +3" }).className).not.toContain("swiper-no-swiping");
  });
});
