import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { parseArticleDocument } from "@/lib/optimization/document";
import { hydrateArticleDocument } from "@/lib/optimization/hydration-catalog";
import { getAllSpells } from "@/lib/spellsData";
import { buildSpellHref, buildSpellSlug } from "@/lib/spell-link";

it.each(["wizard-illusion", "wizard-subclasses"])("%s keeps the author’s Minor Image name explicit while linking the inferred 2014 spell", async (slug) => {
  const document = parseArticleDocument(JSON.parse(readFileSync(`data/rpgbot/uk/rpgbot-${slug}-2014.json`, "utf8")));
  const nodes = document.translations.at(-1)!.sections.flatMap((section) => section.blocks)
    .filter((block) => block.type === "list").flatMap((block) => block.items.flat());
  const paragraph = nodes.find((node) => node.text.includes("{{Malleable Illusions}}") && node.text.includes("Редакторська примітка"))!.text;
  const sheet = readFileSync(`data/rpgbot/authoring/${slug}-2014.md`, "utf8");
  expect(sheet).toContain(paragraph);
  expect(sheet).toContain("> Malleable Illusions: Most illusion spells which create an ongoing illusory effect (Minor Image,");
  expect(paragraph).toContain("автор двічі пише Minor Image");
  expect(paragraph).toContain("редакторський висновок за описом");
  expect(paragraph).not.toContain("{{Minor Image}}");
  const native = getAllSpells("RULES_2014").find((spell) => spell.engName === "Silent Image")!;
  expect(native.name).toBe("Мовчазний образ [Silent Image]");
  expect(native.description).toContain("15-футовий куб");
  expect(native.description).toContain("змусити образ переміщуватися");
  const article = await hydrateArticleDocument(document);
  const href = buildSpellHref({ ruleset: "RULES_2014", spellKey: buildSpellSlug(native.engName) });
  const hydratedParagraph = article.translations.at(-1)!.sections.flatMap((section) => section.blocks)
    .filter((block) => block.type === "list").flatMap((block) => block.items)
    .find((inline) => inline.some((node) => node.text.includes("Редакторська примітка")))!;
  expect(hydratedParagraph.some((node) => node.type === "link" && node.href === href)).toBe(true);
});
