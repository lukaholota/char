// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { CreatureData } from "@/lib/bestiaryData";

const loadCreatureStatblock = vi.fn();

vi.mock("@/lib/catalog-reads", () => ({
  fetchCreatureStatblock: (key: string, ruleset: string) => loadCreatureStatblock(key, ruleset),
}));

const { useCreatureStatblock } = await import("@/hooks/useCreatureStatblock");

function buildCreature(nameEng: string): CreatureData {
  return { creatureId: 1, name: nameEng, nameEng, actions: `Дії ${nameEng}` } as CreatureData;
}

function StatblockProbe({ creatureKey, initial }: { creatureKey: string | null; initial: CreatureData | null }) {
  const statblock = useCreatureStatblock(creatureKey, "RULES_2014", initial);
  return <span>{statblock ? statblock.actions : "порожньо"}</span>;
}

beforeEach(() => loadCreatureStatblock.mockReset());
afterEach(cleanup);

/// KR20.9: список бестіарію тримає лише вузький індекс, тож статблок приходить окремим GET-запитом.
describe("статблок істоти довантажується на розкриття", () => {
  it("перша істота каталогу малюється без жодного запиту", () => {
    render(<StatblockProbe creatureKey="aboleth" initial={buildCreature("Aboleth")} />);

    expect(screen.getByText("Дії Aboleth")).toBeTruthy();
    expect(loadCreatureStatblock).not.toHaveBeenCalled();
  });

  it("інша істота приїжджає окремим запитом", async () => {
    loadCreatureStatblock.mockResolvedValue(buildCreature("Beholder"));

    render(<StatblockProbe creatureKey="beholder" initial={buildCreature("Aboleth")} />);

    expect(screen.getByText("порожньо")).toBeTruthy();
    await waitFor(() => expect(screen.getByText("Дії Beholder")).toBeTruthy());
    expect(loadCreatureStatblock).toHaveBeenCalledWith("beholder", "RULES_2014");
  });

  it("повернення до вже переглянутої істоти не робить другого запиту", async () => {
    loadCreatureStatblock.mockResolvedValue(buildCreature("Beholder"));

    const { rerender } = render(
      <StatblockProbe creatureKey="beholder" initial={buildCreature("Aboleth")} />
    );
    await waitFor(() => expect(screen.getByText("Дії Beholder")).toBeTruthy());

    rerender(<StatblockProbe creatureKey="aboleth" initial={buildCreature("Aboleth")} />);
    expect(screen.getByText("Дії Aboleth")).toBeTruthy();

    rerender(<StatblockProbe creatureKey="beholder" initial={buildCreature("Aboleth")} />);
    expect(screen.getByText("Дії Beholder")).toBeTruthy();
    expect(loadCreatureStatblock).toHaveBeenCalledTimes(1);
  });

  it("істота, якої вже немає в каталозі, лишає панель порожньою, а не валить сторінку", async () => {
    loadCreatureStatblock.mockResolvedValue(null);

    render(<StatblockProbe creatureKey="zниклa" initial={null} />);

    await waitFor(() => expect(loadCreatureStatblock).toHaveBeenCalled());
    expect(screen.getByText("порожньо")).toBeTruthy();
  });
});
