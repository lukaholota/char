import fs from "node:fs";
import { PDFDocument } from "pdf-lib";

async function main() {
  const file = process.argv[2] ?? "public/CharacterSheet.pdf";
  const bytes = fs.readFileSync(file);
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });

  let fields: string[] = [];
  try {
    const form = pdf.getForm();
    fields = form.getFields().map((f) => f.getName());
  } catch {
    fields = [];
  }

  // Keep output machine-readable for quick copy/paste.
  // Exit code 2 when no fields are present (useful in scripts/CI).
  const result = {
    file,
    pages: pdf.getPages().length,
    fieldsCount: fields.length,
    fields,
  };

  console.log(JSON.stringify(result, null, 2));

  if (fields.length === 0) process.exitCode = 2;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
