import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { NO_AI_REQUEST_HEADER, buildHrefForNoAiMode } from "./no-ai-route";

/**
 * Middleware rewrites `/no-ai/…` to the canonical route, so a server component sees the stripped
 * pathname and can only learn the mode from the header the rewrite carries.
 */
export async function isNoAiRequest(): Promise<boolean> {
  return (await headers()).get(NO_AI_REQUEST_HEADER) === "1";
}

export async function redirectKeepingNoAiMode(href: string): Promise<never> {
  redirect(buildHrefForNoAiMode(href, await isNoAiRequest()));
}
