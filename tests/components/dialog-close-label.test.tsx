// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

afterEach(cleanup);

describe("KR31.14 — кнопка закриття діалогу", () => {
  it("озвучується українською", () => {
    render(
      <Dialog open onOpenChange={() => {}}>
        <DialogContent>
          <DialogTitle>Бастіон</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    expect(screen.getByRole("button", { name: "Закрити" })).toBeTruthy();
  });
});
