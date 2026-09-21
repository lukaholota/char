// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AcquiredFeatsTab, type CharacterFeatItem } from "@/lib/components/characterSheet/feats/AcquiredFeatsTab";

afterEach(cleanup);

const observant: CharacterFeatItem = {
  persFeatId: 1,
  featId: 11,
  feat: {
    name: "OBSERVANT",
    description: "Ви швидко помічаєте деталі свого оточення.\n\n- Ви отримуєте бонус +5 до пасивних Уважності й Розслідування.",
  },
  choices: [{ choiceOption: { optionName: "Мудрість" } }],
};

function renderTab() {
  const onOpenDetail = vi.fn();
  const onRemoveFeat = vi.fn();
  render(
    <AcquiredFeatsTab
      persFeats={[observant]}
      isSubmitting={null}
      onRemoveFeat={onRemoveFeat}
      onOpenDetail={onOpenDetail}
      onSwitchToCatalog={vi.fn()}
    />,
  );
  return { onOpenDetail, onRemoveFeat };
}

describe("набуті риси на листі", () => {
  it("показує обрану характеристику риси, а не порожню плашку", () => {
    renderTab();
    expect(screen.getByText("Мудрість")).toBeTruthy();
  });

  it("тап по картці відкриває повний опис риси", () => {
    const { onOpenDetail } = renderTab();
    fireEvent.click(screen.getByText("Спостережливий"));
    expect(onOpenDetail).toHaveBeenCalledWith({ name: "Спостережливий", description: observant.feat!.description });
  });

  it("кошик видаляє рису й не відкриває опис", () => {
    const { onOpenDetail, onRemoveFeat } = renderTab();
    fireEvent.click(screen.getByRole("button", { name: "Видалити рису Спостережливий" }));
    expect(onRemoveFeat).toHaveBeenCalledWith(11, "Спостережливий");
    expect(onOpenDetail).not.toHaveBeenCalled();
  });
});
