// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FeatCatalogTab } from "@/lib/components/characterSheet/feats/FeatCatalogTab";
import type { FeatData } from "@/lib/featsData";

afterEach(cleanup);

const feat = (category: FeatData["category"]): FeatData => ({
  featId: 1,
  name: "Риса",
  engName: "Feat",
  source: "PHB",
  description: "Опис",
  shortDescription: "Опис",
  category,
  isRepeatable: false,
  prerequisite: null,
  benefits: [],
  ruleset: category ? "RULES_2024" : "RULES_2014",
});

describe("категорії каталогу рис", () => {
  it("не показує категорії 2024 для рис 2014 без категорій", () => {
    render(<FeatCatalogTab availableFeats={[feat(null)]} acquiredFeatIds={new Set()} isSubmitting={null} onAddFeat={() => {}} onOpenDetail={() => {}} />);
    expect(screen.queryByRole("button", { name: "Походження" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Епічні" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Бойові стилі" })).toBeNull();
  });

  it("показує тільки категорії, які є в поточному каталозі", () => {
    render(<FeatCatalogTab availableFeats={[feat("ORIGIN")]} acquiredFeatIds={new Set()} isSubmitting={null} onAddFeat={() => {}} onOpenDetail={() => {}} />);
    expect(screen.getByRole("button", { name: "Походження" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Епічні" })).toBeNull();
  });

  it("скидає фільтр категорії, коли каталог перемикається на 2014", () => {
    const props = { acquiredFeatIds: new Set<number>(), isSubmitting: null, onAddFeat: () => {}, onOpenDetail: () => {} };
    const view = render(<FeatCatalogTab {...props} availableFeats={[feat("ORIGIN")]} />);
    fireEvent.click(screen.getByRole("button", { name: "Походження" }));
    view.rerender(<FeatCatalogTab {...props} availableFeats={[feat(null)]} />);
    expect(screen.getByText("Риса")).toBeTruthy();
  });
});
