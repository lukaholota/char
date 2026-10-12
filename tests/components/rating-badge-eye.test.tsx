// @vitest-environment jsdom
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NoAiModeProvider } from "@/components/no-ai/NoAiModeProvider";
import { RatingBadge } from "@/components/optimization/RatingBadge";
import type { RatingTone } from "@/lib/optimization/article-view";

const mocks = vi.hoisted(() => ({ pathname: "/rules/optimization" }));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname }));

const EYE_TONES: RatingTone[] = ["red", "orange", "green", "blue", "none"];

afterEach(() => { cleanup(); window.history.replaceState({}, "", "/"); mocks.pathname = "/rules/optimization"; });

describe("лінза аналітика в бейджі оцінки", () => {
  it.each([[1, "red"], [2, "orange"], [3, "green"], [4, "blue"]] as const)("оцінка %i з 4 малює %s лінзу", (score, tone) => {
    const { container } = render(<RatingBadge rating={{ score, context: "Порівняння підкласів" }} />);
    const eye = container.querySelector("img");
    expect(eye?.getAttribute("src")).toBe(`/images/rpgbot/eye-${tone}.png`);
    expect(eye?.className).toContain("[image-rendering:pixelated]");
  });

  it("без оцінки малює сріблясту лінзу", () => {
    const { container } = render(<RatingBadge rating={{ score: undefined, context: "" }} />);
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/images/rpgbot/eye-none.png");
  });

  it("не міняє текст бейджа й не додає зайвого до доступного імені", () => {
    const { container } = render(<RatingBadge rating={{ score: 3, context: "Порівняння підкласів" }} />);
    expect(screen.getByText(/3\/4 Добре/)).toBeTruthy();
    expect(container.querySelector("img")?.getAttribute("alt")).toBe("");
  });

  it("лишається в режимі без ШІ", () => {
    mocks.pathname = "/no-ai/rules/optimization";
    window.history.replaceState({}, "", mocks.pathname);
    const { container } = render(<NoAiModeProvider><RatingBadge rating={{ score: 4, context: "" }} /></NoAiModeProvider>);
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/images/rpgbot/eye-blue.png");
  });

  it.each(EYE_TONES)("файл лінзи для тону %s існує на диску", (tone) => {
    expect(fs.existsSync(path.resolve(process.cwd(), "public/images/rpgbot", `eye-${tone}.png`))).toBe(true);
  });
});
