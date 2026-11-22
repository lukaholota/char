// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ColorSpectrumPicker } from "@/components/games/ColorSpectrumPicker";

afterEach(cleanup);

describe("палітра зі спектром", () => {
  it("рух повзунка спектру не зберігає колір — лише підтверджений вибір", () => {
    const onChange = vi.fn();
    render(<ColorSpectrumPicker label="Колір погоди" value="#ef4444" onChange={onChange} />);
    const spectrum = screen.getByLabelText("Інший колір зі спектру");

    fireEvent.input(spectrum, { target: { value: "#123456" } });
    fireEvent.input(spectrum, { target: { value: "#654321" } });
    expect(onChange).not.toHaveBeenCalled();

    spectrum.dispatchEvent(new Event("change", { bubbles: true }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("#654321");
  });

  it("готовий колір зберігається одразу", () => {
    const onChange = vi.fn();
    render(<ColorSpectrumPicker label="Колір" value={null} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("Синій"));
    expect(onChange).toHaveBeenCalledWith("#2563eb");
  });
});
