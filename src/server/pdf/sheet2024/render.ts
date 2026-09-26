import fontkit from "@pdf-lib/fontkit";
import {
  PDFAcroCheckBox,
  PDFAcroText,
  PDFArray,
  PDFCheckBox,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFRef,
  PDFTextField,
  TextAlignment,
  closePath,
  drawEllipse,
  fill,
  lineTo,
  moveTo,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  setFillingColor,
  type PDFFont,
  type PDFForm,
  type PDFOperator,
  type PDFPage,
} from "pdf-lib";

import { stripGlossaryMarkers } from "@/lib/refs/glossary-marker";

import { drawPortrait } from "../portraitPrint";

import {
  DETAILS_PAGE,
  MAGIC_PAGE,
  MAIN_PAGE,
  NOTES_PAGE,
  PORTRAIT_AREA,
  SHEET_2024_IMAGE_LEFT,
  SHEET_2024_PAGE_HEIGHT,
  SHEET_2024_PIXEL_SIZE,
  type CheckFieldSpec,
  type CheckShape,
  type LabelCorrection,
  type PixelRect,
  type SheetPageSpec,
  type TextFieldSpec,
} from "./layout";
import { countFittingLines, fitMultilineFontSize, fitSingleLineFontSize, MIN_FONT_SIZE, wrapText } from "./textFit";
import type { Sheet2024Content, SheetValue, SheetValues, TextFlow } from "./values";

export type Sheet2024RenderOptions = {
  includeCharacter: boolean;
  includeDetails: boolean;
  flatten: boolean;
  templateBytes: Uint8Array;
  regularFontBytes: Uint8Array;
  boldFontBytes: Uint8Array;
  portraitJpeg: Uint8Array | null;
};

type PagePlan = { spec: SheetPageSpec; values: SheetValues; namePrefix: string };
type Fonts = { regular: PDFFont; bold: PDFFont };
type PlacedPage = PagePlan & { page: PDFPage };
type FittedText = { text: string; size: number };
type Box = { width: number; height: number };
/// Плаский PDF не потребує порожніх полів: вони нічого не малюють, а важать половину файлу.
type FieldOptions = { font: PDFFont; flowedTexts: Map<string, FittedText>; skipEmpty: boolean };
type FieldTarget = { form: PDFForm; placed: PlacedPage; name: string };

const INK = rgb(0.08, 0.08, 0.08);
const PAPER = rgb(1, 1, 1);

export async function renderSheet2024(content: Sheet2024Content, options: Sheet2024RenderOptions): Promise<{ pdfDoc: PDFDocument; font: PDFFont }> {
  const plans = planPages(content, options);
  const document = await PDFDocument.create();
  const placed = await copyTemplatePages(document, plans, options.templateBytes);
  const fonts = await embedFonts(document, options);
  const flowedTexts = distributeTextFlows(content.flows, placed, fonts.regular);
  const form = document.getForm();

  for (const page of placed) {
    applyLabelCorrections(page, fonts);
    addPageFields(form, page, { font: fonts.regular, flowedTexts, skipEmpty: options.flatten });
  }
  await drawDetailsPortrait(placed, options.portraitJpeg);
  registerFieldFont(form, fonts.regular);
  if (options.flatten) flattenForm(document, form);
  return { pdfDoc: document, font: fonts.regular };
}

function planPages(content: Sheet2024Content, options: Pick<Sheet2024RenderOptions, "includeCharacter" | "includeDetails">): PagePlan[] {
  const characterPages: PagePlan[] = [
    { spec: MAIN_PAGE, values: content.main, namePrefix: "" },
    ...content.magicPages.map((values, index) => ({ spec: MAGIC_PAGE, values, namePrefix: index === 0 ? "" : `spellPage${index + 1}_` })),
  ];
  const detailPages: PagePlan[] = [
    { spec: DETAILS_PAGE, values: content.details, namePrefix: "" },
    { spec: NOTES_PAGE, values: content.notes, namePrefix: "" },
  ];
  return [...(options.includeCharacter ? characterPages : []), ...(options.includeDetails ? detailPages : [])];
}

async function copyTemplatePages(document: PDFDocument, plans: PagePlan[], templateBytes: Uint8Array): Promise<PlacedPage[]> {
  const template = await PDFDocument.load(templateBytes);
  const pages = await document.copyPages(template, plans.map((plan) => plan.spec.templatePageIndex));
  return pages.map((page, index) => ({ ...plans[index], page: document.addPage(page) }));
}

/// Редагований PDF тримає шрифт цілим: переглядач малює ним те, що гравець допише сам.
async function embedFonts(document: PDFDocument, options: Sheet2024RenderOptions): Promise<Fonts> {
  document.registerFontkit(fontkit);
  const subset = options.flatten;
  const [regular, bold] = await Promise.all([
    document.embedFont(options.regularFontBytes, { subset }),
    document.embedFont(options.boldFontBytes, { subset: true }),
  ]);
  return { regular, bold };
}

function applyLabelCorrections({ page, spec }: PlacedPage, fonts: Fonts) {
  for (const correction of spec.labelCorrections) drawLabelCorrection(page, spec, correction, fonts);
}

function drawLabelCorrection(page: PDFPage, spec: SheetPageSpec, correction: LabelCorrection, fonts: Fonts) {
  const font = correction.bold ? fonts.bold : fonts.regular;
  const erased = toPdfRect(correction.erase, spec.imageTop);
  page.drawRectangle({ ...erased, color: PAPER });
  const sizeByCapHeight = (correction.capHeight * SHEET_2024_PIXEL_SIZE) / NOTO_SANS_CAP_HEIGHT;
  const sizeByWidth = (correction.width * SHEET_2024_PIXEL_SIZE) / font.widthOfTextAtSize(correction.text, 1);
  const size = Math.min(sizeByCapHeight, sizeByWidth);
  page.drawText(correction.text, {
    x: toPdfX(correction.left),
    y: toPdfY(correction.baseline, spec.imageTop),
    size,
    font,
    color: INK,
  });
}

const NOTO_SANS_CAP_HEIGHT = 0.714;

function addPageFields(form: PDFForm, placed: PlacedPage, options: FieldOptions) {
  for (const spec of placed.spec.fields) {
    const target: FieldTarget = { form, placed, name: placed.namePrefix + spec.name };
    const value = placed.values[spec.name];
    if (spec.kind === "text") {
      const box = toPdfRect(spec.rect, placed.spec.imageTop);
      const fitted = options.flowedTexts.get(target.name) ?? pickReadableText(readTextCandidates(value), spec, box, options.font);
      if (!(options.skipEmpty && !fitted.text)) addTextField(target, spec, fitted, options.font);
    } else if (!(options.skipEmpty && value !== true)) {
      addCheckBox(target, spec, value === true);
    }
  }
}

function readTextCandidates(value: SheetValue | undefined): string[] {
  if (Array.isArray(value)) return value.map(stripGlossaryMarkers);
  return [typeof value === "string" ? stripGlossaryMarkers(value) : ""];
}

function addTextField({ form, placed, name }: FieldTarget, spec: TextFieldSpec, { text, size }: FittedText, font: PDFFont) {
  const field = createTextFieldUnchecked(form, name);
  if (spec.multiline) field.enableMultiline();
  field.setAlignment(spec.align === "center" ? TextAlignment.Center : TextAlignment.Left);
  field.addToPage(placed.page, {
    ...toPdfRect(spec.rect, placed.spec.imageTop),
    font,
    textColor: INK,
    backgroundColor: undefined,
    borderColor: undefined,
    borderWidth: 0,
  });
  field.setText(text);
  field.setFontSize(size);
  field.updateAppearances(font);
}

/// Повна форма лишається, поки читається; інакше береться коротша з наступних.
function pickReadableText(candidates: string[], spec: TextFieldSpec, box: Box, font: PDFFont): FittedText {
  const fitted = candidates.map((text) => ({
    text,
    size: !text ? spec.maxFontSize : spec.multiline ? fitMultilineFontSize(text, font, box, spec.maxFontSize) : fitSingleLineFontSize(text, font, box, spec.maxFontSize),
  }));
  return fitted.find(({ size }) => size >= Math.min(READABLE_FONT_SIZE, spec.maxFontSize)) ?? fitted[fitted.length - 1];
}

const READABLE_FONT_SIZE = 7;

function addCheckBox({ form, placed, name }: FieldTarget, spec: CheckFieldSpec, isChecked: boolean) {
  const checkBox = createCheckBoxUnchecked(form, name);
  checkBox.addToPage(placed.page, {
    ...toPdfRect(spec.rect, placed.spec.imageTop),
    backgroundColor: undefined,
    borderColor: undefined,
    borderWidth: 0,
  });
  if (isChecked) checkBox.check();
  checkBox.updateAppearances((_field, widget) => {
    const { width, height } = widget.getRectangle();
    return { normal: { on: drawCheckMark(spec.shape, width, height), off: [] } };
  });
}

/// `form.createTextField` звіряє імʼя з кожним наявним полем, і тисяча полів листа коштує пів секунди.
/// Імена тут унікальні за побудовою макета, тож поле додається до форми напряму.
function createTextFieldUnchecked(form: PDFForm, name: string): PDFTextField {
  const acroText = PDFAcroText.create(form.doc.context);
  acroText.setPartialName(name);
  form.acroForm.addField(acroText.ref);
  return PDFTextField.of(acroText, acroText.ref, form.doc);
}

function createCheckBoxUnchecked(form: PDFForm, name: string): PDFCheckBox {
  const acroCheckBox = PDFAcroCheckBox.create(form.doc.context);
  acroCheckBox.setPartialName(name);
  form.acroForm.addField(acroCheckBox.ref);
  return PDFCheckBox.of(acroCheckBox, acroCheckBox.ref, form.doc);
}

function drawCheckMark(shape: CheckShape, width: number, height: number): PDFOperator[] {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.3;
  if (shape === "circle") return drawEllipse({ x: centerX, y: centerY, xScale: radius, yScale: radius, color: INK, borderColor: undefined, borderWidth: 0 });
  const [first, ...rest] = findMarkCorners(shape, centerX, centerY, radius);
  return [
    pushGraphicsState(),
    setFillingColor(INK),
    moveTo(first[0], first[1]),
    ...rest.map(([x, y]) => lineTo(x, y)),
    closePath(),
    fill(),
    popGraphicsState(),
  ];
}

function findMarkCorners(shape: "diamond" | "square", centerX: number, centerY: number, radius: number): Array<[number, number]> {
  if (shape === "square") {
    return [
      [centerX - radius, centerY - radius],
      [centerX + radius, centerY - radius],
      [centerX + radius, centerY + radius],
      [centerX - radius, centerY + radius],
    ];
  }
  const reach = radius * 1.15;
  return [
    [centerX, centerY + reach],
    [centerX + reach, centerY],
    [centerX, centerY - reach],
    [centerX - reach, centerY],
  ];
}

/// Список здібностей заповнює поля по черзі; якщо не влазить і в останнє, кегль меншає для всіх.
function distributeTextFlows(flows: TextFlow[], placed: PlacedPage[], font: PDFFont): Map<string, FittedText> {
  const printedFields = new Map(
    placed.flatMap((page) =>
      page.spec.fields.flatMap((spec) => (spec.kind === "text" ? [[page.namePrefix + spec.name, toPdfRect(spec.rect, page.spec.imageTop)] as const] : [])),
    ),
  );
  const fitted = new Map<string, FittedText>();
  for (const flow of flows) {
    const names = flow.fieldNames.filter((name) => printedFields.has(name));
    const boxes = names.map((name) => printedFields.get(name) as Box);
    if (boxes.length === 0) continue;
    const size = findFlowFontSize(flow.lines, font, boxes);
    splitFlowLines(flow.lines, font, boxes, size).forEach((chunk, index) => fitted.set(names[index], { text: chunk.join("\n"), size }));
  }
  return fitted;
}

const FLOW_MAX_FONT_SIZE = 8;

function findFlowFontSize(lines: string[], font: PDFFont, boxes: Box[]): number {
  for (let size = FLOW_MAX_FONT_SIZE; size > MIN_FONT_SIZE; size -= 0.25) {
    const placedLines = splitFlowLines(lines, font, boxes, size).reduce((count, chunk) => count + chunk.length, 0);
    if (placedLines === lines.length) return size;
  }
  return MIN_FONT_SIZE;
}

function splitFlowLines(lines: string[], font: PDFFont, boxes: Box[], size: number): string[][] {
  const chunks: string[][] = boxes.map(() => []);
  let boxIndex = 0;
  let usedLines = 0;
  for (const line of lines) {
    while (boxIndex < boxes.length && usedLines + wrapText(line, font, size, boxes[boxIndex].width).length > countFittingLines(font, boxes[boxIndex], size)) {
      boxIndex += 1;
      usedLines = 0;
    }
    if (boxIndex === boxes.length) break;
    chunks[boxIndex].push(line);
    usedLines += wrapText(line, font, size, boxes[boxIndex].width).length;
  }
  return chunks;
}

async function drawDetailsPortrait(placed: PlacedPage[], portraitJpeg: Uint8Array | null) {
  const detailsPage = placed.find((page) => page.spec === DETAILS_PAGE);
  if (!detailsPage || !portraitJpeg) return;
  await drawPortrait(detailsPage.page, portraitJpeg, toPdfRect(PORTRAIT_AREA, detailsPage.spec.imageTop));
}

/// pdf-lib видаляє окремі від поля віджети, але лишає їхні посилання в /Annots сторінки.
function flattenForm(document: PDFDocument, form: PDFForm) {
  form.flatten({ updateFieldAppearances: false });
  for (const page of document.getPages()) {
    const annotations = page.node.lookupMaybe(PDFName.of("Annots"), PDFArray);
    if (!annotations) continue;
    for (let index = annotations.size() - 1; index >= 0; index--) {
      const entry = annotations.get(index);
      if (entry instanceof PDFRef && !document.context.lookup(entry)) annotations.remove(index);
    }
  }
}

/// Без шрифту в /DR AcroForm переглядач підставляє Helvetica, і дописана кирилиця зникає.
function registerFieldFont(form: PDFForm, font: PDFFont) {
  const acroForm = form.acroForm.dict;
  const context = acroForm.context;
  const resources = acroForm.lookupMaybe(PDFName.of("DR"), PDFDict) ?? context.obj({});
  const fontsDict = resources.lookupMaybe(PDFName.of("Font"), PDFDict) ?? context.obj({});
  fontsDict.set(PDFName.of(font.name), font.ref);
  resources.set(PDFName.of("Font"), fontsDict);
  acroForm.set(PDFName.of("DR"), resources);
}

function toPdfRect(rect: PixelRect, imageTop: number) {
  const x = toPdfX(rect.left);
  const y = toPdfY(rect.bottom, imageTop);
  return { x, y, width: (rect.right - rect.left) * SHEET_2024_PIXEL_SIZE, height: (rect.bottom - rect.top) * SHEET_2024_PIXEL_SIZE };
}

function toPdfX(pixelX: number): number {
  return SHEET_2024_IMAGE_LEFT + pixelX * SHEET_2024_PIXEL_SIZE;
}

function toPdfY(pixelY: number, imageTop: number): number {
  return SHEET_2024_PAGE_HEIGHT - (imageTop + pixelY * SHEET_2024_PIXEL_SIZE);
}

