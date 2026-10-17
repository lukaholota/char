"use server";

import crypto from "node:crypto";

import { auth } from "@/lib/auth";
import { generateCharacterPdf } from "@/server/pdf/generateCharacterPdf";
import { findPdfJobErrorMessage, runPdfJob } from "@/server/pdf/pdfJobGate";
import type { PrintConfig } from "@/server/pdf/types";
import { createLogger, hashPII } from "@/server/logging/logger";
import { diffUsage, formatBytes, takeUsageSnapshot } from "@/server/logging/perf";
import { countAttachedForms } from "@/server/db/wildshape";
import { getPersById } from "@/lib/actions/pers";

export async function findPrintableWildshapeCountAction(persId: number): Promise<number> {
  const pers = await getPersById(persId);
  if (!pers) throw new Error("Not found");
  return countAttachedForms(persId);
}

export async function generateCharacterPdfAction(persId: number, config: PrintConfig) {
  const jobId = crypto.randomUUID();
  const log = createLogger("pdf.action").child({ jobId, persId, sections: config?.sections });
  const start = takeUsageSnapshot();

  const session = await auth();
  if (!session?.user?.email) throw new Error("Unauthorized");

  log.info("start", { user: { emailHash: hashPII(session.user.email) } });

  try {
    const email = session.user.email;
    const pdfBytes = await runPdfJob((signal) => generateCharacterPdf(persId, email, config, { jobId, signal }));

    const end = takeUsageSnapshot();
    log.info("end", { ...diffUsage(start, end), pdfBytes: pdfBytes.byteLength, pdfBytesFmt: formatBytes(pdfBytes.byteLength) });

    return {
      ok: true as const,
      contentType: "application/pdf",
      data: Buffer.from(pdfBytes).toString("base64"),
    };
  } catch (err) {
    const end = takeUsageSnapshot();
    log.error("error", { ...diffUsage(start, end), err });
    const message = findPdfJobErrorMessage(err);
    if (message) return { ok: false as const, error: message };
    throw err;
  }
}
