// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

afterEach(cleanup);

describe("PostHog dead clicks 2026-09-27 — тап по затемненню закриває модалку на телефоні", () => {
  it("дотик: Radix закриває на click, і оверлей цей click не гасить", async () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange} enableBackButtonClose={false}>
        <DialogContent>
          <DialogTitle>Вогняна куля</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    const overlay = document.querySelector("[data-rpg-dialog-overlay]")!;

    fireEvent.pointerDown(overlay, { pointerType: "touch" });
    fireEvent.click(overlay);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
