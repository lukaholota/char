import { describe, expect, it } from "vitest";

import { settleSkillPicks } from "@/lib/components/characterCreator/settle-skill-picks";

describe("settleSkillPicks", () => {
  it("прибирає вибір, який уже дало фіксоване джерело", () => {
    const settled = settleSkillPicks([{ key: "keenSenses", options: ["INSIGHT"], count: 1, picked: ["INSIGHT"] }], ["INSIGHT", "RELIGION"]);
    expect(settled).toEqual({ keenSenses: [] });
  });

  it("прибирає вибір, якого група більше не пропонує", () => {
    const settled = settleSkillPicks([{ key: "selectedClass", options: ["ATHLETICS", "HISTORY"], count: 2, picked: ["ARCANA", "HISTORY"] }], []);
    expect(settled).toEqual({ selectedClass: ["HISTORY"] });
  });

  it("віддає спільну навичку ранішій групі й не дає обрати більше, ніж дозволено", () => {
    const settled = settleSkillPicks([
      { key: "option", options: ["INSIGHT"], count: 1, picked: ["INSIGHT"] },
      { key: "selectedClass", options: ["INSIGHT", "HISTORY", "ATHLETICS"], count: 1, picked: ["INSIGHT", "HISTORY", "ATHLETICS"] },
    ], []);
    expect(settled).toEqual({ option: ["INSIGHT"], selectedClass: ["HISTORY"] });
  });
});
