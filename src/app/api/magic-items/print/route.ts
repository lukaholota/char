import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { generateMagicItemsPdfBytes } from "@/server/pdf/magicItemsPdf";
import { createLogger } from "@/server/logging/logger";
import { diffUsage, formatBytes, takeUsageSnapshot } from "@/server/logging/perf";

type Body = {
  magicItemIds?: unknown;
};

function parseMagicItemIdsFromUnknown(value: unknown): number[] {
  if (!Array.isArray(value) || value.length === 0) return [];
  return value
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n))
    .map((n) => Math.trunc(n));
}

function parseMagicItemIdsFromQuery(url: URL): number[] {
  const raw = url.searchParams.get("ids") ?? url.searchParams.get("magicItemIds") ?? "";
  if (!raw.trim()) return [];
  return raw
    .split(",")
    .map((v) => Number(v.trim()))
    .filter((n) => Number.isFinite(n))
    .map((n) => Math.trunc(n));
}

export async function POST(req: Request) {
  const jobId = crypto.randomUUID();
  const log = createLogger("api.print.magicItems").child({ jobId, method: "POST" });
  const start = takeUsageSnapshot();

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    const end = takeUsageSnapshot();
    log.warn("bad_json", { ...diffUsage(start, end) });
    return NextResponse.json({ error: "Невалідний JSON" }, { status: 400 });
  }

  const magicItemIds = parseMagicItemIdsFromUnknown(body.magicItemIds);
  if (magicItemIds.length === 0) {
    const end = takeUsageSnapshot();
    log.warn("bad_request", { ...diffUsage(start, end), reason: "empty_magicItemIds" });
    return NextResponse.json({ error: "magicItemIds має бути непорожнім масивом" }, { status: 400 });
  }

  return generatePdfResponse(magicItemIds, { jobId, start });
}

export async function GET(req: Request) {
  const jobId = crypto.randomUUID();
  const log = createLogger("api.print.magicItems").child({ jobId, method: "GET" });
  const start = takeUsageSnapshot();

  const url = new URL(req.url);
  const magicItemIds = parseMagicItemIdsFromQuery(url);
  if (magicItemIds.length === 0) {
    const end = takeUsageSnapshot();
    log.warn("bad_request", { ...diffUsage(start, end), reason: "empty_query_ids" });
    return NextResponse.json({ error: "ids має бути непорожнім списком (через кому)" }, { status: 400 });
  }

  return generatePdfResponse(magicItemIds, { jobId, start });
}

async function generatePdfResponse(magicItemIds: number[], ctx: { jobId: string; start: ReturnType<typeof takeUsageSnapshot> }) {
  const log = createLogger("api.print.magicItems").child({ jobId: ctx.jobId });
  log.info("start", { magicItemIdsCount: magicItemIds.length });

  try {
    const pdfBytes = await generateMagicItemsPdfBytes(magicItemIds, { jobId: ctx.jobId, tag: "api.magicItems" });
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
        "content-disposition": "inline; filename=magic-items.pdf",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    const end = takeUsageSnapshot();
    log.error("error", { ...diffUsage(ctx.start, end), err: error, magicItemIdsCount: magicItemIds.length });
    return NextResponse.json({ error: "Не вдалося згенерувати PDF" }, { status: 500 });
  }
}
