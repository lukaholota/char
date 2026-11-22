// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ post: vi.fn(), toastError: vi.fn() }));

vi.mock("@/lib/actions/game-sessions", () => ({ postJournalMessageAction: mocks.post }));
vi.mock("sonner", () => ({ toast: { error: mocks.toastError } }));

const { JournalComposer } = await import("@/components/games/JournalComposer");
const { addGameEvents, resetLiveSession, useGameSessionLiveStore } = await import("@/lib/components/game/game-session-live-store");

const me = { userId: 1, name: "Оля", persName: "Ліра", avatarUrl: null, role: "PLAYER" };
beforeEach(() => {
  vi.clearAllMocks();
  resetLiveSession(5);
  useGameSessionLiveStore.setState({ view: { id: 5, myUserId: 1, members: [me] } as never });
});
afterEach(cleanup);

const field = () => screen.getByRole("textbox", { name: "Повідомлення в журнал" });
const typeMessage = (text: string) => fireEvent.change(field(), { target: { value: text } });
const pendingLabels = () => useGameSessionLiveStore.getState().pendingRolls.map((pending) => pending.event.label);

describe("поле журналу", () => {
  it("повідомлення лише майстру видно в журналі ще до відповіді сервера, а справжнє стає на його місце", async () => {
    let answer: (value: unknown) => void = () => undefined;
    mocks.post.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    render(<JournalComposer sessionId={5} isGm={false} />);
    expect(screen.getByRole("button", { name: "Надіслати в журнал" })).toHaveProperty("disabled", true);
    fireEvent.click(screen.getByRole("button", { name: "Лише майстру" }));
    typeMessage("  Краду перстень ");
    fireEvent.keyDown(field(), { key: "Enter" });

    expect(field()).toHaveProperty("value", "");
    const [pending] = useGameSessionLiveStore.getState().pendingRolls;
    expect(pending.event).toMatchObject({ source: "MESSAGE", visibility: "GM", label: "Краду перстень", authorUserId: 1, persName: "Ліра" });
    expect(mocks.post).toHaveBeenCalledWith(5, "Краду перстень", true, pending.key);

    await act(async () => answer({ ok: true, value: null }));
    expect(pendingLabels()).toEqual(["Краду перстень"]);
    act(() => addGameEvents(5, [{ ...pending.event, seq: 10 }]));
    expect(pendingLabels()).toEqual([]);
    expect(useGameSessionLiveStore.getState().rollKeys[10]).toBe(pending.key);
  });

  it("помилка прибирає повідомлення з журналу, повертає текст і показує причину; майстер не має перемикача «лише майстру»", async () => {
    mocks.post.mockResolvedValue({ ok: false, error: "Кампанію заархівовано" });
    render(<JournalComposer sessionId={5} isGm />);
    expect(screen.queryByRole("button", { name: "Лише майстру" })).toBeNull();
    typeMessage("Падає стеля");
    fireEvent.click(screen.getByRole("button", { name: "Надіслати в журнал" }));

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith("Кампанію заархівовано"));
    expect(field()).toHaveProperty("value", "Падає стеля");
    expect(pendingLabels()).toEqual([]);
    expect(mocks.post).toHaveBeenCalledWith(5, "Падає стеля", false, expect.any(String));
  });
});
