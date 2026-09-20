import ts from "typescript";

/// Опис у TS-сіді рідко буває одним рядком: склеєний через `+`, масив абзаців із `.join`,
/// шаблон із `${…}` або константа, названа в `description`. Проставляч і сід якорів читають
/// його як текст, який побачить гравець, а не як код, — у коді `\n` і відкривальна лапка
/// приклеюються до першого слова.

export type ProseLiteral = ts.StringLiteral | ts.NoSubstitutionTemplateLiteral | ts.TemplateHead | ts.TemplateMiddle | ts.TemplateTail;

/// `gap` — те, що стоїть між двома шматками тексту під час виконання; `null` — невідоме (`${…}`).
export type ProsePart = { literal: ProseLiteral } | { gap: string | null };

export function collectProseParts(expression: ts.Expression, file: ts.SourceFile): ProsePart[] | null {
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) return [{ literal: expression }];
  if (ts.isParenthesizedExpression(expression)) return collectProseParts(expression.expression, file);
  if (ts.isTemplateExpression(expression)) return collectTemplateParts(expression);
  if (ts.isBinaryExpression(expression) && expression.operatorToken.kind === ts.SyntaxKind.PlusToken) return collectConcatenatedParts(expression, file);
  if (isArrayJoin(expression)) return collectJoinedParts(expression, file);
  if (ts.isIdentifier(expression)) return collectConstantParts(expression, file);
  return null;
}

/// Текст опису так, як його отримає база; `null`, коли в ньому є невідоме `${…}`.
export function readProseText(parts: ProsePart[]): string | null {
  let text = "";
  for (const part of parts) {
    if ("literal" in part) text += part.literal.text;
    else if (part.gap === null) return null;
    else text += part.gap;
  }
  return text;
}

/// Позиції в коді для кожного символу тексту літерала: `offsets[i]` — де в файлі починається
/// i-й символ, останній елемент — кінець вмісту перед закривальною лапкою. `null`, коли
/// розбір екранування не зійшовся з тим, як його прочитав TypeScript.
export function mapLiteralOffsets(literal: ProseLiteral, source: string): number[] | null {
  const contentStart = literal.getStart() + 1;
  const contentEnd = literal.getEnd() - (ts.isTemplateHead(literal) || ts.isTemplateMiddle(literal) ? 2 : 1);
  const offsets: number[] = [];
  let at = contentStart;
  while (at < contentEnd) {
    const width = source[at] === "\\" ? measureEscape(source, at) : 1;
    for (let unit = 0; unit < countProducedUnits(source.slice(at, at + width)); unit++) offsets.push(at);
    at += width;
  }
  offsets.push(contentEnd);
  return offsets.length - 1 === literal.text.length ? offsets : null;
}

export function readQuote(literal: ProseLiteral, source: string): string {
  return ts.isStringLiteral(literal) ? source[literal.getStart()] : "`";
}

function collectTemplateParts(expression: ts.TemplateExpression): ProsePart[] {
  return [
    { literal: expression.head },
    ...expression.templateSpans.flatMap((span): ProsePart[] => [{ gap: null }, { literal: span.literal }]),
  ];
}

function collectConcatenatedParts(expression: ts.BinaryExpression, file: ts.SourceFile): ProsePart[] | null {
  const left = collectProseParts(expression.left, file);
  const right = collectProseParts(expression.right, file);
  return left && right ? [...left, { gap: "" }, ...right] : null;
}

function isArrayJoin(expression: ts.Expression): expression is ts.CallExpression {
  return (
    ts.isCallExpression(expression) &&
    ts.isPropertyAccessExpression(expression.expression) &&
    expression.expression.name.text === "join" &&
    ts.isArrayLiteralExpression(expression.expression.expression)
  );
}

function collectJoinedParts(call: ts.CallExpression, file: ts.SourceFile): ProsePart[] | null {
  const array = (call.expression as ts.PropertyAccessExpression).expression as ts.ArrayLiteralExpression;
  const [separatorArgument] = call.arguments;
  const separator =
    separatorArgument === undefined ? "," : ts.isStringLiteralLike(separatorArgument) ? separatorArgument.text : null;
  const elements = array.elements.map((element) => collectProseParts(element, file));
  if (elements.some((element) => element === null)) return null;
  return (elements as ProsePart[][]).flatMap((element, index) => (index === 0 ? element : [{ gap: separator }, ...element]));
}

function collectConstantParts(identifier: ts.Identifier, file: ts.SourceFile): ProsePart[] | null {
  const declaration = findConstantDeclaration(identifier.text, file);
  return declaration?.initializer ? collectProseParts(declaration.initializer, file) : null;
}

function findConstantDeclaration(name: string, file: ts.SourceFile): ts.VariableDeclaration | undefined {
  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement) || !(statement.declarationList.flags & ts.NodeFlags.Const)) continue;
    const found = statement.declarationList.declarations.find((declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === name);
    if (found) return found;
  }
  return undefined;
}

function measureEscape(source: string, at: number): number {
  const escape = /^\\(?:u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|\r\n|[\s\S])/.exec(source.slice(at, at + 12));
  return escape ? escape[0].length : 1;
}

/// Скільки UTF-16 одиниць дає шматок коду: `\` із переносом рядка не дає нічого, `\u{1F600}` — дві.
const LINE_CONTINUATIONS = new Set(["\r\n", "\n", "\r", "\u2028", "\u2029"]);

function countProducedUnits(raw: string): number {
  if (!raw.startsWith("\\")) return raw.length;
  if (LINE_CONTINUATIONS.has(raw.slice(1))) return 0;
  const codePoint = /^\\u\{([0-9a-fA-F]+)\}$/.exec(raw);
  return codePoint && parseInt(codePoint[1], 16) > 0xffff ? 2 : 1;
}
