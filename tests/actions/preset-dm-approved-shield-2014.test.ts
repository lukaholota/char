import { describe, expect, it, vi } from "vitest";
import { getPersById } from "@/lib/actions/pers";
import { calculateFinalAC } from "@/lib/logic/bonus-calculator";
import { createLikeThePage, openSweptSession, registerSweepFixture } from "../helpers/preset-sweep/db-sweep";
import type { PresetSweepCase } from "../helpers/preset-sweep/cases";
import type { PresetSession } from "../helpers/preset-sweep/ui-flow";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));
vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const fixture = registerSweepFixture("dm-approved-shield");
const SLUG = "blood-hunter-ghostslayer-rapier-2014";

describe("Кривавий мисливець — рапіра: щит з дозволу ДМа", () => {
  it("на 1-му рівні носить проклепаний шкіряний обладунок і щит, КБ 17", async () => {
    const pers = await createAtLevel(1);

    expect(pers.wearsShield).toBe(true);
    expect(pers.armors.filter((entry) => entry.equipped).map((entry) => entry.armor.name)).toEqual(["STUDDED_LEATHER"]);
    expect(calculateFinalAC(pers)).toBe(17);
  });

  it("без позначки щита немає, КБ 15", async () => {
    const pers = await createAtLevel(1, (session) => ({ ...session, path: "customize", form: { ...session.form, dmApprovedShield: false } }));

    expect(pers.wearsShield).toBe(false);
    expect(calculateFinalAC(pers)).toBe(15);
  });

  it("зі збиранням до 5-го рівня щит лишається, КБ 18", async () => {
    const pers = await createAtLevel(5);

    expect(pers.wearsShield).toBe(true);
    expect(calculateFinalAC(pers)).toBe(18);
  });
});

async function createAtLevel(targetLevel: number, change: (session: PresetSession) => PresetSession = (session) => session) {
  const sweepCase: PresetSweepCase = { slug: SLUG, ruleset: "RULES_2014", targetLevel };
  const content = await fixture.contentOf("RULES_2014");
  const run = await createLikeThePage(sweepCase, change(openSweptSession(sweepCase, content)), content);
  const pers = await getPersById(run.persId);
  if (!pers) throw new Error(`Немає персонажа ${run.persId}`);
  return pers;
}
