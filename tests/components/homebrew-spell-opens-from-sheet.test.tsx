// @vitest-environment jsdom
//
// Хоумбрю-заклинання на листі не відкривалось зовсім: запис історії йшов без `?spell=`, а
// `locationchange` після нього перечитував адресу й закривав модалку раніше за перший кадр.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useParams: () => ({ id: "7" }), usePathname: () => "/char/7" }));
vi.mock("@/lib/actions/pers", () => ({ getUserPersesSpellIndex: vi.fn(async () => []) }));
vi.mock("@/lib/actions/spell-actions", () => ({ setSpellPresenceForPersByLink: vi.fn() }));

import { SpellInfoModal } from "@/lib/components/characterSheet/SpellInfoModal";
import { openHomebrewSpell } from "@/lib/spell-link";
import type { SpellData } from "@/lib/spellsData";

const homebrewSpell: SpellData = {
  spellId: -41,
  name: "Чародійний сплеск 2014",
  engName: "",
  level: 0,
  school: "EVOCATION",
  castingTime: "дія",
  duration: "миттєва",
  range: "120 футів",
  components: "В, С",
  description: "Промінь тріскучої енергії.",
  source: "HOMEBREW",
  hasRitual: "ні",
  hasConcentration: "ні",
  spellClasses: [],
  spellRaces: [],
  ruleset: "RULES_2014",
};

beforeEach(() => {
  window.history.replaceState({}, "", "/char/7");
  vi.stubGlobal("fetch", vi.fn(async () => new Response("null", { status: 404 })));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("хоумбрю-заклинання відкривається з листа", () => {
  it("модалка показує заклинання й не ходить за ним у мережу", async () => {
    render(<SpellInfoModal />);

    await act(async () => {
      openHomebrewSpell(homebrewSpell);
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(await screen.findByText("Промінь тріскучої енергії.")).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("адреса несе ключ і редакцію хоумбрю, тож «Назад» і хрестик працюють як для каталогу", async () => {
    render(<SpellInfoModal />);

    await act(async () => {
      openHomebrewSpell({ ...homebrewSpell, ruleset: "RULES_2024" });
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(window.location.search).toBe("?spell=-41&edition=2024");
    expect((window.history.state as Record<string, unknown>).__spellModalDepth).toBe(1);
  });
});
