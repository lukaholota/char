// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const posthog = vi.hoisted(() => ({ capturePostHogEvent: vi.fn() }));
vi.mock("@/lib/monitoring/posthog-client", () => posthog);

import { useRpgbotArticleReading } from "./use-rpgbot-article-reading";
import type { ContentReference } from "@/lib/optimization/types";

type ObserverCallback = (entries: { target: Element; isIntersecting: boolean }[]) => void;
let notify: ObserverCallback = () => undefined;

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", class {
    constructor(callback: ObserverCallback) { notify = callback; }
    observe() {}
    unobserve() {}
    disconnect() {}
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  posthog.capturePostHogEvent.mockClear();
});

const CATALOG_HREF = "/weapons/longsword";
const SPELL_HREF = "/spells/shield";
const ARTICLE_HREF = "/rules/optimization/barbarian-2014#start";
const REFERENCES: ContentReference[] = [{ kind: "feat", href: "/feats?feat=alert", name: "Пильність", engName: "Alert", details: [] }];

function Article() {
  useRpgbotArticleReading("fighter-2014", REFERENCES);
  return (
    <div data-article-content>
      <section id="a"><a href={CATALOG_HREF}>Щит</a><a href={SPELL_HREF}>Заклинання</a></section>
      <section id="b"><a href="https://rpgbot.net/dnd5/characters/classes/fighter/">Оригінал</a><a href="/no-ai/feats?feat=alert">Пильність</a></section>
      <section id="c"><a href={ARTICLE_HREF}>Варвар</a></section><section id="d" />
    </div>
  );
}

function findEvents(name: string) {
  return posthog.capturePostHogEvent.mock.calls.filter(([event]) => event === name).map(([, properties]) => properties);
}

describe("article reading analytics", () => {
  it("reports a depth milestone once, when enough sections have been on screen", () => {
    const { container } = render(<Article />);
    const sections = container.querySelectorAll("section");
    act(() => notify([{ target: sections[0], isIntersecting: true }]));
    act(() => notify([{ target: sections[0], isIntersecting: true }, { target: sections[1], isIntersecting: false }]));
    expect(findEvents("rpgbot_article_read_depth").map((properties) => properties.depth_percent)).toEqual([25]);
    act(() => notify([{ target: sections[1], isIntersecting: true }, { target: sections[2], isIntersecting: true }, { target: sections[3], isIntersecting: true }]));
    expect(findEvents("rpgbot_article_read_depth").map((properties) => properties.depth_percent)).toEqual([25, 50, 75, 100]);
    expect(findEvents("rpgbot_article_read_depth").every((properties) => properties.section_count === 4)).toBe(true);
  });

  it("classifies link clicks inside the article by destination", () => {
    const { getByText } = render(<Article />);
    ["Щит", "Оригінал", "Заклинання", "Пильність", "Варвар"].forEach((text) => getByText(text).click());
    expect(findEvents("rpgbot_article_link_clicked").map((properties) => properties.link_kind)).toEqual(["catalog", "original", "reference", "reference", "article"]);
    expect(findEvents("rpgbot_article_link_clicked")[0]).toMatchObject({ article_slug: "fighter-2014" });
  });

  it("stops listening after unmount", () => {
    const { getByText, unmount } = render(<Article />);
    const link = getByText("Щит");
    unmount();
    link.click();
    expect(findEvents("rpgbot_article_link_clicked")).toEqual([]);
  });
});
