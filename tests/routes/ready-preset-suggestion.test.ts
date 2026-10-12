import { describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/optimization/ready-preset-suggestion/route";

vi.mock("server-only", () => ({}));

const request = (query: string) => new Request(`http://localhost/api/optimization/ready-preset-suggestion?${query}`);

describe("ready preset suggestion route", () => {
  it("suggests a preset of the chosen class and counts the others", async () => {
    const response = await GET(request("classKey=ROGUE_2014"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.total).toBeGreaterThanOrEqual(7);
    expect(body.best.entry).toMatchObject({ startingClassKey: "ROGUE_2014", maxLevel: expect.any(Number) });
  });

  it("puts the preset of the chosen subclass first and reports the match", async () => {
    const body = await (await GET(request("classKey=ROGUE_2014&subclassKey=THIEF"))).json();

    expect(body.best).toMatchObject({ isSubclassMatch: true, entry: { startingSubclassKey: "THIEF" } });
  });

  it("matches the race when a preset of that race exists", async () => {
    const body = await (await GET(request("classKey=ROGUE_2014&subclassKey=THIEF&raceKey=HUMAN_2014"))).json();

    expect(body.best.isRaceMatch).toBe(body.best.entry.raceKey === "HUMAN_2014");
  });

  it("returns no suggestion for a class without presets", async () => {
    const body = await (await GET(request("classKey=NOT_A_CLASS"))).json();

    expect(body).toEqual({ total: 0, best: null });
  });

  it("refuses a malformed query without reading the catalog", async () => {
    expect((await GET(request("classKey=bad/key"))).status).toBe(400);
    expect((await GET(request(""))).status).toBe(400);
  });
});
