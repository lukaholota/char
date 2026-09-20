// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { WeaponMasteryInfoButton } from "@/lib/components/characterSheet/WeaponMasteryInfoButton";
import { weaponMasteryDescriptions } from "@/lib/refs/weapon-mastery";

afterEach(cleanup);

describe("Підпис майстерності на листі відкриває опис властивості", () => {
  it("клік по «Розмах (Cleave)» показує опис", () => {
    render(<WeaponMasteryInfoButton mastery="CLEAVE" />);
    fireEvent.click(screen.getByRole("button", { name: /Розмах \(Cleave\)/ }));

    expect(screen.getByText(weaponMasteryDescriptions.CLEAVE)).toBeTruthy();
  });

  /// Слайди листа гасять pointerdown — без цього класу тригер у картці мертвий у Chromium.
  it("тригер не перехоплюється свайпом слайда", () => {
    render(<WeaponMasteryInfoButton mastery="SAP" />);

    expect(screen.getByRole("button", { name: /Виснаження \(Sap\)/ }).className).toContain("swiper-no-swiping");
  });

  it("без властивості майстерності нічого не малює", () => {
    const { container } = render(<WeaponMasteryInfoButton mastery={null} />);

    expect(container.innerHTML).toBe("");
  });
});
