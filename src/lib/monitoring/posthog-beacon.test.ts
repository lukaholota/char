// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { sharedPostHogOptions } from "./posthog-options";

const originalBeacon = Object.getOwnPropertyDescriptor(navigator, "sendBeacon");

afterEach(() => {
  vi.restoreAllMocks();
  if (originalBeacon) Object.defineProperty(navigator, "sendBeacon", originalBeacon);
  else Reflect.deleteProperty(navigator, "sendBeacon");
});

it("the installed PostHog SDK sends our capture through sendBeacon without XMLHttpRequest", async () => {
  const beacon = vi.fn().mockReturnValue(true);
  Object.defineProperty(navigator, "sendBeacon", { configurable: true, value: beacon });
  const xhrSend = vi.spyOn(XMLHttpRequest.prototype, "send").mockImplementation(() => undefined);
  const { default: posthog } = await import("posthog-js");
  posthog.init("phc_test_transport", { ...sharedPostHogOptions, api_host: "https://posthog.invalid", advanced_disable_flags: true });
  xhrSend.mockClear();

  const captured = posthog.capture("analytics_transport_check", { source: "test" }, { transport: "sendBeacon", send_instantly: true });

  expect(captured?.event).toBe("analytics_transport_check");
  expect(beacon).toHaveBeenCalledTimes(1);
  expect(beacon.mock.calls[0][0]).toContain("posthog.invalid");
  expect(xhrSend).not.toHaveBeenCalled();
  expect(posthog.config.disable_compression).toBe(true);
});
