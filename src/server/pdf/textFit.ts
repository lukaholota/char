export type MeasuringFont = {
  widthOfTextAtSize: (text: string, size: number) => number;
  heightAtSize: (size: number, options?: { descender?: boolean }) => number;
};

export type TextBox = { width: number; height: number };
/// `text` — рядки, як їх намальовано; `value` — те саме без штучних розривів, для редагування в переглядачі;
/// `rest` — що не вмістилося й піде на аркуш «Продовження».
export type FittedText = { text: string; size: number; value: string; rest: string };
export type FittedLines = { lines: string[]; size: number };
/// `rest` починається рівно з першого рядка, що не вмістився, і зберігає розриви абзаців; `kept` — текст до нього.
export type TextSplit = { lines: string[]; kept: string; rest: string };
export type MarkedSplit = { lines: string[]; value: string; rest: string };
export type TextFieldFit = { maxFontSize: number; multiline?: boolean; readableFontSize?: number };

export const MIN_FONT_SIZE = 4.5;
export const READABLE_FONT_SIZE = 7;

const FONT_SIZE_STEP = 0.25;
/// pdf-lib відступає 1 pt від краю поля без рамки.
const FIELD_PADDING = 1;
const LINE_HEIGHT_RATIO = 1.2;
const ROUNDING_TOLERANCE = 1e-9;
const LETTER = /\P{M}\p{M}*|\p{M}+/gu;

type LineWidth = { font: MeasuringFont; size: number; maxWidth: number };
type Word = { gap: string; text: string; start: number; end: number };
type Cursor = { word: number; offset: number };
type TakenLine = { start: number; end: number; next: Cursor };
type WrappedLine = { text: string; start: number };

export function fitSingleLineFontSize(text: string, font: MeasuringFont, box: TextBox, maxFontSize: number): number {
  const inner = shrinkByPadding(box);
  const widthAtOne = font.widthOfTextAtSize(text, 1);
  const byWidth = widthAtOne > 0 ? (inner.width * 0.98) / widthAtOne : maxFontSize;
  const byHeight = inner.height / font.heightAtSize(1, { descender: false });
  return roundDown(Math.max(MIN_FONT_SIZE, Math.min(maxFontSize, byWidth, byHeight)));
}

export function fitMultilineText(text: string, font: MeasuringFont, box: TextBox, maxFontSize: number): FittedLines {
  const fittingLines = new Map<number, string[]>();
  const size = findLargestFittingSize(maxFontSize, (candidate) => {
    const lines = wrapWithinBox(text, font, box, candidate);
    if (lines) fittingLines.set(candidate, lines);
    return lines !== null;
  });
  return { size, lines: fittingLines.get(size) ?? wrapText(text, font, size, box.width) };
}

/// Що менший кегль, то менше рядків і більше місця під них, тож сітку 0.25 pt можна ділити навпіл.
export function findLargestFittingSize(maxFontSize: number, isFitting: (size: number) => boolean): number {
  const sizeAt = (step: number) => maxFontSize - step * FONT_SIZE_STEP;
  const stepCount = Math.max(0, Math.ceil((maxFontSize - MIN_FONT_SIZE) / FONT_SIZE_STEP - ROUNDING_TOLERANCE));
  let low = 0;
  let high = stepCount;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (isFitting(sizeAt(middle))) high = middle;
    else low = middle + 1;
  }
  return low < stepCount ? sizeAt(low) : MIN_FONT_SIZE;
}

/// Останній рядок має вмістити й виносні елементи літер, інакше межа поля зріже їх.
export function countFittingLines(font: MeasuringFont, box: TextBox, size: number): number {
  const height = font.heightAtSize(size);
  const descent = height - font.heightAtSize(size, { descender: false });
  return Math.max(0, Math.floor((shrinkByPadding(box).height - descent) / (height * LINE_HEIGHT_RATIO) + ROUNDING_TOLERANCE));
}

/// Та сама розбивка, що в `layoutMultilineText` pdf-lib: рядок закінчується на останньому пробілі,
/// з яким він ще вужчий за поле. Слово, ширше за рядок, ділиться по літерах — pdf-lib лишив би
/// решту абзацу одним рядком за межею поля.
export function wrapText(text: string, font: MeasuringFont, size: number, boxWidth: number, maxLines = Infinity): string[] {
  return wrapIntoLines(normalizeFieldText(text), { font, size, maxWidth: boxWidth - FIELD_PADDING * 2 }, maxLines).map((line) => line.text);
}

export function splitTextToFit(text: string, font: MeasuringFont, box: TextBox, size: number, options: { reserveLastLine?: boolean } = {}): TextSplit {
  const capacity = countFittingLines(font, box, size);
  const split = takeLines(text, font, size, box.width, capacity);
  return split.rest && options.reserveLastLine ? takeLines(text, font, size, box.width, Math.max(0, capacity - 1)) : split;
}

export function takeLines(text: string, font: MeasuringFont, size: number, boxWidth: number, count: number): TextSplit {
  const normalized = normalizeFieldText(text);
  const lines = wrapIntoLines(normalized, { font, size, maxWidth: boxWidth - FIELD_PADDING * 2 }, count + 1);
  if (lines.length <= count) return { lines: lines.map((line) => line.text), kept: normalized, rest: "" };
  const restStart = lines[count].start;
  return { lines: lines.slice(0, count).map((line) => line.text), kept: normalized.slice(0, restStart).trimEnd(), rest: normalized.slice(restStart) };
}

/// Повна форма лишається, поки читається; інакше береться коротша з наступних.
export function pickReadableText(candidates: string[], font: MeasuringFont, box: TextBox, field: TextFieldFit): FittedText {
  const readableSize = Math.min(field.readableFontSize ?? READABLE_FONT_SIZE, field.maxFontSize);
  let fitted: FittedText = { text: "", size: field.maxFontSize, value: "", rest: "" };
  for (const text of candidates) {
    fitted = fitFieldText(text, font, box, field);
    if (fitted.size >= readableSize) break;
  }
  return fitted;
}

/// Багаторядкове значення приходить уже розбитим: власний перенос pdf-lib щоразу переміряє весь
/// залишок абзацу, і абзац на кілька тисяч знаків блокував сервер на хвилини.
function fitFieldText(text: string, font: MeasuringFont, box: TextBox, field: TextFieldFit): FittedText {
  if (!text) return { text, size: field.maxFontSize, value: text, rest: "" };
  if (!field.multiline) return { text, size: fitSingleLineFontSize(text, font, box, field.maxFontSize), value: text, rest: "" };
  const { lines, size } = fitMultilineText(text, font, box, field.maxFontSize);
  if (lines.length <= countFittingLines(font, box, size)) return { text: lines.join("\n"), size, value: text, rest: "" };
  const split = splitWithMark(text, font, box, size, CONTINUED_MARK);
  return { text: split.lines.join("\n"), size, value: split.value, rest: split.rest };
}

export const NOT_FITTED_MARK = "… далі не вмістилося";
export const CONTINUED_MARK = "… далі на аркуші «Продовження»";

const CUT_LINE_MARK = "…";

/// Поле на один рядок не має місця під окрему позначку, тож обрізаний рядок закінчується трикрапкою.
export function cutWithMark(text: string, font: MeasuringFont, box: TextBox, size: number): string[] {
  return splitWithMark(text, font, box, size, NOT_FITTED_MARK).lines;
}

export function splitWithMark(text: string, font: MeasuringFont, box: TextBox, size: number, mark: string): MarkedSplit {
  if (countFittingLines(font, box, size) <= 1) {
    const line = cutToOneLine(text, font, box, size);
    return { lines: [line], value: line, rest: "" };
  }
  const { lines, kept, rest } = splitTextToFit(text, font, box, size, { reserveLastLine: true });
  return { lines: [...lines, mark], value: [kept, mark].filter(Boolean).join("\n"), rest };
}

function cutToOneLine(text: string, font: MeasuringFont, box: TextBox, size: number): string {
  const markWidth = font.widthOfTextAtSize(CUT_LINE_MARK, size);
  const [line = ""] = wrapText(text, font, size, box.width - markWidth, 1);
  return `${line.trimEnd()}${CUT_LINE_MARK}`;
}

function wrapWithinBox(text: string, font: MeasuringFont, box: TextBox, size: number): string[] | null {
  const capacity = countFittingLines(font, box, size);
  const lines = wrapText(text, font, size, box.width, capacity + 1);
  return lines.length <= capacity ? lines : null;
}

/// Як `cleanText` і `lineSplit` pdf-lib, але CRLF — один розрив, а не два.
function normalizeFieldText(text: string): string {
  return text.replace(/\r\n?|\f/g, "\n").replace(/[\t\u0085\u2028\u2029]/g, " ").replace(/[\b\v]/g, "");
}

function wrapIntoLines(text: string, width: LineWidth, maxLines: number): WrappedLine[] {
  const lines: WrappedLine[] = [];
  let offset = 0;
  for (const paragraph of text.split("\n")) {
    for (const line of wrapParagraph(paragraph, offset, width)) {
      if (lines.length >= maxLines) return lines;
      lines.push(line);
    }
    offset += paragraph.length + 1;
  }
  return lines;
}

function* wrapParagraph(paragraph: string, offset: number, width: LineWidth): Generator<WrappedLine> {
  const words = findWords(paragraph);
  if (words.length === 0) {
    yield { text: "", start: offset };
    return;
  }
  let cursor: Cursor = { word: 0, offset: words[0].start };
  let lineStart = isIndentKept(words[0], width) ? 0 : cursor.offset;
  while (cursor.word < words.length) {
    const line = takeLine(paragraph, words, cursor, lineStart, width);
    yield { text: paragraph.slice(line.start, line.end), start: offset + line.start };
    cursor = line.next;
    lineStart = cursor.offset;
  }
}

function findWords(paragraph: string): Word[] {
  const words: Word[] = [];
  for (const match of paragraph.matchAll(/\S+/g)) {
    const start = match.index;
    const previousEnd = words.length > 0 ? words[words.length - 1].end : 0;
    words.push({ gap: paragraph.slice(previousEnd, start), text: match[0], start, end: start + match[0].length });
  }
  return words;
}

function isIndentKept(firstWord: Word, width: LineWidth): boolean {
  return (measureAtOne(width.font, firstWord.gap) + measureAtOne(width.font, firstWord.text)) * width.size < width.maxWidth;
}

function takeLine(paragraph: string, words: Word[], cursor: Cursor, lineStart: number, width: LineWidth): TakenLine {
  const last = findLastFittingWord(paragraph, words, cursor, lineStart, width);
  if (last >= cursor.word) return { start: lineStart, end: words[last].end, next: findWordStart(words, last + 1, paragraph.length) };
  const wordEnd = words[cursor.word].end;
  const end = findFittingBreak(paragraph.slice(cursor.offset, wordEnd), width) + cursor.offset;
  const next = end < wordEnd ? { word: cursor.word, offset: end } : findWordStart(words, cursor.word + 1, paragraph.length);
  return { start: cursor.offset, end, next };
}

/// Ширини слів складаються з кешу, а справжнім виміром перевіряється лише готовий рядок.
function findLastFittingWord(paragraph: string, words: Word[], cursor: Cursor, lineStart: number, width: LineWidth): number {
  const { font, size, maxWidth } = width;
  let total = measureAtOne(font, paragraph.slice(lineStart, cursor.offset)) + measureAtOne(font, paragraph.slice(cursor.offset, words[cursor.word].end));
  if (total * size >= maxWidth) return cursor.word - 1;
  let last = cursor.word;
  while (last + 1 < words.length) {
    const added = measureAtOne(font, words[last + 1].gap) + measureAtOne(font, words[last + 1].text);
    if ((total + added) * size >= maxWidth) break;
    total += added;
    last += 1;
  }
  while (last >= cursor.word && !isNarrowerThanLine(paragraph.slice(lineStart, words[last].end), width)) last -= 1;
  return last;
}

function findFittingBreak(word: string, width: LineWidth): number {
  const taken: string[] = [];
  let total = 0;
  for (const letter of word.match(LETTER) ?? []) {
    const letterWidth = measureAtOne(width.font, letter);
    if (taken.length > 0 && (total + letterWidth) * width.size >= width.maxWidth) break;
    taken.push(letter);
    total += letterWidth;
  }
  while (taken.length > 1 && !isNarrowerThanLine(taken.join(""), width)) taken.pop();
  return taken.join("").length;
}

function findWordStart(words: Word[], word: number, paragraphEnd: number): Cursor {
  return { word, offset: word < words.length ? words[word].start : paragraphEnd };
}

function isNarrowerThanLine(text: string, width: LineWidth): boolean {
  return width.font.widthOfTextAtSize(text, width.size) < width.maxWidth;
}

/// Ширина лінійна за кеглем, тож кожен фрагмент міряється один раз на шрифт документа.
const widthsAtOneByFont = new WeakMap<MeasuringFont, Map<string, number>>();

function measureAtOne(font: MeasuringFont, text: string): number {
  if (!text) return 0;
  let widths = widthsAtOneByFont.get(font);
  if (!widths) {
    widths = new Map();
    widthsAtOneByFont.set(font, widths);
  }
  let width = widths.get(text);
  if (width === undefined) {
    width = font.widthOfTextAtSize(text, 1);
    widths.set(text, width);
  }
  return width;
}

function shrinkByPadding(box: TextBox): TextBox {
  return { width: box.width - FIELD_PADDING * 2, height: box.height - FIELD_PADDING * 2 };
}

function roundDown(size: number): number {
  return Math.floor(size / FONT_SIZE_STEP) * FONT_SIZE_STEP;
}
