import { PDFArray, PDFDict, PDFDocument, PDFName, PDFString, PDFHexString } from "pdf-lib";

export type PdfPageFields = Record<string, string | boolean>;

/**
 * Поля читаються з віджетів кожної сторінки, а не з AcroForm: сторінки листа заклинань
 * копіюються в документ без реєстрації їхніх полів у формі.
 */
export async function readPdfPageFields(bytes: Uint8Array): Promise<PdfPageFields[]> {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((page) => {
    const annots = page.node.lookupMaybe(PDFName.of("Annots"), PDFArray);
    const fields: PdfPageFields = {};
    for (let index = 0; index < (annots?.size() ?? 0); index++) {
      const widget = annots?.lookupMaybe(index, PDFDict);
      if (!widget) continue;
      const name = findFieldName(widget);
      if (name) fields[name] = readFieldValue(widget);
    }
    return fields;
  });
}

/** Підписи бланка CharacterSheet_fixed.pdf — анотації FreeText, а не текст сторінки. */
export async function readPdfFreeTextLabels(bytes: Uint8Array): Promise<string[][]> {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((page) => {
    const annots = page.node.lookupMaybe(PDFName.of("Annots"), PDFArray);
    const labels: string[] = [];
    for (let index = 0; index < (annots?.size() ?? 0); index++) {
      const annotation = annots?.lookupMaybe(index, PDFDict);
      if (annotation?.get(PDFName.of("Subtype")) !== PDFName.of("FreeText")) continue;
      const contents = annotation.lookupMaybe(PDFName.of("Contents"), PDFString, PDFHexString);
      if (contents) labels.push(contents.decodeText());
    }
    return labels;
  });
}

function findFieldName(widget: PDFDict): string | null {
  const parts: string[] = [];
  let node: PDFDict | undefined = widget;
  while (node) {
    const title = node.lookupMaybe(PDFName.of("T"), PDFString, PDFHexString);
    if (title) parts.unshift(title.decodeText());
    node = node.lookupMaybe(PDFName.of("Parent"), PDFDict);
  }
  return parts.length > 0 ? parts.join(".") : null;
}

function readFieldValue(widget: PDFDict): string | boolean {
  const appearanceState = widget.lookupMaybe(PDFName.of("AS"), PDFName);
  if (appearanceState) return appearanceState.asString() !== "/Off";
  let node: PDFDict | undefined = widget;
  while (node) {
    const value = node.lookupMaybe(PDFName.of("V"), PDFString, PDFHexString);
    if (value) return value.decodeText();
    node = node.lookupMaybe(PDFName.of("Parent"), PDFDict);
  }
  return "";
}
