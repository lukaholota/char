// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

vi.mock("@/lib/actions/game-sessions", () => ({ moveMapTokensAction: vi.fn() }));
vi.mock("@/components/games/HeroTokens", () => ({ findHeroPositionKey: vi.fn() }));
vi.mock("@/components/games/MapCreatureTokens", () => ({ findCreaturePositionKey: vi.fn() }));

import { useMapGroup } from "@/components/games/use-map-group";

const ITEMS = ["hero-1", "creature-2", "creature-3"].map((key, index) => ({ key, position: { x: 0.1 + index * 0.3, y: 0.5 } }));

function pressWith(keys: Partial<Pick<PointerEvent, "shiftKey" | "ctrlKey" | "metaKey">>) {
  const event = new MouseEvent("pointerdown", keys) as PointerEvent;
  act(() => void window.dispatchEvent(event));
}

function renderGroup(picked: string | null) {
  const onPickOne = vi.fn();
  const hook = renderHook(() => useMapGroup({ toShare: () => null, collectItems: () => ITEMS, findPickedKey: () => picked, onPickOne, onMove: vi.fn() }));
  return { hook, onPickOne, pickWithKey: (key: string) => act(() => void hook.result.current.pickWithKey(key)) };
}

describe("вибір кількох на мапі клавішами", () => {
  it("Shift додає до вибраного, Ctrl чи ⌘ прибирає з групи", () => {
    const { hook, onPickOne, pickWithKey } = renderGroup("hero-1");
    pressWith({ shiftKey: true });
    pickWithKey("creature-2");
    pickWithKey("creature-3");
    expect(hook.result.current.findMembers().map((item) => item.key)).toEqual(["hero-1", "creature-2", "creature-3"]);

    pressWith({ metaKey: true });
    pickWithKey("creature-2");
    expect(hook.result.current.findMembers().map((item) => item.key)).toEqual(["hero-1", "creature-3"]);
    pressWith({ ctrlKey: true });
    pickWithKey("hero-1");
    expect(hook.result.current.findMembers()).toEqual([]);
    expect(onPickOne).toHaveBeenLastCalledWith("creature-3");
  });

  it("клік без клавіші не чіпає групу — це звичайний вибір", () => {
    const { hook, onPickOne } = renderGroup("hero-1");
    pressWith({});
    let isPicked = true;
    act(() => void (isPicked = hook.result.current.pickWithKey("creature-2")));
    expect(isPicked).toBe(false);
    expect(onPickOne).not.toHaveBeenCalled();
  });
});
