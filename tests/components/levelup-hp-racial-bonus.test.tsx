// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import LevelUpHPStep from "@/lib/components/levelUp/LevelUpHPStep";
import { usePersFormStore } from "@/lib/stores/persFormStore";

/// KR31.12 / P4-regression-2014-04. Превʼю приросту хітів не рахувало расові хіти за рівень
/// (Дворфська витривалість, +1): екран показував +8, а в `max_hp` лягало +9. Сервер бере їх
/// через `sumFeatureHitPointsPerLevel` у `levelup-persistence`; тепер те саме робить і майстер.

afterEach(cleanup);

vi.hoisted(() => {
  const entries = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    writable: true,
    value: {
      get length() {
        return entries.size;
      },
      key: (index: number) => [...entries.keys()][index] ?? null,
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => void entries.set(key, String(value)),
      removeItem: (key: string) => void entries.delete(key),
      clear: () => entries.clear(),
    } satisfies Storage,
  });
});

/// Пагорбовий дворф із СТА 16: кістка d8 (середнє 5) + мод. Статури +3 + раса +1 = 9.
const HILL_DWARF_STATS = { str: 10, dex: 10, con: 16, int: 10, wis: 10, cha: 10 };

function renderHitPointStep(traitHitPointsPerLevel: number) {
  usePersFormStore.setState({
    formData: { levelUpHpMode: "AVERAGE", levelUpHpIncrease: 5 } as never,
    isHydrated: true,
  });

  render(
    <LevelUpHPStep
      hitDie={8}
      baseStats={HILL_DWARF_STATS}
      feats={[]}
      persFeats={[]}
      nextLevel={2}
      traitHitPointsPerLevel={traitHitPointsPerLevel}
      formId="hp-form"
    />,
  );
}

describe("превʼю приросту хітів у майстрі підвищення", () => {
  it("рахує расові хіти за рівень разом із кісткою й Статурою", () => {
    renderHitPointStep(1);

    expect(screen.getByText("+9")).toBeTruthy();
  });

  it("без расової риси лишається кістка плюс Статура", () => {
    renderHitPointStep(0);

    expect(screen.getByText("+8")).toBeTruthy();
  });
});
