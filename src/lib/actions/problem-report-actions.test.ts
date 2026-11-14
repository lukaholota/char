import { beforeEach, describe, expect, it, vi } from "vitest";

const { findCurrentUserId, createProblemReport, storeScreenshotImage, notifyOwnerAboutProblemReport } = vi.hoisted(() => ({
  findCurrentUserId: vi.fn(),
  createProblemReport: vi.fn(),
  storeScreenshotImage: vi.fn(),
  notifyOwnerAboutProblemReport: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: async () => new Headers({ "user-agent": "Test", "x-forwarded-for": "1.2.3.4, 5.6.7.8" }) }));
vi.mock("next/server", () => ({ after: (task: () => unknown) => task() }));
vi.mock("@/server/db/current-user", () => ({ findCurrentUserId }));
vi.mock("@/server/db/problem-reports", () => ({ createProblemReport }));
vi.mock("@/server/media/image-upload", () => ({ storeScreenshotImage }));
vi.mock("@/server/notify/problem-report-telegram", () => ({ notifyOwnerAboutProblemReport }));

import { reportProblem, uploadProblemReportImage } from "./problem-report-actions";

const ATTACHMENT_URL = "https://media.char.holota.family/problem-reports/shot.webp";
const SIGN_IN_REQUIRED = "Увійдіть, щоб повідомити про проблему";

beforeEach(() => {
  vi.clearAllMocks();
  storeScreenshotImage.mockResolvedValue({ key: "problem-reports/shot" });
});

describe("репорт про проблему", () => {
  it("від користувача зберігається з його номером і вкладеннями та йде власнику", async () => {
    findCurrentUserId.mockResolvedValue(7);

    const result = await reportProblem({ message: "  Не відкривається лист  ", pagePath: "/char/7", attachmentUrls: [ATTACHMENT_URL] });

    expect(result).toEqual({ success: true });
    const record = expect.objectContaining({
      userId: 7,
      message: `Не відкривається лист\n\nВкладення:\n${ATTACHMENT_URL}`,
      pagePath: "/char/7",
      userAgent: "Test",
      ipAddress: "1.2.3.4",
    });
    expect(createProblemReport).toHaveBeenCalledWith(record);
    expect(notifyOwnerAboutProblemReport).toHaveBeenCalledWith(record);
  });

  it("від аноніма не зберігається й не турбує власника", async () => {
    findCurrentUserId.mockResolvedValue(null);

    const result = await reportProblem({ message: "Мёд", pagePath: "/" });

    expect(result).toEqual({ error: SIGN_IN_REQUIRED });
    expect(createProblemReport).not.toHaveBeenCalled();
    expect(notifyOwnerAboutProblemReport).not.toHaveBeenCalled();
  });

  it("порожній текст і чуже вкладення відхиляються", async () => {
    findCurrentUserId.mockResolvedValue(7);

    expect(await reportProblem({ message: "   ", pagePath: "/" })).toHaveProperty("error");
    expect(await reportProblem({ message: "Баг", pagePath: "/", attachmentUrls: ["https://evil.example/x.webp"] })).toHaveProperty("error");
    expect(createProblemReport).not.toHaveBeenCalled();
  });
});

describe("картинка до репорту", () => {
  it("від користувача потрапляє у сховище й повертає адресу", async () => {
    findCurrentUserId.mockResolvedValue(7);

    expect(await uploadProblemReportImage(new FormData())).toEqual({ success: true, url: ATTACHMENT_URL });
  });

  it("від аноніма у сховище не потрапляє", async () => {
    findCurrentUserId.mockResolvedValue(null);

    expect(await uploadProblemReportImage(new FormData())).toEqual({ success: false, error: SIGN_IN_REQUIRED });
    expect(storeScreenshotImage).not.toHaveBeenCalled();
  });
});
