// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FeaturesHeaderCards } from "@/lib/components/characterSheet/slides/FeaturesHeaderCards";
import { BastionLevelUpNote } from "@/components/bastions/BastionLevelUpNote";
import type { BastionEntryCard } from "@/lib/components/characterSheet/slides/FeaturesHeaderCards";

vi.mock("@/lib/actions/bastion-actions", () => ({ loadBastion: vi.fn() }));
vi.mock("@/components/no-ai/ModeLink", () => ({
  ModeLink: ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

import { loadBastion } from "@/lib/actions/bastion-actions";

afterEach(cleanup);

function renderCards(bastionEntry: BastionEntryCard) {
  render(
    <FeaturesHeaderCards
      raceName="Людина" subraceName={null} backgroundName="Солдат" raceVariants={[]} classEntries={[]} subclassEntries={[]}
      featsCount={0} bastionEntry={bastionEntry} openEntity={() => {}} onOpenFeatsManager={() => {}}
    />
  );
}

describe("KR31.15 — картка бастіону на слайді Рис (L14-bastions-07, -09)", () => {
  it("до 5-го рівня картка веде на сторінку, але приглушена й називає стандартний рівень", () => {
    renderCards({ kind: "owner", href: "/char/7/bastion", name: null, facilityCount: 0, isMuted: true });
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/char/7/bastion");
    expect(link.className).toContain("opacity-70");
    expect(screen.getByText("за правилами з 5-го рівня")).toBeTruthy();
  });

  it("у поширеному листі картка відкриває бастіон на перегляд без посилання на сторінку", () => {
    renderCards({
      kind: "shared",
      bastion: {
        name: "Стара вежа", description: "", isMaintaining: true,
        facilities: [{ facilityId: 1, name: "Кузня", space: "ROOMY", isSpecial: true, currentOrder: "CRAFT", defenders: 2, hirelings: "" }],
      },
    });
    expect(screen.queryByRole("link")).toBeNull();
    fireEvent.click(screen.getByText("Стара вежа"));
    expect(screen.getByText("Кузня")).toBeTruthy();
    expect(screen.getByText("Наказ: Ремесло")).toBeTruthy();
    expect(screen.getByText("Захисників: 2")).toBeTruthy();
    expect(screen.getByText("Цього ходу бастіон на Утриманні.")).toBeTruthy();
  });
});

describe("KR31.15 — примітка майстра підвищення (L14-bastions-03)", () => {
  it("персонаж із бастіоном на 9-му рівні дізнається про нові приміщення", async () => {
    vi.mocked(loadBastion).mockResolvedValue({ ok: true, standing: { bastion: { name: "Форт" } } } as never);
    render(<BastionLevelUpNote persId={7} ruleset="RULES_2024" fromLevel={8} toLevel={9} />);
    await waitFor(() => expect(screen.getByText(/нові спеціальні приміщення: \+2/)).toBeTruthy());
  });
});
