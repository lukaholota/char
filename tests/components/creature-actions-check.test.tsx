// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { CREATURE_ACTION_TEMPLATES, CreatureActionsCheck } from "@/components/homebrew/CreatureActionsCheck";
import { RichTextEditor } from "@/components/ui/rich-text/RichTextEditor";

afterEach(cleanup);

const readItems = () => screen.getAllByRole("listitem").map((item) => item.textContent);

describe("автор істоти бачить, що кидатиметься", () => {
  it("кожен шаблон розпізнається повністю: атака, область, ряткидок цілі", () => {
    render(<CreatureActionsCheck markdown={CREATURE_ACTION_TEMPLATES.map((template) => template.markdown).join("\n\n")} />);
    expect(readItems()).toEqual([
      "Укус — атака +5 · шкода 1к10 + 3",
      "Вогняний подих — перезарядка 5–6 · конус 15 фт: ряткидок СПР СК 13, половина при успіху · шкода 3к6",
      "Жахливий погляд — обрана ціль: ряткидок МУД СК 12, половина при успіху · шкода 2к8",
    ]);
  });

  it("попереджає про ряткидок, що не кинеться, і пояснює ряткидок без шкоди", () => {
    render(<CreatureActionsCheck markdown={"**Крик.** Ціль має зробити ряткидок, інакше отримує 2к6 психічної шкоди.\n\n&nbsp;\n\n\u00a0\n\n**Погляд.** Ціль робить ряткидок Мудрості СК 12, інакше стає наляканою.\n\nМоже дихати під водою."} />);
    expect(readItems()).toEqual([
      expect.stringMatching(/^Крик — шкода 2к6Ряткидок не кинеться сам/),
      "Погляд — обрана ціль: ряткидок МУД СК 12, при провалі стан «Наляканий»",
      "Може дихати під водою — без кубиків",
    ]);
  });

  it("пункти нумерованого списку перевіряються окремо, кубик без числа — просто кидок", () => {
    render(<CreatureActionsCheck markdown={"**Промені з очей.** Киньте к8.\n\n1. **Рійний промінь.** Ціль отримує 18 (4к8) колючих ушкоджень.\n2. **Промінь Вельзевула.** Ціль повинна пройти рятівний кидок Статури СК 17, інакше отримує 27 (6к8) некротичних ушкоджень, а за успіху — половину."} />);
    expect(readItems()).toEqual([
      "Промені з очей — кидок к8",
      "Рійний промінь — шкода 4к8",
      "Промінь Вельзевула — обрана ціль: ряткидок СТА СК 17, половина при успіху · шкода 6к8",
    ]);
  });

  it("порожні дії не показують перевірку", () => {
    const { container } = render(<CreatureActionsCheck markdown="  " />);
    expect(container.innerHTML).toBe("");
  });
});

describe("кнопка шаблону вставляє дію в редактор", () => {
  beforeAll(() => {
    Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
    Range.prototype.getBoundingClientRect = () => ({ top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => null });
  });

  it("у порожнє поле — сам шаблон, далі — новим абзацом у кінець", async () => {
    const onChange = vi.fn();
    render(<RichTextEditor value="" onChange={onChange} ariaLabel="Дії" snippets={CREATURE_ACTION_TEMPLATES} />);
    await screen.findByRole("textbox", { name: "Дії" });

    fireEvent.click(screen.getByRole("button", { name: "Атака" }));
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(CREATURE_ACTION_TEMPLATES[0].markdown));

    fireEvent.click(screen.getByRole("button", { name: "Ряткидок цілі" }));
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(`${CREATURE_ACTION_TEMPLATES[0].markdown}\n\n${CREATURE_ACTION_TEMPLATES[2].markdown}`));
  });
});
