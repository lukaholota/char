// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SourceFilterSection } from "@/components/catalogs/SourceFilterSection";
import { SpellsFilterDialog } from "@/components/spells/SpellsFilterDialog";
import { collectCatalogSources } from "@/lib/catalog-source-filter";
import { findSourceLabel } from "@/lib/refs/source-label";

afterEach(cleanup);

/// Спільна секція джерела: книжки — чипами, хоумбрю — окремим перемикачем, і лише тоді, коли
/// воно в каталозі взагалі є.

describe("SourceFilterSection", () => {
  it("малює книжки українською і перемикач хоумбрю, коли воно є в каталозі", () => {
    const onToggleSource = vi.fn();
    const onToggleHomebrew = vi.fn();
    render(
      <SourceFilterSection
        available={collectCatalogSources([{ source: "MM" }, { source: "HOMEBREW" }])}
        selection={{ sources: new Set(), homebrew: false }}
        onToggleSource={onToggleSource}
        onToggleHomebrew={onToggleHomebrew}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: findSourceLabel("MM") }));
    fireEvent.click(screen.getByRole("button", { name: /хоумбрю/i }));

    expect(onToggleSource).toHaveBeenCalledWith("MM");
    expect(onToggleHomebrew).toHaveBeenCalledTimes(1);
  });

  it("без хоумбрю в каталозі перемикача немає", () => {
    render(
      <SourceFilterSection
        available={collectCatalogSources([{ source: "MM" }, { source: "PHB" }])}
        selection={{ sources: new Set(), homebrew: false }}
        onToggleSource={() => {}}
        onToggleHomebrew={() => {}}
      />
    );

    expect(screen.queryByRole("button", { name: /хоумбрю/i })).toBeNull();
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });
});

describe("SpellsFilterDialog", () => {
  it("відкривається з новими секціями й показує час касту без умов", () => {
    const noop = () => {};
    render(
      <SpellsFilterDialog
        open
        onOpenChange={noop}
        availableLevels={[0, 1]}
        availableClasses={["Клірик"]}
        availableSubclassesByClass={[{ className: "Клірик", subclasses: ["Домен життя"] }]}
        availableSchools={["EVOCATION"]}
        availableTimes={["1 дія", "1 реакція"]}
        availableSources={collectCatalogSources([{ source: "PHB" }])}
        selectedLevels={new Set()}
        selectedClasses={new Set()}
        selectedSubclasses={new Set()}
        selectedSchools={new Set()}
        selectedTimes={new Set()}
        selectedComponents={new Set()}
        selectedRanges={new Set()}
        selectedDurations={new Set()}
        sourceSelection={{ sources: new Set(), homebrew: false }}
        selectedConc={null}
        selectedRitual={null}
        toggleLevel={noop}
        toggleClass={noop}
        toggleSubclass={noop}
        toggleSchool={noop}
        toggleTime={noop}
        toggleComponent={noop}
        toggleRange={noop}
        toggleDuration={noop}
        toggleSource={noop}
        toggleHomebrew={noop}
        toggleConc={noop}
        toggleRitual={noop}
        clearFilters={noop}
      />
    );

    for (const title of ["Компоненти", "Дистанція", "Тривалість", "Джерело", "Час касту"]) {
      expect(screen.getByText(title)).toBeTruthy();
    }
    expect(screen.getByText("1 реакція")).toBeTruthy();
    expect(screen.getByText("Домен життя")).toBeTruthy();
    expect(screen.getByRole("button", { name: findSourceLabel("PHB") })).toBeTruthy();
  });
});
