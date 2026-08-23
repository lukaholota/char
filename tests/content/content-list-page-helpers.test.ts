import { describe, it, expect } from "vitest";
import {
  getParamSet,
  setParamSet,
  getBoolParam,
  setBoolParam,
} from "@/lib/catalog-url-helpers";

describe("KR8.1 — Catalog URL Helpers & State", () => {
  describe("getParamSet & setParamSet", () => {
    it("parses comma-separated values into a Set", () => {
      const params = new URLSearchParams("cat=ORIGIN,GENERAL&empty=&white= a , b ");
      expect(Array.from(getParamSet(params, "cat"))).toEqual(["ORIGIN", "GENERAL"]);
      expect(Array.from(getParamSet(params, "white"))).toEqual(["a", "b"]);
      expect(Array.from(getParamSet(params, "empty"))).toEqual([]);
      expect(Array.from(getParamSet(params, "missing"))).toEqual([]);
    });

    it("sets comma-separated values or deletes if empty", () => {
      const params = new URLSearchParams();
      setParamSet(params, "cat", new Set(["ORIGIN", "EPIC_BOON"]));
      expect(params.get("cat")).toBe("ORIGIN,EPIC_BOON");

      setParamSet(params, "cat", new Set());
      expect(params.has("cat")).toBe(false);
    });
  });

  describe("getBoolParam & setBoolParam", () => {
    it("parses 1/0 or true/false into boolean or null", () => {
      const params = new URLSearchParams("a=1&b=0&c=true&d=false&e=invalid");
      expect(getBoolParam(params, "a")).toBe(true);
      expect(getBoolParam(params, "b")).toBe(false);
      expect(getBoolParam(params, "c")).toBe(true);
      expect(getBoolParam(params, "d")).toBe(false);
      expect(getBoolParam(params, "e")).toBe(null);
      expect(getBoolParam(params, "missing")).toBe(null);
    });

    it("sets 1/0 or deletes if null", () => {
      const params = new URLSearchParams();
      setBoolParam(params, "attn", true);
      expect(params.get("attn")).toBe("1");

      setBoolParam(params, "attn", false);
      expect(params.get("attn")).toBe("0");

      setBoolParam(params, "attn", null);
      expect(params.has("attn")).toBe(false);
    });
  });
});
