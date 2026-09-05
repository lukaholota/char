import crypto from "node:crypto";
import { NextResponse } from "next/server";

import {
  CreaturePrintRequestError,
  parseCreaturePrintRequest,
} from "@/server/pdf/creaturePrintRequest";
import {
  generateCreaturesPdfBytes,
  loadPrintableCreatures,
  PrintableCreatureNotFoundError,
} from "@/server/pdf/creaturesPdf";
import { createLogger } from "@/server/logging/logger";
import { diffUsage, formatBytes, takeUsageSnapshot } from "@/server/logging/perf";

export async function GET(request: Request) {
  const jobId = crypto.randomUUID();
  const log = createLogger("api.print.bestiary").child({ jobId });
  const started = takeUsageSnapshot();
  const parsed = parseRequest(request);
  if (parsed instanceof NextResponse) return parsed;

  try {
    const creatures = loadPrintableCreatures(parsed.keys, parsed.ruleset);
    const pdfBytes = await generateCreaturesPdfBytes(creatures, { jobId, tag: "api.bestiary" });
    log.info("end", {
      ...diffUsage(started, takeUsageSnapshot()),
      creatureCount: creatures.length,
      pdfBytes: pdfBytes.byteLength,
      pdfBytesFmt: formatBytes(pdfBytes.byteLength),
    });
    return buildPdfResponse(pdfBytes);
  } catch (error) {
    if (error instanceof PrintableCreatureNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    log.error("error", { ...diffUsage(started, takeUsageSnapshot()), err: error });
    return NextResponse.json({ error: "Не вдалося згенерувати PDF" }, { status: 500 });
  }
}

function parseRequest(request: Request) {
  try {
    return parseCreaturePrintRequest(new URL(request.url).searchParams);
  } catch (error) {
    if (error instanceof CreaturePrintRequestError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}

function buildPdfResponse(pdfBytes: Uint8Array) {
  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": "inline; filename=bestiary.pdf",
      "cache-control": "no-store",
    },
  });
}
