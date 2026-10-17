// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { useState } from "react";
import { parseLevelUpInput } from "@/lib/zod/schemas/levelUpSchema";
import type { GuidedLevelUp } from "@/lib/optimization/guided-level-up";
import type { LevelUpDraftOwner } from "@/lib/components/levelUp/useLevelUpDraft";

vi.mock("@/components/no-ai/ModeLink", () => ({
  ModeLink: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

type Modules = {
  store: typeof import("@/lib/stores/persFormStore");
  draft: typeof import("@/lib/components/levelUp/useLevelUpDraft");
  signature: typeof import("@/lib/stores/levelUpDraft");
  guided: typeof import("@/lib/components/levelUp/GuidedLevelUp");
};

const STEP_IDS = ["path", "summary", "skills", "hp", "confirm"];
const bard: LevelUpDraftOwner = { persId: 1, ruleset: "RULES_2014", level: 4, classId: 2, subclassId: 7, multiclasses: [] };
const rogue: LevelUpDraftOwner = { persId: 2, ruleset: "RULES_2014", level: 4, classId: 13, subclassId: null, multiclasses: [] };
const guide: GuidedLevelUp = {
  status: "ready", build: { title: "Бард", href: "/x" }, nextLevel: 5, classLabel: "Бард", classLevel: 5,
  input: parseLevelUpInput({ levelUpPath: "EXISTING", classId: 2, featId: 41 }),
  picks: ["Риса: Щасливчик."], skipped: [], open: [],
};

let modules: Modules;
let storage: Map<string, string>;

async function openPage(): Promise<void> {
  cleanup();
  vi.resetModules();
  modules = {
    store: await import("@/lib/stores/persFormStore"),
    draft: await import("@/lib/components/levelUp/useLevelUpDraft"),
    signature: await import("@/lib/stores/levelUpDraft"),
    guided: await import("@/lib/components/levelUp/GuidedLevelUp"),
  };
}

function LevelUpPage({ pers, guide: offer = null }: { pers: LevelUpDraftOwner; guide?: GuidedLevelUp | null }) {
  const draft = modules.draft.useLevelUpDraft(pers, modules.signature.findGuideSignature(offer));
  if (!draft.isReady) return <p>Завантаження</p>;
  return <LevelUpSteps key={draft.sessionKey} guide={offer} isRestored={draft.isRestored} onStartOver={draft.startOver} />;
}

function LevelUpSteps({ guide: offer, isRestored, onStartOver }: { guide: GuidedLevelUp | null; isRestored: boolean; onStartOver: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const goToStep = modules.draft.useRestoredLevelUpStep(STEP_IDS, currentStep, setCurrentStep);
  const classId = modules.store.usePersFormStore((state) => state.formData.classId);
  const control = modules.guided.useGuidedLevelUp(offer);
  return (
    <>
      <p data-testid="step">{STEP_IDS[currentStep]}</p>
      <p data-testid="class">{String(classId)}</p>
      {isRestored ? <button onClick={onStartOver}>Почати заново</button> : null}
      <button onClick={() => goToStep(currentStep + 1)}>Далі</button>
      <button onClick={() => modules.store.usePersFormStore.getState().updateFormData({ classId: 9 })}>Обрати клас</button>
      <modules.guided.GuidedLevelUpCard control={control} />
    </>
  );
}

function fillDraftUpToSkills(): void {
  fireEvent.click(screen.getByRole("button", { name: "Обрати клас" }));
  fireEvent.click(screen.getByRole("button", { name: "Далі" }));
  fireEvent.click(screen.getByRole("button", { name: "Далі" }));
}

const shownStep = () => screen.getByTestId("step").textContent;
const shownClass = () => screen.getByTestId("class").textContent;

beforeEach(async () => {
  storage = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => void storage.set(key, value),
    removeItem: (key: string) => void storage.delete(key),
  });
  await openPage();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("незавершене підвищення рівня після перезавантаження", () => {
  it("на сервері чернетки немає — лише заглушка", () => {
    storage.set("dnd-pers-levelup-1", JSON.stringify({ state: { formData: { classId: 9 }, levelUpDraft: { base: modules.signature.buildLevelUpDraftBase(bard), stepId: "skills", guide: null } }, version: 1 }));

    expect(renderToString(<LevelUpPage pers={bard} />)).toContain("Завантаження");
  });

  it("повертає вибори й крок того самого персонажа на тому самому рівні", async () => {
    render(<LevelUpPage pers={bard} />);
    fillDraftUpToSkills();

    await openPage();
    render(<LevelUpPage pers={bard} />);

    expect(shownStep()).toBe("skills");
    expect(shownClass()).toBe("9");
    expect(screen.getByRole("button", { name: "Почати заново" })).toBeTruthy();
  });

  it("не відновлює чернетку, коли персонаж уже на іншому рівні", async () => {
    render(<LevelUpPage pers={bard} />);
    fillDraftUpToSkills();

    await openPage();
    render(<LevelUpPage pers={{ ...bard, level: 5 }} />);

    expect(shownStep()).toBe("path");
    expect(shownClass()).toBe("undefined");
    expect(screen.queryByRole("button", { name: "Почати заново" })).toBeNull();
  });

  it("не переносить чернетку на іншого персонажа і зберігає обидві", async () => {
    render(<LevelUpPage pers={bard} />);
    fillDraftUpToSkills();

    await openPage();
    render(<LevelUpPage pers={rogue} />);
    expect(shownStep()).toBe("path");
    expect(shownClass()).toBe("undefined");

    await openPage();
    render(<LevelUpPage pers={bard} />);
    expect(shownStep()).toBe("skills");
    expect(shownClass()).toBe("9");
    expect([...storage.keys()].filter((key) => key.startsWith("dnd-pers-levelup")).sort()).toEqual(["dnd-pers-levelup-1", "dnd-pers-levelup-2"]);
  });

  it("персонаж 2024 починає підвищення наново, як і раніше", async () => {
    const paladin2024 = { ...bard, persId: 3, ruleset: "RULES_2024" };
    render(<LevelUpPage pers={paladin2024} />);
    fillDraftUpToSkills();

    await openPage();
    render(<LevelUpPage pers={paladin2024} />);

    expect(shownStep()).toBe("path");
    expect(shownClass()).toBe("undefined");
  });

  it("«Почати заново» стирає вибори й повертає на перший крок", async () => {
    render(<LevelUpPage pers={bard} />);
    fillDraftUpToSkills();
    await openPage();
    render(<LevelUpPage pers={bard} />);

    act(() => fireEvent.click(screen.getByRole("button", { name: "Почати заново" })));

    expect(shownStep()).toBe("path");
    expect(shownClass()).toBe("undefined");
    expect(screen.queryByRole("button", { name: "Почати заново" })).toBeNull();
    await openPage();
    render(<LevelUpPage pers={bard} />);
    expect(shownStep()).toBe("path");
  });

  it("памʼятає заповнення за гайдом і повертає ручні вибори після перезавантаження", async () => {
    render(<LevelUpPage pers={bard} guide={guide} />);
    fireEvent.click(screen.getByRole("button", { name: "Обрати клас" }));
    fireEvent.click(screen.getByRole("button", { name: "Заповнити за гайдом" }));
    expect(shownClass()).toBe("2");

    await openPage();
    render(<LevelUpPage pers={bard} guide={guide} />);
    fireEvent.click(screen.getByRole("button", { name: "Повернутися до ручного підвищення" }));

    expect(shownClass()).toBe("9");
  });

  it("коли гайд змінився, лишає вибори, але знову пропонує заповнення", async () => {
    render(<LevelUpPage pers={bard} guide={guide} />);
    fireEvent.click(screen.getByRole("button", { name: "Заповнити за гайдом" }));

    await openPage();
    render(<LevelUpPage pers={bard} guide={{ ...guide, input: { ...guide.input, featId: 42 } }} />);

    expect(shownClass()).toBe("2");
    expect(screen.getByRole("button", { name: "Заповнити за гайдом" })).toBeTruthy();
  });
});
