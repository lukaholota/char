"use server";

import { headers } from "next/headers";
import { findCurrentUserId } from "@/server/db/current-user";
import { createProblemReport, type ProblemReportRecord } from "@/server/db/problem-reports";

const MESSAGE_MAX_LENGTH = 4000;

export type ReportProblemInput = {
  message: string;
  pagePath: string;
  pageUrl?: string;
  viewportWidth?: number;
  viewportHeight?: number;
  screenWidth?: number;
  screenHeight?: number;
  language?: string;
  timezone?: string;
};

export async function reportProblem(input: ReportProblemInput) {
  const message = input.message.trim();
  if (!message) return { error: "Опишіть проблему перед надсиланням" };
  if (message.length > MESSAGE_MAX_LENGTH) return { error: "Повідомлення завелике" };

  const [userId, requestHeaders] = await Promise.all([findCurrentUserId(), headers()]);

  try {
    await createProblemReport(buildProblemReportRecord(input, message, userId, requestHeaders));
    return { success: true } as const;
  } catch (error) {
    console.error("Problem report submission failed:", error);
    return { error: "Не вдалося надіслати повідомлення" };
  }
}

function buildProblemReportRecord(
  input: ReportProblemInput,
  message: string,
  userId: number | null,
  requestHeaders: Headers
): ProblemReportRecord {
  return {
    userId,
    message,
    pagePath: input.pagePath,
    pageUrl: input.pageUrl ?? null,
    referrer: requestHeaders.get("referer"),
    userAgent: requestHeaders.get("user-agent"),
    ipAddress: findClientIp(requestHeaders),
    viewportWidth: input.viewportWidth ?? null,
    viewportHeight: input.viewportHeight ?? null,
    screenWidth: input.screenWidth ?? null,
    screenHeight: input.screenHeight ?? null,
    language: input.language ?? null,
    timezone: input.timezone ?? null,
  };
}

function findClientIp(requestHeaders: Headers): string | null {
  const forwardedFor = requestHeaders.get("x-forwarded-for");
  return forwardedFor ? forwardedFor.split(",")[0].trim() : requestHeaders.get("x-real-ip");
}
