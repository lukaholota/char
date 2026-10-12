import { readdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import ts from "typescript";
import { expect, it } from "vitest";

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.tsx?$/.test(path) && !/\.test(-helper)?\.tsx?$/.test(path) ? [path] : [];
  });
}
function runtimeImports(path: string): string[] {
  const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true);
  const imports: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) && !node.importClause?.isTypeOnly) {
      const bindings = node.importClause?.namedBindings;
      const typeOnly = !node.importClause?.name && bindings && ts.isNamedImports(bindings) && bindings.elements.every((entry) => entry.isTypeOnly);
      if (!typeOnly && ts.isStringLiteral(node.moduleSpecifier)) imports.push(node.moduleSpecifier.text);
    }
    if (ts.isExportDeclaration(node) && !node.isTypeOnly && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) imports.push(node.moduleSpecifier.text);
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) imports.push(node.arguments[0].text);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return imports.map((specifier) => {
    const base = specifier.startsWith("@/") ? resolve("src", specifier.slice(2)) : specifier.startsWith(".") ? resolve(dirname(path), specifier) : "";
    return base && [base, `${base}.ts`, `${base}.tsx`, `${base}.json`, `${base}/index.ts`, `${base}/index.tsx`].find(existsSync);
  }).filter((path): path is string => !!path);
}
it("keeps the full reader/corpus out of all client roots and app layouts transitively", () => {
  const files = sourceFiles("src");
  const graph = new Map(files.map((path) => [path, runtimeImports(path)]));
  const roots = files.filter((path) => /^\s*["']use client["']/.test(readFileSync(path, "utf8")) || /\/app\/.*layout\.tsx$/.test(path));
  const seen = new Set<string>(); const pending = [...roots];
  while (pending.length) {
    const path = pending.pop()!;
    if (seen.has(path)) continue;
    seen.add(path); pending.push(...(graph.get(path) ?? []));
  }
  expect([...seen].filter((path) => path.includes("/data/rpgbot/") || path.endsWith("/optimization/article-reader.server.ts"))).toEqual([]);
  expect(readFileSync("src/lib/optimization/article-reader.server.ts", "utf8")).toContain('import "server-only"');
  expect(runtimeImports(resolve("src/lib/optimization/types.ts"))).toEqual([]);
  expect(roots.length).toBeGreaterThan(0);
});
