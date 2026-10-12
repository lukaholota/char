import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ owner: false, readSlicePreview: vi.fn(), readHydratedSliceArticle: vi.fn() }));
vi.mock("@/server/db/current-user", () => ({ isCurrentUserSiteOwner: async () => mocks.owner }));
vi.mock("@/lib/optimization/slice-reader", () => ({ readSlicePreview: mocks.readSlicePreview, readHydratedSliceArticle: mocks.readHydratedSliceArticle }));
import { GET } from "@/app/api/optimization/route";

beforeEach(() => { mocks.owner = false; vi.clearAllMocks(); });
const url = "http://localhost/api/optimization?view=preview&ruleset=RULES_2014&classKey=MONK_2014&subclassKey=WAY_OF_MERCY";

it("denies 2024 preview before reading private feature content", async () => {
  expect((await GET(new Request(url.replace("RULES_2014", "RULES_2024")))).status).toBe(404);
  expect(mocks.readSlicePreview).not.toHaveBeenCalled();
});

it("allows an anonymous reader to open public 2014 feature analysis", async () => {
  mocks.readSlicePreview.mockResolvedValue({ features: [{ name: "Риса" }] });
  const response = await GET(new Request(url));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ features: [{ name: "Риса" }] });
});

it("allows public 2014 article content and protects private 2024 articles", async () => {
  const articleUrl = "http://localhost/api/optimization?view=article&ruleset=RULES_2014&slug=missing";
  mocks.readHydratedSliceArticle.mockResolvedValue(null);
  expect((await GET(new Request(articleUrl))).status).toBe(200);
  expect(mocks.readHydratedSliceArticle).toHaveBeenCalledWith("missing", "RULES_2014");
  mocks.readHydratedSliceArticle.mockClear();
  expect((await GET(new Request(articleUrl.replace("RULES_2014", "RULES_2024")))).status).toBe(404);
  expect(mocks.readHydratedSliceArticle).not.toHaveBeenCalled();
});

it("does not read content for malformed public queries", async () => {
  expect((await GET(new Request(url.replace("WAY_OF_MERCY", "invalid/key")))).status).toBe(404);
  expect(mocks.readSlicePreview).not.toHaveBeenCalled();
});

it("returns the owner's subclass feature payload without caching", async () => {
  mocks.owner = true;
  mocks.readSlicePreview.mockResolvedValue({ features: [{ name: "Риса" }] });
  const response = await GET(new Request(url));
  expect(await response.json()).toEqual({ features: [{ name: "Риса" }] });
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(mocks.readSlicePreview).toHaveBeenCalledWith({ ruleset: "RULES_2014", kind: "subclass", parentKey: "MONK_2014", entityKey: "WAY_OF_MERCY" });
});

it("still allows the owner to read 2024 analysis", async () => {
  mocks.owner = true;
  mocks.readSlicePreview.mockResolvedValue({ features: [] });
  const response = await GET(new Request(url.replace("RULES_2014", "RULES_2024")));
  expect(response.status).toBe(200);
  expect(mocks.readSlicePreview).toHaveBeenCalledWith({ ruleset: "RULES_2024", kind: "subclass", parentKey: "MONK_2014", entityKey: "WAY_OF_MERCY" });
});
