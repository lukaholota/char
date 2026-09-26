// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

afterEach(cleanup);

/// `duration-200` без `transition-property` анімує всі властивості. Рамка, яку вмикав лише фокус,
/// при відкритті перетікала з кольору тексту в прозорий — модалка спалахувала білою обводкою.
describe("діалог не спалахує рамкою при відкритті", () => {
  it("обводка вимкнена постійно, а не лише у фокусі", () => {
    render(
      <Dialog open onOpenChange={() => {}}>
        <DialogContent>
          <DialogTitle>Заклинання</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    const classes = screen.getByRole("dialog").className.split(/\s+/);

    expect(classes).toContain("outline-none");
    expect(classes.filter((name) => name.startsWith("focus:outline"))).toEqual([]);
  });

  /// Розмите скло на вікні майже на весь екран телефон перемальовує кожен кадр анімації —
  /// закриття стояло на пів дорозі ~0,45 с (відео з Android, 2026-09-26). Десктоп розмиття лишає.
  it("на сенсорному екрані вікно без розмиття й непрозоре", () => {
    render(
      <Dialog open onOpenChange={() => {}}>
        <DialogContent>
          <DialogTitle>Заклинання</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    const classes = screen.getByRole("dialog").className.split(/\s+/);

    expect(classes).toContain("backdrop-blur-lg");
    expect(classes).toContain("[@media(pointer:coarse)]:backdrop-blur-none");
    expect(classes).toContain("[@media(pointer:coarse)]:from-slate-950");
  });
});
