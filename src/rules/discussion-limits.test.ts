import { describe, expect, it } from "vitest";
import { readReportInput } from "./discussion-limits";

describe("скарга на хоумбрю", () => {
  it("приймає відому причину й чистить пояснення", () => {
    expect(readReportInput({ reason: "COPYRIGHT", details: "  Текст із платної книги\r\n" })).toEqual({ reason: "COPYRIGHT", details: "Текст із платної книги" });
    expect(readReportInput({ reason: "SPAM", details: "" })).toEqual({ reason: "SPAM", details: null });
  });

  it("відмовляє без причини, без пояснення до «Інше» й на задовгому поясненні", () => {
    expect(readReportInput({ reason: "BORING", details: "" })).toEqual({ error: "Оберіть причину скарги" });
    expect(readReportInput({ reason: "OTHER", details: "   " })).toEqual({ error: "Поясніть, що не так" });
    expect(readReportInput({ reason: "SPAM", details: "а".repeat(1_001) })).toMatchObject({ error: expect.stringContaining("задовге") });
  });
});
