// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { RichTextEditor } from "@/components/ui/rich-text/RichTextEditor";

afterEach(cleanup);

async function renderEditor(value: string) {
  const onChange = vi.fn();
  render(<RichTextEditor value={value} onChange={onChange} ariaLabel="Опис" />);
  const textbox = await screen.findByRole("textbox", { name: "Опис" });
  return { onChange, textbox };
}

function selectAllText(element: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(element);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  document.dispatchEvent(new Event("selectionchange"));
}

describe("редактор опису пише в нашу розмітку", () => {
  it("показує збережений текст оформленим, а не із зірочками", async () => {
    const { textbox } = await renderEditor("**Укус.** Рукопашна атака.\n\n- перший\n- другий");
    expect(textbox.querySelector("strong")?.textContent).toBe("Укус.");
    expect(textbox.querySelectorAll("li")).toHaveLength(2);
    expect(textbox.textContent).not.toContain("**");
  });

  it("кнопка «Жирний» віддає формі текст у зірочках", async () => {
    const { onChange, textbox } = await renderEditor("Укус");
    textbox.focus();
    selectAllText(textbox.querySelector("p") as HTMLElement);
    fireEvent.click(screen.getByRole("button", { name: "Жирний" }));
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith("**Укус**"));
  });
});
