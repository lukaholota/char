import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const loadNames = vi.hoisted(() => vi.fn());
vi.mock("@/server/db/selected-spells", () => ({ loadSelectedSpellNames: loadNames }));
import { GET } from "@/app/api/spells/selected/route";

beforeEach(() => loadNames.mockReset());
describe("назви вибраних заклинань", () => {
  it("читає ID бази в заданій редакції одним запитом без дублів", async () => {
    loadNames.mockResolvedValue([{ spellId: 31005, name: "Настанова [Guidance]" }]);
    const response = await GET(new NextRequest("http://localhost/api/spells/selected?ruleset=RULES_2024&ids=31005,31005"));
    expect(loadNames).toHaveBeenCalledExactlyOnceWith("RULES_2024", [31005]);
    expect(await response.json()).toEqual([{ spellId: 31005, name: "Настанова [Guidance]" }]);
  });
  it.each(["ruleset=unknown&ids=1", "ruleset=RULES_2014&ids=-1", "ruleset=RULES_2014&ids=1.5", "ruleset=RULES_2014", `ruleset=RULES_2014&ids=${Array(301).fill(1).join(",")}`])("відхиляє невалідний запит %s", async (query) => {
    const response = await GET(new NextRequest(`http://localhost/api/spells/selected?${query}`));
    expect(response.status).toBe(400);
    expect(loadNames).not.toHaveBeenCalled();
  });
});
