"use server";

import { getPersByShareToken } from "@/lib/actions/share-actions";
import { generateCharacterPdfFromData } from "@/server/pdf/generateCharacterPdf";
import { groupCharacterFeaturesForPdf } from "@/server/pdf/groupCharacterFeatures";
import type { PrintConfig } from "@/server/pdf/types";

export async function generateCharacterPdfByTokenAction(token: string, config: PrintConfig) {
  const pers = await getPersByShareToken(token);
  if (!pers) throw new Error("Not found");

  const features = groupCharacterFeaturesForPdf(pers as any);

  const pdfBytes = await generateCharacterPdfFromData(
    {
      pers: pers as any,
      features,
      spellsByLevel: {},
    } as any,
    config
  );

  return {
    contentType: "application/pdf",
    data: Buffer.from(pdfBytes).toString("base64"),
  };
}
