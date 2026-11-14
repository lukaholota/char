import { describe, expect, it } from "vitest";
import { buildFullSizeMediaUrl, buildMediaImageUrl } from "./media-url";

describe("buildFullSizeMediaUrl", () => {
  it("turns a thumbnail url into the full-size one", () => {
    expect(buildFullSizeMediaUrl(buildMediaImageUrl("portraits/7", "thumbnail"))).toBe(buildMediaImageUrl("portraits/7", "full"));
  });

  it("keeps a full-size url as is", () => {
    const fullSize = buildMediaImageUrl("portraits/7-96x", "full");
    expect(buildFullSizeMediaUrl(fullSize)).toBe(fullSize);
  });
});
