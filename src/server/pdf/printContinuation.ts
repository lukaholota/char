import { countFittingLines, fitMultilineText, splitTextToFit, type MeasuringFont, type TextBox } from "./textFit";

export type BoxText = { name: string; label: string; text: string; box: TextBox; maxFontSize: number };
export type PrintedBox = { name: string; lines: string[]; size: number };

/// Нижче цього кегля текст поля не дрібнішає, а продовжується у полі-хості, поки той сам лишається не дрібнішим.
export const CONTINUE_BELOW_SIZE = 6;
export const NOT_FITTED_MARK = "… далі не вмістилося";

type Continuation = { label: string; rest: string };

export function fitBoxesWithContinuation(sources: BoxText[], host: BoxText, font: MeasuringFont): PrintedBox[] {
  const accepted: Continuation[] = [];
  const printed = sources.map((source) => {
    const fitted = fitMultilineText(source.text, font, source.box, source.maxFontSize);
    if (fitted.size >= CONTINUE_BELOW_SIZE && isFitting(fitted.lines, font, source.box, fitted.size)) return { name: source.name, ...fitted };
    const continued = continueInHost(source, host, font, accepted);
    return continued ?? fitOrCut(source, font);
  });
  return [...printed, fitOrCut({ ...host, text: appendContinuations(host.text, accepted) }, font)];
}

export function fitOrCut(source: BoxText, font: MeasuringFont): PrintedBox {
  const fitted = fitMultilineText(source.text, font, source.box, source.maxFontSize);
  if (isFitting(fitted.lines, font, source.box, fitted.size)) return { name: source.name, ...fitted };
  const { lines } = splitTextToFit(source.text, font, source.box, fitted.size, { reserveLastLine: true });
  return { name: source.name, lines: [...lines, NOT_FITTED_MARK], size: fitted.size };
}

function continueInHost(source: BoxText, host: BoxText, font: MeasuringFont, accepted: Continuation[]): PrintedBox | null {
  const size = Math.min(CONTINUE_BELOW_SIZE, source.maxFontSize);
  const { lines, rest } = splitTextToFit(source.text, font, source.box, size, { reserveLastLine: true });
  const continuations = [...accepted, { label: source.label, rest }];
  const hostFitted = fitMultilineText(appendContinuations(host.text, continuations), font, host.box, host.maxFontSize);
  if (hostFitted.size < CONTINUE_BELOW_SIZE || !isFitting(hostFitted.lines, font, host.box, hostFitted.size)) return null;
  accepted.push({ label: source.label, rest });
  return { name: source.name, lines: [...lines, `… далі в «${host.label}»`], size };
}

function appendContinuations(hostText: string, continuations: Continuation[]): string {
  return [hostText, ...continuations.map(({ label, rest }) => `${label} (продовження):\n${rest}`)].filter(Boolean).join("\n\n");
}

function isFitting(lines: string[], font: MeasuringFont, box: TextBox, size: number): boolean {
  return lines.length <= countFittingLines(font, box, size);
}
