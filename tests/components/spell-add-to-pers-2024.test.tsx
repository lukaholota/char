// @vitest-environment jsdom
//
// KR25.2 — «Додати до персонажа» для заклинання 2024. У каталозі воно має слаг, у базі — свій
// номер, тож модалка шле серверу посилання (`engName + ruleset` через слаг), а не номер каталогу.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const route = vi.hoisted(() => ({ pathname: "/char/7" }));
vi.mock("next/navigation", () => ({ useParams: () => ({ id: "7" }), usePathname: () => route.pathname }));
vi.mock("@/components/no-ai/NoAiModeProvider", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/components/no-ai/NoAiModeProvider")>()),
  useRoutePathname: () => route.pathname,
}));
vi.mock("@/lib/actions/pers", () => ({
  getUserPersesSpellIndex: vi.fn(async () => [{ persId: 7, name: "Друїдка", spellIds: [], spellKeys: [] }]),
}));
vi.mock("@/lib/actions/spell-actions", () => ({
  setSpellPresenceForPersByLink: vi.fn(async ({ present }: { present: boolean }) => ({ success: true, present, spellId: 1700 })),
}));

import { SpellInfoModal } from "@/lib/components/characterSheet/SpellInfoModal";
import { setSpellPresenceForPersByLink } from "@/lib/actions/spell-actions";
import { openSpellLink } from "@/lib/spell-link";
import { serveSpellCardsFromRoute } from "../helpers/serve-spell-cards";

beforeEach(() => {
  route.pathname = "/char/7";
  window.history.replaceState({}, "", "/char/7");
  serveSpellCardsFromRoute();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("KR25.2 — заклинання 2024 додається до персонажа", () => {
  it("кнопка є, і вона шле посилання зі слагом, а не номер каталогу", async () => {
    render(<SpellInfoModal />);
    openSpellLink({ spellKey: "produce-flame", ruleset: "RULES_2024" });

    await screen.findByText("Створення вогню [Produce Flame]", {}, { timeout: 5000 });
    const addButton = await screen.findByRole("button", { name: "Додати до персонажа" });
    fireEvent.click(addButton);

    await waitFor(() =>
      expect(setSpellPresenceForPersByLink).toHaveBeenCalledWith({
        persId: 7,
        link: { spellKey: "produce-flame", ruleset: "RULES_2024" },
        present: true,
      })
    );
  });

  it("у кімнаті /games/7 номер з адреси не вважається персонажем — лише вибір зі списку", async () => {
    route.pathname = "/games/7";
    window.history.replaceState({}, "", "/games/7");
    render(<SpellInfoModal />);
    openSpellLink({ spellKey: "produce-flame", ruleset: "RULES_2024" });

    await screen.findByText("Створення вогню [Produce Flame]", {}, { timeout: 5000 });
    expect((await screen.findByRole("button", { name: "Додати до персонажа" })).getAttribute("aria-haspopup")).toBe("menu");
  });
});
