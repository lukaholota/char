// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BastionAddFacility, BastionMatchBadge } from "@/components/bastions/BastionPicking";
import { getBastionFacilityBySlug } from "@/lib/bastionsData";

import type { BastionFacilityMatch } from "@/rules/bastions";

afterEach(cleanup);

function findFacility(slug: string) {
  const facility = getBastionFacilityBySlug(slug);
  if (!facility) throw new Error(`У каталозі KR19.1 немає приміщення ${slug}`);
  return facility;
}

function describeFacility(slug: string) {
  const facility = findFacility(slug);
  return { level: facility.level, prerequisiteText: facility.prerequisiteText };
}

function buildMatch(overrides: Partial<BastionFacilityMatch> = {}): BastionFacilityMatch {
  return { status: "met", isSpecial: true, isAboveCharacterLevel: false, ...overrides };
}

describe("значок відповідності приміщення", () => {
  it("незнану вимогу називає кампанійною, а не проваленою", () => {
    render(<BastionMatchBadge {...describeFacility("harper-hideout")} match={buildMatch({ status: "campaign" })} />);

    expect(screen.getByText("Залежить від кампанії")).toBeTruthy();
    expect(screen.queryByText("Передумова не пройдена")).toBeNull();
  });

  it("причину показує лише тоді, коли передумова не пройдена", () => {
    const arcaneStudy = describeFacility("arcane-study");

    const met = render(<BastionMatchBadge {...arcaneStudy} match={buildMatch()} />);
    expect(met.container.textContent).toContain("Відповідає");
    expect(met.container.textContent).not.toContain("фокусуванн");
    cleanup();

    const unmet = render(<BastionMatchBadge {...arcaneStudy} match={buildMatch({ status: "unmet" })} />);
    expect(unmet.container.textContent).toContain("Передумова не пройдена");
    expect(unmet.container.textContent).toContain("фокусуванн");
  });

  it("зависокий рівень приміщення показує окремо від передумови", () => {
    const { container } = render(
      <BastionMatchBadge {...describeFacility("armory")} match={buildMatch({ isAboveCharacterLevel: true })} />
    );

    expect(screen.getByText("Відповідає")).toBeTruthy();
    expect(container.textContent).toMatch(/Рівень \d+\+/);
  });
});

describe("кнопка додавання приміщення", () => {
  it("один можливий розмір — одна кнопка, і розмір не питається", () => {
    const onAdd = vi.fn();
    render(<BastionAddFacility facility={findFacility("arcane-study")} isPending={false} onAdd={onAdd} />);

    const button = screen.getByRole("button", { name: /Додати/ });
    fireEvent.click(button);

    expect(onAdd).toHaveBeenCalledWith(undefined);
  });

  it("кілька розмірів — кнопка на кожен, і обраний іде в дію", () => {
    const onAdd = vi.fn();
    render(<BastionAddFacility facility={findFacility("bedroom")} isPending={false} onAdd={onAdd} />);

    expect(screen.getAllByRole("button")).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: /Розлоге/ }));

    expect(onAdd).toHaveBeenCalledWith("vast");
  });
});
