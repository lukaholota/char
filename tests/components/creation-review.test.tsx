// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NameForm } from "@/lib/components/characterCreator/NameForm";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import type { BackgroundI, ClassI, RaceI } from "@/lib/types/model-types";

vi.hoisted(() => {
  const entries = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
    removeItem: (key: string) => entries.delete(key),
  } });
});
vi.mock("@/lib/components/characterCreator/NameGenerator", () => ({
  useCharacterNameGenerator: () => ({ currentName: "Аравор", generateName: vi.fn(), options: {} }),
  NameGeneratorOptionsPanel: () => null,
  NameSuggestionButtons: () => null,
  NameSuggestionHint: () => null,
}));
vi.mock("@/lib/components/characterCreator/modals/RaceInfoModal", () => ({ RaceInfoModal: ({ trigger }: { trigger: React.ReactNode }) => trigger }));
vi.mock("@/lib/components/characterCreator/modals/ClassInfoModal", () => ({ ClassInfoModal: ({ trigger }: { trigger: React.ReactNode }) => trigger }));
vi.mock("@/lib/components/characterCreator/modals/BackgroundInfoModal", () => ({ BackgroundInfoModal: ({ trigger }: { trigger: React.ReactNode }) => trigger }));

afterEach(cleanup);

const fighter = {
  name: "FIGHTER_2014", hitDie: 10, subclasses: [], startingEquipmentOption: [],
  classChoiceOptions: [
    { optionId: 3, choiceOptionId: 2, choiceOption: { groupName: "Бойовий стиль", optionName: "Бій наосліп" } },
    { optionId: 6, choiceOptionId: 3, choiceOption: { groupName: "Бойовий стиль", optionName: "Оборона" } },
  ],
} as unknown as ClassI;

describe("підсумок створення", () => {
  it.each(["", "   "])("зберігає видиме запропоноване імʼя замість %j до callback створення", async (name) => {
    usePersFormStore.setState({ isHydrated: true, formData: { name } });
    let submittedName: string | undefined;
    const { container } = render(<NameForm formId="review" onSuccess={() => { submittedName = usePersFormStore.getState().formData.name; }} />);
    expect(screen.getByText(/буде збережено імʼя «Аравор»/)).toBeTruthy();
    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() => expect(submittedName).toBe("Аравор"));
  });
  it("розрізняє ID звʼязку та ID вибраної опції й оновлює назву", () => {
    usePersFormStore.setState({ isHydrated: true, formData: { classChoiceSelections: { "Бойовий стиль": 3 } } });
    render(<NameForm formId="review" selectedClass={fighter} />);
    expect(screen.getByText("Оборона")).toBeTruthy();
    expect(screen.queryByText("Бій наосліп")).toBeNull();
    act(() => usePersFormStore.getState().updateFormData({ classChoiceSelections: { "Бойовий стиль": 2 } }));
    expect(screen.getByText("Бій наосліп")).toBeTruthy();
    expect(screen.queryByText("Оборона")).toBeNull();
  });

  it.each([
    { className: "ROGUE_2024", hitDie: 8, con: 14, dex: 15, plusTwo: "DEX", plusOne: "CON", hp: 11 },
    { className: "MONK_2024", hitDie: 8, con: 13, dex: 14, plusTwo: "WIS", plusOne: "CON", hp: 10 },
  ] as const)("показує фінальні бонуси походження і HP для $className", (scenario) => {
    usePersFormStore.setState({ isHydrated: true, formData: {
      ruleset: "RULES_2024", asiSystem: "POINT_BUY", isDefaultASI: true,
      asi: [{ ability: "CON", value: scenario.con }, { ability: "DEX", value: scenario.dex }],
      backgroundAsiChoice: { mode: "+2/+1", plusTwo: scenario.plusTwo, plusOne: scenario.plusOne },
    } });
    render(<NameForm formId="review"
      race={{ ASI: {}, subraces: [], raceChoiceOptions: [], traits: scenario.className === "ROGUE_2024"
        ? [{ level: 1, feature: { featureId: 80, bonusHitPointsPerLevel: 1 } }] : [] } as unknown as RaceI}
      background={{ abilityOptions: ["DEX", "CON", "WIS"] } as unknown as BackgroundI}
      selectedClass={{ ...fighter, name: scenario.className, hitDie: scenario.hitDie } as ClassI}
    />);
    const con = screen.getByRole("button", { name: "Деталі характеристики СТА" });
    expect(con.textContent).toContain(String(scenario.con + 1));
    const hpLabel = screen.getByText("Максимум HP");
    expect(hpLabel.parentElement?.textContent).toContain(String(scenario.hp));
  });
});
