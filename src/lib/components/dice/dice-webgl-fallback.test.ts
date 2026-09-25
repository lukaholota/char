import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@sentry/nextjs", () => ({ captureMessage: vi.fn() }));
vi.mock("@3d-dice/dice-box", () => ({
  default: class {
    constructor() {
      throw new Error("dice-box should not start without WebGL");
    }
  },
}));

import * as Sentry from "@sentry/nextjs";
import { diceService } from "./diceService";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("кубики без WebGL", () => {
  it("вмикає числовий режим до запуску dice-box", async () => {
    vi.stubGlobal("window", { WebGLRenderingContext: class {} });
    vi.stubGlobal("document", { createElement: () => ({ getContext: () => null }) });

    await diceService.init("#dice-box");

    expect(diceService.getStatus()).toBe("fallback");
    expect(Sentry.captureMessage).toHaveBeenCalledWith("dice-box fallback", {
      level: "warning",
      tags: { dice_fallback_reason: "WebGL unavailable" },
    });

    const onRollComplete = vi.fn();
    diceService.onRollComplete(onRollComplete);
    vi.useFakeTimers();
    await diceService.roll(1, 20);
    await vi.runAllTimersAsync();
    expect(onRollComplete).toHaveBeenCalledWith(expect.objectContaining({
      rolls: [expect.objectContaining({ sides: 20, value: expect.any(Number) })],
    }));
  });
});
