import { describe, expect, it } from "vitest";
import { flattenLinksLeavingPicker, isKeptInPicker, isOpenedInPicker } from "./picker-links";
import type { InlineNode } from "./types";

const creatureSlugs = new Set(["brown-bear"]);
const link = (text: string, href: string): InlineNode => ({ type: "link", text, href });
const flattenOne = (href: string) => flattenLinksLeavingPicker([link("Назва", href)], creatureSlugs)[0];

describe("посилання в пікері", () => {
  it.each([
    ["заклинання", "/spells/aid"],
    ["термін", "/rules/conditions#condition-blinded"],
    ["істоту бестіарію 2014", "/bestiary?creature=brown-bear"],
    ["зовнішнє джерело", "https://rpgbot.net/dnd5/characters/classes/bard/"],
  ])("лишає посиланням %s", (_kind, href) => {
    expect(flattenOne(href)).toEqual(link("Назва", href));
  });

  it.each([
    ["невідому істоту", "/bestiary?creature=tarrasque-of-legend"],
    ["істоту 2024", "/2024/bestiary?creature=brown-bear"],
    ["вибір риси з читача", "/classes?reference=extra%20attack&section=section-cantrips"],
    ["додаткове джерело з читача", "/classes?reference=two-weapon-fighting"],
    ["рису класу з каталогу", "/classes?class=rogue&feature=evasion-7"],
    ["рису з каталогу", "/feats"],
    ["виклик", "/invocations/agonizing-blast"],
  ])("робить звичайним текстом %s", (_kind, href) => {
    expect(flattenOne(href)).toEqual({ type: "text", text: "Назва" });
  });

  it("не чіпає вузлів без посилань", () => {
    const nodes: InlineNode[] = [{ type: "text", text: "Текст " }, { type: "strong", text: "жирний" }];

    expect(flattenLinksLeavingPicker(nodes, creatureSlugs)).toEqual(nodes);
  });

  it("відкриває на місці лише заклинання, терміни й істоти, а зовнішнє джерело лишає для нової вкладки", () => {
    expect(isOpenedInPicker("https://rpgbot.net/", creatureSlugs)).toBe(false);
    expect(isKeptInPicker("https://rpgbot.net/", creatureSlugs)).toBe(true);
    expect(isKeptInPicker("http://www.sageadvice.eu/", creatureSlugs)).toBe(true);
  });
});
