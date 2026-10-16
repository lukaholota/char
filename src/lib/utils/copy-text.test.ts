// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { copyTextToClipboard } from "@/lib/utils/copy-text";

function setClipboard(value: unknown) {
  Object.defineProperty(window.navigator, "clipboard", { value, configurable: true });
}

afterEach(() => {
  setClipboard(undefined);
  vi.restoreAllMocks();
});

describe("copyTextToClipboard", () => {
  it("пише через Clipboard API, коли він дозволений", async () => {
    const writeText = vi.fn(async () => {});
    setClipboard({ writeText });
    await expect(copyTextToClipboard("https://example.test/a")).resolves.toBe("clipboard_api");
    expect(writeText).toHaveBeenCalledWith("https://example.test/a");
  });

  it("переходить на виділення тексту, коли Clipboard API заборонено", async () => {
    setClipboard({ writeText: async () => { throw new DOMException("denied", "NotAllowedError"); } });
    document.execCommand = vi.fn(() => true);
    await expect(copyTextToClipboard("https://example.test/b")).resolves.toBe("selection");
    expect(document.execCommand).toHaveBeenCalledWith("copy");
    expect(document.querySelector("textarea")).toBeNull();
  });

  it("повідомляє про невдачу, коли не спрацював жоден спосіб", async () => {
    setClipboard(undefined);
    document.execCommand = vi.fn(() => false);
    await expect(copyTextToClipboard("x")).resolves.toBeNull();
  });
});
