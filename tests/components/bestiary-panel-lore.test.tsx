// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import type { CreatureIndexEntry } from "@/lib/bestiary-index";
import type { CreatureData } from "@/lib/bestiaryData";
import type { CreatureLoreGroup } from "@/lib/bestiaryLore";
import type { WildshapePicking } from "@/components/bestiary/useWildshapePicking";

vi.mock("@/components/bestiary/CreatureStatblockCard", () => ({
  CreatureStatblockCard: ({ loreGroupDescription }: { loreGroupDescription?: string | null }) => (
    <div data-statblock-card data-lore-passed={loreGroupDescription ? "так" : "ні"} />
  ),
}));
vi.mock("@/components/bestiary/CreatureDiscussion", () => ({
  CreatureDiscussion: () => null,
}));
vi.mock("@/components/bestiary/BestiaryWildshapePicking", () => ({
  WildshapeAddFormButton: () => null,
}));
vi.mock("@/components/homebrew/HomebrewEntryDetails", () => ({
  HomebrewByline: () => null,
  HomebrewEntryButtons: () => null,
}));

const { StatblockPanel } = await import("@/components/bestiary/BestiaryStatblockPanel");

afterEach(cleanup);

const blueDragon = { creatureId: 582, name: "Стародавній синій дракон", key: "ancient-blue-dragon" } as CreatureIndexEntry;
const statblock = { creatureId: 582, name: "Стародавній синій дракон", nameEng: "Ancient Blue Dragon" } as CreatureData;
const dragons = {
  key: "dragons",
  ruleset: "RULES_2014",
  name: "Дракони",
  engName: "Dragons",
  source: "MM",
  description: "Справжні дракони — крилаті плазуни стародавнього роду.",
  creatureIds: [582],
} as CreatureLoreGroup;

const noWildshape = {
  findEligibility: () => null,
  isAttached: () => false,
  isAdding: false,
  addForm: () => {},
} as unknown as WildshapePicking;

function renderPanel(loreGroup: CreatureLoreGroup | null) {
  return render(
    <StatblockPanel
      creature={blueDragon}
      statblock={statblock}
      loreGroup={loreGroup}
      is2024={false}
      wildshape={noWildshape}
      homebrewEntry={null}
    />
  );
}

/// Лор жив лише на окремій сторінці істоти, а в панелі бестіарію його не було — саме там його шукають.
describe("панель бестіарію показує лор групи", () => {
  it("малює блок лору під статблоком", () => {
    const { container } = renderPanel(dragons);
    expect(container.querySelector("[data-creature-lore]")).not.toBeNull();
  });

  it("віддає статблоку текст групи, щоб той не малював його вдруге", () => {
    const { container } = renderPanel(dragons);
    expect(container.querySelector("[data-statblock-card]")?.getAttribute("data-lore-passed")).toBe("так");
  });

  it("без групи лишає панель без блока", () => {
    const { container } = renderPanel(null);
    expect(container.querySelector("[data-creature-lore]")).toBeNull();
  });
});
