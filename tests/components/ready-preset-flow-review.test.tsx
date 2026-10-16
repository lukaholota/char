// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { loadReadyPresetPage } from "@/lib/optimization/ready-preset.server";

const mocks = vi.hoisted(() => ({ create: vi.fn(), createFromBuild: vi.fn(), push: vi.fn(), capture: vi.fn(), session: { status: "authenticated" } }));
vi.hoisted(() => {
  Object.defineProperty(globalThis, "ResizeObserver", { configurable: true, writable: true, value: class { observe() {} unobserve() {} disconnect() {} } });
});
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ status: mocks.session.status }) }));
vi.mock("@/lib/actions/character", () => ({ createCharacter: mocks.create, createCharacterFromBuild: mocks.createFromBuild }));
vi.mock("@/components/no-ai/NoAiModeProvider", async (importOriginal) => ({ ...(await importOriginal<object>()), useModeRouter: () => ({ push: mocks.push }) }));
vi.mock("@/components/no-ai/ModeLink", () => ({ ModeLink: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock("@/components/optimization/BuildSource", () => ({ BuildSource: () => null }));
vi.mock("@/lib/components/auth/GoogleAuthDialog", () => ({ default: ({ open }: { open?: boolean }) => (open ? <div role="dialog" aria-label="Увійти через Google" /> : <button type="button">Увійти</button>) }));
vi.mock("@/lib/monitoring/rpgbot-analytics", () => ({ captureRpgbotEvent: mocks.capture }));
vi.mock("@/lib/monitoring/use-rpgbot-surface-view", () => ({ useRpgbotSurfaceView: vi.fn() }));

const frames: (() => void)[] = [];

beforeEach(() => {
  vi.resetModules();
  [mocks.create, mocks.createFromBuild, mocks.push, mocks.capture].forEach((mock) => mock.mockReset());
  mocks.session.status = "authenticated";
  const items = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => void items.set(key, value), removeItem: (key: string) => void items.delete(key) });
  frames.length = 0;
  vi.stubGlobal("requestAnimationFrame", (run: () => void) => frames.push(run));
  window.scrollTo = vi.fn();
});
afterEach(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); cleanup(); vi.unstubAllGlobals(); });

async function renderPreset(slug: string, withoutLevels = false) {
  const { ReadyPresetCreator } = await import("@/components/optimization/ReadyPresetCreator");
  const loaded = await loadReadyPresetPage(slug);
  const view = render(<ReadyPresetCreator data={withoutLevels ? { ...loaded, levels: null } : loaded} catalogQuery="" entry="gallery" />);
  await screen.findByRole("heading", { level: 1 });
  return view;
}

async function reloadPreset(view: Awaited<ReturnType<typeof renderPreset>>, slug: string, withoutLevels = false) {
  view.unmount();
  vi.resetModules();
  return renderPreset(slug, withoutLevels);
}

function findNameInput() {
  return screen.getByLabelText("Імʼя персонажа") as HTMLInputElement;
}

async function waitForGeneratedName(): Promise<string> {
  await waitFor(() => expect(findNameInput().value.length).toBeGreaterThan(1));
  return findNameInput().value;
}

function findEvents(name: string) {
  return mocks.capture.mock.calls.filter(([event]) => event === name).map(([, properties]) => properties);
}

async function tap(name: string | RegExp) {
  await act(async () => { fireEvent.click(screen.getByRole("button", { name })); });
}

describe("guide path on the review", () => {
  it("creates the character with the generated name in one tap", async () => {
    mocks.create.mockResolvedValue({ success: true, persId: 51 });
    await renderPreset("bugbear-fiend-warlock-2014", true);
    const name = await waitForGeneratedName();
    await tap("Створити за гайдом");
    expect(mocks.create).toHaveBeenCalledOnce();
    expect(mocks.create.mock.calls[0][0]).toMatchObject({ name: name.trim(), readyPresetBuildId: "build-bugbear-fiend-warlock-2014" });
    expect(findEvents("rpgbot_preset_path_chosen")).toEqual([{ preset_id: "build-bugbear-fiend-warlock-2014", path: "guide" }]);
    expect(findEvents("rpgbot_preset_created")[0]).toMatchObject({ pers_id: 51, customized_sections: [] });
    expect(mocks.push).toHaveBeenCalledWith("/char/51");
  });

  it("creates from the keyboard when the player confirms the name field", async () => {
    mocks.create.mockResolvedValue({ success: true, persId: 52 });
    await renderPreset("bugbear-fiend-warlock-2014", true);
    fireEvent.change(findNameInput(), { target: { value: "Мирон" } });
    await act(async () => { fireEvent.submit(findNameInput().form!); });
    expect(mocks.create.mock.calls[0][0]).toMatchObject({ name: "Мирон" });
  });

  it("names the missing name instead of doing nothing", async () => {
    await renderPreset("bugbear-fiend-warlock-2014", true);
    await waitForGeneratedName();
    fireEvent.change(findNameInput(), { target: { value: "" } });
    await act(async () => {});
    expect(findNameInput().value).toBe("");
    await tap("Створити за гайдом");
    expect(screen.getByRole("alert").textContent).toBe("Вкажіть імʼя персонажа.");
    expect(mocks.create).not.toHaveBeenCalled();
    expect(findEvents("rpgbot_preset_create_failed")).toEqual([{ preset_id: "build-bugbear-fiend-warlock-2014", reason: "validation", blocked_by: "Вкажіть імʼя персонажа." }]);
  });

  it("shows every level at once and what the chosen level gives without another tap", async () => {
    await renderPreset("fighter-cavalier-2014");
    expect(within(screen.getByRole("radiogroup", { name: "Рівень персонажа" })).getAllByRole("radio").length).toBeGreaterThan(5);
    expect(screen.getByText(/майбутній підклас|уже обрано/)).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "5-й рівень" }));
    expect(screen.getByRole("heading", { name: "Що буде на 5-му рівні" })).toBeTruthy();
    expect(screen.getByText(/^3-й рівень ·/)).toBeTruthy();
    expect(findEvents("rpgbot_preset_level_selected")).toEqual([{ preset_id: "build-fighter-cavalier-2014", level: 5, from_level: 1, placement: "preset_page" }]);
  });

  it("keeps both ways to create in one action bar, the guide as the submit of the name form", async () => {
    await renderPreset("fighter-cavalier-2014");
    const guide = screen.getByRole("button", { name: "Створити за гайдом" }) as HTMLButtonElement;
    expect(guide.type).toBe("submit");
    expect(guide.form).toBe(findNameInput().form);
    expect(within(guide.parentElement!).getAllByRole("button").map((button) => button.textContent)).toEqual(["Налаштувати", "Створити за гайдом"]);
  });
});

describe("signed-out player", () => {
  it("is told about sign-in before the final tap, gets the sign-in dialog instead of a request and keeps the draft through sign-in", async () => {
    mocks.session.status = "unauthenticated";
    mocks.createFromBuild.mockResolvedValue({ success: true, persId: 61 });
    const view = await renderPreset("fighter-cavalier-2014");
    fireEvent.click(screen.getByRole("radio", { name: "5-й рівень" }));
    fireEvent.change(findNameInput(), { target: { value: "Орест" } });
    expect(screen.getByText("Щоб зберегти персонажа, увійдіть через Google. Вибори не загубляться.")).toBeTruthy();
    await tap("Створити за гайдом");
    expect(screen.getByRole("dialog", { name: "Увійти через Google" })).toBeTruthy();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.createFromBuild).not.toHaveBeenCalled();
    expect(findEvents("rpgbot_preset_create_failed")).toEqual([{ preset_id: "build-fighter-cavalier-2014", reason: "sign_in_required" }]);
    expect(findEvents("rpgbot_preset_submitted")).toEqual([]);
    mocks.session.status = "authenticated";
    await reloadPreset(view, "fighter-cavalier-2014");
    expect(findNameInput().value).toBe("Орест");
    expect((screen.getByRole("radio", { name: "5-й рівень" }) as HTMLInputElement).checked).toBe(true);
    expect(screen.queryByText(/увійдіть через Google/)).toBeNull();
    await tap("Створити за гайдом");
    expect(mocks.createFromBuild.mock.calls[0][0]).toMatchObject({ targetLevel: 5, start: { name: "Орест" } });
  });

  it("gets the same notice and dialog on the last customization step", async () => {
    mocks.session.status = "unauthenticated";
    await renderPreset("bugbear-fiend-warlock-2014", true);
    await waitForGeneratedName();
    fireEvent.click(screen.getByRole("button", { name: "Налаштувати" }));
    for (let guard = 0; guard < 30 && !screen.queryByLabelText("Імʼя персонажа"); guard++) await tap("Далі →");
    expect(screen.getByText("Щоб зберегти персонажа, увійдіть через Google. Вибори не загубляться.")).toBeTruthy();
    await tap("Створити");
    expect(screen.getByRole("dialog", { name: "Увійти через Google" })).toBeTruthy();
    expect(mocks.create).not.toHaveBeenCalled();
  });
});

describe("reload continues the draft", () => {
  it("reopens the review with the chosen level and name", async () => {
    const view = await renderPreset("fighter-cavalier-2014");
    fireEvent.click(screen.getByRole("radio", { name: "7-й рівень" }));
    fireEvent.change(findNameInput(), { target: { value: "Мирон" } });
    await reloadPreset(view, "fighter-cavalier-2014");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Як створимо персонажа?");
    expect((screen.getByRole("radio", { name: "7-й рівень" }) as HTMLInputElement).checked).toBe(true);
    expect(findNameInput().value).toBe("Мирон");
  });

  it("reopens a level step with its choice and the target level intact", async () => {
    const view = await renderPreset("fighter-cavalier-2014");
    fireEvent.click(screen.getByRole("radio", { name: "20-й рівень" }));
    fireEvent.click(screen.getByRole("button", { name: "Налаштувати" }));
    fireEvent.click(await screen.findByRole("button", { name: /^Крок \d+\s*Вибори 16-го рівня$/ }));
    fireEvent.click(screen.getByRole("button", { name: "Підвищення характеристик", exact: true }));
    await reloadPreset(view, "fighter-cavalier-2014");
    expect(screen.getByRole("heading", { name: "Вибори 16-го рівня", exact: true })).toBeTruthy();
    expect(screen.getByRole("button", { name: "✓ Підвищення характеристик", exact: true })).toBeTruthy();
    expect(JSON.parse(localStorage.getItem("dnd-preset-2014-build-fighter-cavalier-2014-levels")!)).toMatchObject({ targetLevel: 20 });
  });

  it("reopens the abilities step mid-trade and names the overspent points instead of discarding the draft", async () => {
    const view = await renderPreset("druid-dreams-githzerai-2014", true);
    fireEvent.click(screen.getByRole("button", { name: "Налаштувати" }));
    fireEvent.click(await screen.findByRole("button", { name: /^Крок \d+\s*Характеристики$/ }));
    await act(async () => { fireEvent.click(screen.getAllByRole("button", { name: "Збільшити" })[0]); });
    await reloadPreset(view, "druid-dreams-githzerai-2014", true);
    expect(screen.queryByText(/Не вдалося прочитати збережені вибори/)).toBeNull();
    expect(screen.getByRole("heading", { name: "Характеристики", exact: true })).toBeTruthy();
    expect(screen.getByText("Характеристики: витрачено забагато очок.")).toBeTruthy();
  });
});
