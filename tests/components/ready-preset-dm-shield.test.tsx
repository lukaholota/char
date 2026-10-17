// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { loadReadyPresetPage } from "@/lib/optimization/ready-preset.server";

const mocks = vi.hoisted(() => ({ create: vi.fn(), push: vi.fn() }));
vi.hoisted(() => {
  Object.defineProperty(globalThis, "ResizeObserver", { configurable: true, writable: true, value: class { observe() {} unobserve() {} disconnect() {} } });
});
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ status: "authenticated" }) }));
vi.mock("@/lib/actions/character", () => ({ createCharacter: mocks.create, createCharacterFromBuild: vi.fn() }));
vi.mock("@/components/no-ai/NoAiModeProvider", async (importOriginal) => ({ ...(await importOriginal<object>()), useModeRouter: () => ({ push: mocks.push }) }));
vi.mock("@/components/no-ai/ModeLink", () => ({ ModeLink: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock("@/components/optimization/BuildSource", () => ({ BuildSource: () => null }));
vi.mock("@/lib/components/auth/GoogleAuthDialog", () => ({ default: () => <button type="button">Увійти</button> }));
vi.mock("@/lib/monitoring/rpgbot-analytics", () => ({ captureRpgbotEvent: vi.fn() }));
vi.mock("@/lib/monitoring/use-rpgbot-surface-view", () => ({ useRpgbotSurfaceView: vi.fn() }));

const SHIELD_NOTE = "Понад стартовий набір класу: Щит (+2 до КБ) — з дозволу ДМа.";

beforeEach(() => {
  vi.resetModules();
  mocks.create.mockReset().mockResolvedValue({ success: true, persId: 71 });
  const items = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => void items.set(key, value), removeItem: (key: string) => void items.delete(key) });
  vi.stubGlobal("requestAnimationFrame", () => 0);
  window.scrollTo = vi.fn();
});
afterEach(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); cleanup(); vi.unstubAllGlobals(); });

async function renderPreset(slug: string) {
  const { ReadyPresetCreator } = await import("@/components/optimization/ReadyPresetCreator");
  const loaded = await loadReadyPresetPage(slug);
  render(<ReadyPresetCreator data={{ ...loaded, levels: null }} catalogQuery="" entry="gallery" />);
  await screen.findByRole("heading", { level: 1 });
  await waitFor(() => expect((screen.getByLabelText("Імʼя персонажа") as HTMLInputElement).value.length).toBeGreaterThan(1));
}

async function tap(name: string | RegExp) {
  await act(async () => { fireEvent.click(screen.getByRole("button", { name })); });
}

async function openEquipmentStep() {
  await tap("Налаштувати");
  await act(async () => { fireEvent.click(await screen.findByRole("button", { name: /^Крок \d+\s*Спорядження$/ })); });
}

describe("shield added beyond the class kit with DM permission", () => {
  it("is named on the review and sent with the guide creation", async () => {
    await renderPreset("blood-hunter-ghostslayer-rapier-2014");
    expect(screen.getByText(SHIELD_NOTE)).toBeTruthy();
    await tap("Створити за гайдом");
    expect(mocks.create.mock.calls[0][0]).toMatchObject({ dmApprovedShield: true });
  });

  it("can be turned off in the equipment step and is then left out of the creation", async () => {
    await renderPreset("blood-hunter-ghostslayer-rapier-2014");
    await openEquipmentStep();
    const toggle = screen.getByRole("checkbox", { name: "Щит з дозволу ДМа" });
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    expect(toggle.getAttribute("aria-describedby")).toBe("preset-dm-approved-shield-hint");
    await act(async () => { fireEvent.click(toggle); });
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /^Крок \d+\s*Імʼя$/ })); });
    await act(async () => { fireEvent.submit(screen.getByLabelText("Імʼя персонажа").closest("form")!); });
    expect(mocks.create).toHaveBeenCalledOnce();
    expect(mocks.create.mock.calls[0][0]).toMatchObject({ dmApprovedShield: false });
  });

  it("toggles from a tap on the hint, not only on the box", async () => {
    await renderPreset("blood-hunter-ghostslayer-rapier-2014");
    await openEquipmentStep();
    const toggle = screen.getByRole("checkbox", { name: "Щит з дозволу ДМа" });
    await act(async () => { fireEvent.click(screen.getByText(/^Щита немає в стартовому наборі класу/)); });
    expect(toggle.getAttribute("aria-checked")).toBe("false");
  });

  it("keeps the review note for the guide creation after it was turned off in customization", async () => {
    await renderPreset("blood-hunter-ghostslayer-rapier-2014");
    await openEquipmentStep();
    await act(async () => { fireEvent.click(screen.getByRole("checkbox", { name: "Щит з дозволу ДМа" })); });
    await tap("До вибору способу створення");
    expect(screen.getByText(SHIELD_NOTE)).toBeTruthy();
    await tap("Створити за гайдом");
    expect(mocks.create.mock.calls[0][0]).toMatchObject({ dmApprovedShield: true });
  });

  it("stays away from presets without it", async () => {
    await renderPreset("fighter-cavalier-2014");
    expect(screen.queryByText(SHIELD_NOTE)).toBeNull();
    await openEquipmentStep();
    expect(screen.queryByRole("checkbox", { name: "Щит з дозволу ДМа" })).toBeNull();
  });
});
