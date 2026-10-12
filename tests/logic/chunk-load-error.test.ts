import { describe, expect, it } from "vitest";

import { isChunkLoadError } from "@/lib/offline/chunk-load-error";

describe("Помилка завантаження чанка впізнається за формами, які реально кидають збирачі", () => {
  it("Turbopack: звичайна помилка з текстом «Failed to load chunk» (так прийшло з production)", () => {
    const error = new Error("Failed to load chunk /_next/static/chunks/dce6a4600e22dd5e.js?dpl=8ddda3d7 from module 154596");
    expect(isChunkLoadError(error)).toBe(true);
  });

  it("webpack: ChunkLoadError за іменем і за текстом", () => {
    const named = Object.assign(new Error("whatever"), { name: "ChunkLoadError" });
    expect(isChunkLoadError(named)).toBe(true);
    expect(isChunkLoadError(new Error("Loading chunk 42 failed."))).toBe(true);
    expect(isChunkLoadError(new Error("Loading CSS chunk 7 failed."))).toBe(true);
  });

  it("нативний import(): Chrome і Safari кажуть про динамічний імпорт", () => {
    expect(isChunkLoadError(new TypeError("Failed to fetch dynamically imported module: https://x/a.js"))).toBe(true);
    expect(isChunkLoadError(new TypeError("error loading dynamically imported module"))).toBe(true);
  });

  it("справжні баги й не-помилки не маскуються під «немає мережі»", () => {
    expect(isChunkLoadError(new TypeError("Cannot read properties of undefined (reading 'groupId')"))).toBe(false);
    expect(isChunkLoadError(new Error("Failed to fetch"))).toBe(false);
    expect(isChunkLoadError("Failed to load chunk")).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });
});
