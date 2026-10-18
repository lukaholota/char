import { readdirSync, readFileSync } from "node:fs";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";
import { describe, expect, it } from "vitest";
import { stripProseIndent } from "@/lib/markdown-prose-indent";

const renderHtml = (markdown: string) => String(remark().use(remarkGfm).use(remarkHtml, { sanitize: false }).processSync(markdown));

function collectIndentedCatalogTexts(): { file: string; text: string }[] {
  const texts: { file: string; text: string }[] = [];
  for (const file of readdirSync("src/lib/generated").filter((name) => name.endsWith(".json"))) {
    const visit = (value: unknown) => {
      if (typeof value === "string") { if (/\n[ \t]+\S/.test(value)) texts.push({ file, text: value }); }
      else if (value && typeof value === "object") Object.values(value).forEach(visit);
    };
    visit(JSON.parse(readFileSync(`src/lib/generated/${file}`, "utf8")));
  }
  return texts;
}

describe("відступ абзацу в описі не стає блоком коду", () => {
  it("абзац із відступом шаблонного рядка сіду читається як звичайний текст", () => {
    const html = renderHtml(stripProseIndent("Перший абзац.\n\n      Поки він утілений, спектральний розум може бачити."));
    expect(html).not.toContain("<pre>");
    expect(html).toContain("<p>Поки він утілений");
  });

  it("вкладений список і блок ``` зберігають відступи", () => {
    expect(stripProseIndent("- пункт\n    - вкладений")).toBe("- пункт\n    - вкладений");
    expect(stripProseIndent("```\n    код\n```")).toBe("```\n    код\n```");
  });

  it("жоден опис у згенерованих каталогах не рендериться як блок коду", () => {
    const texts = collectIndentedCatalogTexts();
    const asCode = texts.filter(({ text }) => renderHtml(stripProseIndent(text)).includes("<pre>"));
    expect(texts.length).toBeGreaterThan(0);
    expect(asCode.map(({ file, text }) => `${file}: ${text.slice(0, 60)}`)).toEqual([]);
  });
});
