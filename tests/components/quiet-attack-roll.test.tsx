// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { publications, toasts, visibility } = vi.hoisted(() => {
  const items = new Map<string, string>();
  const storage = { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => void items.set(key, value), removeItem: (key: string) => void items.delete(key) };
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true, writable: true });
  Object.defineProperty(window, "localStorage", { value: storage, configurable: true, writable: true });
  return { publications: [] as Array<{ label: string }>, toasts: [] as Array<{ description?: string; action?: { label: string; onClick: () => void } }>, visibility: { current: "PUBLIC" } };
});

vi.mock("sonner", () => ({ toast: (_title: string, options: (typeof toasts)[number]) => void toasts.push(options) }));
vi.mock("@/lib/components/dice/dice-fallback", () => ({
  rollFallbackDice: (notations: string[]) => notations.flatMap((notation) => {
    const [count, sides] = notation.split("d").map(Number);
    return Array.from({ length: count }, () => ({ sides, value: 10, rollId: 0 }));
  }),
}));
vi.mock("@/lib/components/game/game-roll-publisher", async () => {
  const { watchRollVerdict } = await import("@/lib/components/game/roll-verdict");
  return {
    captureGameRollTarget: () => ({ sessionId: 1, visibility: visibility.current, persId: 7, creatureId: 3, heroPersId: null }),
    publishGameRoll: (_target: unknown, publication: { label: string }) => {
      publications.push(publication);
      watchRollVerdict(`roll-${publications.length}`);
    },
  };
});

import { buildWeaponRollContext } from "@/lib/components/dice/roll-contexts";
import { openRollOrRollQuietly } from "@/lib/components/game/quiet-attack-roll";
import { useGameSessionLiveStore } from "@/lib/components/game/game-session-live-store";
import { clearRollVerdict, settleRollVerdict } from "@/lib/components/game/roll-verdict";
import { useDiceUIStore } from "@/lib/stores/diceUIStore";
import { useGameSessionStore } from "@/lib/stores/gameSessionStore";
import { parseCampaignHouseRules } from "@/rules/house-rules";
import type { GameRollEventView } from "@/server/db/game-roll-events";

const crossbow = buildWeaponRollContext({ weaponName: "Легкий арбалет", attackBonus: 5, damageBonus: 3, damageDice: "1d8" });
const attackVerdict = (isHit: boolean) => ({ target: { name: "Жаба", kind: "attack", isHit } }) as unknown as GameRollEventView;
const damageVerdict = { target: { name: "Жаба", kind: "damage", damage: 13, damageDefenses: [] } } as unknown as GameRollEventView;

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const lastToast = () => toasts.at(-1);

function joinCampaign(rules: Record<string, boolean>) {
  useGameSessionStore.setState({ active: { id: 1, name: "Кімната" }, rollChoices: {} });
  useGameSessionLiveStore.setState({ sessionId: 1, view: { id: 1, myRole: "PLAYER", houseRules: parseCampaignHouseRules(rules) } as never });
}

beforeEach(() => {
  publications.length = 0;
  toasts.length = 0;
  visibility.current = "PUBLIC";
  clearRollVerdict();
});

afterEach(() => {
  useDiceUIStore.getState().close();
  useGameSessionStore.setState({ active: null, rollChoices: {} });
});

describe("атака без вікна кидка", () => {
  it("за правилами книги атака відкриває лоток і нічого не кидає сама", () => {
    joinCampaign({});
    openRollOrRollQuietly(crossbow);
    expect(useDiceUIStore.getState().isOpen).toBe(true);
    expect(publications).toHaveLength(0);
  });

  it("без вікна атака йде в кімнату без лотка, а після влучання шкода кидається сама", async () => {
    joinCampaign({ isAttackTrayShown: false });
    openRollOrRollQuietly(crossbow);
    expect(useDiceUIStore.getState().isOpen).toBe(false);
    expect(lastToast()?.description).toBe("Атака 15");
    settleRollVerdict("roll-1", attackVerdict(true));
    await flush();
    expect(publications.map((publication) => publication.label)).toEqual(["Легкий арбалет · Атака", "Легкий арбалет · Шкода"]);
    settleRollVerdict("roll-2", damageVerdict);
    await flush();
    expect(lastToast()?.description).toBe("Атака 15 · шкода 13 · Жаба: −13");
  });

  it("при ручній шкоді пропонує кнопку після влучання, а промах шкоди не пропонує", async () => {
    joinCampaign({ isAttackTrayShown: false, isDamageAutoRolled: false });
    openRollOrRollQuietly(crossbow);
    settleRollVerdict("roll-1", attackVerdict(true));
    await flush();
    expect(publications).toHaveLength(1);
    expect(lastToast()?.action?.label).toBe("Кинути шкоду");
    lastToast()?.action?.onClick();
    expect(publications).toHaveLength(2);
    openRollOrRollQuietly(crossbow);
    settleRollVerdict("roll-3", attackVerdict(false));
    await flush();
    expect(lastToast()).toMatchObject({ description: "Атака 15 · Промах — Жаба" });
    expect(lastToast()?.action).toBeUndefined();
  });

  it("таємний кидок не показує результату гравцеві, а шкоду кидає сама, щойно кімната відповіла", async () => {
    joinCampaign({ isAttackTrayShown: false });
    visibility.current = "SECRET";
    openRollOrRollQuietly(crossbow);
    expect(lastToast()?.description).toBe("Атаку кинуто — результат бачить лише майстер");
    settleRollVerdict("roll-1", { target: null } as unknown as GameRollEventView);
    await flush();
    expect(publications.map((publication) => publication.label)).toEqual(["Легкий арбалет · Атака", "Легкий арбалет · Шкода"]);
    expect(lastToast()?.description).toBe("Атаку й шкоду кинуто — результат бачить лише майстер");
  });

  it("таємний кидок при ручній шкоді нічого більше не кидає", async () => {
    joinCampaign({ isAttackTrayShown: false, isDamageAutoRolled: false });
    visibility.current = "SECRET";
    openRollOrRollQuietly(crossbow);
    settleRollVerdict("roll-1", { target: null } as unknown as GameRollEventView);
    await flush();
    expect(publications).toHaveLength(1);
  });
});
