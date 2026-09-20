import { describe, expect, it } from "vitest";
import { collectPersClassNames, collectPersSubclassNames } from "@/lib/logic/pers-class-names";

describe("назви класів і підкласів для підпису персонажа", () => {
  it("основний клас іде першим, мультиклас — за ним", () => {
    const pers = {
      class: { name: "FIGHTER_2024" },
      subclass: { name: "CHAMPION" },
      multiclasses: [{ class: { name: "WIZARD_2024" }, subclass: null }],
    };

    expect(collectPersClassNames(pers)).toEqual(["FIGHTER_2024", "WIZARD_2024"]);
    expect(collectPersSubclassNames(pers)).toEqual(["CHAMPION"]);
  });

  it("без підкласу й мультикласу — лише основний клас", () => {
    const pers = { class: { name: "ROGUE_2014" }, subclass: null };

    expect(collectPersClassNames(pers)).toEqual(["ROGUE_2014"]);
    expect(collectPersSubclassNames(pers)).toEqual([]);
  });
});
