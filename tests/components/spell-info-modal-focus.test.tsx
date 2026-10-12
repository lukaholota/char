// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SpellAnchor } from "@/components/ui/SpellAnchor";
import { SpellInfoModal } from "@/lib/components/characterSheet/SpellInfoModal";
import type { SpellData } from "@/lib/spellsData";

vi.mock("next/navigation", () => ({ useParams: () => ({}) }));
vi.mock("@/components/no-ai/NoAiModeProvider", () => ({ useNoAiHref: () => (href: string) => href }));
vi.mock("@/lib/components/characterSheet/AddSpellToPersButtons", () => ({
  AddToPersDropdown: () => null,
  AddToSinglePersButton: () => null,
}));
vi.mock("@/components/ui/FormattedDescription", () => ({
  FormattedDescription: ({ content }: { content: string }) => <p>{content}</p>,
}));
vi.mock("@/lib/spell-cards", async () => {
  const { default: spells } = await import("@/lib/generated/spells.json");
  const shield = (spells as SpellData[]).find((spell) => spell.engName === "Shield");
  if (!shield) throw new Error("У каталозі 2014 немає Shield");
  return {
    findLoadedSpellForModal: () => shield,
    findSpellForModal: async () => shield,
  };
});

beforeEach(() => window.history.replaceState(null, "", "/rules/optimization/aberrant-dragonmark-2014"));
afterEach(cleanup);

describe("фокус модалки заклинання зі статті", () => {
  it.each(["Escape", "Назад"])("повертається до посилання після %s", async (method) => {
    render(<>
      <SpellAnchor spellLink={{ spellKey: "shield", ruleset: "RULES_2014" }}>Щит</SpellAnchor>
      <SpellInfoModal />
    </>);
    const link = screen.getByRole("link", { name: "Щит" });
    link.focus();
    fireEvent.click(link);
    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).toContain("Щит");

    if (method === "Escape") fireEvent.keyDown(dialog, { key: "Escape" });
    else window.history.back();

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(link));
    await waitFor(() => expect(window.location.search).toBe(""));
  });
});
