// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { PersWithRelations } from "@/lib/actions/pers";
import HitDiceDialog from "@/lib/components/characterSheet/HitDiceDialog";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/hooks/useOfflineQueue", () => ({ useOfflineQueue: () => ({ commitOperation: vi.fn() }) }));
vi.mock("@/lib/actions/rest-actions", () => ({ setHitDice: vi.fn() }));

afterEach(cleanup);

function buildFighter(): PersWithRelations {
  return {
    persId: 1,
    level: 3,
    class: { classId: 1, name: "FIGHTER_2014", hitDie: 10 },
    multiclasses: [],
    currentHitDice: { 1: 3 },
  } as unknown as PersWithRelations;
}

describe("HitDiceDialog", () => {
  it("keeps the unsaved count when the sheet re-renders with a fresh pers object", () => {
    const props = { open: true, onOpenChange: vi.fn() };
    const { rerender } = render(<HitDiceDialog pers={buildFighter()} {...props} />);
    expect(screen.getByText("3/3")).toBeTruthy();

    fireEvent.click(screen.getAllByRole("button").find((button) => button.querySelector(".lucide-minus"))!);
    expect(screen.getByText("2/3")).toBeTruthy();

    rerender(<HitDiceDialog pers={buildFighter()} {...props} />);
    expect(screen.getByText("2/3")).toBeTruthy();
  });

  it("starts from the saved count on every open", () => {
    const { rerender } = render(<HitDiceDialog pers={buildFighter()} open onOpenChange={vi.fn()} />);
    fireEvent.click(screen.getAllByRole("button").find((button) => button.querySelector(".lucide-minus"))!);
    rerender(<HitDiceDialog pers={buildFighter()} open={false} onOpenChange={vi.fn()} />);
    rerender(<HitDiceDialog pers={buildFighter()} open onOpenChange={vi.fn()} />);
    expect(screen.getByText("3/3")).toBeTruthy();
  });
});
