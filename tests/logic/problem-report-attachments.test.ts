import { describe, expect, it } from "vitest";
import { appendAttachmentsToMessage, isProblemReportAttachmentUrl } from "@/lib/problem-report-attachments";

describe("вкладення до звіту про проблему", () => {
  it("приймає лише адреси з теки звітів у нашому сховищі", () => {
    expect(isProblemReportAttachmentUrl("https://media.char.holota.family/problem-reports/abc.webp")).toBe(true);
    expect(isProblemReportAttachmentUrl("https://media.char.holota.family/portraits/1/abc.webp")).toBe(false);
    expect(isProblemReportAttachmentUrl("https://evil.example/problem-reports/abc.webp")).toBe(false);
    expect(isProblemReportAttachmentUrl("https://media.char.holota.family/problem-reports/a b.webp")).toBe(false);
  });

  it("дописує адреси окремим блоком у кінець повідомлення", () => {
    expect(appendAttachmentsToMessage("Зламалось", [])).toBe("Зламалось");
    expect(appendAttachmentsToMessage("Зламалось", ["https://m/problem-reports/a.webp", "https://m/problem-reports/b.webp"])).toBe(
      "Зламалось\n\nВкладення:\nhttps://m/problem-reports/a.webp\nhttps://m/problem-reports/b.webp",
    );
  });
});
