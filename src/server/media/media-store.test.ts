import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { putMediaObject } from "./media-store";

let sentRequest: Request | undefined;

beforeEach(() => {
  sentRequest = undefined;
  vi.stubEnv("R2_MEDIA_ACCOUNT_ID", "account");
  vi.stubEnv("R2_MEDIA_ACCESS_KEY_ID", "access-key");
  vi.stubEnv("R2_MEDIA_SECRET_ACCESS_KEY", "secret-key");
  vi.stubEnv("R2_MEDIA_BUCKET", "bucket");
  vi.stubGlobal("fetch", vi.fn(async (request: Request) => {
    sentRequest = request;
    return new Response(null, { status: 200 });
  }));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("R2 media store", () => {
  it("передає точний Content-Length для PUT", async () => {
    const body = new Uint8Array([1, 2, 3, 4]);

    await putMediaObject("portraits/1/image.webp", body, "image/webp");

    expect(sentRequest?.headers.get("content-length")).toBe(String(body.byteLength));
  });
});
