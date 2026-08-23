import { NextRequest, NextResponse } from "next/server";

import { NO_AI_REQUEST_HEADER, hasNoAiPrefix, stripNoAiPrefix } from "@/lib/no-ai/no-ai-route";

export function middleware(request: NextRequest) {
  if (!hasNoAiPrefix(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const target = request.nextUrl.clone();
  target.pathname = stripNoAiPrefix(request.nextUrl.pathname);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(NO_AI_REQUEST_HEADER, "1");

  const response = NextResponse.rewrite(target, { request: { headers: requestHeaders } });
  // `/no-ai/…` duplicates every public URL; only the canonical one belongs in the index.
  response.headers.set("x-robots-tag", "noindex, follow");

  return response;
}

export const config = {
  matcher: ["/no-ai", "/no-ai/:path*"],
};
