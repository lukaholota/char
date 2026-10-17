// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";

const posthog = vi.hoisted(() => {
  const entries = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    writable: true,
    value: {
      get length() {
        return entries.size;
      },
      key: (index: number) => [...entries.keys()][index] ?? null,
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => void entries.set(key, String(value)),
      removeItem: (key: string) => void entries.delete(key),
      clear: () => entries.clear(),
    } satisfies Storage,
  });
  return { capturePostHogEvent: vi.fn() };
});
vi.mock("@/lib/monitoring/posthog-client", () => posthog);

import { WildshapeFilterSection, WildshapeRowNote } from "@/components/bestiary/BestiaryWildshapePicking";
import { WildshapeRatingPanel } from "@/components/bestiary/WildshapeRatingPanel";
import { useWildshapeRatings } from "@/components/bestiary/useWildshapeRatings";
import type { CreatureIndexEntry } from "@/lib/bestiary-index";
import { findEntryEligibility } from "@/lib/bestiary-wildshape";
import { wildshapeRatingCatalog } from "@/lib/optimization/wildshape-rating-catalog";
import { findWildshapeEligibility } from "@/rules/wildshape";
import type { WildshapeStanding } from "@/server/db/wildshape";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  posthog.capturePostHogEvent.mockClear();
});

const entry = (key: string, nameEng: string, challenge: string, speeds: Partial<CreatureIndexEntry> = {}): CreatureIndexEntry =>
  ({ key, name: nameEng, nameEng, type: "Звір", challenge, ...speeds }) as CreatureIndexEntry;

const wolf = entry("wolf", "Wolf", "1/4");
const direWolf = entry("dire-wolf", "Dire Wolf", "1");
const bloodHawk = entry("blood-hawk", "Blood Hawk", "1/8", { flySpeed: 60 });
const unrated = entry("homebrew-cat", "Homebrew Cat", "0");

const standing = (overrides: Partial<WildshapeStanding> = {}): WildshapeStanding => ({
  druidLevel: 2,
  isMoonCircle: true,
  ruleset: "RULES_2014",
  limits: { maxChallengeRating: 1, allowsFlySpeed: false, allowsSwimSpeed: false },
  limitNotes: [],
  knownFormsLimit: null,
  ...overrides,
});

function buildPicking(current: WildshapeStanding | null) {
  return {
    standing: current,
    findEligibility: (creature: CreatureIndexEntry) => (current ? findEntryEligibility(creature, current) : null),
  } as unknown as Parameters<typeof useWildshapeRatings>[1];
}

describe("оцінки RPGbot у пікері дикої форми", () => {
  it("друїд 2014 бачить оцінки, і доступні форми з кращою оцінкою стоять першими", async () => {
    const { result } = renderHook(() => useWildshapeRatings("RULES_2014", buildPicking(standing())));

    await waitFor(() => expect(result.current.catalog).not.toBeNull());
    expect(result.current.canRate).toBe(true);
    expect(result.current.findRating(direWolf)?.score).toBe(4);

    const ranked = result.current.rankRecommendedFirst([unrated, bloodHawk, wolf, direWolf]);
    expect(ranked.map((creature) => creature.key)).toEqual(["dire-wolf", "wolf", "homebrew-cat", "blood-hawk"]);
  });

  it("без кола місяця сильна форма недоступна й не піднімається вгору", async () => {
    const { result } = renderHook(() =>
      useWildshapeRatings("RULES_2014", buildPicking(standing({ isMoonCircle: false, limits: { maxChallengeRating: 0.25, allowsFlySpeed: false, allowsSwimSpeed: false } }))),
    );

    await waitFor(() => expect(result.current.catalog).not.toBeNull());
    expect(result.current.rankRecommendedFirst([direWolf, wolf]).map((creature) => creature.key)).toEqual(["wolf", "dire-wolf"]);
  });

  it("для 2024 і без обраного друїда оцінок немає зовсім", () => {
    const edition2024 = renderHook(() => useWildshapeRatings("RULES_2024", buildPicking(standing({ ruleset: "RULES_2024" }))));
    const noDruid = renderHook(() => useWildshapeRatings("RULES_2014", buildPicking(null)));

    for (const { result } of [edition2024, noDruid]) {
      expect(result.current.canRate).toBe(false);
      expect(result.current.findRating(direWolf)).toBeNull();
      expect(result.current.rankRecommendedFirst([wolf, direWolf])).toEqual([wolf, direWolf]);
    }
  });

  it("вимкнений перемикач ховає оцінки, памʼятається й іде в аналітику", async () => {
    const { result } = renderHook(() => useWildshapeRatings("RULES_2014", buildPicking(standing())));
    await waitFor(() => expect(result.current.catalog).not.toBeNull());

    act(() => result.current.setIsOn(false));

    expect(result.current.catalog).toBeNull();
    expect(result.current.findRating(direWolf)).toBeNull();
    expect(window.localStorage.getItem("rpgbot-spell-recommendations")).toBe("0");
    expect(posthog.capturePostHogEvent).toHaveBeenCalledWith("rpgbot_wildshape_recommendations_toggled", { product_area: "rpgbot", enabled: false });
  });
});

describe("панель оцінки форми", () => {
  const rating = wildshapeRatingCatalog.forms["blood-hawk"];

  it("показує оцінку, коментар і посилання на розділ розбору й оригінал", () => {
    render(<WildshapeRatingPanel catalog={wildshapeRatingCatalog} rating={{ ...rating, score: 1 }} eligibility={null} creatureKey="blood-hawk" />);

    expect(screen.getByRole("heading", { name: "Оцінка RPGbot" })).toBeTruthy();
    expect(screen.getByText(/1\/4/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Читати розбір українською" }).getAttribute("href")).toBe(`/rules/optimization/druid-wild-shape-2014#${rating.sectionId}`);
    expect(screen.getByRole("link", { name: "Оригінал на RPGbot" }).getAttribute("href")).toBe(wildshapeRatingCatalog.sourceUrl);
    expect(posthog.capturePostHogEvent).toHaveBeenCalledWith("rpgbot_surface_viewed", { product_area: "rpgbot", surface: "wildshape_rating_panel", entity_key: "blood-hawk", rating_score: 1 });
  });

  it("нагадує про обмеження руху лише тоді, коли форму блокує політ або плавання", () => {
    const flyLocked = findWildshapeEligibility({ nameEng: "Blood Hawk", type: "Звір", challenge: "1/8", flySpeed: 60, swimSpeed: null, climbSpeed: null, burrowSpeed: null, hasConditionalSpeed: false }, { druidLevel: 2, isMoonCircle: true, ruleset: "RULES_2014" });
    const { container, rerender } = render(<WildshapeRatingPanel catalog={wildshapeRatingCatalog} rating={rating} eligibility={flyLocked} creatureKey="blood-hawk" />);
    expect(container.textContent).toContain("не можуть приймати форми");

    rerender(<WildshapeRatingPanel catalog={wildshapeRatingCatalog} rating={rating} eligibility={null} creatureKey="blood-hawk" />);
    expect(container.textContent).not.toContain("не можуть приймати форми");
  });
});

describe("рядок списку і фільтр", () => {
  it("оцінка видна й у доступної форми, поруч із причиною недоступності — у недоступної", () => {
    const picking = buildPicking(standing());
    const { container, rerender } = render(<WildshapeRowNote creature={wolf} wildshape={picking} rating={{ score: 3, sectionId: "section-7", comment: "" }} />);
    expect(container.textContent).toContain("3/4");
    expect(container.textContent).not.toContain("Недоступна");

    rerender(<WildshapeRowNote creature={bloodHawk} wildshape={picking} rating={{ score: 1, sectionId: "section-6", comment: "" }} />);
    expect(container.textContent).toContain("1/4");
    expect(container.textContent).toContain("Недоступна");

    rerender(<WildshapeRowNote creature={wolf} wildshape={picking} rating={null} />);
    expect(container.textContent).toBe("");
  });

  it("перемикач рекомендацій стоїть у секції «Дика форма» з описом для форм", () => {
    const onChange = vi.fn();
    render(
      <WildshapeFilterSection characters={[]} standing={standing()} persId={7} onlyEligible={false} onSelectPers={vi.fn()} onShowOnlyEligible={vi.fn()} recommendations={{ isOn: true, onChange }} />,
    );

    expect(screen.getByText("Оцінка кожної форми за розбором RPGbot; найкращі доступні вам — зверху.")).toBeTruthy();
    fireEvent.click(screen.getByRole("switch", { name: /Показати рекомендації RPGbot/ }));
    expect(onChange).toHaveBeenCalledWith(false);
  });
});
