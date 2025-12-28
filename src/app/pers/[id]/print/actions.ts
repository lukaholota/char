"use server";

import { auth } from "@/lib/auth";
import { generateCharacterPdf } from "@/server/pdf/generateCharacterPdf";
import type { PrintConfig } from "@/server/pdf/types";

export async function generateCharacterPdfAction(persId: number, config: PrintConfig) {
  const session = await auth();
  if (!session?.user?.email) throw new Error("Unauthorized");

  const pdfBytes = await generateCharacterPdf(persId, session.user.email, config);

  return {
    contentType: "application/pdf",
    data: Buffer.from(pdfBytes).toString("base64"),
  };
}
