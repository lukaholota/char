// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";

import { InlineContent } from "@/components/optimization/InlineContent";
import type { InlineNode } from "@/lib/optimization/types";

afterEach(cleanup);

function renderNodes(nodes: InlineNode[]) {
  return render(
    <p data-testid="host">
      <InlineContent nodes={nodes} resolveLink={(href) => ({ href, isExternal: true })} linkClassName="text-slate-100" ruleset="RULES_2014" />
    </p>
  );
}

describe("переноси й абзаци в тексті статті", () => {
  it("розрив абзацу дає окремий проміжок між двома шматками тексту", () => {
    const { container } = renderNodes([{ type: "text", text: "Перший абзац.\n\nДругий абзац." }]);
    const spacers = container.querySelectorAll("p > span[aria-hidden]");
    expect(spacers).toHaveLength(1);
    expect(spacers[0].previousSibling?.textContent).toBe("Перший абзац.");
    expect(spacers[0].nextSibling?.textContent).toBe("Другий абзац.");
  });

  it("одинарний перенос дає перенос рядка без проміжку", () => {
    const { container } = renderNodes([{ type: "text", text: "Рядок один.\nРядок два." }]);
    expect(container.querySelectorAll("p > br")).toHaveLength(1);
    expect(container.querySelectorAll("p > span[aria-hidden]")).toHaveLength(0);
  });

  it("не чіпає текст без переносів", () => {
    const { getByTestId } = renderNodes([{ type: "text", text: "Звичайне речення." }]);
    expect(getByTestId("host").textContent).toBe("Звичайне речення.");
  });
});
