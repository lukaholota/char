import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_IMAGE_UPLOAD_BYTES, MAX_MAP_UPLOAD_BYTES } from "@/lib/media-upload-limits";
import { cropImageForUpload, shrinkDetailedMapForUpload } from "./resize-image";

afterEach(() => vi.unstubAllGlobals());

describe("підготовка портрета до завантаження", () => {
  it("кадрує велике фото до 512 px і повторює стискання, якщо перший WebP завеликий", async () => {
    const drawImage = vi.fn();
    const toBlob = vi.fn((callback: (blob: Blob) => void, _type: string, quality: number) => {
      const size = quality === 0.8 ? MAX_IMAGE_UPLOAD_BYTES + 1 : 100_000;
      callback(new Blob([new Uint8Array(size)], { type: "image/webp" }));
    });
    const canvas = { width: 0, height: 0, getContext: () => ({ drawImage }), toBlob };
    vi.stubGlobal("document", { createElement: () => canvas });

    const encoded = await cropImageForUpload({} as ImageBitmap, { x: 250, y: 100, size: 2048 });

    expect(canvas).toMatchObject({ width: 512, height: 512 });
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 250, 100, 2048, 2048, 0, 0, 512, 512);
    expect(toBlob).toHaveBeenCalledTimes(2);
    expect(encoded.size).toBeLessThanOrEqual(MAX_IMAGE_UPLOAD_BYTES);
  });
});

describe("детальна мапа перед завантаженням", () => {
  const stubBitmap = (width: number, height: number) => vi.stubGlobal("createImageBitmap", async () => ({ width, height, close: vi.fn() }));
  const stubCanvas = (encodedSize: (quality: number) => number) => {
    const canvas = { width: 0, height: 0, getContext: () => ({ drawImage: vi.fn() }), toBlob: vi.fn((callback: (blob: Blob) => void, type: string, quality: number) => callback(new Blob([new Uint8Array(encodedSize(quality))], { type }))) };
    vi.stubGlobal("document", { createElement: () => canvas });
    return canvas;
  };

  it("мапа 3600 px до 8 МБ їде як є, без перекодування в браузері", async () => {
    stubBitmap(3600, 3888);
    const canvas = stubCanvas(() => 1);
    const file = new Blob([new Uint8Array(3 * 1024 * 1024)], { type: "image/jpeg" });
    expect(await shrinkDetailedMapForUpload(file)).toBe(file);
    expect(canvas.toBlob).not.toHaveBeenCalled();
  });

  it("мапа 7500 px зменшується до 4096 і лишається в межах 8 МБ, навіть якщо перший захід завеликий", async () => {
    stubBitmap(7500, 7500);
    const canvas = stubCanvas((quality) => (quality === 0.9 ? MAX_MAP_UPLOAD_BYTES + 1 : 4 * 1024 * 1024));
    const shrunk = await shrinkDetailedMapForUpload(new Blob([new Uint8Array(10)], { type: "image/jpeg" }));
    expect(canvas).toMatchObject({ width: 4096, height: 4096 });
    expect(canvas.toBlob).toHaveBeenCalledTimes(2);
    expect(shrunk.size).toBeLessThanOrEqual(MAX_MAP_UPLOAD_BYTES);
  });
});
