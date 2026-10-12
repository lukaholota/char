import { afterEach, expect, it, vi } from "vitest";
import { GET } from "@/app/api/version/route";
import { buildStaticAssetHeaders } from "@/lib/assets/cache-policy";

afterEach(() => vi.unstubAllEnvs());
it("serves the compiled deployment version without caching", async () => {
  vi.stubEnv("NEXT_PUBLIC_DEPLOYMENT_VERSION", "deployment-B");
  const response = GET();
  expect(await response.json()).toEqual({ version: "deployment-B" });
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(buildStaticAssetHeaders().find(({ source }) => source === "/sw.js")?.headers).toEqual([{ key: "Cache-Control", value: "no-cache" }]);
});
it("does not invent a deployment version for an unversioned local build", async () => {
  vi.stubEnv("NEXT_PUBLIC_DEPLOYMENT_VERSION", "");
  expect(await GET().json()).toEqual({ version: null });
});
