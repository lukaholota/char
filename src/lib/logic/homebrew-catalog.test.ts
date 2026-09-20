import { describe, expect, it } from "vitest";
import { buildHomebrewCatalogHref, parseHomebrewKind, parseHomebrewSort } from "./homebrew-catalog";

describe("адреса каталогу хоумбрю", () => {
  it("вибраний запис відкривається тим самим параметром, що й звичайна істота чи заклинання", () => {
    expect(buildHomebrewCatalogHref({ kind: "CREATURE", is2024: true, entryId: 7 })).toBe("/2024/homebrew?kind=CREATURE&creature=homebrew-7");
    expect(buildHomebrewCatalogHref({ kind: "SPELL", is2024: false, entryId: 7 })).toBe("/homebrew?kind=SPELL&spell=-7");
  });

  it("порядок «Нові» живе в окремому параметрі й не плутається з сортуванням бестіарію", () => {
    expect(buildHomebrewCatalogHref({ kind: "CREATURE", is2024: false, sort: "NEW" })).toBe("/homebrew?kind=CREATURE&hbsort=new");
    expect(parseHomebrewSort("new")).toBe("NEW");
    expect(parseHomebrewSort("random")).toBe("TOP");
  });

  it("невідомий тип веде до заклинань", () => {
    expect(parseHomebrewKind("CREATURE")).toBe("CREATURE");
    expect(parseHomebrewKind(["CREATURE"])).toBe("SPELL");
    expect(parseHomebrewKind(undefined)).toBe("SPELL");
  });
});
