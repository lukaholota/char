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
    defenses: { FIRE: "resistant", COLD: "vulnerable" },
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

  it("майстер бачить хто кому, захист зі статблоку наперед і завдає шкоду після правки числа й типу", async () => {
    showRoom("GM");
    mocks.confirmRollDamageAction.mockResolvedValue({ ok: true, value: [] });
    render(<DamageReviewDialog />);
    expect(screen.getByRole("dialog", { name: "Тарас → Гоблін" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Завдати 11" })).toBeTruthy();
    const [slashing] = screen.getAllByRole("group");
    fireEvent.click(slashing.querySelector("button:nth-child(3)") as HTMLButtonElement);
    expect(screen.getByRole("button", { name: "Завдати 20" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Кинуто: Вогняний клинок"), { target: { value: "8" } });
    expect(screen.getByRole("button", { name: "Завдати 22" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Тип шкоди: Вогняний клинок"), { target: { value: "COLD" } });
    fireEvent.click(screen.getByRole("button", { name: "Завдати 34" }));
    await waitFor(() => expect(mocks.confirmRollDamageAction).toHaveBeenCalledWith(5, 7, [{ amount: 9, defense: "vulnerable", damageType: "SLASHING" }, { amount: 8, defense: "vulnerable", damageType: "COLD" }]));
    fireEvent.change(screen.getByLabelText("Тип шкоди: Вогняний клинок"), { target: { value: "ACID" } });
    expect(screen.getByRole("button", { name: "Завдати 26" })).toBeTruthy();
  });

  it("черга йде від найстаршого кидка й показує, скільки ще чекає", () => {
    const newer = { ...pending, seq: 9, persName: "Ярина" } as GameRollEventView;
    useGameSessionLiveStore.setState({ sessionId: 5, view: { myRole: "GM" } as never, events: [newer, pending] });
    render(<DamageReviewDialog />);
    expect(screen.getByRole("dialog", { name: "Тарас → Гоблін" })).toBeTruthy();
    expect(screen.getByText(/ще 1 в черзі/)).toBeTruthy();
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
