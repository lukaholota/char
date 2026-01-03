import crypto from "node:crypto";
import { NextResponse } from "next/server";

import { generateSpellsPdfBytes } from "@/server/pdf/spellsPdf";
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

function parseSpellIdsFromQuery(url: URL): number[] {
  const raw = url.searchParams.get("ids") ?? url.searchParams.get("spellIds") ?? "";
  if (!raw.trim()) return [];
  return raw
    .split(",")
    .map((v) => Number(v.trim()))
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

  const url = new URL(req.url);
  const spellIds = parseSpellIdsFromQuery(url);
  if (spellIds.length === 0) {
    const end = takeUsageSnapshot();
    log.warn("bad_request", { ...diffUsage(start, end), reason: "empty_query_ids" });
    return NextResponse.json({ error: "ids має бути непорожнім списком (через кому)" }, { status: 400 });
  }

  return generatePdfResponse(spellIds, { jobId, start });
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
