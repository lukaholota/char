// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import BackgroundsForm from "@/lib/components/characterCreator/BackgroundsForm";
import { findCharacterCreationOptions } from "@/lib/content/creator-content";
import type { BackgroundI, FeatPrisma } from "@/lib/types/model-types";

afterEach(cleanup);

/// Навички видно просто на картці, рядком з англійською назвою: гравець порівнює передісторії
/// між собою, і заради двох слів відкривати модалку кожної з них — зайвий крок.
describe("картка передісторії показує навички", () => {
  it("під англійською назвою стоять українські навички передісторії", () => {
    const options = findCharacterCreationOptions("RULES_2024");
    const backgrounds = options.backgrounds as unknown as BackgroundI[];
    render(
      <BackgroundsForm
        backgrounds={backgrounds}
        feats={options.feats as unknown as FeatPrisma[]}
        formId="backgrounds-test"
      />
    );

    const sage = screen.getByTestId("background-SAGE_2024");
    expect(sage.textContent).toContain("Sage · ");
    expect(sage.textContent).toContain("Магія, Історія");
  });
});

/// Риса — те, за чим гравець обирає походження 2024: без неї картка мовчить про половину
/// того, що дає передісторія, а модалку довелося б відкривати на кожній.
describe("картка передісторії показує рису", () => {
  it("третім рядом стоїть риса походження 2024", () => {
    renderBackgrounds("RULES_2024");

    expect(screen.getByTestId("background-GUARD_2024").textContent).toContain("Риса: Пильний");
  });

  it("у 2014 третім рядом стоїть особливість передісторії", () => {
    renderBackgrounds("RULES_2014");

    expect(screen.getByTestId("background-SAILOR").textContent).toContain("Особливість: Прохід на Кораблі");
  });
});

describe("пошук передісторій знаходить за назвою риси", () => {
  it("українська назва риси лишає тільки ті походження, що її дають", () => {
    renderBackgrounds("RULES_2024");
    typeSearch("пильн");

    expect(screen.getByTestId("background-GUARD_2024")).toBeTruthy();
    expect(screen.queryByTestId("background-SAGE_2024")).toBeNull();
  });

  it("англійська назва риси шукається так само", () => {
    renderBackgrounds("RULES_2024");
    typeSearch("alert");

    expect(screen.getByTestId("background-GUARD_2024")).toBeTruthy();
    expect(screen.queryByTestId("background-SAGE_2024")).toBeNull();
  });

  it("назва особливості 2014 теж шукається", () => {
    renderBackgrounds("RULES_2014");
    typeSearch("прохід на кораблі");

    expect(screen.getByTestId("background-SAILOR")).toBeTruthy();
    expect(screen.queryByTestId("background-SOLDIER")).toBeNull();
  });

  it("пошук за назвою передісторії працює як раніше", () => {
    renderBackgrounds("RULES_2024");
    typeSearch("sage");

    expect(screen.getByTestId("background-SAGE_2024")).toBeTruthy();
    expect(screen.queryByTestId("background-GUARD_2024")).toBeNull();
  });
});

function renderBackgrounds(ruleset: "RULES_2014" | "RULES_2024") {
  const options = findCharacterCreationOptions(ruleset);
  render(
    <BackgroundsForm
      backgrounds={options.backgrounds as unknown as BackgroundI[]}
      feats={options.feats as unknown as FeatPrisma[]}
      formId="backgrounds-test"
    />
  );
}

function typeSearch(value: string) {
  fireEvent.change(screen.getByLabelText("Пошук передісторій"), { target: { value } });
}
