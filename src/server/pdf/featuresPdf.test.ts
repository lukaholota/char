import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/pdf/pdfUtils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/pdf/pdfUtils")>()),
  generatePdfFromHtml: vi.fn(async () => new Uint8Array()),
}));

import type { CharacterFeatureItem } from "@/lib/actions/pers";
import { generateFeaturesPdfBytes } from "./featuresPdf";
import { generatePdfFromHtml } from "./pdfUtils";

function buildFeature(name: string, source: string, primaryType: CharacterFeatureItem["primaryType"]): CharacterFeatureItem {
  return { key: name, name, description: `${name} опис`, source, primaryType, displayTypes: [primaryType] } as CharacterFeatureItem;
}

async function printFeaturesHtml(features: Parameters<typeof generateFeaturesPdfBytes>[0]["features"]): Promise<string> {
  vi.mocked(generatePdfFromHtml).mockClear();
  await generateFeaturesPdfBytes({ characterName: "Тест", features });
  return vi.mocked(generatePdfFromHtml).mock.calls[0][0];
}

function listSectionTitles(html: string): string[] {
  return [...html.matchAll(/<h1 class="section-title">([^<]+)<\/h1>/g)].map((match) => match[1]);
}

describe("здібності в друці", () => {
  it("збирає вливання одним блоком після решти здібностей і зберігає тип дії", async () => {
    const html = await printFeaturesHtml({
      passive: [buildFeature("Чарівна майстерність", "CLASS", "PASSIVE"), buildFeature("Покращена зброя", "INFUSION", "PASSIVE")],
      actions: [buildFeature("Кільце підживлення заклять", "INFUSION", "ACTION")],
      bonusActions: [],
      reactions: [],
    });

    expect(listSectionTitles(html)).toEqual(["Пасивні здібності", "Вливання"]);
    const infusions = html.slice(html.indexOf(">Вливання<"));
    expect(infusions).toContain("Покращена зброя");
    expect(infusions).toContain("Кільце підживлення заклять (Дія)");
  });

  it("без вливань блоку немає", async () => {
    const html = await printFeaturesHtml({ passive: [buildFeature("Темнозір", "RACE", "PASSIVE")], actions: [], bonusActions: [], reactions: [] });
    expect(listSectionTitles(html)).toEqual(["Пасивні здібності"]);
  });
});
