import crypto from "node:crypto";
import { NextResponse } from "next/server";

import { generateSpellsPdfBytes } from "@/server/pdf/spellsPdf";
import { findCatalogSpellIdsForKeys, PrintableSpellNotFoundError } from "@/server/db/print-content";
import { parseSpellPrintRequest, SpellPrintRequestError } from "@/server/pdf/spellPrintRequest";
import { toHomebrewCatalogId } from "@/lib/logic/homebrew-view";
import { createLogger } from "@/server/logging/logger";
import { diffUsage, formatBytes, takeUsageSnapshot } from "@/server/logging/perf";

type Body = {
  spellIds?: unknown;
};

function parseSpellIdsFromUnknown(value: unknown): number[] {
  if (!Array.isArray(value) || value.length === 0) return [];
  return value
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n))
    .map((n) => Math.trunc(n));
}

export async function POST(req: Request) {
  const jobId = crypto.randomUUID();
  const log = createLogger("api.print.spells").child({ jobId, method: "POST" });
  const start = takeUsageSnapshot();

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    const end = takeUsageSnapshot();
    log.warn("bad_json", { ...diffUsage(start, end) });
    return NextResponse.json({ error: "Невалідний JSON" }, { status: 400 });
  }

  const spellIds = parseSpellIdsFromUnknown(body.spellIds);
  if (spellIds.length === 0) {
    const end = takeUsageSnapshot();
    log.warn("bad_request", { ...diffUsage(start, end), reason: "empty_spellIds" });
    return NextResponse.json({ error: "spellIds має бути непорожнім масивом" }, { status: 400 });
  }

  return generatePdfResponse(spellIds, { jobId, start });
}

export async function GET(req: Request) {
  const jobId = crypto.randomUUID();
  const log = createLogger("api.print.spells").child({ jobId, method: "GET" });
  const start = takeUsageSnapshot();

  let spellIds: number[];
  try {
    spellIds = await findSpellIdsForQuery(new URL(req.url).searchParams);
  } catch (error) {
    const end = takeUsageSnapshot();
    if (error instanceof SpellPrintRequestError) {
      log.warn("bad_request", { ...diffUsage(start, end), reason: error.message });
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof PrintableSpellNotFoundError) {
      log.warn("not_found", { ...diffUsage(start, end), reason: error.message });
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }

  return generatePdfResponse(spellIds, { jobId, start });
}

async function findSpellIdsForQuery(searchParams: URLSearchParams): Promise<number[]> {
  const request = parseSpellPrintRequest(searchParams);
  const catalogIds = await findCatalogSpellIdsForKeys(request.catalogKeys, request.ruleset);
  return [...catalogIds, ...request.homebrewEntryIds.map(toHomebrewCatalogId)];
}

async function generatePdfResponse(spellIds: number[], ctx: { jobId: string; start: ReturnType<typeof takeUsageSnapshot> }) {
  const log = createLogger("api.print.spells").child({ jobId: ctx.jobId });
  log.info("start", { spellIdsCount: spellIds.length });

  try {
    const pdfBytes = await generateSpellsPdfBytes(spellIds, { jobId: ctx.jobId, tag: "api.spells" });
    const end = takeUsageSnapshot();
    log.info("end", {
      ...diffUsage(ctx.start, end),
      pdfBytes: pdfBytes.byteLength,
      pdfBytesFmt: formatBytes(pdfBytes.byteLength),
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": "inline; filename=spells.pdf",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    const end = takeUsageSnapshot();
    log.error("error", { ...diffUsage(ctx.start, end), err: error, spellIdsCount: spellIds.length });
    return NextResponse.json({ error: "Не вдалося згенерувати PDF" }, { status: 500 });
  }
}
