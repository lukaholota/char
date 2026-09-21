"use server";

import crypto from "node:crypto";

import { getPersByShareToken, getPrintablePersByShareToken } from "@/lib/actions/share-actions";
import { generateCharacterPdfFromData } from "@/server/pdf/generateCharacterPdf";
import { groupCharacterFeaturesForPdf } from "@/server/pdf/groupCharacterFeatures";
import type { CharacterPdfData, PrintConfig } from "@/server/pdf/types";
import { createLogger } from "@/server/logging/logger";
import { diffUsage, formatBytes, takeUsageSnapshot } from "@/server/logging/perf";
import { countAttachedForms, findAttachedForms } from "@/server/db/wildshape";

export async function findPrintableWildshapeCountByTokenAction(token: string): Promise<number> {
  const { pers } = await getPersByShareToken(token);
  if (!pers) throw new Error("Not found");
  return countAttachedForms(pers.persId);
}

export async function generateCharacterPdfByTokenAction(token: string, config: PrintConfig) {
  const jobId = crypto.randomUUID();
  const log = createLogger("pdf.action.share").child({ jobId, tokenHash: token ? token.slice(0, 6) : undefined, sections: config?.sections });
  const start = takeUsageSnapshot();

  const { pers } = await getPrintablePersByShareToken(token);
  if (!pers) throw new Error("Not found");

  const features = groupCharacterFeaturesForPdf(pers);
  // The shared query omits relations that the PDF renderer never reads.
  const printablePers = pers as unknown as CharacterPdfData["pers"];
  const wildshapeForms = config.sections.includes("WILDSHAPES")
    ? (await findAttachedForms(pers.persId)).flatMap((form) =>
        form.creature ? [form.creature] : []
      )
    : [];

  log.info("start", { persId: pers.persId, name: pers.name });

  try {
    const pdfBytes = await generateCharacterPdfFromData(
      {
        pers: printablePers,
        features,
        wildshapeForms,
      },
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
