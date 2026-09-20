// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { CreatureData } from "@/lib/bestiaryData";
import type { CreatureStatblockView } from "@/lib/catalog-reads";

const loadCreatureStatblock = vi.fn();

vi.mock("@/lib/catalog-reads", () => ({
  fetchCreatureStatblock: (key: string, ruleset: string) => loadCreatureStatblock(key, ruleset),
}));

const { useCreatureStatblock } = await import("@/hooks/useCreatureStatblock");

function buildStatblockView(nameEng: string): CreatureStatblockView {
  return {
    creature: { creatureId: 1, name: nameEng, nameEng, actions: `Дії ${nameEng}` } as CreatureData,
    loreGroup: { name: `Група ${nameEng}` } as CreatureStatblockView["loreGroup"],
  };
}

function StatblockProbe({ creatureKey, initial }: { creatureKey: string | null; initial: CreatureStatblockView | null }) {
  const { creature, loreGroup } = useCreatureStatblock(creatureKey, "RULES_2014", initial);
  return <span>{creature ? `${creature.actions} · ${loreGroup?.name ?? "без лору"}` : "порожньо"}</span>;
}

beforeEach(() => loadCreatureStatblock.mockReset());
afterEach(cleanup);

/// KR20.9: список бестіарію тримає лише вузький індекс, тож статблок приходить окремим GET-запитом.
describe("статблок істоти довантажується на розкриття", () => {
  it("перша істота каталогу малюється без жодного запиту", () => {
    render(<StatblockProbe creatureKey="aboleth" initial={buildStatblockView("Aboleth")} />);

    expect(screen.getByText("Дії Aboleth · Група Aboleth")).toBeTruthy();
    expect(loadCreatureStatblock).not.toHaveBeenCalled();
  });

  it("інша істота приїжджає окремим запитом", async () => {
    loadCreatureStatblock.mockResolvedValue(buildStatblockView("Beholder"));

    render(<StatblockProbe creatureKey="beholder" initial={buildStatblockView("Aboleth")} />);

    expect(screen.getByText("порожньо")).toBeTruthy();
    await waitFor(() => expect(screen.getByText("Дії Beholder · Група Beholder")).toBeTruthy());
    expect(loadCreatureStatblock).toHaveBeenCalledWith("beholder", "RULES_2014");
  });

  it("повернення до вже переглянутої істоти не робить другого запиту", async () => {
    loadCreatureStatblock.mockResolvedValue(buildStatblockView("Beholder"));

    const { rerender } = render(
      <StatblockProbe creatureKey="beholder" initial={buildStatblockView("Aboleth")} />
    );
    await waitFor(() => expect(screen.getByText("Дії Beholder · Група Beholder")).toBeTruthy());

    rerender(<StatblockProbe creatureKey="aboleth" initial={buildStatblockView("Aboleth")} />);
    expect(screen.getByText("Дії Aboleth · Група Aboleth")).toBeTruthy();

    rerender(<StatblockProbe creatureKey="beholder" initial={buildStatblockView("Aboleth")} />);
    expect(screen.getByText("Дії Beholder · Група Beholder")).toBeTruthy();
    expect(loadCreatureStatblock).toHaveBeenCalledTimes(1);
  });

  it("істота, якої вже немає в каталозі, лишає панель порожньою, а не валить сторінку", async () => {
    loadCreatureStatblock.mockResolvedValue({ creature: null, loreGroup: null });

    render(<StatblockProbe creatureKey="zниклa" initial={null} />);

    await waitFor(() => expect(loadCreatureStatblock).toHaveBeenCalled());
    expect(screen.getByText("порожньо")).toBeTruthy();
  });
});
