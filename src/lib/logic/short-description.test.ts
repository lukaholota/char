import { describe, expect, it } from "vitest";
import { buildFeat2024Description, readFeat2024SeedInputs } from "../../../prisma/seed/featSeed2024";
import { stripToPlainText } from "./plain-text";
import { buildShortDescription } from "./short-description";

const BLIND_FIGHTING =
  'Ви маєте сліповид у радіусі 10 футів. У цьому радіусі ви можете фактично бачити, навіть якщо ви <a href="/2024/rules/conditions#condition-blinded">засліплені</a> або перебуваєте в темряві. Більше того, ви можете бачити <a href="/2024/rules/conditions#condition-invisible">невидиме</a> створіння в цьому радіусі, якщо це створіння не сховалося від вас успішно.';

function countOpenAnchors(markup: string) {
  return (markup.match(/<a\b/g)?.length ?? 0) - (markup.match(/<\/a>/g)?.length ?? 0);
}

describe("короткий опис", () => {
  it("короткий текст лишає як є", () => {
    expect(buildShortDescription("  Ви отримуєте +2 до КБ.  ")).toBe("Ви отримуєте +2 до КБ.");
  });

  it("бере якір цілим, коли його видимий текст вміщається, хоч розмітка й довша за ліміт", () => {
    const short = buildShortDescription(BLIND_FIGHTING);
    expect(countOpenAnchors(short)).toBe(0);
    expect(short).toContain('<a href="/2024/rules/conditions#condition-invisible">невидиме</a>');
    expect(short.endsWith("…")).toBe(true);
  });

  it("якір, що не вміщається, не бере зовсім — обрізок кінчається перед ним", () => {
    const markup = `${"слово ".repeat(39)}ви <a href="/2024/rules/conditions#condition-invisible">невидиме створіння</a> бачите.`;
    const short = buildShortDescription(markup);
    expect(short).not.toContain("<a");
    expect(short.endsWith("ви…")).toBe(true);
  });

  it("рахує видимий текст, а не розмітку, і ріже по межі слова", () => {
    const short = buildShortDescription(BLIND_FIGHTING);
    const visible = stripToPlainText(short.replace(/…$/, ""));
    expect(visible.length).toBeLessThanOrEqual(240);
    expect(BLIND_FIGHTING).toContain(`${short.replace(/…$/, "")} `);
  });

  it("не лишає непарного жирного маркера", () => {
    const markup = `**Перша вигода**\n${"слово ".repeat(38)}**Друга вигода вже не влазить цілою**`;
    const short = buildShortDescription(markup);
    expect(short.match(/\*\*/g)?.length ?? 0).toBe(2);
  });

  it("жодна риса 2024 не дістає короткого опису з розірваним якорем", () => {
    const broken = readFeat2024SeedInputs()
      .map((feat) => ({ engName: feat.engName, short: buildShortDescription(buildFeat2024Description(feat)) }))
      .filter(({ short }) => countOpenAnchors(short) !== 0 || /<[^>]*$/.test(short));
    expect(broken).toEqual([]);
  });
});
