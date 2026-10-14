// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useCatalogSpellRatings } from "@/hooks/useCatalogSpellRatings";

const casters = [{ className: "WIZARD_2014" }];
const render = (isOn: boolean) => renderHook(() => useCatalogSpellRatings({ casters, isEmbedMode: true, is2024: false, isOn }));

describe("useCatalogSpellRatings", () => {
  it("rates spells when the RPGbot toggle is on", async () => {
    const { result } = render(true);
    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current).toMatchObject({ canOffer: true, canRate: true });
    expect(result.current.findMatches({ engName: "Fireball" }).length).toBeGreaterThan(0);
  });

  it("keeps the toggle but drops ratings and their order when it is off", () => {
    const { result } = render(false);
    expect(result.current).toMatchObject({ canOffer: true, canRate: false, isReady: false });
    expect(result.current.findMatches({ engName: "Fireball" })).toEqual([]);
  });
});
