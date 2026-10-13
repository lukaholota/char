// @vitest-environment jsdom
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { SessionContext } from "next-auth/react";
import { NoAiModeProvider } from "@/components/no-ai/NoAiModeProvider";
import { SubclassAnalysis } from "@/components/optimization/SubclassAnalysis";
import { CharacterSourceBuildContext, type CharacterSourceBuild } from "@/components/optimization/CharacterSourceBuildContext";
import type { RatingTone } from "@/lib/optimization/article-view";
import type { EntityRef } from "@/lib/optimization/types";

const mocks = vi.hoisted(() => ({ pathname: "/classes" }));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname }));

const OWNER_SESSION = { data: { user: { email: "lukagolota1@gmail.com" }, expires: "2099-01-01T00:00:00.000Z" }, status: "authenticated" as const, update: vi.fn() };
const ENTITY: EntityRef = { ruleset: "RULES_2014", kind: "subclass", entityKey: "way-of-the-open-hand", parentKey: "monk" };
const ANALYST_TONES: RatingTone[] = ["red", "orange", "green", "blue", "none"];

function buildPreview(score?: 1 | 2 | 3 | 4, builds: { buildId: string; title: string; guideHref: string }[] = [], guideHref: string | null = null) {
  return {
    binding: {
      bindingId: "binding-open-hand", entity: ENTITY, articleId: "monk-2014", sectionId: "open-hand", role: "comparison", primary: true,
      preview: "Надійний підклас для старту.", ratingIds: [], evidence: "Звірено вручну", reviewedAt: "2026-10-03T00:00:00Z",
    },
    slug: "monk-2014", title: "Монах", href: "/rules/optimization/monk-2014", guideHref, builds,
    rating: score === undefined ? undefined : {
      ratingId: "rating-open-hand", articleId: "monk-2014", translationRevisionId: "monk-2014-uk", sectionId: "open-hand",
      targetBlockId: "open-hand-heading", context: "Порівняння підкласів", score, explanation: "Пояснення автора",
    },
  };
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.history.replaceState({}, "", "/"); mocks.pathname = "/classes"; });

async function renderAnalysisAt(pathname: string, score?: 1 | 2 | 3 | 4) {
  mocks.pathname = pathname;
  window.history.replaceState({}, "", pathname);
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => buildPreview(score) })));
  const view = render(
    <NoAiModeProvider>
      <SessionContext.Provider value={OWNER_SESSION}>
        <SubclassAnalysis entity={ENTITY} placement="catalog" />
      </SessionContext.Provider>
    </NoAiModeProvider>,
  );
  await screen.findByText("Аналіз RPGbot");
  return view.container.querySelector("img");
}

describe("аватар аналітика в блоці аналізу підкласу", () => {
  it("малюється як є, без оптимізатора, з піксельним рендером", async () => {
    const avatar = await renderAnalysisAt("/classes");
    expect(avatar?.getAttribute("width")).toBe("96");
    expect(avatar?.className).toContain("[image-rendering:pixelated]");
  });

  it("без оцінки має сріблясте око", async () => {
    const avatar = await renderAnalysisAt("/classes");
    expect(avatar?.getAttribute("src")).toBe("/images/rpgbot/analyst-none.png");
  });

  it.each([[1, "red"], [2, "orange"], [3, "green"], [4, "blue"]] as const)("оцінка %i з 4 фарбує око в %s", async (score, tone) => {
    const avatar = await renderAnalysisAt("/classes", score);
    expect(avatar?.getAttribute("src")).toBe(`/images/rpgbot/analyst-${tone}.png`);
  });

  it("лишається в режимі без ШІ", async () => {
    const avatar = await renderAnalysisAt("/no-ai/classes", 4);
    expect(avatar?.getAttribute("src")).toBe("/images/rpgbot/analyst-blue.png");
  });

  it.each(ANALYST_TONES)("спрайт для тону %s існує на диску", (tone) => {
    expect(fs.existsSync(path.resolve(process.cwd(), "public/images/rpgbot", `analyst-${tone}.png`))).toBe(true);
  });
});

const BUILDS = [
  { buildId: "build-monk-open-hand-2014", title: "Монаха відкритої долоні", guideHref: "/rules/optimization/monk-open-hand-2014#build-a" },
  { buildId: "build-monk-open-hand-tank-2014", title: "Монаха-захисника", guideHref: "/rules/optimization/monk-open-hand-2014#build-b" },
];

async function renderBuildLinks(character: CharacterSourceBuild | null, guideHref: string | null = null) {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => buildPreview(3, BUILDS, guideHref) })));
  render(
    <NoAiModeProvider>
      <SessionContext.Provider value={OWNER_SESSION}>
        <CharacterSourceBuildContext.Provider value={character}>
          <SubclassAnalysis entity={ENTITY} placement="catalog" />
        </CharacterSourceBuildContext.Provider>
      </SessionContext.Provider>
    </NoAiModeProvider>,
  );
  await screen.findByText("Аналіз RPGbot");
}

describe("варіанти збірки в аналізі підкласу", () => {
  it("у каталозі пропонує зібрати кожен варіант", async () => {
    await renderBuildLinks(null);
    expect(screen.getAllByRole("link", { name: /Зібрати цей варіант/ })).toHaveLength(2);
  });

  it("на аркуші персонажа не пропонує збирати нового, а називає варіант, за яким його зібрано", async () => {
    await renderBuildLinks({ sourceBuildId: "build-monk-open-hand-tank-2014", guide: null });
    expect(screen.queryByRole("link", { name: /Зібрати цей варіант/ })).toBeNull();
    expect(screen.getByText(/Цього персонажа зібрано за варіантом/).textContent).toBe("Цього персонажа зібрано за варіантом Монаха-захисника.");
    expect(screen.getByRole("link", { name: "Монаха-захисника" }).getAttribute("href")).toBe("/rules/optimization/monk-open-hand-2014#build-b");
  });

  it("на аркуші персонажа, зібраного вручну, не показує ні посилань, ні примітки", async () => {
    await renderBuildLinks({ sourceBuildId: null, guide: null });
    expect(screen.queryByRole("link", { name: /Зібрати цей варіант/ })).toBeNull();
    expect(screen.queryByText(/зібрано за варіантом/)).toBeNull();
  });
});

describe("посилання на повний аналіз підкласу", () => {
  it("веде на окремий гайд підкласу, коли він є, і не дублює його посиланням на статтю-порівняння", async () => {
    await renderBuildLinks(null, "/rules/optimization/monk-open-hand-2014");
    expect(screen.getByRole("link", { name: "Читати повний гайд підкласу" }).getAttribute("href")).toBe("/rules/optimization/monk-open-hand-2014");
    expect(screen.queryByRole("button", { name: "Читати повний аналіз" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Відкрити статтю" })).toBeNull();
  });

  it("без окремого гайду відкриває розділ статті у вікні", async () => {
    await renderBuildLinks(null);
    expect(screen.getByRole("button", { name: "Читати повний аналіз" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Відкрити статтю" })).toBeNull();
  });
});
