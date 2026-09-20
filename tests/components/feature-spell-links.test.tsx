// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FeatureDisplayType } from "@prisma/client";
import type { CharacterFeatureItem, CharacterFeaturesGroupedResult, PersWithRelations } from "@/lib/actions/pers";

/// Р38: лічильник риси стоїть у «Ресурсах класу», і з його картки гравець має дійти до самого
/// заклинання — модалка риси інакше глухий кут.

const openSpellLink = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }), useParams: () => ({}) }));
vi.mock("@/lib/actions/feature-uses", () => ({ spendFeatureUse: vi.fn(), restoreFeatureUse: vi.fn() }));
vi.mock("@/lib/actions/feature-descriptions", () => ({ saveFeatureDescription: vi.fn() }));
vi.mock("@/lib/actions/subclass-option-rechoice", () => ({ loadSubclassOptionRechoice: vi.fn(), saveSubclassOptionRechoice: vi.fn() }));
vi.mock("@/lib/actions/bastion-actions", () => ({ loadBastion: vi.fn() }));
vi.mock("@/lib/components/characterSheet/FeatsSheetManagerModal", () => ({ FeatsSheetManagerModal: () => null }));
vi.mock("@/lib/components/levelUp/MagicItemInfoModal", () => ({ MagicItemInfoModal: () => null }));
vi.mock("@/lib/components/characterSheet/slides/FeaturesHeaderCards", () => ({ FeaturesHeaderCards: () => null }));
vi.mock("@/lib/components/characterCreator/modals/ClassInfoModal", () => ({ ClassInfoModal: () => null }));
vi.mock("@/lib/components/characterCreator/modals/SubclassInfoModal", () => ({ SubclassInfoModal: () => null }));
vi.mock("@/lib/spell-link", async (importOriginal) => ({ ...(await importOriginal<object>()), openSpellLink }));

import FeaturesSlide from "@/lib/components/characterSheet/slides/FeaturesSlide";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const INITIATE_FEATURE_ID = 900;

const initiateFeature: CharacterFeatureItem = {
  key: "PERS:feature:900",
  featureId: INITIATE_FEATURE_ID,
  name: "Посвячений у магію: список клірика",
  description: "Заклинання 1-го рівня завжди підготоване; раз на довгий відпочинок його можна накласти без слоту.",
  shortDescription: "Заклинання риси беруться зі списку клірика.",
  displayTypes: [FeatureDisplayType.PASSIVE, FeatureDisplayType.CLASS_RESOURCE],
  primaryType: FeatureDisplayType.PASSIVE,
  source: "FEAT",
  sourceName: "MAGIC_INITIATE",
  usesPer: 1,
  usesRemaining: 1,
  restType: "LONG_REST",
};

const groupedFeatures: CharacterFeaturesGroupedResult = {
  actions: [],
  bonusActions: [],
  reactions: [],
  passive: [initiateFeature],
};

const persSpell = (spellId: number, name: string, engName: string, level: number, origin: string, sourceName: string) => ({
  persSpellId: spellId,
  spellId,
  origin,
  sourceName,
  isPrepared: true,
  spell: { spellId, name, engName, level, ruleset: "RULES_2024" },
});

const pers = {
  persId: 1,
  ruleset: "RULES_2024",
  level: 1,
  classId: 1,
  class: { name: "CLERIC_2024" },
  race: { name: "HUMAN_2024" },
  background: { name: "SAGE_2024" },
  skills: [],
  choiceOptions: [],
  feats: [
    {
      feat: { name: "MAGIC_INITIATE" },
      choices: [
        {
          choiceOption: {
            features: [
              {
                feature: {
                  featureId: INITIATE_FEATURE_ID,
                  name: initiateFeature.name,
                  usesCount: 1,
                  usesCountSpecial: null,
                  usesCountDependsOnProficiencyBonus: false,
                  limitedUsesPer: "LONG_REST",
                },
              },
            ],
          },
        },
      ],
    },
  ],
  features: [{ featureId: INITIATE_FEATURE_ID, usesRemaining: 1 }],
  persSpells: [
    persSpell(11, "Благословення [Bless]", "Bless", 1, "FEAT", "MAGIC_INITIATE"),
    persSpell(12, "Дзвін небіжчика [Toll the Dead]", "Toll the Dead", 0, "FEAT", "MAGIC_INITIATE"),
    persSpell(13, "Громова хвиля [Thunderwave]", "Thunderwave", 1, "CLASS", "CLERIC_2024"),
  ],
} as unknown as PersWithRelations;

function openFeatureDialog() {
  render(<FeaturesSlide pers={pers} groupedFeatures={groupedFeatures} isReadOnly />);
  fireEvent.click(screen.getAllByText(initiateFeature.name)[0]);
}

describe("модалка фічі риси веде до заклинань, які риса дала", () => {
  it("показує заклинання риси й не показує класових", () => {
    openFeatureDialog();

    expect(screen.getByRole("button", { name: /Благословення/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Дзвін небіжчика/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Громова хвиля/ })).toBeNull();
  });

  it("натискання відкриває модалку заклинання за слагом редакції 2024", () => {
    openFeatureDialog();

    fireEvent.click(screen.getByRole("button", { name: /Благословення/ }));

    expect(openSpellLink).toHaveBeenCalledWith({ spellKey: "bless", ruleset: "RULES_2024" });
  });
});
