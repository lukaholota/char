// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { GameSessionListItem } from "@/server/db/game-sessions";

const mocks = vi.hoisted(() => ({ findCurrentUserId: vi.fn(), listGameSessionsForUser: vi.fn(), noAi: { enabled: false } }));
vi.mock("@/server/db/current-user", () => ({ findCurrentUserId: mocks.findCurrentUserId }));
vi.mock("@/server/db/game-sessions", () => ({ listGameSessionsForUser: mocks.listGameSessionsForUser, findGameSessionView: vi.fn(), findInvite: vi.fn(), listBindablePers: vi.fn() }));
vi.mock("@/lib/actions/game-sessions", () => ({ createGameSessionAction: vi.fn() }));
vi.mock("@/app/games/room-hero-sheet", () => ({ RoomHeroSheet: () => null, RoomHeroSheetSkeleton: () => null }));
vi.mock("@/components/games/GameRoomPage", () => ({ GameRoomPage: () => null }));
vi.mock("@/components/games/GameJoinCard", () => ({ GameJoinCard: () => null }));
vi.mock("@/lib/no-ai/no-ai-server", () => ({ redirectKeepingNoAiMode: vi.fn() }));
vi.mock("@/lib/components/auth/GoogleAuthDialog", () => ({ default: ({ trigger }: { trigger?: ReactNode }) => trigger ?? <button type="button">Увійти</button> }));
vi.mock("@/components/no-ai/NoAiModeProvider", () => ({ useModeRouter: () => ({ push: vi.fn() }), useNoAiMode: () => ({ enabled: mocks.noAi.enabled, routePathname: "/games" }) }));
vi.mock("@/components/no-ai/ModeLink", () => ({ ModeLink: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a> }));
vi.mock("@/components/games/use-games-href", () => ({ useGamesHref: () => (path: string) => path }));

import { buildGameSessionsPage } from "@/app/games/game-route-pages";

function buildRoom(overrides: Partial<GameSessionListItem>): GameSessionListItem {
  return { id: 1, name: "Склеп", isArchived: false, myRole: "GM", memberCount: 3, ...overrides } as GameSessionListItem;
}

async function renderPageFor(sessions: GameSessionListItem[] | null) {
  mocks.findCurrentUserId.mockResolvedValue(sessions === null ? null : 7);
  mocks.listGameSessionsForUser.mockResolvedValue(sessions ?? []);
  render(await buildGameSessionsPage("2014"));
}

const heading = (name: string) => screen.queryByRole("heading", { name });
const HERO = "Бій, який рахує себе сам";
const FEATURE = "Заклинання летить просто з листа";

function isBefore(first: HTMLElement, second: HTMLElement) {
  return Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.noAi.enabled = false;
});
afterEach(cleanup);

describe("сторінка /games", () => {
  it("гість бачить лендинг із входом і нічого не питає в бази про кімнати", async () => {
    await renderPageFor(null);
    expect(heading(HERO)).not.toBeNull();
    expect(heading(FEATURE)).not.toBeNull();
    expect(screen.getAllByRole("button", { name: "Увійти й створити кімнату" })).toHaveLength(2);
    expect(screen.queryByLabelText("Назва нової кімнати")).toBeNull();
    expect(mocks.listGameSessionsForUser).not.toHaveBeenCalled();
  });

  it("без кімнат лендинг закінчується формою, а кнопка вгорі веде до неї", async () => {
    await renderPageFor([]);
    const finale = heading("Створіть першу кімнату") as HTMLElement;
    expect(isBefore(heading(HERO) as HTMLElement, finale)).toBe(true);
    expect(isBefore(heading(FEATURE) as HTMLElement, finale)).toBe(true);
    Element.prototype.scrollIntoView = vi.fn();
    fireEvent.click(screen.getByRole("button", { name: "Створити першу кімнату" }));
    expect(document.activeElement).toBe(screen.getByLabelText("Назва нової кімнати"));
  });

  it("лише архівні кімнати: це вже не перша кімната, а архів лишається доступним", async () => {
    await renderPageFor([buildRoom({ isArchived: true })]);
    expect(heading(HERO)).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Створити першу кімнату" })).toBeNull();
    expect(screen.getAllByRole("button", { name: "Створити кімнату" })).toHaveLength(2);
    expect(screen.getByText(/Архів · 1/)).not.toBeNull();
  });

  it("зі своїми кімнатами спершу список, а можливості — нижче й без другого героя", async () => {
    await renderPageFor([buildRoom({})]);
    expect(isBefore(heading("Мої кімнати") as HTMLElement, heading("Що вміють кімнати") as HTMLElement)).toBe(true);
    expect(heading(FEATURE)).not.toBeNull();
    expect(heading(HERO)).toBeNull();
    expect(screen.queryByLabelText("Назва нової кімнати")).toBeNull();
  });

  it("у режимі без ШІ кадрів і підписів до них немає, текст лишається", async () => {
    mocks.noAi.enabled = true;
    await renderPageFor(null);
    expect(screen.queryAllByRole("img")).toHaveLength(0);
    expect(screen.queryByText("Так бачить гравець")).toBeNull();
    expect(heading(FEATURE)).not.toBeNull();
  });
});
