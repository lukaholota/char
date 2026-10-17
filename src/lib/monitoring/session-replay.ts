import type { CapturedNetworkRequest, SessionRecordingOptions } from "posthog-js";

import { stripNoAiPrefix } from "@/lib/no-ai/no-ai-route";

const REPLAY_ROUTE = /^\/(?:char\/create|2024\/char|char\/presets|char\/\d+\/levelup)\/?$/;
const REPLAY_PRIVATE_PARAMS = new Set(["persName", "q", "ph_ctx", "code", "state", "token", "callbackUrl"]);
const SHARE_TOKEN_SEGMENT = /(\/share\/)[^/?#]+/g;

export const PRIVATE_TEXT_SELECTOR = "[data-ph-mask]";

export function isSessionReplayRoute(pathname: string): boolean {
  return REPLAY_ROUTE.test(stripNoAiPrefix(pathname));
}

export function maskReplayUrl(url: string): string {
  const [withoutHash] = url.split("#", 1);
  const queryStart = withoutHash.indexOf("?");
  const path = (queryStart === -1 ? withoutHash : withoutHash.slice(0, queryStart)).replace(SHARE_TOKEN_SEGMENT, "$1[token]");
  if (queryStart === -1) return path;
  const keptParams = withoutHash.slice(queryStart + 1).split("&").filter((pair) => pair && !REPLAY_PRIVATE_PARAMS.has(pair.split("=", 1)[0]));
  return keptParams.length ? `${path}?${keptParams.join("&")}` : path;
}

function maskReplayNetworkRequest(request: CapturedNetworkRequest): CapturedNetworkRequest {
  return { ...request, name: maskReplayUrl(request.name), requestHeaders: undefined, requestBody: undefined, responseHeaders: undefined, responseBody: undefined };
}

function maskReplayAttribute(name: string, value: string): string {
  return name === "href" ? maskReplayUrl(value) : value;
}

export const sessionReplayOptions: SessionRecordingOptions = {
  maskAllInputs: true,
  maskTextSelector: PRIVATE_TEXT_SELECTOR,
  maskAttributeFn: maskReplayAttribute,
  maskCapturedNetworkRequestFn: maskReplayNetworkRequest,
  recordHeaders: false,
  recordBody: false,
};
