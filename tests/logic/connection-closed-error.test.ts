import { describe, expect, it } from "vitest";

import { isConnectionClosedError } from "@/lib/offline/connection-closed-error";

describe("обрив RSC-відповіді", () => {
  it("впізнає точний текст React Flight", () => {
    expect(isConnectionClosedError(new Error("Connection closed."))).toBe(true);
  });

  it("не плутає з іншими помилками, де трапляються ті самі слова", () => {
    expect(isConnectionClosedError(new Error("Connection closed. Retry later"))).toBe(false);
    expect(isConnectionClosedError(new Error("WebSocket connection closed."))).toBe(false);
    expect(isConnectionClosedError({ message: "Connection closed." })).toBe(false);
    const typed = new TypeError("Connection closed.");
    expect(isConnectionClosedError(typed)).toBe(false);
  });
});
