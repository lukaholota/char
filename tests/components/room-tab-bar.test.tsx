// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { JournalPanelContent, RoomTabBar } from "@/components/games/RoomPanels";
import { findSideTab, resetRoomTabs, useRoomTabStore } from "@/components/games/room-tabs";
import { useGameSessionStore } from "@/lib/stores/gameSessionStore";
import type { GameSessionView } from "@/server/db/game-sessions";

vi.hoisted(() => {
  const items = new Map<string, string>();
  const storage = { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => void items.set(key, value), removeItem: (key: string) => void items.delete(key) };
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true, writable: true });
  Object.defineProperty(window, "localStorage", { value: storage, configurable: true, writable: true });
});

vi.mock("@/components/games/GameJournal", () => ({ GameJournal: () => null, GameSoundToggle: () => null }));
vi.mock("@/components/games/GameRoomManagement", () => ({ GameRoomManagement: () => null }));
vi.mock("@/components/games/GameRoomPersPicker", () => ({ GameRoomPersPicker: () => null }));
vi.mock("@/components/games/GameRoomSidebar", () => ({ GameRoomInvite: () => null, GameRoomMembers: () => null }));
vi.mock("@/components/games/GameSessionDock", () => ({ PopOutJournalButton: () => null }));
vi.mock("@/components/games/RollTargetControls", () => ({ RollTargetChip: () => null }));
vi.mock("@/components/games/RoomRollTarget", () => ({ JournalRollStrip: () => null }));

function SideBar() {
  const isSideFolded = useRoomTabStore((state) => state.isSideFolded);
  return <RoomTabBar tabs={["journal", "room"]} current="journal" unseen={3} label="Бічна панель" isFolded={isSideFolded} canFold />;
}

afterEach(() => {
  cleanup();
  resetRoomTabs();
  useGameSessionStore.setState({ isJournalDocked: false });
});

describe("бічна панель кімнати", () => {
  it("згортається в колонку іконок і розгортається кліком по вкладці", () => {
    render(<SideBar />);
    expect(screen.getByRole("tab", { name: "Журнал" }).getAttribute("aria-selected")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "Згорнути бічну панель" }));
    expect(useRoomTabStore.getState().isSideFolded).toBe(true);
    expect(screen.getByRole("button", { name: "Розгорнути бічну панель" }).getAttribute("aria-expanded")).toBe("false");
    expect(screen.getAllByRole("tab").map((tab) => tab.getAttribute("aria-selected"))).toEqual(["false", "false"]);
    expect(screen.getByRole("tab", { name: /^Журнал\s*3\s*нових$/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "Кімната" }));
    expect(useRoomTabStore.getState()).toMatchObject({ isSideFolded: false, sideTab: "room" });
  });

  it("закріплений журнал — лише кидки, а вкладка «Журнал» розгортає його назад", () => {
    const view = { id: 1 } as GameSessionView;
    const { rerender } = render(<JournalPanelContent view={view} isDocked={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Закріпити журнал унизу панелі" }));
    expect(useGameSessionStore.getState().isJournalDocked).toBe(true);

    rerender(<JournalPanelContent view={view} isDocked />);
    expect(screen.queryByRole("heading", { name: "Журнал кидків" })).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();

    cleanup();
    render(<SideBar />);
    fireEvent.click(screen.getByRole("tab", { name: /^Журнал/ }));
    expect(useGameSessionStore.getState().isJournalDocked).toBe(false);
    expect(useRoomTabStore.getState().sideTab).toBe("journal");
  });

  it("вкладка «Журнал» на телефоні не знімає закріплення, вибране на компʼютері", () => {
    useGameSessionStore.setState({ isJournalDocked: true });
    render(<RoomTabBar tabs={["map", "journal"]} current="map" unseen={0} label="Розділи кімнати" />);
    fireEvent.click(screen.getByRole("tab", { name: "Журнал" }));
    expect(useGameSessionStore.getState().isJournalDocked).toBe(true);
    expect(useRoomTabStore.getState().tab).toBe("journal");
  });

  it("закріплений журнал не займає вкладку бічної панелі", () => {
    expect(findSideTab("journal", true, true)).toBe("hero");
    expect(findSideTab("journal", false, true)).toBe("room");
    expect(findSideTab(null, false, true)).toBe("room");
    expect(findSideTab("journal", true, false)).toBe("journal");
    expect(findSideTab(null, false, false)).toBe("journal");
    expect(findSideTab("hero", false, false)).toBe("journal");
  });
});
