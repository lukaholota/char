// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { loadReadyPresetPage } from "@/lib/optimization/ready-preset.server";

const mocks = vi.hoisted(() => ({ create: vi.fn(), createFromBuild: vi.fn(), push: vi.fn(), capture: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("@/lib/actions/character", () => ({ createCharacter: mocks.create, createCharacterFromBuild: mocks.createFromBuild }));
vi.mock("@/components/no-ai/NoAiModeProvider", () => ({ useModeRouter: () => ({ push: mocks.push }) }));
vi.mock("@/components/no-ai/ModeLink", () => ({ ModeLink: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock("@/components/optimization/BuildSource", () => ({ BuildSource: () => null }));
vi.mock("@/lib/components/auth/GoogleAuthDialog", () => ({ default: () => <button type="button">Увійти через Google</button> }));
vi.mock("@/lib/monitoring/rpgbot-analytics", () => ({ captureRpgbotEvent: mocks.capture }));
vi.mock("@/lib/monitoring/use-rpgbot-surface-view", () => ({ useRpgbotSurfaceView: vi.fn() }));

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const levelsKey = (slug: string) => `dnd-preset-2014-build-${slug}-levels`;
const frames: (() => void)[] = [];

beforeEach(() => {
  vi.resetModules();
  Object.values(mocks).forEach((mock) => mock.mockReset());
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
  const data = withoutLevels ? { ...loaded, levels: null } : loaded;
  const view = render(<ReadyPresetCreator data={data} catalogQuery="" />);
  await screen.findByRole("heading", { level: 1 });
  return { ...view, data };
}

function pickLevel(level: number) {
  fireEvent.click(screen.getByRole("button", { name: "Змінити рівень" }));
  fireEvent.click(screen.getByRole("radio", { name: `${level}-й рівень` }));
}

async function goToNameAndSubmit(name = "Мирон") {
  const quick = screen.queryByRole("button", { name: /Створити за гайдом/ });
  if (quick) fireEvent.click(quick);
  else for (let guard = 0; guard < 30 && !screen.queryByLabelText(/Імʼя персонажа/); guard++) {
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Далі →" })); });
  }
  fireEvent.change(await screen.findByLabelText(/Імʼя персонажа/), { target: { value: name } });
  await act(async () => { fireEvent.click(findCreateButton()); });
}

function findCreateButton() {
  return screen.queryByRole("button", { name: "Створити персонажа" }) ?? screen.getByRole("button", { name: "Створити" });
}

function findEvents(name: string) {
  return mocks.capture.mock.calls.filter(([event]) => event === name).map(([, properties]) => properties);
}

describe("preset without higher levels", () => {
  it("shows no level picker and still creates the level-one character with its own request id", async () => {
    mocks.create.mockResolvedValue({ success: true, persId: 31 });
    await renderPreset("bugbear-fiend-warlock-2014", true);
    expect(screen.queryByRole("radiogroup", { name: "Рівень персонажа" })).toBeNull();
    expect(screen.getByText("1-й рівень")).toBeTruthy();
    await goToNameAndSubmit();
    expect(mocks.createFromBuild).not.toHaveBeenCalled();
    expect(mocks.create).toHaveBeenCalledOnce();
    expect(mocks.create.mock.calls[0][0].readyPresetRequestId).toMatch(uuidPattern);
    expect(findEvents("rpgbot_preset_submitted")[0]).not.toHaveProperty("target_level");
    expect(findEvents("rpgbot_preset_created")[0]).not.toHaveProperty("target_level");
    expect(mocks.push).toHaveBeenCalledWith("/char/31");
  });
});

describe("level picker", () => {
  it("offers every executable level, starts at level one and keeps level-one creation untouched", async () => {
    mocks.create.mockResolvedValue({ success: true, persId: 32 });
    await renderPreset("wizard-evocation-2014");
    fireEvent.click(screen.getByRole("button", { name: "Змінити рівень" }));
    const group = screen.getByRole("radiogroup", { name: "Рівень персонажа" });
    expect(within(group).getAllByRole("radio").map((radio) => (radio as HTMLInputElement).value)).toEqual(["1", "2", "3", "4", "5"]);
    expect((screen.getByRole("radio", { name: "1-й рівень" }) as HTMLInputElement).checked).toBe(true);
    expect(screen.queryByText(/Що буде на/)).toBeNull();
    await goToNameAndSubmit();
    expect(mocks.createFromBuild).not.toHaveBeenCalled();
    expect(mocks.create.mock.calls[0][0].readyPresetRequestId).toMatch(uuidPattern);
    expect(findEvents("rpgbot_preset_submitted")[0]).toMatchObject({ target_level: 1 });
  });

  it("keeps level twenty creation down to the name and does not mount customization forms", async () => {
    mocks.createFromBuild.mockResolvedValue({ success: true, persId: 44 });
    await renderPreset("fighter-cavalier-2014");
    pickLevel(20);
    expect(screen.queryByText("Расові бонуси")).toBeNull();
    expect(screen.queryByRole("combobox")).toBeNull();
    await goToNameAndSubmit();
    expect(mocks.createFromBuild.mock.calls[0][0]).toMatchObject({ targetLevel: 20, start: { name: "Мирон" } });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("restores the guide after customization while keeping the chosen level and name", async () => {
    mocks.createFromBuild.mockResolvedValue({ success: true, persId: 45 });
    const { data } = await renderPreset("fighter-cavalier-2014");
    pickLevel(20);
    fireEvent.click(screen.getByRole("button", { name: /Створити за гайдом/ }));
    fireEvent.change(screen.getByLabelText(/Імʼя персонажа/), { target: { value: "Орест" } });
    fireEvent.click(screen.getByRole("button", { name: "Повернутися й змінити вибори" }));
    await customizeStep("Вибори 16-го рівня");
    const featGroup = screen.getByRole("group", { name: "Риса", exact: true });
    const tough = data.levels!.featPool.find((feat) => feat.key === "TOUGH")!;
    fireEvent.change(within(featGroup).getByRole("textbox"), { target: { value: tough.name } });
    fireEvent.click(within(featGroup).getByRole("button", { name: tough.name, exact: true }));
    fireEvent.click(screen.getByRole("button", { name: "До вибору способу створення" }));
    fireEvent.click(screen.getByRole("button", { name: /Створити за гайдом/ }));
    expect((screen.getByLabelText(/Імʼя персонажа/) as HTMLInputElement).value).toBe("Орест");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Створити персонажа" })); });
    expect(mocks.createFromBuild.mock.calls[0][0]).toMatchObject({ targetLevel: 20, start: { name: "Орест" }, openAdvancements: [] });
  });

  it("restores an unfinished customization step after reload", async () => {
    const view = await renderPreset("rogue-thief-2014");
    await customizeStep("Навички");
    const chosen = screen.getAllByRole("button", { pressed: true });
    fireEvent.click(chosen[0]);
    expect(screen.getByRole("button", { name: "Далі →" }).getAttribute("aria-disabled")).toBe("true");
    view.unmount();
    vi.resetModules();
    await renderPreset("rogue-thief-2014");
    expect(screen.getByRole("heading", { name: "Навички", exact: true })).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("preset page landmark", () => {
  it("renders no main of its own because the app shell already provides one", async () => {
    const { container } = await renderPreset("rogue-thief-2014");
    expect(container.querySelector("main")).toBeNull();
  });
});

async function customizeStep(title: string) {
  const entry = screen.queryByRole("button", { name: "Налаштувати персонажа" });
  if (entry) fireEvent.click(entry);
  fireEvent.click(await screen.findByRole("button", { name: new RegExp(`^Крок \\d+\\s*${title}$`) }));
}

async function chooseOpenSpell(key: string) {
  await customizeStep("Вибори 7-го рівня");
  const group = screen.getByRole("region", { name: "Відомі заклинання · 7-й рівень" });
  const selected = within(group).getAllByRole("button", { pressed: true });
  selected.forEach((button) => fireEvent.click(button));
  const { getAllSpells } = await import("@/lib/spellsData");
  const { buildSpellSlug } = await import("@/lib/spell-link");
  const spell = getAllSpells("RULES_2014").find((entry) => buildSpellSlug(entry.engName) === key)!;
  fireEvent.click(within(group).getByRole("button", { name: spell.name, exact: true }));
}

describe("spell labels and school limit", () => {
  it("offers the Eldritch Knight only the spells of its schools at level 19 and names the limit", async () => {
    await renderPreset("fighter-eldritch-knight-2014");
    pickLevel(19);
    await customizeStep("Вибори 19-го рівня");
    const group = screen.getByRole("region", { name: "Відомі заклинання · 19-й рівень" });
    const labels = within(group).getAllByRole("button").map((button) => button.getAttribute("aria-label") ?? "");
    expect(labels.some((label) => label.includes("[Counterspell]"))).toBe(true);
    expect(labels.some((label) => label.includes("[Fear]"))).toBe(false);
    expect(screen.getByText(/Лише школи «Захист» і «Втілення»/)).toBeTruthy();
  });
});

describe("creating a higher level character", () => {
  async function chooseSorcadinSevenAndSubmit() {
    pickLevel(7);
    await chooseOpenSpell("absorb-elements");
    await goToNameAndSubmit();
  }

  it("sends one assembly request with the saved key and no level-one key", async () => {
    mocks.createFromBuild.mockResolvedValue({ success: true, persId: 77 });
    const { data } = await renderPreset("sorcadin-clockwork-2014");
    await chooseSorcadinSevenAndSubmit();
    expect(mocks.create).not.toHaveBeenCalled();
    const request = mocks.createFromBuild.mock.calls[0][0];
    expect(request).toMatchObject({ buildId: data.preset.buildId, revisionId: data.preset.revisionId, targetLevel: 7, openSelections: [{ characterLevel: 7, knownSpellKeys: ["absorb-elements"] }] });
    expect(request.requestId).toMatch(uuidPattern);
    expect(request.start.readyPresetRequestId).toBeUndefined();
    expect(request.start.name).toBe("Мирон");
    expect(findEvents("rpgbot_preset_submitted")[0]).toMatchObject({ target_level: 7 });
    expect(findEvents("rpgbot_preset_created")[0]).toMatchObject({ target_level: 7, pers_id: 77 });
    expect(mocks.push).toHaveBeenCalledWith("/char/77");
    expect(localStorage.getItem(levelsKey("sorcadin-clockwork-2014"))).not.toBeNull();
    cleanup();
    frames.forEach((run) => run());
    expect(localStorage.getItem(levelsKey("sorcadin-clockwork-2014"))).toBeNull();
  });

  it("keeps the choices and sends the same key after a server error, a retry and a reload", async () => {
    mocks.createFromBuild.mockResolvedValue({ error: "Рівень 7: Спробуйте ще раз" });
    const first = await renderPreset("sorcadin-clockwork-2014");
    await chooseSorcadinSevenAndSubmit();
    expect(screen.getByRole("alert").textContent).toBe("Рівень 7: Спробуйте ще раз");
    await act(async () => { fireEvent.click(findCreateButton()); });
    first.unmount();
    vi.resetModules();
    await renderPreset("sorcadin-clockwork-2014");
    expect((screen.getByLabelText(/Імʼя персонажа/) as HTMLInputElement).value).toBe("Мирон");
    await act(async () => { fireEvent.click(findCreateButton()); });
    const ids = mocks.createFromBuild.mock.calls.map(([request]) => request.requestId);
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(1);
  });

  it("turns a rejected validation into a readable message and keeps the draft", async () => {
    mocks.createFromBuild.mockResolvedValue({ error: "Validation failed", details: {} });
    await renderPreset("sorcadin-clockwork-2014");
    await chooseSorcadinSevenAndSubmit();
    expect(screen.getByRole("alert").textContent).toContain("Сервер не прийняв вибори");
    expect(JSON.parse(localStorage.getItem(levelsKey("sorcadin-clockwork-2014"))!)).toMatchObject({ targetLevel: 7 });
  });

  it("asks an anonymous visitor to sign in, offers the sign-in dialog and keeps the draft", async () => {
    mocks.createFromBuild.mockResolvedValue({ error: "Unauthorized" });
    await renderPreset("sorcadin-clockwork-2014");
    await chooseSorcadinSevenAndSubmit();
    expect(screen.getByRole("alert").textContent).toBe("Увійдіть, щоб створити персонажа. Ваші вибори збережені.");
    expect(screen.getByRole("button", { name: "Увійти через Google" })).toBeTruthy();
    expect((screen.getByLabelText(/Імʼя персонажа/) as HTMLInputElement).value).toBe("Мирон");
    expect(JSON.parse(localStorage.getItem(levelsKey("sorcadin-clockwork-2014"))!)).toMatchObject({ targetLevel: 7 });
  });

  it.each(["Race not found", "Class not found", "Background not found"])("replaces the English server text %s by a Ukrainian sentence without a sign-in button", async (error) => {
    mocks.createFromBuild.mockResolvedValue({ error });
    await renderPreset("sorcadin-clockwork-2014");
    await chooseSorcadinSevenAndSubmit();
    expect(screen.getByRole("alert").textContent).toBe("Сервер не прийняв вибори персонажа. Перевірте їх і спробуйте ще раз.");
    expect(screen.queryByRole("button", { name: "Увійти через Google" })).toBeNull();
  });

  it("gives every target level its own key so an old operation cannot return a character of another level", async () => {
    await renderPreset("sorcadin-clockwork-2014");
    const readIds = () => JSON.parse(localStorage.getItem(levelsKey("sorcadin-clockwork-2014"))!).requestIds as Record<string, string>;
    pickLevel(5);
    pickLevel(7);
    const afterSeven = readIds();
    expect(afterSeven[5]).toMatch(uuidPattern);
    expect(afterSeven[7]).toMatch(uuidPattern);
    expect(afterSeven[5]).not.toBe(afterSeven[7]);
    pickLevel(1);
    pickLevel(5);
    expect(readIds()).toEqual(afterSeven);
  });

  it("falls back to level one when the saved level is no longer offered", async () => {
    localStorage.setItem(levelsKey("sorcadin-clockwork-2014"), JSON.stringify({ targetLevel: 15, requestIds: {}, choices: {}, preparedSpellKeys: null }));
    await renderPreset("sorcadin-clockwork-2014");
    expect(screen.getByText("Рівень: 1")).toBeTruthy();
  });

  it("pre-fills the Wizard preparation up to the limit and sends what the player left after unchecking one", async () => {
    mocks.createFromBuild.mockResolvedValue({ success: true, persId: 78 });
    await renderPreset("wizard-evocation-2014");
    pickLevel(5);
    await customizeStep("Підготовлені заклинання");
    const preparedGroup = screen.getByRole("region", { name: "Підготовлені заклинання" });
    const checked = within(preparedGroup).getAllByRole("button", { pressed: true });
    expect(checked).toHaveLength(9);
    fireEvent.click(checked[checked.length - 1]);
    await goToNameAndSubmit();
    const request = mocks.createFromBuild.mock.calls[0][0];
    expect(request.targetLevel).toBe(5);
    expect(request.openSelections).toEqual([]);
    expect(request.preparedSpellKeys).toHaveLength(8);
  });
});

describe("open advancement picker", () => {
  it("shows the platform's default feat and sends the feat the player picked instead", async () => {
    mocks.createFromBuild.mockResolvedValue({ success: true, persId: 77 });
    await renderPreset("fighter-cavalier-2014");
    pickLevel(20);
    await customizeStep("Вибори 16-го рівня");
    const featGroup = screen.getByRole("group", { name: "Риса", exact: true });
    const { data } = await loadReadyPresetPage("fighter-cavalier-2014").then((data) => ({ data }));
    const tough = data.levels!.featPool.find((feat) => feat.key === "TOUGH")!;
    fireEvent.change(within(featGroup).getByRole("textbox"), { target: { value: tough.name } });
    fireEvent.click(within(featGroup).getByRole("button", { name: tough.name, exact: true }));
    expect(screen.getByText("ваш вибір")).toBeTruthy();
    await goToNameAndSubmit();
    expect(mocks.createFromBuild.mock.calls[0][0].openAdvancements).toEqual([{ characterLevel: 16, featKey: "TOUGH" }]);
  });

  it("switches a level to an ability increase and keeps a score from going above 20", async () => {
    await renderPreset("fighter-cavalier-2014");
    pickLevel(20);
    await customizeStep("Вибори 16-го рівня");
    fireEvent.click(screen.getByRole("button", { name: "Підвищення характеристик", exact: true }));
    const first = screen.getByRole("group", { name: "Перша характеристика (+1)", exact: true });
    const disabled = within(first).getAllByRole("button").filter((button) => (button as HTMLButtonElement).disabled);
    expect(disabled.map((button) => button.textContent)).toEqual(["Сила · 20", "Статура · 20"]);
  });
});

describe("open class option picker", () => {
  it("offers the metamagic the Sorcerer does not have yet and sends the one the player picked", async () => {
    mocks.createFromBuild.mockResolvedValue({ success: true, persId: 78 });
    await renderPreset("sorcerer-clockwork-soul-2014");
    pickLevel(20);
    await customizeStep("Вибори 17-го рівня");
    const group = screen.getByRole("group", { name: /Метамагія · 17-й рівень · 1/ });
    const data = await loadReadyPresetPage("sorcerer-clockwork-soul-2014");
    const pool = data.levels!.classOptionPools.SORCERER_2014;
    const seeking = pool.find((option) => option.nameEng === "Seeking Spell")!;
    const twinned = pool.find((option) => option.nameEng === "Twinned Spell")!;
    expect(within(group).queryByRole("button", { name: twinned.name, exact: true })).toBeNull();
    fireEvent.click(within(group).getByRole("button", { name: seeking.name, exact: true }));
    expect(screen.getByText("ваш вибір")).toBeTruthy();
    await goToNameAndSubmit();
    expect(screen.queryByRole("alert")?.textContent).toBeUndefined();
    expect(mocks.createFromBuild.mock.calls[0][0].openClassOptions).toEqual([{ characterLevel: 17, classOptions: [{ optionNameEng: "Seeking Spell", groupName: "Метамагія" }] }]);
  });
});

const UNFINISHED_PRESET_KEY = "dnd-preset-2014-unfinished";

describe("customized abilities of a list-prepared caster", () => {
  async function lowerWisdomTwice() {
    await renderPreset("druid-dreams-githzerai-2014", true);
    await customizeStep("Характеристики");
    const lowerWisdom = () => fireEvent.click(screen.getAllByRole("button", { name: "Зменшити" })[4]);
    await act(async () => { lowerWisdom(); lowerWisdom(); });
  }

  it("drops prepared spells above the new Wisdom limit so the character can still be created", async () => {
    mocks.create.mockResolvedValue({ success: true, persId: 77 });
    await lowerWisdomTwice();
    expect(JSON.parse(localStorage.getItem(UNFINISHED_PRESET_KEY)!)).toMatchObject({ buildId: "build-druid-dreams-githzerai-2014", href: "/" });
    await goToNameAndSubmit();
    frames.forEach((run) => run());
    expect(localStorage.getItem(UNFINISHED_PRESET_KEY)).toBeNull();
    expect(mocks.create).toHaveBeenCalledOnce();
    expect(mocks.create.mock.calls[0][0].asi).toContainEqual({ ability: "WIS", value: 13 });
    expect(mocks.create.mock.calls[0][0].initialPreparedSpellIds).toHaveLength(3);
  });

  it("resets the customized choices back to the preset", async () => {
    mocks.create.mockResolvedValue({ success: true, persId: 78 });
    await lowerWisdomTwice();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Скинути зміни до пресета" })); });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Точно скинути?" })); });
    expect(screen.getByRole("heading", { name: "Характеристики", exact: true })).toBeTruthy();
    await goToNameAndSubmit();
    expect(mocks.create.mock.calls[0][0].asi).toContainEqual({ ability: "WIS", value: 15 });
  });
});
