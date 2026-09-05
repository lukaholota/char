import { describe, expect, it } from "vitest";

import spellModal2014 from "@/app/spells/@modal/(.)[spellId]/page";
import spellModal2024 from "@/app/2024/spells/@modal/(.)[spellId]/page";
import magicItemModal2014 from "@/app/magic-items/@modal/(.)[magicItemId]/page";
import magicItemModal2024 from "@/app/2024/magic-items/@modal/(.)[magicItemId]/page";
import backgroundModal2014 from "@/app/backgrounds/@modal/(.)[backgroundId]/page";
import backgroundModal2024 from "@/app/2024/backgrounds/@modal/(.)[backgroundId]/page";
import { getAllSpells } from "@/lib/spellsData";
import { getAllMagicItems } from "@/lib/magicItemsData";
import { getAllBackgrounds } from "@/lib/backgroundsData";

/// Модалки каталогів шукали запис у себе в браузері й тримали для цього весь каталог
/// (docs/STATE.md дефект №9). Пошук переїхав на сервер — ці тести пиняють те, заради чого він
/// існує: id веде на той самий запис, чого немає — дає null, а не падіння.
type ModalPage<P> = (args: { params: Promise<P> }) => Promise<{ props: Record<string, unknown> }>;

async function renderModal<P>(page: ModalPage<P>, params: P): Promise<Record<string, unknown>> {
  const element = await page({ params: Promise.resolve(params) });
  return element.props;
}

describe("Модалки каталогів шукають запис на сервері", () => {
  describe("Заклинання", () => {
    it("2014: id веде на те саме заклинання", async () => {
      const [first] = getAllSpells("RULES_2014");
      const props = await renderModal(spellModal2014, { spellId: String(first.spellId) });

      expect(props.spell).toMatchObject({ spellId: first.spellId, name: first.name });
      expect(props.is2024).toBeUndefined();
    });

    it("2024: бере каталог своєї редакції й каже картці про це", async () => {
      const [first] = getAllSpells("RULES_2024");
      const props = await renderModal(spellModal2024, { spellId: String(first.spellId) });

      expect(props.spell).toMatchObject({ spellId: first.spellId });
      expect(props.is2024).toBe(true);
    });

    it("неіснуючий id дає null, а не падіння", async () => {
      const props = await renderModal(spellModal2014, { spellId: "999999999" });
      expect(props.spell).toBeNull();
    });
  });

  describe("Магічні предмети", () => {
    it("2014: id веде на той самий предмет", async () => {
      const [first] = getAllMagicItems("RULES_2014");
      const props = await renderModal(magicItemModal2014, { magicItemId: String(first.magicItemId) });

      expect(props.item).toMatchObject({ magicItemId: first.magicItemId, name: first.name });
    });

    it("2024: бере каталог своєї редакції", async () => {
      const [first] = getAllMagicItems("RULES_2024");
      const props = await renderModal(magicItemModal2024, { magicItemId: String(first.magicItemId) });

      expect(props.item).toMatchObject({ magicItemId: first.magicItemId });
    });

    it("неіснуючий id дає null", async () => {
      const props = await renderModal(magicItemModal2014, { magicItemId: "999999999" });
      expect(props.item).toBeNull();
    });
  });

  describe("Походження", () => {
    it("2014: слаг веде на те саме походження, редакція проброшена", async () => {
      const [first] = getAllBackgrounds("RULES_2014");
      const props = await renderModal(backgroundModal2014, { backgroundId: first.slug });

      expect(props.background).toMatchObject({ slug: first.slug, name: first.name });
      expect(props.ruleset).toBe("RULES_2014");
    });

    it("2024: слаг шукається в каталозі 2024", async () => {
      const [first] = getAllBackgrounds("RULES_2024");
      const props = await renderModal(backgroundModal2024, { backgroundId: first.slug });

      expect(props.background).toMatchObject({ slug: first.slug });
      expect(props.ruleset).toBe("RULES_2024");
    });

    it("невідомий слаг дає null", async () => {
      const props = await renderModal(backgroundModal2014, { backgroundId: "не-існує-такого" });
      expect(props.background).toBeNull();
    });
  });
});
