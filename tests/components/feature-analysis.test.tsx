// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SessionContext } from "next-auth/react";
import { NoAiModeProvider } from "@/components/no-ai/NoAiModeProvider";
import { FeatureAnalysis } from "@/components/optimization/FeatureAnalysis";
import { SubclassAnalysis } from "@/components/optimization/SubclassAnalysis";
import { SubclassAnalysisContext, SubclassAnalysisProvider } from "@/components/optimization/SubclassAnalysisContext";
import { ReadingEntryList } from "@/components/catalogs/reading/ReadingEntryList";
import { readSliceArticle, readSlicePreview } from "@/lib/optimization/slice-reader";
import { findCharacterCreatorOptions } from "@/lib/content/creator-content";
import { SubclassInfoModal } from "@/lib/components/characterCreator/modals/SubclassInfoModal";

vi.mock("next/navigation", () => ({ usePathname: () => "/classes" }));
const entity = { ruleset: "RULES_2014", kind: "subclass", parentKey: "MONK_2014", entityKey: "WAY_OF_MERCY" } as const;
const owner = { data: { user: { email: "lukagolota1@gmail.com" }, expires: "2099-01-01T00:00:00Z" }, status: "authenticated" as const, update: vi.fn() };

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
// Each test links a whole RPGbot article (several seconds); under a full parallel run that crosses the default 15 s.
vi.setConfig({ testTimeout: 60_000 });

it("opens the full subclass analysis in an additional dialog and retains the official description", async () => {
  const { fetch } = await renderFeatureAnalysis("player@example.com", { guideHref: null });
  const button = await screen.findByRole("button", { name: "Читати повний аналіз" });
  const preview = (await readSlicePreview(entity))!;
  const document = (await readSliceArticle(preview.slug, entity.ruleset))!;
  fetch.mockImplementationOnce(async () => ({ ok: true, json: async () => document }));
  fireEvent.click(button);
  const dialog = await screen.findByRole("dialog");
  expect(dialog.textContent).toContain(document.article.titleUk);
  expect(dialog.textContent).not.toContain("Приватна чернетка");
  expect(screen.getByText("Офіційний текст")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Закрити", exact: true }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(screen.getByText("Офіційний текст")).toBeTruthy();
});

async function renderFeatureAnalysis(email = owner.data.user.email, previewChanges: { guideHref?: null } = {}) {
  const preview = { ...(await readSlicePreview(entity))!, ...previewChanges };
  const fetch = vi.fn(async () => ({ ok: true, json: async (): Promise<unknown> => preview }));
  vi.stubGlobal("fetch", fetch);
  const feature = preview.features[0];
  const view = render(<NoAiModeProvider><SessionContext.Provider value={{ ...owner, data: { ...owner.data, user: { email } } }}>
    <SubclassAnalysisProvider entity={entity}>
      <SubclassAnalysis entity={entity} placement="catalog" />
      <ReadingEntryList entries={[{ key: feature.binding.entity.entityKey, name: feature.name, engName: feature.engName, level: feature.level, description: "Офіційний текст" },
        { key: "missing-3", name: "Без прив’язки", engName: "Missing", level: 3, description: "Текст" }]} targetKey={null} focusRequest={0} is2024={false} isExpandedByDefault />
      <FeatureAnalysis name={feature.name} level={feature.level} />
    </SubclassAnalysisProvider>
  </SessionContext.Provider></NoAiModeProvider>);
  return { ...view, fetch, feature };
}

it("shows bound features beside the official description and opens the exact analysis in a separate dialog", async () => {
  const { fetch, feature } = await renderFeatureAnalysis();
  await waitFor(() => expect(screen.getAllByRole("button", { name: `Аналіз RPGbot: ${feature.name}` })).toHaveLength(2));
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("button", { name: "Аналіз RPGbot: Без прив’язки" })).toBeNull();
  const button = screen.getAllByRole("button", { name: `Аналіз RPGbot: ${feature.name}` })[0];
  fireEvent.click(button);
  await screen.findByRole("dialog");
  expect(screen.getByText("Офіційний текст")).toBeTruthy();
  expect(button.getAttribute("aria-haspopup")).toBe("dialog");
  expect(screen.getByRole("link", { name: "Відкрити в статті" }).getAttribute("href")).toBe(feature.href);
  expect(screen.getByRole("dialog").textContent).toMatch(/Аналіз поведінки й Медицина обидві/);
  fireEvent.click(screen.getByRole("button", { name: "Закрити", exact: true }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(screen.getByText("Офіційний текст")).toBeTruthy();
});

it("shows public 2014 analysis for a non-owner", async () => {
  const { fetch, feature } = await renderFeatureAnalysis("player@example.com");
  await screen.findAllByRole("button", { name: `Аналіз RPGbot: ${feature.name}` });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(screen.queryByText(/Приватна чернетка/)).toBeNull();
});

it("loads public 2014 without a session provider", async () => {
  const preview = (await readSlicePreview(entity))!;
  const fetch = vi.fn(async () => ({ ok: true, json: async (): Promise<unknown> => preview }));
  vi.stubGlobal("fetch", fetch);
  const feature = preview.features[0];
  render(<NoAiModeProvider><SubclassAnalysisProvider entity={entity} placement="catalog">
    <FeatureAnalysis name={feature.name} level={feature.level} />
  </SubclassAnalysisProvider></NoAiModeProvider>);
  await screen.findByRole("button", { name: `Аналіз RPGbot: ${feature.name}` });
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("does not request private 2024 analysis without a session", () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  render(<NoAiModeProvider><SubclassAnalysisProvider entity={{ ...entity, ruleset: "RULES_2024" }} placement="catalog">
    <FeatureAnalysis name="Риса" level={3} />
  </SubclassAnalysisProvider></NoAiModeProvider>);
  expect(fetch).not.toHaveBeenCalled();
  expect(screen.queryByRole("button")).toBeNull();
});

function stubFetchWithoutCatalogCard(preview: unknown) {
  const fetch = vi.fn(async (url: string) => url.startsWith("/api/reference-card")
    ? { ok: false, status: 404, json: async (): Promise<unknown> => null }
    : { ok: true, json: async (): Promise<unknown> => preview });
  vi.stubGlobal("fetch", fetch);
  return { countAnalysisRequests: () => fetch.mock.calls.filter(([url]) => !url.startsWith("/api/reference-card")).length };
}

it("loads creator analysis only when the subclass dialog opens and the catalog card is unavailable", async () => {
  const preview = (await readSlicePreview(entity))!;
  const { countAnalysisRequests } = stubFetchWithoutCatalogCard(preview);
  const subclass = findCharacterCreatorOptions("RULES_2014").classes.find((entry) => entry.name === "MONK_2014")!.subclasses.find((entry) => entry.name === "WAY_OF_MERCY")!;
  render(<NoAiModeProvider><SessionContext.Provider value={owner}>
    <SubclassInfoModal subclass={subclass} analysisEntity={entity} trigger={<button>Деталі</button>} />
  </SessionContext.Provider></NoAiModeProvider>);
  expect(countAnalysisRequests()).toBe(0);
  fireEvent.click(screen.getByRole("button", { name: "Деталі" }));
  await screen.findByRole("button", { name: `Аналіз RPGbot: ${preview.features[0].name}` });
  expect(countAnalysisRequests()).toBe(1);
  expect(screen.getAllByRole("button", { name: /^Аналіз RPGbot:/ })).toHaveLength(6);
});

it("requires the creator level and resets expansion when the feature binding changes", async () => {
  const preview = (await readSlicePreview(entity))!;
  const feature = preview.features[0];
  const renderBoundFeature = (level: number) => <NoAiModeProvider>
    <SubclassAnalysisContext.Provider value={{ canRead: true, error: "", preview }}>
      <FeatureAnalysis name={feature.name} level={level} />
    </SubclassAnalysisContext.Provider>
  </NoAiModeProvider>;
  const view = render(renderBoundFeature(feature.level + 1));
  expect(screen.queryByRole("button")).toBeNull();
  const findAnalysisButton = () => screen.getByRole("button", { name: `Аналіз RPGbot: ${feature.name}` });
  view.rerender(renderBoundFeature(feature.level));
  fireEvent.click(findAnalysisButton());
  expect(screen.getByRole("dialog")).toBeTruthy();
  feature.binding = { ...feature.binding, bindingId: "another-feature-binding" };
  view.rerender(renderBoundFeature(feature.level));
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("joins creator features by their shared native key when the Ukrainian display name differs", async () => {
  const preview = (await readSlicePreview(entity))!;
  stubFetchWithoutCatalogCard(preview);
  const nativeSubclass = findCharacterCreatorOptions("RULES_2014").classes.find((entry) => entry.name === "MONK_2014")!.subclasses.find((entry) => entry.name === "WAY_OF_MERCY")!;
  const subclass = structuredClone(nativeSubclass);
  const renamed = subclass.features[0].feature;
  renamed.name = "Уточнена українська назва";
  render(<NoAiModeProvider><SubclassInfoModal subclass={subclass} analysisEntity={entity} trigger={<button>Деталі</button>} /></NoAiModeProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Деталі" }));
  await screen.findByRole("button", { name: `Аналіз RPGbot: ${renamed.name}` });
  expect(screen.getAllByRole("button", { name: /^Аналіз RPGbot:/ })).toHaveLength(preview.features.length);
});

async function closeDialog() {
  fireEvent.click(screen.getByRole("button", { name: "Закрити", exact: true }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
}

it("returns focus to the full analysis button after the slow article request and a tap that never focused it", async () => {
  const { fetch } = await renderFeatureAnalysis("player@example.com", { guideHref: null });
  const button = await screen.findByRole("button", { name: "Читати повний аналіз" });
  const preview = (await readSlicePreview(entity))!;
  const document = (await readSliceArticle(preview.slug, entity.ruleset))!;
  fetch.mockImplementationOnce(() => new Promise((resolve) => setTimeout(() => resolve({ ok: true, json: async () => document }), 50)));
  fireEvent.click(button);
  expect(button.getAttribute("aria-disabled")).toBe("true");
  expect(button.hasAttribute("disabled")).toBe(false);
  await screen.findByRole("dialog");
  await closeDialog();
  await waitFor(() => expect(globalThis.document.activeElement).toBe(button));
  expect(button.getAttribute("aria-disabled")).toBe("false");
});

it("returns focus to the feature eye button after a tap that never focused it", async () => {
  const { feature } = await renderFeatureAnalysis();
  const [eye] = await screen.findAllByRole("button", { name: `Аналіз RPGbot: ${feature.name}` });
  fireEvent.click(eye);
  await screen.findByRole("dialog");
  await closeDialog();
  await waitFor(() => expect(globalThis.document.activeElement).toBe(eye));
});

it("does not start a second article request while the first one is loading", async () => {
  const { fetch } = await renderFeatureAnalysis("player@example.com", { guideHref: null });
  const button = await screen.findByRole("button", { name: "Читати повний аналіз" });
  fetch.mockImplementationOnce(() => new Promise(() => undefined));
  fireEvent.click(button);
  fireEvent.click(button);
  expect(fetch).toHaveBeenCalledTimes(2);
});
