import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  // Both server and client use the build's version, including standalone Docker images.
  return NextResponse.json(
    { version: process.env.NEXT_PUBLIC_DEPLOYMENT_VERSION || null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
