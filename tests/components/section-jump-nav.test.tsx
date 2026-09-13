// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import { SectionJumpNav, jumpTargetAttributes } from "@/components/catalogs/SectionJumpNav";

afterEach(cleanup);

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
});
