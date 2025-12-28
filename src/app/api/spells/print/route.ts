import { NextResponse } from "next/server";

import { generateSpellsPdfBytes } from "@/server/pdf/spellsPdf";

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
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Невалідний JSON" }, { status: 400 });
  }

  const spellIds = parseSpellIdsFromUnknown(body.spellIds);
  if (spellIds.length === 0) {
    return NextResponse.json({ error: "spellIds має бути непорожнім масивом" }, { status: 400 });
  }

  return generatePdfResponse(spellIds);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const spellIds = parseSpellIdsFromQuery(url);
  if (spellIds.length === 0) {
    return NextResponse.json({ error: "ids має бути непорожнім списком (через кому)" }, { status: 400 });
  }

  return generatePdfResponse(spellIds);
}

async function generatePdfResponse(spellIds: number[]) {
  try {
    const pdfBytes = await generateSpellsPdfBytes(spellIds);

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": "inline; filename=spells.pdf",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    console.error("PDF generation failed:", error);
    return NextResponse.json({ error: "Не вдалося згенерувати PDF" }, { status: 500 });
  }
}
