import { describe, expect, it } from "vitest";
import { buildSpellDisplayDescription } from "@/lib/spell-display-description";
import spells from "@/lib/generated/spells.json";

describe("buildSpellDisplayDescription", () => {
  it("removes metadata already shown above the spell description", () => {
    const description = "<p><strong>Час створення:</strong> 1 дія <br><strong>Відстань:</strong> 60 футів <br><strong>Складові:</strong> В, С <br><strong>Тривалість:</strong> 1 хвилина</p><p>Правила заклинання.</p>";
    expect(buildSpellDisplayDescription(description, "Example")).toBe("<p>Правила заклинання.</p>");
  });

  it("keeps mechanical text when the first paragraph is not metadata", () => {
    const description = "<p>Ви створюєте вогонь.</p><p>Ціль зазнає шкоди.</p>";
    expect(buildSpellDisplayDescription(description, "Example")).toBe(description);
  });

  it("removes only the two introductory Gift of Gab paragraphs", () => {
    const description = "<p><em>«Коли я познайомилася з Джимом Даркмеджиком, ...»</em></p><p>Кажуть, що це заклинання винайшов Джим Даркмеджик.</p><p>Коли ви накладаєте це заклинання, слухачі забувають слова.</p>";
    expect(buildSpellDisplayDescription(description, "Gift of Gab")).toBe("<p>Коли ви накладаєте це заклинання, слухачі забувають слова.</p>");
    expect(buildSpellDisplayDescription(description, "Another spell")).toBe(description);
  });

  it("keeps the rules paragraph of the current Gift of Gab catalog entry", () => {
    const giftOfGab = spells.find((spell) => spell.engName === "Gift of Gab");
    expect(giftOfGab).toBeDefined();
    const displayed = buildSpellDisplayDescription(giftOfGab!.description, giftOfGab!.engName);
    expect(displayed).toMatch(/^<p>Коли ви накладаєте це заклинання/);
    expect(displayed).not.toContain("Кажуть, що це заклинання винайшов");
  });
});
