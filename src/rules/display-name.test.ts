import { describe, expect, it } from "vitest";
import { MAX_DISPLAY_NAME_LENGTH, readDisplayName } from "./display-name";

describe("нік гравця", () => {
  it("зайві пробіли стискаються, а порожній і задовгий нік не приймаються", () => {
    expect(readDisplayName("  Тінеблукач   з   Ітлі ")).toEqual({ displayName: "Тінеблукач з Ітлі" });
    expect(readDisplayName(" Т ")).toEqual({ error: "Нік закороткий: від 2 символів" });
    expect(readDisplayName("")).toEqual({ error: "Нік закороткий: від 2 символів" });
    expect(readDisplayName("я".repeat(MAX_DISPLAY_NAME_LENGTH + 1))).toEqual({ error: `Нік задовгий: до ${MAX_DISPLAY_NAME_LENGTH} символів` });
  });

  it("керівні символи не проходять", () => {
    expect(readDisplayName(`Тінь${String.fromCharCode(7)}блукач`)).toEqual({ error: "Нік містить недопустимі символи" });
  });
});
