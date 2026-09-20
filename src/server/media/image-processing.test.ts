import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { buildSquareWebpImages, detectImageType } from "./image-processing";

async function makePng(width: number, height: number) {
  return new Uint8Array(await sharp({ create: { width, height, channels: 3, background: "#884422" } }).png().toBuffer());
}

describe("картинки користувачів", () => {
  it("тип визначається за вмістом, а не за назвою: SVG і текст не проходять", async () => {
    expect(detectImageType(await makePng(4, 4))).toBe("png");
    expect(detectImageType(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull();
    expect(detectImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe("jpeg");
  });

  it("будь-яке фото стає квадратним WebP 512 і мініатюрою 96", async () => {
    const images = await buildSquareWebpImages(await makePng(1200, 800));
    expect(await sharp(images.full).metadata()).toMatchObject({ format: "webp", width: 512, height: 512 });
    expect(await sharp(images.thumbnail).metadata()).toMatchObject({ format: "webp", width: 96, height: 96 });
    expect(images.full.byteLength).toBeLessThan(60_000);
  });

  it("зіпсований файл із правильним заголовком — помилка, а не порожня картинка", async () => {
    const broken = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    await expect(buildSquareWebpImages(broken)).rejects.toThrow();
  });
});
