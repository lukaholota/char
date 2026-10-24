// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import { CreationSelectionSummary } from "@/lib/components/characterCreator/CreationSelectionSummary";

vi.hoisted(() => {
  const entries = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value), removeItem: (key: string) => entries.delete(key),
  } });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("заклинання, мови й майстерності в підсумку", () => {
  it("показує два джерела Magic Initiate, назви з БД та актуальну зброю", async () => {
    const fetchNames = vi.fn().mockResolvedValue({ ok: true, json: async () => [{ spellId: 31005, name: "Настанова [Guidance]" }] });
    vi.stubGlobal("fetch", fetchNames);
    usePersFormStore.setState({ formData: {
      languagesSchema: { languages: ["ELVISH"] }, weaponMasteryWeaponIds: [5],
      featSpellSelections: { BACKGROUND_ORIGIN: [31005], SPECIES_VERSATILITY: [31005] },
    }, isHydrated: true });
    const { rerender } = render(<CreationSelectionSummary ruleset="RULES_2024" weapons={[{ weaponId: 5, name: "DAGGER" } as never]} />);
    await waitFor(() => expect(screen.getAllByText("Настанова [Guidance]")).toHaveLength(2));
    expect(within(screen.getByRole("region", { name: "Риса походження" })).getByText("Настанова [Guidance]")).toBeTruthy();
    expect(screen.getByText("Ельфійська")).toBeTruthy();
    expect(screen.getByText("Кинджал")).toBeTruthy();
    expect(fetchNames.mock.calls[0][0]).toContain("ids=31005");
    usePersFormStore.setState({ formData: {} });
    rerender(<CreationSelectionSummary ruleset="RULES_2024" weapons={[]} />);
    expect(screen.queryByText("Кинджал")).toBeNull();
    expect(screen.queryByText("Настанова [Guidance]")).toBeNull();
  });
});
