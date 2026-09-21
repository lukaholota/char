// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { closeSpellLink, openSpellLink } from "@/lib/spell-link";
import { waitForPendingHistoryBack } from "@/lib/history-back";

const fireBolt = { spellKey: "fire-bolt", ruleset: "RULES_2014" } as const;
const shield = { spellKey: "shield", ruleset: "RULES_2014" } as const;

function waitForHistory() {
  return new Promise((resolve) => setTimeout(resolve, 50));
}

describe("подробиці заклинання на листі — один запис в історії на заклинання", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/char/7");
  });
  afterEach(() => vi.restoreAllMocks());

  it("хрестик повертається на запис листа, а не лишає ?spell= позаду", async () => {
    openSpellLink(fireBolt);
    await waitForHistory();
    const go = vi.spyOn(window.history, "go");

    closeSpellLink();

    expect(go).toHaveBeenCalledWith(-1);
  });

  it("хрестик після заклинання, відкритого з опису іншого, закриває обидва", async () => {
    openSpellLink(fireBolt);
    await waitForHistory();
    openSpellLink(shield);
    await waitForHistory();
    const go = vi.spyOn(window.history, "go");

    closeSpellLink();

    expect(go).toHaveBeenCalledWith(-2);
  });

  it("запис заклинання несе стан Next — інакше Next тягне сторінку з сервера й перемальовує лист", async () => {
    await waitForPendingHistoryBack();
    const nextJsState = { __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: ["", { children: ["char", {}] }] };
    window.history.replaceState(nextJsState, "", "/char/7");

    openSpellLink(fireBolt);
    await waitForHistory();

    expect(window.history.state).toEqual({ ...nextJsState, __spellModalDepth: 1 });
    expect(window.location.search).toBe("?spell=fire-bolt");
  });

  it("прямий захід за посиланням ?spell= хрестик лише прибирає параметр", () => {
    window.history.replaceState(null, "", "/char/7?spell=fire-bolt");
    const go = vi.spyOn(window.history, "go");

    closeSpellLink();

    expect(go).not.toHaveBeenCalled();
    expect(window.location.search).toBe("");
  });
});
