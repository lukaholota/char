import fs from "node:fs";
import path from "node:path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

async function main() {
  const input = process.argv[2] ?? "public/CharacterSheet.pdf";
  const output = process.argv[3] ?? "public/CharacterSheet.grid.pdf";

  if (!fs.existsSync(input)) {
    console.error(`Сука, файл не знайдено: ${input}`);
    process.exit(1);
  }

  const bytes = fs.readFileSync(input);
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    const minor = 36;
    const major = 72;

    for (let x = 0; x <= width; x += minor) {
      const isMajor = x % major === 0;
      page.drawLine({
        start: { x, y: 0 },
        end: { x, y: height },
        thickness: isMajor ? 0.8 : 0.4,
        color: isMajor ? rgb(0.9, 0.1, 0.1) : rgb(0.85, 0.85, 0.85),
        opacity: 0.35,
      });
      if (isMajor) {
        page.drawText(String(x), { x: x + 2, y: height - 12, size: 8, font, color: rgb(0.6, 0, 0) });
      }
    }

    for (let y = 0; y <= height; y += minor) {
      const isMajor = y % major === 0;
      page.drawLine({
        start: { x: 0, y },
        end: { x: width, y },
        thickness: isMajor ? 0.8 : 0.4,
        color: isMajor ? rgb(0.1, 0.1, 0.9) : rgb(0.85, 0.85, 0.85),
        opacity: 0.35,
      });
      if (isMajor) {
        page.drawText(String(y), { x: 2, y: y + 2, size: 8, font, color: rgb(0, 0, 0.6) });
      }
    }
  }

  const outBytes = await pdf.save();
  fs.writeFileSync(output, outBytes);

  console.log(JSON.stringify({
    status: "success",
    inputPath: path.resolve(input),
    outputPath: path.resolve(output)
  }, null, 2));
}

main().catch(console.error);
