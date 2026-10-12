// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CreatureAnchor, findCreatureReadingLink } from "@/components/ui/CreatureAnchor";

const mocks = vi.hoisted(() => ({ load: vi.fn(() => ({ creature: null })) }));
vi.mock("@/hooks/useCreatureStatblock", () => ({ useCreatureStatblock: mocks.load }));
vi.mock("@/hooks/useModalBackButton", () => ({ useModalBackButton: vi.fn() }));
vi.mock("@/components/no-ai/NoAiModeProvider", () => ({ useNoAiHref: () => (href: string) => href }));
vi.mock("next/dynamic", () => ({ default: () => () => <div>Статблок</div> }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("loads only after activation and retains the explicit creature edition", () => {
  const href = "/2024/bestiary/reaper-spirit";
  render(<CreatureAnchor href={href} creatureLink={findCreatureReadingLink(href)!}>Дух</CreatureAnchor>);
  expect(mocks.load).toHaveBeenLastCalledWith(null, "RULES_2024", null);
  fireEvent.click(screen.getByRole("link", { name: "Дух" }));
  expect(mocks.load).toHaveBeenLastCalledWith("reaper-spirit", "RULES_2024", null);
  expect(screen.getByRole("dialog")).toBeTruthy();
});

it("preserves modified clicks for opening the regular catalogue target", () => {
  const href = "/bestiary/reaper-spirit";
  render(<CreatureAnchor href={href} creatureLink={findCreatureReadingLink(href)!}>Дух</CreatureAnchor>);
  fireEvent.click(screen.getByRole("link", { name: "Дух" }), { ctrlKey: true });
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(mocks.load).toHaveBeenLastCalledWith(null, "RULES_2014", null);
});

it("keeps no-ai edition prefixes and ignores unrelated or external targets", () => {
  expect(findCreatureReadingLink("/no-ai/bestiary/reaper-spirit")).toEqual({ key: "reaper-spirit", ruleset: "RULES_2014" });
  expect(findCreatureReadingLink("/no-ai/2024/bestiary/reaper-spirit")?.ruleset).toBe("RULES_2024");
  expect(findCreatureReadingLink("https://example.com/bestiary/reaper-spirit")).toBeNull();
  expect(findCreatureReadingLink("/classes/monk")).toBeNull();
});
