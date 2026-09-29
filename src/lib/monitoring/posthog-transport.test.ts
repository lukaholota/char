// @vitest-environment jsdom
import { afterEach, beforeAll, expect, it, vi } from "vitest";
import type { PostHog } from "posthog-js";
import { sharedPostHogOptions } from "./posthog-options";

const fetchMock = vi.fn((_url: RequestInfo | URL, _init?: RequestInit) => Promise.resolve(new Response("{}", { status: 200 })));
const beacon = vi.fn().mockReturnValue(true);
let posthog: PostHog;

beforeAll(async () => {
  vi.stubGlobal("fetch", fetchMock);
  Object.defineProperty(navigator, "sendBeacon", { configurable: true, value: beacon });
  ({ default: posthog } = await import("posthog-js"));
  posthog.init("phc_test_transport", { ...sharedPostHogOptions, api_host: "https://posthog.invalid", advanced_disable_flags: true });
});

afterEach(() => {
  fetchMock.mockClear();
  beacon.mockClear();
});

function findCaptureRequests() {
  return fetchMock.mock.calls.filter(([url]) => String(url).includes("posthog.invalid/e/"));
}

it("sends our event right away as an async keepalive fetch, not a beacon", () => {
  posthog.capture("analytics_transport_check", { source: "test" }, { send_instantly: true });

  const requests = findCaptureRequests();
  expect(requests).toHaveLength(1);
  expect(requests[0][1]).toMatchObject({ method: "POST", keepalive: true });
  expect(beacon).not.toHaveBeenCalled();
});

it("never uses sendBeacon, even when a capture asks for it", () => {
  posthog.capture("analytics_transport_check", { source: "test" }, { transport: "sendBeacon", send_instantly: true });

  expect(beacon).not.toHaveBeenCalled();
  expect(findCaptureRequests()).toHaveLength(1);
});
