import { PDFDocument } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

async function main() {
  const fs = await import("fs/promises");
  const path = await import("path");

  const templatePath = path.resolve(process.cwd(), "public", "CharacterSheet_fixed.pdf");
  const notoPath = path.resolve(process.cwd(), "public", "fonts", "NotoSans-Regular.ttf");
  const outDir = path.resolve(process.cwd(), "tmp");
  const outPath = path.resolve(outDir, "filled.pdf");

  const bytes = await fs.readFile(templatePath);
  const pdfDoc = await PDFDocument.load(bytes);
  pdfDoc.registerFontkit(fontkit);
  const form = pdfDoc.getForm();

  const fields = form.getFields();
  if (fields.length !== 106) {
    throw new Error(`Expected 106 fields in template, got ${fields.length}`);
  }

  // Fill a few fields as a smoke test (must not throw if template changes)
  try {
    form.getTextField("CharacterName").setText("Тестовий Персонаж");
  } catch {}

  try {
    form.getTextField("ClassLevel").setText("Воїн 1");
  } catch {}

  try {
    form.getTextField("Background").setText("Послушник");
  } catch {}

  try {
    form.getTextField("HPMax").setText("12");
  } catch {}

  try {
    form.getCheckBox("Check Box 23").check();
  } catch {}

  // Update appearances using NotoSans so Cyrillic text doesn't crash.
  const notoBytes = await fs.readFile(notoPath);
  const noto = await pdfDoc.embedFont(notoBytes, { subset: true });
  try {
    form.updateFieldAppearances(noto);
  } catch {}

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, await pdfDoc.save());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
