import { prisma } from "@/lib/prisma";

export type ProblemReportRecord = {
  userId: number | null;
  message: string;
  pagePath: string;
  pageUrl: string | null;
  referrer: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  viewportWidth: number | null;
  viewportHeight: number | null;
  screenWidth: number | null;
  screenHeight: number | null;
  language: string | null;
  timezone: string | null;
};

export async function createProblemReport(record: ProblemReportRecord) {
  await prisma.problem_report.create({
    data: {
      user_id: record.userId,
      message: record.message,
      page_path: record.pagePath,
      page_url: record.pageUrl,
      referrer: record.referrer,
      user_agent: record.userAgent,
      ip_address: record.ipAddress,
      viewport_width: record.viewportWidth,
      viewport_height: record.viewportHeight,
      screen_width: record.screenWidth,
      screen_height: record.screenHeight,
      language: record.language,
      timezone: record.timezone,
    },
  });
}
