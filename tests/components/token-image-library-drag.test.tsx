// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TokenImageLibrary } from "@/components/games/CreatureImageSection";

vi.mock("@/lib/actions/game-token-images", () => ({
  listTokenImagesAction: vi.fn(async () => ({ ok: true, value: ["token-images/7/a.webp"] })),
  deleteTokenImageAction: vi.fn(),
  setMapCreatureImageAction: vi.fn(),
  uploadTokenImageAction: vi.fn(),
}));
vi.mock("@/components/no-ai/NoAiModeProvider", () => ({ useModeRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/components/no-ai/ContentImage", () => ({ ContentImage: () => null, useIsArtHidden: () => false }));
vi.mock("@/lib/components/portrait/ImageCropDialog", () => ({ ImageCropDialog: () => null }));

afterEach(cleanup);

const renderLibrary = async () => {
  const onPick = vi.fn(async () => undefined);
  const onDrop = vi.fn(async () => undefined);
  render(<TokenImageLibrary chosenKey={null} cropTitle="Зображення обʼєкта" onPick={onPick} mapDrop={{ onDrop, canDropAt: (point) => point.clientX > 500 }} />);
  return { onPick, onDrop, tile: await screen.findByRole("button", { name: "Поставити зображення 1" }) };
};

describe("власні зображення обʼєктів", () => {
  it("мишею тягнуться одразу на місце на мапі", async () => {
    const { onPick, onDrop, tile } = await renderLibrary();

    fireEvent.pointerDown(tile, { button: 0, pointerId: 1, pointerType: "mouse", clientX: 10, clientY: 10 });
    await act(async () => {
      window.dispatchEvent(new PointerEvent("pointermove", { pointerId: 1, clientX: 600, clientY: 200 }));
      window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1, clientX: 600, clientY: 200 }));
    });

    expect(onDrop).toHaveBeenCalledWith("token-images/7/a.webp", { clientX: 600, clientY: 200 });
    expect(onPick).not.toHaveBeenCalled();
  });

  it("дотик без руху ставить зображення в центр, як і раніше", async () => {
    const { onPick, onDrop, tile } = await renderLibrary();

    fireEvent.pointerDown(tile, { button: 0, pointerId: 2, pointerType: "mouse", clientX: 10, clientY: 10 });
    await act(async () => {
      window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 2, clientX: 10, clientY: 10 }));
    });

    expect(onPick).toHaveBeenCalledWith("token-images/7/a.webp");
    expect(onDrop).not.toHaveBeenCalled();
  });
});
