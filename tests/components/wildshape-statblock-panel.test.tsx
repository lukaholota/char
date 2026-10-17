// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { CreatureIndexEntry } from "@/lib/bestiary-index";
import type { WildshapePicking } from "@/components/bestiary/useWildshapePicking";
import type { WildshapeRatings } from "@/components/bestiary/useWildshapeRatings";
import type { WildshapeStanding } from "@/server/db/wildshape";

const posthog = vi.hoisted(() => ({ capturePostHogEvent: vi.fn() }));
vi.mock("@/lib/monitoring/posthog-client", () => posthog);
vi.mock("@/components/bestiary/CreatureStatblockCard", () => ({ CreatureStatblockCard: () => null }));
vi.mock("@/components/bestiary/CreatureDiscussion", () => ({ CreatureDiscussion: () => null }));
vi.mock("@/components/homebrew/HomebrewEntryDetails", () => ({ HomebrewByline: () => null, HomebrewEntryButtons: () => null }));

const { StatblockPanel } = await import("@/components/bestiary/BestiaryStatblockPanel");
const { findEntryEligibility } = await import("@/lib/bestiary-wildshape");
const { wildshapeRatingCatalog } = await import("@/lib/optimization/wildshape-rating-catalog");

afterEach(() => {
  cleanup();
  posthog.capturePostHogEvent.mockClear();
});

const beast = (key: string, nameEng: string, challenge: string): CreatureIndexEntry =>
  ({ creatureId: 1, key, name: nameEng, nameEng, type: "Звір", challenge }) as CreatureIndexEntry;

const wolf = beast("wolf", "Wolf", "1/4");
const direWolf = beast("dire-wolf", "Dire Wolf", "1");

const baseDruid: WildshapeStanding = {
  druidLevel: 2,
  isMoonCircle: false,
  ruleset: "RULES_2014",
  limits: { maxChallengeRating: 0.25, allowsFlySpeed: false, allowsSwimSpeed: false },
  limitNotes: [],
  knownFormsLimit: null,
};

function buildPicking(standing: WildshapeStanding) {
  return {
    standing,
    findEligibility: (creature: CreatureIndexEntry) => findEntryEligibility(creature, standing),
    isAttached: () => false,
    isAdding: false,
    addForm: vi.fn((_creature: CreatureIndexEntry, onAdded?: () => void) => onAdded?.()),
  } as unknown as WildshapePicking;
}

const ratingsOn = {
  canRate: true,
  isOn: true,
  catalog: wildshapeRatingCatalog,
  findRating: (creature: CreatureIndexEntry) => wildshapeRatingCatalog.forms[creature.key] ?? null,
} as unknown as WildshapeRatings;

function renderPanel(creature: CreatureIndexEntry, wildshape = buildPicking(baseDruid)) {
  render(<StatblockPanel creature={creature} statblock={null} loreGroup={null} is2024={false} wildshape={wildshape} ratings={ratingsOn} homebrewEntry={null} />);
  return wildshape;
}

describe("панель істоти в пікері дикої форми", () => {
  it("показує оцінку RPGbot поруч із кнопкою додавання", () => {
    renderPanel(wolf);

    expect(screen.getByRole("region", { name: "Оцінка RPGbot" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Додати як звірину форму/ })).toBeTruthy();
  });

  it("для недоступної форми каже, з якого рівня друїда вона відкриється", () => {
    renderPanel(direWolf);

    expect(screen.getByText("Стане доступною з 8 рівня друїда")).toBeTruthy();
  });

  it("доступна форма не обіцяє рівня відкриття", () => {
    renderPanel(wolf);

    expect(screen.queryByText(/Стане доступною/)).toBeNull();
  });

  it("додана форма йде в аналітику з оцінкою і станом друїда", () => {
    const wildshape = renderPanel(wolf);

    fireEvent.click(screen.getByRole("button", { name: /Додати як звірину форму/ }));

    expect(wildshape.addForm).toHaveBeenCalledWith(wolf, expect.any(Function));
    expect(posthog.capturePostHogEvent).toHaveBeenCalledWith("rpgbot_wildshape_form_added", {
      product_area: "rpgbot",
      rating_score: wildshapeRatingCatalog.forms.wolf.score,
      is_eligible: true,
      recommendations_on: true,
      is_moon_circle: false,
      druid_level: 2,
    });
  });
});
