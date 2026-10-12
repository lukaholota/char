// @vitest-environment jsdom
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { SessionContext } from "next-auth/react";
import { NoAiModeProvider } from "@/components/no-ai/NoAiModeProvider";
import { SubclassAnalysis } from "@/components/optimization/SubclassAnalysis";
import type { RatingTone } from "@/lib/optimization/article-view";
import type { EntityRef } from "@/lib/optimization/types";

const mocks = vi.hoisted(() => ({ pathname: "/classes" }));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname }));

const OWNER_SESSION = { data: { user: { email: "lukagolota1@gmail.com" }, expires: "2099-01-01T00:00:00.000Z" }, status: "authenticated" as const, update: vi.fn() };
const ENTITY: EntityRef = { ruleset: "RULES_2014", kind: "subclass", entityKey: "way-of-the-open-hand", parentKey: "monk" };
const ANALYST_TONES: RatingTone[] = ["red", "orange", "green", "blue", "none"];

function buildPreview(score?: 1 | 2 | 3 | 4) {
  return {
    binding: {
      bindingId: "binding-open-hand", entity: ENTITY, articleId: "monk-2014", sectionId: "open-hand", role: "comparison", primary: true,
      preview: "Надійний підклас для старту.", ratingIds: [], evidence: "Звірено вручну", reviewedAt: "2026-10-03T00:00:00Z",
    },
    slug: "monk-2014", title: "Монах", href: "/rules/optimization/monk-2014", builds: [],
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
