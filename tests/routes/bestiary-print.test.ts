import { describe, expect, it, vi } from "vitest";

const generateCreaturesPdfBytes = vi.hoisted(() =>
  vi.fn(async () => new Uint8Array([37, 80, 68, 70]))
);

vi.mock("@/server/pdf/creaturesPdf", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/pdf/creaturesPdf")>()),
  generateCreaturesPdfBytes,
}));

import { GET } from "@/app/api/bestiary/print/route";

describe("GET /api/bestiary/print", () => {
  it("повертає один PDF для валідного непорожнього вибору", async () => {
    const response = await GET(
      new Request("http://localhost/api/bestiary/print?ruleset=RULES_2014&keys=wolf")
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(generateCreaturesPdfBytes).toHaveBeenCalledOnce();
  });

  it("повертає 400 для порожнього вибору", async () => {
    const response = await GET(
      new Request("http://localhost/api/bestiary/print?ruleset=RULES_2014")
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Оберіть хоча б одну істоту" });
  });

  it("повертає 400 для невідомої редакції", async () => {
    const response = await GET(
      new Request("http://localhost/api/bestiary/print?ruleset=UNKNOWN&keys=wolf")
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Невідома редакція бестіарію" });
  });

  it("повертає 404 для відсутньої істоти до запуску PDF renderer", async () => {
    const response = await GET(
      new Request(
        "http://localhost/api/bestiary/print?ruleset=RULES_2014&keys=definitely-not-a-creature"
      )
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Істоту не знайдено: definitely-not-a-creature",
    });
  });
});
