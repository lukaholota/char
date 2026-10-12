// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BranchCardGrid, type BranchCard } from "@/components/catalogs/reading/BranchCardGrid";
import { NoAiModeProvider } from "@/components/no-ai/NoAiModeProvider";
import { SubclassListDialogBody } from "@/lib/components/characterCreator/modals/SubclassListDialogBody";
import { findPresetImageSrc } from "@/lib/optimization/ready-preset-catalog";

const mocks = vi.hoisted(() => ({ pathname: "/classes" }));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname }));

const CHAMPION_ART = "/images/subclasses/fighter-champion.webp";
const FORMS = ["здібність", "здібності", "здібностей"] as const;

afterEach(() => { cleanup(); window.history.replaceState({}, "", "/"); mocks.pathname = "/classes"; });

function renderAt(pathname: string, ui: React.ReactNode) {
  mocks.pathname = pathname;
  window.history.replaceState({}, "", pathname);
  return render(<NoAiModeProvider>{ui}</NoAiModeProvider>);
}

function findImageUrls(container: HTMLElement): string[] {
  return [...container.querySelectorAll("img")].map((image) => decodeURIComponent(image.getAttribute("src") ?? ""));
}

function buildCard(imageSrc?: string | null): BranchCard {
  return { key: "champion", name: "Чемпіон", engName: "Champion", kindLabel: "Підклас", sourceLabel: null, entryCount: 4, entryCountForms: FORMS, description: "Опис", imageSrc };
}

describe("арт на картках підкласів у каталозі", () => {
  it("малює обкладинку над назвою зі ШІ", () => {
    const { container } = renderAt("/classes", <BranchCardGrid cards={[buildCard(CHAMPION_ART)]} is2024={false} onOpen={() => {}} />);
    expect(findImageUrls(container)).toEqual([expect.stringContaining(CHAMPION_ART)]);
  });

  it("без ШІ лишає картку зі старим виглядом, без картинки й заглушки", () => {
    const { container } = renderAt("/no-ai/classes", <BranchCardGrid cards={[buildCard(CHAMPION_ART)]} is2024={false} onOpen={() => {}} />);
    expect(findImageUrls(container)).toEqual([]);
    expect(container.querySelector("[data-branch-card] > div")).toBeNull();
  });

  it("картка без арту лишається без картинки", () => {
    const { container } = renderAt("/classes", <BranchCardGrid cards={[buildCard(null)]} is2024={false} onOpen={() => {}} />);
    expect(findImageUrls(container)).toEqual([]);
  });
});

describe("арт підкласів у конструкторі персонажа", () => {
  const champion = { subclassId: 1, name: "CHAMPION", description: "Опис підкласу", features: [] };
  const withoutArt = { subclassId: 2, name: "NO_SUCH_SUBCLASS", description: "Опис", features: [] };

  it("список підкласів показує обкладинку лише тим, у кого є арт", () => {
    const { container } = renderAt("/char/create", <SubclassListDialogBody current={[champion, withoutArt]} legacy={[]} isLoading={false} />);
    expect(findImageUrls(container)).toEqual([expect.stringContaining(CHAMPION_ART)]);
  });

  it("список без ШІ не малює нічого", () => {
    const { container } = renderAt("/no-ai/char/create", <SubclassListDialogBody current={[champion]} legacy={[]} isLoading={false} />);
    expect(findImageUrls(container)).toEqual([]);
  });

  it("модалка підкласу показує обкладинку зверху", () => {
    renderAt("/char/create", <SubclassListDialogBody current={[champion]} legacy={[]} isLoading={false} />);
    fireEvent.click(screen.getByRole("button"));
    const dialog = screen.getByRole("dialog");
    expect(findImageUrls(dialog)).toEqual([expect.stringContaining(CHAMPION_ART)]);
  });
});

describe("запасний портрет готового білда", () => {
  const classOnly = { portraitSrc: null, subclassImageSrc: null, classImageSrc: "/images/classes/fighter.webp" };

  it("бере власний портрет, потім арт підкласу, потім арт класу", () => {
    expect(findPresetImageSrc({ ...classOnly, portraitSrc: "/images/presets/own.webp", subclassImageSrc: CHAMPION_ART }, false)).toBe("/images/presets/own.webp");
    expect(findPresetImageSrc({ ...classOnly, subclassImageSrc: CHAMPION_ART }, false)).toBe(CHAMPION_ART);
    expect(findPresetImageSrc(classOnly, false)).toBe("/images/classes/fighter.webp");
  });

  it("без ШІ завжди віддає арт класу", () => {
    expect(findPresetImageSrc({ ...classOnly, portraitSrc: "/images/presets/own.webp", subclassImageSrc: CHAMPION_ART }, true)).toBe("/images/classes/fighter.webp");
  });
});
