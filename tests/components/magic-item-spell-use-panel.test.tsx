// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MagicItemSpellUsePanel } from "@/lib/components/characterSheet/MagicItemSpellUsePanel";
import { findItemSpellUse } from "@/rules/magic-item-spell-uses";

afterEach(cleanup);

const necklace = findItemSpellUse({ engName: "Necklace of Fireballs" })!;

describe("намисто вогняних куль на полі бою", () => {
  it("гравець кидає кілька намистин, але не більше, ніж лишилось", () => {
    const onUse = vi.fn();
    render(<MagicItemSpellUsePanel use={necklace} chargesLeft={2} isPending={false} onUse={onUse} />);
    expect(screen.getByText("3 рівень · СК 15 · лишиться 1.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Більше" }));
    expect(screen.getByText("2 намистини")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Більше" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByText("4 рівень · СК 15 · лишиться 0.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Кинути" }));
    expect(onUse).toHaveBeenCalledWith(2);
  });

  it("порожнє намисто кинути не дає", () => {
    render(<MagicItemSpellUsePanel use={necklace} chargesLeft={0} isPending={false} onUse={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Кинути" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByText("Не лишилось намистин.")).toBeTruthy();
  });
});
