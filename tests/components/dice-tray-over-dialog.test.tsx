// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { DiceTray } from "@/lib/components/dice/DiceTray";
import { useDiceUIStore } from "@/lib/stores/diceUIStore";

afterEach(() => {
  cleanup();
  useDiceUIStore.getState().close();
});

describe("кидок зі статблоку в модалці бестіарію на телефоні", () => {
  it("лоток кубиків приймає дотики й не закриває модалку під собою", async () => {
    const onOpenChange = vi.fn();
    render(
      <>
        <Dialog open onOpenChange={onOpenChange} enableBackButtonClose={false}>
          <DialogContent>
            <DialogTitle>Кістяний кіготь</DialogTitle>
          </DialogContent>
        </Dialog>
        <DiceTray />
      </>,
    );
    act(() => useDiceUIStore.getState().open());
    await new Promise((resolve) => setTimeout(resolve, 0));

    const tray = document.querySelector("[data-dice-tray]")!;
    expect(tray.className).toContain("pointer-events-auto");

    const closeButton = screen.getByRole("button", { name: "Закрити кубики", hidden: true });
    fireEvent.pointerDown(closeButton, { pointerType: "touch" });
    fireEvent.click(closeButton);

    expect(useDiceUIStore.getState().isOpen).toBe(false);
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
