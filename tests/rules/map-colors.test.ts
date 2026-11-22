import { describe, expect, it } from "vitest";
import { isLightColor, parseHexColor } from "@/rules/map-colors";

describe("parseHexColor", () => {
  it("keeps a full hex colour in lower case", () => {
    expect(parseHexColor("#A0b1C2")).toBe("#a0b1c2");
  });

  it.each([["a short hex", "#fff"], ["a name", "red"], ["no hash", "a0b1c2"], ["a number", 255], ["nothing", undefined]])("rejects %s", (_name, raw) => {
    expect(parseHexColor(raw)).toBeNull();
  });
});

describe("isLightColor", () => {
  it("tells light colours from dark ones", () => {
    expect(isLightColor("#ffffff")).toBe(true);
    expect(isLightColor("#facc15")).toBe(true);
    expect(isLightColor("#000000")).toBe(false);
    expect(isLightColor("#2563eb")).toBe(false);
  });
});
