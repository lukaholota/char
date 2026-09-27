import { describe, expect, it } from "vitest";
import { translateEnumLikeLabel } from "@/lib/components/characterCreator/infoUtils";

describe("назва обраної опції на листі", () => {
  it("ключ навички з давніх опцій «Умільця» перекладається", () => {
    expect(translateEnumLikeLabel("ANIMAL_HANDLING")).toBe("Поводження з тваринами");
  });

  it("українська назва лишається як є", () => {
    expect(translateEnumLikeLabel("Наказ атакувати")).toBe("Наказ атакувати");
  });
});
