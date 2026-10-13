// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { GuidedLevelUpCard, useGuidedLevelUp } from "@/lib/components/levelUp/GuidedLevelUp";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import { parseLevelUpInput } from "@/lib/zod/schemas/levelUpSchema";
import type { GuidedLevelUp } from "@/lib/optimization/guided-level-up";

vi.mock("@/components/no-ai/ModeLink", () => ({
  ModeLink: ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => <a href={href} className={className}>{children}</a>,
}));

beforeEach(() => {
  usePersFormStore.persist.setOptions({ storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } });
});

afterEach(() => {
  cleanup();
  usePersFormStore.getState().resetForm();
});

const build = { title: "Соркадін", href: "/rules/optimization/sorcerer-2014#section-build" };
const readyGuide: GuidedLevelUp = {
  status: "ready", build, nextLevel: 7, classLabel: "Чародій", classLevel: 4,
  input: parseLevelUpInput({ levelUpPath: "EXISTING", classId: 14, featId: 41, classSpells: { cantripIds: [1374], preparedIds: [], spellbookIds: [] } }),
  skipped: ["Рису з плану персонаж уже має — оберіть іншу рису або підвищення характеристик."],
  open: ["Нові заклинання: оберіть 1."],
};

function GuidedCard({ guide }: { guide: GuidedLevelUp | null }) {
  return <GuidedLevelUpCard control={useGuidedLevelUp(guide)} />;
}

describe("блок «За гайдом» у майстрі підвищення", () => {
  it("заповнює чернетку рекомендаціями й повертає ручні вибори", () => {
    usePersFormStore.getState().updateFormData({ levelUpPath: "EXISTING", classId: 12, levelUpHpIncrease: 5, customAsi: [{ ability: "STR", value: 2 }] } as never);
    const manual = usePersFormStore.getState().formData;
    render(<GuidedCard guide={readyGuide} />);
    expect(screen.getByRole("link", { name: "Соркадін" }).getAttribute("href")).toBe(build.href);

    fireEvent.click(screen.getByRole("button", { name: "Заповнити за гайдом" }));

    expect(usePersFormStore.getState().formData).toMatchObject({ classId: 14, featId: 41, customAsi: [], levelUpAsiChoiceType: "FEAT", levelUpHpIncrease: 5, classSpells: { cantripIds: [1374] } });
    expect(screen.getByText(readyGuide.skipped[0])).toBeTruthy();
    expect(screen.getByText("Нові заклинання: оберіть 1.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Повернутися до ручного підвищення" }));

    expect(usePersFormStore.getState().formData).toEqual(manual);
    expect(screen.getByRole("button", { name: "Заповнити за гайдом" })).toBeTruthy();
  });

  it("пояснює недоступний план і не пропонує заповнення", () => {
    render(<GuidedCard guide={{ status: "unavailable", build, reason: "План пресета закінчився: рекомендацій для 8-го рівня немає." }} />);

    expect(screen.getByText(/План пресета закінчився/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Заповнити за гайдом" })).toBeNull();
  });

  it("персонаж без пресета не бачить блоку", () => {
    const { container } = render(<GuidedCard guide={null} />);

    expect(container.innerHTML).toBe("");
  });
});
