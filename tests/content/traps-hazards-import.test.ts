import { describe, expect, it } from "vitest";

import { MIRROR_REVISION } from "../../scripts/5etools/mirror";
import { getTrapsHazards } from "@/lib/trapsHazardsData";
import { findHandwrittenArticles } from "@/lib/rulesData";
import { getImportedRuleArticles2014 } from "@/lib/rules2014Data";
import { getImportedRuleArticles2024 } from "@/lib/rules2024Data";
import { getBeyondSrdArticles } from "@/lib/rulesBeyondSrdData";
import { isBeyondSrd, isFromSrd } from "@/lib/rulesProvenance";

const EXPECTED_2014 = 35;
const EXPECTED_2024 = 16;

const traps2014 = getTrapsHazards("RULES_2014");
const traps2024 = getTrapsHazards("RULES_2024");
const all = [...traps2014, ...traps2024];

describe("KR23.3 — пастки й небезпеки поза SRD, обидві редакції", () => {
  it("імпортує 51 запис після фільтра джерел і виключення SRD-дублів", () => {
    expect(traps2014.length).toBe(EXPECTED_2014);
    expect(traps2024.length).toBe(EXPECTED_2024);
  });

  it("бере лише DMG, XGE, TCE, XDMG, XPHB — жоден запис не з пригодницької книги", () => {
    const allowed = new Set(["DMG", "XGE", "TCE", "XDMG", "XPHB"]);
    for (const article of all) {
      expect(allowed.has(article.provenance.book), article.slug).toBe(true);
    }
  });

  it("редакція збігається з книгою: DMG/XGE/TCE → 2014, XDMG/XPHB → 2024", () => {
    for (const article of traps2014) {
      expect(["DMG", "XGE", "TCE"], article.slug).toContain(article.provenance.book);
    }
    for (const article of traps2024) {
      expect(["XDMG", "XPHB"], article.slug).toContain(article.provenance.book);
    }
  });

  it("не бере восьми пасток DMG і восьми XDMG, що вже друкує SRD дослівно", () => {
    const srdSampleTraps2014 = [
      "Collapsing Roof",
      "Falling Net",
      "Fire-Breathing Statue",
      "Pits",
      "Poison Darts",
      "Poison Needle",
      "Rolling Sphere",
      "Sphere of Annihilation",
    ];
    const srdSampleTraps2024 = [
      "Collapsing Roof",
      "Falling Net",
      "Fire-Casting Statue",
      "Hidden Pit",
      "Poisoned Darts",
      "Poisoned Needle",
      "Rolling Stone",
      "Spiked Pit",
    ];

    const titles2014 = traps2014.map((a) => a.engTitle);
    const titles2024 = traps2024.map((a) => a.engTitle);

    for (const name of srdSampleTraps2014) expect(titles2014, name).not.toContain(name);
    for (const name of srdSampleTraps2024) expect(titles2024, name).not.toContain(name);
  });

  /// `srd`/`srd52` на trapshazards.json позначають лише вісім прикладів пасток у додатку
  /// книги — не всю SRD 5.2.1. XPHB (сама PHB 2024) друкує небезпеки, які довідник уже має
  /// перекладеними зі SRD-корпусу окремими статтями («Falling», «Extreme Cold»…), і 5etools
  /// це прапорцем не позначає. Спіймано звіркою заголовків уручну, не з документів KR.
  it("не бере 14 небезпек XDMG/XPHB, які довідник 2024 вже має зі SRD 5.2.1 дослівно", () => {
    const alreadyInSrd = [
      "Burning",
      "Deep Water",
      "Dehydration",
      "Extreme Cold",
      "Extreme Heat",
      "Falling",
      "Frigid Water",
      "Heavy Precipitation",
      "High Altitude",
      "Malnutrition",
      "Slippery Ice",
      "Strong Wind",
      "Suffocation",
      "Thin Ice",
    ];
    const titles2024 = traps2024.map((a) => a.engTitle);
    for (const name of alreadyInSrd) expect(titles2024, name).not.toContain(name);
  });

  it("несе походження beyond-srd з пінованою ревізією, книгою, сторінкою й URL", () => {
    for (const article of all) {
      expect(article.provenance.kind, article.slug).toBe("beyond-srd");
      expect(isBeyondSrd(article.provenance)).toBe(true);
      expect(isFromSrd(article.provenance)).toBe(false);
      expect(article.provenance.revision).toBe(MIRROR_REVISION);
      expect(article.provenance.page).toBeGreaterThan(0);
      expect(article.provenance.url).toContain("5e.tools/trapshazards");
    }
  });

  it("не краде слагів у статей SRD, рукописних і вже імпортованих поза SRD", () => {
    const reserved2014 = new Set([
      ...findHandwrittenArticles("RULES_2014").map((a) => a.slug),
      ...getImportedRuleArticles2014().map((a) => a.slug),
      ...getBeyondSrdArticles().map((a) => a.slug),
    ]);
    const reserved2024 = new Set([
      ...findHandwrittenArticles("RULES_2024").map((a) => a.slug),
      ...getImportedRuleArticles2024().map((a) => a.slug),
    ]);

    for (const article of traps2014) expect(reserved2014.has(article.slug), article.slug).toBe(false);
    for (const article of traps2024) expect(reserved2024.has(article.slug), article.slug).toBe(false);

    /// Якорі унікальні в межах редакції — 2014 і 2024 рендеряться на різних сторінках, тому
    /// той самий слаг («brown-mold» у DMG і в XDMG) в обох редакціях — не колізія.
    const slugs2014 = traps2014.map((a) => a.slug);
    const slugs2024 = traps2024.map((a) => a.slug);
    expect(new Set(slugs2014).size).toBe(slugs2014.length);
    expect(new Set(slugs2024).size).toBe(slugs2024.length);
  });

  it("кожен запис має непорожні підрозділи з унікальними якорями, опис завжди перший", () => {
    for (const article of all) {
      expect(article.subsections.length, article.slug).toBeGreaterThan(0);
      expect(article.subsections[0].id, article.slug).toBe(`${article.slug}--description`);

      const ids = article.subsections.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);

      for (const subsection of article.subsections) {
        expect(subsection.content.trim().length, subsection.id).toBeGreaterThan(0);
        expect(subsection.id.startsWith(`${article.slug}--`), subsection.id).toBe(true);
      }
    }
  });

  it("розмітка 5etools розкладена, а не протягнута як є", () => {
    const body = all.flatMap((article) => article.subsections.map((s) => s.content)).join("\n");
    expect(body).not.toMatch(/\{@\w+/);
  });

  it("пастки несуть trapHazType і рівень загрози, небезпеки — принаймні тип", () => {
    for (const article of all) {
      if (article.kind === "trap") {
        expect(article.trapHazType, article.slug).not.toBeNull();
        expect(article.rating.length, article.slug).toBeGreaterThan(0);
      }
    }
  });
});
