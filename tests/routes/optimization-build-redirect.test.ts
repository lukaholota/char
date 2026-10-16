import { beforeEach, describe, expect, it, vi } from "vitest";

const headerStore = new Map<string, string>();
const redirectCalls: string[] = [];

vi.mock("next/headers", () => ({ headers: async () => ({ get: (name: string) => headerStore.get(name) ?? null }) }));
vi.mock("next/navigation", () => ({
  redirect: (href: string) => {
    redirectCalls.push(href);
    throw new Error("NEXT_REDIRECT");
  },
}));
vi.mock("@/lib/optimization/ready-preset.server", () => ({
  findReadyPresetSlugForBuild: async (buildId: string) => (buildId === "build-druid-dreams-githzerai-2014" ? "druid-dreams-githzerai-2014" : null),
}));

const { default: OptimizationBuildPage } = await import("@/app/optimization/build/page");

async function openBuildLink(params: { build?: string; from?: string }): Promise<string> {
  redirectCalls.length = 0;
  await expect(OptimizationBuildPage({ searchParams: Promise.resolve(params) })).rejects.toThrow("NEXT_REDIRECT");
  return redirectCalls[0];
}

beforeEach(() => headerStore.clear());

describe("old 2014 build links open the ready preset and keep where the player came from", () => {
  it("forwards the subclass analysis entry to the preset creator", async () => {
    expect(await openBuildLink({ build: "build-druid-dreams-githzerai-2014", from: "subclass_analysis" })).toBe("/char/create?preset=druid-dreams-githzerai-2014&from=subclass_analysis");
  });

  it("drops an unknown entry and opens the preset without one", async () => {
    expect(await openBuildLink({ build: "build-druid-dreams-githzerai-2014", from: "email" })).toBe("/char/create?preset=druid-dreams-githzerai-2014");
    expect(await openBuildLink({ build: "build-druid-dreams-githzerai-2014" })).toBe("/char/create?preset=druid-dreams-githzerai-2014");
  });

  it("sends an unknown build to the preset gallery", async () => {
    expect(await openBuildLink({ build: "build-missing", from: "subclass_analysis" })).toBe("/char/presets");
  });

  it("keeps the no-AI mode while forwarding the entry", async () => {
    headerStore.set("x-no-ai", "1");
    expect(await openBuildLink({ build: "build-druid-dreams-githzerai-2014", from: "subclass_analysis" })).toBe("/no-ai/char/create?preset=druid-dreams-githzerai-2014&from=subclass_analysis");
  });
});
