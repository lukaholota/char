// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TokenImageLibrary } from "@/components/games/CreatureImageSection";
import { useState, type ComponentProps } from "react";

vi.mock("@/lib/actions/game-token-images", () => ({
  listTokenImagesAction: vi.fn(async () => ({ ok: true, value: ["token-images/7/a.webp"] })),
  deleteTokenImageAction: vi.fn(),
  setMapCreatureImageAction: vi.fn(),
  uploadTokenImageAction: vi.fn(),
}));
const library = vi.hoisted(() => ({ create: vi.fn(), move: vi.fn(), upload: vi.fn() }));
vi.mock("@/lib/actions/game-image-library", () => ({
  listImageLibraryAction: async () => ({ ok: true, value: { folders: [], images: [{ imageKey: "token-images/7/a.webp", folderId: null }] } }),
  createImageFolderAction: library.create,
  moveLibraryImageAction: library.move,
  uploadImageToLibraryAction: library.upload,
}));
vi.mock("@/components/no-ai/NoAiModeProvider", () => ({ useModeRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/components/no-ai/ContentImage", () => ({ ContentImage: () => null, useIsArtHidden: () => false }));
vi.mock("@/lib/components/portrait/ImageCropDialog", () => ({ ImageCropDialog: () => null }));

afterEach(cleanup);

function FolderLibrary({ onPick, onDrop }: { onPick: ComponentProps<typeof TokenImageLibrary>["onPick"]; onDrop: (key: string, point: { clientX: number; clientY: number }) => Promise<void> }) {
  const [folderId, setFolderId] = useState<number | null>(null);
  return <TokenImageLibrary chosenKey={null} cropTitle="Зображення обʼєкта" onPick={onPick} mapDrop={{ onDrop, canDropAt: (point) => point.clientX > 500, folderId, onFolderChange: setFolderId }} />;
}

const renderLibrary = async () => {
  const onPick = vi.fn(async () => undefined);
  const onDrop = vi.fn(async () => undefined);
  render(<FolderLibrary onPick={onPick} onDrop={onDrop} />);
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

  it("імпортує папку по одному файлу і залишає успішне зображення після помилки", async () => {
    library.create.mockResolvedValue({ ok: true, value: { id: 12, name: "Дерева" } });
    library.upload.mockResolvedValueOnce({ ok: true, value: "token-images/7/oak" }).mockResolvedValueOnce({ ok: false, error: "Не вдалося прочитати картинку" });
    const { onDrop, onPick } = await renderLibrary();
    const files = ["oak.png", "pine.png"].map((name) => {
      const file = new File(["image"], name, { type: "image/png" });
      Object.defineProperty(file, "webkitRelativePath", { value: `Дерева/${name}` });
      return file;
    });
    fireEvent.change(screen.getByLabelText("Завантажити папку з диска"), { target: { files } });
    expect(await screen.findByText("Завантажено 1 із 2.")).toBeTruthy();
    fireEvent.click(screen.getByText("Пропущено файлів: 1"));
    expect(screen.getByText(/pine\.png · Не вдалося прочитати картинку/)).toBeTruthy();
    expect(library.create).toHaveBeenCalledWith("Дерева");
    expect(library.upload.mock.calls.map(([form]) => form.get("folderId"))).toEqual(["12", "12"]);
    expect(screen.getByRole("button", { name: "Поставити зображення 1" })).toBeTruthy();
    expect(onDrop).not.toHaveBeenCalled();
    expect(onPick).not.toHaveBeenCalled();
  });
});
