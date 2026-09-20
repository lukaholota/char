// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import { SectionJumpNav, jumpTargetAttributes } from "@/components/catalogs/SectionJumpNav";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const ITEMS = [
  { id: "LORE", label: "Колегія знань" },
  { id: "VALOR", label: "Колегія звитяги" },
];

function CardCopy({ testId }: { testId: string }) {
  return (
    <div data-testid={testId} {...jumpTargetAttributes.scope}>
      <SectionJumpNav title="Підкласи" items={ITEMS} />
      {ITEMS.map((item) => (
        <div key={item.id} data-testid={`${testId}-${item.id}`} {...jumpTargetAttributes.target(item.id)} />
      ))}
    </div>
  );
}

describe("KR33.2 — навігація розділами картки", () => {
  it("порожній перелік не малює блоку", () => {
    const { container } = render(<SectionJumpNav title="Підкласи" items={[]} />);

    expect(container.firstChild).toBeNull();
  });

  it("малює по кнопці на кожен пункт", () => {
    render(<SectionJumpNav title="Підкласи" items={ITEMS} />);

    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual([
      "Колегія знань",
      "Колегія звитяги",
    ]);
  });

  it("клік прокручує до цілі у своїй копії картки, а не в сусідній", () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    render(
      <>
        <CardCopy testId="desktop" />
        <CardCopy testId="modal" />
      </>,
    );

    fireEvent.click(within(screen.getByTestId("modal")).getByRole("button", { name: "Колегія звитяги" }));

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(screen.getByTestId("modal-VALOR"));
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "start", behavior: "smooth" });
  });

  it("ціль, домальована після кліку, все одно отримує прокрутку", () => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame"] });
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    const { rerender } = render(<LateCard isTargetRendered={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Колегія звитяги" }));
    expect(scrollIntoView).not.toHaveBeenCalled();

    rerender(<LateCard isTargetRendered />);
    act(() => vi.advanceTimersToNextFrame());

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(screen.getByTestId("late-VALOR"));
  });
});

function LateCard({ isTargetRendered }: { isTargetRendered: boolean }) {
  return (
    <div {...jumpTargetAttributes.scope}>
      <SectionJumpNav title="Підкласи" items={ITEMS} />
      {isTargetRendered ? <div data-testid="late-VALOR" {...jumpTargetAttributes.target("VALOR")} /> : null}
    </div>
  );
}
