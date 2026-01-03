"use server";

import crypto from "node:crypto";

import { auth } from "@/lib/auth";
import { generateCharacterPdf } from "@/server/pdf/generateCharacterPdf";
import type { PrintConfig } from "@/server/pdf/types";
import { createLogger, hashPII } from "@/server/logging/logger";
import { diffUsage, formatBytes, takeUsageSnapshot } from "@/server/logging/perf";

export async function generateCharacterPdfAction(persId: number, config: PrintConfig) {
  const jobId = crypto.randomUUID();
  const log = createLogger("pdf.action").child({ jobId, persId, sections: config?.sections });
  const start = takeUsageSnapshot();

  const session = await auth();
  if (!session?.user?.email) throw new Error("Unauthorized");

  log.info("start", { user: { emailHash: hashPII(session.user.email) } });

  try {
    const pdfBytes = await generateCharacterPdf(persId, session.user.email, config, { jobId });

    const end = takeUsageSnapshot();
    log.info("end", { ...diffUsage(start, end), pdfBytes: pdfBytes.byteLength, pdfBytesFmt: formatBytes(pdfBytes.byteLength) });

    return {
      contentType: "application/pdf",
      data: Buffer.from(pdfBytes).toString("base64"),
    };
  } catch (err) {
    const end = takeUsageSnapshot();
    log.error("error", { ...diffUsage(start, end), err });
    throw err;
  }
}
