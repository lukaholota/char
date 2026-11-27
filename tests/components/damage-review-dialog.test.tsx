// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { GameRollEventView } from "@/server/db/game-roll-events";

const mocks = vi.hoisted(() => ({ confirmRollDamageAction: vi.fn(), cancelGameRollAction: vi.fn() }));
vi.mock("@/lib/actions/game-sessions", () => mocks);
vi.mock("@/lib/monitoring/game-analytics", () => ({ captureGameEvent: vi.fn() }));

import { DamageReviewDialog } from "@/components/games/DamageReviewDialog";
import { useGameSessionLiveStore } from "@/lib/components/game/game-session-live-store";

const pending = {
  seq: 7,
  authorName: "Оля",
  persName: "Тарас",
  label: "Меч · Шкода",
  target: { name: "Гоблін" },
  damageReview: {
    isPending: true,
    parts: [
      { damageType: "SLASHING", label: "", amount: 9, defense: null },
      { damageType: "FIRE", label: "Вогняний клинок", amount: 5, defense: "resistant" },
    ],
  },
} as unknown as GameRollEventView;

const showRoom = (myRole: "GM" | "PLAYER") => useGameSessionLiveStore.setState({ sessionId: 5, view: { myRole } as never, events: [pending] });

describe("перевірка шкоди майстром", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("гравцеві вікно не показується", () => {
    showRoom("PLAYER");
    render(<DamageReviewDialog />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("майстер бачить хто кому, захист зі статблоку наперед і наносить шкоду після правки", async () => {
    showRoom("GM");
    mocks.confirmRollDamageAction.mockResolvedValue({ ok: true, value: [] });
    render(<DamageReviewDialog />);
    expect(screen.getByRole("dialog", { name: "Тарас → Гоблін" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Нанести 11" })).toBeTruthy();
    const [slashing] = screen.getAllByRole("group");
    fireEvent.click(slashing.querySelector("button:nth-child(3)") as HTMLButtonElement);
    expect(screen.getByRole("button", { name: "Нанести 20" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Вогняний клинок (вогняна)"), { target: { value: "8" } });
    fireEvent.click(screen.getByRole("button", { name: "Нанести 22" }));
    await waitFor(() => expect(mocks.confirmRollDamageAction).toHaveBeenCalledWith(5, 7, [{ amount: 9, defense: "vulnerable" }, { amount: 8, defense: "resistant" }]));
  });

  it("«Пізніше» ховає вікно, «Відхилити» скасовує кидок", async () => {
    showRoom("GM");
    mocks.cancelGameRollAction.mockResolvedValue({ ok: true, value: [] });
    const { rerender } = render(<DamageReviewDialog />);
    fireEvent.click(screen.getByRole("button", { name: "Відхилити" }));
    await waitFor(() => expect(mocks.cancelGameRollAction).toHaveBeenCalledWith(5, 7));
    fireEvent.click(screen.getByRole("button", { name: "Пізніше" }));
    rerender(<DamageReviewDialog />);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
