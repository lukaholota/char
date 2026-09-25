import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_IMAGE_UPLOAD_BYTES } from "@/lib/media-upload-limits";
import { cropImageForUpload } from "./resize-image";

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
