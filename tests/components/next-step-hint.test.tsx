// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextStepButton } from "@/lib/components/wizard/NextStepButton";
import { NextStepHintProvider, useNextStepHint, useNextStepHintState } from "@/lib/components/wizard/next-step-hint";
import { PointBuyAbilityCard } from "@/lib/components/characterCreator/PointBuyAbilityCard";
import { buildPickHint, buildSpendPointsHint, SKILL_FORMS } from "@/lib/components/wizard/pick-hint";

afterEach(cleanup);

function StepPart({ hint }: { hint: string | null }) {
  useNextStepHint(hint);
  return null;
}

function Wizard({ parts, onNext }: { parts: Array<string | null>; onNext: () => void }) {
  const [hint, setHint] = useNextStepHintState(1);
  return (
    <>
      <NextStepHintProvider onHintChange={setHint}>
        {parts.map((part, index) => (
          <StepPart key={index} hint={part} />
        ))}
      </NextStepHintProvider>
      <NextStepButton stepKey={1} isBlocked={parts.some(Boolean)} blockedHint={hint ?? "fallback"} onClick={onNext}>
        Далі
      </NextStepButton>
    </>
  );
}

describe("PostHog dead clicks 2026-09-27 — неактивна «Далі» пояснює, чого бракує", () => {
  it("тап по неактивній «Далі» показує причину від кроку й нікуди не веде", () => {
    const onNext = vi.fn();
    render(<Wizard parts={["Оберіть ще 2 навички класу."]} onNext={onNext} />);

    expect(screen.queryByRole("status")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Далі" }));

    expect(screen.getByRole("status").textContent).toBe("Оберіть ще 2 навички класу.");
    expect(onNext).not.toHaveBeenCalled();
  });

  it("з кількох частин кроку показується перша незавершена", () => {
    render(<Wizard parts={[null, "Оберіть ще 1 замовляння.", "Оберіть рису."]} onNext={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Далі" }));
    expect(screen.getByRole("status").textContent).toBe("Оберіть ще 1 замовляння.");
  });

  it("коли все обрано, «Далі» веде далі, а підказка зникає", () => {
    const onNext = vi.fn();
    const { rerender } = render(<Wizard parts={["Оберіть расу персонажа."]} onNext={onNext} />);
    fireEvent.click(screen.getByRole("button", { name: "Далі" }));

    rerender(<Wizard parts={[null]} onNext={onNext} />);
    expect(screen.queryByRole("status")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Далі" }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("неактивна «Далі» не відправляє форму кроку", () => {
    const onSubmit = vi.fn((event: Event) => event.preventDefault());
    render(
      <>
        <form id="step" onSubmit={(event) => onSubmit(event.nativeEvent)} />
        <NextStepButton type="submit" form="step" stepKey={1} isBlocked blockedHint="Оберіть клас персонажа.">
          Далі
        </NextStepButton>
      </>
    );
    fireEvent.click(screen.getByRole("button", { name: "Далі" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("підказки кажуть кількість по-людськи", () => {
  it.each([
    [0, 1, "Оберіть ще 1 навичку класу."],
    [0, 2, "Оберіть ще 2 навички класу."],
    [0, 5, "Оберіть ще 5 навичок класу."],
    [3, 2, "Обрано забагато: приберіть 1 навичку класу."],
  ])("обрано %i з %i", (chosen, required, expected) => {
    expect(buildPickHint(chosen, required, SKILL_FORMS, "класу")).toBe(expected);
  });

  it("очки підвищення характеристик", () => {
    expect(buildSpendPointsHint(1, 2)).toBe("Розподіліть ще 1 очко підвищення характеристик.");
    expect(buildSpendPointsHint(2, 2)).toBeNull();
  });
});

describe("«За очками» — межі 8 і 15 пояснюються, а не мовчать", () => {
  it("«+» на 15 не збільшує, а пояснює межу", () => {
    const onIncrement = vi.fn();
    render(<PointBuyAbilityCard label="Сила" value={15} onDecrement={() => {}} onIncrement={onIncrement} />);

    fireEvent.click(screen.getByRole("button", { name: "Збільшити" }));

    expect(onIncrement).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toContain("15 — найбільше значення");
  });

  it("«−» на 8 пояснює нижню межу, а звичайний тап працює", () => {
    const onIncrement = vi.fn();
    render(<PointBuyAbilityCard label="Сила" value={8} onDecrement={() => {}} onIncrement={onIncrement} />);

    fireEvent.click(screen.getByRole("button", { name: "Зменшити" }));
    expect(screen.getByRole("status").textContent).toContain("8 — найменше значення");

    fireEvent.click(screen.getByRole("button", { name: "Збільшити" }));
    expect(onIncrement).toHaveBeenCalledTimes(1);
  });
});
