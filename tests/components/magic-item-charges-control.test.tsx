// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MagicItemChargesControl } from "@/lib/components/characterSheet/MagicItemChargesControl";
import { setMagicItemChargesMax, stepMagicItemCharges } from "@/lib/actions/magic-item-actions";

vi.mock("@/lib/actions/magic-item-actions", () => ({
  setMagicItemChargesMax: vi.fn(async () => ({ success: true })),
  stepMagicItemCharges: vi.fn(async () => ({ success: true })),
}));

afterEach(cleanup);

describe("KR31.13 — лічильник зарядів на картці магічного предмета", () => {
  it("гравець вписує максимум і витрачає заряд", async () => {
    const onChanged = vi.fn();
    render(<MagicItemChargesControl persMagicItemId={11} charges={{ chargesMax: null, chargesCurrent: null }} onChanged={onChanged} />);

    fireEvent.click(screen.getByRole("button", { name: "+ заряди" }));
    fireEvent.change(screen.getByLabelText("Максимум зарядів"), { target: { value: "7" } });
    await act(async () => fireEvent.keyDown(screen.getByLabelText("Максимум зарядів"), { key: "Enter" }));

    expect(setMagicItemChargesMax).toHaveBeenCalledWith(11, 7);
    expect(screen.getByText("7/7")).toBeTruthy();

    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Витратити заряд" })));

    expect(stepMagicItemCharges).toHaveBeenCalledWith(11, -1);
    expect(screen.getByText("6/7")).toBeTruthy();
    expect(onChanged).toHaveBeenCalled();
  });

  it("на листі лише для читання предмет без зарядів нічого не показує, а з зарядами — лише число", () => {
    const { container } = render(<MagicItemChargesControl persMagicItemId={11} charges={{ chargesMax: null, chargesCurrent: null }} isReadOnly onChanged={vi.fn()} />);
    expect(container.textContent).toBe("");
    cleanup();

    render(<MagicItemChargesControl persMagicItemId={11} charges={{ chargesMax: 5, chargesCurrent: 2 }} isReadOnly onChanged={vi.fn()} />);
    expect(screen.getByText("2/5")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Витратити заряд" })).toBeNull();
  });
});
