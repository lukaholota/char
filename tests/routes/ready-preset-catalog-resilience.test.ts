import { expect, it, vi } from "vitest";
import { listReadyPresetSlugs } from "@/lib/optimization/ready-preset-files";
import { loadReadyPresetCatalog } from "@/lib/optimization/ready-preset.server";

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/current-user", () => ({ isCurrentUserSiteOwner: vi.fn().mockResolvedValue(false) }));
vi.mock("@/lib/optimization/ready-preset-files", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/optimization/ready-preset-files")>();
  return { ...original, readReadyPreset: async (slug: string) => {
    if (slug === "monk-shadow-2014") throw new Error("broken preset file");
    return original.readReadyPreset(slug);
  } };
});

it("keeps the gallery open when one preset cannot be read", async () => {
  const slugs = await listReadyPresetSlugs();
  const catalog = await loadReadyPresetCatalog();
  expect(catalog.map((entry) => entry.slug)).not.toContain("monk-shadow-2014");
  expect(catalog).toHaveLength(slugs.length - 1);
}, 120_000);
