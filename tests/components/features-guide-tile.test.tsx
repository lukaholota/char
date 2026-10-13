// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { FeaturesHeaderCards } from "@/lib/components/characterSheet/slides/FeaturesHeaderCards";
import { CharacterSourceBuildContext, type CharacterSourceBuild } from "@/components/optimization/CharacterSourceBuildContext";

vi.mock("@/lib/actions/bastion-actions", () => ({ loadBastion: vi.fn() }));
vi.mock("@/components/no-ai/ModeLink", () => ({
  ModeLink: ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => <a href={href} className={className}>{children}</a>,
}));

afterEach(cleanup);

function renderCards(character: CharacterSourceBuild | null) {
  render(
    <CharacterSourceBuildContext.Provider value={character}>
      <FeaturesHeaderCards raceName="Ґітцерай" subraceName={null} backgroundName="Відлюдник" raceVariants={[]} classEntries={[]} subclassEntries={[]}
        featsCount={0} bastionEntry={null} openEntity={() => {}} onOpenFeatsManager={() => {}} />
    </CharacterSourceBuildContext.Provider>,
  );
}

describe("картка гайда пресета на слайді Здібностей", () => {
  it("персонаж, зібраний за пресетом, відкриває розділ гайда цього білда", () => {
    renderCards({ sourceBuildId: "build-druid-dreams-githzerai-2014", guide: { title: "Ясність", href: "/rules/optimization/druid-circle-of-dreams-2014#section-build" } });
    const link = screen.getByRole("link", { name: /Гайд пресета/ });
    expect(link.getAttribute("href")).toBe("/rules/optimization/druid-circle-of-dreams-2014#section-build");
    expect(link.textContent).toContain("Ясність");
  });

  it("персонаж без пресета або поза аркушем картки не має", () => {
    renderCards({ sourceBuildId: null, guide: null });
    expect(screen.queryByText("Гайд пресета")).toBeNull();
    cleanup();
    renderCards(null);
    expect(screen.queryByText("Гайд пресета")).toBeNull();
  });
});
