import { NextResponse } from "next/server";
import { generateMagicItemsPdfBytes } from "@/server/pdf/magicItemsPdf";

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
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Невалідний JSON" }, { status: 400 });
  }

  const magicItemIds = parseMagicItemIdsFromUnknown(body.magicItemIds);
  if (magicItemIds.length === 0) {
    return NextResponse.json({ error: "magicItemIds має бути непорожнім масивом" }, { status: 400 });
  }

  return generatePdfResponse(magicItemIds);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const magicItemIds = parseMagicItemIdsFromQuery(url);
  if (magicItemIds.length === 0) {
    return NextResponse.json({ error: "ids має бути непорожнім списком (через кому)" }, { status: 400 });
  }

  return generatePdfResponse(magicItemIds);
}

async function generatePdfResponse(magicItemIds: number[]) {
  try {
    const pdfBytes = await generateMagicItemsPdfBytes(magicItemIds);

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": "inline; filename=magic-items.pdf",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    console.error("PDF generation failed:", error);
    return NextResponse.json({ error: "Не вдалося згенерувати PDF" }, { status: 500 });
  }
}
