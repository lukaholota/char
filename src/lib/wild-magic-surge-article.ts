import { RuleArticle } from "@/lib/rulesData";
import { WILD_MAGIC_SURGE_INTRO, WILD_MAGIC_SURGE_TABLE_ROWS } from "@/lib/wild-magic-surge-table";

/// Таблиця к100 жила у двох місцях — у рисі підкласу Чародія й на екрані помилки — і в жодному
/// з них її не можна було просто відкрити й прочитати. Тут вона стає статтею довідника, зібраною
/// з того самого сіду (`prisma/seed/subclassFeatureSeed.ts`), тож третьої копії тексту немає.
export const WILD_MAGIC_ARTICLE_SLUG = "wild-magic";
export const WILD_MAGIC_ARTICLE_CATEGORY = "spellcasting";

export function buildWildMagicSurgeArticle(): RuleArticle {
  return {
    id: "wild-magic",
    slug: WILD_MAGIC_ARTICLE_SLUG,
    category: WILD_MAGIC_ARTICLE_CATEGORY,
    title: "Дика магія",
    engTitle: "Wild Magic",
    summary:
      "Коли накладене закляття чародія обертається випадковим ефектом — і повна таблиця к100 сплесків дикої магії.",
    ruleset: "RULES_2014",
    order: 90,
    tags: ["дика магія", "сплеск дикої магії", "чародій", "к100", "випадковий ефект", "приплив хаосу"],
    subsections: [
      {
        id: "wild-magic-surge",
        title: "Сплеск дикої магії",
        engTitle: "Wild Magic Surge",
        content: WILD_MAGIC_SURGE_INTRO,
      },
      {
        id: "wild-magic-surge-table",
        title: "Таблиця сплесків дикої магії",
        engTitle: "Wild Magic Surge Table",
        content: buildSurgeTableMarkdown(),
      },
    ],
  };
}

function buildSurgeTableMarkdown(): string {
  const header = ["| к100 | Ефект |", "| --- | --- |"];
  const rows = WILD_MAGIC_SURGE_TABLE_ROWS.map((row) => `| ${row.roll.replace("-", "–")} | ${row.description} |`);
  return [...header, ...rows].join("\n");
}
