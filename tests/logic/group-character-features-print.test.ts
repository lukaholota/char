import { describe, expect, it } from "vitest";

import { groupCharacterFeaturesForPdf } from "@/server/pdf/groupCharacterFeatures";

describe("риси в shared PDF", () => {
  it("не губить жодну з кількох рис і друкує вибрану опцію окремо", () => {
    const grouped = groupCharacterFeaturesForPdf({
      level: 4,
      feats: [
        {
          featId: 1,
          feat: { name: "Спостережливий", description: "Опис першої риси" },
          choices: [],
        },
        {
          featId: 2,
          feat: { name: "Експерт у навичках", description: "Опис другої риси" },
          choices: [
            {
              choiceOptionId: 21,
              choiceOption: { groupName: "Експертиза", optionName: "Сприйняття" },
            },
          ],
        },
      ],
    });

    expect(grouped.passive.map((feature) => feature.name)).toEqual([
      "Спостережливий",
      "Експерт у навичках",
      "Сприйняття",
    ]);
  });
});

