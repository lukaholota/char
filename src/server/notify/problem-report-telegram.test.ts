import { afterEach, describe, expect, it, vi } from "vitest";
import { buildProblemReportTelegramText, notifyOwnerAboutProblemReport } from "./problem-report-telegram";
import type { ProblemReportRecord } from "@/server/db/problem-reports";

function buildRecord(overrides: Partial<ProblemReportRecord> = {}): ProblemReportRecord {
  return {
    userId: 42,
    message: "Не відкривається лист",
    pagePath: "/char/7",
    pageUrl: "https://char.holota.family/char/7",
    referrer: null,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
    ipAddress: "1.2.3.4",
    viewportWidth: 390,
    viewportHeight: 844,
    screenWidth: 390,
    screenHeight: 844,
    language: "uk",
    timezone: "Europe/Kyiv",
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("текст репорту для Telegram", () => {
  it("несе повідомлення, сторінку, автора й екран", () => {
    const text = buildProblemReportTelegramText(buildRecord());

    expect(text).toContain("Не відкривається лист");
    expect(text).toContain("https://char.holota.family/char/7");
    expect(text).toContain("користувач #42");
    expect(text).toContain("390×844");
    expect(text).toContain("iPhone");
  });

  it("анонімний репорт без адреси сторінки показує шлях", () => {
    const text = buildProblemReportTelegramText(buildRecord({ userId: null, pageUrl: null }));

    expect(text).toContain("/char/7");
    expect(text).toContain("анонім");
  });

  it("не перевищує ліміту Telegram у 4096 символів", () => {
    const text = buildProblemReportTelegramText(buildRecord({ message: "а".repeat(5000) }));

    expect(text.length).toBeLessThanOrEqual(4096);
  });
});

describe("сповіщення власника", () => {
  it("шле sendMessage боту в чат власника", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "123:abc");
    vi.stubEnv("TELEGRAM_CHAT_ID", "555");
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await notifyOwnerAboutProblemReport(buildRecord());

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.telegram.org/bot123:abc/sendMessage");
    expect(JSON.parse(String(init.body))).toMatchObject({ chat_id: "555" });
  });

  it("без токена мовчить і нікуди не ходить", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await notifyOwnerAboutProblemReport(buildRecord());

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("падіння Telegram не кидає помилку в гравця", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "123:abc");
    vi.stubEnv("TELEGRAM_CHAT_ID", "555");
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down"); }));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(notifyOwnerAboutProblemReport(buildRecord())).resolves.toBeUndefined();
  });
});
