import { describe, expect, it } from "vitest";
import type { ErrorEvent } from "@sentry/nextjs";
import { stripDraftFromBreadcrumb, stripDraftFromEvent } from "./sentry-options";

describe("Sentry draft link privacy", () => {
  it("drops the carried draft from the request address and navigation breadcrumbs", () => {
    const event = {
      type: undefined,
      request: { url: "https://char.holota.family/char/create#draft=SECRET" },
      breadcrumbs: [{ category: "navigation", data: { from: "/char/create#draft=SECRET", to: "/char/create" } }],
    } as ErrorEvent;
    expect(JSON.stringify(stripDraftFromEvent(event))).not.toContain("draft=");
    expect(event.request?.url).toBe("https://char.holota.family/char/create");
  });

  it("cleans a fetch breadcrumb before it is stored", () => {
    expect(stripDraftFromBreadcrumb({ category: "fetch", data: { url: "/api/x#draft=SECRET", status_code: 200 } }).data).toEqual({ url: "/api/x", status_code: 200 });
  });
});
