"use server";

import crypto from "node:crypto";

import { getPersByShareToken } from "@/lib/actions/share-actions";
import { generateCharacterPdfFromData } from "@/server/pdf/generateCharacterPdf";
import { groupCharacterFeaturesForPdf } from "@/server/pdf/groupCharacterFeatures";
import type { PrintConfig } from "@/server/pdf/types";
import { createLogger } from "@/server/logging/logger";
import { diffUsage, formatBytes, takeUsageSnapshot } from "@/server/logging/perf";

export async function generateCharacterPdfByTokenAction(token: string, config: PrintConfig) {
  const jobId = crypto.randomUUID();
  const log = createLogger("pdf.action.share").child({ jobId, tokenHash: token ? token.slice(0, 6) : undefined, sections: config?.sections });
  const start = takeUsageSnapshot();

  const pers = await getPersByShareToken(token);
  if (!pers) throw new Error("Not found");

  const features = groupCharacterFeaturesForPdf(pers as any);

  log.info("start", { persId: (pers as any)?.persId, name: (pers as any)?.name });

  try {
    const pdfBytes = await generateCharacterPdfFromData(
      {
        pers: pers as any,
        features,
        spellsByLevel: {},
      } as any,
      config,
      { jobId }
    );

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
