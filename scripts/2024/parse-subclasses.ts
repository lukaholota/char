import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderBodyAsMarkdown } from "./parse-class-features";

export function parseSubclassPage(html: string, url: string) {
  const title = /<div class="page-title page-header"><span>(.*?)<\/span><\/div>/.exec(html)?.[1];
  const contentStart = html.indexOf('id="page-content"');
  if (!title || contentStart < 0) throw new Error("Subclass page has no title or content");
  const classKey = new URL(url).pathname.slice(1).split(":")[0];
  const className = classKey[0].toUpperCase() + classKey.slice(1);
  const engName = renderBodyAsMarkdown(`<p>${title}</p>`);
  const content = html.slice(contentStart).split(/<script|<!-- mobile bottom|<div class="page-tags"/)[0];
  const source = /<p>Source:\s*([^<]+)<\/p>/.exec(content)?.[1].trim();
  if (!source) throw new Error(`${title}: no Source`);
  return { className, engName, source, featuresEng: parseSubclassFeatures(content, title) };
}

function parseSubclassFeatures(content: string, title: string) {
  const headings = [...content.matchAll(/<h3[^>]*>\s*<span>\s*Level\s+(\d+):\s*(.*?)<\/span>\s*<\/h3>/gi)];
  if (!headings.length) throw new Error(`${title}: no level features`);
  return headings.map((heading, index) => {
    const body = content.slice(heading.index + heading[0].length, headings[index + 1]?.index ?? content.length);
    const descriptionEng = renderBodyAsMarkdown(body);
    if (!descriptionEng) throw new Error(`${title}: empty feature ${heading[2]}`);
    return { level: Number(heading[1]), name: heading[2].trim(), descriptionEng };
  });
}

export function readSubclassSources() {
  const inventory: Array<{ localPath: string; url: string }> = JSON.parse(
    readFileSync("data/2024/source/subclass-inventory.json", "utf8"),
  );
  return inventory.map(entry => ({
    ...parseSubclassPage(readFileSync(entry.localPath, "utf8"), entry.url),
    url: entry.url,
  }));
}

function main() {
  const subclasses = readSubclassSources();
  writeFileSync("data/2024/source/subclasses-extracted.json", JSON.stringify(subclasses, null, 2) + "\n");
  console.log(`Extracted ${subclasses.length} subclasses without filtering by book`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
