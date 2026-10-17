import { describe, expect, it } from "vitest";
import { decodeDraftLink, encodeDraftLink, MAX_ENCODED_DRAFT_LENGTH, type LinkedDraft } from "./draft-link";
import { appendDraftFragment, stripDraftFragment } from "./draft-fragment";

const draft: LinkedDraft = {
  scope: "CREATOR_2014",
  formData: { name: "Тарас", raceId: 3, classId: 7 },
  currentStep: 4,
  totalSteps: 9,
};

async function encodeRaw(value: unknown): Promise<string> {
  const stream = new CompressionStream("deflate-raw");
  const writer = stream.writable.getWriter();
  void writer.write(new TextEncoder().encode(typeof value === "string" ? value : JSON.stringify(value)));
  void writer.close();
  const bytes = new Uint8Array(await new Response(stream.readable).arrayBuffer());
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

describe("draft link codec", () => {
  it("restores the same draft it encoded", async () => {
    const encoded = await encodeDraftLink(draft);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(await decodeDraftLink(encoded!)).toEqual(draft);
  });

  it("keeps the preset scope with its build id", async () => {
    const preset = { ...draft, scope: "PRESET_2014:fighter-champion" } as const;
    expect((await decodeDraftLink((await encodeDraftLink(preset))!))?.scope).toBe("PRESET_2014:fighter-champion");
  });

  it("refuses to build a link longer than the limit", async () => {
    let seed = 1;
    const noise = Array.from({ length: 40_000 }, () => String.fromCharCode(0x400 + ((seed = (seed * 48271) % 2147483647) % 900))).join("");
    expect(await encodeDraftLink({ ...draft, formData: { name: noise } as LinkedDraft["formData"] })).toBeNull();
  });

  it("rejects a fragment over the length limit before decoding", async () => {
    expect(await decodeDraftLink("A".repeat(MAX_ENCODED_DRAFT_LENGTH + 1))).toBeNull();
  });

  it("stops inflating a small fragment that expands past the limit", async () => {
    const bomb = await encodeRaw({ v: 1, s: "CREATOR_2014", d: { formData: { name: "x".repeat(200_000) }, currentStep: 2, totalSteps: 9 } });
    expect(bomb.length).toBeLessThan(MAX_ENCODED_DRAFT_LENGTH);
    expect(await decodeDraftLink(bomb)).toBeNull();
  });

  it.each(["", "not base64!", "QUJD", "%%%"])("ignores garbage %j", async (garbage) => {
    expect(await decodeDraftLink(garbage)).toBeNull();
  });

  it("ignores compressed text that is not JSON", async () => {
    expect(await decodeDraftLink(await encodeRaw("hello"))).toBeNull();
  });

  it.each([
    ["an unknown version", { v: 2, s: "CREATOR_2014", d: { formData: {}, currentStep: 2, totalSteps: 9 } }],
    ["a level-up scope", { v: 1, s: "LEVEL_UP", d: { formData: {}, currentStep: 2, totalSteps: 9 } }],
    ["a sheet scope", { v: 1, s: "SHEET_FEAT:12", d: { formData: {}, currentStep: 2, totalSteps: 9 } }],
    ["a step out of range", { v: 1, s: "CREATOR_2014", d: { formData: {}, currentStep: 0, totalSteps: 9 } }],
    ["a field of the wrong type", { v: 1, s: "CREATOR_2014", d: { formData: { raceId: "drop table" }, currentStep: 2, totalSteps: 9 } }],
  ])("rejects %s", async (_label, payload) => {
    expect(await decodeDraftLink(await encodeRaw(payload))).toBeNull();
  });

  it("drops fields the creator does not know and keeps raw step values", async () => {
    const customAsi = [{ ability: "STR", value: "15" }];
    const linked = await decodeDraftLink(await encodeRaw({ v: 1, s: "CREATOR_2024", d: { formData: { name: "Оля", customAsi, __proto__x: 1, isAdmin: true }, currentStep: 2, totalSteps: 9 } }));
    expect(linked?.formData).toEqual({ name: "Оля", customAsi });
  });
});

describe("draft fragment", () => {
  it("adds the draft after the page address and replaces an older one", () => {
    expect(appendDraftFragment("https://char.holota.family/char/create?entry_source=telegram", "abc")).toBe("https://char.holota.family/char/create?entry_source=telegram#draft=abc");
    expect(appendDraftFragment("https://x.test/a#draft=old", "new")).toBe("https://x.test/a#draft=new");
    expect(appendDraftFragment("https://x.test/a#section", "new")).toBe("https://x.test/a#draft=new");
    expect(appendDraftFragment("https://x.test/a", null)).toBe("https://x.test/a");
  });

  it("strips the draft and leaves other addresses alone", () => {
    expect(stripDraftFragment("https://x.test/a?b=1#draft=abc")).toBe("https://x.test/a?b=1");
    expect(stripDraftFragment("https://x.test/a#section")).toBe("https://x.test/a#section");
  });
});
