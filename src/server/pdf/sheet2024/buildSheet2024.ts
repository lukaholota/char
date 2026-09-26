import type { PDFDocument, PDFFont } from "pdf-lib";

import type { createLogger } from "@/server/logging/logger";

import { loadPortraitJpeg } from "../portraitPrint";
import type { CharacterPdfData, PrintConfig } from "../types";
import { SHEET_2024_TEMPLATE_FILE } from "./layout";
import { renderSheet2024 } from "./render";
import { buildSheet2024Content } from "./values";

type Logger = ReturnType<typeof createLogger>;

export function isSheet2024Requested(pers: Pick<CharacterPdfData["pers"], "ruleset">, config: PrintConfig): boolean {
  return config.sheetLayout === "SHEET_2024" && pers.ruleset === "RULES_2024";
}

export async function buildSheet2024Document(data: CharacterPdfData, config: PrintConfig, log: Logger): Promise<{ pdfDoc: PDFDocument; font: PDFFont }> {
  const includeDetails = config.sections.includes("DETAILS");
  const [templateBytes, regularFontBytes, boldFontBytes, portraitJpeg] = await Promise.all([
    readPublicFile(SHEET_2024_TEMPLATE_FILE),
    readPublicFile("fonts/NotoSans-Regular.ttf"),
    readPublicFile("fonts/NotoSans-Bold.ttf"),
    includeDetails ? loadPortraitJpeg(data.pers.portraitKey, log) : null,
  ]);
  return renderSheet2024(buildSheet2024Content(data), {
    includeCharacter: config.sections.includes("CHARACTER"),
    includeDetails,
    flatten: config.flattenCharacterSheet ?? true,
    templateBytes,
    regularFontBytes,
    boldFontBytes,
    portraitJpeg,
  });
}

async function readPublicFile(relativePath: string): Promise<Uint8Array> {
  const fs = await import("fs/promises");
  const path = await import("path");
  return fs.readFile(path.resolve(process.cwd(), "public", relativePath));
}
