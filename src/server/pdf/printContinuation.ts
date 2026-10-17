import { CONTINUED_MARK, countFittingLines, cutWithMark, fitMultilineText, splitTextToFit, splitWithMark, type MeasuringFont, type TextBox } from "./textFit";

export { CONTINUED_MARK, NOT_FITTED_MARK } from "./textFit";

export type BoxText = { name: string; label: string; text: string; box: TextBox; maxFontSize: number };
/// `lines` малюються в полі, `value` — те саме без штучних розривів: його бачить і правит гравець у редагованому PDF.
export type PrintedBox = { name: string; lines: string[]; size: number; value: string };
export type Overflow = { label: string; text: string };
export type PrintedBoxes = { printed: PrintedBox[]; overflow: Overflow[] };

/// Нижче цього кегля текст поля не дрібнішає, а продовжується у полі-хості, поки той сам лишається не дрібнішим.
export const CONTINUE_BELOW_SIZE = 6;

/// Порядок: поле дрібнішає до 6 pt → решта йде в поле-хост → якщо й там нема місця, туди, куди веде `pageMark`.
export function fitBoxesWithContinuation(sources: BoxText[], host: BoxText, font: MeasuringFont, pageMark = CONTINUED_MARK): PrintedBoxes {
  const accepted: Overflow[] = [];
  const overflow: Overflow[] = [];
  const printed = sources.map((source) => fitReadable(source, font) ?? continueInHost(source, host, font, accepted) ?? continueOnPage(source, font, overflow, pageMark));
  const hostWithContinuations = { ...host, text: appendContinuations(host.text, accepted) };
  const printedHost = fitReadable(hostWithContinuations, font) ?? continueOnPage(hostWithContinuations, font, overflow, pageMark);
  return { printed: [...printed, printedHost], overflow };
}

export function fitOrCut(source: BoxText, font: MeasuringFont): PrintedBox {
  const fitted = fitMultilineText(source.text, font, source.box, source.maxFontSize);
  if (isFitting(fitted.lines, font, source.box, fitted.size)) return { name: source.name, ...fitted, value: source.text };
  const lines = cutWithMark(source.text, font, source.box, fitted.size);
  return { name: source.name, lines, size: fitted.size, value: lines.join("\n") };
}

function fitReadable(source: BoxText, font: MeasuringFont): PrintedBox | null {
  const fitted = fitMultilineText(source.text, font, source.box, source.maxFontSize);
  if (fitted.size < CONTINUE_BELOW_SIZE || !isFitting(fitted.lines, font, source.box, fitted.size)) return null;
  return { name: source.name, ...fitted, value: source.text };
}

function continueInHost(source: BoxText, host: BoxText, font: MeasuringFont, accepted: Overflow[]): PrintedBox | null {
  const size = Math.min(CONTINUE_BELOW_SIZE, source.maxFontSize);
  const { lines, kept, rest } = splitTextToFit(source.text, font, source.box, size, { reserveLastLine: true });
  const continuations = [...accepted, { label: source.label, text: rest }];
  if (!fitReadable({ ...host, text: appendContinuations(host.text, continuations) }, font)) return null;
  accepted.push({ label: source.label, text: rest });
  const mark = `… далі в «${host.label}»`;
  return { name: source.name, lines: [...lines, mark], size, value: [kept, mark].filter(Boolean).join("\n") };
}

function continueOnPage(source: BoxText, font: MeasuringFont, overflow: Overflow[], mark: string): PrintedBox {
  const size = Math.min(CONTINUE_BELOW_SIZE, source.maxFontSize);
  const { lines, value, rest } = splitWithMark(source.text, font, source.box, size, mark);
  if (rest) overflow.push({ label: source.label, text: rest });
  return { name: source.name, lines, size, value };
}

function appendContinuations(hostText: string, continuations: Overflow[]): string {
  return [hostText, ...continuations.map(({ label, text }) => `${label} (продовження):\n${text}`)].filter(Boolean).join("\n\n");
}

function isFitting(lines: string[], font: MeasuringFont, box: TextBox, size: number): boolean {
  return lines.length <= countFittingLines(font, box, size);
}
