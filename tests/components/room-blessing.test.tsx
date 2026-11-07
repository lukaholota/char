import { describe, expect, it } from "vitest";
import type { PersWithRelations } from "@/lib/actions/pers";
import { addRoomBlessing, isBlessSpell, isPersBlessedInRoom } from "@/lib/components/game/room-blessing";
import type { GameSessionView } from "@/server/db/game-sessions";

const pers = { persId: 7, effects: [] } as unknown as PersWithRelations;
const view = { id: 1, members: [{ persId: 7, conditions: { conditions: ["blessed"], exhaustionLevel: 0 } }, { persId: 8, conditions: { conditions: [], exhaustionLevel: 0 } }] } as unknown as GameSessionView;

describe("благословення з кімнати в листі", () => {
  it("благословенний у відкритій кімнаті отримує віртуальний баф один раз; поза кімнатою — ні", () => {
    expect(isPersBlessedInRoom(view, 1, 7)).toBe(true);
    expect(isPersBlessedInRoom(view, 1, 8)).toBe(false);
    expect(isPersBlessedInRoom(view, 2, 7)).toBe(false);
    expect(isPersBlessedInRoom(null, 1, 7)).toBe(false);

    const blessed = addRoomBlessing(pers, true);
    expect(blessed.effects.map((row) => row.effectKey)).toEqual(["BLESS"]);
    expect(addRoomBlessing(blessed, true)).toBe(blessed);
    expect(addRoomBlessing(pers, false)).toBe(pers);
  });

  it("«Благословення» впізнає за англійською назвою", () => {
    expect(isBlessSpell({ engName: "Bless" })).toBe(true);
    expect(isBlessSpell({ engName: "Bane" })).toBe(false);
    expect(isBlessSpell(null)).toBe(false);
  });
});
