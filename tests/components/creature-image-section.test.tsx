// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MapCreatureView } from "@/rules/game-map-creatures";

const mocks = vi.hoisted(() => ({
  listImages: vi.fn(),
  uploadImage: vi.fn(),
  setImage: vi.fn(),
  deleteImage: vi.fn(),
  refresh: vi.fn(),
  confirm: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/lib/actions/game-token-images", () => ({
  listTokenImagesAction: mocks.listImages,
  uploadTokenImageAction: mocks.uploadImage,
  setMapCreatureImageAction: mocks.setImage,
  deleteTokenImageAction: mocks.deleteImage,
}));
vi.mock("@/components/no-ai/NoAiModeProvider", () => ({ useModeRouter: () => ({ refresh: mocks.refresh }), useNoAiMode: () => ({ enabled: false }) }));
vi.mock("@/components/ui/confirm-dialog", () => ({ askToConfirm: mocks.confirm }));
vi.mock("sonner", () => ({ toast: { error: mocks.toastError } }));
vi.mock("@/lib/components/portrait/ImageCropDialog", () => ({
  ImageCropDialog: ({ file, onCropped }: { file: File | null; onCropped: (blob: Blob) => void }) => (file ? <button onClick={() => onCropped(new Blob(["обрізано"]))}>Обрізати</button> : null),
}));

const { CreatureImageSection } = await import("@/components/games/CreatureImageSection");

let imageIndex = 0;

function buildCreature(overrides: Partial<MapCreatureView> = {}): MapCreatureView {
  imageIndex += 1;
  return { id: 7, creatureKey: "dragon", ruleset: "RULES_2014", label: "Дракон", statblockName: null, customName: null, badge: null, isAlly: false, imageUrl: `/images/creatures/2014/section-${imageIndex}.webp`, isRoundImage: false, customImageKey: null, tokenSize: "medium", isCutout: false, token: null, hitPoints: null, isDown: false, conditions: { conditions: [], exhaustionLevel: 0 }, ...overrides };
}

const renderSection = (creature = buildCreature()) => render(<CreatureImageSection sessionId={3} creature={creature} cutout={{ value: false, onChange: vi.fn() }} />);
const openPicker = () => fireEvent.click(screen.getByRole("button", { name: "Замінити зображення" }));

function stubCanvasAlpha(alpha: number) {
  const data = new Uint8ClampedArray(32 * 32 * 4).map((_, index) => (index % 4 === 3 ? alpha : 0));
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: vi.fn(), getImageData: () => ({ data }) } as unknown as CanvasRenderingContext2D);
}

async function loadPreview(container: HTMLElement) {
  await act(async () => {
    fireEvent.load(container.querySelector("img") as HTMLImageElement);
    await new Promise((resolve) => setTimeout(resolve));
  });
}

describe("заміна зображення істоти", () => {
  beforeEach(() => {
    mocks.listImages.mockResolvedValue({ ok: true, value: [] });
    mocks.setImage.mockResolvedValue({ ok: true, value: null });
    mocks.deleteImage.mockResolvedValue({ ok: true, value: null });
    mocks.confirm.mockResolvedValue(true);
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("кнопка є в будь-якої істоти, навіть без картинки, а бібліотека вантажиться лише на вимогу", () => {
    renderSection(buildCreature({ imageUrl: null }));
    expect(screen.getByRole("button", { name: "Замінити зображення" })).toBeTruthy();
    expect(mocks.listImages).not.toHaveBeenCalled();
  });

  it("порожня бібліотека підказує, що робити, а нове зображення ставиться істоті одразу", async () => {
    mocks.uploadImage.mockResolvedValue({ ok: true, value: "token-images/1/new" });
    const { container } = renderSection();
    openPicker();
    await screen.findByText(/Завантажте зображення один раз/);

    fireEvent.change(container.querySelector("input[type=file]") as HTMLInputElement, { target: { files: [new File(["x"], "dragon.png", { type: "image/png" })] } });
    fireEvent.click(await screen.findByRole("button", { name: "Обрізати" }));

    await waitFor(() => expect(mocks.setImage).toHaveBeenCalledWith(3, 7, "token-images/1/new"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Замінити зображення" })).toBeTruthy());
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("зображення з бібліотеки ставиться без нового завантаження", async () => {
    mocks.listImages.mockResolvedValue({ ok: true, value: ["token-images/1/old"] });
    renderSection();
    openPicker();
    fireEvent.click(await screen.findByRole("button", { name: "Поставити зображення 1" }));

    await waitFor(() => expect(mocks.setImage).toHaveBeenCalledWith(3, 7, "token-images/1/old"));
    expect(mocks.uploadImage).not.toHaveBeenCalled();
  });

  it("помилка збереження лишає бібліотеку відкритою й показує причину", async () => {
    mocks.listImages.mockResolvedValue({ ok: true, value: ["token-images/1/old"] });
    mocks.setImage.mockResolvedValue({ ok: false, error: "Цього зображення вже немає в бібліотеці" });
    renderSection();
    openPicker();
    fireEvent.click(await screen.findByRole("button", { name: "Поставити зображення 1" }));

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith("Цього зображення вже немає в бібліотеці"));
    expect(screen.getByRole("button", { name: "Згорнути" })).toBeTruthy();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("обірваний звʼязок при відкритті дає повторити спробу", async () => {
    mocks.listImages.mockRejectedValueOnce(new Error("offline"));
    renderSection();
    openPicker();
    fireEvent.click(await screen.findByRole("button", { name: "Спробувати ще раз" }));
    await screen.findByText(/Завантажте зображення один раз/);
  });

  it("після видалення останнього зображення завантаження знову доступне", async () => {
    mocks.listImages.mockResolvedValue({ ok: true, value: ["token-images/1/old"] });
    renderSection();
    openPicker();
    fireEvent.click(await screen.findByRole("button", { name: "Видалити зайві" }));
    fireEvent.click(screen.getByRole("button", { name: "Видалити зображення 1" }));

    await waitFor(() => expect(mocks.deleteImage).toHaveBeenCalledWith("token-images/1/old"));
    await screen.findByText(/Завантажте зображення один раз/);
    expect((screen.getByRole("button", { name: "Нове" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("без підтвердження зображення не видаляється", async () => {
    mocks.confirm.mockResolvedValue(false);
    mocks.listImages.mockResolvedValue({ ok: true, value: ["token-images/1/old"] });
    renderSection();
    openPicker();
    fireEvent.click(await screen.findByRole("button", { name: "Видалити зайві" }));
    fireEvent.click(screen.getByRole("button", { name: "Видалити зображення 1" }));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalled());
    expect(mocks.deleteImage).not.toHaveBeenCalled();
  });

  it("«Повернути стандартне» є лише після заміни й знімає її", async () => {
    const { unmount } = renderSection();
    openPicker();
    await screen.findByText(/Завантажте зображення один раз/);
    expect(screen.queryByRole("button", { name: "Повернути стандартне" })).toBeNull();
    unmount();

    renderSection(buildCreature({ customImageKey: "token-images/1/old" }));
    openPicker();
    fireEvent.click(await screen.findByRole("button", { name: "Повернути стандартне" }));
    await waitFor(() => expect(mocks.setImage).toHaveBeenCalledWith(3, 7, null));
  });

  it("вибір «Токен / Прозорий» зʼявляється лише для прозорого зображення", async () => {
    stubCanvasAlpha(0);
    const transparent = renderSection();
    await loadPreview(transparent.container);
    expect(screen.getByRole("button", { name: "Прозорий" })).toBeTruthy();
    transparent.unmount();

    stubCanvasAlpha(255);
    const opaque = renderSection();
    await loadPreview(opaque.container);
    expect(screen.queryByRole("button", { name: "Прозорий" })).toBeNull();
  });
});
