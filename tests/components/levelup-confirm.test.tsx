// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { LevelUpConfirmStep } from "@/lib/components/levelUp/LevelUpConfirmStep";

vi.mock("@/components/bastions/BastionLevelUpNote", () => ({ BastionLevelUpNote: () => null }));
afterEach(cleanup);

const pers = { persId: 1, level: 3, ruleset: "RULES_2014", str: 10, dex: 14, con: 15, int: 10, wis: 10, cha: 10, feats: [] } as const;
const chef = { featId: 5, name: "CHEF", grantedASI: null, featChoiceOptions: [
  { choiceOptionId: 90, choiceOption: { optionName: "Статура", effectKind: "ASI", effectAbility: "CON", effectAmount: 1 } },
] };

describe("фінальна перевірка підвищення", () => {
  it("називає підклас, уміння, опції й рису; пояснює всі доданки HP", () => {
    const { rerender } = render(<LevelUpConfirmStep totalLevel={4} className="Воїн" classLevelAfter={4}
      pers={pers} allFeats={[chef as never]} traitHitPointsPerLevel={1} hitPointSources={[{ name: "Дворфська витривалість", amount: 1 }]}
      formData={{ subclassId: 3, featId: 5, featChoiceSelections: { "Характеристика": 90 }, subclassChoiceSelections: { "Маневри": [7, 8] }, levelUpHpIncrease: 6 }}
      selectedClass={null} effectiveSubclass={{ name: "BATTLE_MASTER", subclassChoiceOptions: [
        { choiceOptionId: 7, choiceOption: { optionName: "Парирування" } }, { choiceOptionId: 8, choiceOption: { optionName: "Відплата" } },
      ] } as never} newFeatures={[{ featureId: 1, feature: { name: "Знай свого ворога" } }]} />);
    expect(screen.getByText("Кухар")).toBeTruthy();
    expect(screen.getByText("Знай свого ворога")).toBeTruthy();
    expect(screen.getByText("Парирування")).toBeTruthy();
    expect(screen.getByText("Відплата")).toBeTruthy();
    expect(screen.getByText(/15 → 16/)).toBeTruthy();
    expect(within(screen.getByRole("region", { name: "Приріст HP" })).getByText("Приріст HP: +13")).toBeTruthy();
    expect(screen.getByText(/Дворфська витривалість \+1/)).toBeTruthy();
    rerender(<LevelUpConfirmStep totalLevel={4} className="Воїн" classLevelAfter={4} pers={pers}
      allFeats={[]} traitHitPointsPerLevel={0} formData={{ customAsi: [{ ability: "STR", value: 2 }] }}
      selectedClass={null} effectiveSubclass={null} newFeatures={[]} />);
    expect(screen.queryByText("Кухар")).toBeNull();
    expect(screen.queryByText("Парирування")).toBeNull();
    expect(screen.getByText(/10 → 12/)).toBeTruthy();
  });
});
